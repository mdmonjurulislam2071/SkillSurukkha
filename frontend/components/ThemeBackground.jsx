import React from "react";

export default function ThemeBackground({ children, className = "" }) {
  return (
    <div className={`relative w-full bg-[#0b0320] overflow-hidden text-white ${className}`}>
      {/* Dynamic Gradient Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#6610f2] rounded-full mix-blend-screen filter blur-[150px] opacity-40 translate-x-1/4 -translate-y-1/4"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#e83e8c] rounded-full mix-blend-screen filter blur-[150px] opacity-30 translate-y-1/4"></div>
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-[#3f0071] rounded-full mix-blend-screen filter blur-[120px] opacity-50 -translate-x-1/2 -translate-y-1/2"></div>

      {/* SVG Abstract Waves */}
      <svg
        className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-color-dodge pointer-events-none"
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <g strokeWidth="2" fill="none">
          {/* Layer 1: Orange/Pink waves */}
          <path
            d="M-200 800 C 300 800, 600 200, 1000 100 C 1400 0, 1600 300, 1800 600"
            stroke="url(#gradOrange)"
            className="opacity-70"
          />
          <path
            d="M-200 820 C 320 820, 620 220, 1020 120 C 1420 20, 1620 320, 1820 620"
            stroke="url(#gradOrange)"
            className="opacity-60"
          />
          <path
            d="M-200 840 C 340 840, 640 240, 1040 140 C 1440 40, 1640 340, 1840 640"
            stroke="url(#gradOrange)"
            className="opacity-50"
          />
          <path
            d="M-200 860 C 360 860, 660 260, 1060 160 C 1460 60, 1660 360, 1860 660"
            stroke="url(#gradOrange)"
            className="opacity-40"
          />
          <path
            d="M-200 880 C 380 880, 680 280, 1080 180 C 1480 80, 1680 380, 1880 680"
            stroke="url(#gradOrange)"
            className="opacity-30"
          />

          {/* Layer 2: Purple/Pink waves crossing */}
          <path
            d="M-200 200 C 400 100, 700 800, 1200 700 C 1600 600, 1700 200, 1900 100"
            stroke="url(#gradPurple)"
            className="opacity-60"
          />
          <path
            d="M-200 220 C 420 120, 720 820, 1220 720 C 1620 620, 1720 220, 1920 120"
            stroke="url(#gradPurple)"
            className="opacity-50"
          />
          <path
            d="M-200 240 C 440 140, 740 840, 1240 740 C 1640 640, 1740 240, 1940 140"
            stroke="url(#gradPurple)"
            className="opacity-40"
          />
          <path
            d="M-200 260 C 460 160, 760 860, 1260 760 C 1660 660, 1760 260, 1960 160"
            stroke="url(#gradPurple)"
            className="opacity-30"
          />
          
          {/* Layer 3: Faint bottom right waves */}
          <path
            d="M800 1000 C 1000 800, 1200 500, 1500 700 C 1800 900, 1900 800, 2000 600"
            stroke="url(#gradPink)"
            strokeWidth="3"
            className="opacity-50"
          />
          <path
            d="M820 1020 C 1020 820, 1220 520, 1520 720 C 1820 920, 1920 820, 2020 620"
            stroke="url(#gradPink)"
            strokeWidth="3"
            className="opacity-40"
          />
          <path
            d="M840 1040 C 1040 840, 1240 540, 1540 740 C 1840 940, 1940 840, 2040 640"
            stroke="url(#gradPink)"
            strokeWidth="3"
            className="opacity-30"
          />
        </g>
        
        <defs>
          <linearGradient id="gradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff7b00" />
            <stop offset="50%" stopColor="#ff007f" />
            <stop offset="100%" stopColor="#3f0071" />
          </linearGradient>
          <linearGradient id="gradPurple" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2a00ff" />
            <stop offset="50%" stopColor="#aa00ff" />
            <stop offset="100%" stopColor="#ff00a0" />
          </linearGradient>
          <linearGradient id="gradPink" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ff007f" />
            <stop offset="100%" stopColor="#ff7b00" />
          </linearGradient>
        </defs>
      </svg>

      {/* Faint repeating pattern "SkillShurokkha" overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none flex flex-wrap overflow-hidden gap-12 -rotate-12 scale-150"
        style={{ userSelect: 'none' }}
      >
        {Array.from({ length: 150 }).map((_, i) => (
          <span key={i} className="text-3xl font-bold tracking-widest whitespace-nowrap">SkillShurokkha</span>
        ))}
      </div>

      {/* Main Content Content */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}
