import { syncAllData } from './services/firebase';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStopwatch } from './hooks/useStopwatch';
import { SubjectPicker } from './components/SubjectPicker';
import { TimerDisplay } from './components/TimerDisplay';
import { HistoryList } from './components/HistoryList';
import { HeatmapCalendar } from './components/HeatmapCalendar';
import { DailyTimeline } from './components/DailyTimeline';
import { GoalChecklist } from './components/GoalChecklist';
import { MobileNav, MobileTab } from './components/MobileNav';
import { SubjectManager } from './components/SubjectManager';
import { SubjectDonut } from './components/SubjectDonut';
import { JournalPage } from './components/JournalPage';
import { HabitsPage } from './components/HabitsPage';
import { Dashboard } from './components/Dashboard'; 
import { LoginPage } from './components/LoginPage';
import { KanbanBoard } from './components/KanbanBoard';
import { QuickAIAssistant } from './components/QuickAIAssistant';
import { dbService } from './services/db';
import { StudySession, Subject, DEFAULT_SUBJECTS, DailyGoal, isHexColor, Task } from './types';
import { Zap, Wifi, WifiOff, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Settings, Timer, BarChart3, CalendarDays, Target, Trash2, AlertCircle, PanelLeftClose, PanelLeftOpen, CheckSquare, Palette, Image as ImageIcon, ToggleLeft, ToggleRight, Maximize2, X, BookOpen, Repeat, Home, AlertTriangle, Download, Upload, Database, Layout, Rocket, Globe, RotateCcw, LogIn, LogOut, Flame } from 'lucide-react';
import { useTheme, ACCENT_COLORS } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';

