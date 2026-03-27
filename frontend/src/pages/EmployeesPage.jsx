import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Avatar from '../components/common/Avatar';
import { roleConfig, sectionConfig, formatDate, errorMessage } from '../utils/helpers';

export default function EmployeesPage() {
  const { isCEO } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ department_id: '', section: '', role: '', active: '' });
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', department_id: '', section: 'inhouse', position: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll();
    api.get('/departments').then(r => setDepartments(r.data)).catch(()=>{});
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [filters, search]);

  const fetchAll = async () => {
    setLoading(true);
    try { await fetchEmployees(); }
    finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    const params = {};
    if (search) params.search = search;
    if (filters.department_id) params.department = filters.department_id;
    if (filters.section) params.section = filters.section;
    if (filters.role) params.role = filters.role;
    try {
      const res = await api.get('/employees', { params });
      setEmployees(res.data);
    } catch {}
  };

  const openDetail = async (emp) => {
    setSelectedEmp(emp);
    setDetailModal(true);
    try {
      const res = await api.get(`/employees/${emp.id}`);
      setDetailData(res.data);
    } catch {}
  };

  const openEdit = (emp) => {
    setSelectedEmp(emp);
    setForm({ name: emp.name, email: emp.email, password: '', role: emp.role, department_id: emp.department_id || '', section: emp.section || 'inhouse', position: emp.position || '', phone: emp.phone || '' });
    setEditModal(true);
    setError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/employees', form);
      setCreateModal(false);
      setForm({ name: '', email: '', password: '', role: 'employee', department_id: '', section: 'inhouse', position: '', phone: '' });
      fetchEmployees();
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.put(`/employees/${selectedEmp.id}`, form);
      setEditModal(false);
      fetchEmployees();
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (emp) => {
    if (!confirm(`${emp.is_active ? 'Deactivate' : 'Activate'} ${emp.name}?`)) return;
    try {
      await api.patch(`/employees/${emp.id}/status`, { is_active: !emp.is_active });
      fetchEmployees();
    } catch (err) { alert(errorMessage(err)); }
  };

  const activeCount = employees.filter(e => e.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500 text-sm">{activeCount} active · {employees.length} total</p>
        </div>
        {isCEO && <button onClick={() => { setCreateModal(true); setError(''); }} className="btn-primary">+ Add Employee</button>}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <input className="input max-w-xs" placeholder="🔍 Search name, email, position..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input max-w-xs" value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input max-w-[160px]" value={filters.section} onChange={e => setFilters(f => ({ ...f, section: e.target.value }))}>
            <option value="">All Sections</option>
            <option value="onsite">On-Site</option>
            <option value="inhouse">In-House</option>
          </select>
          <select className="input max-w-[160px]" value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}>
            <option value="">All Roles</option>
            <option value="super_admin">CEO/Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Employee</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Department</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Section</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-gray-400">No employees found</td></tr>
              ) : employees.map(emp => {
                const rc = roleConfig[emp.role];
                const sc = sectionConfig[emp.section];
                return (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => openDetail(emp)}>
                        <Avatar name={emp.name} size="sm" />
                        <div>
                          <div className={`font-medium ${emp.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{emp.name}</div>
                          <div className="text-xs text-gray-400">{emp.email}</div>
                          {emp.position && <div className="text-xs text-gray-500">{emp.position}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{emp.department_name || '—'}</td>
                    <td className="py-3 px-4">
                      {sc && <span className={`badge ${sc.color}`}>{sc.label}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${rc?.color}`}>{rc?.label}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${emp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(emp)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        {isCEO && (
                          <button onClick={() => handleToggleStatus(emp)} className={`text-xs font-medium ${emp.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                            {emp.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee Detail Modal */}
      <Modal open={detailModal} onClose={() => { setDetailModal(false); setDetailData(null); }} title="Employee Profile" size="md">
        {(detailData || selectedEmp) && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={(detailData || selectedEmp).name} size="xl" />
              <div>
                <h3 className="text-xl font-bold">{(detailData || selectedEmp).name}</h3>
                <p className="text-gray-500">{(detailData || selectedEmp).position || 'No position set'}</p>
                <p className="text-gray-400 text-sm">{(detailData || selectedEmp).email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">Department</div>
                <div className="font-medium">{(detailData || selectedEmp).department_name || '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">Section</div>
                <div className="font-medium capitalize">{(detailData || selectedEmp).section || '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">Role</div>
                <div className="font-medium">{roleConfig[(detailData || selectedEmp).role]?.label}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">Phone</div>
                <div className="font-medium">{(detailData || selectedEmp).phone || '—'}</div>
              </div>
            </div>
            {detailData?.attendanceSummary && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Attendance (Last 30 Days)</h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {detailData.attendanceSummary.map(a => (
                    <div key={a.status} className="bg-gray-50 rounded-lg p-2">
                      <div className="font-bold text-lg text-gray-900">{a.count}</div>
                      <div className="text-gray-400 capitalize">{a.status.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detailData?.taskSummary && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Task Summary</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {detailData.taskSummary.map(t => (
                    <div key={t.status} className="bg-gray-50 rounded-lg p-2">
                      <div className="font-bold text-lg text-gray-900">{t.count}</div>
                      <div className="text-gray-400 capitalize">{t.status.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create/Edit Employee Modal */}
      {[{ open: createModal, title: 'Add Employee', onClose: () => setCreateModal(false), onSubmit: handleCreate },
        { open: editModal, title: 'Edit Employee', onClose: () => setEditModal(false), onSubmit: handleUpdate }]
        .map(({ open, title, onClose, onSubmit }) => (
          <Modal key={title} open={open} onClose={onClose} title={title}>
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Full Name *</label>
                  <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input type="email" className="input" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                {title === 'Add Employee' && (
                  <div>
                    <label className="label">Password *</label>
                    <input type="password" className="input" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} minLength={6} />
                  </div>
                )}
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {isCEO && <option value="super_admin">CEO / Super Admin</option>}
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select className="input" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">No Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Section</label>
                  <select className="input" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
                    <option value="inhouse">In-House</option>
                    <option value="onsite">On-Site</option>
                  </select>
                </div>
                <div>
                  <label className="label">Position / Title</label>
                  <input className="input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="e.g. Senior Designer" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1234567890" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </Modal>
        ))}
    </div>
  );
}
