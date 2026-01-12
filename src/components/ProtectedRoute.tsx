import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/services/api';

interface ProtectedRouteProps {
  role?: 'teacher' | 'student';
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();

  // Secondary check for Student role which might use different storage
  const hasStudentToken = !!storage.getItem('studentToken');
  const actualAuth = isAuthenticated || (role === 'student' && hasStudentToken);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="font-black uppercase tracking-[0.3em] text-[10px] text-primary animate-pulse">Initializing Terminal...</div>
        </div>
      </div>
    );
  }

  if (!actualAuth) {
    return <Navigate to={role === 'student' ? "/student/login" : "/login"} replace />;
  }

  return <Outlet />;
}

