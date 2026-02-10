import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Timer, Sparkles, BarChart3, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginPageProps {
  onClose: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onClose }) => {
  const { signInWithGoogle, signupWithEmail, loginWithEmail } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!isLoginMode && !agreed) {
        alert("Please agree to the Terms of Service.");
        return;
    }

    setIsSubmitting(true);
    try {
        if (isLoginMode) {
            await loginWithEmail(email, password);
        } else {
            await signupWithEmail(email, password);
        }
        onClose(); // Close on success
    } catch (e) {
        // Error handled in AuthContext
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-[#0f172a] text-slate-100 overflow-y-auto lg:overflow-hidden">
      
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex w-[45%] bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] relative overflow-hidden flex-col p-12 justify-between">
         {/* Background Effects */}
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />
         <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

         {/* Header */}
         <div className="relative z-10">
             <div className="flex items-center gap-3 mb-16">
                 <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                     <Zap size={24} className="text-white fill-white" />
                 </div>
                 <span className="text-2xl font-bold italic tracking-wide text-white">OMNIFOCUS</span>
             </div>

             <div className="mb-12">
                 <h1 className="text-6xl leading-[1.1] mb-6 font-serif-display">
                     <span className="italic font-light opacity-90">Achieve</span><br/>
                     <span className="italic font-light opacity-90">your</span><br/>
                     <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">Flow State.</span>
                 </h1>
                 <p className="text-indigo-200/60 text-lg leading-relaxed max-w-md">
                     The ultimate toolkit for high-performers. Designed to help you focus, build habits, and track every milestone.
                 </p>
             </div>
         </div>

         {/* Feature Cards */}
         <div className="relative z-10 space-y-4 max-w-md">
             {/* Card 1 */}
             <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-start gap-4 hover:bg-white/10 transition-colors">
                 <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-300">
                     <Timer size={20} />
                 </div>
                 <div>
                     <h3 className="font-bold text-white mb-1">Deep Focus Timer</h3>
                     <p className="text-xs text-indigo-200/50 leading-relaxed">Immerse yourself in work with our flow state optimizer and distraction blocker.</p>
                 </div>
             </div>

             {/* Card 2 */}
             <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-start gap-4 hover:bg-white/10 transition-colors">
                 <div className="p-3 bg-purple-500/20 rounded-xl text-purple-300">
                     <Sparkles size={20} />
                 </div>
                 <div>
                     <h3 className="font-bold text-white mb-1">Smart Habit Tracker</h3>
                     <p className="text-xs text-indigo-200/50 leading-relaxed">Build unbreakable routines with AI-driven habit suggestions and streaks.</p>
                 </div>
             </div>

             {/* Card 3 */}
             <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-start gap-4 hover:bg-white/10 transition-colors">
                 <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-300">
                     <BarChart3 size={20} />
                 </div>
                 <div>
                     <h3 className="font-bold text-white mb-1">Insightful Analytics</h3>
                     <p className="text-xs text-indigo-200/50 leading-relaxed">Visualize your performance data and see exactly where your time goes.</p>
                 </div>
             </div>
         </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-[55%] bg-[#0B0F15] flex flex-col justify-center items-center p-6 sm:p-12 relative">
          
          {/* Back Button (Mobile mainly, or close) */}
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors">
              <span className="sr-only">Close</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          <div className="w-full max-w-md">
              <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-3xl font-bold text-white mb-3">
                      {isLoginMode ? 'Welcome Back' : 'Get Started'}
                  </h2>
                  <p className="text-slate-400">
                      {isLoginMode ? 'Enter your details to access your workspace.' : 'Join thousands of high-achievers today.'}
                  </p>
              </div>

              {/* Google Button */}
              <button 
                onClick={() => { signInWithGoogle().then(onClose); }}
                className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3.5 rounded-xl transition-all mb-8 group"
              >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="group-hover:text-white text-slate-200">Sign {isLoginMode ? 'in' : 'up'} with Google</span>
              </button>

              <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative bg-[#0B0F15] px-4 text-[10px] uppercase font-bold text-slate-500 tracking-widest">
                      Or use email
                  </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors"
                      />
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors"
                      />
                  </div>

                  {!isLoginMode && (
                      <div className="flex items-start gap-3 pt-1">
                          <button
                            type="button" 
                            onClick={() => setAgreed(!agreed)}
                            className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${agreed ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-900 border-slate-700'}`}
                          >
                              {agreed && <CheckCircle2 size={14} className="text-white" />}
                          </button>
                          <p className="text-sm text-slate-400 leading-snug">
                              I agree to the <a href="#" className="text-indigo-400 hover:text-indigo-300">Terms of Service</a> and <a href="#" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</a>.
                          </p>
                      </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isSubmitting || (!isLoginMode && !agreed)}
                    className={`
                        w-full py-4 rounded-xl font-bold text-white text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2
                        ${isSubmitting ? 'bg-indigo-700 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99]'}
                        ${!isLoginMode && !agreed ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                      {isSubmitting ? 'Processing...' : (isLoginMode ? 'Log In' : 'Create Your Account')}
                      {!isSubmitting && <ArrowRight size={16} />}
                  </button>
              </form>

              <div className="mt-8 text-center">
                  <p className="text-slate-400 text-sm">
                      {isLoginMode ? "Don't have an account?" : "Already have an account?"}
                      <button 
                        onClick={() => setIsLoginMode(!isLoginMode)}
                        className="ml-2 text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                      >
                          {isLoginMode ? 'Sign up' : 'Log in'}
                      </button>
                  </p>
              </div>

              {/* Footer Logo Mobile */}
              <div className="mt-12 flex justify-center lg:hidden opacity-50">
                  <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center">
                          <Zap size={14} className="text-white fill-white" />
                      </div>
                      <span className="font-bold text-white italic">OMNIFOCUS</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};