
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStopwatch } from './hooks/useStopwatch';
import { SubjectPicker } from './components/SubjectPicker';
import { TimerDisplay } from './components/TimerDisplay';
import { HistoryList } from './components/HistoryList';
import { DailyTimeline } from './components/DailyTimeline';
import { GoalChecklist } from './components/GoalChecklist';
import { MobileNav, MobileTab } from './components/MobileNav';
import { SubjectManager } from './components/SubjectManager';
import { SubjectDonut } from './components/SubjectDonut';
import { JournalPage } from './components/JournalPage';
import { HabitsPage } from './components/HabitsPage';
import { Dashboard } from './components/Dashboard'; 
import { StatsPage } from './components/StatsPage'; 
import { PlanPage } from './components/PlanPage'; // Import Plan Page
import { LoginPage } from './components/LoginPage'; 
import { useAuth } from './contexts/AuthContext'; 
import { dbService } from './services/db';
import { StudySession, Subject, DEFAULT_SUBJECTS, DailyGoal, Task, Exam, isHexColor } from './types';
import { Zap, Wifi, WifiOff, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Settings, Timer, BarChart3, CalendarDays, Target, Trash2, AlertCircle, PanelLeftClose, PanelLeftOpen, CheckSquare, Palette, Image as ImageIcon, ToggleLeft, ToggleRight, Maximize2, X, BookOpen, Repeat, Home, AlertTriangle, Download, Upload, Database, Layout, Rocket, Globe, RotateCcw, LogOut, HardDrive, LogIn } from 'lucide-react';
import { useTheme, ACCENT_COLORS } from './contexts/ThemeContext';

