
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Zap, BarChart2, Timer, Workflow } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, continueAsGuest } = useAuth();

  return (
    <div className="min-h-screen bg-[#050511] text-slate-200 font-sans selection:bg-indigo-500/30 flex justify-center overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="w-full max-w-[1600px] grid grid-cols-1 lg:grid-cols-2 min-h-screen relative z-10">
          
          {/* Left Panel: Branding & Value Prop */}
          <div className="p-8 lg:p-20 flex flex-col justify-center lg:min-h-screen relative">
             
             {/* Logo */}
             <div className="flex items-center gap-3 mb-12 lg:mb-20">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Zap size={24} fill="white" className="text-white" />
                </div>
                <span className="text-2xl font-bold tracking-wider text-white italic">OMNIFOCUS</span>
             </div>

             {/* Headline */}
             <div className="mb-6">
                 <h1 className="text-5xl lg:text-7xl font-serif leading-[1.1] text-white mb-2">
                    Master your day,
                 </h1>
                 <h1 className="text-5xl lg:text-7xl font-serif leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                    Own your focus.
                 </h1>
             </div>

             <p className="text-lg text-slate-400 leading-relaxed max-w-lg mb-12">
                Designed for high-performers who need to eliminate distractions and build lasting momentum.
             </p>

             {/* Feature List */}
             <div className="space-y-8 max-w-lg">
                 {/* Feature 1 */}
                 <div className="flex gap-5">
                     <div className="w-14 h-14 rounded-2xl bg-[#1A1B2E] border border-white/5 flex items-center justify-center flex-none shadow-xl">
                         <Timer size={24} className="text-indigo-400" />
                     </div>
                     <div>
                         <h3 className="text-lg font-bold text-white mb-1">Deep Focus Timer</h3>
                         <p className="text-sm text-slate-400 leading-relaxed">Enter flow state instantly with custom Pomodoro sequences and smart noise cancellation.</p>
                     </div>
                 </div>

                 {/* Feature 2 */}
                 <div className="flex gap-5">
                     <div className="w-14 h-14 rounded-2xl bg-[#1A1B2E] border border-white/5 flex items-center justify-center flex-none shadow-xl">
                         <Workflow size={24} className="text-fuchsia-400" />
                     </div>
                     <div>
                         <h3 className="text-lg font-bold text-white mb-1">Smart Habit Tracker</h3>
                         <p className="text-sm text-slate-400 leading-relaxed">Build unbreakable routines with dynamic streak rewards and AI-guided daily cues.</p>
                     </div>
                 </div>

                 {/* Feature 3 */}
                 <div className="flex gap-5">
                     <div className="w-14 h-14 rounded-2xl bg-[#1A1B2E] border border-white/5 flex items-center justify-center flex-none shadow-xl">
                         <BarChart2 size={24} className="text-emerald-400" />
                     </div>
                     <div>
                         <h3 className="text-lg font-bold text-white mb-1">Insightful Analytics</h3>
                         <p className="text-sm text-slate-400 leading-relaxed">Detailed heatmaps and performance data to visualize exactly how your time is spent.</p>
                     </div>
                 </div>
             </div>
          </div>

          {/* Right Panel: Form Section */}
          <div className="p-4 lg:p-20 flex flex-col justify-center bg-[#0B0F17] lg:bg-[#0B0F17]/80 lg:backdrop-blur-3xl border-t lg:border-t-0 lg:border-l border-white/5 relative">
             <div className="w-full max-w-md mx-auto">
                 <div className="text-center mb-10">
                     <h2 className="text-4xl font-bold text-white mb-3">Get Started</h2>
                     <p className="text-slate-400">Sign in to sync your progress across devices.</p>
                 </div>

                 <button 
                    onClick={signInWithGoogle}
                    className="w-full h-14 bg-[#1e293b]/50 hover:bg-[#1e293b] border border-white/10 rounded-xl flex items-center justify-center gap-3 transition-all group font-medium text-white mb-10"
                 >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                 </button>

                 <div className="mt-8 text-center space-y-4">
                     <div className="pt-4">
                        <button 
                            onClick={continueAsGuest}
                            className="text-xs font-bold text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors border-b border-transparent hover:border-slate-600"
                        >
                            Continue as Guest
                        </button>
                     </div>
                 </div>
             </div>
          </div>

      </div>
    </div>
  );
};
