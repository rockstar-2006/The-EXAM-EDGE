import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Activity,
  Lock,
  Target,
  Trophy,
  Scan,
  ShieldAlert,
  EyeOff,
  Code,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Info
} from 'lucide-react';
import { studentAuthAPI, storage } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StatusBar } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';
import { Dialog, DialogContent } from "@/components/ui/dialog";

// --- TYPES ---
interface Question {
  _id: string;
  type: 'mcq' | 'short-answer' | 'truefalse';
  question: string;
  options?: string[];
  marks: number;
}

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  totalMarks: number;
  questionCount: number;
  questions: Question[];
  createdAt: string;
  attemptStatus?: 'not_started' | 'started' | 'submitted';
  attemptId?: string;
}

// 📝 OPTIMIZED TEXT RENDERING
const FormattedText = ({ text, isQuestion = false }: { text: string; isQuestion?: boolean }) => {
  if (!text) return null;
  const parts = text.split(/(```)/g);
  let isCode = false;
  let codeBuffer = "";
  const result: React.ReactNode[] = [];

  parts.forEach((part, i) => {
    if (part === "```") {
      if (isCode) {
        result.push(
          <div key={i} className="my-4 bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
            <pre className="p-4 font-mono text-[13px] leading-relaxed overflow-x-auto text-indigo-300">
              <code>{codeBuffer.trim()}</code>
            </pre>
          </div>
        );
        codeBuffer = "";
        isCode = false;
      } else {
        isCode = true;
      }
    } else {
      if (isCode) codeBuffer += part;
      else if (part.trim()) {
        result.push(
          <p key={i} className="whitespace-pre-wrap leading-relaxed text-inherit">
            {part}
          </p>
        );
      }
    }
  });

  return (
    <div className={cn("space-y-3", isQuestion ? "text-slate-900 font-bold" : "text-slate-600")}>
      {result}
    </div>
  );
};

