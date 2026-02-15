
import React, { useRef, useState, useEffect } from 'react';
import { StudySession, Subject, isHexColor } from '../types';

interface DailyTimelineProps {
  sessions: StudySession[];
  subjects: Subject[];
  className?: string;
  onSessionClick?: (session: StudySession) => void;
  onEmptyClick?: (hour: number, minute: number) => void;
}

export const DailyTimeline: React.FC<DailyTimelineProps> = ({ 
    sessions, 
    subjects, 
    className = "h-[600px]",
    onSessionClick,
    onEmptyClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
      const interval = setInterval(() => setCurrentTime(new Date()), 60000);
      return () => clearInterval(interval);
  }, []);

  const getSubjectColor = (id: string) => subjects.find(s => s.id === id)?.color || '#64748b';

  // Sort sessions by start time to handle stacking order if needed
  const sortedSessions = [...sessions].sort((a, b) => a.startTime - b.startTime);

  const hours = Array.from({ length: 25 }, (_, i) => i); // 0 to 24

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onEmptyClick || !containerRef.current) return;
      
      // Prevent triggering when clicking on a session block
      if ((e.target as HTMLElement).closest('.session-block')) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const percentage = clickY / rect.height;
      
      const totalMinutes = 24 * 60;
      const clickedMinutes = Math.max(0, Math.min(totalMinutes, percentage * totalMinutes));
      
      // Round to nearest 15 minutes
      const roundedMinutes = Math.round(clickedMinutes / 15) * 15;
      const hour = Math.floor(roundedMinutes / 60);
      const minute = roundedMinutes % 60;

      onEmptyClick(hour, minute);
  };

  // Check if the displayed day matches current system day
  const isToday = sessions.length > 0 
    ? new Date().toDateString() === new Date(sessions[0].startTime).toDateString()
    : true; // Default to showing current time line if uncertain, typically controlled by parent context but this is a rough heuristic

  // Calculate current time position
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const currentTimePercent = (currentMinutes / 1440) * 100;

  return (
    <div className={`w-full relative flex ${className} select-none`}>
        {/* Time Axis */}
        <div className="flex flex-col justify-between h-full pr-3 text-[10px] text-slate-500 font-mono font-medium w-10 flex-none text-right py-2 -mt-2">
            {hours.map((h) => (
                <div key={h} className="relative flex items-center justify-end h-0">
                   <span className="leading-none transform -translate-y-1/2">
                     {h.toString().padStart(2, '0')}:00
                   </span>
                </div>
            ))}
        </div>

        {/* Timeline Track */}
        <div 
            ref={containerRef}
            onClick={handleBackgroundClick}
            className="relative flex-1 h-full border-l border-white/5 bg-white/[0.01] rounded-r-xl overflow-hidden cursor-crosshair group/track"
        >
            {/* Horizontal Grid Lines */}
            {hours.map((h) => (
                <div 
                    key={h} 
                    className="absolute w-full border-t border-white/5"
                    style={{ top: `${(h / 24) * 100}%` }} 
                />
            ))}
            
            {/* 30-min Sub-grid (visible on hover) */}
            {hours.slice(0, 24).map((h) => (
                <div 
                    key={`half-${h}`} 
                    className="absolute w-full border-t border-white/5 border-dashed opacity-0 group-hover/track:opacity-30 transition-opacity pointer-events-none"
                    style={{ top: `${((h + 0.5) / 24) * 100}%` }} 
                />
            ))}

            {/* Session Blocks */}
            {sortedSessions.map((session) => {
                const startDate = new Date(session.startTime);
                const startHour = startDate.getHours();
                const startMin = startDate.getMinutes();
                
                const startTotalMinutes = (startHour * 60) + startMin;
                const durationMinutes = session.durationMs / 60000;
                
                const topPercent = (startTotalMinutes / 1440) * 100;
                const heightPercent = (durationMinutes / 1440) * 100;
                
                // Min height of ~15 mins (approx 1%) for visibility
                const safeHeight = Math.max(heightPercent, 1.04); 

                const subject = subjects.find(s => s.id === session.subjectId);
                const subjectColor = subject?.color || '#64748b';
                const isHex = isHexColor(subjectColor);

                return (
                    <div
                        key={session.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSessionClick && onSessionClick(session);
                        }}
                        className={`
                            session-block absolute left-1 right-1 rounded-[4px] border transition-all cursor-pointer shadow-sm overflow-hidden
                            hover:z-20 hover:shadow-lg hover:brightness-110 hover:scale-[1.01]
                            ${!isHex ? subjectColor : ''}
                        `}
                        style={{
                            top: `${topPercent}%`,
                            height: `${safeHeight}%`,
                            backgroundColor: isHex ? `${subjectColor}E6` : undefined, // 90% opacity hex
                            borderColor: isHex ? subjectColor : 'transparent',
                            borderWidth: '1px'
                        }}
                    >
                      {/* Inner Content (visible if tall enough) */}
                      {safeHeight > 2 && (
                          <div className="px-2 py-0.5 text-[10px] font-bold text-white truncate drop-shadow-md">
                              {subject?.name}
                          </div>
                      )}
                      
                      {/* Tooltip on Hover */}
                      <div className="opacity-0 hover:opacity-100 absolute left-full ml-2 top-0 bg-slate-900 border border-white/10 text-xs p-2 rounded-lg z-50 whitespace-nowrap pointer-events-none shadow-xl">
                        <div className="font-bold text-slate-200 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${!isHex ? subjectColor : ''}`} style={isHex ? {backgroundColor: subjectColor} : {}} />
                            {subject?.name}
                        </div>
                        <div className="text-slate-400 mt-1 font-mono">
                             {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                             {' - '}
                             {new Date(session.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="text-slate-500 text-[10px] font-bold uppercase mt-1">
                            {durationMinutes.toFixed(0)} min
                        </div>
                      </div>
                    </div>
                );
            })}
            
            {/* Current Time Indicator */}
            {isToday && (
               <div 
                 className="absolute w-full flex items-center z-30 pointer-events-none group"
                 style={{ top: `${currentTimePercent}%` }}
               >
                 <div className="w-full border-t border-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
                 <div className="absolute -left-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                 <div className="absolute right-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                     {currentTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                 </div>
               </div>
            )}
        </div>
    </div>
  );
};
