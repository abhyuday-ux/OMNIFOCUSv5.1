
import React, { useMemo } from 'react';
import { StudySession } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';

interface YearlyHeatmapProps {
  sessions: StudySession[];
}

export const YearlyHeatmap: React.FC<YearlyHeatmapProps> = ({ sessions }) => {
  const { accent } = useTheme();

  // Generate last 365 days
  const days = useMemo(() => {
    const today = new Date();
    const result = [];
    // Start from 52 weeks ago (approx 1 year) to align grid nicely
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364); 
    
    // Adjust start date to previous Sunday for cleaner alignment if needed, 
    // but 365 days is standard. Let's loop 365 days.
    
    for (let i = 0; i < 365; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        result.push(d);
    }
    return result;
  }, []);

  // Map sessions to date strings
  const sessionMap = useMemo(() => {
      const map: Record<string, number> = {};
      sessions.forEach(s => {
          map[s.dateString] = (map[s.dateString] || 0) + s.durationMs;
      });
      return map;
  }, [sessions]);

  // Determine max for scaling color
  const maxDuration = Math.max(...(Object.values(sessionMap) as number[]), 1000 * 60 * 60); // Min max is 1 hour

  const getColor = (ms: number) => {
      if (!ms) return 'bg-slate-800/50';
      const intensity = Math.min(ms / (1000 * 60 * 60 * 4), 1); // Cap at 4 hours for max color
      
      // Tailwind classes don't support dynamic opacity well without arbitrary values or style prop
      // We'll use style prop for precise opacity with the accent color
      return `opacity-${Math.max(20, Math.floor(intensity * 100))}`; 
  };

  const months = useMemo(() => {
      const ms = [];
      let currentMonth = -1;
      days.forEach((d, index) => {
          if (d.getMonth() !== currentMonth && index % 7 === 0) { // Only label roughly start of months
              ms.push({ label: d.toLocaleString('default', { month: 'short' }), index: Math.floor(index / 7) });
              currentMonth = d.getMonth();
          }
      });
      return ms;
  }, [days]);

  // Group by weeks (vertical columns)
  const weeks = useMemo(() => {
      const w = [];
      for (let i = 0; i < days.length; i += 7) {
          w.push(days.slice(i, i + 7));
      }
      return w;
  }, [days]);

  return (
    <div className="w-full overflow-x-auto custom-scrollbar pb-4">
        <div className="min-w-[800px]">
            {/* Month Labels */}
            <div className="flex mb-2 pl-8 text-[10px] text-slate-500 font-bold uppercase tracking-wider relative h-4">
                {months.map((m, i) => (
                    <div key={i} className="absolute" style={{ left: `${m.index * 1.95}%` }}>{m.label}</div>
                ))}
            </div>

            <div className="flex gap-1">
                {/* Day Labels */}
                <div className="flex flex-col gap-1 pr-2 mt-0.5">
                    {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
                        <div key={i} className="h-3 text-[9px] text-slate-600 leading-3">{d}</div>
                    ))}
                </div>

                {/* Heatmap Grid */}
                <div className="flex-1 flex gap-1">
                    {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-1">
                            {week.map((date, dIndex) => {
                                const dateStr = date.toISOString().split('T')[0];
                                const ms = sessionMap[dateStr] || 0;
                                const hours = (ms / 3600000).toFixed(1);
                                
                                return (
                                    <motion.div
                                        key={dateStr}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: wIndex * 0.005 }}
                                        className={`w-3 h-3 rounded-[2px] relative group ${!ms ? 'bg-slate-800/50' : `bg-${accent}-500`}`}
                                        style={ms ? { opacity: 0.2 + (Math.min(ms / (3600000 * 4), 1) * 0.8) } : {}}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 min-w-[120px] bg-slate-900 border border-white/10 p-2 rounded-lg shadow-xl text-center pointer-events-none">
                                            <div className="text-xs font-bold text-white">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</div>
                                            <div className={`text-[10px] text-${accent}-400 font-mono`}>{ms ? `${hours} hours` : 'No study'}</div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-slate-500 font-medium">
                <span>Less</span>
                <div className="w-3 h-3 rounded-[2px] bg-slate-800/50" />
                <div className={`w-3 h-3 rounded-[2px] bg-${accent}-500 opacity-20`} />
                <div className={`w-3 h-3 rounded-[2px] bg-${accent}-500 opacity-50`} />
                <div className={`w-3 h-3 rounded-[2px] bg-${accent}-500 opacity-80`} />
                <div className={`w-3 h-3 rounded-[2px] bg-${accent}-500`} />
                <span>More</span>
            </div>
        </div>
    </div>
  );
};