export default function StudentSecureQuiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  // Core States
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  // Quiz States
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [attemptId, setAttemptId] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Security States
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [lastViolation, setLastViolation] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<'scanning' | 'ready' | 'failed'>('scanning');

  // Security Refs
  const lastViolationTime = useRef<number>(0);
  const originalDimensions = useRef({ width: 0, height: 0 });
  const isFullscreenActive = useRef(false);
  const isSecurityPaused = useRef(false);
  const isTransitioning = useRef(false);

  // Persistence: Auto-Save to LocalStorage
  useEffect(() => {
    if (quizId && Object.keys(answers).length > 0) {
      storage.setItem(`quiz_state_${quizId}`, JSON.stringify({
        answers,
        currentQuestion
      }));
    }
  }, [answers, currentQuestion, quizId]);

  // Fullscreen Helpers
  const initializeFullscreen = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      isTransitioning.current = true;
      await StatusBar.hide();
      if (Capacitor.getPlatform() === 'android') {
        const NB: any = NavigationBar;
        if (NB?.hide) await NB.hide();
      }
      setTimeout(() => {
        originalDimensions.current = { width: window.innerWidth, height: window.innerHeight };
        isTransitioning.current = false;
      }, 1000);
    } catch (e) {
      isTransitioning.current = false;
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await StatusBar.show();
      if (Capacitor.getPlatform() === 'android') {
        const NB: any = NavigationBar;
        if (NB?.show) await NB.show();
      }
    } catch (e) { }
  }, []);

  const triggerViolation = useCallback((reason: string) => {
    if (isTransitioning.current || isSecurityPaused.current || isBlocked) return;
    const now = Date.now();
    if (now - lastViolationTime.current < 3000) return;
    lastViolationTime.current = now;

    setWarningCount(prev => {
      const next = prev + 1;
      setLastViolation(reason);
      toast.error(`SECURITY ALERT [${next}/3]`, { description: reason, position: 'top-center' });

      if (next >= 3) {
        setIsBlocked(true);
        handleSubmitQuiz(true, `Strikes Exceeded: ${reason}`);
        return 3;
      }
      isSecurityPaused.current = true;
      setShowWarningModal(true);
      return next;
    });
  }, [isBlocked, attemptId]);

  // Main Logic Fetch
  useEffect(() => {
    const init = async () => {
      if (!quizId) return navigate('/student/dashboard');
      try {
        setLoading(true);
        const res = await studentAuthAPI.getQuizDetails(quizId);
        if (!res.data?.success) throw new Error('Access Denied');

        const qD = res.data.quiz;
        if (!qD) throw new Error('Quiz not found');

        setQuiz({
          ...qD,
          _id: qD.id || qD._id,
          questions: (qD.questions || []).map((q: any) => ({ ...q, _id: q.id || q._id }))
        });

        // Load Persistent State
        const savedState = storage.getItem(`quiz_state_${quizId}`);
        if (savedState) {
          const parsed = JSON.parse(savedState);
          setAnswers(parsed.answers || {});
          setCurrentQuestion(parsed.currentQuestion || 0);
        }

        if (res.data.existingAttempt) {
          const { existingAttempt } = res.data;
          if (existingAttempt.status === 'submitted') {
            setQuizSubmitted(true);
          } else if (existingAttempt.status === 'started') {
            setAttemptId(existingAttempt.id || existingAttempt._id);
            setQuizStarted(true);
            setTimeLeft(existingAttempt.timeRemaining || 0);
            initializeFullscreen();
          }
        }
        setSecurityStatus('ready');
      } catch (e) {
        console.error('Quiz initialization error:', e);
        toast.error('Initialization Failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
        setSecurityStatus('failed');
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => {
      exitFullscreen();
    };
  }, [quizId]);

  // Security Monitoring
  useEffect(() => {
    if (!quizStarted || quizSubmitted || isBlocked) return;

    const handleBlur = () => {
      if (!document.hasFocus() && !isSecurityPaused.current && !isTransitioning.current) {
        triggerViolation('Focus lost to external app or notification');
      }
    };

    const handleVisibility = () => {
      if (document.hidden && !isSecurityPaused.current && !isTransitioning.current) {
        triggerViolation('Screen minimized or tab switch');
      }
    };

    window.addEventListener('blur', handleBlur, true);
    window.addEventListener('visibilitychange', handleVisibility, true);
    return () => {
      window.removeEventListener('blur', handleBlur, true);
      window.removeEventListener('visibilitychange', handleVisibility, true);
    };
  }, [quizStarted, quizSubmitted, isBlocked, triggerViolation]);

  const handleStartQuiz = async () => {
    try {
      setIsStarting(true);
      const res = await studentAuthAPI.startQuizAttempt(quizId!);
      if (res.data?.success) {
        const attempt = res.data.attempt;
        setAttemptId(attempt.id || attempt._id);
        setQuizStarted(true);
        setTimeLeft(attempt.timeRemaining || (quiz?.duration || 30) * 60);
        initializeFullscreen();
      }
    } catch (e) {
      toast.error('Session Init Failed');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmitQuiz = async (auto = false, reason = '') => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const arr = Object.entries(answers).map(([questionId, studentAnswer]) => ({ questionId, studentAnswer }));
      const res = await studentAuthAPI.submitQuizAttempt(attemptId, arr, auto, reason);
      if (res.data?.success) {
        setSubmissionResult(res.data.results);
        setQuizSubmitted(true);
        storage.removeItem(`quiz_state_${quizId}`);
        exitFullscreen();
      }
    } catch (e) {
      toast.error('Sync Error: Retrying...');
    } finally {
      setSubmitting(false);
    }
  };

  // Timer
  useEffect(() => {
    if (!quizStarted || quizSubmitted || isBlocked) return;
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          handleSubmitQuiz(true, 'Time Out');
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [quizStarted, quizSubmitted, isBlocked]);

  // 1. Loading
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white text-slate-800 gap-4">
      <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Verifying Environment</p>
    </div>
  );

  // 2. Pre-Quiz Entry
  if (!quizStarted && !quizSubmitted) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 uppercase text-[10px] py-1 px-3 mb-4 font-bold">Secure Evaluation</Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">{quiz?.title}</h1>
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
              <p className="text-sm font-bold text-slate-800">{quiz?.duration}m</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items</p>
              <p className="text-sm font-bold text-slate-800">{quiz?.questionCount}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marks</p>
              <p className="text-sm font-bold text-slate-800">{quiz?.totalMarks}</p>
            </div>
          </div>
        </div>

        <Card className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden mt-8 bg-white/70 backdrop-blur-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex items-center gap-2 text-indigo-600">
              <Shield className="w-5 h-5" />
              <CardTitle className="text-sm font-bold uppercase tracking-tight">Proctored Session</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <ul className="space-y-4">
              {[
                { icon: Shield, text: "Interface lockout will be active" },
                { icon: EyeOff, text: "Disable notifications to avoid focus loss" },
                { icon: Info, text: "Three violations will end the session" }
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                  <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center">
                    {item.icon ? <item.icon className="w-3.5 h-3.5 text-teal-600" /> : <Shield className="w-3.5 h-3.5 text-teal-600" />}
                  </div>
                  {item.text}
                </li>
              ))}
            </ul>

            <Button
              onClick={handleStartQuiz}
              disabled={isStarting}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
            >
              {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Secure Session"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // 3. Quiz Complete
  if (quizSubmitted) return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-900">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="w-20 h-20 bg-teal-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-teal-100 mb-4 animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">Assessment Submitted</h2>
          <p className="text-slate-500 font-medium mt-2 leading-relaxed">Your responses have been synchronized with the faculty portal.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center items-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
            <p className="text-3xl font-bold text-slate-900">{submissionResult?.score || 0} <span className="text-sm font-medium opacity-40">/ {submissionResult?.totalMarks}</span></p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center items-center">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Percentage</p>
            <p className="text-3xl font-bold text-indigo-600">{submissionResult?.percentage || 0}%</p>
          </div>
        </div>

        <Button
          onClick={() => navigate('/student/dashboard')}
          className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg transition-transform active:scale-95"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );

  // 4. Main Interface
  const currentQ = quiz?.questions?.[currentQuestion];

  // Safety: If somehow quiz is missing but we're marked as started, show error
  if (!quiz || (quizStarted && !currentQ)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Quiz Session Error</h2>
        <p className="text-slate-500 mb-6">Unable to load quiz content. Please try restarting the session.</p>
        <Button onClick={() => navigate('/student/dashboard')}>Return to Dashboard</Button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col text-slate-900 overflow-hidden select-none">
      {/* 📍 Header */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-900 border border-slate-100 shrink-0">
            {currentQuestion + 1}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Active Session</p>
            <h1 className="text-sm font-bold text-slate-900 leading-none truncate max-w-[150px] sm:max-w-none">{quiz?.title}</h1>
          </div>
        </div>

        <div className={cn(
          "px-4 py-2 rounded-2xl font-bold text-sm tabular-nums flex items-center gap-2 shrink-0 transition-colors",
          timeLeft < 60 ? "bg-red-50 text-red-600 animate-pulse border border-red-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
        )}>
          <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
        </div>
      </div>

      <Progress value={((currentQuestion + 1) / (quiz?.questionCount || 1)) * 100} className="h-1 bg-slate-50 rounded-none shadow-none z-20" />

      {/* 📝 Content */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-32 max-w-2xl mx-auto w-full">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-4">
            <Badge className="bg-teal-50 text-teal-600 border-none font-bold text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider">{currentQ?.marks} Marks</Badge>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug">
              <FormattedText text={currentQ?.question || ''} isQuestion={true} />
            </div>
          </div>

          <div className="space-y-3 pt-4">
            {currentQ?.type === 'mcq' && currentQ.options?.map((option, idx) => {
              const isSelected = answers[currentQ._id] === option;
              return (
                <button
                  key={idx}
                  onClick={() => setAnswers(p => ({ ...p, [currentQ._id]: option }))}
                  className={cn(
                    "w-full p-4 sm:p-5 rounded-[1.5rem] text-left border-2 transition-all flex items-center gap-4 group active:scale-[0.99]",
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                      : "border-slate-50 bg-[#FBFDFF] hover:border-slate-200"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                    isSelected ? "bg-indigo-600 text-white" : "bg-white text-slate-400 border border-slate-100"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className={cn("font-bold text-sm sm:text-base leading-snug break-words", isSelected ? "text-indigo-900" : "text-slate-600")}>{option}</span>
                </button>
              );
            })}

            {currentQ?.type === 'short-answer' && (
              <Textarea
                placeholder="Type your response here..."
                className="min-h-[180px] rounded-[1.5rem] p-6 border-slate-100 bg-[#FBFDFF] focus:bg-white focus:ring-4 focus:ring-indigo-50 font-bold text-base sm:text-lg transition-all"
                value={answers[currentQ._id] || ''}
                onChange={(e) => setAnswers(p => ({ ...p, [currentQ._id]: e.target.value }))}
              />
            )}
          </div>
        </div>
      </main>

      {/* 🎮 Controls */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex items-center justify-between gap-4 z-30">
        <Button
          variant="ghost"
          disabled={currentQuestion === 0}
          onClick={() => setCurrentQuestion(p => p - 1)}
          className="h-12 sm:h-14 px-4 sm:px-6 rounded-2xl font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="flex-1 flex justify-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{currentQuestion + 1} / {quiz?.questionCount}</p>
        </div>

        {currentQuestion === (quiz?.questionCount || 1) - 1 ? (
          <Button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={submitting}
            className="h-12 sm:h-14 px-6 sm:px-8 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-teal-100 transition-all active:scale-95"
          >
            Finish Exam
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestion(p => p + 1)}
            className="h-12 sm:h-14 px-6 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            Next <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Modals */}
      <Dialog open={showWarningModal} onOpenChange={(o) => { if (!o) { isSecurityPaused.current = false; setShowWarningModal(false); } }}>
        <DialogContent className="rounded-3xl p-8 max-w-sm w-[90vw] border-none shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-600 tracking-tight">Security Violation</h2>
            <p className="text-slate-500 font-medium leading-relaxed text-sm">
              Detected: <span className="text-red-600 font-bold block mt-1">"{lastViolation}"</span>. Please restore the secure environment.
            </p>
            <div className="pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Strike {warningCount} of 3</p>
              <Button onClick={() => { isSecurityPaused.current = false; setShowWarningModal(false); }} className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors">I Understand</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-3xl p-8 max-w-sm w-[90vw] border-none shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <CheckCircle2 className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Confirm Submission</h2>
            <p className="text-slate-500 font-medium leading-relaxed text-sm">
              You have completed <span className="text-indigo-600 font-bold">{Object.keys(answers).length}</span> out of <span className="font-bold">{quiz?.questionCount}</span> items. Ready to sync final responses?
            </p>
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" onClick={() => setShowSubmitConfirm(false)} className="flex-1 h-12 font-bold text-slate-500 rounded-xl">Review</Button>
              <Button onClick={() => handleSubmitQuiz()} disabled={submitting} className="flex-1 h-12 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-md transition-colors shadow-teal-100">Submit Now</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}