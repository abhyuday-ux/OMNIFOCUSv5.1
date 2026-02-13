
import React from 'react';
import { Timer, BarChart3, CalendarDays, Settings, BookOpen, Repeat, Home, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export type MobileTab = 'dashboard' | 'timer' | 'timeline' | 'calendar' | 'settings' | 'journal' | 'habits' | 'social';

interface MobileNavProps {
  activeTab: MobileTab;
  setTab: (tab: MobileTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setTab }) => {
  const { accent } = useTheme();
  const tabs: { id: MobileTab; label: string; icon: React.FC<any> }[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'timer', label: 'Focus', icon: Timer },
    { id: 'timeline', label: 'Stats', icon: BarChart3 },
    { id: 'social', label: 'Social', icon: Users },
    { id: 'habits', label: 'Habits', icon: Repeat },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'calendar', label: 'Plan', icon: CalendarDays },
    { id: 'settings', label: 'Manage', icon: Settings },
  ];

  return (
    <div className="flex-none bg-slate-900 border-t border-slate-800 pb-safe z-50 overflow-x-auto no-scrollbar w-full">
      <div className="flex items-center h-16 px-4 gap-6 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex flex-col items-center justify-center w-auto h-full gap-1 transition-colors px-2 py-1 min-w-[3.5rem]
                ${isActive ? `text-${accent}-400` : 'text-slate-500 hover:text-slate-400'}
              `}
            >
              <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className="text-[10px] font-medium whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
