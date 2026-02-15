
import React, { useEffect, useState, useRef } from 'react';
import { dbService } from '../services/db';
import { rtdb } from '../services/firebase';
import { ref, onValue, off, push, serverTimestamp } from 'firebase/database';
import { Friend } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Toast {
    id: string;
    username: string;
    message: string;
    tier: string;
    tierColor: string;
    level: number;
}

export const FriendObserver: React.FC = () => {
    const { currentUser } = useAuth();
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const rtdbListeners = useRef<Record<string, any>>({}); 

    // 1. Fetch Friends from Firestore
    useEffect(() => {
        const unsub = dbService.subscribeToFriends((friendList) => {
            const accepted = friendList.filter(f => f.status === 'accepted');
            setFriends(accepted);
        });
        unsubscribeRef.current = unsub;

        return () => {
            if (unsubscribeRef.current) unsubscribeRef.current();
        };
    }, []);

    // 2. Set up RTDB Listeners for each friend
    useEffect(() => {
        const currentListeners = rtdbListeners.current;

        // Cleanup old listeners
        Object.keys(currentListeners).forEach(uid => {
            if (!friends.find(f => f.uid === uid)) {
                off(ref(rtdb, `users/${uid}/milestones/latest`));
                delete currentListeners[uid];
            }
        });

        // Add new listeners
        friends.forEach(friend => {
            if (!currentListeners[friend.uid]) {
                const milestoneRef = ref(rtdb, `users/${friend.uid}/milestones/latest`);
                
                const listener = onValue(milestoneRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const now = Date.now();
                        const timestamp = data.timestamp;
                        // Only show if happened in last 30 seconds to prevent spam
                        if (timestamp && (now - timestamp < 30000)) {
                            triggerToast(data);
                            saveNotification(data);
                        }
                    }
                });
                currentListeners[friend.uid] = listener;
            }
        });

        return () => {};
    }, [friends]);

    // Cleanup all on unmount
    useEffect(() => {
        return () => {
            Object.keys(rtdbListeners.current).forEach(uid => {
                off(ref(rtdb, `users/${uid}/milestones/latest`));
            });
        };
    }, []);

    const saveNotification = (data: any) => {
        if (!currentUser) return;
        const notificationsRef = ref(rtdb, `users/${currentUser.uid}/notifications`);
        push(notificationsRef, {
            type: 'milestone',
            title: 'Friend Level Up',
            message: `${data.username} ${data.message}`,
            timestamp: serverTimestamp(),
            read: false,
            meta: {
                tier: data.tier,
                level: data.level
            }
        });
    };

    const triggerToast = (data: any) => {
        const id = crypto.randomUUID();
        
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play failed", e));

        const newToast: Toast = {
            id,
            username: data.username,
            message: data.message,
            tier: data.tier,
            tierColor: data.tierColor || 'text-white',
            level: data.level
        };

        setToasts(prev => [...prev, newToast]);

        setTimeout(() => {
            removeToast(id);
        }, 5000);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getBorderColor = (rankTitle: string) => {
        if(rankTitle.includes('GOLD')) return 'border-yellow-500/50 shadow-yellow-500/20';
        if(rankTitle.includes('SILVER')) return 'border-slate-400/50 shadow-slate-400/10';
        if(rankTitle.includes('BRONZE')) return 'border-orange-500/50 shadow-orange-500/20';
        if(rankTitle.includes('PLATINUM')) return 'border-cyan-500/50 shadow-cyan-500/20';
        if(rankTitle.includes('MASTER')) return 'border-fuchsia-500/50 shadow-fuchsia-500/20';
        return 'border-white/20';
    };

    return (
        <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map(toast => {
                    const borderClass = getBorderColor(toast.tier);
                    return (
                        <motion.div
                            key={toast.id}
                            initial={{ x: 100, opacity: 0, scale: 0.9 }}
                            animate={{ x: 0, opacity: 1, scale: 1 }}
                            exit={{ x: 100, opacity: 0, scale: 0.9 }}
                            layout
                            className={`
                                pointer-events-auto w-80 bg-slate-900/80 backdrop-blur-xl border-l-4 rounded-lg p-4 shadow-2xl flex items-start gap-3 relative overflow-hidden
                                ${borderClass} border-t border-b border-r border-white/10
                            `}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent -skew-x-12 animate-[shimmer_2s_infinite]" />

                            <div className="p-2 bg-white/10 rounded-full flex-none relative z-10">
                                <Trophy size={20} className={toast.tierColor.includes('text-') ? toast.tierColor : 'text-white'} />
                            </div>

                            <div className="flex-1 min-w-0 relative z-10">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-white text-sm truncate">{toast.username}</h4>
                                    <button onClick={() => removeToast(toast.id)} className="text-slate-500 hover:text-white transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 ${toast.tierColor}`}>
                                        {toast.tier}
                                    </span>
                                    <Flame size={12} className="text-orange-500 animate-pulse" fill="currentColor" />
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>
    );
};
