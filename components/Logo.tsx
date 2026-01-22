import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  isMaster?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, size = 40, isMaster = false }) => {
  const primaryColor = isMaster ? '#FACC15' : '#2563eb'; // Золотой или Синий
  const secondaryColor = isMaster ? '#EAB308' : '#1d4ed8';
  
  return (
    <div 
      className={`relative flex items-center justify-center transition-all duration-500 ${className}`} 
      style={{ width: size, height: size * 1 }}
    >
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-xl ${isMaster ? 'drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]' : ''}`}
      >
        {/* Background Shield/Circle */}
        <path 
          d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 L50 5Z" 
          fill={isMaster ? '#1e293b' : 'white'} 
          stroke={primaryColor} 
          strokeWidth="3"
        />
        
        {/* Construction Element (Crane/House) */}
        <path 
          d="M30 70 L30 40 L50 25 L70 40 L70 70 Z" 
          fill={primaryColor} 
          opacity={isMaster ? "1" : "0.1"}
        />
        
        {/* Initial Z */}
        <path 
          d="M35 35 H65 L35 65 H65" 
          stroke={isMaster ? "white" : primaryColor} 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Master Crown if Admin */}
        {isMaster && (
          <path 
            d="M35 15 L42 22 L50 15 L58 22 L65 15" 
            stroke="#FACC15" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />
        )}
      </svg>
    </div>
  );
};