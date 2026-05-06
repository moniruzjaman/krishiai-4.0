
import React from 'react';
import { User } from '../types';

interface FarmerAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showProgress?: boolean;
  className?: string;
  onClick?: () => void;
}

const RANKS_CONFIG: Record<string, { color: string, ring: string, glow: string, icon: string }> = {
  'নবিশ কৃষক': { color: 'bg-emerald-500', ring: 'text-emerald-500', glow: 'shadow-emerald-200', icon: '🌱' },
  'উন্নয়নশীল কৃষক': { color: 'bg-blue-500', ring: 'text-blue-500', glow: 'shadow-blue-200', icon: '🌿' },
  'অভিজ্ঞ কৃষক': { color: 'bg-indigo-600', ring: 'text-indigo-600', glow: 'shadow-indigo-200', icon: '🌳' },
  'মাস্টার এগ্রোনোমিস্ট': { color: 'bg-amber-500', ring: 'text-amber-500', glow: 'shadow-amber-300', icon: '👑' },
};

export const FarmerAvatar: React.FC<FarmerAvatarProps> = ({ 
  user, 
  size = 'md', 
  showProgress = true,
  className = "",
  onClick 
}) => {
  const rank = user.progress.rank || 'নবিশ কৃষক';
  const config = RANKS_CONFIG[rank] || RANKS_CONFIG['নবিশ কৃষক'];
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    '2xl': 'w-40 h-40'
  };

  const ringSizes = {
    sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6
  };

  // Calculate XP percentage for the ring
  const getProgress = () => {
    const xp = user.progress.xp;
    if (rank === 'মাস্টার এগ্রোনোমিস্ট') return 100;
    const nextMilestone = rank === 'নবিশ কৃষক' ? 500 : rank === 'উন্নয়নশীল কৃষক' ? 2000 : 10000;
    const prevMilestone = rank === 'নবিশ কৃষক' ? 0 : rank === 'উন্নয়নশীল কৃষক' ? 500 : 2000;
    return ((xp - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
  };

  const progress = getProgress();
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div 
      className={`relative inline-block group ${className}`} 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Progress Ring */}
      {showProgress && (
        <svg className="absolute -inset-2 w-[calc(100%+1rem)] h-[calc(100%+1rem)] -rotate-90 transform">
          <circle
            cx="50%"
            cy="50%"
            r={`${radius}%`}
            stroke="currentColor"
            strokeWidth={ringSizes[size]}
            fill="transparent"
            className="text-slate-100 dark:text-slate-800"
          />
          <circle
            cx="50%"
            cy="50%"
            r={`${radius}%`}
            stroke="currentColor"
            strokeWidth={ringSizes[size]}
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-out' }}
            strokeLinecap="round"
            fill="transparent"
            className={`${config.ring} drop-shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
          />
        </svg>
      )}

      {/* Main Avatar Container */}
      <div className={`${sizeClasses[size]} relative rounded-[30%] overflow-hidden border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 shadow-xl transition-transform duration-500 group-hover:scale-105`}>
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-white font-black ${config.color}`}>
            <span style={{ fontSize: size === 'sm' ? '0.75rem' : size === 'md' ? '1.2rem' : '3rem' }}>
              {user.displayName?.charAt(0) || 'K'}
            </span>
          </div>
        )}
        
        {/* Shimmer Effect for Masters */}
        {rank === 'মাস্টার এগ্রোনোমিস্ট' && (
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_3s_infinite] pointer-events-none"></div>
        )}
      </div>

      {/* Rank Badge Overlay */}
      <div className={`absolute -bottom-1 -right-1 ${size === 'sm' ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[12px]'} bg-white dark:bg-slate-800 rounded-lg shadow-lg flex items-center justify-center border border-slate-100 dark:border-slate-700 z-10`}>
        {config.icon}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(150%); }
        }
      `}} />
    </div>
  );
};
