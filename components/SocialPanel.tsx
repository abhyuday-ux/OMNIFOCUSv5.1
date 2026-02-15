
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import { Friend, UserProfile, StudySession, Subject, isHexColor, getLocalDateString } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Users, Search, UserPlus, Trophy, X, Check, Mail, Activity, Circle, PieChart } from 'lucide-react';
import { rtdb } from '../services/firebase';
import { ref, onValue, off } from 'firebase/database';

// --- Helper Components ---

const StatusIndicator: React.FC<{ isOnline?: boolean; isFocusing?: boolean }> = ({ isOnline, isFocusing }) => {
    if (isFocusing) {
        return (
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-slate-900"></span>
            </div>
        );
    }
    if (isOnline) {
        return <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />;
    }
    return <div className="h-2 w-2 rounded-full border border-slate-600" />;
};

const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

// Isolated Row Component to prevent full list re-renders on ticker
const FriendRow: React.FC<{ 
    friend: Friend; 
    rank: number; 
    onClick: () => void 
}> = ({ friend, rank, onClick }) => {
    const [liveTime, setLiveTime] = useState<number>(0);
    const [isFocusing, setIsFocusing] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [currentTask, setCurrentTask] = useState<string>('');

    // Local RTDB Listener for this specific friend
    useEffect(() => {
        const statusRef = ref(rtdb, `users/${friend.uid}/publicStatus`);
        
        const handleUpdate = (snapshot: any) => {
            const val = snapshot.val();
            if (val) {
                setIsOnline(val.isOnline);
                setIsFocusing(val.isFocusing);
                setCurrentTask(val.currentTask || '');
                
                // Base time from completed sessions
                let total = val.todayBaseMs || (val.todayFocusMinutes * 60000) || 0;
                
                // If actively running, add elapsed time since start
                if (val.isFocusing && val.currentSessionStart) {
                    const elapsed = Math.max(0, Date.now() - val.currentSessionStart);
                    total += elapsed;
                }
                setLiveTime(total);
            } else {
                // Default fallback if no RTDB data (offline/new user)
                setIsOnline(false);
                setIsFocusing(false);
                setCurrentTask('');
                setLiveTime(friend.profile?.totalFocusMs || 0); 
            }
        };

        onValue(statusRef, handleUpdate);
        return () => off(statusRef);
    }, [friend.uid]);

    // Local Ticker for smooth animation if focusing
    useEffect(() => {
        if (!isFocusing) return;
        const interval = setInterval(() => {
            setLiveTime(prev => prev + 1000);
        }, 1000);
        return () => clearInterval(interval);
    }, [isFocusing]);

    return (
        <motion.div 
            layout // Framer Motion layout prop for smooth reordering
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onClick}
            className={`
                flex items-center justify-between p-3 rounded-xl border border-white/5 cursor-pointer
                bg-white/[0.02] hover:bg-white/5 transition-colors group
                ${rank === 1 ? 'border-amber-500/20 bg-amber-500/5' : ''}
            `}
        >
            <div className="flex items-center gap-4">
                <span className={`
                    w-6 text-center text-xs font-mono font-bold 
                    ${rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-orange-400' : 'text-slate-600'}
                `}>
                    #{rank}
                </span>
                
                <div className="relative">
                    {friend.profile?.photoURL ? (
                        <img src={friend.profile.photoURL} className="w-10 h-10 rounded-xl object-cover bg-slate-800" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                            {friend.profile?.displayName?.[0] || '?'}
                        </div>
                    )}
                    <div className="absolute -bottom-1 -right-1">
                        <StatusIndicator isOnline={isOnline} isFocusing={isFocusing} />
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-sm text-slate-200 group-hover:text-white transition-colors">
                        {friend.profile?.displayName || 'Unknown'}
                    </h4>
                    <p className={`text-[10px] font-mono truncate max-w-[100px] ${isFocusing ? 'text-blue-400 animate-pulse' : 'text-slate-500'}`}>
                        {isFocusing ? `Focusing: ${currentTask}` : `@${friend.profile?.username}`}
                    </p>
                </div>
            </div>

            <div className="text-right">
                <div className={`text-sm font-mono font-bold ${isFocusing ? 'text-blue-400' : 'text-slate-300'}`}>
                    {formatDuration(liveTime)}
                </div>
                <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">
                    {isFocusing ? 'Live' : 'Today'}
                </div>
            </div>
        </motion.div>
    );
};

