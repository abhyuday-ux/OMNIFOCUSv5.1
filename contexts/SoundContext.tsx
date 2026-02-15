
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { dbService } from '../services/db';
import { CustomSound } from '../types';

// Extend SoundType to just be string to support IDs dynamically
export type SoundType = string | null;

export interface SoundOption {
  id: string;
  label: string;
  src: string;
  icon: string;
  isCustom?: boolean;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'rain', label: 'Rain', icon: 'cloud-rain', src: 'https://assets.mixkit.co/active_storage/sfx/1253/1253-preview.mp3' },
  { id: 'forest', label: 'Forest', icon: 'tree-pine', src: 'https://assets.mixkit.co/active_storage/sfx/1210/1210-preview.mp3' },
  { id: 'waves', label: 'Ocean', icon: 'waves', src: 'https://assets.mixkit.co/active_storage/sfx/1196/1196-preview.mp3' },
];

interface SoundContextType {
  currentSound: SoundType;
  isPlaying: boolean;
  volume: number;
  allSounds: SoundOption[]; // Added to expose combined list
  playSound: (id: SoundType) => void;
  togglePlay: () => void;
  setVolume: (vol: number) => void;
  addCustomSound: (sound: CustomSound) => Promise<void>;
  removeCustomSound: (id: string) => Promise<void>;
}

const SoundContext = createContext<SoundContextType>({
  currentSound: null,
  isPlaying: false,
  volume: 0.5,
  allSounds: SOUND_OPTIONS,
  playSound: () => {},
  togglePlay: () => {},
  setVolume: () => {},
  addCustomSound: async () => {},
  removeCustomSound: async () => {},
});

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSound, setCurrentSound] = useState<SoundType>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [customSounds, setCustomSounds] = useState<SoundOption[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio Object & Load Custom Sounds
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    audioRef.current.crossOrigin = "anonymous"; // Try anonymous for CORS
    
    // Error handling
    audioRef.current.onerror = (e) => {
        console.error("Audio Playback Error", audioRef.current?.error);
        setIsPlaying(false);
    };

    const loadData = () => {
        // Load saved settings
        const savedVol = localStorage.getItem('ekagrazone_sound_volume');
        if (savedVol) setVolumeState(parseFloat(savedVol));
        loadCustomSounds();
    };

    loadData();

    // Listen for cloud sync
    const handleSync = () => loadData();
    window.addEventListener('ekagrazone_sync_complete', handleSync);

    return () => {
      window.removeEventListener('ekagrazone_sync_complete', handleSync);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const loadCustomSounds = async () => {
      try {
          const sounds = await dbService.getCustomSounds();
          // Map to SoundOption
          const formatted = sounds.map(s => ({
              id: s.id,
              label: s.label,
              src: s.src,
              icon: 'music', // Default icon for custom sounds
              isCustom: true
          }));
          setCustomSounds(formatted);
      } catch (e) {
          console.error("Failed to load custom sounds", e);
      }
  };

  const allSounds = [...SOUND_OPTIONS, ...customSounds];

  // Handle Play/Pause/Source changes
  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.volume = volume;

    if (currentSound) {
      const soundData = allSounds.find(s => s.id === currentSound);
      if (soundData) {
        // Only change src if it's different to prevent restart
        const currentSrc = audioRef.current.src;
        // Basic check for src change. Note: Browser absolute URL handling makes exact match tricky sometimes.
        // We use a simple includes or check if audio is paused and needs src.
        if (audioRef.current.src !== soundData.src && !audioRef.current.src.endsWith(soundData.src)) {
            audioRef.current.src = soundData.src;
            audioRef.current.load(); // Ensure load is called after src change
        }
        
        if (isPlaying) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("Audio playback error:", error);
                setIsPlaying(false);
            });
          }
        } else {
          audioRef.current.pause();
        }
      } else {
          // Sound not found (maybe deleted custom sound)
          setIsPlaying(false);
      }
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentSound, isPlaying, allSounds]);

  // Handle Volume changes separately to avoid reloading src
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = volume;
      }
  }, [volume]);

  const playSound = (id: SoundType) => {
    if (currentSound === id) {
      // If clicking same sound, toggle
      togglePlay();
    } else {
      setCurrentSound(id);
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (!currentSound && !isPlaying) {
        // Default to rain if nothing selected
        setCurrentSound('rain');
    }
    setIsPlaying(prev => !prev);
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    localStorage.setItem('ekagrazone_sound_volume', vol.toString());
    // Trigger sync for volume
    dbService.syncSettingsToCloud().catch(console.error);
  };

  const addCustomSound = async (sound: CustomSound) => {
      await dbService.saveCustomSound(sound);
      await loadCustomSounds();
  };

  const removeCustomSound = async (id: string) => {
      if (currentSound === id) {
          setIsPlaying(false);
          setCurrentSound(null);
      }
      await dbService.deleteCustomSound(id);
      await loadCustomSounds();
  };

  return (
    <SoundContext.Provider value={{ currentSound, isPlaying, volume, allSounds, playSound, togglePlay, setVolume, addCustomSound, removeCustomSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => useContext(SoundContext);
