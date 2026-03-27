export default function Badge({ children, color = 'gray', dot }) {
  const colorMap = {
    gray:   'bg-gray-100 text-gray-700',
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
    red:    'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
    teal:   'bg-teal-100 text-teal-700',
    pink:   'bg-pink-100 text-pink-700',
  };
  const dotColorMap = {
    gray: 'bg-gray-500', blue: 'bg-blue-500', green: 'bg-green-500',
    red: 'bg-red-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500',
    purple: 'bg-purple-500', teal: 'bg-teal-500', pink: 'bg-pink-500',
  };

  return (
    <span className={`badge ${colorMap[color] || colorMap.gray}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColorMap[color] || dotColorMap.gray}`} />}
      {children}
    </span>
  );
}
