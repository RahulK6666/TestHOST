import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AttendancePage from './pages/AttendancePage';
import TasksPage from './pages/TasksPage';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import ReportsPage from './pages/ReportsPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="employees" element={<PrivateRoute roles={['super_admin','manager']}><EmployeesPage /></PrivateRoute>} />
        <Route path="departments" element={<PrivateRoute roles={['super_admin','manager']}><DepartmentsPage /></PrivateRoute>} />
        <Route path="reports" element={<PrivateRoute roles={['super_admin','manager']}><ReportsPage /></PrivateRoute>} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
