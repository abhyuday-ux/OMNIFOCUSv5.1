
import { StudySession, Subject, DEFAULT_SUBJECTS, DailyGoal, Task, Exam, ChatMessage, JournalEntry, CustomSound, UserProfile, Friend, FriendStatus } from '../types';
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, writeBatch, onSnapshot, Unsubscribe, query, where, updateDoc, increment, limit } from 'firebase/firestore';

const DB_NAME = 'StudySyncDB';
const DB_VERSION = 7; 
const STORE_SESSIONS = 'sessions';
const STORE_SUBJECTS = 'subjects';
const STORE_GOALS = 'goals';
const STORE_TASKS = 'tasks';
const STORE_EXAMS = 'exams';
const STORE_CHATS = 'chats';
const STORE_JOURNAL = 'journal';
const STORE_CUSTOM_SOUNDS = 'custom_sounds';

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
    } else {
        this.ensureUserProfile();
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
        createStore(STORE_CUSTOM_SOUNDS);
      };
    });
  }

  // --- Real-time Sync ---
  startRealtimeSync() {
      if (!this.userId) return;
      this.stopRealtimeSync(); 
      console.log("Starting real-time sync for user:", this.userId);

      const collections = [STORE_SESSIONS, STORE_SUBJECTS, STORE_GOALS, STORE_TASKS, STORE_EXAMS, STORE_JOURNAL, STORE_CHATS];

      collections.forEach(colName => {
          const q = collection(db, 'users', this.userId!, colName);
          let isInitialLoad = true;
          const unsub = onSnapshot(q, async (snapshot) => {
              const localDb = await this.connect();
              const tx = localDb.transaction(colName, 'readwrite');
              const store = tx.objectStore(colName);
              if (isInitialLoad) {
                  const cloudIds = new Set(snapshot.docs.map(d => d.id));
                  const getAllKeysReq = store.getAllKeys();
                  getAllKeysReq.onsuccess = () => {
                      const localIds = getAllKeysReq.result as string[];
                      localIds.forEach(localId => {
                          if (!cloudIds.has(localId)) store.delete(localId);
                      });
                  };
                  isInitialLoad = false;
              }
              snapshot.docChanges().forEach((change) => {
                  if (change.type === 'added' || change.type === 'modified') store.put(change.doc.data());
                  if (change.type === 'removed') store.delete(change.doc.id);
              });
              tx.oncomplete = () => window.dispatchEvent(new Event('omni_sync_complete'));
          });
          this.unsubscribers.push(unsub);
      });

      const settingsRef = doc(db, 'users', this.userId, 'settings', 'config');
      const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              Object.keys(data).forEach(key => {
                  if (LOCAL_STORAGE_KEYS.includes(key)) {
                      const currentValue = localStorage.getItem(key);
                      if (currentValue !== data[key]) localStorage.setItem(key, data[key]);
                  }
              });
          } else {
              LOCAL_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
          }
          window.dispatchEvent(new Event('omni_sync_complete'));
          window.dispatchEvent(new Event('storage'));
      });
      this.unsubscribers.push(unsubSettings);
  }

  stopRealtimeSync() {
      this.unsubscribers.forEach(unsub => unsub());
      this.unsubscribers = [];
  }

  // --- Social & Leaderboard Features ---

  async ensureUserProfile() {
      if (!this.userId) return;
      const userRef = doc(db, 'user_profiles', this.userId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
          const sessions = await this.getAllSessions();
          const totalTime = sessions.reduce((acc, s) => acc + s.durationMs, 0);
          await setDoc(userRef, {
              uid: this.userId,
              totalFocusMs: totalTime,
              lastActive: Date.now()
          }, { merge: true });
      }
  }

  async getUserProfile(): Promise<UserProfile | null> {
      if (!this.userId) return null;
      const snap = await getDoc(doc(db, 'user_profiles', this.userId));
      return snap.exists() ? snap.data() as UserProfile : null;
  }

  // 1. Check Username Availability
  async isUsernameTaken(username: string): Promise<boolean> {
      const normalized = username.toLowerCase().trim();
      const usernameRef = doc(db, 'usernames', normalized);
      const snap = await getDoc(usernameRef);
      return snap.exists();
  }

  // 2. Claim Username (Atomic Batch)
  async claimUsername(username: string) {
      if(!this.userId) return;
      const normalized = username.toLowerCase().trim();
      const batch = writeBatch(db);

      // Create entries in 'usernames' collection
      const usernameRef = doc(db, 'usernames', normalized);
      batch.set(usernameRef, { uid: this.userId });

      // Update user profile
      const profileRef = doc(db, 'user_profiles', this.userId);
      batch.update(profileRef, { username: normalized });

      await batch.commit();
  }

  // Update cumulative focus time
  async updateUserFocusTime(addedDurationMs: number) {
      if (!this.userId) return;
      const userRef = doc(db, 'user_profiles', this.userId);
      try {
          await updateDoc(userRef, {
              totalFocusMs: increment(addedDurationMs),
              lastActive: Date.now()
          });
      } catch (e) {
          await this.ensureUserProfile();
      }
  }

  // 3. Find User via Username Lookup
  async findUserByUsername(queryStr: string): Promise<UserProfile | null> {
      const cleanQuery = queryStr.startsWith('@') ? queryStr.substring(1) : queryStr;
      const normalized = cleanQuery.toLowerCase().trim();

      // Look up UID from usernames collection
      const usernameRef = doc(db, 'usernames', normalized);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
          const uid = usernameSnap.data().uid;
          // Fetch full profile
          const profileSnap = await getDoc(doc(db, 'user_profiles', uid));
          if (profileSnap.exists()) return profileSnap.data() as UserProfile;
      }

      return null;
  }

  async sendFriendRequest(friendUid: string) {
      if (!this.userId || this.userId === friendUid) return;
      const batch = writeBatch(db);
      const myRef = doc(db, 'users', this.userId, 'friends', friendUid);
      batch.set(myRef, { uid: friendUid, status: 'pending_sent', addedAt: Date.now() });
      const theirRef = doc(db, 'users', friendUid, 'friends', this.userId);
      batch.set(theirRef, { uid: this.userId, status: 'pending_received', addedAt: Date.now() });
      await batch.commit();
  }

  async acceptFriendRequest(friendUid: string) {
      if (!this.userId) return;
      const batch = writeBatch(db);
      const myRef = doc(db, 'users', this.userId, 'friends', friendUid);
      batch.update(myRef, { status: 'accepted' });
      const theirRef = doc(db, 'users', friendUid, 'friends', this.userId);
      batch.update(theirRef, { status: 'accepted' });
      await batch.commit();
  }

  subscribeToFriends(callback: (friends: Friend[]) => void): Unsubscribe | null {
      if (!this.userId) return null;
      const q = collection(db, 'users', this.userId, 'friends');
      return onSnapshot(q, async (snapshot) => {
          const friends: Friend[] = [];
          const friendDocs = snapshot.docs.map(d => d.data() as Friend);
          
          // Parallel fetch profiles for efficiency
          const profilePromises = friendDocs.map(async (f) => {
              if (f.status === 'accepted' || f.status === 'pending_received') {
                  const pSnap = await getDoc(doc(db, 'user_profiles', f.uid));
                  if (pSnap.exists()) {
                      f.profile = pSnap.data() as UserProfile;
                  }
              }
              return f;
          });

          const resolvedFriends = await Promise.all(profilePromises);
          callback(resolvedFriends);
      });
  }

  async getFriendTasks(friendUid: string, dateString: string): Promise<Task[]> {
      try {
          const q = query(collection(db, 'users', friendUid, 'tasks'), where('dateString', '==', dateString));
          const snap = await getDocs(q);
          return snap.docs.map(d => d.data() as Task);
      } catch (e) {
          console.error("Could not fetch friend tasks.", e);
          return [];
      }
  }

  async updateProfileMeta(name: string, email: string, photoURL: string | null) {
      if (!this.userId) return;
      const userRef = doc(db, 'user_profiles', this.userId);
      await setDoc(userRef, {
          displayName: name,
          email: email,
          photoURL: photoURL,
          lastActive: Date.now()
      }, { merge: true });
  }

  private async syncToFirestore(collectionName: string, data: any) {
    if (!this.userId || collectionName === STORE_CUSTOM_SOUNDS) return;
    try { await setDoc(doc(db, 'users', this.userId, collectionName, data.id), data); } catch (e) { console.error(`Failed to sync ${collectionName}`, e); }
  }

  private async deleteFromFirestore(collectionName: string, id: string) {
    if (!this.userId || collectionName === STORE_CUSTOM_SOUNDS) return;
    try { await deleteDoc(doc(db, 'users', this.userId, collectionName, id)); } catch (e) { console.error(`Failed to delete ${collectionName}`, e); }
  }

  private async deleteCloudDocsByDate(collectionName: string, dateString: string) {
      if (!this.userId) return;
      try {
          const q = query(collection(db, 'users', this.userId, collectionName), where('dateString', '==', dateString));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
      } catch (e) { console.error(`Batch delete failed`, e); }
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
    } catch (e) { console.error("Failed to sync settings", e); }
  }
  
  async pullFromFirestore() { if (!this.userId) return; }

  async syncLocalToCloud() {
      if (!this.userId) return;
      await this.syncSettingsToCloud();
      const collections = [STORE_SESSIONS, STORE_SUBJECTS, STORE_GOALS, STORE_TASKS, STORE_EXAMS, STORE_JOURNAL, STORE_CHATS];
      const db = await this.connect();
      for (const colName of collections) {
          const tx = db.transaction(colName, 'readonly');
          const store = tx.objectStore(colName);
          const request = store.getAll();
          request.onsuccess = () => {
              const items = request.result;
              items.forEach(item => this.syncToFirestore(colName, item));
          };
      }
  }

  async saveSession(session: StudySession): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = transaction.objectStore(STORE_SESSIONS);
      const request = store.put(session);
      request.onsuccess = () => {
          this.syncToFirestore(STORE_SESSIONS, session);
          this.updateUserFocusTime(session.durationMs);
          resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSession(id: string): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_SESSIONS, 'readwrite');
        const store = transaction.objectStore(STORE_SESSIONS);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            const session = getReq.result as StudySession;
            const request = store.delete(id);
            request.onsuccess = () => {
                this.deleteFromFirestore(STORE_SESSIONS, id);
                if (session) this.updateUserFocusTime(-session.durationMs);
                resolve();
            };
            request.onerror = () => reject(request.error);
        };
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
    await this.deleteCloudDocsByDate(STORE_SESSIONS, dateString);
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SESSIONS], 'readwrite');
        const store = transaction.objectStore(STORE_SESSIONS);
        const index = store.index('dateString');
        const request = index.getAllKeys(dateString);
        request.onsuccess = () => {
            const keys = request.result;
            keys.forEach(key => store.delete(key));
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- Basic CRUD for other stores (Simplified for brevity as they follow pattern) ---
  async getSubjects(): Promise<Subject[]> { return this.getAllFromStore(STORE_SUBJECTS, DEFAULT_SUBJECTS); }
  async saveSubject(item: Subject) { await this.saveToStore(STORE_SUBJECTS, item); }
  async deleteSubject(id: string) { await this.deleteFromStore(STORE_SUBJECTS, id); }
  
  async getGoalsByDate(dateString: string): Promise<DailyGoal[]> { return this.getByDateFromStore(STORE_GOALS, dateString); }
  async getAllGoals(): Promise<DailyGoal[]> { return this.getAllFromStore(STORE_GOALS); }
  async saveGoal(item: DailyGoal) { await this.saveToStore(STORE_GOALS, item); }
  async deleteGoal(id: string) { await this.deleteFromStore(STORE_GOALS, id); }
  async deleteGoalsByDate(date: string) { await this.deleteByDate(STORE_GOALS, date); }

  async getTasks(): Promise<Task[]> { return this.getAllFromStore(STORE_TASKS); }
  async saveTask(item: Task) { await this.saveToStore(STORE_TASKS, item); }
  async deleteTask(id: string) { await this.deleteFromStore(STORE_TASKS, id); }
  async deleteTasksByDate(date: string) { await this.deleteByDate(STORE_TASKS, date); }

  async getExams(): Promise<Exam[]> { return this.getAllFromStore(STORE_EXAMS); }
  async saveExam(item: Exam) { await this.saveToStore(STORE_EXAMS, item); }
  async deleteExam(id: string) { await this.deleteFromStore(STORE_EXAMS, id); }

  async getChatHistory(): Promise<ChatMessage[]> { return this.getAllFromStore(STORE_CHATS); }
  async saveChatMessage(item: ChatMessage) { await this.saveToStore(STORE_CHATS, item); }

  async getJournalEntryByDate(date: string): Promise<JournalEntry | null> {
      const db = await this.connect();
      return new Promise((resolve) => {
          if (!db.objectStoreNames.contains(STORE_JOURNAL)) return resolve(null);
          const tx = db.transaction(STORE_JOURNAL, 'readonly');
          const idx = tx.objectStore(STORE_JOURNAL).index('dateString');
          idx.get(date).onsuccess = (e) => resolve((e.target as IDBRequest).result || null);
      });
  }
  async getAllJournalEntries(): Promise<JournalEntry[]> { return this.getAllFromStore(STORE_JOURNAL); }
  async saveJournalEntry(item: JournalEntry) { await this.saveToStore(STORE_JOURNAL, item); }
  async deleteJournalByDate(date: string) { await this.deleteByDate(STORE_JOURNAL, date); }

  async getCustomSounds(): Promise<CustomSound[]> { return this.getAllFromStore(STORE_CUSTOM_SOUNDS); }
  async saveCustomSound(item: CustomSound) { await this.saveToStore(STORE_CUSTOM_SOUNDS, item, true); }
  async deleteCustomSound(id: string) { await this.deleteFromStore(STORE_CUSTOM_SOUNDS, id, true); }

  // --- Generic Helpers ---
  private async getAllFromStore(storeName: string, defaults: any[] = []): Promise<any[]> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(storeName)) { resolve(defaults); return; }
          const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
          req.onsuccess = () => resolve(req.result.length ? req.result : defaults);
          req.onerror = () => reject(req.error);
      });
  }
  private async saveToStore(storeName: string, item: any, localOnly = false) {
      const db = await this.connect();
      return new Promise<void>((resolve, reject) => {
          const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(item);
          req.onsuccess = () => { if(!localOnly) this.syncToFirestore(storeName, item); resolve(); };
          req.onerror = () => reject(req.error);
      });
  }
  private async deleteFromStore(storeName: string, id: string, localOnly = false) {
      const db = await this.connect();
      return new Promise<void>((resolve, reject) => {
          const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
          req.onsuccess = () => { if(!localOnly) this.deleteFromFirestore(storeName, id); resolve(); };
          req.onerror = () => reject(req.error);
      });
  }
  private async getByDateFromStore(storeName: string, date: string): Promise<any[]> {
      const db = await this.connect();
      return new Promise((resolve) => {
          if (!db.objectStoreNames.contains(storeName)) return resolve([]);
          const idx = db.transaction(storeName, 'readonly').objectStore(storeName).index('dateString');
          idx.getAll(date).onsuccess = (e) => resolve((e.target as IDBRequest).result);
      });
  }
  private async deleteByDate(storeName: string, date: string) {
      await this.deleteCloudDocsByDate(storeName, date);
      const db = await this.connect();
      return new Promise<void>((resolve) => {
          const tx = db.transaction([storeName], 'readwrite');
          const idx = tx.objectStore(storeName).index('dateString');
          idx.getAllKeys(date).onsuccess = (e) => {
              (e.target as IDBRequest).result.forEach((k: any) => tx.objectStore(storeName).delete(k));
          };
          tx.oncomplete = () => resolve();
      });
  }

  async factoryReset(): Promise<void> {
      if (this.userId) {
          const collections = [STORE_SESSIONS, STORE_SUBJECTS, STORE_GOALS, STORE_TASKS, STORE_EXAMS, STORE_JOURNAL, STORE_CHATS];
          const batch = writeBatch(db);
          for (const col of collections) {
              const snapshot = await getDocs(collection(db, 'users', this.userId, col));
              snapshot.forEach(doc => batch.delete(doc.ref));
          }
          batch.delete(doc(db, 'users', this.userId, 'settings', 'config'));
          batch.update(doc(db, 'user_profiles', this.userId), { totalFocusMs: 0 });
          await batch.commit();
      } 
      const dbInstance = await this.connect();
      const stores = [STORE_SESSIONS, STORE_SUBJECTS, STORE_GOALS, STORE_TASKS, STORE_EXAMS, STORE_JOURNAL, STORE_CHATS, STORE_CUSTOM_SOUNDS];
      const existingStores = stores.filter(s => dbInstance.objectStoreNames.contains(s));
      const tx = dbInstance.transaction(existingStores, 'readwrite');
      existingStores.forEach(s => tx.objectStore(s).clear());
      LOCAL_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
      window.dispatchEvent(new Event('omni_sync_complete'));
  }

  async createBackup(): Promise<any> {
    return {
        sessions: await this.getAllSessions(),
        subjects: await this.getSubjects(),
        goals: await this.getAllGoals(),
        tasks: await this.getTasks(),
        exams: await this.getExams(),
        chats: await this.getChatHistory(),
        journal: await this.getAllJournalEntries(),
        customSounds: await this.getCustomSounds()
    };
  }
}

export const dbService = new LocalDB();
