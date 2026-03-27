import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Avatar from '../components/common/Avatar';
import { sectionConfig, errorMessage } from '../utils/helpers';

export default function DepartmentsPage() {
  const { isCEO } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [form, setForm] = useState({ name: '', section: 'inhouse', description: '', manager_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDepts();
    api.get('/employees', { params: { role: 'manager' } }).then(r => setManagers(r.data)).catch(()=>{});
  }, []);

  const fetchDepts = async () => {
    setLoading(true);
    try { const res = await api.get('/departments'); setDepartments(res.data); }
    finally { setLoading(false); }
  };

  const openDetail = async (dept) => {
    setDetailModal(true);
    try { const res = await api.get(`/departments/${dept.id}`); setDetailData(res.data); }
    catch {}
  };

  const openEdit = (dept) => {
    setSelectedDept(dept);
    setForm({ name: dept.name, section: dept.section, description: dept.description || '', manager_id: dept.manager_id || '' });
    setEditModal(true); setError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/departments', form);
      setCreateModal(false);
      setForm({ name: '', section: 'inhouse', description: '', manager_id: '' });
      fetchDepts();
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.put(`/departments/${selectedDept.id}`, form);
      setEditModal(false); fetchDepts();
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  };

  const onsite = departments.filter(d => d.section === 'onsite');
  const inhouse = departments.filter(d => d.section === 'inhouse');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500 text-sm">{departments.length} departments · {onsite.length} on-site · {inhouse.length} in-house</p>
        </div>
        {isCEO && <button onClick={() => { setCreateModal(true); setError(''); setForm({ name: '', section: 'inhouse', description: '', manager_id: '' }); }} className="btn-primary">+ Add Department</button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-8">
          {[{ label: '🏗️ On-Site Teams', items: onsite, section: 'onsite' }, { label: '🏢 In-House Teams', items: inhouse, section: 'inhouse' }].map(group => (
            <div key={group.section}>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">{group.label}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.items.map(dept => (
                  <div key={dept.id} className="card p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(dept)}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                        <span className={`badge mt-1 ${sectionConfig[dept.section]?.color}`}>{sectionConfig[dept.section]?.label}</span>
                      </div>
                      {isCEO && (
                        <button onClick={e => { e.stopPropagation(); openEdit(dept); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      )}
                    </div>
                    {dept.description && <p className="text-xs text-gray-500 mb-3 leading-relaxed">{dept.description}</p>}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        {dept.manager_name ? (
                          <>
                            <Avatar name={dept.manager_name} size="xs" />
                            <span className="text-xs text-gray-600">{dept.manager_name}</span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No manager assigned</span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{dept.employee_count} <span className="text-gray-400 font-normal text-xs">members</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={detailModal} onClose={() => { setDetailModal(false); setDetailData(null); }} title="Department Details" size="lg">
        {detailData && (
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{detailData.name}</h3>
                <span className={`badge mt-1 ${sectionConfig[detailData.section]?.color}`}>{sectionConfig[detailData.section]?.label}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{detailData.employees?.length || 0}</div>
                <div className="text-xs text-gray-400">Members</div>
              </div>
            </div>
            {detailData.description && <p className="text-gray-600 text-sm">{detailData.description}</p>}

            {detailData.attendanceToday && (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{detailData.attendanceToday.present}</div>
                  <div className="text-xs text-gray-500">Present Today</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-700">{detailData.attendanceToday.total}</div>
                  <div className="text-xs text-gray-500">Total Members</div>
                </div>
              </div>
            )}

            {detailData.taskStats?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Task Status</h4>
                <div className="flex flex-wrap gap-2">
                  {detailData.taskStats.map(t => (
                    <span key={t.status} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                      {t.status}: <strong>{t.count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-sm mb-3">Team Members ({detailData.employees?.length || 0})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(detailData.employees || []).map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 py-1">
                    <Avatar name={emp.name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                      {emp.position && <span className="text-xs text-gray-400 ml-2">{emp.position}</span>}
                    </div>
                    <span className={`badge text-xs ${emp.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {emp.role === 'manager' ? 'Manager' : 'Employee'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      {[
        { open: createModal, title: 'Add Department', onClose: () => setCreateModal(false), onSubmit: handleCreate },
        { open: editModal, title: 'Edit Department', onClose: () => setEditModal(false), onSubmit: handleUpdate },
      ].map(({ open, title, onClose, onSubmit }) => (
        <Modal key={title} open={open} onClose={onClose} title={title}>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
            <div>
              <label className="label">Department Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Creative Studio" />
            </div>
            <div>
              <label className="label">Section *</label>
              <select className="input" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
                <option value="inhouse">In-House</option>
                <option value="onsite">On-Site</option>
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Department Manager</label>
              <select className="input" value={form.manager_id} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}>
                <option value="">None</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
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
