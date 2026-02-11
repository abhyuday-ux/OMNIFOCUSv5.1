import React, { useState, useEffect, useMemo } from 'react';
import { Habit, HabitCategory, HabitFrequency } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Check, Trash2, Zap, Sun, Moon, 
  Flame, LayoutGrid, List, Sparkles, Calendar, Circle, CheckSquare, Brain, Heart, X,
  Trophy, TrendingUp, Activity, Award
} from 'lucide-react';

export const HabitsPage: React.FC = () => {
  const { accent } = useTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState<HabitCategory>('study');
  const [newHabitFrequency, setNewHabitFrequency] = useState<HabitFrequency>('daily');
  
  const [filter, setFilter] = useState<'all' | HabitCategory>('all');
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const saved = localStorage.getItem('omni_habits');
    if (saved) {
      try {
        setHabits(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse habits", e);
      }
    }
  }, []);

  const saveHabits = (updatedHabits: Habit[]) => {
    setHabits(updatedHabits);
    localStorage.setItem('omni_habits', JSON.stringify(updatedHabits));
  };

  const addHabit = () => {
    if (!newHabitTitle.trim()) return;
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      title: newHabitTitle.trim(),
      category: newHabitCategory,
      frequency: newHabitFrequency,
      energyLevel: 'medium', // Default
      completedDates: [],
      createdAt: Date.now()
    };
    saveHabits([...habits, newHabit]);
    setNewHabitTitle('');
    setIsModalOpen(false);
  };

  const deleteHabit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this habit history?')) {
      saveHabits(habits.filter(h => h.id !== id));
    }
  };

  const toggleHabit = (id: string) => {
    const updated = habits.map(h => {
      if (h.id === id) {
        const isCompletedToday = h.completedDates.includes(today);
        let newDates = isCompletedToday 
          ? h.completedDates.filter(d => d !== today)
          : [...h.completedDates, today];
        return { ...h, completedDates: newDates };
      }
      return h;
    });
    saveHabits(updated);
  };

  // --- Statistics Logic ---

  const getStreak = (dates: string[]) => {
    if (dates.length === 0) return 0;
    const sorted = [...dates].sort().reverse();
    let streak = 0;
    let current = new Date();
    const todayStr = current.toISOString().split('T')[0];
    
    // If done today, start counting from today. 
    // If not done today, check yesterday to see if streak is alive.
    if (sorted.includes(todayStr)) {
        // streak includes today
    } else {
        current.setDate(current.getDate() - 1);
        if (!sorted.includes(current.toISOString().split('T')[0])) {
            return 0;
        }
    }

    // Reset current to check sequence
    current = new Date();
    if (!sorted.includes(todayStr)) {
         current.setDate(current.getDate() - 1);
    }

    while (true) {
      const dateStr = current.toISOString().split('T')[0];
      if (sorted.includes(dateStr)) {
        streak++;
        current.setDate(current.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  // Calculate stats
  const completedTodayCount = habits.filter(h => h.completedDates.includes(today)).length;
  const totalHabits = habits.length;
  const completionRate = totalHabits > 0 ? Math.round((completedTodayCount / totalHabits) * 100) : 0;
  
  const bestStreak = useMemo(() => {
      if (habits.length === 0) return 0;
      return Math.max(...habits.map(h => getStreak(h.completedDates)));
  }, [habits]);

  // Enhanced Ritual Score: Base + Streak Bonus
  const ritualScore = useMemo(() => {
      let score = 0;
      habits.forEach(h => {
          score += h.completedDates.length * 10; // 10 points per completion
          const streak = getStreak(h.completedDates);
          if (streak > 0) score += streak * 5; // 5 points per active streak day
          if (streak >= 7) score += 50; // Weekly streak bonus
          if (streak >= 30) score += 200; // Monthly streak bonus
      });
      return score;
  }, [habits]);

  // Momentum: Avg completion rate over last 7 days
  const momentum = useMemo(() => {
      if (totalHabits === 0) return 0;
      let totalRate = 0;
      for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          const completedOnDay = habits.filter(h => h.completedDates.includes(dStr)).length;
          totalRate += (completedOnDay / totalHabits);
      }
      return Math.round((totalRate / 7) * 100);
  }, [habits, totalHabits]);

  // Last 30 days consistency data
  const consistencyData = useMemo(() => {
      const days = [];
      for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          const count = habits.filter(h => h.completedDates.includes(dStr)).length;
          const intensity = totalHabits > 0 ? count / totalHabits : 0;
          days.push({ date: dStr, intensity, count });
      }
      return days;
  }, [habits, totalHabits]);

  // --- Render Helpers ---

  const renderFilterPill = (id: 'all' | HabitCategory, label: string, icon: React.ReactNode) => {
      const count = id === 'all' ? habits.length : habits.filter(h => h.category === id).length;
      const isActive = filter === id;
      return (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(id)}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide border transition-all
                ${isActive 
                    ? `bg-slate-800 text-white border-slate-600 shadow-md` 
                    : 'bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'}
            `}
          >
              {icon}
              <span>{label}</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${isActive ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-600'}`}>
                  {count}
              </span>
          </motion.button>
      );
  };

  const getCategoryIcon = (category: HabitCategory, size = 20) => {
      switch(category) {
          case 'study': return <Brain size={size} />;
          case 'health': return <Heart size={size} />;
          case 'morning': return <Sun size={size} />;
          case 'night': return <Moon size={size} />;
          case 'personal': return <Sparkles size={size} />;
          default: return <Circle size={size} />;
      }
  };
  
  const getCategoryColor = (category: HabitCategory | string) => {
      switch(category) {
          case 'study': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
          case 'health': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
          case 'morning': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
          case 'night': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
          case 'personal': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
          default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      }
  };

  const filteredHabits = habits.filter(h => filter === 'all' || h.category === filter);

  // Sorting: Pending first, then completed
  filteredHabits.sort((a, b) => {
      const aDone = a.completedDates.includes(today);
      const bDone = b.completedDates.includes(today);
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
  });

  // Animations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-100 p-0 lg:p-4 overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-900/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 lg:px-0 pb-20 relative z-10">
          
          {/* Header & Dashboard */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto mb-8"
          >
              {/* Top Row: Title & Action */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pt-4">
                  <div>
                      <div className="flex items-center gap-3 mb-1">
                          <div className={`p-2.5 bg-slate-800/80 backdrop-blur-sm rounded-xl border border-white/10 text-${accent}-400 shadow-lg shadow-${accent}-500/10`}>
                             <Trophy size={24} />
                          </div>
                          <h1 className="text-3xl font-bold text-white tracking-tight">Habit Forge</h1>
                      </div>
                      <p className="text-sm text-slate-400 font-medium ml-1 flex items-center gap-2">
                          <Activity size={14} /> Rituals are built, not found. Show up daily.
                      </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                       <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsModalOpen(true)}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all"
                       >
                           <Plus size={18} /> New Habit
                       </motion.button>
                       <div className="hidden sm:flex items-center gap-3 px-5 py-3 bg-slate-900/60 backdrop-blur border border-white/10 rounded-xl shadow-inner">
                           <div className="flex flex-col items-end">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Ritual Score</span>
                                <span className="text-xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
                                    {ritualScore.toLocaleString()}
                                </span>
                           </div>
                           <div className="p-2 bg-amber-500/20 rounded-full text-amber-400">
                               <Award size={20} />
                           </div>
                       </div>
                  </div>
              </div>

              {/* Stats Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  
                  {/* Left: 4 Metrics Grid */}
                  <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {/* Metric Card 1 */}
                      <motion.div 
                        whileHover={{ y: -5 }}
                        className="bg-slate-900/40 backdrop-blur-sm border border-white/5 p-5 rounded-2xl flex flex-col justify-between h-36 relative overflow-hidden group hover:bg-slate-800/60 transition-colors"
                      >
                          <div className="absolute top-0 right-0 p-10 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                          <div className="relative z-10 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Today</span>
                              <CheckSquare size={16} className="text-blue-400 opacity-60" />
                          </div>
                          <div className="relative z-10">
                              <span className="text-3xl font-mono font-bold text-white block mb-1">{completedTodayCount} <span className="text-slate-600 text-lg">/ {totalHabits}</span></span>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${completionRate}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-blue-500 rounded-full" 
                                  />
                              </div>
                          </div>
                      </motion.div>

                      {/* Metric Card 2 */}
                      <motion.div 
                        whileHover={{ y: -5 }}
                        className="bg-slate-900/40 backdrop-blur-sm border border-white/5 p-5 rounded-2xl flex flex-col justify-between h-36 relative overflow-hidden group hover:bg-slate-800/60 transition-colors"
                      >
                          <div className="absolute top-0 right-0 p-10 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                          <div className="relative z-10 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate</span>
                              <TrendingUp size={16} className="text-emerald-400 opacity-60" />
                          </div>
                          <div className="relative z-10">
                              <span className="text-3xl font-mono font-bold text-white block mb-1">{completionRate}%</span>
                              <p className="text-[10px] text-slate-500 font-medium">Daily consistency</p>
                          </div>
                      </motion.div>

                      {/* Metric Card 3 */}
                      <motion.div 
                        whileHover={{ y: -5 }}
                        className="bg-slate-900/40 backdrop-blur-sm border border-white/5 p-5 rounded-2xl flex flex-col justify-between h-36 relative overflow-hidden group hover:bg-slate-800/60 transition-colors"
                      >
                           <div className="absolute top-0 right-0 p-10 bg-violet-500/10 rounded-full blur-2xl -mr-6 -mt-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                          <div className="relative z-10 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Momentum</span>
                              <Zap size={16} className="text-violet-400 opacity-60" />
                          </div>
                          <div className="relative z-10">
                              <span className="text-3xl font-mono font-bold text-white block mb-1">{momentum}</span>
                              <p className="text-[10px] text-slate-500 font-medium">Last 7 days avg</p>
                          </div>
                      </motion.div>

                      {/* Metric Card 4 */}
                      <motion.div 
                        whileHover={{ y: -5 }}
                        className="bg-slate-900/40 backdrop-blur-sm border border-white/5 p-5 rounded-2xl flex flex-col justify-between h-36 relative overflow-hidden group hover:bg-slate-800/60 transition-colors"
                      >
                          <div className="absolute top-0 right-0 p-10 bg-orange-500/10 rounded-full blur-2xl -mr-6 -mt-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                          <div className="relative z-10 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Streak</span>
                              <Flame size={16} className="text-orange-400 opacity-60" />
                          </div>
                          <div className="relative z-10">
                              <span className="text-3xl font-mono font-bold text-white block mb-1">{bestStreak}<span className="text-lg text-slate-600">d</span></span>
                              <p className="text-[10px] text-slate-500 font-medium">Keep it burning</p>
                          </div>
                      </motion.div>
                  </div>

                  {/* Right: Momentum Ring Panel */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-6 flex items-center justify-between relative overflow-hidden group hover:border-white/10 transition-colors"
                  >
                      <div className="relative z-10">
                          <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Weekly Pulse</div>
                          <h3 className="text-xl font-bold text-white mb-4">You're on track!</h3>
                          <div className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 w-fit px-3 py-1.5 rounded-lg border border-white/5">
                              <CheckSquare size={14} className="text-emerald-400" />
                              <span>{completedTodayCount} done today</span>
                          </div>
                      </div>
                      
                      {/* CSS Ring */}
                      <div className="relative w-28 h-28 flex items-center justify-center flex-none">
                          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity" />
                          <svg className="w-full h-full -rotate-90 drop-shadow-2xl" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
                              <motion.circle 
                                cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeWidth="8" strokeLinecap="round" 
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: momentum / 100 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                strokeDasharray="1 1"
                                className="drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                              />
                          </svg>
                          <span className="absolute text-xl font-bold text-white font-mono">{momentum}%</span>
                      </div>
                  </motion.div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-8">
                  {renderFilterPill('all', 'All Habits', <LayoutGrid size={14} />)}
                  {renderFilterPill('study', 'Study', <Brain size={14} />)}
                  {renderFilterPill('health', 'Health', <Heart size={14} />)}
                  {renderFilterPill('morning', 'Morning', <Sun size={14} />)}
                  {renderFilterPill('night', 'Night', <Moon size={14} />)}
                  {renderFilterPill('personal', 'Personal', <Sparkles size={14} />)}
              </div>

              {/* 30-Day Consistency */}
              <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 mb-8 hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-slate-400" />
                          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">30-Day Consistency Map</h3>
                      </div>
                      <div className="flex gap-1.5 items-center">
                          <span className="text-[9px] text-slate-600 uppercase font-bold mr-1">Less</span>
                          <div className="w-2.5 h-2.5 rounded-sm bg-slate-800" />
                          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-900" />
                          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-700" />
                          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
                          <span className="text-[9px] text-slate-600 uppercase font-bold ml-1">More</span>
                      </div>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(24px,1fr))] gap-1.5">
                      {consistencyData.map((day, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.01 }}
                            className="flex flex-col gap-1 group relative cursor-pointer"
                          >
                                <div 
                                    className={`
                                        aspect-square rounded-md transition-all duration-300 hover:scale-110 hover:z-10
                                        ${day.intensity === 0 ? 'bg-slate-800/50' : 
                                          day.intensity < 0.3 ? 'bg-indigo-900/80 border border-indigo-800' :
                                          day.intensity < 0.6 ? 'bg-indigo-700/80 border border-indigo-600' :
                                          day.intensity < 0.9 ? 'bg-indigo-500/90 border border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]' :
                                          'bg-indigo-400 border border-indigo-300 shadow-[0_0_15px_rgba(129,140,248,0.5)]'}
                                    `}
                                />
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900/90 backdrop-blur border border-white/10 text-xs text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                    <span className="font-mono font-bold text-indigo-300">{day.date}</span>: {day.count} completed
                                </div>
                          </motion.div>
                      ))}
                  </div>
              </div>

              {/* Habit List */}
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                  {filteredHabits.length === 0 ? (
                      <motion.div 
                        variants={itemVariants}
                        className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20"
                      >
                          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
                              <List size={32} />
                          </div>
                          <p className="text-slate-400 font-medium">No habits found.</p>
                          <p className="text-sm text-slate-600 mb-6">Create one to start your forge.</p>
                          <button onClick={() => setIsModalOpen(true)} className="text-indigo-400 text-sm font-bold hover:underline hover:text-indigo-300 transition-colors">
                              + Create New Habit
                          </button>
                      </motion.div>
                  ) : (
                      filteredHabits.map(habit => {
                          const isCompleted = habit.completedDates.includes(today);
                          const streak = getStreak(habit.completedDates);
                          
                          return (
                              <motion.div 
                                variants={itemVariants}
                                key={habit.id}
                                layout
                                onClick={() => toggleHabit(habit.id)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className={`
                                    group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden
                                    ${isCompleted 
                                        ? 'bg-slate-900 border-indigo-500/30 shadow-[0_0_20px_rgba(0,0,0,0.3)]' 
                                        : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60'}
                                `}
                              >
                                  {isCompleted && (
                                       <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
                                  )}

                                  <div className="flex items-center gap-4 relative z-10">
                                      <div className={`
                                          w-14 h-14 rounded-2xl flex items-center justify-center transition-colors border
                                          ${isCompleted 
                                            ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/30 rotate-3' 
                                            : `bg-slate-800/80 ${getCategoryColor(habit.category).replace('text-', 'text-slate-400 group-hover:text-').replace('bg-', 'bg-slate-800')}`}
                                      `}>
                                          {isCompleted ? <Check size={28} className="drop-shadow-md" /> : getCategoryIcon(habit.category, 24)}
                                      </div>
                                      <div>
                                          <h3 className={`font-bold text-lg transition-colors ${isCompleted ? 'text-white line-through decoration-indigo-500/50 decoration-2' : 'text-slate-200'}`}>
                                              {habit.title}
                                          </h3>
                                          <div className="flex items-center gap-3 mt-1">
                                              <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${streak > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                                                  <Flame size={12} className={streak > 0 ? 'fill-orange-400 animate-pulse' : ''} /> {streak} day streak
                                              </span>
                                              <span className="w-1 h-1 rounded-full bg-slate-700" />
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                  {habit.frequency === 'daily' ? 'Daily' : habit.frequency}
                                              </span>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="flex items-center gap-6 relative z-10">
                                       <div className="hidden sm:flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                                           {[...Array(5)].map((_, i) => (
                                               <div key={i} className={`w-1.5 h-8 rounded-full transition-colors ${i < (streak % 5) || (streak >= 5 && i < 5) ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-800'}`} />
                                           ))}
                                       </div>
                                       <button 
                                          onClick={(e) => deleteHabit(habit.id, e)}
                                          className="p-2.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                       >
                                           <Trash2 size={18} />
                                       </button>
                                  </div>
                              </motion.div>
                          );
                      })
                  )}
              </motion.div>
          </motion.div>
      </div>

      {/* NEW HABIT MODAL */}
      <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.95 }}
             className="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
           >
               {/* Background Glow */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />

               {/* Close Button */}
               <button 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-20"
               >
                   <X size={24} />
               </button>

               <div className="flex items-center gap-3 mb-8 relative z-10">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg">
                       <Plus size={20} />
                   </div>
                   <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Forge New Habit</h2>
                        <p className="text-xs text-slate-400">Consistency is key.</p>
                   </div>
               </div>
               
               <div className="space-y-8 relative z-10">
                  
                  {/* Category Grid */}
                  <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-3 block">Choose Category</label>
                      <div className="grid grid-cols-5 gap-3">
                          {[
                              { id: 'study', label: 'Study', icon: Brain, color: 'text-indigo-400' },
                              { id: 'health', label: 'Health', icon: Heart, color: 'text-rose-400' },
                              { id: 'morning', label: 'Morning', icon: Sun, color: 'text-amber-400' },
                              { id: 'night', label: 'Night', icon: Moon, color: 'text-violet-400' },
                              { id: 'personal', label: 'Personal', icon: Sparkles, color: 'text-emerald-400' },
                          ].map(cat => {
                              const isSelected = newHabitCategory === cat.id;
                              const Icon = cat.icon;
                              return (
                                  <button
                                      key={cat.id}
                                      onClick={() => setNewHabitCategory(cat.id as HabitCategory)}
                                      className={`
                                          flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all aspect-square
                                          ${isSelected 
                                              ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' 
                                              : 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700'}
                                      `}
                                  >
                                      <Icon size={24} className={isSelected ? cat.color : 'text-slate-500'} />
                                      <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                                          {cat.label}
                                      </span>
                                  </button>
                              )
                          })}
                      </div>
                  </div>

                  {/* Frequency Row */}
                  <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-3 block">Frequency</label>
                      <div className="flex gap-3">
                          {[
                              { id: 'daily', label: 'Daily' },
                              { id: 'interval', label: 'Interval' },
                              { id: 'weekly', label: 'Weekly' }
                          ].map(freq => {
                              const isSelected = newHabitFrequency === freq.id;
                              return (
                                  <button
                                      key={freq.id}
                                      onClick={() => setNewHabitFrequency(freq.id as HabitFrequency)}
                                      className={`
                                          flex-1 py-3 px-2 rounded-xl border text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all
                                          ${isSelected 
                                              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                                              : 'bg-slate-800/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'}
                                      `}
                                  >
                                      {freq.label}
                                  </button>
                              )
                          })}
                      </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-3 block">Habit Title</label>
                    <input 
                      autoFocus
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors font-medium text-sm shadow-inner"
                      placeholder="e.g., Deep Work 2h, Morning Run..."
                      value={newHabitTitle}
                      onChange={e => setNewHabitTitle(e.target.value)}
                    />
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={addHabit}
                    disabled={!newHabitTitle.trim()}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/40 disabled:opacity-50 disabled:cursor-not-allowed mt-4 transform active:scale-95"
                  >
                    Commit to Habit
                  </button>
               </div>
           </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};