
import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor, closestCenter, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskStatus, TaskPriority, Subject, isHexColor } from '../types';
import { Plus, PlayCircle, Trash2, GripVertical, Calendar, CheckCircle2, AlignLeft, Flag, X, Save, Clock } from 'lucide-react';
import { dbService } from '../services/db';
import { motion, AnimatePresence } from 'framer-motion';

interface KanbanBoardProps {
  tasks: Task[];
  subjects: Subject[];
  onTaskUpdate: () => void;
  onStartSession: (subjectId: string) => void;
  selectedDate?: string;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-500' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-amber-500' },
  { id: 'done', title: 'Done', color: 'bg-emerald-500' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, subjects, onTaskUpdate, onStartSession, selectedDate }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAdding, setIsAdding] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState(subjects[0]?.id || '');

  // Default to today if no date selected, or use selected date from parent
  const targetDate = selectedDate || new Date().toISOString().split('T')[0];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    let newStatus: TaskStatus = activeTask.status;
    let overTask = tasks.find(t => t.id === overId);
    
    const columnIds = COLUMNS.map(c => c.id);
    if (columnIds.includes(overId as TaskStatus)) {
        newStatus = overId as TaskStatus;
        overTask = undefined; 
    } else if (overTask) {
        newStatus = overTask.status;
    }

    const hasStatusChanged = activeTask.status !== newStatus;

    if (hasStatusChanged) {
      const updatedTask = { 
        ...activeTask, 
        status: newStatus, 
        updatedAt: Date.now() 
      };
      await dbService.saveTask(updatedTask);
      onTaskUpdate();
    }
  };

  const handleAddTask = async (status: TaskStatus) => {
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
        id: crypto.randomUUID(),
        title: newTaskTitle.trim(),
        status,
        priority: 'medium',
        subjectId: newTaskSubject,
        dateString: targetDate, 
        createdAt: Date.now(),
        updatedAt: Date.now(),
        order: Date.now(), 
    };

    await dbService.saveTask(newTask);
    setIsAdding(null);
    setNewTaskTitle('');
    onTaskUpdate();
  };

  const handleSaveEdit = async (task: Task) => {
      await dbService.saveTask(task);
      setEditingTask(null);
      onTaskUpdate();
  };

  const handleDelete = async (id: string) => {
      if(window.confirm("Delete this task?")) {
        await dbService.deleteTask(id);
        if (editingTask?.id === id) setEditingTask(null);
        onTaskUpdate();
      }
  };

  const tasksByColumn = {
      todo: tasks.filter(t => t.status === 'todo').sort((a, b) => a.order - b.order),
      'in-progress': tasks.filter(t => t.status === 'in-progress').sort((a, b) => a.order - b.order),
      done: tasks.filter(t => t.status === 'done').sort((a, b) => a.order - b.order),
  };

  const activeTaskData = tasks.find(t => t.id === activeId);

  return (
    <div className="h-full w-full relative">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full gap-4 overflow-x-auto overflow-y-hidden pb-2 min-w-[800px] md:min-w-0">
          {COLUMNS.map(col => (
            <KanbanColumn 
                key={col.id}
                col={col}
                tasks={tasksByColumn[col.id]}
                subjects={subjects}
                isAdding={isAdding === col.id}
                setIsAdding={setIsAdding}
                newTaskTitle={newTaskTitle}
                setNewTaskTitle={setNewTaskTitle}
                newTaskSubject={newTaskSubject}
                setNewTaskSubject={setNewTaskSubject}
                onAddTask={handleAddTask}
                onStartSession={onStartSession}
                onEditTask={setEditingTask}
            />
          ))}
        </div>

        <DragOverlay>
            {activeTaskData ? (
                <div className="opacity-90 rotate-2 cursor-grabbing scale-105">
                   <TaskCard task={activeTaskData} subject={subjects.find(s => s.id === activeTaskData.subjectId)} />
                </div>
            ) : null}
        </DragOverlay>
      </DndContext>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTask && (
            <TaskDetailModal 
                task={editingTask} 
                subjects={subjects}
                onClose={() => setEditingTask(null)}
                onSave={handleSaveEdit}
                onDelete={handleDelete}
            />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Sub Components ---

interface KanbanColumnProps {
    col: { id: TaskStatus; title: string; color: string };
    tasks: Task[];
    subjects: Subject[];
    isAdding: boolean;
    setIsAdding: (val: TaskStatus | null) => void;
    newTaskTitle: string;
    setNewTaskTitle: (val: string) => void;
    newTaskSubject: string;
    setNewTaskSubject: (val: string) => void;
    onAddTask: (status: TaskStatus) => void;
    onStartSession: (id: string) => void;
    onEditTask: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
    col, tasks, subjects, isAdding, setIsAdding, 
    newTaskTitle, setNewTaskTitle, newTaskSubject, setNewTaskSubject, 
    onAddTask, onStartSession, onEditTask 
}) => {
    const { setNodeRef } = useDroppable({ id: col.id });

    return (
        <div className="flex-1 flex flex-col bg-slate-900/30 backdrop-blur-sm border border-white/5 rounded-2xl h-full max-h-full min-w-[280px]">
            {/* Header */}
            <div className="p-4 flex justify-between items-center border-b border-white/5 flex-none">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.color}`} />
                    <h3 className="font-bold text-slate-200">{col.title}</h3>
                    <span className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-full border border-white/5">{tasks.length}</span>
                </div>
                <button onClick={() => { setIsAdding(col.id); setNewTaskTitle(''); }} className="text-slate-400 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <Plus size={18} />
                </button>
            </div>

            {/* Droppable Content */}
            <div ref={setNodeRef} className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                
                {isAdding && (
                    <div className="bg-slate-800 p-3 rounded-xl border border-indigo-500/50 shadow-lg mb-3 animate-in fade-in zoom-in-95">
                        <input 
                            autoFocus
                            className="w-full bg-transparent text-sm text-white placeholder-slate-500 mb-3 focus:outline-none"
                            placeholder="Task title..."
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && onAddTask(col.id)}
                        />
                        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
                            {subjects.filter(s => !s.isArchived).map(sub => {
                                const isHex = isHexColor(sub.color);
                                return (
                                    <button 
                                        key={sub.id} 
                                        onClick={() => setNewTaskSubject(sub.id)}
                                        className={`w-4 h-4 rounded-full flex-none ${!isHex ? sub.color : ''} ${newTaskSubject === sub.id ? 'ring-2 ring-white scale-110' : 'opacity-50'}`}
                                        style={isHex ? { backgroundColor: sub.color } : {}}
                                        title={sub.name}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsAdding(null)} className="text-xs text-slate-400 px-2 py-1 hover:text-white">Cancel</button>
                            <button onClick={() => onAddTask(col.id)} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold">Add</button>
                        </div>
                    </div>
                )}

                {tasks.map(task => (
                    <SortableTask 
                        key={task.id} 
                        task={task} 
                        subject={subjects.find(s => s.id === task.subjectId)} 
                        onStartSession={onStartSession}
                        onEdit={onEditTask}
                    />
                ))}
                
                {tasks.length === 0 && !isAdding && (
                    <div className="h-24 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-slate-600/50 text-xs">
                        Drop items here
                    </div>
                )}
                </SortableContext>
            </div>
        </div>
    );
};

interface SortableTaskProps {
    task: Task;
    subject?: Subject;
    onStartSession: (id: string) => void;
    onEdit: (task: Task) => void;
}

const SortableTask: React.FC<SortableTaskProps> = ({ task, subject, onStartSession, onEdit }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="touch-none">
            <TaskCard 
                task={task} 
                subject={subject} 
                dragHandleProps={{...listeners, ...attributes}} 
                onStartSession={onStartSession}
                onEdit={onEdit}
            />
        </div>
    );
};

interface TaskCardProps {
    task: Task;
    subject?: Subject;
    dragHandleProps?: any;
    onStartSession?: (id: string) => void;
    onEdit?: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, subject, dragHandleProps, onStartSession, onEdit }) => {
    const color = subject?.color || '#64748b';
    const isHex = isHexColor(color);
    const isDone = task.status === 'done';

    const priorityColors = {
        low: 'text-slate-400 bg-slate-500/10',
        medium: 'text-amber-400 bg-amber-500/10',
        high: 'text-rose-400 bg-rose-500/10'
    };

    return (
        <div 
            onClick={() => onEdit && onEdit(task)}
            className={`
            p-3.5 rounded-xl border shadow-sm group relative flex flex-col gap-2 transition-all cursor-pointer
            ${isDone ? 'bg-slate-800/40 border-slate-700/30 opacity-75' : 'bg-slate-800 hover:bg-slate-750 border-white/5 hover:border-white/10 hover:shadow-md'}
        `}>
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
                            <div 
                                className={`w-1.5 h-1.5 rounded-full ${!isHex ? color : ''}`} 
                                style={isHex ? { backgroundColor: color } : {}}
                            />
                            <span className="text-slate-300 font-medium truncate max-w-[80px]">
                                {subject?.name || 'Unknown'}
                            </span>
                        </div>
                        {task.priority && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${priorityColors[task.priority]}`}>
                                {task.priority}
                            </span>
                        )}
                    </div>
                    
                    <p className={`text-sm font-medium leading-snug mb-1 ${isDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                        {task.title}
                    </p>
                    
                    {task.description && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                            <AlignLeft size={10} />
                            <span className="truncate max-w-full">{task.description}</span>
                        </div>
                    )}

                    {task.dateString && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                            <Calendar size={10} />
                            {new Date(task.dateString).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                        </span>
                    )}
                </div>
                
                <div 
                    {...dragHandleProps}
                    className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing p-1 -mr-1 -mt-1"
                    onClick={(e) => e.stopPropagation()} 
                >
                    <GripVertical size={14} />
                </div>
            </div>
            
            {onStartSession && !isDone && (
                <div className="flex justify-end pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onStartSession(task.subjectId); }}
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20"
                    >
                        <PlayCircle size={12} /> Focus
                    </button>
                </div>
            )}
            
            {isDone && (
                <div className="absolute top-3 right-3 text-emerald-500">
                    <CheckCircle2 size={16} />
                </div>
            )}
        </div>
    );
};

// --- Task Modal ---

interface TaskDetailModalProps {
    task: Task;
    subjects: Subject[];
    onClose: () => void;
    onSave: (task: Task) => void;
    onDelete: (id: string) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, subjects, onClose, onSave, onDelete }) => {
    const [editedTask, setEditedTask] = useState<Task>({ ...task });

    const handleSave = () => {
        onSave({ ...editedTask, updatedAt: Date.now() });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
            >
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h3 className="font-bold text-lg text-white">Edit Task</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Title</label>
                        <input 
                            value={editedTask.title}
                            onChange={e => setEditedTask({...editedTask, title: e.target.value})}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="What needs to be done?"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Description</label>
                        <textarea 
                            value={editedTask.description || ''}
                            onChange={e => setEditedTask({...editedTask, description: e.target.value})}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors min-h-[100px] resize-none"
                            placeholder="Add details, notes, or subtasks..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Subject */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Subject</label>
                            <select 
                                value={editedTask.subjectId}
                                onChange={e => setEditedTask({...editedTask, subjectId: e.target.value})}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                            >
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Due Date</label>
                            <input 
                                type="date"
                                value={editedTask.dateString || ''}
                                onChange={e => setEditedTask({...editedTask, dateString: e.target.value})}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Status */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Status</label>
                            <div className="flex bg-slate-950 rounded-xl p-1 border border-white/5">
                                {COLUMNS.map(col => (
                                    <button
                                        key={col.id}
                                        onClick={() => setEditedTask({...editedTask, status: col.id})}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${editedTask.status === col.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {col.title}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Priority</label>
                            <div className="flex bg-slate-950 rounded-xl p-1 border border-white/5">
                                {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setEditedTask({...editedTask, priority: p})}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-all 
                                            ${editedTask.priority === p 
                                                ? (p === 'high' ? 'bg-rose-500 text-white' : p === 'medium' ? 'bg-amber-500 text-white' : 'bg-slate-600 text-white')
                                                : 'text-slate-500 hover:text-slate-300'
                                            }
                                        `}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <button 
                        onClick={() => onDelete(task.id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
