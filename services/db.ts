import { StudySession, Subject, DEFAULT_SUBJECTS, DailyGoal, Task, Exam, ChatMessage, JournalEntry } from '../types';
import { db as firestoreDb } from './firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

const DB_NAME = 'StudySyncDB';
const DB_VERSION = 6;
const STORE_SESSIONS = 'sessions';
const STORE_SUBJECTS = 'subjects';
const STORE_GOALS = 'goals';
const STORE_TASKS = 'tasks';
const STORE_EXAMS = 'exams';
const STORE_CHATS = 'chats';
const STORE_JOURNAL = 'journal';

const STORES = [STORE_SESSIONS, STORE_SUBJECTS, STORE_GOALS, STORE_TASKS, STORE_EXAMS, STORE_CHATS, STORE_JOURNAL];

class LocalDB {
  private db: IDBDatabase | null = null;
  private userId: string | null = null;

  setUserId(id: string | null) {
    this.userId = id;
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
        
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
          sessionStore.createIndex('dateString', 'dateString', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_SUBJECTS)) {
          const subjectStore = db.createObjectStore(STORE_SUBJECTS, { keyPath: 'id' });
          DEFAULT_SUBJECTS.forEach(sub => subjectStore.add(sub));
        }

        if (!db.objectStoreNames.contains(STORE_GOALS)) {
            const goalStore = db.createObjectStore(STORE_GOALS, { keyPath: 'id' });
            goalStore.createIndex('dateString', 'dateString', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_TASKS)) {
            const taskStore = db.createObjectStore(STORE_TASKS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_EXAMS)) {
            const examStore = db.createObjectStore(STORE_EXAMS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_CHATS)) {
            const chatStore = db.createObjectStore(STORE_CHATS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_JOURNAL)) {
            const journalStore = db.createObjectStore(STORE_JOURNAL, { keyPath: 'id' });
            journalStore.createIndex('dateString', 'dateString', { unique: false });
        }
      };
    });
  }

  private async syncToFirestore(storeName: string, data: any) {
    if (!this.userId || !data.id) return;
    try {
      await setDoc(doc(firestoreDb, 'users', this.userId, storeName, data.id), data);
    } catch (e) {
      console.error(`Failed to sync to firestore (${storeName})`, e);
    }
  }

  private async deleteFromFirestore(storeName: string, id: string) {
    if (!this.userId) return;
    try {
      await deleteDoc(doc(firestoreDb, 'users', this.userId, storeName, id));
    } catch (e) {
      console.error(`Failed to delete from firestore (${storeName})`, e);
    }
  }

  async pullFromFirestore(): Promise<void> {
    if (!this.userId) return;
    const db = await this.connect();

    console.log("Starting full sync from Firestore...");

    // Iterate over all known stores and fetch data
    for (const storeName of STORES) {
        try {
            const querySnapshot = await getDocs(collection(firestoreDb, 'users', this.userId, storeName));
            if (!querySnapshot.empty) {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                
                querySnapshot.forEach((doc) => {
                    store.put(doc.data());
                });
            }
        } catch (e) {
            console.error(`Error pulling ${storeName} from Firestore`, e);
        }
    }
    console.log("Sync complete.");
  }

  // --- Sessions ---

  async saveSession(session: StudySession): Promise<void> {
    const db = await this.connect();
    // Local
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = transaction.objectStore(STORE_SESSIONS);
      const request = store.put(session);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    // Cloud
    this.syncToFirestore(STORE_SESSIONS, session);
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
    // Get keys first
    const keys = await new Promise<any[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_SESSIONS], 'readonly');
        const store = transaction.objectStore(STORE_SESSIONS);
        const index = store.index('dateString');
        const request = index.getAllKeys(dateString);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    // Delete Local
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_SESSIONS], 'readwrite');
        const store = transaction.objectStore(STORE_SESSIONS);
        keys.forEach(key => store.delete(key));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });

    // Delete Cloud
    keys.forEach(key => this.deleteFromFirestore(STORE_SESSIONS, key.toString()));
  }

  async clearAllSessions(): Promise<void> {
    const db = await this.connect();
    // Use getAllKeys to delete from cloud if needed, but for 'clear all' strictly locally is safer or complex.
    // For now, let's just clear local to avoid massive Firestore deletes without batching.
    // If you want factory reset, you'd likely want to delete the user collection in Firestore, which requires cloud functions or batching.
    // We will just clear local for safety in this simple implementation unless requested.
    
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
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_SUBJECTS, 'readwrite');
        const store = transaction.objectStore(STORE_SUBJECTS);
        const request = store.put(subject);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    this.syncToFirestore(STORE_SUBJECTS, subject);
  }

  async deleteSubject(id: string): Promise<void> {
      const db = await this.connect();
      await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_SUBJECTS, 'readwrite');
          const store = transaction.objectStore(STORE_SUBJECTS);
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
      this.deleteFromFirestore(STORE_SUBJECTS, id);
  }

  // --- Goals ---

  async getGoalsByDate(dateString: string): Promise<DailyGoal[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(STORE_GOALS)) {
            resolve([]);
            return;
        }
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
      await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_GOALS, 'readwrite');
          const store = transaction.objectStore(STORE_GOALS);
          const request = store.put(goal);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
      this.syncToFirestore(STORE_GOALS, goal);
  }

  async deleteGoal(id: string): Promise<void> {
      const db = await this.connect();
      await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_GOALS, 'readwrite');
          const store = transaction.objectStore(STORE_GOALS);
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
      this.deleteFromFirestore(STORE_GOALS, id);
  }

  async deleteGoalsByDate(dateString: string): Promise<void> {
      const db = await this.connect();
      const keys = await new Promise<any[]>((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_GOALS)) { resolve([]); return; }
          const transaction = db.transaction([STORE_GOALS], 'readonly');
          const store = transaction.objectStore(STORE_GOALS);
          const index = store.index('dateString');
          const request = index.getAllKeys(dateString);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      });

      await new Promise<void>((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_GOALS)) { resolve(); return; }
          const transaction = db.transaction([STORE_GOALS], 'readwrite');
          const store = transaction.objectStore(STORE_GOALS);
          keys.forEach(key => store.delete(key));
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
      });

      keys.forEach(key => this.deleteFromFirestore(STORE_GOALS, key.toString()));
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
        if (!db.objectStoreNames.contains(STORE_TASKS)) {
            resolve([]);
            return;
        }
        const transaction = db.transaction(STORE_TASKS, 'readonly');
        const store = transaction.objectStore(STORE_TASKS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
  }

  async saveTask(task: Task): Promise<void> {
      const db = await this.connect();
      await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_TASKS, 'readwrite');
          const store = transaction.objectStore(STORE_TASKS);
          const request = store.put(task);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
      this.syncToFirestore(STORE_TASKS, task);
  }

  async deleteTask(id: string): Promise<void> {
      const db = await this.connect();
      await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_TASKS, 'readwrite');
          const store = transaction.objectStore(STORE_TASKS);
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
      this.deleteFromFirestore(STORE_TASKS, id);
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
      await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_EXAMS, 'readwrite');
          const store = transaction.objectStore(STORE_EXAMS);
          const request = store.put(exam);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
      this.syncToFirestore(STORE_EXAMS, exam);
  }

  async deleteExam(id: string): Promise<void> {
      const db = await this.connect();
      await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_EXAMS, 'readwrite');
          const store = transaction.objectStore(STORE_EXAMS);
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
      this.deleteFromFirestore(STORE_EXAMS, id);
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
      await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_CHATS, 'readwrite');
          const store = transaction.objectStore(STORE_CHATS);
          const request = store.put(message);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
      this.syncToFirestore(STORE_CHATS, message);
  }

  async clearChatHistory(): Promise<void> {
      const db = await this.connect();
      await new Promise<void>((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_CHATS)) { resolve(); return; }
          const transaction = db.transaction(STORE_CHATS, 'readwrite');
          const store = transaction.objectStore(STORE_CHATS);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
      // Cloud clear logic optional here
  }

  // --- Journal ---

  async saveJournalEntry(entry: JournalEntry): Promise<void> {
      const db = await this.connect();
      await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_JOURNAL, 'readwrite');
          const store = transaction.objectStore(STORE_JOURNAL);
          const request = store.put(entry);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
      this.syncToFirestore(STORE_JOURNAL, entry);
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