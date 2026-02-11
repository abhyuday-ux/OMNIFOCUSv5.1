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
  }, [dateString]);

  const loadEntry = async (date: string) => {
    const savedEntry = await dbService.getJournalEntryByDate(date);
    if (savedEntry) {
      setEntry(savedEntry);
    } else {
      // Reset for new day
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
                        <tab.icon size={14} className={isActive ? `text-${accent}-400 drop-shadow-[0_0_8px_rgba(var(--color-${accent}-400),0.5)]` : ''} />
                        <span>{tab.label}</span>
                    </button>
                )
            })}
          </div>

          {/* Content Area */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
                {/* TAB: DAILY REFLECTION */}
                {activeTab === 'daily' && (
                <motion.div 
                    key="daily"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="space-y-6 max-w-7xl mx-auto"
                >
                    
                    {/* 1. Metrics & Mood Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                         
                         {/* Energy & Stress */}
                         <motion.div variants={itemVariants} className="lg:col-span-5 grid grid-cols-2 gap-4">
                            {/* Energy Card */}
                            <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex flex-col justify-between hover:border-white/10 transition-all group relative overflow-hidden">
                                 <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                 <div className="flex justify-between items-center mb-4 relative z-10">
                                      <div className="flex items-center gap-2">
                                          <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400"><BatteryCharging size={16}/></div>
                                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Energy</span>
                                      </div>
                                      <span className="font-mono font-bold text-emerald-400 text-xl drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{entry.energy}/5</span>
                                 </div>
                                 <div className="flex gap-1.5 h-12 items-end relative z-10">
                                     {[1, 2, 3, 4, 5].map(n => (
                                         <button 
                                            key={n} 
                                            onClick={() => setEntry(e => ({...e, energy: n}))} 
                                            className={`
                                                flex-1 rounded-lg transition-all duration-300 relative
                                                ${n <= entry.energy 
                                                    ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                                                    : 'bg-slate-800 hover:bg-slate-700'}
                                            `}
                                            style={{ height: `${(n/5)*100}%` }}
                                         />
                                     ))}
                                 </div>
                            </div>

                            {/* Stress Card */}
                            <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex flex-col justify-between hover:border-white/10 transition-all group relative overflow-hidden">
                                 <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                 <div className="flex justify-between items-center mb-4 relative z-10">
                                      <div className="flex items-center gap-2">
                                          <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400"><BrainCircuit size={16}/></div>
                                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Stress</span>
                                      </div>
                                      <span className="font-mono font-bold text-rose-400 text-xl drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">{entry.stress}/5</span>
                                 </div>
                                 <div className="flex gap-1.5 h-12 items-end relative z-10">
                                     {[1, 2, 3, 4, 5].map(n => (
                                         <button 
                                            key={n} 
                                            onClick={() => setEntry(e => ({...e, stress: n}))} 
                                            className={`
                                                flex-1 rounded-lg transition-all duration-300 relative
                                                ${n <= entry.stress 
                                                    ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' 
                                                    : 'bg-slate-800 hover:bg-slate-700'}
                                            `}
                                            style={{ height: `${(n/5)*100}%` }}
                                         />
                                     ))}
                                 </div>
                            </div>
                         </motion.div>

                         {/* Mood Selector */}
                         <motion.div variants={itemVariants} className="lg:col-span-7 bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex flex-col justify-center relative overflow-hidden">
                             <div className="flex items-center gap-2 mb-4 relative z-10">
                                 <Sparkles size={16} className={`text-${accent}-400`}/>
                                 <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Current Mood</span>
                             </div>
                             
                             <div className="grid grid-cols-5 gap-3 relative z-10 h-full">
                                 {MOODS.map((m) => {
                                     const isSelected = entry.mood === m.id;
                                     // Tailwind dynamic class construction safe-guards
                                     const colorMap: Record<string, string> = {
                                         indigo: 'bg-indigo-500 shadow-indigo-500/40 border-indigo-400',
                                         emerald: 'bg-emerald-500 shadow-emerald-500/40 border-emerald-400',
                                         amber: 'bg-amber-500 shadow-amber-500/40 border-amber-400',
                                         slate: 'bg-slate-500 shadow-slate-500/40 border-slate-400',
                                         rose: 'bg-rose-500 shadow-rose-500/40 border-rose-400',
                                     };
                                     const activeClass = colorMap[m.color];

                                     return (
                                         <button
                                             key={m.id}
                                             onClick={() => setEntry(prev => ({ ...prev, mood: m.id as any }))}
                                             className={`
                                                 relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl border transition-all duration-300 group
                                                 ${isSelected 
                                                     ? `${activeClass} scale-105 z-10 shadow-[0_0_20px_rgba(0,0,0,0.3)] border-opacity-100` 
                                                     : 'bg-slate-800/50 border-transparent hover:bg-slate-800 hover:border-white/10'}
                                             `}
                                         >
                                             <span className={`text-2xl mb-2 transition-transform duration-300 ${isSelected ? 'scale-125' : 'group-hover:scale-110 grayscale group-hover:grayscale-0'}`}>
                                                 {m.icon}
                                             </span>
                                             <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                                 {m.label}
                                             </span>
                                         </button>
                                     )
                                 })}
                             </div>
                         </motion.div>
                    </div>

                    {/* 2. Lists Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderListInput('Gratitude', 'gratitude', <HeartIcon />, 'text-pink-400')}
                      {renderListInput('Small Wins', 'wins', <TrophyIcon />, 'text-yellow-400')}
                      {renderListInput('Challenges', 'challenges', <FrownIcon />, 'text-orange-400')}
                      {renderListInput('Lessons Learned', 'lessons', <LightbulbIcon />, 'text-cyan-400')}
                    </div>

                    {/* 3. Daily Highlights & Focus */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Highlights */}
                        <motion.div variants={itemVariants} className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 group hover:border-white/10 transition-colors relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-20 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                             
                             <div className="flex items-center gap-2 mb-4 relative z-10">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><List size={16}/></div>
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Daily Highlights</h3>
                             </div>
                             
                             <div className="flex gap-2 mb-4 relative z-10">
                                <input 
                                  className="flex-1 bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-white/20 focus:bg-slate-900 outline-none placeholder:text-slate-600 transition-colors shadow-inner"
                                  placeholder="What was the main highlight today?"
                                  value={inputs.highlights}
                                  onChange={e => setInputs(prev => ({ ...prev, highlights: e.target.value }))}
                                  onKeyDown={e => e.key === 'Enter' && addItem('highlights')}
                                />
                                <button 
                                  onClick={() => addItem('highlights')}
                                  disabled={!inputs.highlights.trim()}
                                  className={`px-4 bg-${accent}-600 hover:bg-${accent}-500 disabled:opacity-50 text-white rounded-xl transition-colors font-medium shadow-lg shadow-${accent}-500/20`}
                                >
                                  Add
                                </button>
                              </div>
                              
                              <div className="space-y-2 relative z-10">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {entry.highlights.map((h, i) => (
                                    <motion.div 
                                        key={`high-${i}`}
                                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                        className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-transparent group/item hover:border-white/10 transition-colors"
                                    >
                                        <div className={`w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]`} />
                                        <span className="flex-1 text-slate-200 text-sm">{h}</span>
                                        <button 
                                            onClick={() => removeItem('highlights', i)}
                                            className="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-rose-400 transition-all p-1 bg-slate-900/50 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </motion.div>
                                    ))}
                                </AnimatePresence>
                                {entry.highlights.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-6 text-slate-600 border border-dashed border-white/5 rounded-xl">
                                        <List size={20} className="mb-2 opacity-50"/>
                                        <span className="text-xs italic">No highlights recorded</span>
                                    </div>
                                )}
                              </div>
                        </motion.div>

                        {/* Tomorrow Focus */}
                        <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-900/30 to-violet-900/30 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-10 transition-opacity" />
                            <div className="absolute top-0 right-0 p-24 bg-indigo-500/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
                            
                            <div className="flex items-center gap-2 mb-6 relative z-10">
                                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]"><Target size={16}/></div>
                                <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Tomorrow's One Thing</h3>
                            </div>
                            
                            <div className="relative z-10">
                                <textarea 
                                    className="w-full bg-slate-950/50 border border-indigo-500/20 rounded-2xl p-5 text-white focus:border-indigo-400 focus:shadow-[0_0_20px_rgba(99,102,241,0.15)] outline-none placeholder:text-indigo-200/30 text-lg font-medium transition-all resize-none min-h-[140px]"
                                    placeholder="What is the single most important task for tomorrow?"
                                    value={entry.tomorrowFocus}
                                    onChange={e => setEntry(prev => ({ ...prev, tomorrowFocus: e.target.value }))}
                                />
                                <div className="absolute bottom-4 right-4 pointer-events-none">
                                    <Target size={64} className="text-indigo-500/5" />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
                )}

                {/* TAB: PERSONAL NOTES */}
                {activeTab === 'notes' && (
                <motion.div 
                    key="notes"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col h-full max-w-6xl mx-auto w-full space-y-8"
                >
                    {/* Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">Personal Notes</h2>
                            <p className="text-slate-400 text-sm">A private space for your thoughts.</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input 
                                type="text" 
                                placeholder="Search entries..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'ENTRIES', value: history.length, color: 'text-white' },
                            { label: 'THIS MONTH', value: history.filter(h => h.dateString.startsWith(dateString.substring(0, 7))).length, color: 'text-white' },
                            { label: 'AVG ENERGY', value: (history.reduce((acc, h) => acc + h.energy, 0) / (history.length || 1)).toFixed(1), color: 'text-emerald-400' },
                            { label: 'AVG STRESS', value: (history.reduce((acc, h) => acc + h.stress, 0) / (history.length || 1)).toFixed(1), color: 'text-rose-400' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col gap-1 hover:bg-white/5 transition-colors">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
                                <span className={`text-2xl font-mono font-bold ${stat.color}`}>
                                    {stat.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Content / Empty State */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-slate-500 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                        <div className="p-4 bg-slate-800/50 rounded-full mb-3">
                            <PenTool size={32} className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium text-slate-300">No notes found.</p>
                        <p className="text-xs text-slate-500 mt-1">Start writing in the Daily Reflection tab.</p>
                    </div>
                </motion.div>
                )}

                {/* TAB: HISTORY */}
                {activeTab === 'history' && (
                <motion.div 
                    key="history"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 max-w-4xl mx-auto pb-8"
                >
                    {history.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 flex flex-col items-center border border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                        <div className="bg-slate-800/50 p-6 rounded-full mb-4">
                            <History size={48} className="opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-slate-400">No journal history</p>
                        <p className="text-sm mt-2">Your past reflections will appear here.</p>
                    </div>
                    ) : (
                    history.map((histEntry, index) => (
                        <motion.button 
                        key={histEntry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleHistorySelect(histEntry)}
                        className="w-full text-left bg-slate-900/40 backdrop-blur-sm hover:bg-slate-800/60 border border-white/5 hover:border-white/20 rounded-3xl p-6 transition-all group flex flex-col gap-4 shadow-sm hover:shadow-lg hover:shadow-black/20"
                        >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 text-slate-300 group-hover:text-${accent}-400 group-hover:border-${accent}-500/30 transition-all shadow-inner`}>
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg group-hover:text-${accent}-200 transition-colors">
                                    {new Date(histEntry.dateString).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </h3>
                                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                                        ID: {histEntry.id.slice(0, 8)} • {new Date(histEntry.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            </div>
                            <div className="p-2 rounded-full hover:bg-white/10 text-slate-600 hover:text-white transition-colors">
                                <ChevronRight size={20} />
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-2 bg-slate-950/50 border border-white/5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300">
                                <Battery size={12} className={histEntry.energy >= 4 ? "text-emerald-400" : histEntry.energy <= 2 ? "text-rose-400" : "text-amber-400"} /> 
                                <span>Energy: {histEntry.energy}/5</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-950/50 border border-white/5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300">
                                <AlertCircle size={12} className={histEntry.stress >= 4 ? "text-rose-400" : "text-emerald-400"} /> 
                                <span>Stress: {histEntry.stress}/5</span>
                            </div>
                            {histEntry.mood && (
                            <div className="flex items-center gap-2 bg-slate-950/50 border border-white/5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 capitalize">
                                <Sparkles size={12} className={`text-${accent}-400`} />
                                {MOODS.find(m => m.id === histEntry.mood)?.label || histEntry.mood}
                            </div>
                            )}
                        </div>
                        
                        {histEntry.notes && (
                            <div className="relative mt-2">
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-slate-700 group-hover:bg-${accent}-500/50 transition-colors" />
                                <p className="text-sm text-slate-400 pl-4 line-clamp-2 leading-relaxed">
                                    {histEntry.notes}
                                </p>
                            </div>
                        )}
                        </motion.button>
                    ))
                    )}
                </motion.div>
                )}
            </AnimatePresence>
          </div>
      </div>

      {/* Floating Save Button (Mobile) */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-24 right-6 sm:hidden z-30"
      >
         <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`
               w-14 h-14 rounded-full bg-${accent}-600 text-white shadow-[0_0_20px_rgba(var(--color-${accent}-600),0.4)] flex items-center justify-center border border-white/10
               ${isSaving ? 'animate-pulse' : 'hover:scale-110 active:scale-95 transition-transform'}
            `}
         >
             {isSaving ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={24} />}
         </button>
      </motion.div>

    </div>
  );
};

// Simple Icons for Lists
const HeartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
);
const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);
const FrownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
);
const LightbulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.4 1.5-3.8 0-3.2-2.7-5.5-5.3-5.5a5.5 5.5 0 0 0-3.3 9.8"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
);