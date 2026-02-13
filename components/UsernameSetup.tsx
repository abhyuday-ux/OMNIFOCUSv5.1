
import React, { useState } from 'react';
import { dbService } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { AtSign, Check, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface UsernameSetupProps {
    onComplete: () => void;
}

export const UsernameSetup: React.FC<UsernameSetupProps> = ({ onComplete }) => {
    const [username, setUsername] = useState('');
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');
    const [isAvailable, setIsAvailable] = useState(false);

    const validateUsername = (val: string) => {
        // Enforce lowercase, alphanumeric + underscore, 3-20 chars
        const regex = /^[a-z0-9_]{3,20}$/;
        return regex.test(val);
    };

    const handleCheck = async () => {
        const cleanUser = username.toLowerCase().trim();
        if (!cleanUser) return;

        if (!validateUsername(cleanUser)) {
            setError("3-20 chars, lowercase letters, numbers, or _");
            setIsAvailable(false);
            return;
        }
        
        setChecking(true);
        setError('');
        
        try {
            const taken = await dbService.isUsernameTaken(cleanUser);
            if (taken) {
                setError("Username already taken.");
                setIsAvailable(false);
            } else {
                setIsAvailable(true);
            }
        } catch (e) {
            setError("Connection error.");
        } finally {
            setChecking(false);
        }
    };

    const handleSubmit = async () => {
        if (!isAvailable) return;
        setChecking(true);
        try {
            await dbService.claimUsername(username);
            onComplete();
        } catch (e) {
            setError("Failed to claim username.");
            setChecking(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Force lowercase visuals immediately
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setUsername(val);
        setIsAvailable(false);
        setError('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                
                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-400 border border-indigo-500/20">
                        <AtSign size={32} />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">Claim Your Handle</h2>
                    <p className="text-slate-400 mb-8">Choose a unique username for the OmniFocus network.</p>

                    <div className="relative mb-6">
                        <input 
                            className={`w-full bg-slate-950 border ${error ? 'border-red-500/50' : isAvailable ? 'border-emerald-500/50' : 'border-white/10'} rounded-xl py-4 pl-12 pr-4 text-white font-mono text-lg focus:outline-none focus:border-indigo-500 transition-colors`}
                            placeholder="username"
                            value={username}
                            onChange={handleChange}
                            onBlur={handleCheck}
                        />
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        
                        {checking && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Loader2 className="animate-spin text-indigo-400" size={20} />
                            </div>
                        )}
                        
                        {isAvailable && !checking && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400">
                                <Check size={20} />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center justify-center gap-2 text-red-400 text-sm mb-6 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={!isAvailable || checking}
                        className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg
                            ${isAvailable 
                                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 transform hover:-translate-y-0.5' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                        `}
                    >
                        Create Identity
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
