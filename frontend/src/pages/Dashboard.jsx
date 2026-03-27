import { useAuth } from '../context/AuthContext';
import CEODashboard from '../components/Dashboard/CEODashboard';
import ManagerDashboard from '../components/Dashboard/ManagerDashboard';
import EmployeeDashboard from '../components/Dashboard/EmployeeDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === 'super_admin') return <CEODashboard />;
  if (user?.role === 'manager') return <ManagerDashboard />;
  return <EmployeeDashboard />;
}
