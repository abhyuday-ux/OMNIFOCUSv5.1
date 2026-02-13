
import React, { useState, useEffect } from 'react';
import { StudySession, Subject, Exam, Task } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, GraduationCap, Target, Trophy, Clock, TrendingUp, Plus, X, Save } from 'lucide-react';
import { HeatmapCalendar } from './HeatmapCalendar';
import { GoalChecklist } from './GoalChecklist';
import { YearlyHeatmap } from './YearlyHeatmap';
import { KanbanBoard } from './KanbanBoard';
import { ExamList } from './ExamList';
import { dbService } from '../services/db';

interface PlanPageProps {
  sessions: StudySession[];
  subjects: Subject[];
  exams: Exam[];
  tasks: Task[];
  onTaskUpdate: () => void;
  onStartSession: (subjectId: string) => void;
  targetHours: number;
}

type ViewMode = 'calendar' | 'tasks' | 'year';

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const PlanPage: React.FC<PlanPageProps> = ({
  sessions,
  subjects,
  exams,
  tasks,
  onTaskUpdate,
  onStartSession,
  targetHours
}) => {
  const { accent } = useTheme();
  const [view, setView] = useState<ViewMode>('calendar');
  
  // Date State
  const [now, setNow] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  // Exam Modal State
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamSubject, setNewExamSubject] = useState(subjects[0]?.id || '');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamTopics, setNewExamTopics] = useState('');

  // Auto-refresh date at midnight
  useEffect(() => {
      const checkDate = () => {
          const currentNow = new Date();
          const currentTodayStr = getLocalDateString(currentNow);
          const stateTodayStr = getLocalDateString(now);

          if (currentTodayStr !== stateTodayStr) {
              setNow(currentNow);
              // Optionally follow the day if user was on "today"
              if (selectedDate === stateTodayStr) {
                  setSelectedDate(currentTodayStr);
              }
          }
      };

      const interval = setInterval(checkDate, 60000); // Check every minute
      return () => clearInterval(interval);
  }, [now, selectedDate]);

  // Derived Daily Data
  const selectedDateSessions = sessions.filter(s => s.dateString === selectedDate);
  const dailyTotalMs = selectedDateSessions.reduce((acc, curr) => acc + curr.durationMs, 0);

  // Filter tasks for the selected date for the Checklist view
  const todaysTasks = tasks.filter(t => t.dateString === selectedDate);

  // Derived Annual Data
  const totalYearHours = sessions.reduce((acc, s) => acc + s.durationMs, 0) / 3600000;
  const activeDays = new Set(sessions.map(s => s.dateString)).size;
  const yearlyAverage = activeDays > 0 ? (totalYearHours / activeDays) : 0;

  // Upcoming Exams
  const upcomingExams = exams
    .filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const handleAddExam = async () => {
      if (!newExamTitle || !newExamDate) return;

      const exam: Exam = {
          id: crypto.randomUUID(),
          title: newExamTitle,
          subjectId: newExamSubject,
          date: newExamDate,
          topics: newExamTopics
      };

      await dbService.saveExam(exam);
      window.dispatchEvent(new Event('omni_sync_complete'));
      
      setIsAddingExam(false);
      setNewExamTitle('');
      setNewExamTopics('');
  };

  const handleDeleteExam = async (id: string) => {
      if(confirm("Delete this exam?")) {
          await dbService.deleteExam(id);
          window.dispatchEvent(new Event('omni_sync_complete'));
      }
  };

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
                            today={now}
                            selectedDate={selectedDate} 
                            onDateSelect={setSelectedDate} 
                            onPrevMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} 
                            onNextMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} 
                        />
                    </div>
                    
                    {/* Upcoming Exams Row */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><GraduationCap size={16}/> Upcoming Milestones</h3>
                            <button 
                                onClick={() => setIsAddingExam(true)}
                                className="flex items-center gap-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 px-2 py-1 rounded-lg transition-colors border border-white/5"
                            >
                                <Plus size={12} /> Add Exam
                            </button>
                        </div>
                        <ExamList exams={upcomingExams} subjects={subjects} onDelete={handleDeleteExam} />
                    </div>
                </div>

                {/* Right Column: Goals Side Panel */}
                <div className="lg:col-span-4 h-full bg-slate-900/20 backdrop-blur-sm border-l border-white/5 p-6">
                    <GoalChecklist 
                        dailyTotalMs={dailyTotalMs} 
                        tasks={todaysTasks}
                        onTaskUpdate={onTaskUpdate} 
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
                    tasks={tasks} // Pass ALL tasks to Kanban for project view
                    subjects={subjects}
                    onTaskUpdate={onTaskUpdate}
                    onStartSession={onStartSession}
                    selectedDate={selectedDate} // New tasks will default to this date for sync
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
                <div className="w-full bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <YearlyHeatmap sessions={sessions} />
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Add Exam Modal */}
      <AnimatePresence>
        {isAddingExam && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Add Exam</h3>
                        <button onClick={() => setIsAddingExam(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <input 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                            placeholder="Exam Title (e.g. Midterm)"
                            value={newExamTitle}
                            onChange={e => setNewExamTitle(e.target.value)}
                            autoFocus
                        />
                        <select 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                            value={newExamSubject}
                            onChange={e => setNewExamSubject(e.target.value)}
                        >
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input 
                            type="date"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                            value={newExamDate}
                            onChange={e => setNewExamDate(e.target.value)}
                        />
                        <textarea 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[80px]"
                            placeholder="Topics to study..."
                            value={newExamTopics}
                            onChange={e => setNewExamTopics(e.target.value)}
                        />
                        
                        <button 
                            onClick={handleAddExam}
                            disabled={!newExamTitle || !newExamDate}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                        >
                            Save Exam
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};
