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
  const [searchQuery, setSearchQuery] = useState('');

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

  const renderListInput = (title: string, key: 'gratitude' | 'wins' | 'challenges' | 'lessons', icon: React.ReactNode, colorClass: string) => (
    <motion.div 
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
      className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex flex-col h-full transition-all group relative overflow-hidden hover:border-white/10"
    >
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
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-100 p-0 lg:p-4 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 lg:px-0 pb-20 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pt-4"
          >
            <div className="flex items-center gap-4">
                <div className={`p-3.5 bg-slate-800 rounded-2xl text-${accent}-400 border border-white/10`}>
                    <BookOpen size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Daily Journal</h1>
                    <input 
                        type="date" 
                        value={dateString}
                        onChange={(e) => setDateString(e.target.value)}
                        className="bg-transparent text-slate-400 text-sm outline-none"
                    />
                </div>
            </div>

            <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`px-6 py-2.5 bg-${accent}-600 text-white rounded-xl text-sm font-bold flex items-center gap-2`}
            >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                <span>{isSaving ? 'Saving...' : 'Save Entry'}</span>
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderListInput('Gratitude', 'gratitude', <Smile />, 'text-emerald-400')}
            {renderListInput('Wins', 'wins', <Zap />, 'text-amber-400')}
            {renderListInput('Challenges', 'challenges', <CloudRain />, 'text-rose-400')}
            {renderListInput('Lessons', 'lessons', <BrainCircuit />, 'text-indigo-400')}
          </div>
          
          <div className="mt-8 bg-slate-900/40 p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-bold text-slate-300 uppercase mb-4">Daily Notes</h3>
            <textarea 
               className="w-full bg-slate-950/50 border border-white/5 rounded-xl p-4 text-sm text-white focus:border-white/20 outline-none min-h-[150px]"
               placeholder="Write your thoughts here..."
               value={entry.notes}
               onChange={(e) => setEntry(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
      </div>
    </div>
  );
};

export default JournalPage;
