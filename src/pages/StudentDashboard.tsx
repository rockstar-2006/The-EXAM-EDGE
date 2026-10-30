import React, { useState, useEffect, memo, useCallback } from 'react';
import { 
  Search, 
  GraduationCap, 
  Settings, 
  LogOut, 
  RefreshCw, 
  User, 
  BadgeCheck, 
  Clock, 
  SearchX, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  TrendingUp,
  MapPin,
  Calendar,
  Lock,
  Timer,
  Download,
  Monitor,
  ShieldAlert
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { studentAuthAPI } from '../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { AcademicTextRenderer } from '@/components/AcademicTextRenderer';

// --- Types ---
interface Quiz {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  category?: string;
  subject?: string;
  duration: number;
  totalQuestions?: number;
  questionCount?: number;
  status?: string;
  result?: {
    score: number;
    totalQuestions: number;
    percentage: number;
    isPassed: boolean;
  };
  attemptStatus?: 'not_started' | 'started' | 'submitted';
}

// Helper to safely get quiz field values regardless of backend naming
const getQuizQuestionCount = (q: Quiz) => q.totalQuestions || q.questionCount || 0;
const getQuizCategory = (q: Quiz) => q.category || q.subject || 'General';
const getQuizDescription = (q: Quiz) => q.description || '';

// --- Components ---

const EmptyState = ({ icon: Icon, message, onRetry }: { icon: any, message: string, onRetry?: () => void }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 animate-in fade-in zoom-in duration-700">
    <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-sm border border-slate-100 mb-6">
      <Icon className="h-10 w-10 text-slate-200" />
    </div>
    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-6">{message}</p>
    {onRetry && (
      <Button 
        onClick={onRetry} 
        variant="outline" 
        className="rounded-2xl border-slate-200 px-8 py-6 font-black text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
      >
        Refresh List
      </Button>
    )}
  </div>
);

const QuizCard = ({ quiz, onStart, onDelete, onViewResults }: { 
  quiz: Quiz, 
  onStart: (id: string) => void, 
  onDelete: (id: string) => void,
  onViewResults: (id: string) => void
}) => {
  const isBlocked = 
    quiz.status === 'disqualified' || 
    quiz.status === 'blocked' || 
    quiz.attemptStatus === 'blocked' || 
    quiz.attemptStatus === 'expired' || 
    Boolean((quiz as any).isBlocked);

  const isCompleted = 
    (quiz.status === 'completed' || 
     quiz.attemptStatus === 'submitted' || 
     quiz.attemptStatus === 'graded' || 
     !!quiz.result) && !isBlocked;

  const id = quiz.id || quiz._id || '';

  return (
    <div className={cn(
      "group relative bg-white rounded-[2rem] border p-6 sm:p-8 transition-all duration-500 hover:shadow-2xl active:scale-[0.98]",
      isBlocked 
        ? "border-rose-200 bg-rose-50/20 hover:border-rose-300 hover:shadow-rose-100/50" 
        : isCompleted 
        ? "border-teal-100 hover:shadow-teal-100/50" 
        : "border-slate-100 hover:shadow-indigo-100/50 hover:border-indigo-100"
    )}>
      <div className="flex flex-col sm:flex-row justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "p-2.5 rounded-xl border transition-colors",
              isBlocked ? "bg-rose-50 border-rose-200 text-rose-600" :
              isCompleted ? "bg-teal-50 border-teal-100 text-teal-600" : 
              "bg-indigo-50 border-indigo-100 text-indigo-600"
            )}>
              {isBlocked ? <ShieldAlert className="h-5 w-5" /> : 
               isCompleted ? <BadgeCheck className="h-5 w-5" /> : 
               <Clock className="h-5 w-5" />}
            </div>
            <Badge 
              variant="secondary" 
              className={cn(
                "font-black text-[9px] uppercase tracking-wider px-3 py-1 rounded-lg border",
                isBlocked 
                  ? "bg-rose-100/80 text-rose-700 border-rose-200" 
                  : "bg-indigo-50/50 text-indigo-600 border-indigo-100"
              )}
            >
              {isBlocked ? "ACCESS BLOCKED" : getQuizCategory(quiz)}
            </Badge>
          </div>
          
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 tracking-tight group-hover:text-indigo-600 transition-colors">
            {quiz.title}
          </h3>

          {/* Block Notice / Violation Reason Banner */}
          {isBlocked && (
            <div className="mt-3 mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 max-w-xl">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-700">Exam Terminated & Blocked</p>
                <p className="text-xs font-bold text-rose-900 mt-0.5 leading-snug">
                  {(quiz as any).reason || (quiz as any).violationReason || "Security lockdown protocol detected violations during your attempt. Re-entry is blocked."}
                </p>
              </div>
            </div>
          )}

          {!isBlocked && getQuizDescription(quiz) && (
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6 font-medium line-clamp-2">
              {getQuizDescription(quiz)}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-5 border-t border-slate-50">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-slate-300" />
              <span className="text-[11px] font-bold text-slate-500">{quiz.duration} Mins</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-slate-300" />
              <span className="text-[11px] font-bold text-slate-500">{getQuizQuestionCount(quiz)} Questions</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col sm:justify-center">
          {isCompleted ? (
            <Button 
              onClick={() => onViewResults(id)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-2xl h-14 sm:h-16 px-8 font-black text-xs uppercase tracking-[0.15em] shadow-lg shadow-indigo-100 transition-all hover:-translate-y-1"
            >
              Results <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          ) : isBlocked ? (
            <Button 
              onClick={() => onViewResults(id)}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-200 rounded-2xl h-14 sm:h-16 px-6 font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Blocked • View Info</span>
            </Button>
          ) : (
            <Button 
              onClick={() => onStart(id)}
              className="bg-slate-900 hover:bg-indigo-600 text-white border-none rounded-2xl h-14 sm:h-16 px-8 font-black text-xs uppercase tracking-[0.15em] shadow-lg shadow-slate-200 transition-all hover:scale-105 active:scale-95"
            >
              Start Quiz <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const QuizResultsModal = ({ isOpen, onClose, result, loading }: { isOpen: boolean, onClose: () => void, result: any, loading: boolean }) => {
  if (loading) return null;
  
  // Normalize result data across different API response shapes
  const detailedResults = result?.detailedResults || result?.results || result?.answers || [];
  const score = result?.score ?? result?.totalMarks ?? null;
  const total = result?.totalQuestions ?? result?.maxMarks ?? result?.total ?? null;
  const percentage = result?.percentage ?? (score !== null && total ? Math.round((score / total) * 100) : null);
  const isBlocked = result?.isBlocked || result?.status === 'blocked';
  const blockReason = result?.blockReason || result?.violationReason || '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className={cn(
          "p-8 sm:p-10 flex flex-col items-center text-center shrink-0 transition-colors space-y-0",
          isBlocked ? "bg-rose-600" : "bg-indigo-600"
        )}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 sm:mb-6 animate-pulse">
            {isBlocked ? (
              <ShieldAlert className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            ) : (
              <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            )}
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight uppercase tracking-widest text-center">
            {isBlocked ? 'Attempt Terminated & Blocked' : 'Assessment Completed'}
          </DialogTitle>
          <DialogDescription className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] text-center">
            Detailed Academic Performance Breakdown
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 sm:p-10 space-y-6 sm:space-y-8 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Lockdown Block Notice */}
          {isBlocked && (
            <div className="p-5 bg-rose-50 border-2 border-rose-200 rounded-3xl flex items-start gap-4">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-black text-sm uppercase tracking-wider text-rose-800 mb-1">Lockdown Violation Recorded</h4>
                <p className="text-xs font-bold text-rose-700 leading-relaxed">
                  Reason: {blockReason || 'Terminated by lockdown protocol (e.g., loss of focus, application overlay, or tab away).'}
                </p>
                <p className="text-[11px] text-rose-600/80 mt-1.5 font-medium">
                  Please consult your course instructor or proctor if you need this assessment reset for a retake.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-200 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Score</p>
              <h4 className="text-2xl sm:text-3xl font-black text-slate-900">{score ?? '—'}{total ? `/${total}` : ''}</h4>
            </div>
            <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-200 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Accuracy</p>
              <h4 className={cn("text-2xl sm:text-3xl font-black", isBlocked ? "text-rose-600" : "text-indigo-600")}>
                {percentage ?? '—'}%
              </h4>
            </div>
          </div>

          {!isBlocked && (
            <div className={cn(
              "p-5 sm:p-6 rounded-3xl flex items-center gap-4 border shadow-sm",
              result?.isPassed 
                ? "bg-teal-50 border-teal-100 text-teal-700" 
                : "bg-red-50 border-red-100 text-red-700"
            )}>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", result?.isPassed ? "bg-teal-500" : "bg-red-500")}>
                {result?.isPassed ? <BadgeCheck className="h-6 w-6 text-white" /> : <Shield className="h-6 w-6 text-white" />}
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-wider mb-0.5">{result?.isPassed ? 'Performance Qualified' : 'Below Passing Threshold'}</h4>
                <p className="text-xs font-bold opacity-70 leading-relaxed">
                  {result?.isPassed ? 'You have successfully satisfied the criteria for this assessment.' : 'You did not reach the minimum passing grade for this quiz.'}
                </p>
              </div>
            </div>
          )}

          {/* Detailed Question Results with AcademicTextRenderer */}
          {Array.isArray(detailedResults) && detailedResults.length > 0 && (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Breakdown</p>
              {detailedResults.map((item: any, idx: number) => (
                <div key={idx} className="p-5 bg-slate-50/80 rounded-3xl border border-slate-100 text-left space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        Q{idx + 1}
                      </span>
                      {item.marks !== undefined && (
                        <span className="text-[9px] font-bold text-slate-400">
                          {item.marks} {item.marks === 1 ? 'pt' : 'pts'}
                        </span>
                      )}
                    </div>
                    <div className={cn("p-1.5 rounded-xl shrink-0 flex items-center gap-1.5 text-xs font-black", item.isCorrect ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700")}>
                      {item.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{item.isCorrect ? 'Correct' : 'Incorrect'}</span>
                    </div>
                  </div>

                  <div className="text-slate-900 leading-relaxed font-bold">
                    <AcademicTextRenderer
                      text={item.question || item.questionText || `Question ${idx + 1}`}
                      isQuestion={true}
                      imageUrl={item.imageUrl}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white rounded-2xl border border-slate-200/60">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Your Choice</p>
                      <p className={cn("text-xs font-bold break-words", item.isCorrect ? "text-teal-700" : "text-rose-600 font-black")}>
                        {item.studentAnswer || item.yourAnswer || item.selected || "No Choice"}
                      </p>
                    </div>
                    {!item.isCorrect && (
                      <div className="p-3 bg-teal-50/40 rounded-2xl border border-teal-200/60">
                        <p className="text-[8px] font-black text-teal-600 uppercase tracking-wider mb-1">Correct Answer</p>
                        <p className="text-xs font-bold text-teal-800 break-words">{item.correctAnswer || item.correct || 'N/A'}</p>
                      </div>
                    )}
                  </div>

                  {item.explanation && (
                    <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100 text-xs text-indigo-900 font-medium">
                      <span className="font-black uppercase text-[8px] tracking-wider text-indigo-600 block mb-0.5">Insight Breakdown:</span>
                      {item.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button onClick={onClose} className="w-full h-14 bg-slate-900 border-none rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg text-white">
            Dismiss Results
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { logout, studentData } = useStudentAuth();
  const [activeTab, setActiveTab] = useState('available');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await studentAuthAPI.getAvailableQuizzes();
      const quizList = res?.data?.data || res?.data?.quizzes || [];
      if (res?.data?.success && Array.isArray(quizList)) {
        setQuizzes(quizList);
      } else {
        setQuizzes([]);
      }
    } catch (e) {
      console.error('Failed to fetch quizzes:', e);
      toast.error('Network Error: Unable to fetch quizzes.');
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
    
    // Refresh quiz data when user returns to dashboard (after quiz or navigation)
    const handleFocus = () => {
      console.log('📱 Dashboard regained focus - refreshing quiz list');
      fetchQuizzes();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Auto-refresh every 10 seconds to catch new quizzes
    const autoRefresh = setInterval(() => {
      console.log('🔄 Auto-refreshing quiz list...');
      fetchQuizzes();
    }, 10000);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(autoRefresh);
    };
  }, [fetchQuizzes]);

  const handleStartQuiz = (id: string) => {
    if (!id) return;
    // Cannot start if already blocked/disqualified
    const quiz = safeQuizzes.find(q => (q.id || q._id) === id);
    if (quiz && (quiz.status === 'disqualified' || quiz.status === 'blocked' || quiz.attemptStatus === 'blocked' || (quiz as any).isBlocked)) {
      toast.error('🔒 Exam Access Blocked', { 
        description: 'You cannot re-attempt this quiz. Access was revoked due to security violations.'
      });
      return;
    }
    navigate(`/student/quiz/${id}`);
  };

  const handleViewResults = async (id: string) => {
    if (!id) return;
    try {
      setResultsLoading(true);
      const res = await studentAuthAPI.getQuizResults(id);
      if (res?.data?.success) {
        setSelectedResult(res.data.data);
        setResultsModalOpen(true);
      }
    } catch (e) {
      toast.error('Failed to load results.');
    } finally {
      setResultsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/student/login');
    toast.success('Logged out successfully.');
  };

  const safeQuizzes = Array.isArray(quizzes) ? quizzes : [];
  console.log('📊 Quiz List Debug:', { total: safeQuizzes.length, statuses: safeQuizzes.map(q => ({ title: q.title, status: q.status, attemptStatus: q.attemptStatus })) });
  
  // STRICT FILTERING: Accurately categorize blocked, completed, and available quizzes
  const isQuizBlocked = (q: Quiz) =>
    q.status === 'disqualified' || 
    q.status === 'blocked' || 
    q.attemptStatus === 'blocked' || 
    q.attemptStatus === 'expired' || 
    Boolean((q as any).isBlocked);

  const isQuizCompleted = (q: Quiz) =>
    (q.status === 'completed' || 
     q.attemptStatus === 'submitted' || 
     q.attemptStatus === 'graded' || 
     !!q.result) && !isQuizBlocked(q);

  const availableQuizzes = safeQuizzes.filter(q => 
    q && q.status === 'available' && !isQuizBlocked(q) && !isQuizCompleted(q)
  );
  
  const completedQuizzes = safeQuizzes.filter(q => 
    q && isQuizCompleted(q)
  );
  
  const disqualifiedQuizzes = safeQuizzes.filter(q => 
    q && (isQuizBlocked(q) || q.status === 'active' || q.status === 'in-progress')
  );

  const isDesktop = typeof window !== 'undefined' && Boolean((window as any).desktopSecurity);
  const isMobile = Capacitor.getPlatform() !== 'web';
  const showDesktopDownload = !isDesktop && !isMobile;

  return (
    <div className="relative flex flex-col min-h-[100dvh] h-[100dvh] w-full bg-[#FBFDFF] text-slate-900 overflow-hidden">
      {/* High-Performance Clean Header - Relative to ensure scroll is natural */}
      <header className="relative bg-white border-b border-slate-100 z-40 pt-safe sm:pt-6">
        <div className="max-w-7xl mx-auto px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100 border border-indigo-500 transform transition-transform hover:scale-105 active:scale-95">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5 opacity-70">Student Portal</p>
              <h1 className="text-xl font-black text-slate-900 leading-none tracking-tight">Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {showDesktopDownload && (
              <a
                href="https://github.com/rockstar-2006/The-EXAM-EDGE/releases/download/Production/FacultyQuest.Secure.Exam.Browser.Setup.0.0.0.exe"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-bold transition-all shadow-sm active:scale-95"
                title="Download Windows Secure Exam Browser (.exe)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exam Browser (.exe)</span>
              </a>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={fetchQuizzes} 
              disabled={loading}
              className="rounded-2xl w-10 h-10 sm:w-12 sm:h-12 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 transition-all"
            >
              <RefreshCw className={cn("h-4 w-4 sm:h-5 sm:w-5", loading && "animate-spin")} />
            </Button>
            <Link to="/student/settings">
              <Button variant="ghost" size="icon" className="rounded-2xl w-10 h-10 sm:w-12 sm:h-12 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 transition-all">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <div className="h-6 w-px bg-slate-100 mx-1 sm:mx-2" />
            <Button 
              variant="ghost" 
              onClick={() => {
                if ((window as any).desktopSecurity?.closeApp) {
                  (window as any).desktopSecurity.closeApp();
                } else {
                  handleLogout();
                }
              }} 
              className="text-slate-400 hover:text-red-600 hover:bg-red-50/50 border border-transparent hover:border-red-100 h-10 sm:h-12 px-3 sm:px-5 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" /> <span>{typeof window !== 'undefined' && (window as any).desktopSecurity?.closeApp ? 'Close App' : 'Logout'}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-14 space-y-10 sm:space-y-16">
        {/* Professional Header Banner */}
        <section className="bg-white p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-8 border-2 hover:border-indigo-100 transition-all">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[1.75rem] bg-slate-50 flex items-center justify-center border-4 border-white shadow-inner shrink-0 group hover:rotate-6 transition-transform">
              <User className="h-8 w-8 sm:h-10 text-slate-300 group-hover:text-indigo-400 transition-colors" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1 sm:mb-2 leading-tight truncate">
                {(studentData && studentData.name) ? studentData.name : 'Student Account'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge variant="outline" className="text-[9px] font-black text-slate-500 border-slate-200 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg uppercase tracking-wider bg-white">ID: {studentData?.usn || 'N/A'}</Badge>
                {studentData?.section && (
                  <Badge variant="outline" className="text-[9px] font-black text-indigo-600 border-indigo-200 bg-indigo-50/50 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg uppercase tracking-wider">
                    SEC {studentData.section}
                  </Badge>
                )}
                <div className="flex items-center gap-2 text-[9px] font-black text-teal-600 uppercase tracking-[0.2em] bg-teal-50/50 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg border border-teal-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  Live
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-slate-200 pt-6 sm:pt-0 sm:pl-10 shrink-0">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl sm:text-3xl font-black text-slate-900">{availableQuizzes.length}</p>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Quizzes</span>
              </div>
            </div>
            <div className="w-px h-10 sm:h-12 bg-slate-200 mx-1 sm:mx-2" />
            <div className="space-y-1">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest">Completed</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl sm:text-3xl font-black text-indigo-600">{completedQuizzes.length}</p>
                <span className="text-[9px] sm:text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Done</span>
              </div>
            </div>
            {disqualifiedQuizzes.length > 0 && (
              <>
                <div className="w-px h-10 sm:h-12 bg-slate-50 mx-1 sm:mx-2" />
                <div className="space-y-1">
                  <p className="text-[9px] sm:text-[10px] font-black text-rose-400 uppercase tracking-widest">Blocked</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl sm:text-3xl font-black text-rose-600">{disqualifiedQuizzes.length}</p>
                    <span className="text-[9px] sm:text-[10px] font-bold text-rose-400 uppercase tracking-tighter">Locked</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="space-y-8">
          <div className="w-full">
            <div className="bg-[#FBFDFF] z-30 -mx-5 px-5 pt-4 pb-4 transition-all border-b border-indigo-50/50">
              <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 w-full flex shadow-sm">
                {[
                  { id: 'available', label: `Available (${availableQuizzes.length})`, color: 'indigo' },
                  { id: 'completed', label: `Completed (${completedQuizzes.length})`, color: 'blue' },
                  { id: 'disqualified', label: `Blocked (${disqualifiedQuizzes.length})`, color: 'red' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 px-3 py-3 rounded-xl font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-all",
                      activeTab === tab.id 
                        ? "bg-white shadow-md text-indigo-600 scale-105" 
                        : "text-slate-400 hover:text-slate-600",
                      activeTab === tab.id && tab.color === 'indigo' && "text-indigo-600",
                      activeTab === tab.id && tab.color === 'blue' && "text-blue-600",
                      activeTab === tab.id && tab.color === 'red' && "text-red-600"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-8 space-y-6">
              {activeTab === 'available' && (
                availableQuizzes.length === 0 ? (
                  <EmptyState icon={Search} message="No available quizzes." onRetry={fetchQuizzes} />
                ) : (
                  availableQuizzes.map((quiz) => (
                    quiz && <QuizCard key={quiz.id || quiz._id || Math.random().toString()} quiz={quiz} onStart={handleStartQuiz} onDelete={() => { }} onViewResults={handleViewResults} />
                  ))
                )
              )}

              {activeTab === 'completed' && (
                completedQuizzes.length === 0 ? (
                  <EmptyState icon={CheckCircle2} message="No completed quizzes." onRetry={fetchQuizzes} />
                ) : (
                  completedQuizzes.map((quiz) => (
                    quiz && <QuizCard key={quiz.id || quiz._id || Math.random().toString()} quiz={quiz} onStart={handleStartQuiz} onDelete={() => { }} onViewResults={handleViewResults} />
                  ))
                )
              )}

              {activeTab === 'disqualified' && (
                disqualifiedQuizzes.length === 0 ? (
                  <EmptyState icon={Shield} message="No blocked quizzes." onRetry={fetchQuizzes} />
                ) : (
                  disqualifiedQuizzes.map((quiz) => (
                    quiz && <QuizCard key={quiz.id || quiz._id || Math.random().toString()} quiz={quiz} onStart={handleStartQuiz} onDelete={() => { }} onViewResults={handleViewResults} />
                  ))
                )
              )}
            </div>
          </div>
        </section>
        
        {/* 🔥 SPACER TO ENSURE BOTTOM VISIBILITY ON MOBILE */}
        <div className="h-[200px] w-full" />
        </div>
      </main>

      <QuizResultsModal
        isOpen={resultsModalOpen}
        onClose={() => setResultsModalOpen(false)}
        result={selectedResult}
        loading={resultsLoading}
      />
    </div>
  );
};

export default memo(StudentDashboard);