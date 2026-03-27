import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import StatCard from '../common/StatCard';
import Avatar from '../common/Avatar';
import { formatDate } from '../../utils/helpers';

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/manager')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center text-gray-500 py-20">Failed to load</div>;

  const { dept, attendanceToday, taskStats, teamMembers, attendanceTrend } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-500 text-sm">{dept?.name} · {formatDate(new Date(), 'EEEE, MMM d')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Team Present" value={attendanceToday.present} subtitle={`of ${attendanceToday.total}`} icon="✅" color="green" />
        <StatCard title="Late" value={attendanceToday.late} icon="⏰" color="yellow" />
        <StatCard title="Absent" value={attendanceToday.absent} icon="❌" color="red" />
        <StatCard title="Team Size" value={attendanceToday.total} icon="👥" color="blue" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tasks" value={taskStats.total} icon="📋" color="blue" />
        <StatCard title="In Progress" value={taskStats.in_progress} icon="🔄" color="yellow" />
        <StatCard title="Completed" value={taskStats.completed} icon="✅" color="green" />
        <StatCard title="Overdue" value={taskStats.overdue} icon="🚨" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Attendance Trend (14 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => formatDate(d, 'MMM d')} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="present" stroke="#10b981" fill="#d1fae5" strokeWidth={2} name="Present" />
              <Area type="monotone" dataKey="absent" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} name="Absent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-4">Team Overview</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {teamMembers.map(member => (
              <div key={member.id} className="flex items-center gap-3 py-1">
                <Avatar name={member.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{member.name}</div>
                  <div className="text-xs text-gray-500">{member.position}</div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`font-medium ${member.present_today ? 'text-green-600' : 'text-red-500'}`}>
                    {member.present_today ? '✓ In' : '✗ Out'}
                  </span>
                  <span className="text-gray-500">{member.pending_tasks} tasks</span>
                  {member.overdue_tasks > 0 && <span className="text-red-500 font-medium">{member.overdue_tasks} overdue</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
