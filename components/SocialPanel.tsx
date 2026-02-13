
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Friend, UserProfile, Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, UserPlus, Clock, Trophy, Zap, X, Check, Mail, Activity, Target, Circle, CheckCircle2 } from 'lucide-react';
import { rtdb } from '../services/firebase';
import { ref, onValue } from 'firebase/database';

interface SocialPanelProps {
    onClose?: () => void;
}

export const SocialPanel: React.FC<SocialPanelProps> = ({ onClose }) => {
    const { currentUser } = useAuth();
    const { accent } = useTheme();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'requests' | 'add'>('leaderboard');
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    // Detailed View State
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [friendTasks, setFriendTasks] = useState<Task[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);

    // Live Ticker triggers re-render every second for animating timers
    const [ticker, setTicker] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTicker(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const unsubscribe = dbService.subscribeToFriends((updatedFriends) => {
            setFriends(updatedFriends);

            updatedFriends.forEach(f => {
                if (f.status === 'accepted') {
                    const statusRef = ref(rtdb, `status/${f.uid}`);
                    onValue(statusRef, (snapshot) => {
                        const val = snapshot.val();
                        setFriends(prev => prev.map(p => {
                            if (p.uid === f.uid) {
                                // Important: We store raw values, we calculate 'display' time in render
                                return { 
                                    ...p, 
                                    isOnline: val?.state === 'online', 
                                    isFocusing: val?.isFocusing,
                                    liveTodayBase: val?.todayBaseMs || 0, // The settled time from Firestore
                                    liveSessionStart: val?.currentSessionStart || undefined, // When they started clicking start
                                    liveRevenue: val?.currentRevenue || 0
                                };
                            }
                            return p;
                        }));
                    });
                }
            });
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setSearchLoading(true);
        setSearchResult(null);
        setRequestSent(false);
        
        try {
            const user = await dbService.findUserByUsername(searchQuery.trim());
            if (user && user.uid !== currentUser?.uid) {
                setSearchResult(user);
            } else {
                setSearchResult(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSearchLoading(false);
        }
    };

    const sendRequest = async () => {
        if (searchResult) {
            await dbService.sendFriendRequest(searchResult.uid);
            setRequestSent(true);
        }
    };

    const acceptRequest = async (uid: string) => {
        await dbService.acceptFriendRequest(uid);
    };

    const handleFriendClick = async (friend: Friend) => {
        setSelectedFriend(friend);
        setTasksLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const tasks = await dbService.getFriendTasks(friend.uid, today);
        setFriendTasks(tasks);
        setTasksLoading(false);
    };

    // Helper to calculate LIVE time
    const getLiveTime = (friend: Friend) => {
        let total = friend.liveTodayBase || 0;
        // If they are currently focusing, add the elapsed time since start
        if (friend.isFocusing && friend.liveSessionStart) {
            total += Math.max(0, Date.now() - friend.liveSessionStart);
        }
        // Fallback to static profile data if RTDB is empty (offline friends)
        if (total === 0 && friend.profile?.totalFocusMs) {
             // This logic might need refinement if 'totalFocusMs' is lifetime vs today. 
             // Assuming RTDB handles daily. 
             return 0; 
        }
        return total;
    };

    const formatDuration = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    // Sort by Live Revenue (or fall back to total focus)
    const leaderboardData = friends
        .filter(f => f.status === 'accepted')
        .sort((a, b) => (b.liveRevenue || 0) - (a.liveRevenue || 0));

    const pendingRequests = friends.filter(f => f.status === 'pending_received');

    // --- Detail Popup ---
    const DetailedView = () => {
        if (!selectedFriend) return null;
        
        const completedTasks = friendTasks.filter(t => t.status === 'done').length;
        const totalTasks = friendTasks.length;
        const efficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const liveTime = getLiveTime(selectedFriend);

        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-xl p-6 flex flex-col"
            >
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl font-bold border border-white/10 shadow-lg relative">
                            {selectedFriend.profile?.photoURL ? (
                                <img src={selectedFriend.profile.photoURL} className="w-full h-full rounded-2xl object-cover" />
                            ) : (
                                selectedFriend.profile?.displayName?.[0]
                            )}
                            {/* Live Status Indicator */}
                            {selectedFriend.isFocusing ? (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-4 border-slate-900 animate-pulse shadow-[0_0_15px_rgba(59,130,246,1)]" />
                            ) : selectedFriend.isOnline ? (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                            ) : null}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">{selectedFriend.profile?.displayName}</h3>
                            <p className="text-sm text-slate-400 font-mono">@{selectedFriend.profile?.username || 'user'}</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedFriend(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Clock size={12} className={selectedFriend.isFocusing ? "text-blue-400 animate-pulse" : "text-slate-400"} /> Today
                        </div>
                        <div className="text-2xl font-mono font-bold text-white">
                            {formatDuration(liveTime)}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Activity size={12} className="text-emerald-400" /> Efficiency
                        </div>
                        <div className="text-2xl font-mono font-bold text-white flex items-baseline gap-1">
                            {efficiency}<span className="text-sm text-slate-500">%</span>
                        </div>
                    </div>
                </div>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Today's Tasks</h4>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {tasksLoading ? (
                        <div className="text-center py-10 text-slate-500 text-sm">Loading tasks...</div>
                    ) : friendTasks.length === 0 ? (
                        <div className="text-center py-10 text-slate-600 border-2 border-dashed border-white/5 rounded-2xl">
                            No tasks recorded today.
                        </div>
                    ) : (
                        friendTasks.map(task => (
                            <div key={task.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                {task.status === 'done' ? (
                                    <CheckCircle2 size={18} className="text-emerald-500 flex-none" />
                                ) : (
                                    <Circle size={18} className="text-slate-600 flex-none" />
                                )}
                                <span className={`text-sm ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                    {task.title}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-slate-900/60 backdrop-blur-xl border-l border-white/10 w-full md:w-80 lg:w-96 shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className={`p-2 bg-${accent}-500/20 rounded-xl text-${accent}-400`}>
                        <Users size={20} />
                    </div>
                    <h2 className="font-bold text-white">Friends & Progress</h2>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex p-1 mx-4 mt-4 bg-slate-950/50 rounded-xl border border-white/5">
                {[
                    { id: 'leaderboard', icon: Trophy },
                    { id: 'requests', icon: Mail, count: pendingRequests.length },
                    { id: 'add', icon: UserPlus }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all relative ${activeTab === tab.id ? `bg-${accent}-600 text-white shadow-lg` : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <tab.icon size={14} />
                        {tab.count ? (
                            <span className="bg-rose-500 text-white text-[9px] px-1.5 rounded-full absolute -top-1 -right-1 border border-slate-900">
                                {tab.count}
                            </span>
                        ) : null}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
                <AnimatePresence>
                    {selectedFriend && <DetailedView />}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    
                    {/* LEADERBOARD TAB */}
                    {activeTab === 'leaderboard' && !selectedFriend && (
                        <motion.div 
                            key="board"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-3"
                        >
                            {leaderboardData.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <Trophy size={40} className="mx-auto mb-2 text-slate-600" />
                                    <p className="text-xs text-slate-400">Add friends to compete.</p>
                                </div>
                            ) : (
                                leaderboardData.map((friend, i) => {
                                    const liveTime = getLiveTime(friend);
                                    return (
                                        <div 
                                            key={friend.uid}
                                            onClick={() => handleFriendClick(friend)}
                                            className={`
                                                p-3 rounded-xl border flex items-center justify-between transition-all group relative overflow-hidden cursor-pointer
                                                ${i === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}
                                            `}
                                        >
                                            <div className="flex items-center gap-3 relative z-10">
                                                <span className={`text-sm font-mono font-bold w-4 text-center ${i === 0 ? 'text-amber-400' : 'text-slate-500'}`}>#{i+1}</span>
                                                <div className="relative">
                                                    {friend.profile?.photoURL ? (
                                                        <img src={friend.profile.photoURL} className="w-10 h-10 rounded-full border border-white/10" alt="Avatar" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                                            {friend.profile?.displayName?.[0] || '?'}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Live Indicators in List */}
                                                    {friend.isFocusing ? (
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-slate-900 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" title="Focusing Now">
                                                            <Zap size={8} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="currentColor"/>
                                                        </div>
                                                    ) : friend.isOnline ? (
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Online" />
                                                    ) : null}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-200">{friend.profile?.displayName || 'Unknown'}</h4>
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono">
                                                        {friend.isFocusing ? (
                                                            <span className="text-blue-400 font-bold animate-pulse">Focusing...</span>
                                                        ) : (
                                                            <span>@{friend.profile?.username}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-bold text-white mb-0.5 font-mono">
                                                    {formatDuration(liveTime)}
                                                </div>
                                                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold flex items-center justify-end gap-1">
                                                    <Zap size={8} /> {friend.liveRevenue || friend.profile?.totalFocusMs || 0}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </motion.div>
                    )}

                    {/* REQUESTS TAB */}
                    {activeTab === 'requests' && !selectedFriend && (
                        <motion.div 
                            key="req"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-3"
                        >
                            {pendingRequests.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <Mail size={40} className="mx-auto mb-2 text-slate-600" />
                                    <p className="text-xs text-slate-400">No pending requests.</p>
                                </div>
                            ) : (
                                pendingRequests.map(req => (
                                    <div key={req.uid} className="bg-white/5 p-4 rounded-xl border border-white/10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                                {req.profile?.displayName?.[0] || '?'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-200">{req.profile?.displayName || 'Unknown User'}</h4>
                                                <p className="text-xs text-slate-500">@{req.profile?.username}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => acceptRequest(req.uid)}
                                            className={`w-full py-2 bg-${accent}-600 hover:bg-${accent}-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2`}
                                        >
                                            <Check size={14} /> Accept Request
                                        </button>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {/* ADD FRIEND TAB */}
                    {activeTab === 'add' && !selectedFriend && (
                        <motion.div 
                            key="add"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                        >
                            <form onSubmit={handleSearch} className="mb-6">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input 
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                                        placeholder="Search by @username..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={!searchQuery || searchLoading}
                                    className={`mt-2 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors`}
                                >
                                    {searchLoading ? 'Searching...' : 'Find User'}
                                </button>
                            </form>

                            {searchResult && (
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/10 text-center animate-in fade-in zoom-in-95">
                                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 text-xl font-bold overflow-hidden">
                                        {searchResult.photoURL ? (
                                            <img src={searchResult.photoURL} className="w-full h-full object-cover" />
                                        ) : (
                                            searchResult.displayName[0]
                                        )}
                                    </div>
                                    <h3 className="font-bold text-white text-lg">{searchResult.displayName}</h3>
                                    <p className="text-xs text-slate-400 mb-4">@{searchResult.username}</p>
                                    
                                    {requestSent ? (
                                        <div className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 bg-emerald-500/10 py-2 rounded-lg">
                                            <Check size={14} /> Request Sent
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={sendRequest}
                                            className={`w-full py-2 bg-${accent}-600 hover:bg-${accent}-500 text-white rounded-lg text-xs font-bold`}
                                        >
                                            Send Friend Request
                                        </button>
                                    )}
                                </div>
                            )}
                            
                            {!searchResult && !searchLoading && searchQuery && requestSent === false && (
                                <div className="text-center text-slate-500 text-xs mt-4">
                                    No user found. Try searching by username.
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
};
