import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { timeAgo } from '../../utils/helpers';

export default function Header({ onMenuClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const notifRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/dashboard/notifications');
      setNotifications(res.data);
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = async (id) => {
    try {
      await api.patch(`/dashboard/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/dashboard/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  };

  const today = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center gap-4 sticky top-0 z-10">
      {/* Menu button (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Date */}
      <div className="hidden md:block text-sm text-gray-500">{today}</div>

      <div className="ml-auto flex items-center gap-2">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-dot" />
          Live
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-slide-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">No notifications</div>
                ) : (
                  notifications.slice(0, 15).map(n => (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />}
                        <div className={!n.is_read ? '' : 'pl-4'}>
                          <div className="font-medium text-xs text-gray-900">{n.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
                          <div className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          {user?.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
        </button>
      </div>
    </header>
  );
}
