import { WEEK_DAYS } from '../../utils/constants';

interface WorkoutDayTabsProps {
  availableDays: string[];
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
}

export function WorkoutDayTabs({
  availableDays,
  selectedDay,
  onSelectDay
}: WorkoutDayTabsProps) {
  if (availableDays.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-1 -mx-2 px-2">
      {WEEK_DAYS.filter(d => availableDays.includes(d.label)).map((day) => {
        const isSelected = selectedDay === day.label;
        return (
          <button
            key={day.key}
            type="button"
            onClick={() => onSelectDay(day.label)}
            className={`min-h-11 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 flex items-center justify-center whitespace-nowrap ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                : 'bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border border-border/40'
            }`}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
