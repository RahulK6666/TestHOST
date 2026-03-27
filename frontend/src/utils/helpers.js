import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from 'date-fns';

export const formatDate = (date, fmt = 'MMM dd, yyyy') => {
  if (!date) return '—';
  try { return format(typeof date === 'string' ? parseISO(date) : date, fmt); }
  catch { return '—'; }
};

export const formatDateTime = (date) => formatDate(date, 'MMM dd, yyyy HH:mm');
export const formatTime = (date) => formatDate(date, 'HH:mm');
export const timeAgo = (date) => {
  if (!date) return '—';
  try { return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, { addSuffix: true }); }
  catch { return '—'; }
};

export const isOverdue = (deadline) => {
  if (!deadline) return false;
  return isBefore(typeof deadline === 'string' ? parseISO(deadline) : deadline, new Date());
};

export const priorityConfig = {
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-700',    dot: 'bg-gray-400' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  high:   { label: 'High',   color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
};

export const statusConfig = {
  assigned:    { label: 'Assigned',    color: 'bg-gray-100 text-gray-700' },
  accepted:    { label: 'Accepted',    color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700' },
  reviewed:    { label: 'Reviewed',    color: 'bg-purple-100 text-purple-700' },
};

export const attendanceStatusConfig = {
  present:  { label: 'Present',  color: 'bg-green-100 text-green-700' },
  late:     { label: 'Late',     color: 'bg-yellow-100 text-yellow-700' },
  absent:   { label: 'Absent',   color: 'bg-red-100 text-red-700' },
  half_day: { label: 'Half Day', color: 'bg-orange-100 text-orange-700' },
  override: { label: 'Override', color: 'bg-purple-100 text-purple-700' },
};

export const roleConfig = {
  super_admin: { label: 'CEO / Super Admin', color: 'bg-purple-100 text-purple-800' },
  manager:     { label: 'Manager',           color: 'bg-blue-100 text-blue-800' },
  employee:    { label: 'Employee',          color: 'bg-gray-100 text-gray-700' },
};

export const sectionConfig = {
  onsite:  { label: 'On-Site',  color: 'bg-orange-100 text-orange-700' },
  inhouse: { label: 'In-House', color: 'bg-teal-100 text-teal-700' },
};

export const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

export const avatarColors = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
];

export const getAvatarColor = (name = '') => {
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

export const hoursWorked = (punchIn, punchOut) => {
  if (!punchIn || !punchOut) return null;
  const diff = new Date(punchOut) - new Date(punchIn);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

export const errorMessage = (error) =>
  error?.response?.data?.error || error?.message || 'An unexpected error occurred';
