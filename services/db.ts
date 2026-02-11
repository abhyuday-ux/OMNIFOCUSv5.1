
import { StudySession, Subject, DEFAULT_SUBJECTS, DailyGoal, Task, Exam, ChatMessage, JournalEntry } from '../types';
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

const DB_NAME = 'StudySyncDB';
const DB_VERSION = 6;
const STORE_SESSIONS = 'sessions';
const STORE_SUBJECTS = 'subjects';
const STORE_GOALS = 'goals';
const STORE_TASKS = 'tasks';
const STORE_EXAMS = 'exams';
const STORE_CHATS = 'chats';
const STORE_JOURNAL = 'journal';

// Keys in localStorage that should be synced
const LOCAL_STORAGE_KEYS = [
  'studySync_targetHours',
  'omni_wallpaper',
  'omni_wallpaper_home',
  'studySync_enableZenMode',
  'omni_space_url',
  'omni_theme_accent',
  'omni_timer_durations',
  'omni_custom_personas',
  'omni_ai_personality',
  'omni_habits',
  'omni_chat_history'
];

class LocalDB {
  private db: IDBDatabase | null = null;
  private userId: string | null = null;

  setUserId(uid: string | null) {
    this.userId = uid;
  }

  async connect(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        const createStore = (name: string, keyPath: string = 'id', index?: string) => {
            if (!db.objectStoreNames.contains(name)) {
                const store = db.createObjectStore(name, { keyPath });
                if (index) store.createIndex(index, index, { unique: false });
            }
        };

        createStore(STORE_SESSIONS, 'id', 'dateString');
        
        if (!db.objectStoreNames.contains(STORE_SUBJECTS)) {
          const subjectStore = db.createObjectStore(STORE_SUBJECTS, { keyPath: 'id' });
          DEFAULT_SUBJECTS.forEach(sub => subjectStore.add(sub));
        }

        createStore(STORE_GOALS, 'id', 'dateString');
        createStore(STORE_TASKS);
        createStore(STORE_EXAMS);
        createStore(STORE_CHATS);
        createStore(STORE_JOURNAL, 'id', 'dateString');
      };
    });
  }

  // --- Synchronization Helpers ---

  private async syncToFirestore(collectionName: string, data: any) {
    if (!this.userId) return; // Local mode only
    try {
      await setDoc(doc(db, 'users', this.userId, collectionName, data.id), data);
    } catch (e) {
      console.error(`Failed to sync ${collectionName} to cloud`, e);
    }
  }

  private async deleteFromFirestore(collectionName: string, id: string) {
    if (!this.userId) return;
    try {
      await deleteDoc(doc(db, 'users', this.userId, collectionName, id));
    } catch (e) {
      console.error(`Failed to delete ${collectionName} from cloud`, e);
    }
  }

  // --- LocalStorage / Settings Sync ---

  async pullSettingsFromCloud() {
    if (!this.userId) return;
    try {
        const docSnap = await getDoc(doc(db, 'users', this.userId, 'settings', 'config'));
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Special handling for Habits Merge
            if (data['omni_habits']) {
                let cloudHabits = [];
                try {
                    cloudHabits = JSON.parse(data['omni_habits']);
                } catch(e) {}

                const localHabitsRaw = localStorage.getItem('omni_habits');
                const localHabits = localHabitsRaw ? JSON.parse(localHabitsRaw) : [];
                
                // Merge strategy: Create Map by ID. Cloud overwrites Local on collision, but we keep unique local ones.
                const habitMap = new Map();
                localHabits.forEach((h: any) => habitMap.set(h.id, h));
                cloudHabits.forEach((h: any) => habitMap.set(h.id, h)); 
                
                const merged = Array.from(habitMap.values());
                localStorage.setItem('omni_habits', JSON.stringify(merged));
            }

            // Special handling for Chat History Merge
            if (data['omni_chat_history']) {
                let cloudChats = [];
                try {
                    cloudChats = JSON.parse(data['omni_chat_history']);
                } catch(e) {}

                const localChatsRaw = localStorage.getItem('omni_chat_history');
                const localChats = localChatsRaw ? JSON.parse(localChatsRaw) : [];
                
                // Merge by ID
                const chatMap = new Map();
                localChats.forEach((c: any) => chatMap.set(c.id, c));
                cloudChats.forEach((c: any) => chatMap.set(c.id, c));
                
                // Sort by timestamp
                const merged = Array.from(chatMap.values()).sort((a:any, b:any) => a.timestamp - b.timestamp);
                localStorage.setItem('omni_chat_history', JSON.stringify(merged));
            }

            // Sync other keys directly
            LOCAL_STORAGE_KEYS.forEach(key => {
                if (key !== 'omni_habits' && key !== 'omni_chat_history' && data[key] !== undefined) {
                    localStorage.setItem(key, data[key]);
                }
            });
        }
    } catch (e) {
        console.error("Failed to pull settings", e);
    }
  }

  async syncSettingsToCloud() {
    if (!this.userId) return;
    try {
        const data: Record<string, string> = {};
        LOCAL_STORAGE_KEYS.forEach(key => {
            const val = localStorage.getItem(key);
            if (val !== null) data[key] = val;
        });
        
        // Write to a single document 'settings/config'
        await setDoc(doc(db, 'users', this.userId, 'settings', 'config'), data, { merge: true });
    } catch (e) {
        console.error("Failed to sync settings", e);
    }
  }

  // Called when user logs in to pull cloud data to local device
  async pullFromFirestore() {
      if (!this.userId) return;
      
      // 1. Pull Settings (LocalStorage)
      await this.pullSettingsFromCloud();

      // 2. Pull IndexedDB Collections
      const collections = [
          STORE_SESSIONS, STORE_SUBJECTS, STORE_GOALS, STORE_TASKS, STORE_EXAMS, STORE_JOURNAL
      ];

      const localDb = await this.connect();

      for (const colName of collections) {
          try {
              const querySnapshot = await getDocs(collection(db, 'users', this.userId, colName));
              if (!querySnapshot.empty) {
                  const transaction = localDb.transaction(colName, 'readwrite');
                  const store = transaction.objectStore(colName);
                  
                  querySnapshot.forEach((doc) => {
                      store.put(doc.data());
                  });
              }
          } catch (e) {
              console.error(`Error pulling ${colName} from cloud`, e);
          }
      }
  }

  // Push all local data to cloud (Merge Guest Data)
  async syncLocalToCloud() {
      if (!this.userId) return;
      
      // 1. Push Settings (LocalStorage)
      await this.syncSettingsToCloud();

      // 2. Push IndexedDB Collections
      const collections = [
          STORE_SESSIONS, STORE_SUBJECTS, STORE_GOALS, STORE_TASKS, STORE_EXAMS, STORE_JOURNAL
      ];
      
      const db = await this.connect();
      
      for (const colName of collections) {
          const tx = db.transaction(colName, 'readonly');
          const store = tx.objectStore(colName);
          const request = store.getAll();
          
          request.onsuccess = () => {
              const items = request.result;
              items.forEach(item => {
                  this.syncToFirestore(colName, item);
              });
          };
      }
  }

  // --- Sessions ---

  async saveSession(session: StudySession): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = transaction.objectStore(STORE_SESSIONS);
      const request = store.put(session);
      
      request.onsuccess = () => {
          this.syncToFirestore(STORE_SESSIONS, session);
          resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getSessionsByDate(dateString: string): Promise<StudySession[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SESSIONS, 'readonly');
      const store = transaction.objectStore(STORE_SESSIONS);
      const index = store.index('dateString');
      const request = index.getAll(dateString);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSessions(): Promise<StudySession[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SESSIONS, 'readonly');
      const store = transaction.objectStore(STORE_SESSIONS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSessionsByDate(dateString: string): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SESSIONS], 'readwrite');
        const store = transaction.objectStore(STORE_SESSIONS);
        const index = store.index('dateString');
        const request = index.getAllKeys(dateString);

        request.onsuccess = () => {
            const keys = request.result;
            keys.forEach(key => {
                store.delete(key);
                this.deleteFromFirestore(STORE_SESSIONS, key as string);
            });
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearAllSessions(): Promise<void> {
    const db = await this.connect();
    // Note: This only clears local for safety. Implementing full cloud wipe requires a batch delete.
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SESSIONS], 'readwrite');
        const store = transaction.objectStore(STORE_SESSIONS);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
  }

  // --- Subjects ---

  async getSubjects(): Promise<Subject[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SUBJECTS, 'readonly');
      const store = transaction.objectStore(STORE_SUBJECTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result;
        if (results.length === 0) {
            resolve(DEFAULT_SUBJECTS);
        } else {
            resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSubject(subject: Subject): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_SUBJECTS, 'readwrite');
        const store = transaction.objectStore(STORE_SUBJECTS);
        const request = store.put(subject);
        request.onsuccess = () => {
            this.syncToFirestore(STORE_SUBJECTS, subject);
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
  }

  async deleteSubject(id: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_SUBJECTS, 'readwrite');
          const store = transaction.objectStore(STORE_SUBJECTS);
          const request = store.delete(id);
          request.onsuccess = () => {
              this.deleteFromFirestore(STORE_SUBJECTS, id);
              resolve();
          };
          request.onerror = () => reject(request.error);
      });
  }

  // --- Goals ---

  async getGoalsByDate(dateString: string): Promise<DailyGoal[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(STORE_GOALS)) { resolve([]); return; }
        const transaction = db.transaction(STORE_GOALS, 'readonly');
        const store = transaction.objectStore(STORE_GOALS);
        const index = store.index('dateString');
        const request = index.getAll(dateString);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
  }

  async getAllGoals(): Promise<DailyGoal[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(STORE_GOALS)) { resolve([]); return; }
        const transaction = db.transaction(STORE_GOALS, 'readonly');
        const store = transaction.objectStore(STORE_GOALS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
  }

  async saveGoal(goal: DailyGoal): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_GOALS, 'readwrite');
          const store = transaction.objectStore(STORE_GOALS);
          const request = store.put(goal);
          request.onsuccess = () => {
              this.syncToFirestore(STORE_GOALS, goal);
              resolve();
          };
          request.onerror = () => reject(request.error);
      });
  }

  async deleteGoal(id: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_GOALS, 'readwrite');
          const store = transaction.objectStore(STORE_GOALS);
          const request = store.delete(id);
          request.onsuccess = () => {
              this.deleteFromFirestore(STORE_GOALS, id);
              resolve();
          };
          request.onerror = () => reject(request.error);
      });
  }

  async deleteGoalsByDate(dateString: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_GOALS)) { resolve(); return; }
          const transaction = db.transaction([STORE_GOALS], 'readwrite');
          const store = transaction.objectStore(STORE_GOALS);
          const index = store.index('dateString');
          const request = index.getAllKeys(dateString);

          request.onsuccess = () => {
              const keys = request.result;
              keys.forEach(key => {
                  store.delete(key);
                  this.deleteFromFirestore(STORE_GOALS, key as string);
              });
          };
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
      });
  }

  async clearAllGoals(): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_GOALS)) { resolve(); return; }
          const transaction = db.transaction([STORE_GOALS], 'readwrite');
          const store = transaction.objectStore(STORE_GOALS);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  // --- Tasks ---

  async getTasks(): Promise<Task[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(STORE_TASKS)) { resolve([]); return; }
        const transaction = db.transaction(STORE_TASKS, 'readonly');
        const store = transaction.objectStore(STORE_TASKS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
  }

  async saveTask(task: Task): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_TASKS, 'readwrite');
          const store = transaction.objectStore(STORE_TASKS);
          const request = store.put(task);
          request.onsuccess = () => {
              this.syncToFirestore(STORE_TASKS, task);
              resolve();
          };
          request.onerror = () => reject(request.error);
      });
  }

  async deleteTask(id: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_TASKS, 'readwrite');
          const store = transaction.objectStore(STORE_TASKS);
          const request = store.delete(id);
          request.onsuccess = () => {
              this.deleteFromFirestore(STORE_TASKS, id);
              resolve();
          };
          request.onerror = () => reject(request.error);
      });
  }

  // --- Exams ---

  async getExams(): Promise<Exam[]> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_EXAMS)) { resolve([]); return; }
          const transaction = db.transaction(STORE_EXAMS, 'readonly');
          const store = transaction.objectStore(STORE_EXAMS);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      });
  }

  async saveExam(exam: Exam): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_EXAMS, 'readwrite');
          const store = transaction.objectStore(STORE_EXAMS);
          const request = store.put(exam);
          request.onsuccess = () => {
              this.syncToFirestore(STORE_EXAMS, exam);
              resolve();
          };
          request.onerror = () => reject(request.error);
      });
  }

  async deleteExam(id: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_EXAMS, 'readwrite');
          const store = transaction.objectStore(STORE_EXAMS);
          const request = store.delete(id);
          request.onsuccess = () => {
              this.deleteFromFirestore(STORE_EXAMS, id);
              resolve();
          };
          request.onerror = () => reject(request.error);
      });
  }

  // --- Chat History (Local Only - No Sync) ---

  async getChatHistory(): Promise<ChatMessage[]> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_CHATS)) { resolve([]); return; }
          const transaction = db.transaction(STORE_CHATS, 'readonly');
          const store = transaction.objectStore(STORE_CHATS);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      });
  }

  async saveChatMessage(message: ChatMessage): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_CHATS, 'readwrite');
          const store = transaction.objectStore(STORE_CHATS);
          const request = store.put(message);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  async clearChatHistory(): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_CHATS)) { resolve(); return; }
          const transaction = db.transaction(STORE_CHATS, 'readwrite');
          const store = transaction.objectStore(STORE_CHATS);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  // --- Journal ---

  async saveJournalEntry(entry: JournalEntry): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_JOURNAL, 'readwrite');
          const store = transaction.objectStore(STORE_JOURNAL);
          const request = store.put(entry);
          request.onsuccess = () => {
              this.syncToFirestore(STORE_JOURNAL, entry);
              resolve();
          };
          request.onerror = () => reject(request.error);
      });
  }

  async getJournalEntryByDate(dateString: string): Promise<JournalEntry | null> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_JOURNAL)) { resolve(null); return; }
          const transaction = db.transaction(STORE_JOURNAL, 'readonly');
          const store = transaction.objectStore(STORE_JOURNAL);
          const index = store.index('dateString');
          const request = index.get(dateString);
          
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
      });
  }

  async getAllJournalEntries(): Promise<JournalEntry[]> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_JOURNAL)) { resolve([]); return; }
          const transaction = db.transaction(STORE_JOURNAL, 'readonly');
          const store = transaction.objectStore(STORE_JOURNAL);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      });
  }

  // --- Backup & Restore ---

  async createBackup(): Promise<any> {
    const sessions = await this.getAllSessions();
    const subjects = await this.getSubjects();
    const goals = await this.getAllGoals();
    const tasks = await this.getTasks();
    const exams = await this.getExams();
    const chats = await this.getChatHistory();
    const journal = await this.getAllJournalEntries();

    return {
        sessions,
        subjects,
        goals,
        tasks,
        exams,
        chats,
        journal
    };
  }

  async restoreBackup(data: any): Promise<void> {
    const db = await this.connect();
    
    const restoreStore = (storeName: string, items: any[]) => {
        if (!items || !items.length) return;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach(item => {
            store.put(item);
            this.syncToFirestore(storeName, item);
        });
    };

    restoreStore(STORE_SESSIONS, data.sessions);
    restoreStore(STORE_SUBJECTS, data.subjects);
    restoreStore(STORE_GOALS, data.goals);
    restoreStore(STORE_TASKS, data.tasks);
    restoreStore(STORE_EXAMS, data.exams);
    restoreStore(STORE_CHATS, data.chats);
    restoreStore(STORE_JOURNAL, data.journal);
  }
}

export const dbService = new LocalDB();
