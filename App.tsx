
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { PlanPage } from './components/PlanPage'; 
import { LoginPage } from './components/LoginPage'; 
import { ExamList } from './components/ExamList';
import { SocialPanel } from './components/SocialPanel';
import { UsernameSetup } from './components/UsernameSetup';
import { useAuth } from './contexts/AuthContext'; 
import { dbService } from './services/db';
import { useSound } from './contexts/SoundContext';
import { StudySession, Subject, DEFAULT_SUBJECTS, Task, Exam, isHexColor, TimerDurations, DEFAULT_DURATIONS, UserProfile } from './types';
import { Zap, Wifi, WifiOff, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Settings, Timer, BarChart3, CalendarDays, Target, Trash2, AlertCircle, PanelLeftClose, PanelLeftOpen, CheckSquare, Palette, Image as ImageIcon, ToggleLeft, ToggleRight, Maximize2, X, BookOpen, Repeat, Home, AlertTriangle, Download, Upload, Database, Layout, Rocket, Globe, RotateCcw, LogOut, HardDrive, LogIn, GraduationCap, Volume2, VolumeX, Play, Pause, Hourglass, Users } from 'lucide-react';
import { useTheme, ACCENT_COLORS } from './contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb } from './services/firebase';
import { ref, set, onDisconnect, serverTimestamp } from 'firebase/database';

