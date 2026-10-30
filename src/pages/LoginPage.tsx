import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LoginCard } from '@/components/LoginCard';
import { useAuth } from '@/hooks/useAuth';
import { Monitor, Download, GraduationCap, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      const userData = localStorage.getItem('userData');
      try {
        const user = userData ? JSON.parse(userData) : null;
        if (user?.role === 'admin' || user?.email === 'admin@gmail.com') {
          navigate('/admin/dashboard', { replace: true });
          return;
        }
      } catch (e) {}
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen gradient-subtle flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-10 md:-left-20 w-48 h-48 md:w-72 md:h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-10 md:-right-20 w-64 h-64 md:w-96 md:h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1000ms' }} />
      </div>

      <div className="w-full max-w-md animate-fade-in z-10 space-y-4">
        <LoginCard />

        {/* Navigation to Student Portal & Secure Browser Download */}
        <div className="bg-white/80 backdrop-blur-md border border-sidebar-border/60 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-sidebar-border/30">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Are you a Student?</span>
            <Link
              to="/student/login"
              className="text-xs font-black text-primary hover:underline flex items-center gap-1 uppercase tracking-wider"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Student Portal
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">Secure Exam Browser</p>
                <p className="text-[9px] text-muted-foreground font-semibold">Windows Installer (.exe)</p>
              </div>
            </div>
            <a
              href="https://github.com/rockstar-2006/The-EXAM-EDGE/releases/download/Production/FacultyQuest.Secure.Exam.Browser.Setup.0.0.0.exe"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Download className="w-3 h-3" />
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
