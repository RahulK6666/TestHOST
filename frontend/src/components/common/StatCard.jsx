export default function StatCard({ title, value, subtitle, icon, color = 'blue', trend, onClick }) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'bg-blue-100' },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'bg-green-100' },
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    icon: 'bg-red-100' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'bg-yellow-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-100' },
    teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   icon: 'bg-teal-100' },
    gray:   { bg: 'bg-gray-50',   text: 'text-gray-600',   icon: 'bg-gray-100' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`card p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${c.text}`}>{value ?? '—'}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              <span>{trend >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend)}% vs last week</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`${c.icon} ${c.text} w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ml-3`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
