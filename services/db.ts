
import { StudySession, Subject, DEFAULT_SUBJECTS, DailyGoal, Task, Exam, ChatMessage, JournalEntry } from '../types';
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, writeBatch, onSnapshot, Unsubscribe } from 'firebase/firestore';

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
  private unsubscribers: Unsubscribe[] = [];

  setUserId(uid: string | null) {
    this.userId = uid;
    if (!uid) {
        this.stopRealtimeSync();
    }
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
        createStore(STORE_TASKS, 'id', 'dateString'); 
        createStore(STORE_EXAMS);
        createStore(STORE_CHATS);
        createStore(STORE_JOURNAL, 'id', 'dateString');
      };
    });
  }

  // --- Real-time Sync ---

  startRealtimeSync() {
      if (!this.userId) return;
      this.stopRealtimeSync(); // Clear existing

      console.log("Starting real-time sync for user:", this.userId);

      const collections = [
          STORE_SESSIONS, STORE_SUBJECTS, STORE_GOALS, STORE_TASKS, STORE_EXAMS, STORE_JOURNAL, STORE_CHATS
      ];

      // 1. Sync Collections
      collections.forEach(colName => {
          const q = collection(db, 'users', this.userId!, colName);
          const unsub = onSnapshot(q, async (snapshot) => {
              const localDb = await this.connect();
              const tx = localDb.transaction(colName, 'readwrite');
              const store = tx.objectStore(colName);

              snapshot.docChanges().forEach((change) => {
                  if (change.type === 'added' || change.type === 'modified') {
                      store.put(change.doc.data());
                  }
                  if (change.type === 'removed') {
                      store.delete(change.doc.id);
                  }
              });

              tx.oncomplete = () => {
                  window.dispatchEvent(new Event('omni_sync_complete'));
              };
          });
          this.unsubscribers.push(unsub);
      });

      // 2. Sync Settings (LocalStorage)
      const settingsRef = doc(db, 'users', this.userId, 'settings', 'config');
      const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              
              // Handle Habits Merge specifically if needed, or overwrite
              // For robustness, if cloud updates, we generally accept cloud state as truth in real-time
              // But to prevent overwriting active local changes instantly, we might check timestamps if we had them.
              // For now, simpler: Cloud update -> LocalStorage
              
              Object.keys(data).forEach(key => {
                  if (LOCAL_STORAGE_KEYS.includes(key)) {
                      localStorage.setItem(key, data[key]);
                  }
              });
          } else {
              // Document deleted (Factory Reset likely)
              // We might want to clear local storage settings or leave them default
              // Let's clear habits/history specifically
              localStorage.removeItem('omni_habits');
              localStorage.removeItem('omni_chat_history');
          }
          window.dispatchEvent(new Event('omni_sync_complete'));
          window.dispatchEvent(new Event('storage')); // Trigger React storage listeners
      });
      this.unsubscribers.push(unsubSettings);
  }

  stopRealtimeSync() {
      this.unsubscribers.forEach(unsub => unsub());
      this.unsubscribers = [];
  }

  // --- CRUD Overrides (Write Local + Cloud) ---

  private async syncToFirestore(collectionName: string, data: any) {
    if (!this.userId) return; 
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

  async syncSettingsToCloud() {
    if (!this.userId) return;
    try {
        const data: Record<string, string> = {};
        LOCAL_STORAGE_KEYS.forEach(key => {
            const val = localStorage.getItem(key);
            if (val !== null) data[key] = val;
        });
        await setDoc(doc(db, 'users', this.userId, 'settings', 'config'), data, { merge: true });
    } catch (e) {
        console.error("Failed to sync settings", e);
    }
  }

  // --- Initial Pull (still useful for immediate hydration before listeners kick in) ---
  
  async pullFromFirestore() {
      if (!this.userId) return;
      // Note: Real-time listeners will handle this mostly, but an initial pull ensures 
      // we have data before the first render if possible, or we just rely on listeners.
      // We will rely on listeners for simplicity and correctness now.
  }

  // Helper to push local to cloud on first login (Merge)
  async syncLocalToCloud() {
      if (!this.userId) return;
      
      await this.syncSettingsToCloud();

      const collections = [
          STORE_SESSIONS, STORE_SUBJECTS, STORE_GOALS, STORE_TASKS, STORE_EXAMS, STORE_JOURNAL, STORE_CHATS
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

  async deleteTasksByDate(dateString: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_TASKS)) { resolve(); return; }
          const transaction = db.transaction([STORE_TASKS], 'readwrite');
          const store = transaction.objectStore(STORE_TASKS);
          // Fallback scan if index missing in old version
          const request = store.getAll();
          request.onsuccess = () => {
              const allTasks = request.result as Task[];
              allTasks.forEach(t => {
                  if(t.dateString === dateString) {
                      store.delete(t.id);
                      this.deleteFromFirestore(STORE_TASKS, t.id);
                  }
              });
          }
          
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
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

  // --- Chat History ---

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
          request.onsuccess = () => {
              this.syncToFirestore(STORE_CHATS, message);
              resolve();
          };
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

  async deleteJournalByDate(dateString: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction([STORE_JOURNAL], 'readwrite');
          const store = transaction.objectStore(STORE_JOURNAL);
          const index = store.index('dateString');
          const request = index.getAllKeys(dateString);

          request.onsuccess = () => {
              const keys = request.result;
              keys.forEach(key => {
                  store.delete(key);
                  this.deleteFromFirestore(STORE_JOURNAL, key as string);
              });
          };
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
      });
  }

  // --- Global Reset ---

  async factoryReset(): Promise<void> {
      // 1. Wipe Cloud Data (Listeners will wipe local data automatically)
      if (this.userId) {
          const collections = [
              STORE_SESSIONS, STORE_SUBJECTS, STORE_GOALS, STORE_TASKS, STORE_EXAMS, STORE_JOURNAL, STORE_CHATS
          ];
          
          const batch = writeBatch(db);
          
          // We can't batch delete collections in client SDK easily, we have to fetch docs then delete.
          // This is a heavy operation but robust for "Factory Reset".
          for (const col of collections) {
              const snapshot = await getDocs(collection(db, 'users', this.userId, col));
              snapshot.forEach(doc => batch.delete(doc.ref));
          }
          
          // Delete settings
          batch.delete(doc(db, 'users', this.userId, 'settings', 'config'));
          
          await batch.commit();
      } else {
          // Local Only Reset
          const db = await this.connect();
          const stores = [STORE_SESSIONS, STORE_SUBJECTS, STORE_GOALS, STORE_TASKS, STORE_EXAMS, STORE_JOURNAL, STORE_CHATS];
          const tx = db.transaction(stores, 'readwrite');
          stores.forEach(s => tx.objectStore(s).clear());
          
          // Clear Local Storage
          LOCAL_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
          
          window.dispatchEvent(new Event('omni_sync_complete'));
      }
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
}

export const dbService = new LocalDB();
