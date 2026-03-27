import { getInitials, getAvatarColor } from '../../utils/helpers';

export default function Avatar({ name, size = 'md', className = '' }) {
  const sizeMap = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
  };
  return (
    <div className={`${sizeMap[size]} ${getAvatarColor(name)} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}>
      {getInitials(name)}
    </div>
  );
}
