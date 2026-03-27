import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import StatCard from '../common/StatCard';
import { formatDate, formatTime, hoursWorked, statusConfig, priorityConfig, attendanceStatusConfig } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [punchMessage, setPunchMessage] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/dashboard/employee');
      setData(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handlePunch = async (type) => {
    setPunching(true);
    setPunchMessage('');
    try {
      const res = await api.post(`/attendance/${type}`);
      setPunchMessage(res.data.message + (res.data.isLate ? ' (Late)' : ''));
      fetchData();
    } catch (err) {
      setPunchMessage(err.response?.data?.error || 'Error');
    } finally { setPunching(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return null;

  const { todayAttendance, taskStats, upcomingTasks, recentAttendance, attendanceSummary } = data;
  const today = new Date().toISOString().split('T')[0];
  const hasPunchedIn = todayAttendance?.punch_in;
  const hasPunchedOut = todayAttendance?.punch_out;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="text-gray-500 text-sm">{formatDate(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Punch Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Today's Attendance</h3>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
              {hasPunchedIn && (
                <span>🟢 In: <strong>{formatTime(todayAttendance.punch_in)}</strong></span>
              )}
              {hasPunchedOut && (
                <span>🔴 Out: <strong>{formatTime(todayAttendance.punch_out)}</strong></span>
              )}
              {hasPunchedIn && hasPunchedOut && (
                <span>⏱️ Hours: <strong>{hoursWorked(todayAttendance.punch_in, todayAttendance.punch_out)}</strong></span>
              )}
              {todayAttendance?.status && (
                <span className={`badge ${attendanceStatusConfig[todayAttendance.status]?.color}`}>
                  {attendanceStatusConfig[todayAttendance.status]?.label}
                </span>
              )}
            </div>
            {!hasPunchedIn && <p className="text-gray-400 text-sm mt-1">You haven't punched in yet today</p>}
            {punchMessage && (
              <p className={`mt-2 text-sm font-medium ${punchMessage.includes('Error') || punchMessage.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
                {punchMessage}
              </p>
            )}
          </div>
          <div className="flex gap-3 flex-shrink-0">
            {!hasPunchedIn && (
              <button onClick={() => handlePunch('punch-in')} disabled={punching} className="btn-success px-6 py-2.5 text-base">
                {punching ? '...' : '🟢 Punch In'}
              </button>
            )}
            {hasPunchedIn && !hasPunchedOut && (
              <button onClick={() => handlePunch('punch-out')} disabled={punching} className="btn-danger px-6 py-2.5 text-base">
                {punching ? '...' : '🔴 Punch Out'}
              </button>
            )}
            {hasPunchedOut && (
              <span className="text-green-600 font-medium text-sm flex items-center gap-2">
                ✅ Day Complete
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Attendance (30d)" value={`${attendanceSummary.present + attendanceSummary.late}`} subtitle="Days Present" icon="📅" color="green" />
        <StatCard title="Absences" value={attendanceSummary.absent} icon="❌" color="red" />
        <StatCard title="My Tasks" value={taskStats.total} icon="📋" color="blue" />
        <StatCard title="Overdue" value={taskStats.overdue} icon="🚨" color={taskStats.overdue > 0 ? 'red' : 'gray'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">My Tasks</h3>
            <button onClick={() => navigate('/tasks')} className="text-blue-600 text-sm hover:underline">View all →</button>
          </div>
          <div className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No pending tasks 🎉</p>
            ) : upcomingTasks.map(task => {
              const isOverdue = new Date(task.deadline) < new Date();
              const sc = statusConfig[task.status];
              const pc = priorityConfig[task.priority];
              return (
                <div key={task.id} onClick={() => navigate('/tasks')} className="border border-gray-100 rounded-lg p-3 hover:border-blue-200 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{task.title}</p>
                      <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                        {isOverdue ? '🚨 Overdue: ' : '📅 '}{formatDate(task.deadline)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                      <span className={`badge ${sc?.color}`}>{sc?.label}</span>
                      <span className={`badge ${pc?.color}`}>{pc?.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance History */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Attendance</h3>
          <div className="space-y-2">
            {recentAttendance.slice(0, 10).map(record => {
              const asc = attendanceStatusConfig[record.status];
              return (
                <div key={record.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{formatDate(record.date, 'EEE, MMM d')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {record.punch_in && <span>{formatTime(record.punch_in)}</span>}
                    {record.punch_out && <span>→ {formatTime(record.punch_out)}</span>}
                    {record.punch_in && record.punch_out && <span>{hoursWorked(record.punch_in, record.punch_out)}</span>}
                    <span className={`badge ${asc?.color}`}>{asc?.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
