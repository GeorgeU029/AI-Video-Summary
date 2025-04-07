import React, {useState} from 'react'


function Logo({ 
  size = 'md', 
  showTooltip = true, 
  tooltipText = 'AI Video Summarizer',
  className = '', 
  showText = true
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const sizeMap = {
    sm: {
      container: 'gap-2',
      svg: 'w-8 h-8',
      text: 'text-lg',
      tooltipPosition: '-bottom-6',
      tooltipPadding: 'py-0.5 px-2',
      tooltipText: 'text-xs',
      indicatorSize: 'w-2 h-2',
      pulseIconSize: 'w-16 h-16',
    },
    md: {
      container: 'gap-3',
      svg: 'w-10 h-10',
      text: 'text-xl',
      tooltipPosition: '-bottom-7',
      tooltipPadding: 'py-0.5 px-3',
      tooltipText: 'text-sm',
      indicatorSize: 'w-2 h-2',
      pulseIconSize: 'w-18 h-18',
    },
    lg: {
      container: 'gap-3',
      svg: 'w-12 h-12',
      text: 'text-2xl',
      tooltipPosition: '-bottom-8',
      tooltipPadding: 'py-1 px-4',
      tooltipText: 'text-sm',
      indicatorSize: 'w-3 h-3',
      pulseIconSize: 'w-22 h-22',
    },
    xl: {
      container: 'gap-4',
      svg: 'w-16 h-16',
      text: 'text-3xl',
      tooltipPosition: '-bottom-9',
      tooltipPadding: 'py-1.5 px-5',
      tooltipText: 'text-base',
      indicatorSize: 'w-3 h-3',
      pulseIconSize: 'w-28 h-28',
    }
  };
  
  const currentSize = sizeMap[size] || sizeMap.md;
    
  return (
    <div 
      className={`relative transition-all duration-300 ease-in-out cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex items-center ${currentSize.container} ${isHovered ? 'transform scale-110' : ''}`}>
        <div className="relative">
          <svg 
            className={`transition-all duration-200 ${currentSize.svg} ${isHovered ? 'drop-shadow-xl' : ''}`}
            viewBox="0 0 48 48" 
          >
            <defs>
              <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isHovered ? "#0EA5E9" : "#38BDF8"} />
                <stop offset="100%" stopColor={isHovered ? "#2563EB" : "#3B82F6"} />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation={isHovered ? "3" : "0"} result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <rect 
              x="8" 
              y="8" 
              width="32" 
              height="24" 
              rx="3" 
              fill="url(#blueGrad)" 
              className="transition-all duration-300"
              filter={isHovered ? "url(#glow)" : ""}
            />
            <rect 
              x="14" 
              y="14" 
              width="20" 
              height="12" 
              rx="2" 
              fill="white" 
              fillOpacity="0.9"
              stroke={isHovered ? "#0EA5E9" : "none"}
              strokeWidth="2"
            />
            <path 
              d="M10 36L14 28H34L38 36" 
              fill="url(#blueGrad)"
              className="transition-all duration-300"
            />
            <circle 
              cx="24" 
              cy="20" 
              r="4" 
              fill={isHovered ? "#0EA5E9" : "#3B82F6"} 
              className="transition-all duration-300" 
              stroke={isHovered ? "#0EA5E9" : "none"}
              strokeWidth="1.5"
              filter={isHovered ? "url(#glow)" : ""}
            />
          </svg>
          {isHovered && (
            <>
              <div className="absolute -top-1 -right-1 animate-ping">
                <div className={`${currentSize.indicatorSize} bg-blue-400 rounded-full`} />
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse">
                <svg width="28" height="28" viewBox="0 0 24 24" opacity="0.7">
                  <path d="M12 16L6 10H18L12 16Z" fill="#0EA5E9" />
                </svg>
              </div>
            </>
          )}
        </div>
        {showText && (
        <p className={`${currentSize.text} font-bold transition-all duration-300 ${isHovered ? 'text-sky-600' : 'text-gray-800'}`}>
          <span className={`transition-all duration-300 ${isHovered ? 'text-blue-600' : ''}`}>Frame</span>
          <span className={`font-extrabold transition-all duration-300 ${isHovered ? 'text-blue-700' : ''}`}>Sage</span>
        </p>)}
      </div>
      
      {isHovered && showTooltip && (
        <div className={`absolute ${currentSize.tooltipPosition} left-0 right-0 text-center bg-gradient-to-r from-blue-100 to-sky-100 text-blue-700 ${currentSize.tooltipPadding} rounded-full ${currentSize.tooltipText} font-medium shadow-lg animate-fadeIn`}>
          <span className="flex items-center justify-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" className="animate-pulse">
              <circle cx="12" cy="12" r="10" fill="#0EA5E9" fillOpacity="0.3" />
              <circle cx="12" cy="12" r="6" fill="#0EA5E9" fillOpacity="0.6" />
              <circle cx="12" cy="12" r="3" fill="#0EA5E9" />
            </svg>
            {tooltipText}
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo