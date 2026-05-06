
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'info';
  // Fix: Added style property to allow passing CSS properties like 'color' to the root div
  style?: React.CSSProperties;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  showText = false, 
  textColor = "text-white",
  size = 'md',
  variant = 'default',
  // Fix: Extracting style from props to apply it to the container div
  style
}) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    // Fix: Applying the style prop to the root div
    <div className={`flex items-center space-x-3 ${className}`} style={style}>
      <div className={`${sizeMap[size]} relative flex-shrink-0`}>
        {/* Outer Glow/Circle */}
        <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm transform rotate-6 scale-95"></div>
        
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 filter drop-shadow-md"
        >
          {/* Main Leaf Shape */}
          <path 
            d="M50 95C50 95 85 75 85 40C85 15 65 5 50 5C35 5 15 15 15 40C15 75 50 95 50 95Z" 
            fill="#FFFFFF" 
          />
          
          {/* Green Leaf Fill */}
          <path 
            d="M50 85C50 85 75 68 75 40C75 22 62 15 50 15C38 15 25 22 25 40C25 68 50 85 50 85Z" 
            fill="#0A8A1F" 
          />

          {variant === 'info' ? (
            /* Information 'i' integrated into leaf */
            <g>
              <rect x="46" y="38" width="8" height="30" rx="4" fill="white" />
              <circle cx="50" cy="28" r="5" fill="white" />
            </g>
          ) : (
            /* Standard Tech Nodes */
            <>
              <path 
                d="M50 15V85" 
                stroke="white" 
                strokeWidth="3" 
                strokeLinecap="round" 
                opacity="0.5"
              />
              <path 
                d="M35 40C35 40 42 45 50 45C58 45 65 40 65 40" 
                stroke="white" 
                strokeWidth="4" 
                strokeLinecap="round" 
              />
              <circle cx="50" cy="45" r="4" fill="white" />
              <circle cx="35" cy="40" r="3" fill="#A7F3D0" />
              <circle cx="65" cy="40" r="3" fill="#A7F3D0" />
            </>
          )}
          
          {/* Sparkle */}
          <path 
            d="M75 20L78 23M75 26L78 23M81 23L78 23" 
            stroke="#FBBF24" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`text-2xl font-black tracking-tighter ${textColor}`}>
            Krishi <span className="text-green-300">AI</span>
          </span>
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] opacity-70 ${textColor}`}>
            Smart Agri Ecosystem
          </span>
        </div>
      )}
    </div>
  );
};