// --- Main Component ---

interface SocialPanelProps {
    onClose?: () => void;
}

export const SocialPanel: React.FC<SocialPanelProps> = ({ onClose }) => {
    const { currentUser } = useAuth();
    const { accent } = useTheme();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'requests' | 'add'>('leaderboard');
    
    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    // Detail View
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [friendSessions, setFriendSessions] = useState<StudySession[]>([]);
    const [friendSubjects, setFriendSubjects] = useState<Subject[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Subscribe to Friends List (Firestore)
    useEffect(() => {
        const unsubscribe = dbService.subscribeToFriends((updatedFriends) => {
            setFriends(updatedFriends);
        });
        return () => { if (unsubscribe) unsubscribe(); };
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
        } catch (e) { console.error(e); } 
        finally { setSearchLoading(false); }
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
        setDetailsLoading(true);
        
        try {
            const today = getLocalDateString();
            const [sessions, subjects] = await Promise.all([
                dbService.getFriendSessions(friend.uid, today),
                dbService.getFriendSubjects(friend.uid)
            ]);
            
            setFriendSessions(sessions);
            setFriendSubjects(subjects);
        } catch (e) {
            console.error("Error loading details", e);
        } finally {
            setDetailsLoading(false);
        }
    };

    const acceptedFriends = friends.filter(f => f.status === 'accepted');
    const pendingRequests = friends.filter(f => f.status === 'pending_received');

    // Sort by totalFocusMs as a baseline for stability
    const sortedFriends = [...acceptedFriends].sort((a, b) => (b.profile?.totalFocusMs || 0) - (a.profile?.totalFocusMs || 0));

    // Calculate Breakdown Data for Modal
    const subjectBreakdown = useMemo(() => {
        const stats: Record<string, number> = {};
        friendSessions.forEach(s => {
            stats[s.subjectId] = (stats[s.subjectId] || 0) + s.durationMs;
        });
        
        return Object.entries(stats).map(([id, ms]) => {
            const subject = friendSubjects.find(sub => sub.id === id);
            return {
                id,
                name: subject?.name || id, // Fallback to ID if custom subject missing, or we could capitalize
                color: subject?.color || '#64748b',
                ms
            };
        }).sort((a, b) => b.ms - a.ms);
    }, [friendSessions, friendSubjects]);

    return (
        <div className="h-full flex flex-col bg-slate-900/60 backdrop-blur-xl border-l border-white/10 w-full md:w-96 shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/80">
                <div className="flex items-center gap-3">
                    <div className={`p-2 bg-${accent}-500/20 rounded-xl text-${accent}-400`}>
                        <Users size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-white text-sm uppercase tracking-wide">Mission Control</h2>
                        <p className="text-[10px] text-slate-500 font-mono">Friends & Status</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div className="px-4 py-3 bg-slate-950/30 border-b border-white/5">
                <div className="flex p-1 bg-slate-800/50 rounded-lg border border-white/5">
                    {[
                        { id: 'leaderboard', icon: Trophy, label: 'Board' },
                        { id: 'requests', icon: Mail, label: 'Req', count: pendingRequests.length },
                        { id: 'add', icon: UserPlus, label: 'Add' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all relative ${activeTab === tab.id ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <tab.icon size={12} />
                            {tab.label}
                            {tab.count ? (
                                <span className="bg-rose-500 text-white text-[9px] px-1 rounded-full">{tab.count}</span>
                            ) : null}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
                <AnimatePresence mode="wait">
                    
                    {/* DETAIL POPUP (Breakdown) */}
                    {selectedFriend ? (
                        <motion.div 
                            key="detail"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col overflow-hidden"
                        >
                            <div className="flex justify-end">
                                <button onClick={() => setSelectedFriend(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl font-bold border-2 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)] mb-4 overflow-hidden relative">
                                    {selectedFriend.profile?.photoURL ? (
                                        <img src={selectedFriend.profile.photoURL} className="w-full h-full object-cover" />
                                    ) : (
                                        selectedFriend.profile?.displayName?.[0]
                                    )}
                                    {/* Online/Focus Status Ring */}
                                    <div className={`absolute inset-0 border-2 rounded-3xl ${selectedFriend.rtStatus?.isFocusing ? 'border-blue-500 animate-pulse' : selectedFriend.rtStatus?.isOnline ? 'border-emerald-500' : 'border-transparent'}`} />
                                </div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">{selectedFriend.profile?.displayName}</h3>
                                <p className="text-xs text-slate-500 font-mono mt-1">@{selectedFriend.profile?.username}</p>
                            </div>

                            <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/10 shadow-xl flex-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                                    <PieChart size={16} className="text-indigo-400"/>
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Today's Focus Breakdown</h4>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                    {detailsLoading ? (
                                        <div className="flex justify-center items-center h-20">
                                            <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
                                        </div>
                                    ) : subjectBreakdown.length === 0 ? (
                                        <div className="text-center py-8 text-slate-600 text-xs italic border border-dashed border-white/5 rounded-xl">
                                            No recorded sessions today.
                                        </div>
                                    ) : (
                                        <div className="w-full">
                                            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase mb-2 px-2">
                                                <div className="col-span-8">Subject</div>
                                                <div className="col-span-4 text-right">Time</div>
                                            </div>
                                            {subjectBreakdown.map((item) => {
                                                const isHex = isHexColor(item.color);
                                                return (
                                                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                                        <div className="col-span-8 flex items-center gap-3 overflow-hidden">
                                                            <div 
                                                                className={`w-2 h-2 rounded-full flex-none shadow-[0_0_8px_currentColor] ${!isHex ? item.color : ''}`} 
                                                                style={isHex ? { backgroundColor: item.color, color: item.color } : {}}
                                                            />
                                                            <span className="text-sm font-medium text-slate-200 truncate">{item.name}</span>
                                                        </div>
                                                        <div className="col-span-4 text-right font-mono font-bold text-indigo-300 text-xs">
                                                            {formatDuration(item.ms)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        
                        /* LIST VIEWS (Leaderboard etc.) */
                        <>
                            {activeTab === 'leaderboard' && (
                                <motion.div 
                                    key="leaderboard"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-2"
                                >
                                    <LayoutGroup>
                                        {sortedFriends.length === 0 ? (
                                            <div className="text-center py-10 opacity-50">
                                                <Trophy size={40} className="mx-auto mb-2 text-slate-600" />
                                                <p className="text-xs text-slate-400">Add friends to compete.</p>
                                            </div>
                                        ) : (
                                            sortedFriends.map((friend, i) => (
                                                <FriendRow 
                                                    key={friend.uid} 
                                                    friend={friend} 
                                                    rank={i + 1}
                                                    onClick={() => handleFriendClick(friend)}
                                                />
                                            ))
                                        )}
                                    </LayoutGroup>
                                </motion.div>
                            )}

                            {activeTab === 'requests' && (
                                <motion.div 
                                    key="requests"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
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
                                                        <h4 className="font-bold text-slate-200">{req.profile?.displayName}</h4>
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

                            {activeTab === 'add' && (
                                <motion.div 
                                    key="add"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
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
                                    
                                    {!searchResult && !searchLoading && searchQuery && !requestSent && (
                                        <div className="text-center text-slate-500 text-xs mt-4">
                                            No user found. Try searching by username.
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
