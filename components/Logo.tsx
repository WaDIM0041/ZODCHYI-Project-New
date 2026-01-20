import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className, size = 40 }) => {
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`} 
      style={{ width: size, height: size * 0.8 }}
    >
      <svg 
        viewBox="0 0 300 150" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Main Logo Body - Stylized "ЗОДЧИЙ" in a pseudo-calligraphic style */}
        <g stroke="black" strokeWidth="8" strokeLinejoin="round" fill="#FACC15">
          {/* Stylized 'З' */}
          <path d="M40 120 C 10 120, 10 90, 10 70 C 10 50, 40 50, 40 50 C 40 50, 15 50, 15 30 C 15 10, 45 10, 60 10 L 60 30 C 60 30, 40 30, 40 40 C 40 50, 65 50, 65 75 C 65 100, 40 120, 40 120 Z" />
          {/* Stylized 'О' */}
          <path d="M75 120 C 55 120, 55 50, 75 50 L 105 50 C 125 50, 125 120, 105 120 Z M80 75 L 80 95 L 100 95 L 100 75 Z" />
          {/* Stylized 'Д' */}
          <path d="M125 120 L 125 50 L 175 50 L 175 120 L 195 120 L 195 140 L 175 140 L 175 120 L 125 120 L 125 140 L 105 140 L 105 120 Z" />
          {/* Stylized 'Ч' */}
          <path d="M195 50 L 195 80 C 195 100, 220 100, 220 100 L 220 50 L 240 50 L 240 120 L 220 120 L 220 120 Z" />
          {/* Stylized 'И' / 'Й' */}
          <path d="M250 120 L 250 50 L 270 50 L 270 95 L 290 50 L 310 50 L 310 120 L 290 120 L 290 75 L 270 120 Z" />
        </g>
        
        {/* Architectural element above - The Dome */}
        <g transform="translate(70, -10) scale(0.5)" fill="#FACC15" stroke="black" strokeWidth="6">
          <path d="M50 100 C 50 60, 60 40, 80 40 C 100 40, 110 60, 110 100 Z" />
          <path d="M80 40 C 80 20, 90 10, 80 0 C 70 10, 80 20, 80 40" />
          <circle cx="80" cy="0" r="8" />
        </g>
      </svg>
    </div>
  );
};