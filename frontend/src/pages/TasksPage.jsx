import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import {
  formatDate, formatDateTime, statusConfig, priorityConfig,
  errorMessage, timeAgo
} from '../utils/helpers';

const STATUS_COLUMNS = [
  { key: 'assigned',    label: 'Assigned',    color: 'bg-gray-100', dot: 'bg-gray-400' },
  { key: 'accepted',   label: 'Accepted',    color: 'bg-blue-50',  dot: 'bg-blue-400' },
  { key: 'in_progress',label: 'In Progress', color: 'bg-yellow-50',dot: 'bg-yellow-400' },
  { key: 'completed',  label: 'Completed',   color: 'bg-green-50', dot: 'bg-green-400' },
  { key: 'reviewed',   label: 'Reviewed',    color: 'bg-purple-50',dot: 'bg-purple-400' },
];

const PRIORITY_COLORS = {
  low: 'border-l-gray-300',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};

export default function TasksPage() {
  const { user, canManage, isCEO, isManager } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board');
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: '', priority: '', department_id: '', overdue: '' });
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', description: '', assigned_to: '', department_id: '',
    deadline: '', priority: 'medium', is_recurring: false, recurrence_pattern: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [stats, setStats] = useState(null);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    fetchTasks();
    fetchStats();
    if (canManage) {
      api.get('/employees').then(r => setEmployees(r.data)).catch(()=>{});
      api.get('/departments').then(r => setDepartments(r.data)).catch(()=>{});
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [filters]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.priority) params.priority = filters.priority;
      if (filters.department_id) params.department_id = filters.department_id;
      if (filters.overdue) params.overdue = 'true';
      const res = await api.get('/tasks', { params });
      setTasks(res.data);
    } catch {} finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/tasks/stats/overview');
      setStats(res.data);
    } catch {}
  };

  const openDetail = async (task) => {
    try {
      const res = await api.get(`/tasks/${task.id}`);
      setDetailTask(res.data);
      setDetailModal(true);
    } catch {}
  };

  const updateStatus = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      fetchTasks();
      if (detailTask?.id === taskId) {
        const res = await api.get(`/tasks/${taskId}`);
        setDetailTask(res.data);
      }
    } catch (err) { alert(errorMessage(err)); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.deadline) { setCreateError('Deadline is mandatory'); return; }
    setCreating(true); setCreateError('');
    try {
      await api.post('/tasks', createForm);
      setCreateModal(false);
      setCreateForm({ title: '', description: '', assigned_to: '', department_id: '', deadline: '', priority: 'medium', is_recurring: false, recurrence_pattern: '' });
      fetchTasks(); fetchStats();
    } catch (err) { setCreateError(errorMessage(err)); }
    finally { setCreating(false); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !detailTask) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/tasks/${detailTask.id}/comments`, { comment: newComment });
      setDetailTask(prev => ({ ...prev, comments: [...(prev.comments || []), res.data] }));
      setNewComment('');
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) { alert(errorMessage(err)); }
    finally { setSubmittingComment(false); }
  };

  const tasksByStatus = (status) => tasks.filter(t => t.status === status);

  const nextStatuses = {
    employee: { assigned: ['accepted'], accepted: ['in_progress'], in_progress: ['completed'] },
    manager: { assigned: ['accepted', 'in_progress'], accepted: ['in_progress'], in_progress: ['completed'], completed: ['reviewed'] },
    super_admin: { assigned: ['accepted', 'in_progress', 'completed'], accepted: ['in_progress', 'completed'], in_progress: ['completed', 'reviewed'], completed: ['reviewed'] },
  };

  const allowedNext = (task) => nextStatuses[user.role]?.[task.status] || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 text-sm">
            {stats ? `${stats.total} total · ${stats.in_progress} in progress · ${stats.overdue} overdue` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {['board', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {v === 'board' ? '⬜ Board' : '☰ List'}
              </button>
            ))}
          </div>
          {canManage && (
            <button onClick={() => setCreateModal(true)} className="btn-primary">
              + New Task
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Pending', value: stats.pending, color: 'text-gray-600' },
            { label: 'In Progress', value: stats.in_progress, color: 'text-yellow-600' },
            { label: 'Completed', value: stats.completed, color: 'text-green-600' },
            { label: 'Reviewed', value: stats.reviewed, color: 'text-purple-600' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <input
            className="input max-w-xs"
            placeholder="🔍 Search tasks..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
          <select className="input max-w-xs" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
            <option value="">All Priorities</option>
            {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {canManage && (
            <select className="input max-w-xs" value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="rounded" checked={filters.overdue === 'true'}
              onChange={e => setFilters(f => ({ ...f, overdue: e.target.checked ? 'true' : '' }))} />
            Overdue only
          </label>
          {Object.values(filters).some(Boolean) && (
            <button onClick={() => setFilters({ search: '', priority: '', department_id: '', overdue: '' })}
              className="text-sm text-red-500 hover:text-red-700">Clear filters</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : view === 'board' ? (
        /* BOARD VIEW */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map(col => {
            const colTasks = tasksByStatus(col.key);
            return (
              <div key={col.key} className="flex-shrink-0 w-72">
                <div className={`${col.color} rounded-t-lg px-3 py-2.5 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="font-semibold text-sm text-gray-800">{col.label}</span>
                  </div>
                  <span className="text-xs bg-white px-1.5 py-0.5 rounded-full text-gray-600 font-medium">{colTasks.length}</span>
                </div>
                <div className="bg-gray-50 rounded-b-lg min-h-[200px] p-2 space-y-2">
                  {colTasks.map(task => (
                    <TaskCard key={task.id} task={task} onOpen={openDetail} onStatusChange={updateStatus} allowedNext={allowedNext(task)} />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-300 text-sm">No tasks</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Task</th>
                {canManage && <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Assigned To</th>}
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Priority</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Deadline</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-gray-400">No tasks found</td></tr>
              ) : tasks.map(task => {
                const sc = statusConfig[task.status];
                const pc = priorityConfig[task.priority];
                const next = allowedNext(task);
                return (
                  <tr key={task.id} className={`hover:bg-gray-50/50 cursor-pointer ${task.isOverdue ? 'bg-red-50/30' : ''}`} onClick={() => openDetail(task)}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 truncate max-w-[250px]">
                        {task.isOverdue && <span className="text-red-500 mr-1">🚨</span>}{task.title}
                      </div>
                      {canManage && <div className="text-xs text-gray-400">{task.department_name}</div>}
                    </td>
                    {canManage && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={task.assigned_to_name} size="xs" />
                          <span className="text-gray-700">{task.assigned_to_name}</span>
                        </div>
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <span className={`badge ${pc?.color}`}>{pc?.label}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${sc?.color}`}>{sc?.label}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {formatDate(task.deadline)}
                      </span>
                    </td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      {next.length > 0 && (
                        <select
                          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                          value=""
                          onChange={e => { if (e.target.value) updateStatus(task.id, e.target.value); }}
                        >
                          <option value="">Move to...</option>
                          {next.map(s => <option key={s} value={s}>{statusConfig[s]?.label}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Detail Modal */}
      <Modal open={detailModal} onClose={() => { setDetailModal(false); setDetailTask(null); }} title="Task Details" size="lg">
        {detailTask && <TaskDetail task={detailTask} user={user} canManage={canManage} allowedNext={allowedNext(detailTask)}
          onStatusChange={updateStatus} newComment={newComment} setNewComment={setNewComment}
          onAddComment={handleAddComment} submittingComment={submittingComment} commentsEndRef={commentsEndRef} />}
      </Modal>

      {/* Create Task Modal */}
      <Modal open={createModal} onClose={() => { setCreateModal(false); setCreateError(''); }} title="Create New Task">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{createError}</div>}
          <div>
            <label className="label">Title *</label>
            <input className="input" required value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title..." />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="Task details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Assign To *</label>
              <select className="input" required value={createForm.assigned_to} onChange={e => setCreateForm(f => ({ ...f, assigned_to: e.target.value }))}>
                <option value="">Select employee...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.department_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select className="input" value={createForm.department_id} onChange={e => setCreateForm(f => ({ ...f, department_id: e.target.value }))}>
                <option value="">Auto (from employee)</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Deadline * <span className="text-red-500">(mandatory)</span></label>
              <input type="datetime-local" className="input" required value={createForm.deadline}
                onChange={e => setCreateForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={createForm.priority} onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))}>
                {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={createForm.is_recurring} onChange={e => setCreateForm(f => ({ ...f, is_recurring: e.target.checked }))} />
            <span>Recurring Task</span>
          </label>
          {createForm.is_recurring && (
            <div>
              <label className="label">Recurrence Pattern</label>
              <select className="input" value={createForm.recurrence_pattern} onChange={e => setCreateForm(f => ({ ...f, recurrence_pattern: e.target.value }))}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={creating} className="btn-primary flex-1">
              {creating ? 'Creating...' : 'Create Task'}
            </button>
            <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TaskCard({ task, onOpen, onStatusChange, allowedNext }) {
  const pc = priorityConfig[task.priority];
  const sc = statusConfig[task.status];
  return (
    <div
      onClick={() => onOpen(task)}
      className={`bg-white rounded-lg p-3 border-l-4 ${PRIORITY_COLORS[task.priority]} shadow-sm hover:shadow-md transition-all cursor-pointer ${task.isOverdue ? 'border-red-400 bg-red-50/30' : ''}`}
    >
      {task.isOverdue && <div className="text-xs text-red-600 font-medium mb-1">🚨 Overdue</div>}
      <div className="font-medium text-sm text-gray-900 mb-2 leading-tight">{task.title}</div>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={`badge text-xs ${pc?.color}`}>{pc?.label}</span>
        {task.commentCount > 0 && <span className="text-xs text-gray-400">💬 {task.commentCount}</span>}
        {task.is_recurring && <span className="text-xs text-gray-400">🔄</span>}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Avatar name={task.assigned_to_name} size="xs" />
          <span className="text-xs text-gray-500 truncate max-w-[80px]">{task.assigned_to_name}</span>
        </div>
        <span className={`text-xs ${task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
          {formatDate(task.deadline, 'MMM d')}
        </span>
      </div>
      {allowedNext.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
          <select
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50"
            value="" onChange={e => { if (e.target.value) onStatusChange(task.id, e.target.value); }}
          >
            <option value="">Move to...</option>
            {allowedNext.map(s => <option key={s} value={s}>{statusConfig[s]?.label}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function TaskDetail({ task, user, canManage, allowedNext, onStatusChange, newComment, setNewComment, onAddComment, submittingComment, commentsEndRef }) {
  const pc = priorityConfig[task.priority];
  const sc = statusConfig[task.status];
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold text-gray-900 leading-tight">{task.title}</h2>
          <div className="flex gap-2 flex-shrink-0">
            <span className={`badge ${pc?.color}`}>{pc?.label}</span>
            <span className={`badge ${sc?.color}`}>{sc?.label}</span>
          </div>
        </div>
        {task.isOverdue && <div className="text-sm text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-lg">🚨 This task is overdue!</div>}
      </div>

      {task.description && <p className="text-gray-600 text-sm leading-relaxed">{task.description}</p>}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-400">Assigned To:</span> <span className="font-medium text-gray-900">{task.assigned_to_name}</span></div>
        <div><span className="text-gray-400">Assigned By:</span> <span className="font-medium text-gray-900">{task.assigned_by_name}</span></div>
        <div><span className="text-gray-400">Department:</span> <span className="text-gray-700">{task.department_name}</span></div>
        <div>
          <span className="text-gray-400">Deadline:</span>
          <span className={`font-medium ml-1 ${task.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {formatDate(task.deadline, 'MMM d, yyyy HH:mm')}
          </span>
        </div>
        {task.is_recurring && <div><span className="text-gray-400">Recurring:</span> <span className="text-gray-700 capitalize">{task.recurrence_pattern}</span></div>}
      </div>

      {/* Status Actions */}
      {allowedNext.length > 0 && (
        <div>
          <label className="label">Move Task To:</label>
          <div className="flex gap-2 flex-wrap">
            {allowedNext.map(s => {
              const sconf = statusConfig[s];
              return (
                <button key={s} onClick={() => onStatusChange(task.id, s)} className={`btn-outline text-sm ${sconf?.color} border-current`}>
                  → {sconf?.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comments */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Comments ({task.comments?.length || 0})</h4>
        <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
          {(task.comments || []).map(c => (
            <div key={c.id} className="flex gap-3">
              <Avatar name={c.user_name} size="xs" />
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-xs text-gray-900">{c.user_name}</span>
                  <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700">{c.comment}</p>
              </div>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Add a comment..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAddComment(); } }}
          />
          <button onClick={onAddComment} disabled={submittingComment || !newComment.trim()} className="btn-primary px-4">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
