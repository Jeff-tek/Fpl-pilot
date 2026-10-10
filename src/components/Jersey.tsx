import React from 'react';
import { getClubStyle } from '../lib/constants/teams';

interface JerseyProps {
  teamShortName: string;
  isGkp?: boolean;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  squadNumber?: number;
  className?: string;
  size?: number; // size in pixels, default 44
}

export const Jersey: React.FC<JerseyProps> = ({
  teamShortName,
  isGkp = false,
  isCaptain = false,
  isViceCaptain = false,
  squadNumber,
  className = '',
  size = 46,
}) => {
  const clubStyle = getClubStyle(teamShortName);

  // If Goalkeeper, use distinctive goalkeeper kit
  const isGoalkeeper = isGkp || teamShortName === 'GKP';
  const primaryColor = isGoalkeeper ? '#059669' : clubStyle.primaryColor;
  const secondaryColor = isGoalkeeper ? '#10b981' : clubStyle.secondaryColor;
  const textColor = isGoalkeeper ? '#ffffff' : clubStyle.textColor;

  // Club specific jersey pattern types
  const hasStripes = ['NEW', 'BOU', 'BRE', 'BHA', 'CRY'].includes(teamShortName) && !isGoalkeeper;
  const hasContrastSleeves = ['ARS', 'AVL', 'WHU', 'FUL'].includes(teamShortName) && !isGoalkeeper;

  const sleeveColor = hasContrastSleeves ? secondaryColor : primaryColor;

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: Math.round(size * 1.15) }}
    >
      <svg
        viewBox="0 0 100 115"
        className="w-full h-full drop-shadow-md select-none transition-transform group-hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Fabric Gradient */}
          <linearGradient id={`fabric-${teamShortName}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
          </linearGradient>

          {/* Vertical Stripes Pattern for Newcastle, Brighton, etc. */}
          {hasStripes && (
            <pattern
              id={`stripes-${teamShortName}`}
              width="18"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <rect width="9" height="100" fill={primaryColor} />
              <rect x="9" width="9" height="100" fill={secondaryColor} />
            </pattern>
          )}

          {/* Sleeve shadow */}
          <linearGradient id="sleeve-shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* --- LEFT SLEEVE --- */}
        <path
          d="M 24 16 L 3 36 C 1 38 1 42 4 45 L 14 55 C 16 57 20 56 22 53 L 32 37 Z"
          fill={sleeveColor}
          stroke="#000000"
          strokeOpacity="0.15"
          strokeWidth="1.5"
        />
        <path
          d="M 24 16 L 3 36 C 1 38 1 42 4 45 L 14 55 C 16 57 20 56 22 53 L 32 37 Z"
          fill="url(#sleeve-shadow)"
        />
        {/* Left Cuff */}
        <path
          d="M 4 45 L 14 55"
          stroke={secondaryColor}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* --- RIGHT SLEEVE --- */}
        <path
          d="M 76 16 L 97 36 C 99 38 99 42 96 45 L 86 55 C 84 57 80 56 78 53 L 68 37 Z"
          fill={sleeveColor}
          stroke="#000000"
          strokeOpacity="0.15"
          strokeWidth="1.5"
        />
        <path
          d="M 76 16 L 97 36 C 99 38 99 42 96 45 L 86 55 C 84 57 80 56 78 53 L 68 37 Z"
          fill="url(#sleeve-shadow)"
        />
        {/* Right Cuff */}
        <path
          d="M 96 45 L 86 55"
          stroke={secondaryColor}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Captain Armband on Right Sleeve */}
        {isCaptain && (
          <g>
            <rect
              x="77"
              y="40"
              width="15"
              height="8"
              rx="2"
              fill="#f59e0b"
              stroke="#fbbf24"
              strokeWidth="0.8"
            />
            <text
              x="84.5"
              y="46.5"
              fill="#0f172a"
              fontSize="7"
              fontWeight="900"
              fontFamily="sans-serif"
              textAnchor="middle"
            >
              C
            </text>
          </g>
        )}

        {/* Vice Captain Armband on Right Sleeve */}
        {isViceCaptain && !isCaptain && (
          <g>
            <rect
              x="77"
              y="40"
              width="15"
              height="8"
              rx="2"
              fill="#e2e8f0"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
            <text
              x="84.5"
              y="46.5"
              fill="#0f172a"
              fontSize="7"
              fontWeight="900"
              fontFamily="sans-serif"
              textAnchor="middle"
            >
              V
            </text>
          </g>
        )}

        {/* --- MAIN TORSO / BODY --- */}
        <path
          d="M 28 14 C 36 22 64 22 72 14 L 75 38 L 73 104 C 73 107 70 109 67 109 L 33 109 C 30 109 27 107 27 104 L 25 38 Z"
          fill={hasStripes ? `url(#stripes-${teamShortName})` : primaryColor}
          stroke="#000000"
          strokeOpacity="0.15"
          strokeWidth="1.5"
        />

        {/* Fabric lighting texture */}
        <path
          d="M 28 14 C 36 22 64 22 72 14 L 75 38 L 73 104 C 73 107 70 109 67 109 L 33 109 C 30 109 27 107 27 104 L 25 38 Z"
          fill={`url(#fabric-${teamShortName})`}
        />

        {/* Subtle Athletic Side Seams */}
        <path d="M 31 40 L 32 104" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1" />
        <path d="M 69 40 L 68 104" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1" />

        {/* --- COLLAR / NECK --- */}
        <path
          d="M 36 12 C 43 23 57 23 64 12 C 60 16 40 16 36 12 Z"
          fill={secondaryColor}
        />
        <path
          d="M 36 12 C 43 23 57 23 64 12"
          stroke={secondaryColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* --- CLUB SHORT NAME / NUMBER ON CHEST --- */}
        <g>
          {squadNumber ? (
            <text
              x="50"
              y="74"
              fill={textColor}
              fontSize="26"
              fontWeight="900"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
              filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.5))"
            >
              {squadNumber}
            </text>
          ) : (
            <text
              x="50"
              y="68"
              fill={textColor}
              fontSize="16"
              fontWeight="900"
              fontFamily="ui-monospace, monospace"
              letterSpacing="0.05em"
              textAnchor="middle"
              filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.6))"
            >
              {teamShortName}
            </text>
          )}

          {/* Small Club Crest Shield Indicator */}
          <polygon
            points="38,32 44,32 45,39 41,43 37,39"
            fill={secondaryColor}
            opacity="0.9"
          />
        </g>
      </svg>
    </div>
  );
};
