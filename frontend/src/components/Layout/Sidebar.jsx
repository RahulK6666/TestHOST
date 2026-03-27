import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ['super_admin', 'manager', 'employee'] },
  { to: '/attendance', label: 'Attendance', icon: '⏱️', roles: ['super_admin', 'manager', 'employee'] },
  { to: '/tasks', label: 'Tasks', icon: '📋', roles: ['super_admin', 'manager', 'employee'] },
  { to: '/calendar', label: 'Calendar', icon: '📅', roles: ['super_admin', 'manager', 'employee'] },
  { to: '/employees', label: 'Employees', icon: '👥', roles: ['super_admin', 'manager'] },
  { to: '/departments', label: 'Departments', icon: '🏢', roles: ['super_admin', 'manager'] },
  { to: '/reports', label: 'Reports', icon: '📈', roles: ['super_admin', 'manager'] },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const visibleItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col
      bg-gray-900 text-white transition-transform duration-300
      ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-lg">🏢</div>
        <div>
          <div className="font-bold text-sm leading-tight">EMS</div>
          <div className="text-gray-400 text-xs">Management System</div>
        </div>
        <button onClick={onClose} className="ml-auto lg:hidden text-gray-400 hover:text-white">✕</button>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{user?.name}</div>
            <div className="text-gray-400 text-xs truncate">
              {user?.role === 'super_admin' ? 'CEO / Admin' : user?.role === 'manager' ? 'Manager' : 'Employee'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
              ${isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }
            `}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-gray-700 pt-4 space-y-0.5">
        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) => `
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
            ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
          `}
        >
          <span>👤</span> Profile
        </NavLink>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-900/50 hover:text-red-400 transition-all"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
