import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Sparkles,
  Layers,
  FileText,
  BadgeCheck,
  ChevronRight,
  GraduationCap,
  EyeOff,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info
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
  <div className="col-span-full py-16 text-center space-y-6 bg-primary/5 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-primary/10 backdrop-blur-xl animate-fade-in shadow-inner">
    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-primary/20 shadow-glow">
      <Icon className="w-8 h-8 text-primary" />
    </div>
    <div className="space-y-2">
      <p className="font-black uppercase text-[10px] tracking-[0.3em] text-primary/40 italic">Student Portal Notice</p>
      <p className="font-bold text-slate-800 dark:text-white px-6 max-w-xs mx-auto text-sm leading-relaxed">{message}</p>
    </div>
    {onRetry && (
      <Button
        variant="outline"
        onClick={onRetry}
        className="h-12 px-10 font-black uppercase text-[9px] tracking-widest border-primary/20 bg-white/10 text-primary hover:bg-primary hover:text-white transition-all rounded-xl mt-2"
      >
        Sync Data
      </Button>
    )}
  </div>
));

const QuizResultsModal = memo(({ isOpen, onClose, result, loading }: any) => {
  if (!result && !loading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-white dark:bg-[#0a021a] border-primary/20 rounded-[2.5rem]">
        <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-center gap-3 mb-2">
            <Badge className={cn(
              "font-black uppercase text-[8px] tracking-[0.2em] px-3 py-1 rounded-full",
              result?.status === 'blocked' ? "bg-rose-500" : "bg-emerald-500"
            )}>
              {result?.status === 'blocked' ? 'RESTRICTED' : 'QUIZ RESULT'}
            </Badge>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500/60">ID: {result?.id?.slice(-8)}</span>
          </div>
          <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase dark:text-white">
            {result?.quizTitle || 'Assessment Analysis'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-8 pb-8">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Loading your performance data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Score Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                  <p className="text-[8px] font-black uppercase tracking-widest text-primary/60 mb-1">Final Mark</p>
                  <p className="text-2xl font-black italic text-primary">{result?.score} <span className="text-sm opacity-40">/ {result?.maxMarks}</span></p>
                </div>
                <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
                  <p className="text-[8px] font-black uppercase tracking-widest text-secondary/60 mb-1">Success Rate</p>
                  <p className="text-2xl font-black italic text-secondary">{Math.round(result?.percentage)}%</p>
                </div>
              </div>

              {/* Breach Info if exists */}
              {result?.status === 'blocked' && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Notice</p>
                  </div>
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400 italic">"{(result?.reason || result?.blockReason || 'Proctoring system detected an academic integrity violation.').toUpperCase()}"</p>
                </div>
              )}

              {/* Questions Breakdown */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/40">Question Breakdown</p>
                {result?.answers?.map((ans: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">Question {idx + 1}</span>
                        <p className="text-sm font-bold dark:text-white leading-tight">{ans.question}</p>
                      </div>
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        ans.isCorrect ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                      )}>
                        {ans.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2 bg-white dark:bg-white/5 p-2 rounded-xl border border-primary/5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Your Answer:</span>
                        <span className={cn("text-[10px] font-bold", ans.isCorrect ? "text-emerald-500" : "text-rose-500")}>
                          {ans.studentAnswer || 'NO RESPONSE'}
                        </span>
                      </div>
                      {!ans.isCorrect && (
                        <div className="flex items-center gap-2 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/60">Correct Key:</span>
                          <span className="text-[10px] font-bold text-emerald-600">{ans.correctAnswer}</span>
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

const QuizCard = memo(({ quiz, onStart, onDelete, onViewResults, delay }: { quiz: Quiz; onStart: (id: string) => void; onDelete: (id: string) => void; onViewResults: (quiz: Quiz) => void; delay: number }) => {
  const isCompleted = quiz.attemptStatus === 'submitted' && !(quiz.reason?.includes('Strike') || quiz.reason?.includes('Violation'));
  const isDisqualified = !!(quiz.reason?.includes('Strike') || quiz.reason?.includes('Violation'));
  const isInProgress = quiz.attemptStatus === 'started';

  const schedule = (() => {
    if (!quiz.isScheduled || !quiz.startDate || !quiz.endDate) return { accessible: true, status: 'available' };

    const now = new Date();
    const start = new Date(quiz.startDate);
    if (quiz.startTime) {
      const [h, m] = quiz.startTime.split(':');
      start.setHours(parseInt(h), parseInt(m), 0, 0);
    }

    const end = new Date(quiz.endDate);
    if (quiz.endTime) {
      const [h, m] = quiz.endTime.split(':');
      end.setHours(parseInt(h), parseInt(m), 0, 0);
    }

    if (now < start) return { accessible: false, status: 'upcoming', date: start };
    if (now > end) return { accessible: false, status: 'expired', date: end };
    return { accessible: true, status: 'active', expiry: end };
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      className="h-full transform-gpu"
    >
      <Card className="shadow-lg border-none bg-white/80 dark:bg-white/5 backdrop-blur-2xl group transition-all overflow-hidden relative h-full flex flex-col rounded-[2rem] border-2 border-primary/5 hover:border-primary/20">
        <div className={cn(
          "absolute top-0 right-0 p-6 font-black uppercase tracking-[0.2em] text-[9px] italic flex items-center gap-2 z-10",
          isCompleted ? "text-emerald-500" :
            isDisqualified ? "text-destructive" :
              schedule.status === 'upcoming' ? "text-primary" :
                schedule.status === 'expired' ? "text-primary/40" :
                  isInProgress ? "text-secondary animate-pulse" : "text-primary"
        )}>
          {isCompleted ? 'SUBMITTED' : isDisqualified ? 'BLOCKED' : schedule.status === 'upcoming' ? 'LOCKED' : schedule.status === 'expired' ? 'CLOSED' : isInProgress ? 'RESUME' : 'OPEN'}
        </div>

        <CardHeader className="p-8 pb-4 relative z-10">
          <CardTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-20 text-slate-900 dark:text-white leading-[1.1]">
            {quiz.title}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-[10px] font-bold leading-relaxed opacity-60 mt-3 tracking-wide">
            {quiz.description || 'Access your course assessment and complete the quiz within the allotted time.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 pt-0 flex-1 space-y-6 relative z-10">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-widest text-primary">{quiz.duration}m</span>
            </div>
            <div className="flex items-center gap-2 bg-secondary/5 px-3 py-1.5 rounded-xl border border-secondary/10">
              <Layers className="w-3.5 h-3.5 text-secondary" />
              <span className="text-[9px] font-black uppercase tracking-widest text-secondary">{quiz.questionCount}q</span>
            </div>
          </div>

          <div className="pt-6 border-t border-primary/5 flex items-center justify-between gap-4 mt-auto">
            {!isCompleted && !isDisqualified ? (
              <Button
                onClick={() => onStart(quiz.id || quiz._id || '')}
                disabled={!schedule.accessible}
                className={cn(
                  "w-full h-12 font-black uppercase tracking-[0.2em] shadow-glow active:scale-95 transition-all text-[10px] rounded-xl",
                  !schedule.accessible ? "bg-primary/5 text-primary/30 cursor-not-allowed" :
                    isInProgress ? "bg-amber-500 text-white" : "gradient-primary text-white"
                )}
              >
                {schedule.status === 'upcoming' ? 'COMING SOON' : isInProgress ? 'CONTINUE' : 'START QUIZ'}
              </Button>
            ) : isCompleted ? (
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-center justify-between w-full bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black italic text-emerald-500 tracking-tighter">{quiz.score}</span>
                    <span className="text-[8px] font-black text-emerald-500/40 uppercase">/ {quiz.totalMarks}</span>
                  </div>
                  <Badge className="bg-emerald-500 text-white border-none rounded-lg h-6 px-3 font-black uppercase text-[8px] tracking-widest">SUBMITTED</Badge>
                </div>
                <Button
                  onClick={() => onViewResults(quiz)}
                  className="w-full h-10 font-black uppercase tracking-[0.2em] text-[9px] rounded-xl border-primary/20 text-primary hover:bg-primary/5 transition-all"
                  variant="outline"
                >
                  VIEW REPORT
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-center justify-between w-full bg-rose-500/5 p-3 rounded-xl border border-rose-500/20">
                  <span className="text-sm font-black italic text-rose-500 tracking-tighter uppercase">REVOKED</span>
                  <Badge variant="outline" className="border-rose-500/20 text-rose-500 bg-rose-500/5 text-[8px] font-black uppercase tracking-widest rounded-lg">FAILED</Badge>
                </div>
                {quiz.reason && (
                  <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-tight">
                      <span className="opacity-50">Violation:</span> {quiz.reason}
                    </p>
                  </div>
                )}
                <Button
                  onClick={() => onViewResults(quiz)}
                  className="w-full h-10 font-black uppercase tracking-[0.2em] text-[9px] rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20"
                >
                  VIEW SECURITY REPORT
                </Button>
              </div>
            )}
          </div>
        </CardContent>

        <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDelete(quiz.id || quiz._id || ''); }}
            className="w-8 h-8 rounded-full hover:bg-rose-500/10 hover:text-rose-500 text-primary/20"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>
    </motion.div>
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

  const tabs = ['available', 'active', 'completed', 'disqualified'];

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = tabs.indexOf(activeTab);
    if (direction === 'left' && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentAuthAPI.getAvailableQuizzes();
      setQuizzes(response.data);
    } catch (error) {
      toast.error('Connection failed: Could not sync quizzes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const data = storage.getItem('studentData');
    if (!data) {
      navigate('/student/login');
      return;
    }
    setStudentData(JSON.parse(data));
    fetchQuizzes();
  }, [navigate, fetchQuizzes]);

  const handleStartQuiz = (quizId: string) => {
    navigate(`/student/quiz/${quizId}`);
  };

  const handleViewResults = async (quiz: Quiz) => {
    setResultsModalOpen(true);
    setResultsLoading(true);
    try {
      const response = await studentAuthAPI.getQuizResults(quiz.id || quiz._id || '');
      // Ensure we have the latest violation reason if blocked
      const finalResult = {
        ...response.data.results,
        quizTitle: quiz.title,
        status: quiz.attemptStatus === 'submitted' && !(quiz.reason?.includes('Strike') || quiz.reason?.includes('Violation')) ? 'submitted' : 'blocked',
        reason: quiz.reason
      };
      setSelectedResult(finalResult);
    } catch (error) {
      toast.error('Failed to retrieve performance intelligence');
      setResultsModalOpen(false);
    } finally {
      setResultsLoading(false);
    }
  };

  const handleDeleteQuiz = (quizId: string) => {
    setQuizzes(quizzes.filter(q => (q.id || q._id) !== quizId));
    toast.success('Assessment entry archived locally');
  };

  const handleLogout = () => {
    storage.removeItem('studentToken');
    storage.removeItem('studentData');
    toast.info('Signed out successfully');
    navigate('/student/login');
  };

  const availableQuizzes = quizzes.filter(q => q.attemptStatus === 'not_started' || !q.attemptStatus);
  const inProgressQuizzes = quizzes.filter(q => q.attemptStatus === 'started');
  const completedQuizzes = quizzes.filter(q => q.attemptStatus === 'submitted' && !(q.reason?.includes('Strike') || q.reason?.includes('Violation')));
  const disqualifiedQuizzes = quizzes.filter(q => !!(q.reason?.includes('Strike') || q.reason?.includes('Violation')));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-[#05010a]">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
          <RefreshCw className="h-12 w-12 text-primary animate-spin relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative select-none overflow-hidden bg-white dark:bg-[#05010a]">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 h-full flex flex-col pt-safe pb-safe selection:bg-primary/20 overflow-hidden">
        {/* Premium Header */}
        <header className="flex-shrink-0 bg-white/80 dark:bg-[#080112]/80 backdrop-blur-xl border-b border-primary/10 shadow-sm z-20">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="font-black uppercase tracking-[0.2em] text-[10px] text-primary/80">Student Hub</p>
                <p className="text-lg font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Student <span className="text-secondary">Portal</span></p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden lg:flex flex-col items-end mr-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 leading-none mb-1">Last Updated</p>
                <p className="text-sm font-black italic tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={fetchQuizzes} className="rounded-full hover:bg-primary/5 w-10 h-10 text-primary active:scale-90 transition-transform">
                <RefreshCw className="h-5 w-5" />
              </Button>
              <div className="h-8 w-[1px] bg-primary/10 mx-1 sm:mx-2" />
              <Button variant="ghost" onClick={handleLogout} className="font-black uppercase text-[10px] tracking-widest gap-2 text-slate-600 hover:text-destructive h-10 px-4 hover:bg-destructive/5 active:scale-95 transition-all">
                <LogOut className="h-4 w-4" />
                <span className="hidden xs:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-1 overflow-y-auto px-6 md:px-10 py-6 space-y-8 gpu-accelerated scrollbar-hide pb-20"
        >
          {/* Live Intelligence Feed (Professional Ticker) */}
          <motion.div variants={itemVariants} className="bg-slate-900/5 dark:bg-white/5 border-y border-primary/5 py-2 overflow-hidden whitespace-nowrap relative rounded-xl">
            <motion.div
              animate={{ x: [0, -1000] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="flex gap-12 items-center"
            >
              {[
                "PROTOCOL ACTIVE: QUIZ SESSIONS ARE MONITORED",
                "REFRESH COMPLETE: NEW QUIZZES AVAILABLE",
                "PLEASE MAINTAIN ACADEMIC INTEGRITY",
                "STAY FOCUSED. BEST OF LUCK WITH YOUR QUIZ!",
                "SECURE LOGIN ACTIVE: READY FOR ASSESSMENT"
              ].map((msg, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Activity className="h-3 w-3 text-secondary" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500/80">{msg}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Profile & Vital Metrics Section - Condensed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="bg-white/40 dark:bg-primary/5 p-6 rounded-[2rem] border border-primary/10 relative overflow-hidden group shadow-lg backdrop-blur-md">
              <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
              <div className="relative z-10 flex items-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary p-[2px] shadow-glow active:scale-95 transition-transform">
                    <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden">
                      <User className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-500 border-4 border-white dark:border-slate-900 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-white leading-none">
                      {studentData?.name || 'Student'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 opacity-60 mb-2">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[120px]">{studentData?.usn || 'STUDENT-PORTAL'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedQuizzes.length / (quizzes.length || 1)) * 100}%` }}
                      className="h-full gradient-primary"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
              {[
                { label: 'Exams', value: availableQuizzes.length, icon: Layers, color: 'text-primary bg-primary' },
                { label: 'Done', value: completedQuizzes.length, icon: Trophy, color: 'text-secondary bg-secondary' },
                { label: 'Live', value: inProgressQuizzes.length, icon: Activity, color: 'text-accent bg-accent' }
              ].map((stat, i) => (
                <Card key={stat.label} className="shadow-md border-none bg-white/60 dark:bg-white/5 backdrop-blur-md overflow-hidden relative group rounded-2xl border-b-2 border-primary/5">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-1", stat.color.split(' ')[1].replace('bg-', 'bg-') + "/10", stat.color.split(' ')[0])}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500/60 leading-none">{stat.label}</p>
                    <h3 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white italic leading-none">{stat.value}</h3>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </div>

          {/* Assessment Matrix */}
          <motion.div variants={itemVariants} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide">
                <TabsList className="bg-white/40 dark:bg-white/5 p-1.5 h-16 rounded-[2rem] border border-primary/10 flex w-max min-w-full sm:min-w-0 shadow-lg backdrop-blur-2xl">
                  <TabsTrigger value="available" className="rounded-[1.25rem] h-12 px-6 font-black uppercase text-[10px] tracking-[0.1em] data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-primary/60 dark:text-white/40 transition-all gap-3 active:scale-95">
                    <Sparkles className="h-4 w-4" /> Available Quizzes ({availableQuizzes.length})
                  </TabsTrigger>
                  <TabsTrigger value="active" className="rounded-[1.25rem] h-12 px-6 font-black uppercase text-[10px] tracking-[0.1em] data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-primary/60 dark:text-white/40 transition-all gap-3 active:scale-95">
                    <Activity className="h-4 w-4" /> Activity ({inProgressQuizzes.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="rounded-[1.25rem] h-12 px-6 font-black uppercase text-[10px] tracking-[0.1em] data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-primary/60 dark:text-white/40 transition-all gap-3 active:scale-95">
                    <CheckCircle className="h-4 w-4" /> Completed ({completedQuizzes.length})
                  </TabsTrigger>
                  <TabsTrigger value="disqualified" className="rounded-[1.25rem] h-12 px-6 font-black uppercase text-[10px] tracking-[0.1em] data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-rose-300 text-primary/60 dark:text-white/40 transition-all gap-3 active:scale-95">
                    <AlertTriangle className="h-4 w-4" /> Restricted ({disqualifiedQuizzes.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <motion.div
                className="mt-4 outline-none touch-none"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 100) handleSwipe('right');
                  else if (info.offset.x < -100) handleSwipe('left');
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TabsContent value="available" className="mt-0 outline-none">
                      <div className="mobile-grid">
                        {availableQuizzes.length === 0 ? (
                          <EmptyState icon={Search} message="No quizzes available at the moment." onRetry={fetchQuizzes} />
                        ) : (
                          availableQuizzes.map((quiz, idx) => (
                            <QuizCard key={quiz.id || quiz._id} quiz={quiz} onStart={handleStartQuiz} onDelete={handleDeleteQuiz} onViewResults={handleViewResults} delay={idx * 0.05} />
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="active" className="mt-4 outline-none">
                      <div className="mobile-grid">
                        {inProgressQuizzes.length === 0 ? (
                          <EmptyState icon={Activity} message="No quizzes are currently in progress." />
                        ) : (
                          inProgressQuizzes.map((quiz, idx) => (
                            <QuizCard key={quiz.id || quiz._id} quiz={quiz} onStart={handleStartQuiz} onDelete={handleDeleteQuiz} onViewResults={handleViewResults} delay={idx * 0.05} />
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="completed" className="mt-4 outline-none">
                      <div className="mobile-grid">
                        {completedQuizzes.length === 0 ? (
                          <EmptyState icon={Trophy} message="You haven't completed any quizzes yet." />
                        ) : (
                          completedQuizzes.map((quiz, idx) => (
                            <QuizCard key={quiz.id || quiz._id} quiz={quiz} onStart={handleStartQuiz} onDelete={handleDeleteQuiz} onViewResults={handleViewResults} delay={idx * 0.05} />
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="disqualified" className="mt-4 outline-none">
                      <div className="mobile-grid">
                        {disqualifiedQuizzes.length === 0 ? (
                          <EmptyState icon={AlertTriangle} message="Security protocol clean. No violations." />
                        ) : (
                          disqualifiedQuizzes.map((quiz, idx) => (
                            <QuizCard key={quiz.id || quiz._id} quiz={quiz} onStart={handleStartQuiz} onDelete={handleDeleteQuiz} onViewResults={handleViewResults} delay={idx * 0.05} />
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </Tabs>
          </motion.div>

          {/* New: Performance Insights (Logical Addition) */}
          {completedQuizzes.length > 0 && (
            <motion.div variants={itemVariants} className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 blur-3xl opacity-50 -z-10" />
              <Card className="bg-white/60 dark:bg-primary/5 backdrop-blur-2xl border-primary/10 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Performance Insights</p>
                  </div>
                  <CardTitle className="text-2xl font-black italic tracking-tighter uppercase dark:text-white">Academic Momentum</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-primary/5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Success Rate</p>
                      <p className="text-xl font-black italic text-primary">
                        {Math.round((completedQuizzes.length / (quizzes.length || 1)) * 100)}%
                      </p>
                    </div>
                    <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-primary/5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Avg Score</p>
                      <p className="text-xl font-black italic text-secondary">
                        {completedQuizzes.length > 0
                          ? Math.round(completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes.length)
                          : 0}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-primary/5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Integrity Status</p>
                      <p className="text-xl font-black italic text-emerald-500">EXCELLENT</p>
                    </div>
                    <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-primary/5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Academic Status</p>
                      <p className="text-xl font-black italic text-amber-500">ACTIVE</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.main>

        <QuizResultsModal
          isOpen={resultsModalOpen}
          onClose={() => setResultsModalOpen(false)}
          result={selectedResult}
          loading={resultsLoading}
        />
      </div>
    </div>
  );
};

export default memo(StudentDashboard);