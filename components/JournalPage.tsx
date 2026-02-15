
import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import { dbService } from '../services/db';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Save, Plus, Trash2, 
  Battery, AlertCircle, 
  BookOpen, ChevronRight, PenTool, Layout, History,
  Sparkles, List, Target,
  Search, Download, ChevronDown, Filter,
  Smile, Frown, Meh, Zap, CloudRain, BatteryCharging, BrainCircuit
} from 'lucide-react';

const MOODS = [
    { id: 'focused', label: 'Focused', icon: '🧠', color: 'indigo' },
    { id: 'good', label: 'Good', icon: '🙂', color: 'emerald' },
    { id: 'average', label: 'Okay', icon: '😐', color: 'amber' },
    { id: 'tired', label: 'Tired', icon: '😴', color: 'slate' },
    { id: 'distracted', label: 'Scatter', icon: '🌪️', color: 'rose' },
];

export const JournalPage: React.FC = () => {
  const { accent } = useTheme();
  const [dateString, setDateString] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'daily' | 'notes' | 'history'>('daily');
  
  // Journal Data State
  const [entry, setEntry] = useState<JournalEntry>({
    id: crypto.randomUUID(),
    dateString: dateString,
    energy: 3,
    stress: 2,
    mood: null,
    gratitude: [],
    wins: [],
    challenges: [],
    lessons: [],
    highlights: [],
    notes: '',
    tomorrowFocus: '',
    updatedAt: Date.now()
  });

  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Notes Dashboard State
  const [searchQuery, setSearchQuery] = useState('');

  // Input states for lists
  const [inputs, setInputs] = useState({
    gratitude: '',
    wins: '',
    challenges: '',
    lessons: '',
    highlights: ''
  });

  useEffect(() => {
    loadEntry(dateString);
    loadHistory();

    const handleSync = () => {
        loadEntry(dateString);
        loadHistory();
    };
    window.addEventListener('ekagrazone_sync_complete', handleSync);
    return () => window.removeEventListener('ekagrazone_sync_complete', handleSync);
  }, [dateString]);

  const loadEntry = async (date: string) => {
    const savedEntry = await dbService.getJournalEntryByDate(date);
    if (savedEntry) {
      setEntry(savedEntry);
    } else {
      // Reset for new day if no entry exists
      setEntry({
        id: crypto.randomUUID(),
        dateString: date,
        energy: 3,
        stress: 2,
        mood: null,
        gratitude: [],
        wins: [],
        challenges: [],
        lessons: [],
        highlights: [],
        notes: '',
        tomorrowFocus: '',
        updatedAt: Date.now()
      });
    }
  };

  const loadHistory = async () => {
    const entries = await dbService.getAllJournalEntries();
    setHistory(entries.sort((a, b) => b.dateString.localeCompare(a.dateString)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await dbService.saveJournalEntry({
      ...entry,
      updatedAt: Date.now()
    });
    await loadHistory();
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleHistorySelect = (selectedEntry: JournalEntry) => {
    setEntry(selectedEntry);
    setDateString(selectedEntry.dateString);
    setActiveTab('daily');
  };

  const addItem = (key: 'gratitude' | 'wins' | 'challenges' | 'lessons' | 'highlights') => {
    if (!inputs[key].trim()) return;
    setEntry(prev => ({
      ...prev,
      [key]: [...prev[key], inputs[key].trim()]
    }));
    setInputs(prev => ({ ...prev, [key]: '' }));
  };

  const removeItem = (key: 'gratitude' | 'wins' | 'challenges' | 'lessons' | 'highlights', index: number) => {
    setEntry(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index)
    }));
  };

  // Helper for renderListInput with animations
  const renderListInput = (title: string, key: 'gratitude' | 'wins' | 'challenges' | 'lessons', icon: React.ReactNode, colorClass: string) => (
    <motion.div 
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
      className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex flex-col h-full transition-all group relative overflow-hidden hover:border-white/10"
    >
      {/* Background Glow */}
      <div className={`absolute top-0 right-0 p-20 ${colorClass.replace('text-', 'bg-')}/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
            <div className={`p-2 rounded-lg ${colorClass.replace('text-', 'bg-')}/10 ${colorClass}`}>
                {icon}
            </div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">{title}</h3>
        </div>
        
        <div className="relative mb-4 group/input">
            <input 
                className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-white/20 focus:bg-slate-900 outline-none placeholder:text-slate-600 transition-all pr-10 shadow-inner"
                placeholder="Add new item..."
                value={inputs[key]}
                onChange={e => setInputs(prev => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addItem(key)}
            />
            <button 
                onClick={() => addItem(key)}
                disabled={!inputs[key].trim()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${inputs[key].trim() ? `${colorClass} bg-white/5 hover:bg-white/10` : 'text-slate-600'}`}
            >
                <Plus size={14} />
            </button>
        </div>

        <div className="flex-1 space-y-2 min-h-[60px]">
            <AnimatePresence mode="popLayout" initial={false}>
                {entry[key].map((item, i) => (
                <motion.div 
                    key={`${key}-${i}-${item}`}
                    initial={{ opacity: 0, x: -10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    layout
                    className="flex items-start gap-3 text-sm text-slate-300 bg-white/5 p-3 rounded-xl group/item hover:bg-white/10 transition-colors border border-transparent hover:border-white/5 relative"
                >
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${colorClass.replace('text-', 'bg-')} flex-none`} />
                    <span className="flex-1 leading-relaxed">{item}</span>
                    <button 
                        onClick={() => removeItem(key, i)}
                        className="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-rose-400 transition-all p-0.5 absolute right-2 top-2 bg-slate-900/80 rounded"
                    >
                        <Trash2 size={12} />
                    </button>
                </motion.div>
                ))}
            </AnimatePresence>
            {entry[key].length === 0 && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-slate-600 opacity-40 py-4"
                >
                    <div className={`p-3 rounded-full bg-white/5 mb-2`}>
                         {React.cloneElement(icon as React.ReactElement, { size: 16 } as any)}
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider">Empty List</span>
                </motion.div>
            )}
        </div>
      </div>
    </motion.div>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-100 p-0 lg:p-4 overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className={`absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-${accent}-500/5 blur-[120px] rounded-full mix-blend-screen animate-pulse`} />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 lg:px-0 pb-20 relative z-10">
          
          {/* Header Area */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pt-4"
          >
            <div className="flex items-center gap-4">
                <div className={`p-3.5 bg-gradient-to-br from-${accent}-500/20 to-purple-500/20 rounded-2xl text-${accent}-400 border border-white/10 shadow-[0_0_15px_rgba(var(--color-${accent}-500),0.1)]`}>
                    <BookOpen size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        Daily Journal
                        <span className="text-[10px] font-mono font-normal text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">v2.0</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="relative group cursor-pointer">
                             <input 
                                type="date" 
                                value={dateString}
                                onChange={(e) => setDateString(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 group-hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 group-hover:border-white/10">
                                <Calendar size={14} />
                                <span>{new Date(dateString).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                <ChevronDown size={12} className="opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`
                    flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-${accent}-600 to-${accent}-500 hover:from-${accent}-500 hover:to-${accent}-400 text-white rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(var(--color-${accent}-500),0.3)] transition-all
                    ${isSaving ? 'opacity-80' : ''}
                    `}
                >
                    {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save size={18} />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Entry'}</span>
                </motion.button>
            </div>
          </motion.div>

          {/* Navigation Tabs */}
          <div className="flex p-1.5 bg-slate-900/60 border border-white/5 rounded-2xl mb-8 w-fit backdrop-blur-md sticky top-0 z-20 shadow-xl">
            {[
              { id: 'daily', label: 'Reflection', icon: Layout },
              { id: 'notes', label: 'Personal Notes', icon: PenTool },
              { id: 'history', label: 'History', icon: History },
            ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all z-10
                            ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
                        `}
                    >
                        {isActive && (
                            <motion.div 
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white/10 border border-white/5 rounded-xl shadow-inner"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
