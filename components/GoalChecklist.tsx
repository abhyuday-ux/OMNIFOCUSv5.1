
import React, { useState } from 'react';
import { CheckCircle2, Circle, Target, Plus, Trash2, Clock, PlayCircle } from 'lucide-react';
import { Task, TaskStatus } from '../types';
import { dbService } from '../services/db';
import { useTheme } from '../contexts/ThemeContext';

interface GoalChecklistProps {
  dailyTotalMs: number;
  tasks: Task[];
  onTaskUpdate: () => void;
  selectedDate: string;
  targetHours: number;
  variant?: 'full' | 'compact';
}

export const GoalChecklist: React.FC<GoalChecklistProps> = ({ 
    dailyTotalMs, 
    tasks, 
    onTaskUpdate,
    selectedDate,
    targetHours,
    variant = 'full'
}) => {
  const [newTaskText, setNewTaskText] = useState('');
  const { accent } = useTheme();
  
  const currentHours = dailyTotalMs / (1000 * 60 * 60);
  const progressPercent = Math.min((currentHours / targetHours) * 100, 100);
  const isTimeGoalMet = currentHours >= targetHours;
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const handleAddTask = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTaskText.trim()) return;

      const newTask: Task = {
          id: crypto.randomUUID(),
          title: newTaskText.trim(),
          status: 'todo',
          priority: 'medium',
          dateString: selectedDate, // Assign to selected date for sync
          subjectId: 'misc', 
          createdAt: Date.now(),
          updatedAt: Date.now(),
          order: Date.now()
      };

      await dbService.saveTask(newTask);
      setNewTaskText('');
      onTaskUpdate();
  };

  const toggleTask = async (task: Task) => {
      // If done -> todo. If todo/in-progress -> done.
      const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
      await dbService.saveTask({ ...task, status: newStatus, updatedAt: Date.now() });
      onTaskUpdate();
  };

  const deleteTask = async (id: string) => {
      await dbService.deleteTask(id);
      onTaskUpdate();
  };

  // Sort: Done items at bottom, then by order/creation
  const sortedTasks = [...tasks].sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      return b.createdAt - a.createdAt;
  });

  const completedCount = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;

  if (variant === 'compact') {
      return (
          <div className="w-full bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 overflow-hidden flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Target size={14} /> Goals
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    {(progressPercent).toFixed(0)}% Time
                  </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-slate-700/30 rounded-full overflow-hidden mb-4">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isTimeGoalMet ? 'bg-emerald-500' : `bg-${accent}-500`}`}
                    style={{ width: `${progressPercent}%` }} 
                />
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 custom-scrollbar">
                  {sortedTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-left w-full group hover:bg-white/5 p-1.5 rounded-lg transition-colors">
                          <button onClick={() => toggleTask(task)} className="flex-none">
                             {task.status === 'done' ? (
                                 <CheckCircle2 size={14} className="text-emerald-500" />
                             ) : (
                                 <Circle size={14} className={`text-slate-500 group-hover:text-${accent}-400`} />
                             )}
                          </button>
                          <span className={`text-sm truncate transition-all ${task.status === 'done' ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
                              {task.title}
                          </span>
                      </div>
                  ))}
                  {sortedTasks.length === 0 && (
                      <div className="text-xs text-slate-600 italic text-center py-2">No tasks for today</div>
                  )}
              </div>
              
              {/* Quick Add */}
               <form onSubmit={handleAddTask} className="mt-2 relative">
                <input 
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="+ New Goal"
                    className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-3 pr-8 text-xs text-white focus:outline-none focus:bg-white/10 placeholder:text-slate-600"
                />
               </form>
          </div>
      )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <Target className={`text-${accent}-400`} size={20} />
            <h3 className="text-slate-200 font-bold">Goals for {isToday ? 'Today' : selectedDate}</h3>
        </div>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {/* Main Time Goal */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-slate-300">Daily Study Target</span>
                <span className="text-xs font-mono text-slate-400">
                    {currentHours.toFixed(1)} / {targetHours.toFixed(1)} hrs
                </span>
            </div>
            <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isTimeGoalMet ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : `bg-${accent}-500 shadow-[0_0_10px_rgba(var(--color-${accent}-500),0.5)]`}`}
                    style={{ width: `${progressPercent}%` }} 
                />
            </div>
        </div>

        {/* Task Progress */}
        <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Task List</span>
            <span className="text-xs font-mono text-slate-400">{completedCount}/{totalTasks} Done</span>
        </div>

        {/* Custom Task List */}
        <div className="space-y-2">
            {tasks.length === 0 ? (
                <p className="text-center text-slate-600 text-xs italic py-4">No goals set for this day.</p>
            ) : (
                sortedTasks.map(task => {
                    const isCompleted = task.status === 'done';
                    return (
                        <div 
                            key={task.id} 
                            className={`group flex items-center justify-between p-3 rounded-xl transition-all border ${isCompleted ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                        >
                            <button 
                                onClick={() => toggleTask(task)}
                                className="flex items-center gap-3 flex-1 text-left"
                            >
                                {isCompleted ? (
                                    <CheckCircle2 size={20} className="text-emerald-500 flex-none" />
                                ) : (
                                    <Circle size={20} className={`text-slate-500 group-hover:text-${accent}-400 flex-none`} />
                                )}
                                <div className="flex flex-col">
                                    <span className={`text-sm transition-all ${isCompleted ? 'text-emerald-200/50 line-through' : 'text-slate-300'}`}>
                                        {task.title}
                                    </span>
                                    {task.status === 'in-progress' && !isCompleted && (
                                        <span className="text-[10px] text-amber-400 flex items-center gap-1 font-bold uppercase tracking-wider mt-0.5">
                                            <Clock size={10} /> In Progress
                                        </span>
                                    )}
                                </div>
                            </button>
                            
                            <button 
                                onClick={() => deleteTask(task.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    );
                })
            )}
        </div>

        {/* Custom Goal Input */}
        <form onSubmit={handleAddTask} className="relative mt-2">
            <input 
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Add a new goal..."
                className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-${accent}-500/50 focus:bg-white/10 transition-colors placeholder:text-slate-500`}
            />
            <button 
                type="submit"
                disabled={!newTaskText.trim()}
                className={`absolute right-2 top-2 p-1.5 bg-${accent}-600 hover:bg-${accent}-500 text-white rounded-lg disabled:opacity-0 transition-all shadow-lg shadow-${accent}-500/20`}
            >
                <Plus size={16} />
            </button>
        </form>
      </div>
    </div>
  );
};
