import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../utils/api';
import StatCard from '../common/StatCard';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import { formatDate, formatDateTime, statusConfig, priorityConfig } from '../../utils/helpers';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function CEODashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      const res = await api.get('/dashboard/ceo');
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="text-center text-gray-500 py-20">Failed to load dashboard</div>;

  const { attendanceToday, taskStats, employeeStats, deptPerformance, attendanceTrend,
    taskTrend, topPerformers, leastActive, overloaded, recentTasks, priorityBreakdown } = data;

  const totalEmployees = employeeStats?.find(e => e.role === 'employee' && e.is_active)?.count || 0;
  const totalManagers = employeeStats?.find(e => e.role === 'manager' && e.is_active)?.count || 0;

  // Attendance pie data
  const attendancePie = [
    { name: 'Present', value: attendanceToday.present || 0, color: '#10b981' },
    { name: 'Late', value: attendanceToday.late || 0, color: '#f59e0b' },
    { name: 'Absent', value: attendanceToday.absent || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Priority pie
  const priorityTotals = {};
  (priorityBreakdown || []).forEach(p => {
    if (!priorityTotals[p.priority]) priorityTotals[p.priority] = 0;
    if (!['completed','reviewed'].includes(p.status)) priorityTotals[p.priority] += p.count;
  });
  const priorityPie = Object.entries(priorityTotals).map(([key, val], i) => ({
    name: priorityConfig[key]?.label || key,
    value: val,
    color: CHART_COLORS[i],
  }));

  const attendanceRate = attendanceToday.total_employees > 0
    ? Math.round((attendanceToday.present / attendanceToday.total_employees) * 100) : 0;

  const taskCompletionRate = taskStats.total > 0
    ? Math.round(((taskStats.completed + taskStats.reviewed) / taskStats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CEO Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {formatDate(new Date(), 'EEEE, MMMM d, yyyy')}
            {lastUpdated && <span className="ml-2 text-xs text-gray-400">· Updated {formatDate(lastUpdated, 'HH:mm')}</span>}
          </p>
        </div>
        <button onClick={fetchData} className="btn-outline text-sm self-start">
          🔄 Refresh
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Employees Present Today"
          value={attendanceToday.present}
          subtitle={`of ${attendanceToday.total_employees} total · ${attendanceRate}% rate`}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Late Arrivals"
          value={attendanceToday.late}
          subtitle="Today"
          icon="⏰"
          color="yellow"
        />
        <StatCard
          title="Absent Today"
          value={attendanceToday.absent}
          subtitle={`${attendanceToday.currently_in} currently clocked in`}
          icon="❌"
          color="red"
        />
        <StatCard
          title="Total Workforce"
          value={totalEmployees + totalManagers}
          subtitle={`${totalEmployees} employees · ${totalManagers} managers`}
          icon="👥"
          color="blue"
        />
      </div>

      {/* Task Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Tasks" value={taskStats.total} icon="📋" color="blue" />
        <StatCard title="Pending" value={taskStats.pending} icon="📌" color="gray" />
        <StatCard title="In Progress" value={taskStats.in_progress} icon="🔄" color="yellow" />
        <StatCard
          title="Completed"
          value={taskStats.completed + taskStats.reviewed}
          subtitle={`${taskCompletionRate}% completion rate`}
          icon="✅"
          color="green"
        />
        <StatCard title="Overdue" value={taskStats.overdue} icon="🚨" color="red" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Attendance Trend (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={attendanceTrend}>
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => formatDate(d, 'MMM d')} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={d => formatDate(d, 'MMM d, yyyy')} />
              <Legend />
              <Area type="monotone" dataKey="present" stroke="#10b981" fill="url(#colorPresent)" strokeWidth={2} name="Present" />
              <Area type="monotone" dataKey="late" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Late" />
              <Area type="monotone" dataKey="absent" stroke="#ef4444" fill="url(#colorAbsent)" strokeWidth={2} name="Absent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Today Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Today's Attendance</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={attendancePie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {attendancePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {attendancePie.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Department Performance</h3>
          <div className="space-y-3">
            {(deptPerformance || []).map(dept => {
              const attendPct = dept.total_employees > 0
                ? Math.round((dept.present_today / dept.total_employees) * 100) : 0;
              const taskPct = dept.total_tasks > 0
                ? Math.round((dept.completed_tasks / dept.total_tasks) * 100) : 0;
              return (
                <div key={dept.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm text-gray-900">{dept.name}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${dept.section === 'onsite' ? 'bg-orange-100 text-orange-600' : 'bg-teal-100 text-teal-600'}`}>
                        {dept.section}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{dept.total_employees} emp</span>
                      {dept.overdue_tasks > 0 && <span className="text-red-500 font-medium">{dept.overdue_tasks} overdue</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Attendance</span><span>{attendPct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${attendPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Tasks</span><span>{taskPct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${taskPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Completion Trend */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Task Completions (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={taskTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => formatDate(d, 'MMM d')} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={d => formatDate(d, 'MMM d, yyyy')} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>

          {/* Priority Breakdown */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Active Tasks by Priority</h4>
            <div className="grid grid-cols-2 gap-2">
              {priorityPie.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-sm" style={{ background: p.color }} />
                  <span className="text-gray-600">{p.name}</span>
                  <span className="font-semibold ml-auto">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* People Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">🏆 Top Performers</h3>
          <div className="space-y-3">
            {topPerformers.slice(0, 5).map((emp, i) => (
              <div key={emp.id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-300 w-5">{i + 1}</span>
                <Avatar name={emp.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{emp.name}</div>
                  <div className="text-xs text-gray-500 truncate">{emp.department_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">{emp.completed}/{emp.total}</div>
                  <div className="text-xs text-gray-400">tasks</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Least Active */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">⚠️ Needs Attention</h3>
          <div className="space-y-3">
            {leastActive.slice(0, 5).map(emp => (
              <div key={emp.id} className="flex items-center gap-3">
                <Avatar name={emp.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{emp.name}</div>
                  <div className="text-xs text-gray-500 truncate">{emp.department_name}</div>
                </div>
                <div className="text-right space-y-0.5">
                  {emp.absent_days > 0 && <div className="text-xs text-red-600 font-medium">{emp.absent_days} absences</div>}
                  {emp.overdue_tasks > 0 && <div className="text-xs text-orange-600 font-medium">{emp.overdue_tasks} overdue</div>}
                </div>
              </div>
            ))}
            {leastActive.length === 0 && <p className="text-gray-400 text-sm text-center py-4">All employees performing well! 🎉</p>}
          </div>
        </div>

        {/* Overloaded */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">🔥 Overloaded</h3>
          <div className="space-y-3">
            {overloaded.slice(0, 5).map(emp => (
              <div key={emp.id} className="flex items-center gap-3">
                <Avatar name={emp.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{emp.name}</div>
                  <div className="text-xs text-gray-500 truncate">{emp.department_name}</div>
                </div>
                <span className="text-sm font-bold text-red-600">{emp.pending_tasks} tasks</span>
              </div>
            ))}
            {overloaded.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Workload is balanced ✅</p>}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Task Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Task</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Assigned To</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Department</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(recentTasks || []).map(task => {
                const isOverdue = new Date(task.deadline) < new Date() && !['completed','reviewed'].includes(task.status);
                const sc = statusConfig[task.status] || statusConfig.assigned;
                return (
                  <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-gray-900 truncate max-w-[200px]">{task.title}</div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{task.assigned_to_name}</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">{task.department_name}</td>
                    <td className="py-2.5 px-3">
                      <span className={`badge ${sc.color}`}>{sc.label}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {isOverdue && '🚨 '}{formatDate(task.deadline)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