const WALLPAPERS = [
  { id: 'mountains', label: 'Midnight Peaks', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80' },
  { id: 'forest', label: 'Misty Forest', url: 'https://images.unsplash.com/photo-1448375240586-dfd8d395ea6c?auto=format&fit=crop&w=2000&q=80' },
  { id: 'rain', label: 'City Rain', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=2000&q=80' },
  { id: 'space', label: 'Deep Space', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=80' },
  { id: 'lofi', label: 'Lofi Room', url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=2000&q=80' },
  { id: 'abstract', label: 'Dark Abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80' },
];

const DEFAULT_ISS_URL = "https://www.youtube.com/watch?v=xRPjKQtRKT8"; // NASA Live Stream

const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const App: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [targetHours, setTargetHours] = useState(4);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Auth Context
  const { currentUser, signInWithGoogle, logout } = useAuth();
  const [showLoginPage, setShowLoginPage] = useState(false); // State for login overlay

  // Wallpaper / Zen State
  const [wallpaper, setWallpaper] = useState<string>('');
  const [showWallpaperOnHome, setShowWallpaperOnHome] = useState(false);
  const [enableZenMode, setEnableZenMode] = useState(false);
  const [isZenActive, setIsZenActive] = useState(false);
  const [showZenPrompt, setShowZenPrompt] = useState(false);

  // Space Mode State
  const [isSpaceMode, setIsSpaceMode] = useState(false);
  const [spaceVideoUrl, setSpaceVideoUrl] = useState(DEFAULT_ISS_URL);

  const { accent, setAccent } = useTheme();
  
  // UI State - Default to 'dashboard'
  const [activeTab, setActiveTab] = useState<MobileTab>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubjectManagerOpen, setIsSubjectManagerOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ type: 'today' | 'all'; title: string; message: string; } | null>(null);
  
  // Desktop Focus Panel State
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(false);

  // Shared View State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Firebase Config State
  const [firebaseConfigInput, setFirebaseConfigInput] = useState('');
// --- CLOUD SYNC LISTENER ---
  useEffect(() => {
    const handleSync = (event: any) => {
      const cloudData = event.detail;
      if (!cloudData) return;

      // Update local state with cloud data
      if (cloudData.subjects) setSubjects(cloudData.subjects);
      if (cloudData.allSessions) setAllSessions(cloudData.allSessions);
      if (cloudData.dailyGoals) setDailyGoals(cloudData.dailyGoals);
      if (cloudData.tasks) setTasks(cloudData.tasks);
      if (cloudData.targetHours) setTargetHours(cloudData.targetHours);
    };

    window.addEventListener('firebase-sync', handleSync);
    return () => window.removeEventListener('firebase-sync', handleSync);
  }, []);

  // --- AUTO-SAVE TRIGGER ---
  useEffect(() => {
    // Note: using 'currentUser' as defined on your line 51
    if (currentUser) {
      syncAllData({
        subjects,
        allSessions,
        dailyGoals,
        tasks,
        targetHours
      });
    }
  }, [subjects, allSessions, dailyGoals, tasks, targetHours, currentUser]);
  useEffect(() => {
    const initData = async () => {
      try {
        await refreshSubjects();
        loadSessions();
        loadGoals();
        loadTasks();
        
        // Load target hours
        const savedTarget = localStorage.getItem('studySync_targetHours');
        if (savedTarget) setTargetHours(parseFloat(savedTarget));

        // Load Wallpaper Settings
        const savedWallpaper = localStorage.getItem('omni_wallpaper');
        if (savedWallpaper) setWallpaper(savedWallpaper);
        
        const savedShowHome = localStorage.getItem('omni_wallpaper_home');
        if (savedShowHome) setShowWallpaperOnHome(savedShowHome === 'true');

        // Load Zen Settings
        const savedZenEnabled = localStorage.getItem('studySync_enableZenMode');
        if (savedZenEnabled) setEnableZenMode(savedZenEnabled === 'true');
        
        // Migrate old zen wallpaper if new one isn't set
        const oldZenUrl = localStorage.getItem('studySync_zenWallpaperUrl');
        if (oldZenUrl && !savedWallpaper) {
            setWallpaper(oldZenUrl);
            localStorage.setItem('omni_wallpaper', oldZenUrl);
        }

        // Load Space Mode URL
        const savedSpaceUrl = localStorage.getItem('omni_space_url');
        if (savedSpaceUrl) setSpaceVideoUrl(savedSpaceUrl);

        // Load Firebase Config
        const savedFirebaseConfig = localStorage.getItem('omni_firebase_config');
        if (savedFirebaseConfig) setFirebaseConfigInput(savedFirebaseConfig);

      } catch (e) {
        console.error("Failed to initialize DB", e);
      }
    };
    initData();

    // Listen for sync event from AuthProvider
    const handleSyncComplete = () => {
        initData();
        // Force refresh UI a bit
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 1000);
    };
    window.addEventListener('omni_sync_complete', handleSyncComplete);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('omni_sync_complete', handleSyncComplete);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch goals whenever date changes
  useEffect(() => {
      loadGoals();
  }, [selectedDate]);

  const refreshSubjects = async () => {
      const storedSubjects = await dbService.getSubjects();
      setSubjects(storedSubjects.length ? storedSubjects : DEFAULT_SUBJECTS);
  };

  const loadSessions = async () => {
    const sessions = await dbService.getAllSessions();
    setAllSessions(sessions);
  };

  const loadGoals = async () => {
      const goals = await dbService.getGoalsByDate(selectedDate);
      setDailyGoals(goals);
  };

  const loadTasks = async () => {
    const t = await dbService.getTasks();
    setTasks(t);
  };

  const handleSessionComplete = useCallback(() => {
    loadSessions();
  }, []);

  const handleTargetHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setTargetHours(val);
      localStorage.setItem('studySync_targetHours', val.toString());
  };

  const handleZenToggle = () => {
      const newState = !enableZenMode;
      setEnableZenMode(newState);
      localStorage.setItem('studySync_enableZenMode', String(newState));
  };

  const handleWallpaperChange = (url: string) => {
      setWallpaper(url);
      localStorage.setItem('omni_wallpaper', url);
  };

  const handleShowWallpaperToggle = () => {
      const newVal = !showWallpaperOnHome;
      setShowWallpaperOnHome(newVal);
      localStorage.setItem('omni_wallpaper_home', String(newVal));
  };

  const handleSpaceUrlChange = (url: string) => {
      setSpaceVideoUrl(url);
      localStorage.setItem('omni_space_url', url);
  };

  const handleSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    await dbService.pullFromFirestore(); // Manual trigger
    await refreshSubjects();
    loadSessions();
    loadGoals();
    loadTasks();
    setTimeout(() => { setIsSyncing(false); }, 1500);
  };

  const handleSaveFirebaseConfig = () => {
      try {
          if (firebaseConfigInput.trim()) {
            JSON.parse(firebaseConfigInput); // Validate JSON
            localStorage.setItem('omni_firebase_config', firebaseConfigInput);
          } else {
             localStorage.removeItem('omni_firebase_config');
          }
          alert("Configuration saved. The page will now reload.");
          window.location.reload();
      } catch (e) {
          alert("Invalid JSON format. Please check your configuration string.");
      }
  };

  const handleResetFirebaseConfig = () => {
      if(confirm("Reset to default configuration?")) {
          localStorage.removeItem('omni_firebase_config');
          setFirebaseConfigInput('');
          window.location.reload();
      }
  };

  const handleExport = async () => {
    const dbData = await dbService.createBackup();
    const localData: Record<string, string | null> = {};
    
    // Backup relevant local storage keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('omni_') || key.startsWith('studySync_'))) {
            localData[key] = localStorage.getItem(key);
        }
    }

    const backup = {
        version: 1,
        date: new Date().toISOString(),
        db: dbData,
        local: localData
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenfocus_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            
            if (confirm("Importing a file will overwrite your current local data. The app will reload after import. Continue?")) {
                // Restore DB
                if (json.db) {
                    await dbService.restoreBackup(json.db);
                }
                
                // Restore LocalStorage
                if (json.local) {
                    Object.entries(json.local).forEach(([key, value]) => {
                        if (value !== null && typeof value === 'string') {
                            localStorage.setItem(key, value);
                        }
                    });
                }
                
                alert("Data restored successfully! Please refresh the page.");
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            alert("Failed to import data. Invalid file format.");
        }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  // --- Deletion Logic ---

  const requestClearToday = () => {
    setConfirmModal({
        type: 'today',
        title: "Clear Today's Progress?",
        message: "This will permanently delete all study sessions and goals recorded for today. This action cannot be undone."
    });
  };

  const requestClearAll = () => {
      setConfirmModal({
          type: 'all',
          title: "Reset All Progress?",
          message: "WARNING: This will permanently delete your entire history of sessions and goals. Your subjects and settings will remain. This action cannot be undone."
      });
  };

  const executeClear = async () => {
      if (!confirmModal) return;

      if (confirmModal.type === 'today') {
          const today = new Date().toISOString().split('T')[0];
          await dbService.deleteSessionsByDate(today);
          await dbService.deleteGoalsByDate(today);
      } else if (confirmModal.type === 'all') {
          await dbService.clearAllSessions();
          await dbService.clearAllGoals();
      }

      // Refresh UI
      await loadSessions();
      await loadGoals();
      setConfirmModal(null);
  };

  const { elapsedMs, status, mode, currentSubjectId, setSubjectId, setMode, start, pause, stop } = useStopwatch(DEFAULT_SUBJECTS[0].id, handleSessionComplete);
  const currentSubject = subjects.find(s => s.id === currentSubjectId) || subjects[0];

  // Derived Data
  const selectedDateSessions = useMemo(() => allSessions.filter(s => s.dateString === selectedDate), [allSessions, selectedDate]);
  const todaySessions = useMemo(() => allSessions.filter(s => s.dateString === new Date().toISOString().split('T')[0]), [allSessions]);
  const dailyTotalMs = selectedDateSessions.reduce((acc, curr) => acc + curr.durationMs, 0);
  
  // Lifetime Stats
  const lifetimeTotalMs = useMemo(() => allSessions.reduce((acc, s) => acc + s.durationMs, 0), [allSessions]);
  const averageSessionMs = useMemo(() => allSessions.length ? lifetimeTotalMs / allSessions.length : 0, [lifetimeTotalMs, allSessions]);

  // Calculate total time for current subject today
  const currentSubjectTodayTotal = useMemo(() => {
      return todaySessions
        .filter(s => s.subjectId === currentSubjectId)
        .reduce((acc, curr) => acc + curr.durationMs, 0);
  }, [todaySessions, currentSubjectId]);

  const changeDate = (offset: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + offset);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // --- Start / Zen Logic ---

  const handleStartRequest = () => {
      if (enableZenMode && wallpaper && status === 'idle' && !isZenActive && !isSpaceMode) {
          setShowZenPrompt(true);
      } else {
          start();
      }
  };

  const handleZenResponse = (shouldEnter: boolean) => {
      setShowZenPrompt(false);
      start(); // Always start the timer
      if (shouldEnter) {
          setIsZenActive(true);
      }
  };

  // --- Render Components ---

  const Header = () => (
    <div className="flex justify-between items-center mb-6">
       <div className="flex items-center gap-2">
         <div className={`w-8 h-8 bg-${accent}-500/20 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center shadow-lg shadow-${accent}-500/10`}>
           <Zap size={18} className={`text-${accent}-400 fill-${accent}-400`} />
         </div>
         <h1 className="font-bold text-xl tracking-tight text-slate-100">OMNIFOCUS</h1>
       </div>
       <div className="flex items-center gap-2">
           <button 
             onClick={handleSync}
             disabled={!isOnline || isSyncing}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
           >
             {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
             <span className="hidden sm:inline">{isSyncing ? 'Syncing' : isOnline ? 'Online' : 'Offline'}</span>
           </button>
           
           {/* Login Button */}
           {currentUser ? (
               <div className="flex items-center gap-2 bg-white/5 rounded-full pl-1 pr-3 py-1 border border-white/5">
                   <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.email}`} alt="User" className="w-6 h-6 rounded-full" />
                   <button onClick={logout} className="text-xs text-slate-400 hover:text-white transition-colors" title="Log Out"><LogOut size={12}/></button>
               </div>
           ) : (
               <button onClick={() => setShowLoginPage(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-full text-xs font-bold text-white transition-all">
                   <LogIn size={12} /> Sign In
               </button>
           )}
       </div>
    </div>
  );

  const MobileDrawer = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'tasks' | 'ai'>('tasks');

    return (
      <>
        {isOpen && <div className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm" onClick={() => setIsOpen(false)} />}
        <div className={`fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${isOpen ? 'translate-y-0 h-[70vh]' : 'translate-y-[calc(100%-3rem)] h-[70vh]'}`}>
            <div className="w-full h-12 flex items-center justify-center cursor-pointer active:bg-white/5 rounded-t-3xl" onClick={() => setIsOpen(!isOpen)}>
                <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
            </div>
            
            <div className="px-6 flex gap-6 border-b border-white/5 mb-4">
                <button onClick={() => setView('tasks')} className={`pb-3 text-sm font-bold transition-all relative ${view === 'tasks' ? `text-${accent}-400` : 'text-slate-500'}`}>
                    Tasks
                    {view === 'tasks' && <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-${accent}-400 rounded-full`} />}
                </button>
                <button onClick={() => setView('ai')} className={`pb-3 text-sm font-bold transition-all relative ${view === 'ai' ? `text-${accent}-400` : 'text-slate-500'}`}>
                    AI Assistant
                    {view === 'ai' && <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-${accent}-400 rounded-full`} />}
                </button>
            </div>

            <div className="px-4 h-[calc(100%-120px)] overflow-y-auto custom-scrollbar">
                {view === 'tasks' ? (
                     <KanbanBoard tasks={tasks} subjects={subjects} onTaskUpdate={loadTasks} onStartSession={(sid) => { setSubjectId(sid); setIsOpen(false); }} />
                ) : (
                    <QuickAIAssistant subjects={subjects} />
                )}
            </div>
        </div>
      </>
    );
  };

  const ConfirmationModal = () => {
    if (!confirmModal) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4 text-red-400">
                    <AlertTriangle size={32} />
                    <h3 className="text-xl font-bold text-white leading-tight">{confirmModal.title}</h3>
                </div>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">{confirmModal.message}</p>
                <div className="flex gap-3">
                    <button onClick={() => setConfirmModal(null)} className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors border border-white/5">Cancel</button>
                    <button onClick={executeClear} className="flex-1 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-semibold transition-colors flex items-center justify-center gap-2"><Trash2 size={18} /> Delete</button>
                </div>
            </div>
        </div>
    );
  };

  const SettingsContent = () => (
    <div className="space-y-6">
        <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><LogIn size={20} /></div>
                <span className="font-semibold text-slate-200">Account Sync</span>
            </div>
            {currentUser ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.email}`} alt="Avatar" className="w-10 h-10 rounded-full border border-white/10" />
                        <div>
                            <div className="text-sm font-bold text-white">{currentUser.displayName}</div>
                            <div className="text-xs text-slate-400">{currentUser.email}</div>
                        </div>
                    </div>
                    <button onClick={logout} className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors">Sign Out</button>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <p className="text-xs text-slate-400">Sign in to sync your progress across devices.</p>
                    <button onClick={() => setShowLoginPage(true)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/20">
                        <LogIn size={16} /> Sign In
                    </button>
                </div>
            )}
        </div>
        
        <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                    <Flame size={20} />
                </div>
                <span className="font-semibold text-slate-200">Firebase Configuration</span>
            </div>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                If you are experiencing "unauthorized domain" errors, you can provide your own Firebase project credentials here.
            </p>
            <textarea
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 font-mono focus:border-blue-500 outline-none resize-none mb-3 shadow-inner"
                placeholder='{ "apiKey": "...", "authDomain": "...", "projectId": "..." }'
                value={firebaseConfigInput}
                onChange={(e) => setFirebaseConfigInput(e.target.value)}
            />
            <div className="flex gap-2">
                <button
                    onClick={handleSaveFirebaseConfig}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg"
                >
                    Save & Reload
                </button>
                <button
                    onClick={handleResetFirebaseConfig}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-white/5"
                >
                    Reset
                </button>
            </div>
        </div>
        
        {/* Theme Settings Block */}
        <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 bg-${accent}-500/20 rounded-lg text-${accent}-400`}>
                    <Palette size={20} />
                </div>
                <span className="font-semibold text-slate-200">Personalization</span>
            </div>
            <div className="space-y-6">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Accent Color</p>
                    <div className="grid grid-cols-6 sm:grid-cols-6 gap-2">
                        {ACCENT_COLORS.map(color => (
                            <button
                                key={color.id}
                                onClick={() => setAccent(color.id)}
                                className={`
                                    relative aspect-square rounded-full transition-all flex items-center justify-center
                                    ${color.colorClass}
                                    ${accent === color.id ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-60 hover:opacity-100 hover:scale-105'}
                                `}
                                title={color.label}
                            />
                        ))}
                    </div>
                </div>
                {/* Wallpaper */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Wallpaper</p>
                        <button 
                            onClick={handleShowWallpaperToggle}
                            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-colors ${showWallpaperOnHome ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                        >
                            <Layout size={12} /> Show on Dashboard
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        {WALLPAPERS.map(wp => (
                            <button
                                key={wp.id}
                                onClick={() => handleWallpaperChange(wp.url)}
                                className={`
                                    relative aspect-video rounded-lg overflow-hidden border transition-all group
                                    ${wallpaper === wp.url ? `border-${accent}-500 ring-1 ring-${accent}-500` : 'border-transparent hover:border-white/20'}
                                `}
                            >
                                <img src={wp.url} alt={wp.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className={`absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors ${wallpaper === wp.url ? 'bg-transparent' : ''}`} />
                                <span className="absolute bottom-1 left-2 text-[9px] font-bold text-white drop-shadow-md">{wp.label}</span>
                            </button>
                        ))}
                    </div>
                    <input 
                        type="text"
                        value={wallpaper}
                        onChange={(e) => handleWallpaperChange(e.target.value)}
                        placeholder="Or paste custom image URL..."
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white/20 transition-colors"
                    />
                </div>
            </div>
        </div>
    </div>
  );

  // Desktop Navigation Component
  const DesktopSidebar = () => {
    const tabs = [
      { id: 'dashboard', label: 'Home', icon: Home },
      { id: 'timer', label: 'Focus', icon: Timer },
      { id: 'timeline', label: 'Stats', icon: BarChart3 },
      { id: 'habits', label: 'Habits', icon: Repeat },
      { id: 'journal', label: 'Journal', icon: BookOpen },
      { id: 'calendar', label: 'Plan', icon: CalendarDays },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
      <nav className="flex flex-col w-24 flex-none py-8 h-full max-h-screen">
         <div className="flex justify-center mb-8 flex-none">
             <div className={`w-12 h-12 bg-${accent}-500/20 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center shadow-lg shadow-${accent}-500/20`}>
                <Zap size={24} className={`text-${accent}-400 fill-${accent}-400`} />
             </div>
         </div>
         
         <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar min-h-0 px-2 pb-4">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as MobileTab)}
                    className={`w-full flex-none flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl transition-all duration-300 group relative
                    ${isActive ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                >
                    {isActive && (
                        <div className={`absolute left-0 w-1 h-8 bg-${accent}-500 rounded-r-full shadow-[0_0_10px_rgba(var(--color-${accent}-500),0.5)]`} />
                    )}
                    <Icon size={24} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-[10px] font-medium tracking-wide opacity-80">{tab.label}</span>
                </button>
                )
            })}
         </div>

         {/* Attribution */}
         <div className="flex-none mt-auto pt-4 border-t border-white/5 text-center px-2">
             <p className="text-[9px] text-slate-600 font-mono leading-tight tracking-wider opacity-60 hover:opacity-100 transition-opacity cursor-default">
                Made by<br/>Abu Dhabi<br/>(ABHYUDAY)
             </p>
         </div>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30 relative">
      
      {/* Login Page Overlay */}
      {showLoginPage && <LoginPage onClose={() => setShowLoginPage(false)} />}

      {/* Global Wallpaper Background */}
      {showWallpaperOnHome && wallpaper && !isSpaceMode && (
          <div className="absolute inset-0 z-0">
              <img src={wallpaper} alt="Background" className="w-full h-full object-cover opacity-100" />
              {/* Overlay to ensure text readability */}
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px]" />
          </div>
      )}

      {/* ZEN MODE PROMPT MODAL */}
      {showZenPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full transform scale-100 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-white mb-2">Enter Zen Mode?</h3>
                <p className="text-slate-400 text-sm mb-6">Would you like to switch to the immersive fullscreen background?</p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleZenResponse(false)} 
                        className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-colors"
                    >
                        No
                    </button>
                    <button 
                        onClick={() => handleZenResponse(true)} 
                        className={`flex-1 py-3 rounded-xl bg-${accent}-600 text-white hover:bg-${accent}-500 font-bold transition-colors shadow-lg shadow-${accent}-500/20`}
                    >
                        Yes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* ZEN MODE OVERLAY (Fullscreen) */}
      {isZenActive && !isSpaceMode && (
          <div className="fixed inset-0 z-[50] animate-in fade-in duration-700 bg-black">
              {/* Wallpaper - No Blur, Object Cover */}
              {wallpaper && (
                  <img src={wallpaper} alt="Zen Background" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {/* Subtle Overlay for contrast */}
              <div className="absolute inset-0 bg-black/20" /> 
              
              {/* Exit Button */}
              <button 
                onClick={() => setIsZenActive(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/50 hover:text-white transition-all z-[60]"
              >
                  <X size={24} />
              </button>

              {/* Timer Container - Bottom Center */}
              <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end items-center pb-12">
                  <div className="pointer-events-auto">
                    <TimerDisplay 
                        elapsedMs={elapsedMs} 
                        status={status} 
                        mode={mode}
                        todaySubjectTotal={currentSubjectTodayTotal}
                        subjectColor={currentSubject.color} 
                        onStart={start} 
                        onPause={pause} 
                        onStop={stop} 
                        onSetMode={setMode}
                        isWallpaperMode={true}
                    />
                  </div>
              </div>
          </div>
      )}

      {/* SPACE MODE OVERLAY */}
      {isSpaceMode && (
          <div className="fixed inset-0 z-[60] animate-in fade-in duration-1000 bg-black flex items-center justify-center overflow-hidden">
              {/* YouTube Iframe Background */}
              <div className="absolute inset-0 pointer-events-none select-none">
                  {(() => {
                      const videoId = getYoutubeId(spaceVideoUrl) || "xRPjKQtRKT8";
                      return (
                        <iframe 
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&autohide=1&modestbranding=1&loop=1&playlist=${videoId}&iv_load_policy=3&rel=0`}
                            title="Space Live Stream"
                            className="absolute top-1/2 left-1/2 w-[177.77777778vh] h-[100vh] min-w-full min-h-[56.25vw] -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
                            allow="autoplay; encrypted-media"
                        />
                      );
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
              </div>

              {/* Exit Button */}
              <button 
                onClick={() => setIsSpaceMode(false)}
                className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs uppercase tracking-widest border border-white/10 transition-all z-[70] group"
              >
                  <Rocket size={14} className="group-hover:-translate-y-0.5 transition-transform" /> Exit Orbit
              </button>

              {/* Timer */}
              <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end items-center pb-16">
                  <div className="pointer-events-auto scale-90 md:scale-100">
                    <TimerDisplay 
                        elapsedMs={elapsedMs} 
                        status={status} 
                        mode={mode}
                        todaySubjectTotal={currentSubjectTodayTotal}
                        subjectColor={currentSubject.color} 
                        onStart={start} 
                        onPause={pause} 
                        onStop={stop} 
                        onSetMode={setMode}
                        isWallpaperMode={true}
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 font-mono tracking-widest opacity-60">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      LIVE FROM ORBIT
                  </div>
              </div>
          </div>
      )}

      {/* Ambient Background (Hidden in Zen or if Wallpaper is Active) */}
      <div className={`fixed inset-0 pointer-events-none z-0 ${isZenActive || isSpaceMode || (showWallpaperOnHome && wallpaper) ? 'hidden' : ''}`}>
          <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-${accent}-600/20 blur-[120px] rounded-full mix-blend-screen opacity-50 md:opacity-80 animate-pulse`} style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen opacity-50 md:opacity-80" />
          <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-violet-600/10 blur-[100px] rounded-full mix-blend-screen opacity-40" />
      </div>

      {isSubjectManagerOpen && (
          <SubjectManager 
            subjects={subjects} 
            onUpdate={refreshSubjects} 
            onClose={() => setIsSubjectManagerOpen(false)} 
          />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal />

      {/* --- Mobile Layout (< md) --- */}
      <div className={`md:hidden flex flex-col h-[100dvh] relative z-10 ${isZenActive || isSpaceMode ? 'hidden' : ''}`}>
        <div className="flex-none px-4 pt-4 transition-all">
           <Header />
        </div>
        
        <main className="flex-1 relative overflow-hidden flex flex-col">
           {/* DASHBOARD TAB */}
           {activeTab === 'dashboard' && (
             <div className="flex-1 flex flex-col overflow-hidden">
                <Dashboard 
                    sessions={allSessions} 
                    subjects={subjects} 
                    targetHours={targetHours} 
                    onNavigate={setActiveTab}
                    userName={currentUser?.displayName || 'Aspirant'}
                />
             </div>
           )}

           {activeTab === 'timer' && (
             <div className="flex-1 flex flex-col px-4 relative overflow-y-auto no-scrollbar">
                
                {/* Standard Timer View */}
                <div className="flex-none mt-2 mb-2 relative z-10">
                  <SubjectPicker subjects={subjects} selectedId={currentSubjectId} onSelect={setSubjectId} disabled={status !== 'idle'} variant="horizontal" />
                </div>
                
                <div className="flex-1 flex flex-col relative z-10 justify-center items-center pb-24">
                  <TimerDisplay 
                    elapsedMs={elapsedMs} 
                    status={status} 
                    mode={mode}
                    todaySubjectTotal={currentSubjectTodayTotal}
                    subjectColor={currentSubject.color} 
                    onStart={handleStartRequest} 
                    onPause={pause} 
                    onStop={stop} 
                    onSetMode={setMode}
                    isWallpaperMode={false}
                  />
                  
                  {/* Re-enter Zen Mode Button (if enabled but closed manually) */}
                  {enableZenMode && wallpaper && status === 'running' && !isZenActive && (
                      <button 
                        onClick={() => setIsZenActive(true)}
                        className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-${accent}-500/10 text-${accent}-400 border border-${accent}-500/20 text-xs font-semibold hover:bg-${accent}-500/20 transition-all`}
                      >
                          <Maximize2 size={14} /> Enter Zen Mode
                      </button>
                  )}
                </div>

                {/* Mobile Floating Goals Button/Indicator */}
                <div className="absolute top-4 right-4 z-20">
                    <button 
                        onClick={() => setActiveTab('calendar')}
                        className="bg-slate-900/60 backdrop-blur border border-white/10 p-2 rounded-full shadow-lg"
                    >
                        <Target size={18} className={`text-${accent}-400`} />
                    </button>
                </div>
                <MobileDrawer />
             </div>
           )}

           {activeTab === 'timeline' && (
             <div className="flex-1 flex flex-col px-4 overflow-y-auto pb-4">
                <div className="flex items-center justify-between mb-4 bg-white/5 backdrop-blur-md border border-white/5 p-3 rounded-xl">
                   <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white/10 rounded-lg"><ChevronLeft size={16}/></button>
                   <span className="font-mono font-bold">{selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}</span>
                   <button onClick={() => changeDate(1)} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight size={16}/></button>
                </div>
                <div className="h-[400px] flex-none mb-8">
                   <DailyTimeline sessions={selectedDateSessions} subjects={subjects} className="h-full" />
                </div>
                <HistoryList 
                    sessions={selectedDateSessions} 
                    subjects={subjects} 
                    lifetimeTotalMs={lifetimeTotalMs}
                    averageSessionMs={averageSessionMs}
                />
             </div>
           )}

           {activeTab === 'journal' && (
             <div className="flex-1 flex flex-col overflow-hidden">
                <JournalPage />
             </div>
           )}
           
           {activeTab === 'habits' && (
             <div className="flex-1 flex flex-col overflow-hidden">
                <HabitsPage />
             </div>
           )}

           {activeTab === 'calendar' && (
             <div className="flex-1 px-4 overflow-y-auto pt-4">
               <HeatmapCalendar sessions={allSessions} currentDate={calendarMonth} selectedDate={selectedDate} onDateSelect={setSelectedDate} onPrevMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} onNextMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} />
               <div className="mt-8">
                 <GoalChecklist 
                    dailyTotalMs={dailyTotalMs} 
                    goals={dailyGoals}
                    onGoalUpdate={loadGoals}
                    selectedDate={selectedDate}
                    targetHours={targetHours}
                 />
               </div>
             </div>
           )}
           
           {activeTab === 'settings' && (
             <div className="flex-1 p-6 overflow-y-auto">
               <h2 className="text-xl font-bold mb-6">Settings</h2>
               <SettingsContent />
               <div className="mt-12 text-center pb-8">
                 <p className="text-slate-500 text-[10px] font-mono font-medium tracking-wide">
                    Made by Abu Dhabi (ABHYUDAY)
                 </p>
               </div>
             </div>
           )}
        </main>
        
        <MobileNav activeTab={activeTab} setTab={setActiveTab} />
      </div>


      {/* --- Desktop Layout (>= md) --- */}
      <div className={`hidden md:flex h-screen w-full max-w-[1920px] mx-auto p-6 gap-8 relative z-10 ${isZenActive || isSpaceMode ? 'hidden' : ''}`}>
         <DesktopSidebar />

         {/* Main Glass Panel */}
         <main className="flex-1 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col p-8 transition-all duration-500">
            {/* Top Bar inside glass */}
            <div className="flex justify-between items-center mb-4 flex-none z-30 relative transition-opacity">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                   {activeTab === 'dashboard' && 'Main Dashboard'}
                   {activeTab === 'timer' && 'Focus Session'}
                   {activeTab === 'timeline' && 'Your Progress'}
                   {activeTab === 'journal' && 'Daily Journal'}
                   {activeTab === 'habits' && 'Habit Tracker'}
                   {activeTab === 'calendar' && 'Plan & Track'}
                   {activeTab === 'settings' && 'Preferences'}
                   <span className="text-sm font-normal text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                      {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                   </span>
                </h2>
                <div className="flex gap-4">
                     {activeTab === 'timeline' && (
                        <div className="flex items-center bg-white/5 rounded-xl border border-white/5 p-1">
                            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><ChevronLeft size={16}/></button>
                            <span className="px-4 font-mono font-bold text-sm">{selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}</span>
                            <button onClick={() => changeDate(1)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><ChevronRight size={16}/></button>
                        </div>
                     )}
                     <div className="flex items-center gap-2">
                        <button 
                            onClick={handleSync}
                            disabled={!isOnline || isSyncing}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
                        >
                            {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                            <span className="">{isSyncing ? 'Syncing...' : isOnline ? 'Connected' : 'Offline'}</span>
                        </button>

                        {currentUser ? (
                            <div className="flex items-center gap-2 bg-white/5 rounded-full pl-2 pr-4 py-1.5 border border-white/5">
                                <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.email}`} alt="User" className="w-6 h-6 rounded-full" />
                                <span className="text-xs font-bold text-slate-300">{currentUser.displayName}</span>
                                <button onClick={logout} className="ml-2 text-slate-500 hover:text-white transition-colors"><LogOut size={14}/></button>
                            </div>
                        ) : (
                            <button onClick={() => setShowLoginPage(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-blue-500/20">
                                <LogIn size={14} /> Sign In
                            </button>
                        )}
                     </div>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden flex flex-col">
                {activeTab === 'dashboard' && (
                    <div className="h-full animate-in zoom-in-95 duration-500 overflow-hidden rounded-[2.5rem]">
                        <Dashboard 
                            sessions={allSessions} 
                            subjects={subjects} 
                            targetHours={targetHours}
                            onNavigate={setActiveTab}
                            userName={currentUser?.displayName || 'Aspirant'}
                        />
                    </div>
                )}
                {/* ... other tabs remain unchanged ... */}
                {activeTab === 'timer' && (
                    <div className="h-full flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex-none py-2 flex justify-center relative z-20">
                            <div className="bg-slate-900/30 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-xl max-w-[95%]">
                                <SubjectPicker subjects={subjects} selectedId={currentSubjectId} onSelect={setSubjectId} disabled={status !== 'idle'} variant="horizontal" />
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col relative rounded-3xl mt-6 z-10 justify-center items-center">
                            <TimerDisplay 
                                elapsedMs={elapsedMs} 
                                status={status} 
                                mode={mode}
                                todaySubjectTotal={currentSubjectTodayTotal}
                                subjectColor={currentSubject.color} 
                                onStart={handleStartRequest} 
                                onPause={pause} 
                                onStop={stop} 
                                onSetMode={setMode}
                                isWallpaperMode={false}
                                sidePanel={
                                    <div 
                                        className={`transition-all duration-500 ease-in-out flex flex-col bg-slate-900/30 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden
                                        ${isSidePanelCollapsed ? 'w-14' : 'w-80'} h-full hover:bg-slate-900/40`}
                                    >
                                        <div className="flex-none flex items-center justify-between p-3 border-b border-white/5">
                                            {!isSidePanelCollapsed && (
                                                <div className="flex gap-2">
                                                    <span className="text-xs px-2 py-1 rounded-md bg-white/10 text-white font-medium">Goals</span>
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => setIsSidePanelCollapsed(!isSidePanelCollapsed)}
                                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 ml-auto"
                                                title={isSidePanelCollapsed ? "Expand" : "Collapse"}
                                            >
                                                {isSidePanelCollapsed ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                                            </button>
                                        </div>
                                        {!isSidePanelCollapsed ? (
                                            <div className="flex-1 overflow-hidden relative">
                                                <div className="absolute inset-0 p-4 overflow-y-auto custom-scrollbar">
                                                    <GoalChecklist 
                                                        dailyTotalMs={dailyTotalMs}
                                                        goals={dailyGoals}
                                                        onGoalUpdate={loadGoals}
                                                        selectedDate={new Date().toISOString().split('T')[0]} 
                                                        targetHours={targetHours}
                                                        variant="compact"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center gap-4 pt-4">
                                                <button 
                                                    onClick={() => setIsSidePanelCollapsed(false)}
                                                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
                                                >
                                                    <CheckSquare size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                            {enableZenMode && wallpaper && status === 'running' && !isZenActive && (
                                <button 
                                    onClick={() => setIsZenActive(true)}
                                    className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-${accent}-500/10 text-${accent}-400 border border-${accent}-500/20 text-xs font-semibold hover:bg-${accent}-500/20 transition-all`}
                                >
                                    <Maximize2 size={14} /> Enter Zen Mode
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="h-full grid grid-cols-12 gap-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="col-span-8 bg-black/20 rounded-3xl border border-white/5 p-6 overflow-hidden flex flex-col">
                             <DailyTimeline sessions={selectedDateSessions} subjects={subjects} className="h-full" />
                        </div>
                        <div className="col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
                             <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex-none">
                                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Daily Focus</h3>
                                <div className="text-4xl font-mono font-bold text-white mb-6">{(dailyTotalMs / 3600000).toFixed(1)}<span className="text-lg text-slate-500 ml-1">hrs</span></div>
                                <div className="pt-4 border-t border-white/5">
                                    <SubjectDonut sessions={selectedDateSessions} subjects={subjects} />
                                </div>
                             </div>
                             <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex-1">
                                <HistoryList 
                                    sessions={selectedDateSessions} 
                                    subjects={subjects} 
                                    lifetimeTotalMs={lifetimeTotalMs}
                                    averageSessionMs={averageSessionMs}
                                />
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'journal' && (
                    <div className="h-full animate-in zoom-in-95 duration-500 overflow-hidden rounded-[2.5rem]">
                        <JournalPage />
                    </div>
                )}
                
                {activeTab === 'habits' && (
                    <div className="h-full animate-in zoom-in-95 duration-500 overflow-hidden rounded-[2.5rem]">
                        <HabitsPage />
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="h-full grid grid-cols-12 gap-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="col-span-7 bg-white/5 rounded-3xl border border-white/5 p-8">
                            <HeatmapCalendar sessions={allSessions} currentDate={calendarMonth} selectedDate={selectedDate} onDateSelect={setSelectedDate} onPrevMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} onNextMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} />
                        </div>
                        <div className="col-span-5 bg-white/5 rounded-3xl border border-white/5 p-8">
                             <GoalChecklist 
                                dailyTotalMs={dailyTotalMs} 
                                goals={dailyGoals}
                                onGoalUpdate={loadGoals}
                                selectedDate={selectedDate}
                                targetHours={targetHours}
                             />
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="h-full w-full overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8 p-4 md:p-8">
                            
                            {/* Left Column: Visuals & Preferences */}
                            <div className="flex flex-col gap-8">
                                {/* ... (Theme, Space, Zen, Daily Goal Settings Components remain unchanged) ... */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden group">
                                     <div className={`absolute top-0 right-0 p-40 bg-${accent}-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all duration-700 opacity-50 group-hover:opacity-100`} />
                                     <div className="relative z-10 flex flex-col h-full">
                                         <div className="flex items-center gap-4 mb-6 flex-none">
                                             <div className={`p-3 bg-${accent}-500/20 rounded-2xl text-${accent}-400`}>
                                                 <Palette size={28} />
                                             </div>
                                             <div>
                                                 <h3 className="text-2xl font-bold text-white">Personalization</h3>
                                                 <p className="text-slate-400 text-sm">Theme & Wallpaper</p>
                                             </div>
                                         </div>
                                         <div className="mb-8">
                                             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Accent Color</p>
                                             <div className="grid grid-cols-6 gap-3 w-full max-w-md">
                                                {ACCENT_COLORS.map(color => (
                                                    <button
                                                        key={color.id}
                                                        onClick={() => setAccent(color.id)}
                                                        className={`relative aspect-square rounded-full transition-all duration-300 flex items-center justify-center group/btn ${color.colorClass} ${accent === color.id ? 'ring-4 ring-white/20 scale-110 shadow-xl' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                                                        title={color.label}
                                                    >
                                                        {accent === color.id && <div className="text-black bg-white rounded-full p-1 shadow-sm animate-in zoom-in duration-300"><CheckSquare size={16} /></div>}
                                                    </button>
                                                ))}
                                             </div>
                                         </div>
                                         <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Wallpaper</p>
                                                <button 
                                                    onClick={handleShowWallpaperToggle}
                                                    className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${showWallpaperOnHome ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'}`}
                                                >
                                                    <Layout size={14} /> Show on Dashboard
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 mb-4">
                                                {WALLPAPERS.map(wp => (
                                                    <button
                                                        key={wp.id}
                                                        onClick={() => handleWallpaperChange(wp.url)}
                                                        className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all group/wp ${wallpaper === wp.url ? `border-${accent}-500 ring-2 ring-${accent}-500/50` : 'border-transparent hover:border-white/20'}`}
                                                    >
                                                        <img src={wp.url} alt={wp.label} className="w-full h-full object-cover group-hover/wp:scale-110 transition-transform duration-700" />
                                                        <div className={`absolute inset-0 bg-black/40 group-hover/wp:bg-transparent transition-colors ${wallpaper === wp.url ? 'bg-transparent' : ''}`} />
                                                        {wallpaper === wp.url && <div className={`absolute inset-0 bg-${accent}-500/20`} />}
                                                        <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white drop-shadow-md z-10">{wp.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type="text"
                                                    value={wallpaper}
                                                    onChange={(e) => handleWallpaperChange(e.target.value)}
                                                    placeholder="Or paste custom image URL..."
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-4 pr-4 text-xs text-white focus:outline-none focus:border-white/20 transition-colors shadow-inner"
                                                />
                                            </div>
                                         </div>
                                     </div>
                                </div>
                                {/* Space Mode & Zen Mode Settings */}
                                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 backdrop-blur-md rounded-[2.5rem] border border-indigo-500/30 p-8 relative overflow-hidden group flex-none">
                                    <div className="absolute top-0 right-0 p-16 bg-purple-500/10 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
                                    <div className="flex items-center justify-between relative z-10 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]"><Rocket size={24} /></div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Space Mode</h3>
                                                <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-1"><Globe size={12} className="text-indigo-400" /> Live from the ISS</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsSpaceMode(!isSpaceMode)} className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${isSpaceMode ? 'bg-indigo-500 text-white shadow-indigo-500/40' : 'bg-white/10 hover:bg-white/15 text-slate-300'}`}>{isSpaceMode ? 'Active' : 'Enable'}</button>
                                    </div>
                                    <div className="relative z-10 space-y-2">
                                        <input type="text" value={spaceVideoUrl} onChange={(e) => handleSpaceUrlChange(e.target.value)} placeholder="Paste YouTube Stream URL..." className="w-full bg-slate-950/50 border border-indigo-500/30 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-400 transition-colors placeholder:text-slate-600" />
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-indigo-300/50">Supports standard YouTube video links</span>
                                            <button onClick={() => handleSpaceUrlChange(DEFAULT_ISS_URL)} className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-300 transition-colors font-medium"><RotateCcw size={12} /> Reset to NASA</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group flex-none">
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400"><ImageIcon size={24} /></div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-white">Zen Mode</h3>
                                                    <p className="text-slate-400 text-sm">Use wallpaper for immersive timer</p>
                                                </div>
                                            </div>
                                            <button onClick={handleZenToggle} className={`transition-colors ${enableZenMode ? `text-${accent}-400` : 'text-slate-600 hover:text-slate-400'}`}>{enableZenMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group flex-none">
                                     <div className="absolute bottom-0 left-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -ml-16 -mb-16 transition-all duration-700 opacity-0 group-hover:opacity-100" />
                                     <div className="relative z-10">
                                         <div className="flex items-center justify-between mb-8">
                                             <div className="flex items-center gap-4">
                                                 <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400"><Target size={24} /></div>
                                                 <div>
                                                     <h3 className="text-xl font-bold text-white">Daily Goal</h3>
                                                     <p className="text-slate-400 text-sm">Target study hours</p>
                                                 </div>
                                             </div>
                                             <div className="text-right">
                                                 <span className="text-4xl font-mono font-bold text-white">{targetHours}</span>
                                                 <span className="text-slate-500 text-sm font-medium ml-1">hrs</span>
                                             </div>
                                         </div>
                                         <div className="px-2">
                                            <input type="range" min="0.5" max="12" step="0.5" value={targetHours} onChange={handleTargetHoursChange} className="w-full h-4 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                                            <div className="flex justify-between text-xs text-slate-500 font-mono mt-3 font-medium uppercase tracking-wider"><span>30 min</span><span>12 hours</span></div>
                                         </div>
                                     </div>
                                </div>
                            </div>

                            {/* Right Column: Management */}
                            <div className="flex flex-col gap-8">
                                {/* Firebase Config (Desktop) */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group flex-none">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-orange-500/20 rounded-2xl text-orange-400"><Flame size={24} /></div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Firebase Configuration</h3>
                                            <p className="text-slate-400 text-sm">Custom backend credentials</p>
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 font-mono focus:border-blue-500 outline-none resize-none mb-4 shadow-inner leading-relaxed"
                                        placeholder='{ "apiKey": "...", "authDomain": "...", ... }'
                                        value={firebaseConfigInput}
                                        onChange={(e) => setFirebaseConfigInput(e.target.value)}
                                    />
                                    <div className="flex gap-3">
                                        <button onClick={handleSaveFirebaseConfig} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20">Save & Reload</button>
                                        <button onClick={handleResetFirebaseConfig} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors border border-white/5">Reset</button>
                                    </div>
                                </div>

                                {/* Data Management */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden group flex-none">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400"><Database size={24} /></div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Data Management</h3>
                                                <p className="text-slate-400 text-sm">Backup or restore your progress</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-3 p-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30 group/btn"><Download size={20} className="group-hover/btn:-translate-y-1 transition-transform" /> <span>Download Backup</span></button>
                                            <label className="flex-1 flex items-center justify-center gap-3 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all border border-white/10 hover:border-white/20 cursor-pointer group/btn"><Upload size={20} className="group-hover/btn:-translate-y-1 transition-transform" /> <span>Restore from JSON</span><input type="file" accept=".json" onChange={handleImport} className="hidden" /></label>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-4 text-center flex items-center justify-center gap-1.5"><AlertTriangle size={12} className="text-amber-500" /> Warning: Importing a file will overwrite your current local data.</p>
                                    </div>
                                </div>

                                {/* Subject Manager Button */}
                                <button onClick={() => setIsSubjectManagerOpen(true)} className="bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 text-left transition-all group relative overflow-hidden flex flex-col justify-center min-h-[160px] flex-none">
                                    <div className="absolute top-1/2 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -translate-y-1/2 transition-all duration-700 opacity-50 group-hover:opacity-100 group-hover:bg-indigo-500/20" />
                                    <div className="relative z-10 flex items-center justify-between w-full">
                                        <div className="flex items-center gap-5">
                                             <div className={`p-4 bg-${accent}-500/20 rounded-2xl text-${accent}-400 group-hover:scale-110 group-hover:rotate-180 transition-all duration-500`}><Settings size={32} /></div>
                                            <div><h3 className="text-2xl font-bold text-white mb-1 group-hover:translate-x-1 transition-transform">Subject Manager</h3><p className="text-slate-400 group-hover:text-slate-300 transition-colors">Configure subjects & colors</p></div>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-white/20 group-hover:text-white transition-all transform group-hover:translate-x-1"><ChevronRight size={24} /></div>
                                    </div>
                                </button>

                                {/* Danger Zone */}
                                <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/10 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden hover:border-red-500/20 transition-colors">
                                    <div className="flex items-center gap-3 mb-8 text-red-400 flex-none"><AlertCircle size={24} /><h3 className="font-bold text-xl uppercase tracking-wider">Danger Zone</h3></div>
                                    <div className="flex-1 flex flex-col justify-center gap-4">
                                        <button onClick={requestClearToday} className="w-full flex items-center justify-between p-6 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 rounded-3xl transition-all group"><div className="text-left"><span className="block font-bold text-lg text-red-200 group-hover:text-white transition-colors">Clear Today's Data</span><span className="text-xs text-red-400/60 group-hover:text-red-300">Reset sessions & goals for current day</span></div><div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors"><Trash2 size={24} className="text-red-500/70 group-hover:text-red-400 transition-colors" /></div></button>
                                        <button onClick={requestClearAll} className="w-full flex items-center justify-between p-6 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 rounded-3xl transition-all group"><div className="text-left"><span className="block font-bold text-lg text-red-200 group-hover:text-white transition-colors">Factory Reset</span><span className="text-xs text-red-400/60 group-hover:text-red-300">Permanently delete all history & data</span></div><div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors"><Trash2 size={24} className="text-red-500/70 group-hover:text-red-400 transition-colors" /></div></button>
                                    </div>
                                    <div className="mt-8 text-center flex-none"><p className="text-slate-700 text-[10px] font-mono font-medium tracking-widest uppercase hover:text-slate-500 transition-colors cursor-default select-none">OMNIFOCUS v1.0 • Built by Abu Dhabi</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
         </main>
      </div>
    </div>
  );
};

export default App;
