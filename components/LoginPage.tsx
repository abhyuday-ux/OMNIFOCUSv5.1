
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Zap, BarChart2, Timer, Workflow, CheckCircle2, Shield, ArrowRight, Layout, Calendar, CheckSquare } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

const SHOWCASE_ITEMS = [
  {
    title: "Command Center",
    description: "Your mission control for productivity. Get a bird's-eye view of your daily progress, focus rhythm, and active streaks in one beautiful interface.",
    image: "https://i.ibb.co/7JQz3mtH/image.png"
  },
  {
    title: "Deep Focus Zone",
    description: "Enter a distraction-free state with our precision timer. Customize intervals, track sessions, and immerse yourself in work.",
    image: "https://i.ibb.co/HfmcGh5D/image.png"
  },
  {
    title: "Zen Mode",
    description: "Achieve flow state with immersive, full-screen backgrounds. Minimalist visuals help you stay locked in for hours.",
    image: "https://i.ibb.co/svzGgFqZ/image.png"
  },
  {
    title: "Habit Forge",
    description: "Build lasting rituals. Visualize your consistency with heatmaps and advanced streak tracking to maintain momentum.",
    image: "https://i.ibb.co/twLV1SyM/image.png"
  },
  {
    title: "Mindful Reflection",
    description: "Daily journaling designed for growth. Track energy levels, stress, and gratitude to optimize your mental performance.",
    image: "https://i.ibb.co/bnQ5p5v/image.png"
  },
  {
    title: "Advanced Analytics",
    description: "Data-driven insights for your brain. Analyze study patterns, subject breakdowns, and session quality over time.",
    image: "https://i.ibb.co/nqQjLY2g/image.png"
  }
];

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, continueAsGuest } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const { scrollY } = useScroll();
  
  const backgroundY = useTransform(scrollY, [0, 1000], [0, 200]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerSpin = () => {
      if (isSpinning) return;
      setIsSpinning(true);
      setTimeout(() => setIsSpinning(false), 700);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
    visible: { 
        opacity: 1, 
        y: 0, 
        filter: 'blur(0px)',
        transition: { type: "spring", stiffness: 40, damping: 10 } 
    }
  };

  return (
    <div className="min-h-screen bg-[#050511] text-slate-200 font-sans selection:bg-cyan-500/30 flex flex-col relative overflow-x-hidden">
      
      {/* Dynamic Background */}
      <motion.div style={{ y: backgroundY }} className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-cyan-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[8000ms]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[10000ms]" />
          <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-emerald-500/5 blur-[150px] rounded-full mix-blend-screen" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </motion.div>

      {/* Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-20"
      >
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={triggerSpin}>
            <div 
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-transform"
                style={{ animation: isSpinning ? 'spin 0.7s ease-in-out' : 'none' }}
            >
                <Zap size={16} fill="white" className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-wide text-white">EKAGRAZONE</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
              <span className="flex items-center gap-1.5"><Shield size={14} className="text-emerald-400"/> Local-First & Private</span>
              <span>v1.0</span>
          </div>
      </motion.nav>

      {/* Main Hero Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10 py-12 lg:py-20">
          
          {/* Left Column: Copy & Actions */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 max-w-2xl"
          >
             
             {/* Badge */}
             <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                The Ultimate Zen Focus OS
             </motion.div>

             {/* Headline */}
             <motion.h1 variants={itemVariants} className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1]">
                Master your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">flow state.</span>
             </motion.h1>

             <motion.p variants={itemVariants} className="text-lg text-slate-400 leading-relaxed max-w-lg">
                Stop juggling apps. Ekagrazone combines a pro-grade timer, habit tracker, and analytics engine into one beautiful, local-first workspace.
             </motion.p>

             {/* Action Buttons */}
             <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4">
                 <button 
                    onClick={signInWithGoogle}
                    className="h-14 px-8 bg-white text-slate-900 hover:bg-slate-100 rounded-xl flex items-center justify-center gap-3 transition-all font-bold text-base shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 group relative overflow-hidden"
                 >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Start Syncing
                 </button>
                 <button 
                    onClick={continueAsGuest}
                    className="h-14 px-8 bg-slate-800/50 hover:bg-slate-800 border border-white/10 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-white hover:border-white/20"
                 >
                    Try as Guest <ArrowRight size={16} />
                 </button>
             </motion.div>

             {/* Features Grid (Bento Style with "Screenshots") */}
             <motion.div variants={containerVariants} className="grid grid-cols-2 gap-4 pt-8">
                 {/* Feature 1: Timer */}
                 <motion.div variants={itemVariants} className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 backdrop-blur-sm hover:bg-white/5 transition-colors overflow-hidden group hover:-translate-y-1 duration-300">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400"><Timer size={18} /></div>
                        <h3 className="font-bold text-slate-200 text-sm">Focus Timer</h3>
                     </div>
                     {/* Mini UI Mockup */}
                     <div className="w-full h-24 bg-slate-950/50 rounded-lg border border-white/5 relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                        <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 flex items-center justify-center relative">
                            <motion.div 
                                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-12 h-12 rounded-full bg-cyan-500/10" 
                            />
                            <span className="absolute text-[10px] font-mono font-bold text-white">25:00</span>
                        </div>
                     </div>
                 </motion.div>

                 {/* Feature 2: Analytics */}
                 <motion.div variants={itemVariants} className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 backdrop-blur-sm hover:bg-white/5 transition-colors overflow-hidden group hover:-translate-y-1 duration-300">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><BarChart2 size={18} /></div>
                        <h3 className="font-bold text-slate-200 text-sm">Deep Analytics</h3>
                     </div>
                     {/* Mini UI Mockup */}
                     <div className="w-full h-24 bg-slate-950/50 rounded-lg border border-white/5 relative flex items-end justify-between px-3 pb-3 gap-1 overflow-hidden">
                        <motion.div initial={{ height: '10%' }} animate={{ height: '50%' }} transition={{ delay: 0.5 }} className="w-1/5 bg-emerald-500/20 rounded-t-sm"></motion.div>
                        <motion.div initial={{ height: '10%' }} animate={{ height: '75%' }} transition={{ delay: 0.6 }} className="w-1/5 bg-emerald-500/40 rounded-t-sm"></motion.div>
                        <motion.div initial={{ height: '10%' }} animate={{ height: '60%' }} transition={{ delay: 0.7 }} className="w-1/5 bg-emerald-500/30 rounded-t-sm"></motion.div>
                        <motion.div initial={{ height: '10%' }} animate={{ height: '100%' }} transition={{ delay: 0.8 }} className="w-1/5 bg-emerald-500 rounded-t-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]"></motion.div>
                        <motion.div initial={{ height: '10%' }} animate={{ height: '50%' }} transition={{ delay: 0.9 }} className="w-1/5 bg-emerald-500/20 rounded-t-sm"></motion.div>
                     </div>
                 </motion.div>

                 {/* Feature 3: Habit Forge */}
                 <motion.div variants={itemVariants} className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 backdrop-blur-sm hover:bg-white/5 transition-colors overflow-hidden group hover:-translate-y-1 duration-300">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400"><Workflow size={18} /></div>
                        <h3 className="font-bold text-slate-200 text-sm">Habit Forge</h3>
                     </div>
                     {/* Mini UI Mockup */}
                     <div className="w-full h-24 bg-slate-950/50 rounded-lg border border-white/5 relative flex flex-col justify-center px-3 gap-2 overflow-hidden">
                        <div className="flex items-center gap-2">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }} className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center text-[8px] text-black font-bold">✓</motion.div>
                            <div className="h-2 w-16 bg-slate-800 rounded-full"></div>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <div className="w-4 h-4 rounded border border-slate-700"></div>
                            <div className="h-2 w-12 bg-slate-800 rounded-full"></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2 }} className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center text-[8px] text-black font-bold">✓</motion.div>
                            <div className="h-2 w-20 bg-slate-800 rounded-full"></div>
                        </div>
                     </div>
                 </motion.div>

                 {/* Feature 4: Task Planner */}
                 <motion.div variants={itemVariants} className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 backdrop-blur-sm hover:bg-white/5 transition-colors overflow-hidden group hover:-translate-y-1 duration-300">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400"><Calendar size={18} /></div>
                        <h3 className="font-bold text-slate-200 text-sm">Task Planner</h3>
                     </div>
                     {/* Mini UI Mockup */}
                     <div className="w-full h-24 bg-slate-950/50 rounded-lg border border-white/5 relative flex gap-1 p-2 overflow-hidden">
                        <div className="flex-1 bg-slate-800/50 rounded flex flex-col gap-1 p-1">
                            <div className="h-1.5 w-8 bg-slate-700 rounded"></div>
                            <div className="h-6 w-full bg-slate-700/50 rounded border border-white/5"></div>
                            <div className="h-6 w-full bg-slate-700/50 rounded border border-white/5"></div>
                        </div>
                        <div className="flex-1 bg-slate-800/50 rounded flex flex-col gap-1 p-1">
                            <div className="h-1.5 w-8 bg-slate-700 rounded"></div>
                            <div className="h-6 w-full bg-pink-500/20 rounded border border-pink-500/30"></div>
                        </div>
                     </div>
                 </motion.div>
             </motion.div>
          </motion.div>

          {/* Right Column: 3D UI Showcase */}
          <div className="relative hidden lg:block h-[600px] w-full perspective-1000">
              <MockInterface />
          </div>

      </div>

      {/* FEATURE SHOWCASE SECTIONS */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24 space-y-32">
        {SHOWCASE_ITEMS.map((item, index) => (
            <motion.div 
                key={index}
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-24`}
            >
                {/* Text Side */}
                <div className="flex-1 space-y-6">
                    <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        whileInView={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-xs font-bold uppercase tracking-widest shadow-sm"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                        Feature {index + 1}
                    </motion.div>
                    <motion.h2 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight"
                    >
                        {item.title}
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-lg text-slate-400 leading-relaxed max-w-xl"
                    >
                        {item.description}
                    </motion.p>
                </div>

                {/* Image Side */}
                <div className="flex-1 w-full">
                    <motion.div 
                        whileHover={{ scale: 1.02, rotateY: index % 2 === 0 ? 2 : -2 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className="relative group rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500"
                    >
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10" />
                        <img 
                            src={item.image} 
                            alt={item.title} 
                            className="w-full h-auto transform transition-transform duration-700"
                            loading="lazy"
                        />
                    </motion.div>
                </div>
            </motion.div>
        ))}
      </div>
      
      {/* Simple Footer */}
      <div className="w-full text-center py-12 text-[10px] text-slate-600 font-mono relative z-10 border-t border-white/5 mt-12 bg-[#050511]">
          <p>DESIGNED & BUILT BY ABHYUDAY</p>
      </div>
    </div>
  );
};

// --- Mock UI Components for the "Screenshot" effect ---

const MockInterface = () => {
    return (
        <motion.div 
            initial={{ opacity: 0, x: 100, rotateY: -20 }}
            animate={{ opacity: 1, x: 0, rotateY: -10 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            className="relative w-full h-full transform hover:rotate-y-[-5deg] hover:rotate-x-[2deg] transition-transform duration-700 ease-out preserve-3d"
        >
            
            {/* Main Window */}
            <div className="absolute inset-0 bg-[#0f172a] rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                {/* Window Controls */}
                <div className="h-12 border-b border-white/5 bg-slate-900/50 flex items-center px-6 gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Mock */}
                    <div className="w-20 border-r border-white/5 flex flex-col items-center py-6 gap-6 bg-slate-900/30">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400"><Layout size={20} /></div>
                        <div className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-slate-500"><Timer size={20} /></div>
                        <div className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-slate-500"><BarChart2 size={20} /></div>
                        <div className="mt-auto w-8 h-8 rounded-full bg-slate-800" />
                    </div>

                    {/* Dashboard Content Mock */}
                    <div className="flex-1 p-8 bg-slate-950/50 relative">
                        <div className="mb-8">
                            <div className="h-8 w-48 bg-slate-800 rounded-lg mb-2" />
                            <div className="h-4 w-32 bg-slate-800/50 rounded-lg" />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Big Timer Card */}
                            <div className="col-span-2 bg-slate-900/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex items-center justify-between">
                                <div>
                                    <div className="h-4 w-24 bg-cyan-500/20 rounded-full mb-4" />
                                    <div className="text-5xl font-mono font-bold text-white tracking-tighter">24:59</div>
                                    <div className="flex gap-2 mt-4">
                                        <div className="h-10 w-24 bg-cyan-600 rounded-xl" />
                                        <div className="h-10 w-10 bg-white/10 rounded-xl" />
                                    </div>
                                </div>
                                <div className="w-32 h-32 rounded-full border-4 border-cyan-500/30 relative flex items-center justify-center">
                                    <div className="w-24 h-24 rounded-full bg-cyan-500/10 animate-pulse" />
                                </div>
                            </div>

                            {/* Stat Card 1 */}
                            <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20" />
                                    <div className="text-xs text-emerald-400 font-bold">+12%</div>
                                </div>
                                <div className="h-8 w-20 bg-white/10 rounded-lg mb-1" />
                                <div className="h-3 w-12 bg-white/5 rounded-lg" />
                            </div>

                            {/* Stat Card 2 */}
                            <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-8 w-8 rounded-lg bg-orange-500/20" />
                                    <div className="text-xs text-orange-400 font-bold">5 Day</div>
                                </div>
                                <div className="h-8 w-12 bg-white/10 rounded-lg mb-1" />
                                <div className="h-3 w-24 bg-white/5 rounded-lg" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Elements for Depth */}
            
            {/* Floating Task List */}
            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: [0, -15, 0], opacity: 1 }}
                transition={{ 
                    opacity: { delay: 0.8, duration: 0.5 },
                    y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute -right-12 top-20 w-64 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl transform rotate-y-12 rotate-z-2"
            >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                    <span className="text-xs font-bold text-slate-300 uppercase">Today's Tasks</span>
                    <span className="text-xs text-slate-500">3/5</span>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 opacity-50">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <div className="h-2 w-32 bg-slate-700 rounded-full" />
                    </div>
                    <div className="flex items-center gap-3 opacity-50">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <div className="h-2 w-24 bg-slate-700 rounded-full" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 border-cyan-500" />
                        <div className="h-2 w-28 bg-cyan-400/50 rounded-full" />
                    </div>
                </div>
            </motion.div>

            {/* Floating Notification */}
            <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1, y: [0, -10, 0] }}
                transition={{ 
                    opacity: { delay: 1.1, duration: 0.5 },
                    x: { delay: 1.1, duration: 0.5 },
                    y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }
                }}
                className="absolute -left-8 bottom-32 w-auto flex items-center gap-3 bg-slate-800/90 backdrop-blur-xl border border-emerald-500/20 p-3 pr-6 rounded-full shadow-2xl transform -rotate-y-12 -rotate-z-2"
            >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Zap size={18} fill="currentColor" />
                </div>
                <div>
                    <div className="text-xs font-bold text-white">Focus Streak!</div>
                    <div className="text-[10px] text-emerald-400">You hit 4 hours today.</div>
                </div>
            </motion.div>

        </motion.div>
    );
}
