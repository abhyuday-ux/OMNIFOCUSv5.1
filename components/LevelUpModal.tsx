
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTheme } from '../contexts/ThemeContext';

interface LevelUpModalProps {
  newLevel: number;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ newLevel, onClose }) => {
  const { accent } = useTheme();
  
  useEffect(() => {
      // Trigger confetti on mount
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        // launch a few confetti from the left edge
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#22d3ee', '#818cf8', '#e879f9', '#facc15']
        });
        // and launch a few from the right edge
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#22d3ee', '#818cf8', '#e879f9', '#facc15']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
        <motion.div 
            initial={{ scale: 0.5, opacity: 0, rotateX: 45 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative w-full max-w-sm bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-8 text-center shadow-[0_0_100px_rgba(34,211,238,0.4)] overflow-hidden"
        >
            {/* Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150 mix-blend-overlay"></div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative z-10 flex justify-center mb-6"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-cyan-400 blur-2xl rounded-full opacity-50 animate-pulse" />
                    <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/20 transform rotate-3">
                        <Trophy size={48} className="text-white drop-shadow-md" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full border-2 border-slate-900 transform rotate-12">
                        + Unlocks
                    </div>
                </div>
            </motion.div>

            <motion.h2 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
                className="relative z-10 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-300 mb-2 tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]"
            >
                LEVEL UP!
            </motion.h2>

            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="relative z-10 text-slate-300 font-medium mb-8"
            >
                You have reached <span className="text-cyan-400 font-bold text-lg">Level {newLevel}</span>
            </motion.div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="relative z-10 grid grid-cols-2 gap-3 mb-8"
            >
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center">
                    <Zap size={20} className="text-amber-400 mb-1" />
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Energy</span>
                    <span className="font-bold text-white">Restored</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center">
                    <Star size={20} className="text-purple-400 mb-1" />
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Status</span>
                    <span className="font-bold text-white">Elite</span>
                </div>
            </motion.div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="relative z-10 w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all uppercase tracking-widest text-sm"
            >
                Claim Rewards
            </motion.button>
        </motion.div>
    </div>
  );
};
