
import React, { useState, useEffect } from 'react';
import { StudySession, Subject, isHexColor } from '../types';
import { X, Clock, Calendar, Save, Trash2, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getLocalDateString } from '../types';

interface SessionManagerProps {
  session?: StudySession | null; // If present, edit mode. Else, add mode.
  subjects: Subject[];
  onSave: (session: StudySession) => void;
  onDelete?: (id: string) => void; // Only available in edit mode
  onClose: () => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ 
  session, 
  subjects, 
  onSave, 
  onDelete, 
  onClose 
}) => {
  const { accent } = useTheme();
  
  // Determine if we are editing an existing session or creating a new one (even if pre-filled)
  const isEditing = !!(session && session.id);

  // Form State
  const [subjectId, setSubjectId] = useState(session?.subjectId || subjects[0]?.id || '');
  const [date, setDate] = useState(session?.dateString || getLocalDateString());
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  
  // Time state initialization
  const [startTime, setStartTime] = useState(() => {
      if (session) {
          const d = new Date(session.startTime);
          return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      }
      return '09:00';
  });
  
  const [endTime, setEndTime] = useState(() => {
      if (session) {
          const d = new Date(session.endTime);
          return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      }
      return '10:00';
  });

  const handleSave = () => {
      // Construct timestamps
      const startDateTime = new Date(`${date}T${startTime}`);
      let endDateTime = new Date(`${date}T${endTime}`);
      
      let startTs = startDateTime.getTime();
      let endTs = endDateTime.getTime();

      // Handle overnight sessions (end time < start time implies next day)
      if (endTs <= startTs) {
          endDateTime.setDate(endDateTime.getDate() + 1);
          endTs = endDateTime.getTime();
      }

      const durationMs = endTs - startTs;

      const newSession: StudySession = {
          id: isEditing && session ? session.id : crypto.randomUUID(),
          subjectId,
          startTime: startTs,
          endTime: endTs,
          durationMs,
          dateString: date
      };

      onSave(newSession);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsDeleteConfirm(true);
  };

  const confirmDelete = () => {
      if (session && onDelete) onDelete(session.id);
  };

  const activeSubjects = subjects.filter(s => !s.isArchived || s.id === session?.subjectId);

  // Render Confirmation View if active
  if (isDeleteConfirm) {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Delete Session?</h3>
                    <p className="text-slate-400 text-sm">
                        Are you sure you want to remove this record? This action cannot be undone.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsDeleteConfirm(false)}
                        className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow-lg shadow-red-900/20"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit Session' : 'Log Manual Session'}</h3>
                <button 
                    onClick={onClose} 
                    className="text-slate-400 hover:text-white transition-colors"
                    type="button"
                >
                    <X size={20}/>
                </button>
            </div>

            <div className="space-y-4">
                {/* Subject */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Subject</label>
                    <div className="grid grid-cols-2 gap-2">
                        {activeSubjects.map(sub => {
                            const isSelected = sub.id === subjectId;
                            const isHex = isHexColor(sub.color);
                            return (
                                <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => setSubjectId(sub.id)}
                                    className={`
                                        flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold transition-all
                                        ${isSelected 
                                            ? 'bg-white/10 border-white/20 text-white' 
                                            : 'bg-transparent border-transparent text-slate-500 hover:bg-white/5'}
                                    `}
                                >
                                    <div 
                                        className={`w-2 h-2 rounded-full ${!isHex ? sub.color : ''}`} 
                                        style={isHex ? { backgroundColor: sub.color } : {}}
                                    />
                                    {sub.name}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Date</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-white/20"
                        />
                    </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Start</label>
                        <input 
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-white/20 text-center"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">End</label>
                        <input 
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-white/20 text-center"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    {isEditing && onDelete && (
                        <button 
                            type="button"
                            onClick={handleDeleteClick}
                            className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 transition-colors flex items-center justify-center"
                            title="Delete Record"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button 
                        type="button"
                        onClick={handleSave}
                        className={`flex-1 py-3 rounded-xl bg-${accent}-600 hover:bg-${accent}-500 text-white font-bold transition-all shadow-lg shadow-${accent}-500/20 flex items-center justify-center gap-2`}
                    >
                        <Save size={18} /> {isEditing ? 'Update Record' : 'Save Record'}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
