"use client";

import { useMemo } from "react";

interface StreakHeatmapProps {
  sessionsByDate: Record<string, number>; // date string -> total minutes
}

export function StreakHeatmap({ sessionsByDate }: StreakHeatmapProps) {
  const { weeks, months } = useMemo(() => {
    const today = new Date();
    const numWeeks = 20;
    const cells: { date: string; minutes: number; level: number }[][] = [];

    // Generate grid: 20 weeks x 7 days
    for (let w = numWeeks - 1; w >= 0; w--) {
      const week: { date: string; minutes: number; level: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - w * 7 - (6 - d));
        const dateStr = date.toISOString().split("T")[0];
        const minutes = sessionsByDate[dateStr] || 0;

        let level = 0;
        if (minutes > 0 && minutes <= 15) level = 1;
        else if (minutes > 15 && minutes <= 30) level = 2;
        else if (minutes > 30 && minutes <= 60) level = 3;
        else if (minutes > 60) level = 4;

        week.push({ date: dateStr, minutes, level });
      }
      cells.push(week);
    }

    // Extract month labels
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    cells.forEach((week, i) => {
      const d = new Date(week[0].date);
      const month = d.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          label: d.toLocaleString("default", { month: "short" }),
          col: i,
        });
        lastMonth = month;
      }
    });

    return { weeks: cells, months: monthLabels };
  }, [sessionsByDate]);

  const levelColors = [
    "bg-purple-100/50",
    "bg-purple-200",
    "bg-purple-300",
    "bg-purple-500",
    "bg-purple-700",
  ];

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1 pt-5">
          {dayLabels.map((label, i) => (
            <div
              key={i}
              className="h-3 flex items-center text-[9px] text-slate-400"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div>
          {/* Month labels */}
          <div className="flex gap-1 mb-1">
            {months.map((m, i) => (
              <div
                key={i}
                className="text-[9px] text-slate-400"
                style={{
                  position: "relative",
                  left: `${m.col * 16}px`,
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    className={`w-3 h-3 rounded-sm ${levelColors[day.level]} transition-colors hover:ring-1 hover:ring-purple-400`}
                    title={`${day.date}: ${day.minutes} min`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 justify-end text-[9px] text-slate-400">
        <span>Less</span>
        {levelColors.map((color, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
