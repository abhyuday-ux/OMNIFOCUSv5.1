
import React, { useState, useEffect, useMemo } from 'react';
import { StudySession, Subject, isHexColor } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { 
  Target, Flame, Clock, Moon, Sun, Sunset,
  Plus, ArrowRight, Calendar, 
  CheckCircle2, AlertTriangle, Lock,
  Trophy, BarChart2, Zap, BookOpen, CalendarDays,
  Sparkles, TrendingUp, MoreHorizontal, PieChart, ArrowUpRight, ArrowDownRight, History, Activity
} from 'lucide-react';
import { SubjectDonut } from './SubjectDonut';

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
  const [timeOfDay, setTimeOfDay] = useState('');
  const [isDayCompleted, setIsDayCompleted] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('Morning');
    else if (hour < 18) setTimeOfDay('Afternoon');
    else setTimeOfDay('Evening');

    const completed = localStorage.getItem(`omni_completed_${todayStr}`);
    if (completed === 'true') setIsDayCompleted(true);
  }, [todayStr]);

  // --- Calculations ---

  const todaySessions = useMemo(() => sessions.filter(s => s.dateString === todayStr), [sessions, todayStr]);
  const todayDurationMs = useMemo(() => todaySessions.reduce((acc, s) => acc + s.durationMs, 0), [todaySessions]);
  const todayHours = todayDurationMs / 3600000;
  const progressPercent = Math.min((todayHours / targetHours) * 100, 100);

  const yesterdayStr = useMemo(() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
  }, []);
  const yesterdaySessions = useMemo(() => sessions.filter(s => s.dateString === yesterdayStr), [sessions, yesterdayStr]);
  const yesterdayDurationMs = useMemo(() => yesterdaySessions.reduce((acc, s) => acc + s.durationMs, 0), [yesterdaySessions]);
  
  const growthPercent = yesterdayDurationMs > 0 
    ? ((todayDurationMs - yesterdayDurationMs) / yesterdayDurationMs) * 100 
    : todayDurationMs > 0 ? 100 : 0;

  const streak = useMemo(() => {
      const dates = [...new Set(sessions.map(s => s.dateString))].sort().reverse();
      if (dates.length === 0) return 0;
      
      let count = 0;
      let current = new Date();
      if (dates.includes(todayStr)) {
          // includes today
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

  const weeklyTrend = useMemo(() => {
      const days = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          const dayTotal = sessions
            .filter(s => s.dateString === dStr)
            .reduce((acc, s) => acc + s.durationMs, 0);
          
          days.push({
              day: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
              date: dStr,
              hours: dayTotal / 3600000,
              isToday: dStr === todayStr
          });
      }
      return days;
  }, [sessions, todayStr]);

  const maxWeeklyHours = Math.max(...weeklyTrend.map(d => d.hours), targetHours * 0.5);

  const focusRhythm = useMemo(() => {
      const dist = { morning: 0, afternoon: 0, evening: 0, night: 0 };
      sessions.forEach(s => {
          const h = new Date(s.startTime).getHours();
          if (h >= 5 && h < 12) dist.morning += s.durationMs;
          else if (h >= 12 && h < 17) dist.afternoon += s.durationMs;
          else if (h >= 17 && h < 22) dist.evening += s.durationMs;
          else dist.night += s.durationMs; 
      });
      
      const total = Object.values(dist).reduce((a,b) => a+b, 0) || 1;
      return [
          { label: 'Morning', value: dist.morning, pct: (dist.morning / total) * 100, icon: Sun, color: 'text-amber-400' },
          { label: 'Afternoon', value: dist.afternoon, pct: (dist.afternoon / total) * 100, icon: Zap, color: 'text-orange-400' },
          { label: 'Evening', value: dist.evening, pct: (dist.evening / total) * 100, icon: Sunset, color: 'text-indigo-400' },
          { label: 'Night', value: dist.night, pct: (dist.night / total) * 100, icon: Moon, color: 'text-blue-400' },
      ];
  }, [sessions]);

  const recentSessions = useMemo(() => {
      return [...sessions]
        .sort((a, b) => b.endTime - a.endTime)
        .slice(0, 3);
  }, [sessions]);

  const formatHoursMins = (ms: number) => {
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      if (h === 0) return `${m}m`;
      return `${h}h ${m}m`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar flex flex-col pb-safe">
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full max-w-7xl mx-auto flex-1 flex flex-col px-4 lg:px-2 pb-8"
        >
            {/* 1. Header Section */}
            <motion.div variants={itemVariants} className="flex-none mb-8 pt-4 lg:pt-2 px-1">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 opacity-80">
                            <span className="flex h-2 w-2 relative">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${accent}-400 opacity-75`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 bg-${accent}-500`}></span>
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}
                            </span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                            Good {timeOfDay}, <span className={`text-transparent bg-clip-text bg-gradient-to-r from-${accent}-400 to-purple-400`}>{userName}</span>
                        </h1>
                    </div>
                    
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onNavigate('calendar')}
                        className="self-start md:self-auto flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold text-slate-300 transition-all shadow-lg backdrop-blur-sm"
                    >
                        <Calendar size={14} /> 
                        <span>Full Schedule</span>
                    </motion.button>
                </div>
            </motion.div>

            {/* 2. Main Dashboard Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
                
                {/* Hero Card */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-[2rem] p-6 lg:p-8 relative overflow-hidden group shadow-2xl flex flex-col justify-between min-h-[240px]"
                >
                    <div className={`absolute top-0 right-0 p-40 bg-${accent}-500/10 rounded-full blur-[100px] -mr-20 -mt-20 transition-opacity opacity-50 group-hover:opacity-80 duration-1000`} />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                    
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`p-1.5 rounded-lg bg-${accent}-500/20 text-${accent}-400 ring-1 ring-${accent}-500/30`}>
                                    <Target size={16} />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Goal</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl lg:text-5xl font-mono font-bold text-white tracking-tighter">
                                    {formatHoursMins(todayDurationMs)}
                                </span>
                                <span className="text-sm font-medium text-slate-500">
                                    / {targetHours}h target
                                </span>
                            </div>
                            {/* Growth Indicator */}
                            <div className="mt-3 flex items-center gap-2 text-xs">
                                {todayDurationMs > 0 && yesterdayDurationMs > 0 ? (
                                    <>
                                        {growthPercent >= 0 ? (
                                            <span className="text-emerald-400 flex items-center font-bold bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/10">
                                                <ArrowUpRight size={12} className="mr-1" /> {Math.abs(growthPercent).toFixed(0)}%
                                            </span>
                                        ) : (
                                            <span className="text-rose-400 flex items-center font-bold bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/10">
                                                <ArrowDownRight size={12} className="mr-1" /> {Math.abs(growthPercent).toFixed(0)}%
                                            </span>
                                        )}
                                        <span className="text-slate-500">vs yesterday</span>
                                    </>
                                ) : (
                                    <span className="text-slate-500 italic">Start tracking to see trends</span>
                                )}
                            </div>
                        </div>
                        
                        <div className="relative w-20 h-20 hidden sm:flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                <motion.path 
                                    initial={{ strokeDasharray: "0, 100" }}
                                    animate={{ strokeDasharray: `${progressPercent}, 100` }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                    className={`text-${accent}-500 drop-shadow-[0_0_15px_rgba(var(--color-${accent}-500),0.6)]`}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="3" 
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-xs font-bold text-white">{Math.round(progressPercent)}%</span>
                        </div>
                    </div>

                    <div className="relative z-10 mt-6">
                        <div className="flex items-center gap-3">
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => !isDayCompleted && onNavigate('timer')}
                                disabled={isDayCompleted}
                                className={`
                                    flex-1 py-3.5 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
                                    ${isDayCompleted 
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' 
                                        : `bg-gradient-to-r from-${accent}-600 to-${accent}-500 hover:from-${accent}-500 hover:to-${accent}-400 text-white shadow-lg shadow-${accent}-500/25 border border-${accent}-400/20`}
                                `}
                            >
                                <Zap size={18} fill="currentColor" /> {isDayCompleted ? 'Day Complete' : 'Start Focus Session'}
                            </motion.button>
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onNavigate('timeline')}
                                className="p-3.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors border border-white/10"
                            >
                                <BarChart2 size={22} />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Today's Breakdown */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-[2rem] p-5 flex flex-col justify-between relative overflow-hidden hover:border-white/20 transition-colors"
                >
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <PieChart size={16} className="text-blue-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Mix</span>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center relative z-10 min-h-[120px]">
                        <div className="scale-90 -ml-2 -mt-2">
                            <SubjectDonut sessions={todaySessions} subjects={subjects} />
                        </div>
                    </div>
                </motion.div>

                {/* Streak Card */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-[2rem] p-5 flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/30 transition-colors"
                >
                    <div className="absolute top-0 right-0 p-16 bg-orange-500/5 rounded-full blur-3xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/10">
                            <Flame size={20} className={streak > 0 ? "animate-pulse" : ""} fill={streak > 0 ? "currentColor" : "none"} />
                        </div>
                    </div>
                    
                    <div className="relative z-10 mt-auto">
                        <span className="text-4xl font-mono font-bold text-white block tracking-tighter mb-1">{streak}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            Day Streak <TrendingUp size={12} />
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* 3. Detailed Insights Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-4">
                
                {/* Weekly Trend */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 flex flex-col"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className={`text-${accent}-400`} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Trend</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-end gap-3 w-full h-[120px]">
                        {weeklyTrend.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                                <div className="w-full relative flex-1 flex items-end bg-slate-800/30 rounded-t-lg overflow-hidden">
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(d.hours / (maxWeeklyHours || 1)) * 100}%` }}
                                        transition={{ duration: 1, ease: "easeOut", delay: i * 0.05 }}
                                        className={`w-full rounded-t-lg transition-all duration-300 relative group-hover:opacity-90 ${d.isToday ? `bg-${accent}-500 shadow-[0_0_15px_rgba(var(--color-${accent}-500),0.3)]` : 'bg-slate-700'}`}
                                        style={{ minHeight: '4px' }}
                                    />
                                    {/* Hover Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-white/10 text-[10px] text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 shadow-xl transition-opacity font-mono">
                                        {d.hours.toFixed(1)}h
                                    </div>
                                </div>
                                <span className={`text-[9px] font-bold uppercase ${d.isToday ? 'text-white' : 'text-slate-600'}`}>{d.day}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Focus Rhythm */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 flex flex-col"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <Clock size={16} className="text-emerald-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Focus Rhythm</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-between gap-3">
                        {focusRhythm.map((period, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <period.icon size={14} className={`flex-none ${period.color}`} />
                                <div className="flex-1 h-2 bg-slate-800/50 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${period.pct}%` }}
                                        transition={{ duration: 1, delay: 0.2 + (i * 0.1) }}
                                        className={`h-full rounded-full opacity-90 ${period.pct > 0 ? period.color.replace('text-', 'bg-') : 'bg-transparent'}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Recent Sessions */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 flex flex-col"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <History size={16} className="text-blue-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Activity</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
                        {recentSessions.length === 0 ? (
                            <div className="text-[10px] text-slate-600 italic text-center my-auto">No recent activity</div>
                        ) : (
                            recentSessions.map((s, idx) => {
                                const sub = subjects.find(sub => sub.id === s.subjectId);
                                const isHex = isHexColor(sub?.color || '');
                                return (
                                    <motion.div 
                                        key={s.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + (idx * 0.1) }}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div 
                                                className={`w-1 h-8 rounded-full flex-none ${!isHex ? sub?.color : ''} shadow-[0_0_8px_currentColor]`}
                                                style={isHex ? { backgroundColor: sub?.color, color: sub?.color } : {}} 
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-bold text-slate-300 truncate">{sub?.name}</span>
                                                <span className="text-[9px] text-slate-500">
                                                    {new Date(s.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400 font-medium bg-slate-950/30 px-2 py-1 rounded-md">
                                            {s.durationMs > 3600000 ? (s.durationMs/3600000).toFixed(1) + 'h' : Math.round(s.durationMs/60000) + 'm'}
                                        </span>
                                    </motion.div>
                                )
                            })
                        )}
                    </div>
                </motion.div>

            </div>
        </motion.div>
    </div>
  );
};
