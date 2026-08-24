"use client";

interface DailyGoalRingProps {
  currentMinutes: number;
  goalMinutes: number;
}

export function DailyGoalRing({
  currentMinutes,
  goalMinutes,
}: DailyGoalRingProps) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((currentMinutes / goalMinutes) * 100, 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1f1f23"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#goal-gradient-gold)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: "stroke-dashoffset 1s ease-in-out",
            }}
          />
          <defs>
            <linearGradient
              id="goal-gradient-gold"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#f5c563" />
              <stop offset="100%" stopColor="#d4a853" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-zinc-100">{currentMinutes}</span>
          <span className="text-xs font-mono text-zinc-500">/ {goalMinutes} min</span>
        </div>
      </div>
    </div>
  );
}
