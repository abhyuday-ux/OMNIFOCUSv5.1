
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
    // Set greeting
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('Morning');
    else if (hour < 18) setTimeOfDay('Afternoon');
    else setTimeOfDay('Evening');

    // Load completed status
    const completed = localStorage.getItem(`omni_completed_${todayStr}`);
    if (completed === 'true') setIsDayCompleted(true);
  }, [todayStr]);

  // --- Calculations ---

  const todaySessions = useMemo(() => sessions.filter(s => s.dateString === todayStr), [sessions, todayStr]);
  const todayDurationMs = useMemo(() => todaySessions.reduce((acc, s) => acc + s.durationMs, 0), [todaySessions]);
  const todayHours = todayDurationMs / 3600000;
  const progressPercent = Math.min((todayHours / targetHours) * 100, 100);

  // Yesterday comparison
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

  // Weekly Trend Data (Last 7 Days)
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

  const maxWeeklyHours = Math.max(...weeklyTrend.map(d => d.hours), targetHours * 0.5); // Min scale

  // Focus Rhythm (Time of Day Distribution)
  const focusRhythm = useMemo(() => {
      const dist = { morning: 0, afternoon: 0, evening: 0, night: 0 };
      sessions.forEach(s => {
          const h = new Date(s.startTime).getHours();
          if (h >= 5 && h < 12) dist.morning += s.durationMs;
          else if (h >= 12 && h < 17) dist.afternoon += s.durationMs;
          else if (h >= 17 && h < 22) dist.evening += s.durationMs;
          else dist.night += s.durationMs; // 22 - 5
      });
      
      const total = Object.values(dist).reduce((a,b) => a+b, 0) || 1;
      return [
          { label: 'Morning', value: dist.morning, pct: (dist.morning / total) * 100, icon: Sun, color: 'text-amber-400' },
          { label: 'Afternoon', value: dist.afternoon, pct: (dist.afternoon / total) * 100, icon: Zap, color: 'text-orange-400' },
          { label: 'Evening', value: dist.evening, pct: (dist.evening / total) * 100, icon: Sunset, color: 'text-indigo-400' },
          { label: 'Night', value: dist.night, pct: (dist.night / total) * 100, icon: Moon, color: 'text-blue-400' },
      ];
  }, [sessions]);

  // Recent Sessions
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

  const getSubjectColor = (id: string) => {
      const s = subjects.find(sub => sub.id === id);
      return s?.color || '#64748b';
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
            className="w-full max-w-7xl mx-auto flex-1 flex flex-col px-4 lg:px-2 pb-8"
        >
            {/* 1. Header Section */}
            <motion.div variants={itemVariants} className="flex-none mb-6 pt-4 lg:pt-2 px-1">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
                
                {/* Hero Card: Today's Focus */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-2 bg-[#0B0F15] border border-white/10 rounded-3xl p-5 md:p-6 relative overflow-hidden group shadow-2xl flex flex-col justify-between min-h-[200px] md:min-h-[220px]"
                >
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
                                <span className="text-3xl md:text-4xl font-mono font-bold text-white tracking-tighter">
                                    {formatHoursMins(todayDurationMs)}
                                </span>
                                <span className="text-xs md:text-sm font-medium text-slate-500">
                                    / {targetHours}h target
                                </span>
                            </div>
                            {/* Growth Indicator */}
                            <div className="mt-2 flex items-center gap-1.5 text-xs">
                                {todayDurationMs > 0 && yesterdayDurationMs > 0 ? (
                                    <>
                                        {growthPercent >= 0 ? (
                                            <span className="text-emerald-400 flex items-center font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                <ArrowUpRight size={12} className="mr-0.5" /> {Math.abs(growthPercent).toFixed(0)}%
                                            </span>
                                        ) : (
                                            <span className="text-rose-400 flex items-center font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
                                                <ArrowDownRight size={12} className="mr-0.5" /> {Math.abs(growthPercent).toFixed(0)}%
                                            </span>
                                        )}
                                        <span className="text-slate-500">vs yesterday ({formatHoursMins(yesterdayDurationMs)})</span>
                                    </>
                                ) : (
                                    <span className="text-slate-500 italic">Start tracking to compare</span>
                                )}
                            </div>
                        </div>
                        
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

                {/* Today's Breakdown */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 bg-[#0B0F15] border border-white/10 rounded-3xl p-4 md:p-5 flex flex-col justify-between relative overflow-hidden"
                >
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <PieChart size={16} className="text-blue-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Mix</span>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center relative z-10 min-h-[100px]">
                        <div className="scale-75 -ml-4 -mt-2">
                            <SubjectDonut sessions={todaySessions} subjects={subjects} />
                        </div>
                    </div>
                </motion.div>

                {/* Streak Card */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 bg-[#0B0F15] border border-white/10 rounded-3xl p-4 md:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/30 transition-colors"
                >
                    <div className="absolute top-0 right-0 p-12 bg-orange-500/5 rounded-full blur-2xl -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                            <Flame size={18} className={streak > 0 ? "animate-pulse" : ""} fill={streak > 0 ? "currentColor" : "none"} />
                        </div>
                    </div>
                    
                    <div className="relative z-10 mt-auto">
                        <span className="text-2xl md:text-3xl font-mono font-bold text-white block">{streak}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Day Streak</span>
                    </div>
                </motion.div>
            </div>

            {/* 3. Detailed Insights Row (NEW) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
                
                {/* Weekly Trend (Spans 2 cols on lg) */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 lg:col-span-2 bg-[#0B0F15] border border-white/10 rounded-3xl p-5 flex flex-col"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={16} className={`text-${accent}-400`} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Trend</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-end gap-2 w-full h-[100px]">
                        {weeklyTrend.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                <div className="w-full relative flex-1 flex items-end">
                                    <div 
                                        className={`w-full rounded-t-sm min-h-[4px] transition-all duration-500 relative ${d.isToday ? `bg-${accent}-500` : 'bg-slate-800 group-hover:bg-slate-700'}`}
                                        style={{ height: `${(d.hours / (maxWeeklyHours || 1)) * 100}%` }}
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-900 border border-white/10 text-[10px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                                            {d.hours.toFixed(1)}h
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-bold uppercase ${d.isToday ? 'text-white' : 'text-slate-600'}`}>{d.day}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Focus Rhythm (Peak Hours) */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 bg-[#0B0F15] border border-white/10 rounded-3xl p-5 flex flex-col"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={16} className="text-emerald-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Focus Rhythm</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-between gap-2">
                        {focusRhythm.map((period, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <period.icon size={12} className={`flex-none ${period.color}`} />
                                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full opacity-80 ${period.pct > 0 ? period.color.replace('text-', 'bg-') : 'bg-transparent'}`}
                                        style={{ width: `${period.pct}%` }} 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Recent Sessions List */}
                <motion.div 
                    variants={itemVariants}
                    className="col-span-1 bg-[#0B0F15] border border-white/10 rounded-3xl p-5 flex flex-col"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <History size={16} className="text-blue-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
                        {recentSessions.length === 0 ? (
                            <div className="text-[10px] text-slate-600 italic text-center my-auto">No recent activity</div>
                        ) : (
                            recentSessions.map(s => {
                                const sub = subjects.find(sub => sub.id === s.subjectId);
                                const isHex = isHexColor(sub?.color || '');
                                return (
                                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div 
                                                className={`w-1.5 h-6 rounded-full flex-none ${!isHex ? sub?.color : ''}`}
                                                style={isHex ? { backgroundColor: sub?.color } : {}} 
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-bold text-slate-300 truncate">{sub?.name}</span>
                                                <span className="text-[9px] text-slate-500">
                                                    {new Date(s.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400 font-medium">
                                            {s.durationMs > 3600000 ? (s.durationMs/3600000).toFixed(1) + 'h' : Math.round(s.durationMs/60000) + 'm'}
                                        </span>
                                    </div>
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
