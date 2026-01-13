import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search,
  RefreshCw,
  LogOut,
  Trophy,
  Clock,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  Clock3,
  BookOpen,
  User,
  Activity,
  Layers,
  FileText,
  BadgeCheck,
  ChevronRight,
  GraduationCap,
  EyeOff,
  CheckCircle2,
  XCircle,
  Settings,
  ArrowRight,
  Loader2,
  Shield
} from 'lucide-react';
import { studentAuthAPI, storage } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES ---
interface Quiz {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  duration: number;
  totalMarks: number;
  questionCount: number;
  createdAt: string;
  attemptStatus?: 'not_started' | 'started' | 'submitted';
  score?: number;
  reason?: string;
  isScheduled?: boolean;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

// --- SUBCOMPONENTS ---

const EmptyState = memo(({ icon: Icon, message, onRetry }: any) => (
  <div className="py-16 text-center bg-white rounded-[2.5rem] border border-slate-100 px-6 shadow-sm">
    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
      {Icon ? <Icon className="w-8 h-8 text-slate-300" /> : <div className="w-8 h-8 bg-slate-200 rounded-full" />}
    </div>
    <p className="text-slate-500 font-semibold text-sm leading-relaxed max-w-xs mx-auto mb-8 uppercase tracking-wide">{message}</p>
    {onRetry && (
      <Button
        variant="outline"
        onClick={onRetry}
        className="h-12 px-8 font-bold text-xs rounded-2xl bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all uppercase tracking-widest shadow-sm"
      >
        Sync Repository
      </Button>
    )}
  </div>
));

const QuizResultsModal = memo(({ isOpen, onClose, result, loading }: any) => {
  if (!result && !loading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2.5rem] animate-in zoom-in-95 duration-200">
        <DialogHeader className="p-8 pb-4 border-b border-slate-50 bg-slate-50/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <Badge className={cn(
              "font-bold uppercase text-[9px] tracking-[0.1em] px-2.5 py-1 rounded-lg border-none",
              result?.status === 'blocked' ? "bg-red-500 text-white" : "bg-teal-500 text-white"
            )}>
              {result?.status === 'blocked' ? 'Assessment Restricted' : 'Evaluation Summary'}
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">
            {result?.quizTitle}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-8 py-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Retrieving Analytics...</p>
            </div>
          ) : (
            <div className="space-y-8 pb-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#FBFDFF] p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
                  <p className="text-3xl font-bold text-slate-900">{result?.score} <span className="text-sm font-medium text-slate-300">/ {result?.maxMarks}</span></p>
                </div>
                <div className="bg-indigo-50/30 p-6 rounded-[2rem] border border-indigo-50 shadow-sm flex flex-col justify-center items-center">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Accuracy</p>
                  <p className="text-3xl font-bold text-indigo-600">{Math.round(result?.percentage)}%</p>
                </div>
              </div>

              {result?.status === 'blocked' && (
                <div className="bg-red-50/50 border border-red-100 p-6 rounded-[2rem] text-red-700 animate-in slide-in-from-top-2 duration-300 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-50 rounded-xl">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em]">Integrity Compromise Detected</p>
                  </div>
                  <p className="text-sm font-bold italic leading-relaxed pl-1">{result?.reason || 'Academic integrity violation recorded.'}</p>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] pl-1">Review Session</p>
                {result?.answers?.map((ans: any, idx: number) => (
                  <div key={idx} className="p-6 rounded-[2rem] border border-slate-50 bg-[#FBFDFF] hover:border-slate-200 transition-colors">
                    <div className="flex items-start justify-between gap-6 mb-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Item {idx + 1}</span>
                        <p className="text-sm sm:text-base font-bold text-slate-800 leading-snug break-words">{ans.question}</p>
                      </div>
                      <div className={cn(
                        "p-2.5 rounded-xl shrink-0 border",
                        ans.isCorrect ? "bg-teal-50 text-teal-600 border-teal-100" : "bg-red-50 text-red-600 border-red-100"
                      )}>
                        {ans.isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      <div className="flex flex-col gap-1.5 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Your Response</span>
                        <span className={cn("text-xs font-bold leading-tight", ans.isCorrect ? "text-teal-600" : "text-red-500")}>
                          {ans.studentAnswer || 'NO RESPONSE'}
                        </span>
                      </div>
                      {!ans.isCorrect && (
                        <div className="flex flex-col gap-1.5 bg-teal-50/50 p-3.5 rounded-2xl border border-teal-100/50 shadow-sm">
                          <span className="text-[9px] font-black text-teal-600/50 uppercase tracking-widest">Correct Solution</span>
                          <span className="text-xs font-bold text-teal-700 leading-tight">{ans.correctAnswer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

const QuizCard = memo(({ quiz, onStart, onDelete, onViewResults }: { quiz: Quiz; onStart: (id: string) => void; onDelete: (id: string) => void; onViewResults: (quiz: Quiz) => void; }) => {
  const isCompleted = quiz.attemptStatus === 'submitted' && !(quiz.reason?.includes('Strike') || quiz.reason?.includes('Violation'));
  const isDisqualified = !!(quiz.reason?.includes('Strike') || quiz.reason?.includes('Violation'));
  const isInProgress = quiz.attemptStatus === 'started';

  return (
    <Card className="shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all border-slate-100 bg-white rounded-[2rem] overflow-hidden group border-2 hover:border-indigo-100">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-bold text-slate-900 leading-tight">{quiz.title}</h3>
              {isInProgress && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider">In Progress</Badge>}
            </div>
            <p className="text-sm font-semibold text-slate-500 leading-relaxed max-w-2xl">{quiz.description || 'Institutional Assessment Resource'}</p>
            <div className="flex flex-wrap items-center gap-5 text-slate-400 pt-2 border-t border-slate-50 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{quiz.duration} Mins</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Layers className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{quiz.questionCount} Items</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Trophy className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{quiz.totalMarks} Marks</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:w-auto w-full pt-4 sm:pt-0 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-50 sm:pl-8">
            {isCompleted ? (
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="bg-teal-50/50 border border-teal-100 px-6 py-3 rounded-2xl flex flex-col items-center min-w-[100px] shadow-sm">
                  <span className="text-[9px] font-black text-teal-600 uppercase tracking-[0.1em] mb-1">Final Score</span>
                  <span className="text-2xl font-black text-teal-700 leading-none">{quiz.score}</span>
                </div>
                <Button
                  onClick={() => onViewResults(quiz)}
                  className="h-14 px-8 rounded-2xl border-indigo-100 font-bold text-xs text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all uppercase tracking-widest shadow-sm bg-white border"
                  variant="ghost"
                >
                  Analysis
                </Button>
              </div>
            ) : isDisqualified ? (
              <div className="flex items-center gap-4 w-full sm:w-auto text-red-600 bg-red-50/50 p-4 rounded-2xl border border-red-100 shadow-sm">
                <AlertTriangle className="w-6 h-6 flex-shrink-0 text-red-500" />
                <div className="flex-1 min-w-0 pr-4">
                  <span className="text-[9px] font-black uppercase tracking-widest block mb-0.5">Attempt Blocked</span>
                  <span className="text-[10px] font-bold opacity-80 leading-snug line-clamp-1">{quiz.reason}</span>
                </div>
                <Button onClick={() => onViewResults(quiz)} variant="outline" size="sm" className="h-10 text-red-600 hover:bg-red-100 font-bold px-4 rounded-xl border-red-200 bg-white">Report</Button>
              </div>
            ) : (
              <Button
                onClick={() => onStart(quiz.id || quiz._id || '')}
                className={cn(
                  "h-14 sm:px-12 px-6 rounded-2xl font-bold text-sm w-full sm:w-auto transition-all shadow-lg active:scale-95 uppercase tracking-widest",
                  isInProgress ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                )}
              >
                {isInProgress ? 'Resume Attempt' : 'Start Exam'}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('available');
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentAuthAPI.getAvailableQuizzes();
      setQuizzes(Array.isArray(response.data.quizzes) ? response.data.quizzes : []);
    } catch (error) {
      toast.error('Sync failed: Check your connection');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const data = storage.getItem('studentData');
        if (!data) {
          navigate('/student/login');
          return;
        }

        const parsed = JSON.parse(data);
        if (parsed) {
          setStudentData(parsed);
          await fetchQuizzes();
        } else {
          navigate('/student/login');
        }
      } catch (err) {
        navigate('/student/login');
      }
    };

    initDashboard();
  }, [navigate, fetchQuizzes]);

  const handleStartQuiz = (quizId: string) => {
    navigate(`/student/quiz/${quizId}`);
  };

  const handleViewResults = async (quiz: Quiz) => {
    setResultsModalOpen(true);
    setResultsLoading(true);
    try {
      const response = await studentAuthAPI.getQuizResults(quiz.id || quiz._id || '');
      const finalResult = {
        ...response.data.results,
        quizTitle: quiz.title,
        status: quiz.attemptStatus === 'submitted' && !(quiz.reason?.includes('Strike') || quiz.reason?.includes('Violation')) ? 'submitted' : 'blocked',
        reason: quiz.reason
      };
      setSelectedResult(finalResult);
    } catch (error) {
      toast.error('Failed to retrieve analysis');
      setResultsModalOpen(false);
    } finally {
      setResultsLoading(false);
    }
  };

  const handleLogout = () => {
    storage.removeItem('studentToken');
    storage.removeItem('studentData');
    toast.info('Session deauthorized');
    navigate('/student/login');
  };

  const normalizedQuizzes = Array.isArray(quizzes) ? quizzes : [];
  const availableQuizzes = normalizedQuizzes.filter(q => q && (q.attemptStatus === 'not_started' || !q.attemptStatus || q.attemptStatus === 'started'));
  const completedQuizzes = normalizedQuizzes.filter(q => q && q.attemptStatus === 'submitted' && !(q.reason?.includes('Strike') || q.reason?.includes('Violation')));
  const disqualifiedQuizzes = normalizedQuizzes.filter(q => q && !!(q.reason?.includes('Strike') || q.reason?.includes('Violation')));

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-6">
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center border border-indigo-100 shadow-sm animate-pulse">
          <GraduationCap className="h-10 w-10 text-indigo-600" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.35em] animate-in fade-in zoom-in duration-500">Initializing Terminal</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Assessment Hub</p>
        </div>
        <Loader2 className="h-5 w-5 text-indigo-400 animate-spin absolute bottom-20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FBFDFF] text-slate-900 pb-20">
      {/* High-Performance Clean Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-100 z-30 transition-all duration-300">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100 border border-indigo-500 transform transition-transform hover:scale-105 active:scale-95">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5 opacity-70">Internal Terminal</p>
              <h1 className="text-xl font-bold text-slate-900 leading-none tracking-tight">Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/student/settings">
              <Button variant="ghost" size="icon" className="rounded-2xl w-12 h-12 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 transition-all">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-6 w-px bg-slate-100 mx-2" />
            <Button variant="ghost" onClick={handleLogout} className="text-slate-400 hover:text-red-600 hover:bg-red-50/50 border border-transparent hover:border-red-100 h-12 px-5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">
              <LogOut className="h-5 w-5 mr-2" /> Exit
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* Professional Header Banner */}
        <section className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-8 border-2 hover:border-indigo-100 transition-all animate-in slide-in-from-bottom-5 duration-700">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[1.75rem] bg-slate-50 flex items-center justify-center border-4 border-white shadow-inner shrink-0 group hover:rotate-6 transition-transform">
              <User className="h-10 w-10 text-slate-300 group-hover:text-indigo-400 transition-colors" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2 leading-tight">{studentData?.name || 'Verified Student Account'}</h2>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="text-[10px] font-black text-slate-500 border-slate-200 px-3 py-1 rounded-lg uppercase tracking-wider bg-white">USR: {studentData?.usn || 'Terminal'}</Badge>
                <div className="flex items-center gap-2 text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] bg-teal-50/50 px-3 py-1 rounded-lg border border-teal-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.6)]" />
                  Status Active
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-6 border-t sm:border-t-0 sm:border-l border-slate-50 pt-8 sm:pt-0 sm:pl-10 shrink-0">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Repository</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-black text-slate-900">{availableQuizzes.length}</p>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tasks</span>
              </div>
            </div>
            <div className="w-px h-12 bg-slate-50 mx-2 hidden sm:block" />
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Completed</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-black text-indigo-600">{completedQuizzes.length}</p>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Done</span>
              </div>
            </div>
          </div>
        </section>

        {/* Assessment Interface */}
        <section className="space-y-8 animate-in fade-in duration-1000">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent gap-8 h-auto p-0 mb-10 overflow-x-auto w-full no-scrollbar flex-nowrap inline-flex border-b border-slate-100 rounded-none pb-0">
              <TabsTrigger
                value="available"
                className="px-6 pb-6 border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] rounded-none transition-all outline-none"
              >
                Assessments
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="px-6 pb-6 border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] rounded-none transition-all outline-none"
              >
                Past Records
              </TabsTrigger>
              <TabsTrigger
                value="disqualified"
                className="px-6 pb-6 border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:text-red-600 text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] rounded-none transition-all outline-none"
              >
                Restricted
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="outline-none"
              >
                <TabsContent value="available" className="mt-0 space-y-6 outline-none">
                  {availableQuizzes.length === 0 ? (
                    <EmptyState icon={Search} message="Zero assessments found in repository." onRetry={fetchQuizzes} />
                  ) : (
                    availableQuizzes.map((quiz) => (
                      <QuizCard key={quiz.id || quiz._id} quiz={quiz} onStart={handleStartQuiz} onDelete={() => { }} onViewResults={handleViewResults} />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-0 space-y-6 outline-none">
                  {completedQuizzes.length === 0 ? (
                    <EmptyState icon={CheckCircle2} message="No completed records detected." />
                  ) : (
                    completedQuizzes.map((quiz) => (
                      <QuizCard key={quiz.id || quiz._id} quiz={quiz} onStart={handleStartQuiz} onDelete={() => { }} onViewResults={handleViewResults} />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="disqualified" className="mt-0 space-y-6 outline-none">
                  {disqualifiedQuizzes.length === 0 ? (
                    <EmptyState icon={Shield} message="Excellent Performance: Zero integrity alerts noted." />
                  ) : (
                    disqualifiedQuizzes.map((quiz) => (
                      <QuizCard key={quiz.id || quiz._id} quiz={quiz} onStart={handleStartQuiz} onDelete={() => { }} onViewResults={handleViewResults} />
                    ))
                  )}
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </section>
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