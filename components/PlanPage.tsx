
import React, { useState } from 'react';
import { StudySession, Subject, DailyGoal, Exam, Task } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Layers, GraduationCap, Flame, Target, Trophy, Clock, TrendingUp, BookOpen, ChevronRight, Kanban } from 'lucide-react';
import { HeatmapCalendar } from './HeatmapCalendar';
import { GoalChecklist } from './GoalChecklist';
import { YearlyHeatmap } from './YearlyHeatmap';
import { KanbanBoard } from './KanbanBoard';

interface PlanPageProps {
  sessions: StudySession[];
  subjects: Subject[];
  dailyGoals: DailyGoal[];
  exams: Exam[];
  tasks: Task[]; // New prop
  onGoalUpdate: () => void;
  onTaskUpdate: () => void; // New prop
  onStartSession: (subjectId: string) => void;
  targetHours: number;
}

type ViewMode = 'calendar' | 'tasks' | 'year';

export const PlanPage: React.FC<PlanPageProps> = ({
  sessions,
  subjects,
  dailyGoals,
  exams,
  tasks,
  onGoalUpdate,
  onTaskUpdate,
  onStartSession,
  targetHours
}) => {
  const { accent } = useTheme();
  const [view, setView] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Derived Daily Data
  const selectedDateSessions = sessions.filter(s => s.dateString === selectedDate);
  const dailyTotalMs = selectedDateSessions.reduce((acc, curr) => acc + curr.durationMs, 0);

  // Derived Annual Data
  const totalYearHours = sessions.reduce((acc, s) => acc + s.durationMs, 0) / 3600000;
  const activeDays = new Set(sessions.map(s => s.dateString)).size;
  const yearlyAverage = activeDays > 0 ? (totalYearHours / activeDays) : 0;

  // Upcoming Exams
  const upcomingExams = exams
    .filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  return (
    <div className="flex flex-col h-full bg-slate-900/0">
      
      {/* Immersive Header */}
      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 flex-none p-6 pb-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <Calendar size={28} className={`text-${accent}-400`} />
                Planner
            </h2>
            <p className="text-slate-400 text-sm font-medium">Master your schedule, own your time.</p>
          </div>
          
          <div className="bg-white/5 p-1 rounded-xl border border-white/5 flex relative backdrop-blur-md shadow-lg overflow-x-auto no-scrollbar max-w-full">
              {['calendar', 'tasks', 'year'].map((tab) => {
                  const isActive = view === tab;
                  return (
                      <button
                          key={tab}
                          onClick={() => setView(tab as ViewMode)}
                          className={`relative px-5 py-2 rounded-lg text-xs font-bold transition-all z-10 flex items-center gap-2 whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                          {isActive && (
                              <motion.div 
                                  layoutId="planTab"
                                  className={`absolute inset-0 bg-${accent}-600 rounded-lg shadow-lg`}
                                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                          )}
                          <span className="relative z-10 flex items-center gap-2 uppercase tracking-wide">
                              {tab === 'calendar' ? 'Schedule' : tab === 'tasks' ? 'Tasks' : 'Yearly Insights'}
                          </span>
                      </button>
                  )
              })}
          </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'calendar' && (
            <motion.div 
                key="calendar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-0 overflow-y-auto custom-scrollbar"
            >
                {/* Left Column: Calendar Area */}
                <div className="lg:col-span-8 flex flex-col p-6 pt-0 border-r border-white/5">
                    {/* Calendar Container */}
                    <div className="bg-transparent rounded-3xl pt-2 pb-6 relative overflow-hidden flex-1">
                        <HeatmapCalendar 
                            sessions={sessions} 
                            currentDate={calendarMonth} 
                            selectedDate={selectedDate} 
                            onDateSelect={setSelectedDate} 
                            onPrevMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} 
                            onNextMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} 
                        />
                    </div>
                    
                    {/* Upcoming Exams Row */}
                    <div className="mt-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><GraduationCap size={16}/> Upcoming Milestones</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {upcomingExams.length > 0 ? (
                                upcomingExams.map(exam => {
                                    const subject = subjects.find(s => s.id === exam.subjectId);
                                    const daysLeft = Math.ceil((new Date(exam.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                    return (
                                        <div key={exam.id} className="bg-white/5 border border-white/5 hover:border-white/10 p-3 rounded-xl transition-all hover:bg-white/10 group flex items-center gap-3">
                                            <div className={`p-2.5 rounded-lg ${subject?.color.startsWith('#') ? 'bg-white/10 text-white' : subject?.color.replace('bg-', 'text-').replace('500', '400') + ' bg-opacity-10'}`} style={subject?.color.startsWith('#') ? { color: subject.color } : {}}>
                                                <Target size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-200 text-sm truncate">{exam.title}</h4>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">{new Date(exam.date).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${daysLeft <= 3 ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                                {daysLeft === 0 ? 'Today' : daysLeft < 0 ? 'Done' : `${daysLeft}d`}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 py-6 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-xl">
                                    <p className="text-xs font-medium">No upcoming exams.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Goals Side Panel */}
                <div className="lg:col-span-4 h-full bg-slate-900/20 backdrop-blur-sm border-l border-white/5 p-6">
                    <GoalChecklist 
                        dailyTotalMs={dailyTotalMs} 
                        goals={dailyGoals} 
                        onGoalUpdate={onGoalUpdate} 
                        selectedDate={selectedDate} 
                        targetHours={targetHours} 
                    />
                </div>
            </motion.div>
        )}

        {view === 'tasks' && (
            <motion.div
                key="tasks"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-h-0 overflow-hidden px-4 md:px-6 pb-6"
            >
                <KanbanBoard 
                    tasks={tasks}
                    subjects={subjects}
                    onTaskUpdate={onTaskUpdate}
                    onStartSession={onStartSession}
                />
            </motion.div>
        )}

        {view === 'year' && (
            <motion.div 
                key="year"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 space-y-8 overflow-y-auto custom-scrollbar p-6 pt-2"
            >
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Active Days', value: activeDays, icon: Calendar, color: 'indigo' },
                        { label: 'Total Hours', value: totalYearHours.toFixed(1), icon: Clock, color: 'emerald' },
                        { label: 'Daily Average', value: `${yearlyAverage.toFixed(1)}h`, icon: TrendingUp, color: 'blue' },
                        { label: 'Consistency', value: `${Math.round((activeDays / 365) * 100)}%`, icon: Trophy, color: 'amber' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 relative overflow-hidden group hover:bg-white/10 transition-colors">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                    <stat.icon className={`text-${stat.color}-400 opacity-60`} size={16} />
                                </div>
                                <h3 className="text-3xl font-mono font-bold text-white tracking-tighter">{stat.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Heatmap Card */}
                <div className="flex-1 bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <YearlyHeatmap sessions={sessions} />
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
