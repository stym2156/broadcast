import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/auth';
import { DashboardLayout } from './components/layout/DashboardLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import FacebookCallback from './pages/auth/FacebookCallback';
import WhatsAppLogin from './pages/auth/WhatsAppLogin';
import ConnectPages from './pages/ConnectPages';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Broadcast from './pages/Broadcast';
import History from './pages/History';
import Pages from './pages/Pages';
import Customers from './pages/Customers';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-zinc-400">กำลังโหลด...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const hydrate = useAuth((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
      <Route path="/login/whatsapp" element={<WhatsAppLogin />} />
      <Route
        path="/connect-pages"
        element={
          <Protected>
            <ConnectPages />
          </Protected>
        }
      />
      <Route
        element={
          <Protected>
            <DashboardLayout />
          </Protected>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/broadcast" element={<Broadcast />} />
        <Route path="/history" element={<History />} />
        <Route path="/pages" element={<Pages />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
