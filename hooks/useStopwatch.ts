
import { useState, useEffect, useRef, useCallback } from 'react';
import { ActiveTimerState, TimerStatus, TimerMode } from '../types';
import { saveActiveState, loadActiveState, clearActiveState, calculateElapsed } from '../services/timerState';
import { dbService } from '../services/db';

interface UseStopwatchReturn {
  elapsedMs: number;
  status: TimerStatus;
  mode: TimerMode;
  currentSubjectId: string;
  setSubjectId: (id: string) => void;
  setMode: (mode: TimerMode) => void;
  start: () => void;
  pause: () => void;
  stop: () => Promise<void>;
  reset: () => void;
}

export const useStopwatch = (
  initialSubjectId: string, 
  onSessionComplete: () => void
): UseStopwatchReturn => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [mode, setModeState] = useState<TimerMode>('stopwatch');
  const [currentSubjectId, setCurrentSubjectId] = useState(initialSubjectId);
  
  const intervalRef = useRef<number | null>(null);

  // Load state on mount
  useEffect(() => {
    const savedState = loadActiveState();
    if (savedState) {
      setStatus(savedState.status);
      setCurrentSubjectId(savedState.subjectId);
      setModeState(savedState.mode || 'stopwatch');
      setElapsedMs(calculateElapsed(savedState));
    }
  }, []);

  // Timer Tick Loop (using setInterval for background persistence)
  useEffect(() => {
    if (status === 'running') {
      const tick = () => {
        const savedState = loadActiveState();
        if (savedState && savedState.status === 'running') {
            setElapsedMs(calculateElapsed(savedState));
        }
      };
      
      // 100ms interval for responsive UI, throttles to 1s in background tabs
      intervalRef.current = window.setInterval(tick, 100); 
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status]);

  const start = useCallback(() => {
    const now = Date.now();
    const newState: ActiveTimerState = {
      status: 'running',
      mode,
      subjectId: currentSubjectId,
      startTime: now,
      accumulatedTime: elapsedMs,
    };
    saveActiveState(newState);
    setStatus('running');
  }, [currentSubjectId, elapsedMs, mode]);

  const pause = useCallback(() => {
    // When pausing, we calculate the total time up to now and store it as accumulated
    // We clear startTime because there is no active "running" segment
    const currentTotal = calculateElapsed(loadActiveState());
    
    const newState: ActiveTimerState = {
      status: 'paused',
      mode,
      subjectId: currentSubjectId,
      startTime: null,
      accumulatedTime: currentTotal,
    };
    saveActiveState(newState);
    setElapsedMs(currentTotal);
    setStatus('paused');
  }, [currentSubjectId, mode]);

  const stop = useCallback(async () => {
    const finalTime = calculateElapsed(loadActiveState());
    
    if (finalTime > 1000) { // Only save if > 1 second
      const session = {
        id: crypto.randomUUID(),
        subjectId: currentSubjectId,
        startTime: Date.now() - finalTime, // Approximation of start
        endTime: Date.now(),
        durationMs: finalTime,
        dateString: new Date().toISOString().split('T')[0],
      };
      
      // Save session and get level up status
      const { levelUp, newLevel } = await dbService.saveSession(session);
      
      if (levelUp) {
          // Dispatch a custom event for the UI to handle celebration
          const event = new CustomEvent('ekagra_levelup', { 
              detail: { level: newLevel } 
          });
          window.dispatchEvent(event);
      }

      onSessionComplete();
    }

    reset();
  }, [currentSubjectId, onSessionComplete]);

  const reset = useCallback(() => {
    clearActiveState();
    setStatus('idle');
    setElapsedMs(0);
  }, []);

  const setSubjectId = useCallback((id: string) => {
    if (status === 'idle') {
      setCurrentSubjectId(id);
    } else {
      const currentState = loadActiveState();
      if (currentState) {
        currentState.subjectId = id;
        saveActiveState(currentState);
      }
      setCurrentSubjectId(id);
    }
  }, [status]);

  const setMode = useCallback((newMode: TimerMode) => {
      if (status !== 'idle') return; // Only allow changing mode when idle
      setModeState(newMode);
  }, [status]);

  return {
    elapsedMs,
    status,
    mode,
    currentSubjectId,
    setSubjectId,
    setMode,
    start,
    pause,
    stop,
    reset
  };
};
