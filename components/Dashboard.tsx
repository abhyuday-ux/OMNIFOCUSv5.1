import React, { useState, useEffect, useMemo } from 'react';
import { StudySession, Subject } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { 
  Target, Flame, Clock, Moon, 
  Plus, ArrowRight, Calendar, 
  CheckCircle2, AlertTriangle, Lock,
  Trophy, BarChart2, Zap, BookOpen, CalendarDays,
  Sparkles, TrendingUp, MoreHorizontal
} from 'lucide-react';

interface DashboardProps {
  sessions: StudySession[];
  subjects: Subject[];
  targetHours: number;
  userName?: string;
  onNavigate: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  sessions, 
  subjects, 
  targetHours, 
  userName = "Aspirant",
  onNavigate
}) => {
  const { accent } = useTheme();
  const [sleepHours, setSleepHours] = useState<string>('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [isDayCompleted, setIsDayCompleted] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Set greeting
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('Morning');
    else if (hour < 18) setTimeOfDay('Afternoon');
    else setTimeOfDay('Evening');

    // Load sleep
    const savedSleep = localStorage.getItem(`omni_sleep_${todayStr}`);
    if (savedSleep) setSleepHours(savedSleep);

    // Load completed status
    const completed = localStorage.getItem(`omni_completed_${todayStr}`);
    if (completed === 'true') setIsDayCompleted(true);
  }, [todayStr]);

  const handleSaveSleep = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSleepHours(val);
    localStorage.setItem(`omni_sleep_${todayStr}`, val);
  };

  // --- Calculations ---

  const todaySessions = useMemo(() => sessions.filter(s => s.dateString === todayStr), [sessions, todayStr]);
  const todayDurationMs = useMemo(() => todaySessions.reduce((acc, s) => acc + s.durationMs, 0), [todaySessions]);
  const todayHours = todayDurationMs / 3600000;
  const progressPercent = Math.min((todayHours / targetHours) * 100, 100);

  // Streak Calculation
  const streak = useMemo(() => {
      const dates = [...new Set(sessions.map(s => s.dateString))].sort().reverse();
      if (dates.length === 0) return 0;
      
      let count = 0;
      let current = new Date();
      if (dates.includes(todayStr)) {
          // count starts at 0, will increment in loop
      } else {
          current.setDate(current.getDate() - 1);
          if (!dates.includes(current.toISOString().split('T')[0])) {
              return 0;
          }
      }

      current = new Date();
      if (!dates.includes(todayStr)) {
           current.setDate(current.getDate() - 1);
      }

      while (true) {
          const dStr = current.toISOString().split('T')[0];
          if (dates.includes(dStr)) {
              count++;
              current.setDate(current.getDate() - 1);
          } else {
              break;
          }
      }
      return count;
  }, [sessions, todayStr]);

  // Weekly Stats
  const weeklyStats = useMemo(() => {
      const now = new Date();
      let weeklyHours = 0;
      let daysMetGoal = 0;
      const activityBySubject: Record<string, number> = {};
      const activityByDay: Record<string, number> = {};

      for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          
          const daySessions = sessions.filter(s => s.dateString === dStr);
          const dayTotal = daySessions.reduce((acc, s) => acc + s.durationMs, 0);
          
          weeklyHours += dayTotal;
          if (dayTotal >= targetHours * 3600000) daysMetGoal++;
          
          activityByDay[dStr] = dayTotal;

          daySessions.forEach(s => {
              activityBySubject[s.subjectId] = (activityBySubject[s.subjectId] || 0) + s.durationMs;
          });
      }

      const topSubjectId = Object.entries(activityBySubject).sort((a,b) => b[1] - a[1])[0]?.[0];
      const topSubject = subjects.find(s => s.id === topSubjectId)?.name || 'None';
      
      const totalSessionsLast7Days = sessions.filter(s => {
          const d = new Date(s.startTime);
          const diffTime = Math.abs(now.getTime() - d.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          return diffDays <= 7;
      }).length;

      const avgFocus = totalSessionsLast7Days > 0 
        ? (weeklyHours / totalSessionsLast7Days / 60000).toFixed(0) + 'm' 
        : '-';

      const mostActiveDate = Object.entries(activityByDay).sort((a,b) => b[1] - a[1])[0]?.[0];
      const mostActiveDay = mostActiveDate 
        ? new Date(mostActiveDate).toLocaleDateString('en-US', { weekday: 'short' }) 
        : '-';

      return {
          weeklyHours: (weeklyHours / 3600000).toFixed(1),
          daysMetGoal,
          topSubject,
          avgFocus,
          mostActiveDay
      };
  }, [sessions, targetHours, subjects]);

  const formatHoursMins = (ms: number) => {
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      return `${h}h ${m}m`;
  };

  // Animations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar flex flex-col pb-safe">
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full max-w-7xl mx-auto flex-1 flex flex-col lg:px-2"
        >
            {/* 1. Header Section */}
            <motion.div variants={itemVariants} className="flex-none mb-6 pt-2 px-1">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1 opacity-70">
                            <CalendarDays size={12} className={`text-${accent}-400`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
                            Good {timeOfDay}, <span className={`text-${accent}-400`}>{userName}</span>
                        </h1>
                    </div>
                    
                    <button 
                        onClick={() => onNavigate('calendar')}
                        className="self-start md:self-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-xs font-bold text-slate-300 transition-all hover:scale-105 active:scale-95"
                    >
                        <Calendar size={14} /> 
                        <span>Full Schedule</span>
                    </button>
                </div>
            </motion.div>

            {/* 2. Main Dashboard Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                
                {/* Hero Card: Today's Focus (Spans full width on mobile, 2 cols on desktop) */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-2 bg-[#0B0F15] border border-white/10 rounded-3xl p-6 relative overflow-hidden group shadow-2xl flex flex-col justify-between min-h-[220px]"
                >
                    {/* Background Effects */}
                    <div className={`absolute top-0 right-0 p-32 bg-${accent}-500/10 rounded-full blur-[80px] -mr-16 -mt-16 transition-opacity opacity-60 group-hover:opacity-100`} />
                    
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1.5 rounded-lg bg-${accent}-500/20 text-${accent}-400`}>
                                    <Target size={16} />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Goal</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-mono font-bold text-white tracking-tighter">
                                    {formatHoursMins(todayDurationMs)}
                                </span>
                                <span className="text-sm font-medium text-slate-500">
                                    / {targetHours}h target
                                </span>
                            </div>
                        </div>
                        
                        {/* Circular Progress (Visual Only) */}
                        <div className="relative w-16 h-16 hidden sm:flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                <path 
                                    className={`text-${accent}-500 drop-shadow-[0_0_10px_rgba(var(--color-${accent}-500),0.5)] transition-all duration-1000 ease-out`}
                                    strokeDasharray={`${progressPercent}, 100`}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="4" 
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-xs font-bold text-white">{Math.round(progressPercent)}%</span>
                        </div>
                    </div>

                    <div className="relative z-10 mt-6">
                        {/* Progress Bar for Mobile */}
                        <div className="w-full h-2 bg-slate-800 rounded-full mb-6 sm:hidden overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                className={`h-full bg-${accent}-500 rounded-full`}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => !isDayCompleted && onNavigate('timer')}
                                disabled={isDayCompleted}
                                className={`
                                    flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]
                                    ${isDayCompleted 
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                        : `bg-gradient-to-r from-${accent}-600 to-${accent}-500 hover:from-${accent}-500 hover:to-${accent}-400 text-white shadow-lg shadow-${accent}-500/20`}
                                `}
                            >
                                <Zap size={16} fill="currentColor" /> {isDayCompleted ? 'Day Complete' : 'Start Focus'}
                            </button>
                            <button 
                                onClick={() => onNavigate('timeline')}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors border border-white/5"
                            >
                                <BarChart2 size={20} />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Streak Card */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 bg-[#0B0F15] border border-white/10 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/30 transition-colors"
                >
                    <div className="absolute top-0 right-0 p-12 bg-orange-500/5 rounded-full blur-2xl -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                            <Flame size={18} className={streak > 0 ? "animate-pulse" : ""} fill={streak > 0 ? "currentColor" : "none"} />
                        </div>
                    </div>
                    
                    <div className="relative z-10">
                        <span className="text-3xl font-mono font-bold text-white block">{streak}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Day Streak</span>
                    </div>
                </motion.div>

                {/* Sleep Card */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 bg-[#0B0F15] border border-white/10 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-violet-500/30 transition-colors"
                >
                    <div className="absolute top-0 right-0 p-12 bg-violet-500/5 rounded-full blur-2xl -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                            <Moon size={18} />
                        </div>
                        {sleepHours && <CheckCircle2 size={16} className="text-emerald-500" />}
                    </div>
                    
                    <div className="relative z-10 mt-2">
                        <div className="flex items-baseline gap-1">
                            <input 
                                type="number" 
                                placeholder="--"
                                value={sleepHours}
                                onChange={handleSaveSleep}
                                className="w-12 bg-transparent text-2xl font-mono font-bold text-white placeholder-slate-700 focus:outline-none focus:text-violet-300 transition-colors p-0"
                            />
                            <span className="text-sm text-slate-500">hrs</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-1">Sleep Log</span>
                    </div>
                </motion.div>
            </div>

            {/* 3. Weekly Insights (Horizontal Scroll on Mobile) */}
            <motion.div variants={itemVariants} className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={14} /> Weekly Insights
                    </h3>
                    <button onClick={() => onNavigate('timeline')} className="text-slate-500 hover:text-white transition-colors">
                        <MoreHorizontal size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar">
                    {[
                        { label: 'Consistency', value: `${weeklyStats.daysMetGoal}/7 days`, icon: Trophy, color: 'text-yellow-400' },
                        { label: 'Total Focus', value: `${weeklyStats.weeklyHours}h`, icon: Clock, color: 'text-emerald-400' },
                        { label: 'Top Subject', value: weeklyStats.topSubject, icon: BookOpen, color: `text-${accent}-400` },
                        { label: 'Avg Session', value: weeklyStats.avgFocus, icon: Zap, color: 'text-orange-400' },
                        { label: 'Peak Day', value: weeklyStats.mostActiveDay, icon: CalendarDays, color: 'text-blue-400' },
                    ].map((stat, i) => (
                        <div 
                            key={i} 
                            className="bg-white/5 border border-white/5 rounded-2xl p-4 min-w-[140px] snap-start flex flex-col justify-center hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-2 mb-2 opacity-80">
                                <stat.icon size={14} className={stat.color} />
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                            </div>
                            <span className="text-sm font-bold text-slate-100 truncate">{stat.value}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    </div>
  );
};