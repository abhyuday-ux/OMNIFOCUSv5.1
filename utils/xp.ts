
export const XP_PER_MINUTE = 10;

/**
 * Formula: XP = 100 * (Level - 1)^2
 * Inverse: Level = floor(sqrt(XP / 100)) + 1
 */
export const getLevelFromXP = (xp: number): number => {
    if (xp < 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
};

/**
 * Returns the total XP required to reach a specific level.
 */
export const getXPRequiredForLevel = (level: number): number => {
    if (level <= 1) return 0;
    return 100 * Math.pow(level - 1, 2);
};

export interface LevelProgress {
    currentLevel: number;
    nextLevel: number;
    currentXP: number;
    xpForCurrentLevel: number; // The XP amount where this level started
    xpForNextLevel: number; // The XP amount to hit the next level
    progressPercent: number;
    xpRemaining: number;
}

export const getLevelProgress = (totalXP: number): LevelProgress => {
    const currentLevel = getLevelFromXP(totalXP);
    const nextLevel = currentLevel + 1;
    
    const xpForCurrentLevel = getXPRequiredForLevel(currentLevel);
    const xpForNextLevel = getXPRequiredForLevel(nextLevel);
    
    const xpInCurrentLevel = totalXP - xpForCurrentLevel;
    const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
    
    // Avoid division by zero for Level 1 start
    const progressPercent = xpNeededForNextLevel === 0 
        ? 0 
        : Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));

    return {
        currentLevel,
        nextLevel,
        currentXP: totalXP,
        xpForCurrentLevel,
        xpForNextLevel,
        progressPercent,
        xpRemaining: xpForNextLevel - totalXP
    };
};

export interface RankInfo {
    title: string;
    color: string;
    border: string;
    bg: string;
    glow: string;
}

export const getRankInfo = (level: number): RankInfo => {
    if (level >= 50) return { title: 'ZEN MASTER', color: 'text-fuchsia-400', border: 'border-fuchsia-500/50', bg: 'bg-fuchsia-500/10', glow: 'shadow-fuchsia-500/20' };
    if (level >= 35) return { title: 'PLATINUM PRO', color: 'text-cyan-400', border: 'border-cyan-500/50', bg: 'bg-cyan-500/10', glow: 'shadow-cyan-500/20' };
    if (level >= 20) return { title: 'GOLDEN FOCUS', color: 'text-yellow-400', border: 'border-yellow-500/50', bg: 'bg-yellow-500/10', glow: 'shadow-yellow-500/20' };
    if (level >= 10) return { title: 'SILVER SEEKER', color: 'text-slate-300', border: 'border-slate-400/50', bg: 'bg-slate-400/10', glow: 'shadow-slate-400/10' };
    if (level >= 5) return { title: 'BRONZE GRINDER', color: 'text-orange-400', border: 'border-orange-500/50', bg: 'bg-orange-500/10', glow: 'shadow-orange-500/20' };
    return { title: 'UNRANKED', color: 'text-slate-500', border: 'border-slate-700/50', bg: 'bg-slate-800/30', glow: 'shadow-none' };
};
