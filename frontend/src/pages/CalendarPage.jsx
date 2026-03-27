import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, statusConfig, priorityConfig } from '../utils/helpers';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, getDay } from 'date-fns';

export default function CalendarPage() {
  const { canManage } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    if (canManage) api.get('/departments').then(r => setDepartments(r.data)).catch(()=>{});
  }, [currentDate, deptFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      const params = {};
      if (deptFilter) params.department_id = deptFilter;
      const res = await api.get('/tasks', { params });
      setTasks(res.data);
    } catch {} finally { setLoading(false); }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const getTasksForDay = (day) => tasks.filter(t => {
    const d = new Date(t.deadline);
    return isSameDay(d, day);
  });

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  const prev = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 text-sm">Task deadlines by date</p>
        </div>
        {canManage && (
          <select className="input max-w-xs" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      <div className="card p-5">
        {/* Month Nav */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prev} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">←</button>
          <h2 className="text-lg font-semibold text-gray-900">{format(currentDate, 'MMMM yyyy')}</h2>
          <button onClick={next} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">→</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding */}
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}

          {days.map(day => {
            const dayTasks = getTasksForDay(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const hasOverdue = dayTasks.some(t => t.isOverdue);

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`min-h-[70px] p-1.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected ? 'border-blue-500 bg-blue-50' :
                  isToday(day) ? 'border-blue-300 bg-blue-50/50' :
                  'border-transparent hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday(day) ? 'bg-blue-600 text-white' : 'text-gray-700'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 2).map(task => (
                    <div key={task.id} className={`text-xs px-1 py-0.5 rounded truncate ${
                      task.isOverdue ? 'bg-red-100 text-red-700' :
                      task.priority === 'urgent' ? 'bg-red-50 text-red-600' :
                      task.priority === 'high' ? 'bg-orange-50 text-orange-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-xs text-gray-400 pl-1">+{dayTasks.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="card p-5 animate-slide-in">
          <h3 className="font-semibold text-gray-900 mb-4">{format(selectedDay, 'EEEE, MMMM d, yyyy')} — {selectedDayTasks.length} task{selectedDayTasks.length !== 1 ? 's' : ''}</h3>
          {selectedDayTasks.length === 0 ? (
            <p className="text-gray-400 text-sm">No tasks due on this day</p>
          ) : (
            <div className="space-y-3">
              {selectedDayTasks.map(task => {
                const sc = statusConfig[task.status];
                const pc = priorityConfig[task.priority];
                return (
                  <div key={task.id} className={`border rounded-lg p-3 ${task.isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">→ {task.assigned_to_name}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <span className={`badge ${pc?.color}`}>{pc?.label}</span>
                        <span className={`badge ${sc?.color}`}>{sc?.label}</span>
                      </div>
                    </div>
                    {task.isOverdue && <p className="text-xs text-red-600 font-medium mt-1">🚨 Overdue</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