// Helper function to extract YouTube video ID
const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const WALLPAPERS = [
  { id: 'mountains', label: 'Midnight Peaks', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80' },
  { id: 'forest', label: 'Misty Forest', url: 'https://images.unsplash.com/photo-1448375240586-dfd8d395ea6c?auto=format&fit=crop&w=2000&q=80' },
  { id: 'rain', label: 'City Rain', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=2000&q=80' },
  { id: 'space', label: 'Deep Space', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=80' },
  { id: 'lofi', label: 'Lofi Room', url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=2000&q=80' },
  { id: 'abstract', label: 'Dark Abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80' },
];

const App: React.FC = () => {
  const { currentUser, isGuest, loading, logout, signInWithGoogle } = useAuth(); // Auth Hook

  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [targetHours, setTargetHours] = useState(4);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Wallpaper / Zen State
  const [wallpaper, setWallpaper] = useState<string>('');
  const [showWallpaperOnHome, setShowWallpaperOnHome] = useState(false);
  const [enableZenMode, setEnableZenMode] = useState(false);
  const [isZenActive, setIsZenActive] = useState(false);
  const [showZenPrompt, setShowZenPrompt] = useState(false);

  // Space Mode State (Hidden Feature)
  const [isSpaceMode, setIsSpaceMode] = useState(false);
  const [spaceVideoUrl, setSpaceVideoUrl] = useState('https://www.youtube.com/watch?v=xRPjKQtRKT8');

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

  // Init
  useEffect(() => {
    // Check if we can proceed (Logged in OR Guest)
    if (!currentUser && !isGuest) return;

    const initData = async () => {
      try {
        await refreshSubjects();
        loadSessions();
        loadGoals();
        loadTasks();
        loadExams();
        
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

      } catch (e) {
        console.error("Failed to initialize DB", e);
      }
    };
    initData();

    // Listen for custom sync event from AuthContext
    const handleSyncComplete = () => {
        initData();
        setIsSyncing(false);
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
  }, [currentUser, isGuest]);

  // Fetch goals whenever date changes
  useEffect(() => {
      if(currentUser || isGuest) loadGoals();
  }, [selectedDate, currentUser, isGuest]);

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
      const allTasks = await dbService.getTasks();
      setTasks(allTasks);
  };

  const loadExams = async () => {
      const allExams = await dbService.getExams();
      setExams(allExams);
  };

  const handleSessionComplete = useCallback(() => {
    loadSessions();
  }, []);

  const handleTargetHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setTargetHours(val);
      localStorage.setItem('studySync_targetHours', val.toString());
      dbService.syncSettingsToCloud().catch(console.error);
  };

  const handleZenToggle = () => {
      const newState = !enableZenMode;
      setEnableZenMode(newState);
      localStorage.setItem('studySync_enableZenMode', String(newState));
      dbService.syncSettingsToCloud().catch(console.error);
  };

  const handleWallpaperChange = (url: string) => {
      setWallpaper(url);
      localStorage.setItem('omni_wallpaper', url);
      dbService.syncSettingsToCloud().catch(console.error);
  };

  const handleShowWallpaperToggle = () => {
      const newVal = !showWallpaperOnHome;
      setShowWallpaperOnHome(newVal);
      localStorage.setItem('omni_wallpaper_home', String(newVal));
      dbService.syncSettingsToCloud().catch(console.error);
  };

  const handleAccentChange = (newAccent: string) => {
      setAccent(newAccent as any);
      // ThemeContext handles localStorage set, but we might want to force sync
      setTimeout(() => dbService.syncSettingsToCloud().catch(console.error), 100);
  };

  const handleSync = async () => {
    if (!isOnline || isGuest) return;
    setIsSyncing(true);
    await dbService.pullFromFirestore();
    await loadSessions();
    await loadGoals();
    await loadTasks();
    await loadExams();
    await refreshSubjects();
    setTimeout(() => { setIsSyncing(false); }, 800);
  };

  // ... (Export/Import logic remains same, though less critical with Cloud Sync) ...
  const handleExport = async () => {
    const dbData = await dbService.createBackup();
    const localData: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('omni_') || key.startsWith('studySync_'))) {
            localData[key] = localStorage.getItem(key);
        }
    }
    const backup = { version: 1, date: new Date().toISOString(), db: dbData, local: localData };
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
            if (confirm("Importing local backup. Note: This will merge with cloud data on next sync.")) {
                if (json.db) await dbService.restoreBackup(json.db);
                if (json.local) {
                    Object.entries(json.local).forEach(([key, value]) => {
                        if (value !== null && typeof value === 'string') localStorage.setItem(key, value);
                    });
                }
                alert("Data restored!");
                window.location.reload();
            }
        } catch (err) { alert("Failed to import data."); }
    };
    reader.readAsText(file);
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
  const currentSubjectTodayTotal = useMemo(() => {
      return todaySessions.filter(s => s.subjectId === currentSubjectId).reduce((acc, curr) => acc + curr.durationMs, 0);
  }, [todaySessions, currentSubjectId]);

  const changeDate = (offset: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + offset);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // --- Start / Zen Logic ---

  const handleStartRequest = () => {
      if (enableZenMode && wallpaper && status === 'idle' && !isZenActive) {
          setShowZenPrompt(true);
      } else {
          start();
      }
  };

  const handleZenResponse = (shouldEnter: boolean) => {
      setShowZenPrompt(false);
      start(); 
      if (shouldEnter) setIsZenActive(true);
  };

  // --- Auth Check ---
  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  
  // Render Login if not logged in AND not guest
  if (!currentUser && !isGuest) return <LoginPage />;

  // Display Name logic
  const displayName = currentUser?.displayName || (isGuest ? "Guest User" : "User");

  // --- Render Components ---

  const Header = () => (
    <div className="flex justify-between items-center mb-6">
       <div className="flex items-center gap-2">
         <div className={`w-8 h-8 bg-${accent}-500/20 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center shadow-lg shadow-${accent}-500/10`}>
           <Zap size={18} className={`text-${accent}-400 fill-${accent}-400`} />
         </div>
         <h1 className="font-bold text-xl tracking-tight text-slate-100">OMNIFOCUS</h1>
       </div>
       {isGuest ? (
         <button 
            onClick={signInWithGoogle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
         >
             <LogIn size={12} />
             <span className="hidden sm:inline">Sign In to Sync</span>
         </button>
       ) : (
         <button 
            onClick={handleSync}
            disabled={!isOnline || isSyncing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
        >
            {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hidden sm:inline">{isSyncing ? 'Syncing' : isOnline ? 'Online' : 'Offline'}</span>
        </button>
       )}
    </div>
  );

  const MobileDrawer = () => (
    <div className={`fixed bottom-16 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-40 flex flex-col ${isDrawerOpen ? 'h-[70vh]' : 'h-12'}`}>
       <button 
         onClick={() => setIsDrawerOpen(!isDrawerOpen)}
         className="w-full flex justify-center items-center h-12 flex-none text-slate-400 hover:text-white"
       >
         {isDrawerOpen ? <ChevronDown size={20} /> : <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><ChevronUp size={16} /> Timeline</div>}
       </button>
       <div className="flex-1 overflow-y-auto px-4 pb-4">
          <DailyTimeline sessions={todaySessions} subjects={subjects} className="h-full min-h-[500px]" />
       </div>
    </div>
  );

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

  // Settings Content (moved inside App to access state)
  const SettingsContent = () => (
    <div className="space-y-6">
        
        {/* User Account */}
        <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-between">
             <div className="flex items-center gap-3">
                 {currentUser?.photoURL ? (
                     <img src={currentUser.photoURL} className="w-10 h-10 rounded-full border border-white/10" alt="Profile" />
                 ) : (
                     <div className={`w-10 h-10 rounded-full bg-${accent}-500/20 flex items-center justify-center text-${accent}-400 font-bold`}>{displayName[0]?.toUpperCase()}</div>
                 )}
                 <div>
                     <div className="font-bold text-white">{displayName}</div>
                     <div className="text-xs text-slate-400">{currentUser?.email || (isGuest ? 'Not synced' : '')}</div>
                 </div>
             </div>
             
             {isGuest ? (
                 <button onClick={signInWithGoogle} className={`px-3 py-1.5 bg-${accent}-500/10 text-${accent}-400 hover:bg-${accent}-500 hover:text-white rounded-lg transition-colors text-xs font-bold border border-${accent}-500/20`}>
                    Sign In
                 </button>
             ) : (
                 <button onClick={logout} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors text-xs font-bold">
                     <LogOut size={16} /> Log Out
                 </button>
             )}
        </div>

        {/* Personalization Settings */}
        <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 bg-${accent}-500/20 rounded-lg text-${accent}-400`}><Palette size={20} /></div>
                <span className="font-semibold text-slate-200">Personalization</span>
            </div>
            
            <div className="space-y-6">
                {/* Accent Color */}
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Accent Color</p>
                    <div className="grid grid-cols-6 sm:grid-cols-6 gap-2">
                        {ACCENT_COLORS.map(color => (
                            <button
                                key={color.id}
                                onClick={() => handleAccentChange(color.id)}
                                className={`relative aspect-square rounded-full transition-all flex items-center justify-center ${color.colorClass} ${accent === color.id ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                                title={color.label}
                            />
                        ))}
                    </div>
                </div>
                {/* Wallpaper */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Wallpaper</p>
                        <button onClick={handleShowWallpaperToggle} className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-colors ${showWallpaperOnHome ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                            <Layout size={12} /> Show on Dashboard
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        {WALLPAPERS.map(wp => (
                            <button key={wp.id} onClick={() => handleWallpaperChange(wp.url)} className={`relative aspect-video rounded-lg overflow-hidden border transition-all group ${wallpaper === wp.url ? `border-${accent}-500 ring-1 ring-${accent}-500` : 'border-transparent hover:border-white/20'}`}>
                                <img src={wp.url} alt={wp.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </button>
                        ))}
                    </div>
                    <input type="text" value={wallpaper} onChange={(e) => handleWallpaperChange(e.target.value)} placeholder="Or paste custom image URL..." className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white/20 transition-colors"/>
                </div>
            </div>
        </div>

        {/* Zen Mode */}
        <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`p-2 bg-${accent}-500/20 rounded-lg text-${accent}-400`}><ImageIcon size={20} /></div>
                <div>
                    <span className="font-semibold text-slate-200 block">Zen Mode</span>
                    <span className="text-xs text-slate-400">Immersive timer background</span>
                </div>
            </div>
            <button onClick={handleZenToggle} className={`transition-colors ${enableZenMode ? `text-${accent}-400` : 'text-slate-600 hover:text-slate-400'}`}>
                {enableZenMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
            </button>
        </div>

        {/* Subject Manager */}
        <button onClick={() => setIsSubjectManagerOpen(true)} className="w-full flex items-center justify-between p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`p-2 bg-${accent}-500/20 rounded-lg text-${accent}-400`}><Settings size={20} /></div>
                <span className="font-semibold text-slate-200">Manage Subjects</span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
        </button>

        {/* Data Management */}
        <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Database size={20} /></div>
                <span className="font-semibold text-slate-200">Data & Sync</span>
            </div>
            <div className="flex gap-3">
                 {!isGuest ? (
                     <button onClick={handleSync} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors">
                        <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> Force Sync
                    </button>
                 ) : (
                     <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold border border-white/5 cursor-not-allowed">
                         <HardDrive size={16} /> Local Only
                     </div>
                 )}
                <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors border border-white/10">
                    <Download size={16} /> Backup
                </button>
            </div>
        </div>

        {/* Danger Zone */}
        <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 mt-8">
            <div className="flex items-center gap-2 mb-4 text-red-400">
                <AlertCircle size={20} />
                <h3 className="font-bold uppercase tracking-wider text-xs">Danger Zone</h3>
            </div>
            <div className="space-y-3">
                <button onClick={requestClearToday} className="w-full flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/10 transition-all group">
                    <div className="text-left"><span className="block font-semibold text-slate-200 group-hover:text-red-200">Clear Today's History</span></div>
                    <Trash2 size={18} className="text-slate-600 group-hover:text-red-400" />
                </button>
                <button onClick={requestClearAll} className="w-full flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/10 transition-all group">
                    <div className="text-left"><span className="block font-bold text-lg text-red-200 group-hover:text-white transition-colors">Factory Reset</span></div>
                    <Trash2 size={18} className="text-slate-600 group-hover:text-red-400" />
                </button>
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
                    ${isActive ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/10'}
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
                Made by<br/>Abhyuday
             </p>
         </div>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30 relative">
      
      {/* Global Wallpaper Background */}
      {showWallpaperOnHome && wallpaper && !isSpaceMode && (
          <div className="absolute inset-0 z-0">
              <img src={wallpaper} alt="Background" className="w-full h-full object-cover opacity-100" />
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
                    <button onClick={() => handleZenResponse(false)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-colors">No</button>
                    <button onClick={() => handleZenResponse(true)} className={`flex-1 py-3 rounded-xl bg-${accent}-600 text-white hover:bg-${accent}-500 font-bold transition-colors shadow-lg shadow-${accent}-500/20`}>Yes</button>
                </div>
            </div>
        </div>
      )}

      {/* ZEN MODE OVERLAY (Fullscreen) */}
      {isZenActive && !isSpaceMode && (
          <div className="fixed inset-0 z-[50] animate-in fade-in duration-700 bg-black">
              {wallpaper && <img src={wallpaper} alt="Zen Background" className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-black/20" /> 
              <button onClick={() => setIsZenActive(false)} className="absolute top-6 right-6 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/50 hover:text-white transition-all z-[60]"><X size={24} /></button>
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

              <button onClick={() => setIsSpaceMode(false)} className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs uppercase tracking-widest border border-white/10 transition-all z-[70] group">
                  <Rocket size={14} className="group-hover:-translate-y-0.5 transition-transform" /> Exit Orbit
              </button>

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
           {activeTab === 'dashboard' && (
             <div className="flex-1 flex flex-col overflow-hidden">
                <Dashboard 
                    sessions={allSessions} 
                    subjects={subjects} 
                    targetHours={targetHours} 
                    userName={displayName}
                    onNavigate={setActiveTab}
                />
             </div>
           )}

           {activeTab === 'timer' && (
             <div className="flex-1 flex flex-col px-4 relative overflow-y-auto no-scrollbar">
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
                  {enableZenMode && wallpaper && status === 'running' && !isZenActive && (
                      <button onClick={() => setIsZenActive(true)} className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-${accent}-500/10 text-${accent}-400 border border-${accent}-500/20 text-xs font-semibold hover:bg-${accent}-500/20 transition-all`}>
                          <Maximize2 size={14} /> Enter Zen Mode
                      </button>
                  )}
                </div>
                <div className="absolute top-4 right-4 z-20">
                    <button onClick={() => setActiveTab('calendar')} className="bg-slate-900/60 backdrop-blur border border-white/10 p-2 rounded-full shadow-lg">
                        <Target size={18} className={`text-${accent}-400`} />
                    </button>
                </div>
                <MobileDrawer />
             </div>
           )}

           {activeTab === 'timeline' && (
             <div className="flex-1 flex flex-col px-4 overflow-y-auto pb-4">
                <StatsPage sessions={allSessions} subjects={subjects} />
             </div>
           )}

           {activeTab === 'journal' && <div className="flex-1 flex flex-col overflow-hidden"><JournalPage /></div>}
           {activeTab === 'habits' && <div className="flex-1 flex flex-col overflow-hidden"><HabitsPage /></div>}

           {activeTab === 'calendar' && (
             <div className="flex-1 px-4 overflow-y-auto pt-4 pb-4">
                <PlanPage 
                    sessions={allSessions}
                    subjects={subjects}
                    dailyGoals={dailyGoals}
                    exams={exams}
                    tasks={tasks}
                    onGoalUpdate={loadGoals}
                    onTaskUpdate={loadTasks}
                    onStartSession={setSubjectId}
                    targetHours={targetHours}
                />
             </div>
           )}
           
           {activeTab === 'settings' && (
             <div className="flex-1 p-6 overflow-y-auto">
               <h2 className="text-xl font-bold mb-6">Settings</h2>
               <SettingsContent />
               <div className="mt-12 text-center pb-8">
                 <p className="text-slate-500 text-[10px] font-mono font-medium tracking-wide">Made by Abhyuday</p>
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
         <main 
            className={`
                flex-1 bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden relative flex flex-col transition-all duration-500
                ${activeTab === 'calendar' ? 'p-0 rounded-[1.5rem]' : 'p-8 rounded-[2.5rem]'}
            `}
         >
            {/* Top Bar inside glass */}
            {activeTab !== 'calendar' && (
                <div className="flex justify-between items-center mb-4 flex-none z-30 relative transition-opacity">
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                    {activeTab === 'dashboard' && 'Main Dashboard'}
                    {activeTab === 'timer' && 'Focus Session'}
                    {activeTab === 'timeline' && 'Your Progress'}
                    {activeTab === 'journal' && 'Daily Journal'}
                    {activeTab === 'habits' && 'Habit Tracker'}
                    {activeTab === 'settings' && 'Preferences'}
                    <span className="text-sm font-normal text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                    </h2>
                    <div className="flex gap-4">
                        {isGuest ? (
                            <button 
                                onClick={signInWithGoogle}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800/50 border border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                            >
                                <LogIn size={14} /> Sign In to Sync
                            </button>
                        ) : (
                            <button 
                                onClick={handleSync}
                                disabled={!isOnline || isSyncing}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
                            >
                                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                                <span className="">{isSyncing ? 'Syncing...' : isOnline ? 'Connected' : 'Offline'}</span>
                            </button>
                        )}

                        <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                            <div className={`w-2 h-2 rounded-full bg-${accent}-500`}></div>
                            <span className="text-xs font-bold text-slate-300">{displayName}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 relative overflow-hidden flex flex-col">
                {activeTab === 'dashboard' && (
                    <div className="h-full animate-in zoom-in-95 duration-500 overflow-hidden rounded-[2.5rem]">
                        <Dashboard 
                            sessions={allSessions} 
                            subjects={subjects} 
                            targetHours={targetHours} 
                            userName={displayName}
                            onNavigate={setActiveTab}
                        />
                    </div>
                )}
                
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
                                    <div className={`transition-all duration-500 ease-in-out flex flex-col bg-slate-900/30 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden ${isSidePanelCollapsed ? 'w-14' : 'w-80'} h-full hover:bg-slate-900/40`}>
                                        <div className="flex-none flex items-center justify-between p-3 border-b border-white/5">
                                            {!isSidePanelCollapsed && <div className="flex gap-2"><span className="text-xs px-2 py-1 rounded-md bg-white/10 text-white font-medium">Goals</span></div>}
                                            <button onClick={() => setIsSidePanelCollapsed(!isSidePanelCollapsed)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 ml-auto" title={isSidePanelCollapsed ? "Expand" : "Collapse"}>
                                                {isSidePanelCollapsed ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                                            </button>
                                        </div>
                                        {!isSidePanelCollapsed ? (
                                            <div className="flex-1 overflow-hidden relative"><div className="absolute inset-0 p-4 overflow-y-auto custom-scrollbar"><GoalChecklist dailyTotalMs={dailyTotalMs} goals={dailyGoals} onGoalUpdate={loadGoals} selectedDate={new Date().toISOString().split('T')[0]} targetHours={targetHours} variant="compact" /></div></div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center gap-4 pt-4"><button onClick={() => setIsSidePanelCollapsed(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"><CheckSquare size={20} /></button></div>
                                        )}
                                    </div>
                                }
                            />
                            {enableZenMode && wallpaper && status === 'running' && !isZenActive && (
                                <button onClick={() => setIsZenActive(true)} className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-${accent}-500/10 text-${accent}-400 border border-${accent}-500/20 text-xs font-semibold hover:bg-${accent}-500/20 transition-all`}>
                                    <Maximize2 size={14} /> Enter Zen Mode
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="h-full w-full overflow-hidden animate-in slide-in-from-right-4 duration-500">
                        <StatsPage sessions={allSessions} subjects={subjects} />
                    </div>
                )}

                {activeTab === 'journal' && <div className="h-full animate-in zoom-in-95 duration-500 overflow-hidden rounded-[2.5rem]"><JournalPage /></div>}
                {activeTab === 'habits' && <div className="h-full animate-in zoom-in-95 duration-500 overflow-hidden rounded-[2.5rem]"><HabitsPage /></div>}

                {activeTab === 'calendar' && (
                    <div className="h-full w-full animate-in slide-in-from-right-4 duration-500 overflow-hidden">
                        <PlanPage 
                            sessions={allSessions}
                            subjects={subjects}
                            dailyGoals={dailyGoals}
                            exams={exams}
                            tasks={tasks}
                            onGoalUpdate={loadGoals}
                            onTaskUpdate={loadTasks}
                            onStartSession={setSubjectId}
                            targetHours={targetHours}
                        />
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="h-full w-full overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8 p-4 md:p-8">
                             <SettingsContent />
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
