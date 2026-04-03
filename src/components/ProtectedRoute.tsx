import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStudentAuth } from '@/context/StudentAuthContext';

interface ProtectedRouteProps {
  role?: 'teacher' | 'student';
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { isAuthenticated: isFacultyAuth, loading: facultyLoading } = useAuth();
  const { isAuthenticated: isStudentAuth, isInitializing: studentInitializing } = useStudentAuth();

  // For student routes: ONLY check student auth — don't wait for faculty API
  if (role === 'student') {
    if (studentInitializing) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-600 animate-pulse">Loading...</p>
          </div>
        </div>
      );
    }
    if (!isStudentAuth) {
      return <Navigate to="/student/login" replace />;
    }
    return <Outlet />;
  }

  // For teacher routes: ONLY check teacher auth
  if (facultyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black uppercase tracking-[0.3em] text-[10px] text-primary animate-pulse">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!isFacultyAuth) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
