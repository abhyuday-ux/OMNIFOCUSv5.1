
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Zap, ShieldCheck, Cloud, Layout, ArrowRight, User } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, continueAsGuest } = useAuth();

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen opacity-50 animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full mix-blend-screen opacity-50" />
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
          
          {/* Left Column: Branding */}
          <div className="space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <Zap size={14} fill="currentColor" />
                  <span>Version 2.0 Live</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">OMNI</span>FOCUS
              </h1>
              
              <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto md:mx-0">
                  The ultimate local-first study tracker. Now with cloud sync to keep your progress unified across all your devices.
              </p>

              <div className="flex flex-col gap-4 max-w-sm mx-auto md:mx-0">
                   <div className="flex items-center gap-3 text-slate-300">
                       <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><Layout size={20} /></div>
                       <span className="font-medium">Distraction-free Interface</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-300">
                       <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><Cloud size={20} /></div>
                       <span className="font-medium">Multi-device Cloud Sync</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-300">
                       <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400"><ShieldCheck size={20} /></div>
                       <span className="font-medium">Secure & Private</span>
                   </div>
              </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                  <Zap size={32} fill="white" className="text-white" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
              <p className="text-slate-400 text-sm mb-8 text-center">Sign in to sync your sessions, goals, and habits.</p>

              <button 
                  onClick={signInWithGoogle}
                  className="w-full bg-white text-slate-900 hover:bg-slate-200 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] group"
              >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in with Google
                  <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all" />
              </button>

              <div className="w-full flex items-center gap-4 my-6">
                 <div className="flex-1 h-px bg-white/10"></div>
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Or</span>
                 <div className="flex-1 h-px bg-white/10"></div>
              </div>

              <button 
                  onClick={continueAsGuest}
                  className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-semibold py-3 rounded-xl flex items-center justify-center gap-3 transition-all border border-white/5 hover:border-white/10"
              >
                  <User size={16} />
                  Continue as Guest
              </button>

              <div className="mt-8 pt-8 border-t border-white/5 w-full text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      Local First • Cloud Synced
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};
