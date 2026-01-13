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
  ArrowRight
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
  <div className="py-12 text-center bg-slate-50 rounded-3xl border border-slate-100 px-6">
    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
      <Icon className="w-6 h-6 text-slate-400" />
    </div>
    <p className="text-slate-600 font-medium text-sm leading-relaxed max-w-xs mx-auto mb-6">{message}</p>
    {onRetry && (
      <Button
        variant="outline"
        onClick={onRetry}
        className="h-10 px-6 font-bold text-xs rounded-xl bg-white border-slate-200"
      >
        Refresh List
      </Button>
    )}
  </div>
));

const QuizResultsModal = memo(({ isOpen, onClose, result, loading }: any) => {
  if (!result && !loading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-3xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-50">
          <div className="flex items-center gap-3 mb-2">
            <Badge className={cn(
              "font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded-md border-none",
              result?.status === 'blocked' ? "bg-red-500 text-white" : "bg-teal-500 text-white"
            )}>
              {result?.status === 'blocked' ? 'RESTRICTED' : 'EVALUATION REPORT'}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {result?.quizTitle}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-medium text-slate-500">Retrieving analytics...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Score Obtained</p>
                  <p className="text-2xl font-bold text-slate-900">{result?.score} <span className="text-sm font-medium text-slate-400">/ {result?.maxMarks}</span></p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Accuracy</p>
                  <p className="text-2xl font-bold text-indigo-600">{Math.round(result?.percentage)}%</p>
                </div>
              </div>

              {result?.status === 'blocked' && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-700">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Security Violation Detected</p>
                  </div>
                  <p className="text-sm font-bold italic">{result?.reason || 'Academic integrity compromise detected.'}</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Review Session</p>
                {result?.answers?.map((ans: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-white">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-slate-400 mb-1 block">Question {idx + 1}</span>
                        <p className="text-sm font-semibold text-slate-800 leading-snug">{ans.question}</p>
                      </div>
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        ans.isCorrect ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-600"
                      )}>
                        {ans.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Response:</span>
                        <span className={cn("text-xs font-bold", ans.isCorrect ? "text-teal-600" : "text-red-600")}>
                          {ans.studentAnswer || 'N/A'}
                        </span>
                      </div>
                      {!ans.isCorrect && (
                        <div className="flex items-center gap-2 bg-teal-50 p-2.5 rounded-xl">
                          <span className="text-[10px] font-bold text-teal-600/60 uppercase">Correct:</span>
                          <span className="text-xs font-bold text-teal-700">{ans.correctAnswer}</span>
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
    <Card className="shadow-sm hover:shadow-md transition-all border-slate-100 bg-white rounded-3xl overflow-hidden group">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 truncate pr-4">{quiz.title}</h3>
              {isInProgress && <Badge className="bg-amber-100 text-amber-700 border-none text-[10px] font-bold px-2 py-0">RESUME</Badge>}
            </div>
            <p className="text-sm font-medium text-slate-500 line-clamp-1">{quiz.description || 'No description provided'}</p>
            <div className="flex items-center gap-4 text-slate-400 pt-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{quiz.duration} mins</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{quiz.questionCount} Questions</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:w-auto w-full">
            {isCompleted ? (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="bg-teal-50 px-4 py-2 rounded-2xl flex flex-col items-center min-w-[80px]">
                  <span className="text-[8px] font-bold text-teal-600 uppercase">Score</span>
                  <span className="text-lg font-bold text-teal-700 leading-tight">{quiz.score}</span>
                </div>
                <Button
                  onClick={() => onViewResults(quiz)}
                  className="h-12 px-6 rounded-2xl border-indigo-100 font-bold text-xs text-indigo-600 hover:bg-indigo-50"
                  variant="outline"
                >
                  Results
                </Button>
              </div>
            ) : isDisqualified ? (
              <div className="flex items-center gap-3 w-full sm:w-auto text-red-600 bg-red-50 p-3 rounded-2xl border border-red-100">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase">Restricted</span>
                  <span className="text-[10px] font-semibold opacity-80 truncate max-w-[120px]">{quiz.reason}</span>
                </div>
                <Button onClick={() => onViewResults(quiz)} variant="ghost" size="sm" className="h-8 text-red-600 hover:bg-red-100 font-bold px-3">Details</Button>
              </div>
            ) : (
              <Button
                onClick={() => onStart(quiz.id || quiz._id || '')}
                className={cn(
                  "h-12 sm:px-10 px-6 rounded-2xl font-bold text-sm w-full sm:w-auto transition-all shadow-md active:scale-95",
                  isInProgress ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
                )}
              >
                {isInProgress ? 'Resume Assessment' : 'Start Assessment'}
                <ArrowRight className="w-4 h-4 ml-2" />
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
    toast.info('Session ended');
    navigate('/student/login');
  };

  const normalizedQuizzes = Array.isArray(quizzes) ? quizzes : [];
  const availableQuizzes = normalizedQuizzes.filter(q => q && (q.attemptStatus === 'not_started' || !q.attemptStatus || q.attemptStatus === 'started'));
  const completedQuizzes = normalizedQuizzes.filter(q => q && q.attemptStatus === 'submitted' && !(q.reason?.includes('Strike') || q.reason?.includes('Violation')));
  const disqualifiedQuizzes = normalizedQuizzes.filter(q => q && !!(q.reason?.includes('Strike') || q.reason?.includes('Violation')));

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FBFDFF] text-slate-900 pb-20">
      {/* High-Performance Clean Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-30">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Internal Hub</p>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Student Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/student/settings">
              <Button variant="ghost" size="icon" className="rounded-xl w-10 h-10 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-6 w-px bg-slate-100 mx-1" />
            <Button variant="ghost" onClick={handleLogout} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Simplified User Profile Banner */}
        <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center border-4 border-white shadow-inner">
              <User className="h-8 w-8 text-slate-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{studentData?.name || 'Authorized Student'}</h2>
              <div className="flex items-center gap-3 mt-1.5">
                <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200 px-2 rounded-lg">{studentData?.usn || 'USN'}</Badge>
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 uppercase tracking-wider">
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  Active Session
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 border-t sm:border-t-0 sm:border-l border-slate-100 pt-6 sm:pt-0 sm:pl-8">
            <div className="text-center sm:text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available</p>
              <p className="text-xl font-bold text-slate-900">{availableQuizzes.length}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed</p>
              <p className="text-xl font-bold text-slate-900">{completedQuizzes.length}</p>
            </div>
          </div>
        </section>

        {/* Assessment Interface */}
        <section className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent gap-6 h-auto p-0 mb-8 overflow-x-auto w-full no-scrollbar flex-nowrap inline-flex border-b border-slate-100 rounded-none pb-0">
              <TabsTrigger
                value="available"
                className="px-4 pb-4 border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-none transition-all"
              >
                Assessments
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="px-4 pb-4 border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-none transition-all"
              >
                Past Records
              </TabsTrigger>
              <TabsTrigger
                value="disqualified"
                className="px-4 pb-4 border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:text-red-600 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-none transition-all"
              >
                Restricted
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="outline-none"
              >
                <TabsContent value="available" className="mt-0 space-y-4 outline-none">
                  {availableQuizzes.length === 0 ? (
                    <EmptyState icon={Search} message="No new assessments published for you." onRetry={fetchQuizzes} />
                  ) : (
                    availableQuizzes.map((quiz) => (
                      <QuizCard key={quiz.id || quiz._id} quiz={quiz} onStart={handleStartQuiz} onDelete={() => { }} onViewResults={handleViewResults} />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-0 space-y-4 outline-none">
                  {completedQuizzes.length === 0 ? (
                    <EmptyState icon={Trophy} message="You haven't completed any assessments yet." />
                  ) : (
                    completedQuizzes.map((quiz) => (
                      <QuizCard key={quiz.id || quiz._id} quiz={quiz} onStart={handleStartQuiz} onDelete={() => { }} onViewResults={handleViewResults} />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="disqualified" className="mt-0 space-y-4 outline-none">
                  {disqualifiedQuizzes.length === 0 ? (
                    <EmptyState icon={AlertTriangle} message="Excellent! Zero academic violations noted." />
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