// ... (Helper functions like getYoutubeId, formatMiniTime, MiniTimer component remain unchanged) ...
// Helper function to extract YouTube video ID
const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const WALLPAPERS = [
  { id: 'mountains', label: 'Midnight Peaks', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80' },
  { id: 'forest', label: 'Misty Forest', url: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2000&q=80' },
  { id: 'rain', label: 'City Rain', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=2000&q=80' },
  { id: 'space', label: 'Deep Space', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=80' },
  { id: 'lofi', label: 'Lofi Room', url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=2000&q=80' },
  { id: 'abstract', label: 'Dark Abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80' },
];

const formatMiniTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    return `${pad(minutes)}:${pad(seconds)}`;
};

interface MiniTimerProps {
    status: 'idle' | 'running' | 'paused';
    activeTab: MobileTab;
    isZenActive: boolean;
    isSpaceMode: boolean;
    targetDuration: number;
    elapsedMs: number;
    isTimerMode: boolean;
    accent: string;
    currentSubject: Subject;
    onToggle: () => void;
    onActivate: () => void;
}

const MiniTimer: React.FC<MiniTimerProps> = ({
    status, activeTab, isZenActive, isSpaceMode, targetDuration, elapsedMs, isTimerMode, accent, currentSubject, onToggle, onActivate
}) => {
    const isVisible = !(status === 'idle' || activeTab === 'timer' || isZenActive || isSpaceMode);
    
    const remainingMs = Math.max(0, targetDuration - elapsedMs);
    const displayTime = isTimerMode ? remainingMs : elapsedMs;
    const progress = isTimerMode ? (elapsedMs / targetDuration) * 100 : 0;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-80 z-50 cursor-pointer"
                    onClick={onActivate}
                >
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between relative overflow-hidden group">
                        {/* Progress Bar Background */}
                        {isTimerMode && (
                            <div className="absolute bottom-0 left-0 h-1 bg-slate-800 w-full">
                                <div 
                                    className={`h-full bg-${accent}-500 transition-all duration-300 ease-linear`} 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${accent}-500/20 text-${accent}-400`}>
                                {isTimerMode ? <Hourglass size={20} /> : <Timer size={20} />}
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    {currentSubject.name}
                                    <div className={`w-1.5 h-1.5 rounded-full ${isHexColor(currentSubject.color) ? '' : currentSubject.color}`} style={isHexColor(currentSubject.color) ? {backgroundColor: currentSubject.color} : {}} />
                                </div>
                                <div className="text-xl font-mono font-bold text-white leading-none mt-0.5 tabular-nums">
                                    {formatMiniTime(displayTime)}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                {status === 'running' ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const App: React.FC = () => {
  const { currentUser, isGuest, loading, logout, signInWithGoogle } = useAuth(); 
  const { isPlaying, currentSound, togglePlay } = useSound();

  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [targetHours, setTargetHours] = useState(4);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [usernameNeeded, setUsernameNeeded] = useState(false);
  
  // Timer Config
  const [timerDurations, setTimerDurations] = useState<TimerDurations>(DEFAULT_DURATIONS);
  
  // Wallpaper / Zen State
  const [wallpaper, setWallpaper] = useState<string>('');
  const [showWallpaperOnHome, setShowWallpaperOnHome] = useState(false);
  const [enableZenMode, setEnableZenMode] = useState(false);
  const [isZenActive, setIsZenActive] = useState(false);
  const [showZenPrompt, setShowZenPrompt] = useState(false);

  // Space Mode State
  const [isSpaceMode, setIsSpaceMode] = useState(false);
  const [spaceVideoUrl, setSpaceVideoUrl] = useState('https://www.youtube.com/watch?v=xRPjKQtRKT8');

  // Animation State
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);

  const { accent, setAccent } = useTheme();
  
  // UI State
  const [activeTab, setActiveTab] = useState<MobileTab>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubjectManagerOpen, setIsSubjectManagerOpen] = useState(false);
  const [isSocialPanelOpen, setIsSocialPanelOpen] = useState(false); // Social Panel State
  const [confirmModal, setConfirmModal] = useState<{ type: 'today' | 'all'; title: string; message: string; } | null>(null);
  
  // Focus Panel State
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<'goals' | 'exams'>('goals');

  // Shared View State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Derived Stats for RTDB
  const dailyTotalMs = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return allSessions.filter(s => s.dateString === today).reduce((acc, curr) => acc + curr.durationMs, 0);
  }, [allSessions]);

  // Init
  useEffect(() => {
    if (!currentUser && !isGuest) return;

    const initData = async () => {
      try {
        await refreshSubjects();
        loadSessions();
        loadTasks();
        loadExams();
        
        const savedTarget = localStorage.getItem('ekagrazone_targetHours');
        if (savedTarget) setTargetHours(parseFloat(savedTarget));

        const savedDurations = localStorage.getItem('ekagrazone_timer_durations');
        if (savedDurations) {
            try {
                setTimerDurations(JSON.parse(savedDurations));
            } catch (e) {
                console.error("Failed to parse saved durations");
            }
        }

        const savedWallpaper = localStorage.getItem('ekagrazone_wallpaper');
        if (savedWallpaper) setWallpaper(savedWallpaper);
        
        const savedShowHome = localStorage.getItem('ekagrazone_wallpaper_home');
        if (savedShowHome) setShowWallpaperOnHome(savedShowHome === 'true');

        const savedZenEnabled = localStorage.getItem('ekagrazone_enableZenMode');
        if (savedZenEnabled) setEnableZenMode(savedZenEnabled === 'true');
        
        const oldZenUrl = localStorage.getItem('ekagrazone_zenWallpaperUrl');
        if (oldZenUrl && !savedWallpaper) {
            setWallpaper(oldZenUrl);
            localStorage.setItem('ekagrazone_wallpaper', oldZenUrl);
        }

        // --- Social Profile Init ---
        if (currentUser) {
            // Check username presence
            const profile = await dbService.getUserProfile();
            if (!profile || !profile.username) {
                setUsernameNeeded(true);
            }
            
            // Update profile metadata asynchronously
            dbService.updateProfileMeta(currentUser.displayName || 'User', currentUser.email || '', currentUser.photoURL || null);
        }

      } catch (e) {
        console.error("Failed to initialize DB", e);
      }
    };
    initData();

    const handleSyncComplete = () => {
        initData();
        setIsSyncing(false);
    };
    window.addEventListener('ekagrazone_sync_complete', handleSyncComplete);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('ekagrazone_sync_complete', handleSyncComplete);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser, isGuest]);

  const refreshSubjects = async () => {
      const storedSubjects = await dbService.getSubjects();
      setSubjects(storedSubjects.length ? storedSubjects : DEFAULT_SUBJECTS);
  };

  const loadSessions = async () => {
    const sessions = await dbService.getAllSessions();
    setAllSessions(sessions);
  };

  const loadTasks = async () => {
      const allTasks = await dbService.getTasks();
      setTasks(allTasks);
  };

  const loadExams = async () => {
      const allExams = await dbService.getExams();
      setExams(allExams);
  };

  const handleDeleteExam = async (id: string) => {
      if(confirm("Delete this exam?")) {
          await dbService.deleteExam(id);
          loadExams();
      }
  };

  const handleSessionComplete = useCallback(() => {
    loadSessions();
  }, []);

  const handleUpdateDurations = (newDurations: TimerDurations) => {
      setTimerDurations(newDurations);
      localStorage.setItem('ekagrazone_timer_durations', JSON.stringify(newDurations));
      dbService.syncSettingsToCloud().catch(console.error);
  };

  const handleTargetHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setTargetHours(val);
      localStorage.setItem('ekagrazone_targetHours', val.toString());
      dbService.syncSettingsToCloud().catch(console.error);
  };

  const handleZenToggle = () => {
      const newState = !enableZenMode;
      setEnableZenMode(newState);
      localStorage.setItem('ekagrazone_enableZenMode', String(newState));
      dbService.syncSettingsToCloud().catch(console.error);
  };

  const handleWallpaperChange = (url: string) => {
      setWallpaper(url);
      localStorage.setItem('ekagrazone_wallpaper', url);
      dbService.syncSettingsToCloud().catch(console.error);
  };

  const handleShowWallpaperToggle = () => {
      const newVal = !showWallpaperOnHome;
      setShowWallpaperOnHome(newVal);
      localStorage.setItem('ekagrazone_wallpaper_home', String(newVal));
      dbService.syncSettingsToCloud().catch(console.error);
  };

  const handleAccentChange = (newAccent: string) => {
      setAccent(newAccent as any);
      setTimeout(() => dbService.syncSettingsToCloud().catch(console.error), 100);
  };

  const handleSync = async () => {
    if (!isOnline || isGuest) return;
    setIsSyncing(true);
    await dbService.pullFromFirestore();
    await loadSessions();
    await loadTasks();
    await loadExams();
    await refreshSubjects();
    setTimeout(() => { setIsSyncing(false); }, 800);
  };

  const handleExport = async () => {
    const dbData = await dbService.createBackup();
    const localData: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('ekagrazone_'))) {
            localData[key] = localStorage.getItem(key);
        }
    }
    const backup = { version: 1, date: new Date().toISOString(), db: dbData, local: localData };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ekagrazone_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const requestClearToday = () => {
    setConfirmModal({
        type: 'today',
        title: "Clear Today's Progress?",
        message: "This will permanently delete all study sessions, completed tasks, and journal entries for today. This syncs to the cloud and cannot be undone."
    });
  };

  const requestClearAll = () => {
      setConfirmModal({
          type: 'all',
          title: "Factory Reset?",
          message: "WARNING: This will wipe EVERYTHING. All sessions, tasks, habits, journals, and settings will be deleted from your device AND the cloud. This action is irreversible."
      });
  };

  const executeClear = async () => {
      if (!confirmModal) return;

      if (confirmModal.type === 'today') {
          const today = new Date().toISOString().split('T')[0];
          await dbService.deleteSessionsByDate(today);
          await dbService.deleteGoalsByDate(today); // Legacy
          await dbService.deleteTasksByDate(today);
          await dbService.deleteJournalByDate(today);
          await loadSessions();
          await loadTasks();
      } else if (confirmModal.type === 'all') {
          await dbService.factoryReset();
          localStorage.clear();
          window.location.reload();
      }

      setConfirmModal(null);
  };

  const triggerLogoSpin = () => {
      if (isLogoSpinning) return;
      setIsLogoSpinning(true);
      setTimeout(() => setIsLogoSpinning(false), 700);
  };

  const { elapsedMs, status, mode, currentSubjectId, setSubjectId, setMode, start, pause, stop } = useStopwatch(DEFAULT_SUBJECTS[0].id, handleSessionComplete);
  const currentSubject = subjects.find(s => s.id === currentSubjectId) || subjects[0];

  // Timer Completion Logic (Global)
  const isTimerMode = mode !== 'stopwatch';
  const targetDuration = isTimerMode ? (timerDurations[mode as keyof typeof timerDurations] || 25) * 60 * 1000 : 0;
  const isTimerComplete = isTimerMode && elapsedMs >= targetDuration;
  const notifiedRef = useRef(false);

  // --- LIVE STATUS SYNC (RTDB) ---
  useEffect(() => {
      if (!currentUser) return;

      const userStatusRef = ref(rtdb, `status/${currentUser.uid}`);
      const isOfflineForDatabase = { state: 'offline', lastChanged: serverTimestamp(), isFocusing: false };
      
      const updatePresence = () => {
          set(userStatusRef, { 
              state: 'online', 
              lastChanged: serverTimestamp(), 
              isFocusing: status === 'running',
              // We send the 'base' time (finished sessions) + the start time of current session
              // Friends can calculate live time: base + (now - start) if focusing
              todayBaseMs: dailyTotalMs, 
              currentSessionStart: status === 'running' ? Date.now() - elapsedMs : null
          });
      };

      // Set up presence system
      updatePresence();
      onDisconnect(userStatusRef).set(isOfflineForDatabase);

      // Update base stats periodically (e.g., every minute) to ensure consistency even if 'stop' misses
      // This is less about "ticking" and more about data integrity for observers
      let interval: number;
      if (status === 'running') {
          interval = window.setInterval(updatePresence, 30000); 
      }

      return () => {
          if (interval) clearInterval(interval);
      };
  }, [currentUser, status, dailyTotalMs, elapsedMs]);

  useEffect(() => {
      // If timer becomes complete while running, notify
      if (status === 'running' && isTimerComplete && !notifiedRef.current) {
          notifiedRef.current = true;
          
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});

          if ('Notification' in window && Notification.permission === 'granted') {
             new Notification("Timer Complete!", {
                 body: mode === 'pomodoro' ? "Focus session done. Time for a break!" : "Break is over. Back to focus!",
                 icon: "/favicon.ico"
             });
          }
      }
      
      // Reset notified flag if timer is reset or stopped
      if (status === 'idle') {
          notifiedRef.current = false;
      }
  }, [status, isTimerComplete, mode]);

  const todaySessions = useMemo(() => allSessions.filter(s => s.dateString === new Date().toISOString().split('T')[0]), [allSessions]);
  const currentSubjectTodayTotal = useMemo(() => {
      return todaySessions.filter(s => s.subjectId === currentSubjectId).reduce((acc, curr) => acc + curr.durationMs, 0);
  }, [todaySessions, currentSubjectId]);

  const todaysTasks = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return tasks.filter(t => t.dateString === today);
  }, [tasks]);

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

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  if (!currentUser && !isGuest) return <LoginPage />;

  // Force Username Setup if needed
  if (usernameNeeded && !isGuest) {
      return <UsernameSetup onComplete={() => setUsernameNeeded(false)} />;
  }

  const displayName = currentUser?.displayName || (isGuest ? "Guest User" : "User");

  // --- Components ---

  const Header = () => (
    <div className="flex justify-between items-center mb-6">
       <div className="flex items-center gap-2 cursor-pointer select-none" onClick={triggerLogoSpin}>
         <div 
            className={`w-8 h-8 bg-${accent}-500/20 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center shadow-lg shadow-${accent}-500/10`}
            style={{ animation: isLogoSpinning ? 'spin 0.7s ease-in-out' : 'none' }}
         >
           <Zap size={18} className={`text-${accent}-400 fill-${accent}-400`} />
         </div>
         <h1 className="font-bold text-xl tracking-tight text-slate-100">EKAGRAZONE</h1>
       </div>
       <div className="flex items-center gap-2">
           {/* Mobile Sound Indicator */}
           {isPlaying && (
               <button onClick={togglePlay} className="p-1.5 rounded-full bg-white/5 border border-white/5 text-emerald-400 animate-pulse">
                   <Volume2 size={14} />
               </button>
           )}
           {isGuest ? (
             <button 
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
             >
                 <LogIn size={12} />
                 <span className="hidden sm:inline">Sign In</span>
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

  const SettingsContent = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto w-full">
        {/* Profile Card */}
        <div className="p-8 bg-gradient-to-br from-slate-800 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
             
             <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                 {currentUser?.photoURL ? (
                     <img src={currentUser.photoURL} className="w-20 h-20 rounded-2xl border-2 border-white/10 shadow-lg object-cover" alt="Profile" />
                 ) : (
                     <div className={`w-20 h-20 rounded-2xl bg-${accent}-500/20 flex items-center justify-center text-${accent}-400 font-bold text-3xl shadow-inner border border-white/5`}>
                        {displayName[0]?.toUpperCase()}
                     </div>
                 )}
                 <div>
                     <h3 className="text-2xl font-bold text-white mb-1">{displayName}</h3>
                     <p className="text-sm text-slate-400 font-medium">{currentUser?.email || (isGuest ? 'Syncing Disabled (Guest Mode)' : 'Synced Account')}</p>
                 </div>
             </div>
             
             <div className="relative z-10 w-full md:w-auto flex justify-start md:justify-end">
                {isGuest ? (
                    <button onClick={signInWithGoogle} className={`w-full md:w-auto px-6 py-3 bg-${accent}-500 text-white hover:bg-${accent}-600 rounded-xl transition-all shadow-lg shadow-${accent}-500/20 font-bold text-sm flex items-center justify-center gap-2`}>
                        <LogIn size={18} /> Sign In to Sync
                    </button>
                ) : (
                    <button onClick={logout} className="w-full md:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all border border-white/5 font-semibold text-sm flex items-center justify-center gap-2">
                        <LogOut size={18} /> Sign Out
                    </button>
                )}
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column 1: Appearance */}
            <div className="space-y-8 h-full">
                <div className="p-6 bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/10 space-y-6 h-full">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className={`p-2.5 bg-${accent}-500/20 rounded-xl text-${accent}-400`}><Palette size={20} /></div>
                        <span className="font-bold text-lg text-slate-200">Appearance</span>
                    </div>
                    
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Accent Color</p>
                        <div className="grid grid-cols-6 gap-3">
                            {ACCENT_COLORS.map(color => (
                                <button
                                    key={color.id}
                                    onClick={() => handleAccentChange(color.id)}
                                    className={`relative aspect-square rounded-full transition-all flex items-center justify-center ${color.colorClass} ${accent === color.id ? 'ring-4 ring-white/20 scale-110 shadow-lg' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                                    title={color.label}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Wallpaper</p>
                            <button onClick={handleShowWallpaperToggle} className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${showWallpaperOnHome ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                                <Layout size={12} /> {showWallpaperOnHome ? 'Shown on Dash' : 'Hidden on Dash'}
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {WALLPAPERS.map(wp => (
                                <button key={wp.id} onClick={() => handleWallpaperChange(wp.url)} className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all group ${wallpaper === wp.url ? `border-${accent}-500 ring-2 ring-${accent}-500/50` : 'border-transparent hover:border-white/20'}`}>
                                    <img src={wp.url} alt={wp.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    {wallpaper === wp.url && <div className={`absolute inset-0 bg-${accent}-500/20`} />}
                                </button>
                            ))}
                        </div>
                        <input type="text" value={wallpaper} onChange={(e) => handleWallpaperChange(e.target.value)} placeholder="Custom Image URL..." className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white/20 transition-colors placeholder:text-slate-600"/>
                    </div>
                </div>
            </div>

            {/* Column 2: Config & Data */}
            <div className="space-y-8 h-full flex flex-col">
                <div className="p-6 bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/10 flex-1">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                        <div className={`p-2.5 bg-${accent}-500/20 rounded-xl text-${accent}-400`}><Settings size={20} /></div>
                        <span className="font-bold text-lg text-slate-200">Configuration</span>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 bg-${accent}-500/10 rounded-xl text-${accent}-400`}><ImageIcon size={20} /></div>
                                <div>
                                    <span className="font-semibold text-slate-200 block">Zen Mode</span>
                                    <span className="text-xs text-slate-500">Immersive timer background</span>
                                </div>
                            </div>
                            <button onClick={handleZenToggle} className={`transition-colors ${enableZenMode ? `text-${accent}-400` : 'text-slate-600 hover:text-slate-400'}`}>
                                {enableZenMode ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                            </button>
                        </div>

                        <button onClick={() => setIsSubjectManagerOpen(true)} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 bg-${accent}-500/10 rounded-xl text-${accent}-400 group-hover:bg-${accent}-500/20 transition-colors`}><BookOpen size={20} /></div>
                                <div>
                                    <span className="font-semibold text-slate-200 block text-left">Manage Subjects</span>
                                    <span className="text-xs text-slate-500 block text-left">Edit names and colors</span>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-500 group-hover:text-white transition-colors" />
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/10 flex-1">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                        <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400"><Database size={20} /></div>
                        <span className="font-bold text-lg text-slate-200">Data & Sync</span>
                    </div>
                    <div className="flex gap-3">
                        {!isGuest ? (
                            <button onClick={handleSync} className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20 font-bold transition-colors">
                                <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} /> 
                                <span className="text-xs">Force Sync</span>
                            </button>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-slate-800 text-slate-500 font-bold border border-white/5 cursor-not-allowed">
                                <HardDrive size={20} /> 
                                <span className="text-xs">Local Only</span>
                            </div>
                        )}
                        <button onClick={handleExport} className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors border border-white/10">
                            <Download size={20} /> 
                            <span className="text-xs">Backup Data</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Danger Zone */}
        <div className="p-6 rounded-3xl border border-red-500/20 bg-red-500/5 mt-4 hover:bg-red-500/10 transition-colors">
            <div className="flex items-center gap-2 mb-6 text-red-400">
                <AlertCircle size={20} />
                <h3 className="font-bold uppercase tracking-wider text-xs">Danger Zone</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={requestClearToday} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/10 transition-all group text-left">
                    <div>
                        <span className="block font-semibold text-slate-200 group-hover:text-red-200 text-sm">Clear Today's Data</span>
                        <span className="text-[10px] text-slate-500">Resets sessions & tasks for today only.</span>
                    </div>
                    <Trash2 size={18} className="text-slate-600 group-hover:text-red-400" />
                </button>
                <button onClick={requestClearAll} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/10 transition-all group text-left">
                    <div>
                        <span className="block font-bold text-red-300 group-hover:text-white transition-colors text-sm">Factory Reset</span>
                        <span className="text-[10px] text-slate-500">Wipes ALL data from cloud & local.</span>
                    </div>
                    <AlertTriangle size={18} className="text-red-500" />
                </button>
            </div>
        </div>
    </div>
  );

  const DesktopSidebar = () => {
    const tabs = [
      { id: 'dashboard', label: 'Home', icon: Home },
      { id: 'timer', label: 'Focus', icon: Timer },
      { id: 'timeline', label: 'Stats', icon: BarChart3 },
      { id: 'habits', label: 'Habits', icon: Repeat },
      { id: 'journal', label: 'Journal', icon: BookOpen },
      { id: 'calendar', label: 'Plan', icon: CalendarDays },
      { id: 'social', label: 'Social', icon: Users }, // Added Social tab
      { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
      <nav className="flex flex-col w-20 xl:w-64 flex-none py-6 h-full max-h-screen relative z-50">
         <div className="flex xl:justify-start justify-center px-4 mb-8 flex-none">
             <div className="flex items-center gap-3 cursor-pointer select-none" onClick={triggerLogoSpin}>
                <div 
                    className={`w-10 h-10 bg-${accent}-500/20 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-center shadow-lg shadow-${accent}-500/20 flex-none transition-transform`}
                    style={{ animation: isLogoSpinning ? 'spin 0.7s ease-in-out' : 'none' }}
                >
                    <Zap size={20} className={`text-${accent}-400 fill-${accent}-400`} />
                </div>
                <h1 className="hidden xl:block font-bold text-lg tracking-tight text-white">EKAGRAZONE</h1>
             </div>
         </div>
         
         <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar px-3">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                // Special handler for Social which opens the panel but keeps the active tab mostly or just serves as a trigger
                if (tab.id === 'social') {
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setIsSocialPanelOpen(!isSocialPanelOpen)}
                            className={`
                                w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group relative
                                ${isSocialPanelOpen ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/10'}
                            `}
                        >
                            <div className="flex justify-center xl:w-6 flex-none">
                                <Icon size={20} className={`transition-transform duration-300 ${isSocialPanelOpen ? `scale-110 text-${accent}-400` : 'group-hover:scale-110'}`} />
                            </div>
                            <span className="hidden xl:block text-sm font-medium tracking-wide opacity-90">{tab.label}</span>
                        </button>
                    )
                }

                return (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as MobileTab)}
                    className={`
                        w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group relative
                        ${isActive ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/10'}
                        ${!isActive && 'hover:translate-x-1'}
                    `}
                >
                    {isActive && (
                        <motion.div 
                            layoutId="sidebar-active"
                            className={`absolute left-0 w-1 h-6 bg-${accent}-500 rounded-r-full shadow-[0_0_12px_rgba(var(--color-${accent}-500),0.6)]`}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
                    <div className="flex justify-center xl:w-6 flex-none">
                        <Icon size={20} className={`transition-transform duration-300 ${isActive ? `scale-110 text-${accent}-400` : 'group-hover:scale-110'}`} />
                    </div>
                    <span className="hidden xl:block text-sm font-medium tracking-wide opacity-90">{tab.label}</span>
                </button>
                )
            })}
         </div>

         <div className="flex-none mt-auto pt-4 border-t border-white/5 px-4 xl:px-6">
             {/* Music Player Mini */}
             {isPlaying && (
                 <div className="mb-4 bg-slate-900/50 p-2.5 rounded-xl border border-white/5 flex items-center justify-between shadow-lg">
                     <div className="flex items-center gap-2">
                         <div className={`p-1.5 rounded-lg bg-${accent}-500/20 text-${accent}-400 animate-pulse`}>
                             <Volume2 size={14} />
                         </div>
                         <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-white uppercase">{currentSound}</span>
                             <span className="text-[9px] text-slate-500">Now Playing</span>
                         </div>
                     </div>
                     <button onClick={togglePlay} className="p-1.5 text-slate-400 hover:text-white transition-colors">
                         <VolumeX size={14} />
                     </button>
                 </div>
             )}

             <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                 {currentUser?.photoURL ? (
                     <img src={currentUser.photoURL} className="w-8 h-8 rounded-lg border border-white/10" alt="Profile" />
                 ) : (
                     <div className={`w-8 h-8 rounded-lg bg-${accent}-500/20 flex items-center justify-center text-${accent}-400 font-bold text-xs`}>{displayName[0]?.toUpperCase()}</div>
                 )}
                 <div className="hidden xl:block overflow-hidden">
                     <p className="text-xs font-bold text-white truncate">{displayName}</p>
                     <p className="text-[10px] text-slate-500 truncate group-hover:text-slate-400 transition-colors">Free Plan</p>
                 </div>
             </div>
             <div className="mt-4 hidden xl:block px-2 text-center">
                <p className="text-[10px] text-slate-600 font-mono font-medium tracking-wide">Made by Abhyuday</p>
             </div>
         </div>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans overflow-hidden selection:bg-cyan-500/30 relative">
      
      {/* Background Ambience */}
      {!isZenActive && !isSpaceMode && (
          <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
              {showWallpaperOnHome && wallpaper ? (
                  <>
                    <img src={wallpaper} alt="Background" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/90 to-[#0f172a]/70 backdrop-blur-[2px]" />
                  </>
              ) : (
                  <>
                    <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-${accent}-600/10 blur-[120px] rounded-full mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]`} />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-600/10 blur-[100px] rounded-full mix-blend-screen animate-[pulse_10s_ease-in-out_infinite_reverse]" />
                    <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] bg-purple-600/5 blur-[80px] rounded-full mix-blend-screen animate-[pulse_12s_ease-in-out_infinite]" />
                  </>
              )}
          </div>
      )}

      {/* ZEN & Space Modes (Unchanged code) ... */}
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

      {isZenActive && !isSpaceMode && (
          <div className="fixed inset-0 z-[50] animate-in fade-in duration-700 bg-black">
              {wallpaper && <img src={wallpaper} alt="Zen Background" className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-black/30" /> 
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
                        durations={timerDurations}
                        onUpdateDurations={handleUpdateDurations}
                        isWallpaperMode={true}
                    />
                  </div>
              </div>
          </div>
      )}

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
                        durations={timerDurations}
                        onUpdateDurations={handleUpdateDurations}
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

      {isSubjectManagerOpen && (
          <SubjectManager 
            subjects={subjects} 
            onUpdate={refreshSubjects} 
            onClose={() => setIsSubjectManagerOpen(false)} 
          />
      )}

      <ConfirmationModal />

      {/* --- Mobile Layout (< md) --- */}
      <div className={`md:hidden flex flex-col h-[100dvh] relative z-10 ${isZenActive || isSpaceMode ? 'hidden' : ''}`}>
        <div className="flex-none px-4 pt-4 transition-all">
           <Header />
        </div>
        
        <main className="flex-1 relative overflow-hidden flex flex-col">
           <AnimatePresence mode="wait">
               <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, x: 10 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -10 }}
                 transition={{ duration: 0.2 }}
                 className="flex-1 flex flex-col h-full overflow-hidden"
               >
                   {activeTab === 'dashboard' && (
                     <Dashboard 
                        sessions={allSessions} 
                        subjects={subjects} 
                        targetHours={targetHours} 
                        userName={displayName}
                        onNavigate={setActiveTab}
                    />
                   )}

                   {/* Other mobile tabs... */}
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
                            durations={timerDurations}
                            onUpdateDurations={handleUpdateDurations}
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
                        <StatsPage sessions={allSessions} subjects={subjects} onDataUpdate={loadSessions} />
                     </div>
                   )}

                   {/* Add Social Panel for Mobile */}
                   {activeTab === 'social' && (
                     <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <SocialPanel />
                     </div>
                   )}

                   {activeTab === 'journal' && <div className="flex-1 flex flex-col overflow-hidden"><JournalPage /></div>}
                   {activeTab === 'habits' && <div className="flex-1 flex flex-col overflow-hidden"><HabitsPage /></div>}

                   {activeTab === 'calendar' && (
                     <div className="flex-1 px-4 overflow-y-auto pt-4 pb-4">
                        <PlanPage 
                            sessions={allSessions}
                            subjects={subjects}
                            exams={exams}
                            tasks={tasks}
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
               </motion.div>
           </AnimatePresence>
        </main>
        
        <MobileNav activeTab={activeTab} setTab={setActiveTab} />
      </div>


      {/* --- Desktop Layout (>= md) --- */}
      <div className={`hidden md:flex h-screen w-full max-w-[1920px] mx-auto p-4 gap-4 relative z-10 ${isZenActive || isSpaceMode ? 'hidden' : ''}`}>
         <DesktopSidebar />

         {/* Main Glass Panel */}
         <main 
            className={`
                flex-1 bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden relative flex flex-row transition-all duration-500
                ring-1 ring-white/5
                ${activeTab === 'calendar' ? 'p-0 rounded-[2rem]' : 'p-8 rounded-[2.5rem]'}
            `}
         >
            {/* Social Panel Container */}
            <AnimatePresence>
                {isSocialPanelOpen && (
                    <motion.div 
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 'auto', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="flex-none h-full z-40 overflow-hidden relative border-r border-white/5"
                    >
                        <SocialPanel onClose={() => setIsSocialPanelOpen(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar inside glass */}
                {activeTab !== 'calendar' && (
                    <div className="flex justify-between items-center mb-6 flex-none z-30 relative transition-opacity">
                        <motion.h2 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={activeTab}
                            className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
                        >
                        {activeTab === 'dashboard' && 'Dashboard'}
                        {activeTab === 'timer' && 'Focus Zone'}
                        {activeTab === 'timeline' && 'Analytics'}
                        {activeTab === 'journal' && 'Daily Journal'}
                        {activeTab === 'habits' && 'Habit Forge'}
                        {activeTab === 'settings' && 'Preferences'}
                        {activeTab === 'dashboard' && <span className="text-sm font-normal text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </span>}
                        </motion.h2>
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
                        </div>
                    </div>
                )}

                <div className="flex-1 relative overflow-hidden flex flex-col">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="h-full w-full flex flex-col"
                        >
                            {activeTab === 'dashboard' && (
                                <div className="h-full overflow-hidden rounded-[2rem]">
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
                                <div className="h-full flex flex-col relative overflow-hidden">
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
                                            durations={timerDurations}
                                            onUpdateDurations={handleUpdateDurations}
                                            isWallpaperMode={false}
                                            sidePanel={
                                                <div className={`transition-all duration-500 ease-in-out flex flex-col bg-slate-900/30 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden ${isSidePanelCollapsed ? 'w-14' : 'w-80'} h-full hover:bg-slate-900/40`}>
                                                    <div className="flex-none flex items-center justify-between p-3 border-b border-white/5">
                                                        {!isSidePanelCollapsed && (
                                                            <div className="flex bg-slate-900/50 rounded-lg p-0.5 border border-white/5">
                                                                <button 
                                                                    onClick={() => setSidePanelTab('goals')}
                                                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${sidePanelTab === 'goals' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                                                >
                                                                    Goals
                                                                </button>
                                                                <button 
                                                                    onClick={() => setSidePanelTab('exams')}
                                                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${sidePanelTab === 'exams' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                                                >
                                                                    Exams
                                                                </button>
                                                            </div>
                                                        )}
                                                        <button onClick={() => setIsSidePanelCollapsed(!isSidePanelCollapsed)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 ml-auto" title={isSidePanelCollapsed ? "Expand" : "Collapse"}>
                                                            {isSidePanelCollapsed ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                                                        </button>
                                                    </div>
                                                    {!isSidePanelCollapsed ? (
                                                        <div className="flex-1 overflow-hidden relative">
                                                            <div className="absolute inset-0 p-4 overflow-y-auto custom-scrollbar">
                                                                {sidePanelTab === 'goals' ? (
                                                                    <GoalChecklist dailyTotalMs={dailyTotalMs} tasks={todaysTasks} onTaskUpdate={loadTasks} selectedDate={new Date().toISOString().split('T')[0]} targetHours={targetHours} variant="compact" />
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"><GraduationCap size={14}/> Upcoming Exams</span>
                                                                        </div>
                                                                        <ExamList exams={exams} subjects={subjects} variant="compact" onDelete={handleDeleteExam} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex flex-col items-center gap-4 pt-4">
                                                            <button onClick={() => { setSidePanelTab('goals'); setIsSidePanelCollapsed(false); }} className={`p-2 rounded-xl hover:bg-white/10 ${sidePanelTab === 'goals' ? `text-${accent}-400` : 'text-slate-400'}`} title="Goals"><CheckSquare size={20} /></button>
                                                            <button onClick={() => { setSidePanelTab('exams'); setIsSidePanelCollapsed(false); }} className={`p-2 rounded-xl hover:bg-white/10 ${sidePanelTab === 'exams' ? `text-${accent}-400` : 'text-slate-400'}`} title="Exams"><GraduationCap size={20} /></button>
                                                        </div>
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
                                <div className="h-full w-full overflow-hidden">
                                    <StatsPage sessions={allSessions} subjects={subjects} onDataUpdate={loadSessions} />
                                </div>
                            )}

                            {activeTab === 'journal' && <div className="h-full overflow-hidden rounded-[2rem]"><JournalPage /></div>}
                            {activeTab === 'habits' && <div className="h-full overflow-hidden rounded-[2rem]"><HabitsPage /></div>}

                            {activeTab === 'calendar' && (
                                <div className="h-full w-full overflow-hidden">
                                    <PlanPage 
                                        sessions={allSessions}
                                        subjects={subjects}
                                        exams={exams}
                                        tasks={tasks}
                                        onTaskUpdate={loadTasks}
                                        onStartSession={setSubjectId}
                                        targetHours={targetHours}
                                    />
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 md:p-8">
                                    <SettingsContent />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
         </main>
      </div>
      <MiniTimer 
          status={status}
          activeTab={activeTab}
          isZenActive={isZenActive}
          isSpaceMode={isSpaceMode}
          targetDuration={targetDuration}
          elapsedMs={elapsedMs}
          isTimerMode={isTimerMode}
          accent={accent}
          currentSubject={currentSubject}
          onToggle={status === 'running' ? pause : handleStartRequest}
          onActivate={() => setActiveTab('timer')}
      />
    </div>
  );
};

export default App;
