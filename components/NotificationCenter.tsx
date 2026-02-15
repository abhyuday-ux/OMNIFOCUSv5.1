
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Trophy, PartyPopper, Clock, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../services/firebase';
import { ref, onValue, query, limitToLast, orderByChild, update } from 'firebase/database';

interface Notification {
    id: string;
    type: 'milestone' | 'system';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    meta?: any;
}

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        // Hardcoded App Update
        const systemNotif: Notification = {
            id: 'sys-welcome-phase2',
            type: 'system',
            title: 'Welcome to Phase 2!',
            message: 'Ekagrazone Phase 2 is live. Check out the new global leaderboard and live presence features.',
            timestamp: Date.now(), // Always fresh for demo
            read: true // System messages read by default for visual noise reduction in this demo
        };

        if (!currentUser) {
            setNotifications([systemNotif]);
            return;
        }

        // Fetch user notifications
        const notifRef = query(ref(rtdb, `users/${currentUser.uid}/notifications`), orderByChild('timestamp'), limitToLast(10));
        
        const unsubscribe = onValue(notifRef, (snapshot) => {
            const data = snapshot.val();
            const loaded: Notification[] = [systemNotif];
            
            if (data) {
                Object.keys(data).forEach(key => {
                    loaded.push({
                        id: key,
                        ...data[key]
                    });
                });
            }
            
            // Sort by new
            setNotifications(loaded.sort((a, b) => b.timestamp - a.timestamp));
        });

        return () => unsubscribe();
    }, [currentUser]);

    const markAllRead = () => {
        if (!currentUser) return;
        const updates: any = {};
        notifications.forEach(n => {
            if (!n.read && n.type !== 'system') {
                updates[`users/${currentUser.uid}/notifications/${n.id}/read`] = true;
            }
        });
        if (Object.keys(updates).length > 0) {
            update(ref(rtdb), updates);
        }
    };

    const getTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
                    />
                    <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900 border-l border-white/10 shadow-2xl z-[100] flex flex-col"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-xl relative">
                                    <Bell size={20} className="text-white" />
                                    {notifications.some(n => !n.read) && (
                                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />
                                    )}
                                </div>
                                <h2 className="text-lg font-bold text-white">Notifications</h2>
                            </div>
                            <div className="flex gap-2">
                                {currentUser && (
                                    <button onClick={markAllRead} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5" title="Mark all read">
                                        <Check size={18} />
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <Bell size={48} className="mx-auto mb-4 text-slate-600" />
                                    <p className="text-sm text-slate-400">No new notifications</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div 
                                        key={notif.id} 
                                        className={`p-4 rounded-2xl border transition-colors relative group
                                            ${notif.read ? 'bg-slate-900/50 border-white/5 opacity-70' : 'bg-slate-800/60 border-white/10 shadow-lg'}
                                        `}
                                    >
                                        {!notif.read && (
                                            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                                        )}
                                        
                                        <div className="flex gap-4">
                                            <div className={`
                                                flex-none w-10 h-10 rounded-full flex items-center justify-center
                                                ${notif.type === 'system' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}
                                            `}>
                                                {notif.type === 'system' ? <PartyPopper size={20} /> : <Trophy size={20} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-white mb-1">{notif.title}</h4>
                                                <p className="text-xs text-slate-400 leading-relaxed mb-2">{notif.message}</p>
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                                                    <Clock size={10} />
                                                    {getTimeAgo(notif.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
