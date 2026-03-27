import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ReportsPage() {
  const { isCEO } = useAuth();
  const [activeTab, setActiveTab] = useState('performance');
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    department_id: '',
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data)).catch(()=>{});
    fetchReport();
  }, []);

  useEffect(() => { fetchReport(); }, [activeTab, filters]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      let endpoint;
      if (activeTab === 'attendance') endpoint = '/reports/attendance';
      else if (activeTab === 'tasks') endpoint = '/reports/tasks';
      else endpoint = '/reports/performance';
      const res = await api.get(endpoint, { params });
      setData(res.data);
    } catch {} finally { setLoading(false); }
  };

  const downloadCSV = (rows, filename) => {
    if (!rows?.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${filename}_${filters.start_date}_${filters.end_date}.csv`; a.click();
  };

  const tabs = [
    { key: 'performance', label: '📈 Performance' },
    { key: 'attendance', label: '⏱️ Attendance' },
    { key: 'tasks', label: '📋 Tasks' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm">Analyze performance, attendance, and task completion</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={filters.start_date} onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={filters.end_date} onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          {isCEO && (
            <div>
              <label className="label">Department</label>
              <select className="input" value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={fetchReport} className="btn-primary">Generate Report</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : !data ? null : (
        <>
          {activeTab === 'performance' && data.performance && (
            <div className="space-y-5">
              {/* Chart */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4">Efficiency Score by Employee</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.performance.slice(0, 20)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(val, name) => [`${val}%`, name]} />
                    <Bar dataKey="efficiency_score" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Efficiency Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">{data.performance.length} employees · Period: {formatDate(filters.start_date)} — {formatDate(filters.end_date)}</p>
                <button onClick={() => downloadCSV(data.performance, 'performance_report')} className="btn-outline text-sm">⬇️ Export CSV</button>
              </div>

              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Employee</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Department</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Attendance %</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Task Completion</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Overdue</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.performance.map((emp, i) => (
                      <tr key={emp.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-300 w-5">{i + 1}</span>
                            <div>
                              <div className="font-medium text-gray-900">{emp.name}</div>
                              <div className="text-xs text-gray-400">{emp.position}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">{emp.department_name}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium ${emp.attendance_rate >= 80 ? 'text-green-600' : emp.attendance_rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {emp.attendance_rate || 0}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium ${emp.task_completion_rate >= 80 ? 'text-green-600' : emp.task_completion_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {emp.task_completion_rate || 0}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={emp.overdue_tasks > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{emp.overdue_tasks}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1.5 bg-gray-100 rounded-full">
                              <div className={`h-full rounded-full ${emp.efficiency_score >= 80 ? 'bg-green-500' : emp.efficiency_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${emp.efficiency_score}%` }} />
                            </div>
                            <span className="font-bold text-gray-900">{emp.efficiency_score}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && data.report && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">{data.report.length} employees</p>
                <button onClick={() => downloadCSV(data.report, 'attendance_report')} className="btn-outline text-sm">⬇️ Export CSV</button>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Employee</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Department</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Present</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Late</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Absent</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Avg Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.report.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-400">{emp.position}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">{emp.department_name}</td>
                        <td className="py-3 px-4 text-right text-green-600 font-medium">{emp.present_days}</td>
                        <td className="py-3 px-4 text-right text-yellow-600 font-medium">{emp.late_days}</td>
                        <td className="py-3 px-4 text-right text-red-600 font-medium">{emp.absent_days}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{emp.avg_hours ? `${emp.avg_hours}h` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && data.byEmployee && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">{data.byEmployee.length} employees</p>
                <button onClick={() => downloadCSV(data.byEmployee, 'task_report')} className="btn-outline text-sm">⬇️ Export CSV</button>
              </div>

              {/* Department breakdown */}
              {data.byDepartment?.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold mb-4">By Department</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.byDepartment.map(dept => {
                      const rate = dept.total_tasks > 0 ? Math.round(dept.completed / dept.total_tasks * 100) : 0;
                      return (
                        <div key={dept.id} className="border border-gray-100 rounded-lg p-3">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium truncate">{dept.name}</span>
                            <span className="text-sm font-bold text-blue-600">{rate}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{dept.completed}/{dept.total_tasks} completed · {dept.overdue} overdue</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Employee</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Total</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Completed</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Overdue</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.byEmployee.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-400">{emp.department_name}</div>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">{emp.total_tasks}</td>
                        <td className="py-3 px-4 text-right text-green-600 font-medium">{emp.completed}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={emp.overdue > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{emp.overdue}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-bold ${(emp.completion_rate || 0) >= 80 ? 'text-green-600' : (emp.completion_rate || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {emp.completion_rate || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
