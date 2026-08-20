import { getMuscleGroupMeta } from '../../utils/muscleGroupMetadata';

export interface MuscleGroupIconProps {
  muscleGroup?: string;
  exerciseName?: string;
  className?: string;
  size?: number | string;
  withContainer?: boolean;
  containerClassName?: string;
}

export function MuscleGroupIcon({
  muscleGroup,
  exerciseName,
  className = 'w-4 h-4',
  size,
  withContainer = false,
  containerClassName = ''
}: MuscleGroupIconProps) {
  const meta = getMuscleGroupMeta(muscleGroup || exerciseName);
  const IconComponent = meta.icon;

  if (withContainer) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border transition-colors ${meta.bgColor} ${meta.borderColor} ${meta.textColor} ${containerClassName}`}
        title={`Grupo Muscular: ${meta.label}`}
      >
        <IconComponent className={className} size={size} />
      </div>
    );
  }

  return (
    <IconComponent
      className={`${meta.textColor} ${className}`}
      size={size}
    />
  );
}
