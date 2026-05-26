import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import MyClasses from '@/pages/MyClasses';
import Evaluation from '@/pages/Evaluation';
import Rubrics from '@/pages/Rubrics';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();
  const navigate = useNavigate();
  
  React.useEffect(() => {
    if (!loading && !token) {
      navigate('/login', { replace: true });
    }
  }, [token, loading, navigate]);

  if (loading || !token) return null;
  return <Layout>{children}</Layout>;
};

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();
  const navigate = useNavigate();
  
  React.useEffect(() => {
    if (!loading && token) {
      navigate('/', { replace: true });
    }
  }, [token, loading, navigate]);

  if (loading || token) return null;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="font-sans antialiased">
          <Routes>
            <Route 
              path="/login" 
              element={
                <AuthGuard>
                  <Login />
                </AuthGuard>
              } 
            />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/classes" element={<ProtectedRoute><MyClasses /></ProtectedRoute>} />
            <Route path="/rubrics" element={<ProtectedRoute><Rubrics /></ProtectedRoute>} />
            <Route path="/evaluate" element={<ProtectedRoute><Evaluation /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" expand={true} richColors closeButton />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
