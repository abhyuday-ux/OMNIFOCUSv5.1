
import React, { useState, useMemo } from 'react';
import { StudySession, Subject, isHexColor } from '../types';
import { BarChart2, TrendingUp, Clock, Activity, Zap, Calendar, ArrowRight, Layout, List, PieChart } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { SubjectDonut } from './SubjectDonut';
import { DailyTimeline } from './DailyTimeline';
import { HistoryList } from './HistoryList';

interface StatsPageProps {
  sessions: StudySession[];
  subjects: Subject[];
}

type TimeRange = 'week' | 'month' | 'all';
type ViewMode = 'overview' | 'daily';

export const StatsPage: React.FC<StatsPageProps> = ({ sessions, subjects }) => {
  const { accent } = useTheme();
  const [range, setRange] = useState<TimeRange>('week');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  
  // Daily View State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Helpers ---
  
  const getDateRange = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (range === 'week') {
          const start = new Date(today);
          start.setDate(today.getDate() - 6);
          return { start, end: today };
      }
      if (range === 'month') {
          const start = new Date(today);
          start.setDate(today.getDate() - 29);
          return { start, end: today };
      }
      return { start: new Date(0), end: today };
  };

  const { start, end } = getDateRange();

  const filteredSessions = useMemo(() => {
      if (range === 'all') return sessions;
      const startTime = start.getTime();
      const endTime = end.getTime() + 86400000; // End of today
      return sessions.filter(s => s.startTime >= startTime && s.startTime < endTime);
  }, [sessions, range, start, end]);

  // --- Metrics ---

  const totalDuration = filteredSessions.reduce((acc, s) => acc + s.durationMs, 0);
  const totalHours = totalDuration / 3600000;
  
  const daysInRange = range === 'week' ? 7 : range === 'month' ? 30 : new Set(filteredSessions.map(s => s.dateString)).size || 1;
  const dailyAverage = totalHours / (daysInRange || 1);

  // Subject Breakdown
  const subjectTotals = useMemo(() => {
      const totals: Record<string, number> = {};
      filteredSessions.forEach(s => {
          totals[s.subjectId] = (totals[s.subjectId] || 0) + s.durationMs;
      });
      return totals;
  }, [filteredSessions]);

  const topSubjectId = Object.keys(subjectTotals).sort((a,b) => subjectTotals[b] - subjectTotals[a])[0];
  const topSubject = subjects.find(s => s.id === topSubjectId);

  // Trend Data (Bar Chart)
  const trendData = useMemo(() => {
      const data = [];
      // If 'all', default to last 30 days for the chart visual to avoid overcrowding
      const chartRange = range === 'all' ? 'month' : range;
      const chartStart = chartRange === 'week' ? start : new Date(new Date().setDate(new Date().getDate() - 29));
      const daysCount = chartRange === 'week' ? 7 : 30;

      for (let i = 0; i < daysCount; i++) {
          const d = new Date(chartStart);
          d.setDate(chartStart.getDate() + i);
          
          const dStr = d.toISOString().split('T')[0];
          const daySessions = sessions.filter(s => s.dateString === dStr);
          const val = daySessions.reduce((acc, s) => acc + s.durationMs, 0) / 3600000;
          
          data.push({
              date: dStr,
              label: d.getDate().toString(),
              fullDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric'}),
              value: val
          });
      }
      return data;
  }, [sessions, range, start]);

  const maxTrendValue = Math.max(...trendData.map(d => d.value), 1);

  // Heatmap Data (Day x Time of Day)
  // Rows: Mon-Sun
  // Cols: 4h blocks (0-4, 4-8, 8-12, 12-16, 16-20, 20-24)
  const heatmapData = useMemo(() => {
      const grid = Array(7).fill(0).map(() => Array(6).fill(0)); // 7 days x 6 blocks
      
      filteredSessions.forEach(s => {
          const d = new Date(s.startTime);
          const day = d.getDay(); // 0=Sun, 1=Mon... 
          // Adjust so 0=Mon, 6=Sun for display usually better
          const row = day === 0 ? 6 : day - 1; 
          
          const hour = d.getHours();
          const col = Math.floor(hour / 4);
          
          grid[row][col] += s.durationMs;
      });
      
      // Normalize
      const maxVal = Math.max(...grid.flat(), 1);
      return grid.map(row => row.map(val => val / maxVal));
  }, [filteredSessions]);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeLabels = ['Night', 'Early', 'Morn', 'Noon', 'Eve', 'Late'];

  // Session Duration Distribution (Quality)
  const sessionQuality = useMemo(() => {
      let short = 0; // < 25m
      let medium = 0; // 25-50m
      let long = 0; // > 50m
      
      filteredSessions.forEach(s => {
          const mins = s.durationMs / 60000;
          if (mins < 25) short++;
          else if (mins < 50) medium++;
          else long++;
      });
      
      const total = short + medium + long || 1;
      return {
          short: (short / total) * 100,
          medium: (medium / total) * 100,
          long: (long / total) * 100
      };
  }, [filteredSessions]);

  // Derived Daily Data for Sub-View
  const selectedDateSessions = useMemo(() => sessions.filter(s => s.dateString === selectedDate), [sessions, selectedDate]);
  
  const changeDate = (offset: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + offset);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
        
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-none">
            <div className="bg-slate-900/50 p-1 rounded-xl border border-white/10 flex gap-1">
                <button 
                    onClick={() => setViewMode('overview')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'overview' ? `bg-${accent}-600 text-white shadow-lg` : 'text-slate-400 hover:text-white'}`}
                >
                    <Activity size={14} /> Insights
                </button>
                <button 
                    onClick={() => setViewMode('daily')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'daily' ? `bg-${accent}-600 text-white shadow-lg` : 'text-slate-400 hover:text-white'}`}
                >
                    <List size={14} /> Daily Log
                </button>
            </div>

            {viewMode === 'overview' && (
                <div className="flex gap-2">
                    {(['week', 'month', 'all'] as TimeRange[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${range === r ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            )}
        </div>

        <AnimatePresence mode="wait">
        {viewMode === 'overview' ? (
            <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar"
            >
                {/* 1. Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 p-8 bg-${accent}-500/10 rounded-full blur-xl -mr-4 -mt-4 transition-opacity group-hover:opacity-100 opacity-50`} />
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Focus</p>
                            <h3 className="text-2xl font-mono font-bold text-white">{totalHours.toFixed(1)}<span className="text-sm text-slate-500 ml-1">h</span></h3>
                        </div>
                        <Clock className={`absolute bottom-4 right-4 text-${accent}-500/20`} size={32} />
                    </div>
                    
                    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 bg-emerald-500/10 rounded-full blur-xl -mr-4 -mt-4 transition-opacity group-hover:opacity-100 opacity-50" />
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Daily Avg</p>
                            <h3 className="text-2xl font-mono font-bold text-white">{dailyAverage.toFixed(1)}<span className="text-sm text-slate-500 ml-1">h</span></h3>
                        </div>
                        <Activity className="absolute bottom-4 right-4 text-emerald-500/20" size={32} />
                    </div>

                    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 bg-orange-500/10 rounded-full blur-xl -mr-4 -mt-4 transition-opacity group-hover:opacity-100 opacity-50" />
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Top Subject</p>
                            <h3 className="text-xl font-bold text-white truncate">{topSubject?.name || '-'}</h3>
                        </div>
                        <TrendingUp className="absolute bottom-4 right-4 text-orange-500/20" size={32} />
                    </div>

                    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 bg-blue-500/10 rounded-full blur-xl -mr-4 -mt-4 transition-opacity group-hover:opacity-100 opacity-50" />
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deep Work</p>
                            <h3 className="text-2xl font-mono font-bold text-white">{sessionQuality.long.toFixed(0)}<span className="text-sm text-slate-500 ml-1">%</span></h3>
                        </div>
                        <Zap className="absolute bottom-4 right-4 text-blue-500/20" size={32} />
                    </div>
                </div>

                {/* 2. Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trend Chart */}
                    <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <BarChart2 size={18} className="text-slate-400" />
                                <h3 className="font-bold text-slate-200">Study Trend</h3>
                            </div>
                            <span className="text-xs text-slate-500 font-mono">Last {range === 'week' ? '7 Days' : '30 Days'}</span>
                        </div>
                        
                        <div className="flex-1 flex items-end gap-2 h-48 w-full">
                            {trendData.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                    <div 
                                        className={`w-full rounded-t-sm transition-all duration-500 group-hover:brightness-110 relative ${d.value > dailyAverage ? `bg-${accent}-500` : 'bg-slate-700'}`}
                                        style={{ height: `${(d.value / maxTrendValue) * 100}%`, minHeight: '4px' }}
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 border border-white/10 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 shadow-xl transition-opacity">
                                            <span className="font-bold">{d.value.toFixed(1)}h</span> on {d.fullDate}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono hidden sm:block">{d.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Distribution */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center">
                        <h3 className="font-bold text-slate-200 mb-4 w-full text-left flex items-center gap-2">
                            <PieChart size={18} className="text-slate-400" /> Distribution
                        </h3>
                        <SubjectDonut sessions={filteredSessions} subjects={subjects} />
                    </div>
                </div>

                {/* 3. Advanced Insights Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
                    {/* Productivity Heatmap */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Layout size={18} className="text-slate-400" />
                            <h3 className="font-bold text-slate-200">Focus Heatmap</h3>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <div className="flex pl-8 mb-2">
                                {timeLabels.map((label, i) => (
                                    <div key={i} className="flex-1 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</div>
                                ))}
                            </div>
                            {heatmapData.map((row, dayIdx) => (
                                <div key={dayIdx} className="flex items-center gap-3">
                                    <span className="w-6 text-[10px] font-bold text-slate-500 uppercase">{dayLabels[dayIdx]}</span>
                                    <div className="flex-1 flex gap-1 h-8">
                                        {row.map((intensity, timeIdx) => (
                                            <div 
                                                key={timeIdx}
                                                className={`flex-1 rounded-sm transition-all hover:scale-105`}
                                                style={{ 
                                                    backgroundColor: intensity > 0 
                                                        ? `rgba(var(--color-${accent}-500), ${0.1 + intensity * 0.9})` 
                                                        : 'rgba(255,255,255,0.02)',
                                                    border: intensity > 0 ? 'none' : '1px solid rgba(255,255,255,0.02)'
                                                }}
                                                title={`${dayLabels[dayIdx]} ${timeLabels[timeIdx]}: ${(intensity*100).toFixed(0)}% activity`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Session Quality Breakdown */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex flex-col">
                        <div className="flex items-center gap-2 mb-6">
                            <Zap size={18} className="text-slate-400" />
                            <h3 className="font-bold text-slate-200">Session Quality</h3>
                        </div>
                        
                        <div className="space-y-6 flex-1 justify-center flex flex-col">
                            {/* Short */}
                            <div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-slate-400">Quick Sessions (&lt;25m)</span>
                                    <span className="text-white font-mono">{sessionQuality.short.toFixed(0)}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-500" style={{ width: `${sessionQuality.short}%` }} />
                                </div>
                            </div>
                            {/* Medium */}
                            <div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-slate-400">Pomodoro (25-50m)</span>
                                    <span className="text-white font-mono">{sessionQuality.medium.toFixed(0)}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${sessionQuality.medium}%` }} />
                                </div>
                            </div>
                            {/* Long */}
                            <div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-slate-400">Deep Work (&gt;50m)</span>
                                    <span className="text-white font-mono">{sessionQuality.long.toFixed(0)}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full bg-${accent}-500 shadow-[0_0_10px_currentColor]`} style={{ width: `${sessionQuality.long}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        ) : (
            <motion.div 
                key="daily"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full overflow-hidden"
            >
                {/* Date Controls */}
                <div className="flex items-center justify-between mb-4 bg-white/5 backdrop-blur-md border border-white/5 p-3 rounded-xl flex-none">
                   <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white/10 rounded-lg"><ArrowRight size={16} className="rotate-180"/></button>
                   <div className="flex items-center gap-2">
                       <Calendar size={16} className={`text-${accent}-400`} />
                       <span className="font-mono font-bold text-white">{selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric'})}</span>
                   </div>
                   <button onClick={() => changeDate(1)} className="p-2 hover:bg-white/10 rounded-lg"><ArrowRight size={16}/></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="h-[400px] mb-8 bg-slate-950/30 rounded-2xl border border-white/5 p-4">
                        <DailyTimeline sessions={selectedDateSessions} subjects={subjects} className="h-full" />
                    </div>
                    <HistoryList sessions={selectedDateSessions} subjects={subjects} />
                </div>
            </motion.div>
        )}
        </AnimatePresence>
    </div>
  );
};
