import React, { useState } from 'react';
import { Users, LogIn, LogOut, Hash, User, Activity } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ActiveGroup } from '../types';

interface StudyGroup {
    id: string;
    name: string;
    members: number;
    topic: string;
}

interface StudyRoomProps {
  activeGroup: ActiveGroup | null;
  onJoinGroup: (groupId: string, userName: string) => void;
  onLeaveGroup: () => void;
}

export const StudyRoom: React.FC<StudyRoomProps> = ({ activeGroup, onJoinGroup, onLeaveGroup }) => {
    const { accent } = useTheme();
    const [userName, setUserName] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    
    // Mock Data
    const groups: StudyGroup[] = [
        { id: '1', name: 'Late Night Focus', members: 12, topic: 'General' },
        { id: '2', name: 'Pomodoro Warriors', members: 8, topic: 'Pomodoro' },
        { id: '3', name: 'CS Study Hall', members: 5, topic: 'Computer Science' },
        { id: '4', name: 'Quiet Reading', members: 23, topic: 'Literature' },
    ];

    const handleJoin = (group: StudyGroup) => {
        if (!userName.trim()) {
            alert("Please enter a username");
            return;
        }
        setIsJoining(true);
        // Simulate API call delay
        setTimeout(() => {
            onJoinGroup(group.id, userName);
            setIsJoining(false);
        }, 500);
    };

    if (activeGroup) {
        return (
            <div className="h-full flex flex-col bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
                
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                             <Hash size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Active Session</h2>
                            <p className="text-xs text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Connected as {activeGroup.userName}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onLeaveGroup}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                        <LogOut size={16} /> Leave
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                     <Activity size={48} className={`text-${accent}-400 mb-4 animate-pulse`} />
                     <p className="text-slate-300 font-medium">Live activity feed coming soon.</p>
                     <p className="text-xs text-slate-500 mt-2">Focus on your tasks!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
             <div className="flex items-center gap-3 mb-6">
                 <div className={`p-3 bg-${accent}-500/20 rounded-2xl text-${accent}-400 shadow-[0_0_15px_rgba(var(--color-${accent}-500),0.2)]`}>
                     <Users size={24} />
                 </div>
                 <div>
                     <h2 className="text-2xl font-bold text-white">Study Groups</h2>
                     <p className="text-slate-400 text-sm">Join others to stay motivated</p>
                 </div>
             </div>

             <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mb-6">
                 <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Your Username</label>
                 <div className="flex gap-2">
                     <div className="relative flex-1">
                         <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                         <input 
                             value={userName}
                             onChange={(e) => setUserName(e.target.value)}
                             placeholder="Enter display name..."
                             className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-white/20 transition-colors"
                         />
                     </div>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
                 {groups.map(group => (
                     <button
                        key={group.id}
                        disabled={!userName.trim() || isJoining}
                        onClick={() => handleJoin(group)}
                        className={`
                            text-left p-4 rounded-2xl border transition-all group relative overflow-hidden flex flex-col justify-between
                            ${!userName.trim() ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/5' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
                        `}
                     >
                         <div className="flex justify-between items-start mb-2">
                             <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors">{group.name}</h3>
                             <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full flex items-center gap-1">
                                 <User size={10} /> {group.members}
                             </span>
                         </div>
                         <p className="text-xs text-slate-500 mb-4">{group.topic}</p>
                         <div className={`text-xs font-bold text-${accent}-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0`}>
                             Join Room <LogIn size={12} />
                         </div>
                     </button>
                 ))}
             </div>
        </div>
    );
};