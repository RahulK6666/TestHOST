import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Avatar from '../components/common/Avatar';
import StatCard from '../components/common/StatCard';
import {
  formatDate, formatTime, hoursWorked,
  attendanceStatusConfig, errorMessage
} from '../utils/helpers';

export default function AttendancePage() {
  const { user, isCEO, isManager, canManage } = useAuth();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [todayOverview, setTodayOverview] = useState(null);
  const [deptStats, setDeptStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    status: '',
    department_id: '',
  });
  const [departments, setDepartments] = useState([]);
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ user_id: '', date: new Date().toISOString().split('T')[0], punch_in: '09:00', punch_out: '18:00', status: 'present', notes: '' });
  const [employees, setEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [punching, setPunching] = useState(false);
  const [punchMsg, setPunchMsg] = useState('');
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchRecords();
  }, [filters, activeTab]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const promises = [
        api.get('/attendance/today'),
        api.get('/attendance/summary', { params: { start_date: filters.start_date, end_date: filters.end_date } }),
      ];
      if (canManage) {
        promises.push(api.get('/attendance/today-overview'));
        promises.push(api.get('/attendance/dept-stats'));
        promises.push(api.get('/departments'));
        promises.push(api.get('/employees', { params: { role: 'employee' } }));
      }
      const results = await Promise.all(promises);
      setTodayAttendance(results[0].data);
      setSummary(results[1].data);
      if (canManage) {
        setTodayOverview(results[2].data);
        setDeptStats(results[3].data);
        setDepartments(results[4].data);
        setEmployees(results[5].data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchRecords = async () => {
    try {
      const res = await api.get('/attendance', { params: filters });
      setRecords(res.data);
    } catch {}
  };

  const handlePunch = async (type) => {
    setPunching(true); setPunchMsg('');
    try {
      const res = await api.post(`/attendance/${type}`);
      setPunchMsg(res.data.message + (res.data.isLate ? ' — You are late!' : ''));
      fetchAll();
    } catch (err) { setPunchMsg(errorMessage(err)); }
    finally { setPunching(false); }
  };

  const handleOverride = async (e) => {
    e.preventDefault();
    try {
      const body = {
        ...overrideForm,
        punch_in: overrideForm.punch_in ? `${overrideForm.date}T${overrideForm.punch_in}:00` : null,
        punch_out: overrideForm.punch_out ? `${overrideForm.date}T${overrideForm.punch_out}:00` : null,
      };
      await api.post('/attendance/override', body);
      setOverrideModal(false);
      fetchAll();
      fetchRecords();
    } catch (err) { alert(errorMessage(err)); }
  };

  const statusColor = (s) => {
    const map = { present: 'text-green-700 bg-green-50', late: 'text-yellow-700 bg-yellow-50', absent: 'text-red-700 bg-red-50', half_day: 'text-orange-700 bg-orange-50', override: 'text-purple-700 bg-purple-50' };
    return map[s] || 'text-gray-700 bg-gray-50';
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 text-sm">{formatDate(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        {canManage && (
          <button onClick={() => setOverrideModal(true)} className="btn-outline text-sm">
            ✏️ Override Attendance
          </button>
        )}
      </div>

      {/* My Punch Card (for employees) */}
      {!canManage && (
        <div className="card p-6">
          <h3 className="font-semibold text-lg mb-4">My Attendance Today</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              {todayAttendance?.punch_in
                ? <p className="text-sm text-gray-600">🟢 Punched In: <strong>{formatTime(todayAttendance.punch_in)}</strong></p>
                : <p className="text-gray-400 text-sm">Not punched in yet</p>}
              {todayAttendance?.punch_out && <p className="text-sm text-gray-600">🔴 Punched Out: <strong>{formatTime(todayAttendance.punch_out)}</strong></p>}
              {todayAttendance?.punch_in && todayAttendance?.punch_out && (
                <p className="text-sm text-gray-600">⏱️ Hours: <strong>{hoursWorked(todayAttendance.punch_in, todayAttendance.punch_out)}</strong></p>
              )}
              {todayAttendance?.status && (
                <span className={`badge ${statusColor(todayAttendance.status)}`}>
                  {attendanceStatusConfig[todayAttendance.status]?.label}
                </span>
              )}
              {punchMsg && <p className={`text-sm font-medium ${punchMsg.includes('late') || punchMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{punchMsg}</p>}
            </div>
            <div className="flex gap-3">
              {!todayAttendance?.punch_in && (
                <button onClick={() => handlePunch('punch-in')} disabled={punching} className="btn-success px-8 py-3 text-base">
                  🟢 Punch In
                </button>
              )}
              {todayAttendance?.punch_in && !todayAttendance?.punch_out && (
                <button onClick={() => handlePunch('punch-out')} disabled={punching} className="btn-danger px-8 py-3 text-base">
                  🔴 Punch Out
                </button>
              )}
              {todayAttendance?.punch_out && <p className="text-green-600 font-semibold">✅ Day Complete</p>}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Present" value={summary.present} icon="✅" color="green" />
          <StatCard title="Late" value={summary.late} icon="⏰" color="yellow" />
          <StatCard title="Absent" value={summary.absent} icon="❌" color="red" />
          <StatCard title="Half Day" value={summary.half_day} icon="🌓" color="orange" />
        </div>
      )}

      {/* Admin: Today's overview */}
      {canManage && todayOverview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Employees" value={todayOverview.total_employees} icon="👥" color="blue" />
          <StatCard title="Present Today" value={todayOverview.present} icon="✅" color="green" />
          <StatCard title="Late Today" value={todayOverview.late} icon="⏰" color="yellow" />
          <StatCard title="Still Clocked In" value={todayOverview.still_in} icon="🔵" color="teal" />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {[
            { key: 'today', label: 'Today\'s View' },
            { key: 'history', label: 'History' },
            ...(canManage ? [{ key: 'departments', label: 'By Department' }] : []),
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); if (tab.key === 'history') fetchRecords(); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'today' && canManage && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold">Today's Status</h3>
            {todayOverview?.notPunchedOut?.length > 0 && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                {todayOverview.notPunchedOut.length} still clocked in
              </span>
            )}
          </div>
          {todayOverview?.notPunchedOut?.length > 0 && (
            <div className="px-5 py-3 bg-orange-50 border-b border-orange-100">
              <p className="text-sm font-medium text-orange-700 mb-2">Employees not yet punched out:</p>
              <div className="flex flex-wrap gap-2">
                {todayOverview.notPunchedOut.map(e => (
                  <span key={e.id} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    {e.name} · since {formatTime(e.punch_in)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="label">From</label>
                <input type="date" className="input" value={filters.start_date}
                  onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">To</label>
                <input type="date" className="input" value={filters.end_date}
                  onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={filters.status}
                  onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                  <option value="">All</option>
                  {Object.entries(attendanceStatusConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              {canManage && (
                <div>
                  <label className="label">Department</label>
                  <select className="input" value={filters.department_id}
                    onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {canManage && <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Employee</th>}
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Punch In</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Punch Out</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Hours</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Status</th>
                    {canManage && <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Department</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.length === 0 ? (
                    <tr><td colSpan="7" className="py-10 text-center text-gray-400">No records found</td></tr>
                  ) : records.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      {canManage && (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar name={r.user_name} size="xs" />
                            <div>
                              <div className="font-medium text-gray-900">{r.user_name}</div>
                              <div className="text-xs text-gray-400">{r.position}</div>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-4 text-gray-700">{formatDate(r.date, 'EEE, MMM d')}</td>
                      <td className="py-3 px-4 text-gray-700">{r.punch_in ? formatTime(r.punch_in) : '—'}</td>
                      <td className="py-3 px-4 text-gray-700">{r.punch_out ? formatTime(r.punch_out) : '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{r.punch_in && r.punch_out ? hoursWorked(r.punch_in, r.punch_out) : '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${attendanceStatusConfig[r.status]?.color}`}>
                          {attendanceStatusConfig[r.status]?.label}
                        </span>
                      </td>
                      {canManage && <td className="py-3 px-4 text-gray-500 text-xs">{r.department_name}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'departments' && canManage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deptStats.map(dept => {
            const rate = dept.total > 0 ? Math.round((dept.present / dept.total) * 100) : 0;
            return (
              <div key={dept.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${dept.section === 'onsite' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>
                      {dept.section}
                    </span>
                  </div>
                  <span className={`text-2xl font-bold ${rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{rate}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full mb-3">
                  <div className={`h-full rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div><div className="font-bold text-gray-900">{dept.total}</div><div className="text-gray-400">Total</div></div>
                  <div><div className="font-bold text-green-600">{dept.present}</div><div className="text-gray-400">Present</div></div>
                  <div><div className="font-bold text-yellow-600">{dept.late}</div><div className="text-gray-400">Late</div></div>
                  <div><div className="font-bold text-red-600">{dept.absent}</div><div className="text-gray-400">Absent</div></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Override Modal */}
      <Modal open={overrideModal} onClose={() => setOverrideModal(false)} title="Override Attendance">
        <form onSubmit={handleOverride} className="space-y-4">
          <div>
            <label className="label">Employee</label>
            <select className="input" value={overrideForm.user_id} onChange={e => setOverrideForm(f => ({ ...f, user_id: e.target.value }))} required>
              <option value="">Select employee...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.department_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={overrideForm.date} onChange={e => setOverrideForm(f => ({ ...f, date: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Punch In</label>
              <input type="time" className="input" value={overrideForm.punch_in} onChange={e => setOverrideForm(f => ({ ...f, punch_in: e.target.value }))} />
            </div>
            <div>
              <label className="label">Punch Out</label>
              <input type="time" className="input" value={overrideForm.punch_out} onChange={e => setOverrideForm(f => ({ ...f, punch_out: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={overrideForm.status} onChange={e => setOverrideForm(f => ({ ...f, status: e.target.value }))}>
              {Object.entries(attendanceStatusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={overrideForm.notes} onChange={e => setOverrideForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for override..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Save Override</button>
            <button type="button" onClick={() => setOverrideModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
