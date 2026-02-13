
import React, { useMemo } from 'react';
import { StudySession } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';

interface YearlyHeatmapProps {
  sessions: StudySession[];
}

export const YearlyHeatmap: React.FC<YearlyHeatmapProps> = ({ sessions }) => {
  const { accent } = useTheme();

  // 1. Group sessions by date
  const sessionMap = useMemo(() => {
      const map: Record<string, number> = {};
      sessions.forEach(s => {
          map[s.dateString] = (map[s.dateString] || 0) + s.durationMs;
      });
      return map;
  }, [sessions]);

  // 2. Generate Months (Last 12 months)
  const months = useMemo(() => {
      const result = [];
      const today = new Date();
      // Start from 11 months ago to include current month as the last one
      for (let i = 11; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          result.push(d);
      }
      return result;
  }, []);

  return (
    <div className="w-full">
        {/* Responsive Grid for Months */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {months.map((monthDate, i) => (
                <MonthGrid 
                    key={i} 
                    monthDate={monthDate} 
                    sessionMap={sessionMap} 
                    accent={accent} 
                    index={i}
                />
            ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-8 text-[10px] text-slate-500 font-medium px-2">
            <span>Less</span>
            <div className="w-3 h-3 rounded-[2px] bg-slate-800/50" />
            <div className={`w-3 h-3 rounded-[2px] bg-${accent}-500`} style={{ opacity: 0.2 }} />
            <div className={`w-3 h-3 rounded-[2px] bg-${accent}-500`} style={{ opacity: 0.5 }} />
            <div className={`w-3 h-3 rounded-[2px] bg-${accent}-500`} style={{ opacity: 0.8 }} />
            <div className={`w-3 h-3 rounded-[2px] bg-${accent}-500`} />
            <span>More</span>
        </div>
    </div>
  );
};

const MonthGrid = ({ monthDate, sessionMap, accent, index }: any) => {
    const days = useMemo(() => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        // Day 0 of next month gives last day of current month
        const numDays = new Date(year, month + 1, 0).getDate();
        // Day of week for the 1st of the month
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
        
        const dayArray = [];
        // Padding slots
        for(let i=0; i<firstDayOfWeek; i++) dayArray.push(null);
        // Actual days
        for(let i=1; i<=numDays; i++) {
            dayArray.push(new Date(year, month, i));
        }
        return dayArray;
    }, [monthDate]);

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group"
        >
            <h3 className="text-xs font-bold text-slate-300 mb-3 capitalize flex justify-between items-center">
                {monthDate.toLocaleString('default', { month: 'long' })}
                <span className="text-[10px] text-slate-600 font-mono">{monthDate.getFullYear()}</span>
            </h3>
            
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1.5">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} className="text-center text-[9px] text-slate-600 font-bold">{d}</div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((date: Date | null, i: number) => {
                    if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
                    
                    const dateStr = date.toISOString().split('T')[0];
                    const ms = sessionMap[dateStr] || 0;
                    const hours = (ms / 3600000).toFixed(1);
                    // Intensity calculation: Cap at 4 hours for full opacity
                    const intensity = Math.min(ms / (1000 * 60 * 60 * 4), 1); 

                    return (
                        <div 
                            key={dateStr}
                            className={`
                                aspect-square rounded-[3px] relative group/cell transition-all duration-300
                                ${!ms ? 'bg-slate-800/30' : `bg-${accent}-500 shadow-[0_0_5px_rgba(0,0,0,0.2)]`}
                            `}
                            style={ms ? { opacity: 0.2 + (intensity * 0.8) } : {}}
                        >
                             {/* Tooltip */}
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/cell:block z-50 min-w-[max-content] bg-slate-900 border border-white/10 px-2 py-1 rounded-md shadow-xl text-center pointer-events-none transform scale-100 origin-bottom">
                                <div className="text-[10px] font-bold text-white whitespace-nowrap">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</div>
                                <div className={`text-[9px] text-${accent}-400 font-mono font-bold`}>{ms ? `${hours}h` : '0h'}</div>
                                {/* Triangle Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                            </div>
                        </div>
                    )
                })}
            </div>
        </motion.div>
    )
}
