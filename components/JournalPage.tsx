
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
  Smile, Frown, Meh, Zap, CloudRain, BatteryCharging, BrainCircuit, Trophy
} from 'lucide-react';

const MOODS = [
    { id: 'focused', label: 'Focused', icon: '🧠', color: 'text-indigo-400' },
    { id: 'good', label: 'Good', icon: '🙂', color: 'text-emerald-400' },
    { id: 'average', label: 'Okay', icon: '😐', color: 'text-amber-400' },
    { id: 'tired', label: 'Tired', icon: '😴', color: 'text-slate-400' },
    { id: 'distracted', label: 'Scatter', icon: '🌪️', color: 'text-rose-400' },
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
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                );
            })}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'daily' && (
              <motion.div
                key="daily"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-6"
              >
                {/* Vitals Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Mood */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex flex-col items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Current Mood</span>
                        <div className="flex gap-2 w-full justify-between">
                            {MOODS.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setEntry({...entry, mood: m.id as any})}
                                    className={`
                                        flex flex-col items-center gap-1 p-2 rounded-xl transition-all
                                        ${entry.mood === m.id ? 'bg-white/10 scale-110 shadow-lg' : 'hover:bg-white/5 opacity-50 hover:opacity-100'}
                                    `}
                                >
                                    <span className="text-2xl filter drop-shadow-md">{m.icon}</span>
                                    <span className={`text-[9px] font-bold uppercase ${m.color}`}>{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Energy */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><BatteryCharging size={14}/> Energy</span>
                            <span className="text-xl font-bold text-amber-400">{entry.energy}/5</span>
                        </div>
                        <input 
                            type="range" min="1" max="5" 
                            value={entry.energy}
                            onChange={(e) => setEntry({...entry, energy: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-medium">
                            <span>Drained</span>
                            <span>Charged</span>
                        </div>
                    </motion.div>

                    {/* Stress */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><BrainCircuit size={14}/> Stress</span>
                            <span className="text-xl font-bold text-rose-400">{entry.stress}/5</span>
                        </div>
                        <input 
                            type="range" min="1" max="5" 
                            value={entry.stress}
                            onChange={(e) => setEntry({...entry, stress: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-400"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-medium">
                            <span>Calm</span>
                            <span>Panic</span>
                        </div>
                    </motion.div>
                </div>

                {/* Lists Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                    {renderListInput("Gratitude", "gratitude", <Smile />, "text-amber-400")}
                    {renderListInput("Daily Wins", "wins", <Trophy size={18} />, "text-emerald-400")}
                    {renderListInput("Challenges", "challenges", <Target />, "text-rose-400")}
                    {renderListInput("Lessons Learned", "lessons", <BookOpen />, "text-blue-400")}
                </div>

                {/* Tomorrow's Focus */}
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-gradient-to-r from-slate-900/60 to-slate-900/40 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                            <Target size={20} />
                        </div>
                        <h3 className="font-bold text-slate-200">Tomorrow's Focus</h3>
                    </div>
                    <textarea 
                        className="w-full bg-slate-950/50 border border-white/5 rounded-xl p-4 text-sm text-white focus:border-indigo-500/50 focus:bg-slate-950 outline-none resize-none min-h-[100px]"
                        placeholder="What is the one thing you must accomplish tomorrow?"
                        value={entry.tomorrowFocus}
                        onChange={(e) => setEntry({...entry, tomorrowFocus: e.target.value})}
                    />
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full flex flex-col"
              >
                  <div className="flex-1 bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 relative flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-pink-500/20 rounded-xl text-pink-400"><PenTool size={20}/></div>
                              <h3 className="font-bold text-slate-200">Freeform Notes</h3>
                          </div>
                          <span className="text-xs text-slate-500">Auto-saving enabled</span>
                      </div>
                      <textarea 
                          className="flex-1 w-full bg-transparent border-none outline-none text-slate-300 text-base leading-relaxed resize-none placeholder:text-slate-700"
                          placeholder="Write your thoughts, ideas, or brain dumps here..."
                          value={entry.notes}
                          onChange={(e) => setEntry({...entry, notes: e.target.value})}
                      />
                  </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                  {history.map(histEntry => (
                      <div 
                        key={histEntry.id}
                        onClick={() => handleHistorySelect(histEntry)}
                        className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl hover:bg-slate-800/60 hover:border-white/10 transition-all cursor-pointer group"
                      >
                          <div className="flex justify-between items-start mb-4">
                              <span className="text-sm font-bold text-white flex items-center gap-2">
                                  <Calendar size={14} className={`text-${accent}-400`}/> 
                                  {new Date(histEntry.dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}
                              </span>
                              <span className="text-2xl">{MOODS.find(m => m.id === histEntry.mood)?.icon || '😶'}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                              <span className="flex items-center gap-1"><Battery size={12}/> {histEntry.energy}/5</span>
                              <span className="flex items-center gap-1"><BrainCircuit size={12}/> {histEntry.stress}/5</span>
                          </div>
                          {histEntry.tomorrowFocus && (
                              <div className="text-xs bg-slate-950/50 p-3 rounded-xl border border-white/5 text-slate-300 italic truncate">
                                  "{histEntry.tomorrowFocus}"
                              </div>
                          )}
                      </div>
                  ))}
                  {history.length === 0 && (
                      <div className="col-span-full text-center py-20 text-slate-600">
                          <History size={48} className="mx-auto mb-4 opacity-50" />
                          <p>No journal history found.</p>
                      </div>
                  )}
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    </div>
  );
};
export default JournalPage;
