
import React from 'react';
import { Exam, Subject, isHexColor } from '../types';
import { Calendar, Trash2, BookOpen, AlertCircle } from 'lucide-react';

interface ExamListProps {
  exams: Exam[];
  subjects: Subject[];
  onDelete?: (id: string) => void;
  variant?: 'default' | 'compact';
}

export const ExamList: React.FC<ExamListProps> = ({ exams, subjects, onDelete, variant = 'default' }) => {
  // sort by date
  const sorted = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length === 0) {
      return (
          <div className={`flex flex-col items-center justify-center text-slate-500 text-xs text-center border-2 border-dashed border-white/5 rounded-xl ${variant === 'compact' ? 'h-32 p-2' : 'h-40 p-4'}`}>
              <BookOpen size={20} className="mb-2 opacity-50" />
              <p>No upcoming exams.</p>
          </div>
      )
  }

  return (
    <div className="space-y-3">
        {sorted.map(exam => {
            const subject = subjects.find(s => s.id === exam.subjectId);
            const daysLeft = Math.ceil((new Date(exam.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isClose = daysLeft <= 3 && daysLeft >= 0;
            const isPast = daysLeft < 0;
            const color = subject?.color || '#64748b';
            const isHex = isHexColor(color);

            if (variant === 'compact') {
                return (
                    <div key={exam.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-2 group hover:border-white/10 transition-colors relative">
                        <div className="flex justify-between items-start">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${isClose ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'}`}>
                                {isPast ? 'Done' : daysLeft === 0 ? 'Today' : `${daysLeft} days`}
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${!isHex ? color : ''}`} style={isHex ? { backgroundColor: color } : {}} />
                                <span className="text-[10px] text-slate-400 truncate max-w-[120px] uppercase font-bold tracking-wide">{subject?.name}</span>
                            </div>
                            <h4 className="text-sm font-semibold text-slate-200 leading-tight">{exam.title}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Calendar size={10} /> {new Date(exam.date).toLocaleDateString()}
                        </div>
                        {onDelete && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(exam.id); }}
                                className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                )
            }

            return (
                <div key={exam.id} className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-none ${isClose ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-800 text-slate-400'}`}>
                            {isPast ? <AlertCircle size={20}/> : daysLeft}
                            {!isPast && <span className="text-[10px] font-normal ml-0.5">d</span>}
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-slate-200 truncate">{exam.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${!isHex ? color : ''}`} style={isHex ? { backgroundColor: color } : {}} />
                                    <span className={!isHex ? color.replace('bg-', 'text-') : ''} style={isHex ? { color } : {}}>{subject?.name}</span>
                                </span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(exam.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</span>
                            </div>
                        </div>
                    </div>
                    {onDelete && (
                        <button onClick={() => onDelete(exam.id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            );
        })}
    </div>
  );
};
