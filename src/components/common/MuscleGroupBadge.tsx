import { getMuscleGroupMeta } from '../../utils/muscleGroupMetadata';

export interface MuscleGroupBadgeProps {
  muscleGroup?: string;
  exerciseName?: string;
  className?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function MuscleGroupBadge({
  muscleGroup,
  exerciseName,
  className = '',
  size = 'sm',
  showLabel = true
}: MuscleGroupBadgeProps) {
  const meta = getMuscleGroupMeta(muscleGroup || exerciseName);
  const IconComponent = meta.icon;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px] gap-1.5' 
    : 'px-2.5 py-1 text-xs gap-2';

  const iconSizes = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-lg border shrink-0 transition-colors ${meta.badgeClass} ${sizeClasses} ${className}`}
    >
      <IconComponent className={`${iconSizes} shrink-0`} />
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}
