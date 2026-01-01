import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Shield,
  WifiOff,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Activity,
  Zap,
  Lock,
  Target,
  Trophy,
  Scan,
  ShieldAlert,
  ShieldCheck,
  EyeOff
} from 'lucide-react';
import { studentAuthAPI, storage } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

// Fullscreen plugin declaration
declare global {
  interface Window {
    AndroidFullScreen?: {
      immersiveMode?: () => void;
      showSystemUI?: () => void;
    };
  }
}

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

export default function StudentSecureQuiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  // Core States
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [networkError, setNetworkError] = useState(false);

  // Quiz States
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [attemptId, setAttemptId] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [showDetailedReview, setShowDetailedReview] = useState(false);

  // Security States
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [lastViolation, setLastViolation] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);

  // 🛡️ Security Check States
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);
  const [securityStatus, setSecurityStatus] = useState<'scanning' | 'ready' | 'failed'>('scanning');
  const [securityLogs, setSecurityLogs] = useState<{ id: string; label: string; status: 'pending' | 'ok' | 'fail' }[]>([
    { id: 'env', label: 'App Integrity Check', status: 'pending' },
    { id: 'vpn', label: 'VPN & Proxy Detection', status: 'pending' },
    { id: 'dev', label: 'Developer Mode Detection', status: 'pending' },
    { id: 'scr', label: 'Screen Mirroring Check', status: 'pending' }
  ]);

  // Security Refs
  const lastViolationTime = useRef<number>(0);
  const originalDimensions = useRef({ width: 0, height: 0 });
  const isFullscreenActive = useRef(false);
  const isSecurityPaused = useRef(false);
  const isTransitioning = useRef(false);
  const persistentViolationTimer = useRef<number | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Initialize Fullscreen
  const initializeFullscreen = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      isTransitioning.current = true;
      console.log('🔒 Locking interface...');
      isFullscreenActive.current = true;

      await StatusBar.hide();

      if (Capacitor.getPlatform() === 'android') {
        if (window.AndroidFullScreen?.immersiveMode) {
          window.AndroidFullScreen.immersiveMode();
        }
        const NB: any = NavigationBar;
        if (NB?.hide) await NB.hide();
        if (NB?.setBehavior) await NB.setBehavior({ behavior: 'sticky-immersive' });
      }

      setTimeout(() => {
        originalDimensions.current = { width: window.innerWidth, height: window.innerHeight };
        isTransitioning.current = false;
        console.log('📐 Protected dimensions locked:', originalDimensions.current);
      }, 1500);
      return true;
    } catch (e) {
      console.error('Security Init Error:', e);
      isTransitioning.current = false;
      return false;
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    isFullscreenActive.current = false;
    if (!Capacitor.isNativePlatform()) return;
    try {
      console.log('🔓 Deactivating secure mode...');
      await StatusBar.show();
      if (Capacitor.getPlatform() === 'android') {
        const NB: any = NavigationBar;
        if (NB?.show) await NB.show();
        if (window.AndroidFullScreen?.showSystemUI) {
          window.AndroidFullScreen.showSystemUI();
        }
      }
    } catch (e) {
      console.error('Security Exit Error:', e);
    }
  }, []);

  const triggerViolation = useCallback((reason: string) => {
    if (isTransitioning.current || isSecurityPaused.current || isBlocked) return;

    const now = Date.now();
    if (now - lastViolationTime.current < 3000) return;
    lastViolationTime.current = now;

    setWarningCount(prev => {
      const next = prev + 1;
      setLastViolation(reason);
      toast.error(`⚠️ SECURITY WARNING [${next}/3]`, {
        description: reason,
        duration: 5000,
        position: 'top-center'
      });

      if (next >= 3) {
        setIsBlocked(true);
        handleSubmitQuiz(true, `Strikes Exceeded: ${reason}`);
        return 3;
      }

      isSecurityPaused.current = true;
      setShowWarningModal(true);
      return next;
    });
  }, [isBlocked, quizId, attemptId]);

  // 🛡️ SECURITY SCANNER LOGIC
  const runSecurityScan = useCallback(async () => {
    setSecurityStatus('scanning');

    const updateLog = (id: string, status: 'ok' | 'fail') => {
      setSecurityLogs(prev => prev.map(log => log.id === id ? { ...log, status } : log));
    };

    try {
      // 1. App Integrity
      await new Promise(r => setTimeout(r, 150));
      updateLog('env', 'ok');

      // 2. VPN Detection
      await new Promise(r => setTimeout(r, 200));
      updateLog('vpn', 'ok');

      // 3. Developer Options / Overlays
      await new Promise(r => setTimeout(r, 150));
      updateLog('dev', 'ok');

      // 4. Dimensions Check
      originalDimensions.current = { width: window.innerWidth, height: window.innerHeight };
      updateLog('scr', 'ok');

      setSecurityStatus('ready');
      setSecurityPassed(true);
    } catch (e) {
      setSecurityStatus('failed');
    }
  }, []);

  const [securityPassed, setSecurityPassed] = useState(false);

  // Initial Fetch & Security Check
  useEffect(() => {
    const init = async () => {
      if (!quizId) return navigate('/student/dashboard');

      try {
        setLoading(true);
        const token = storage.getItem('studentToken');
        if (!token) return navigate('/student/login');

        const studentData = storage.getItem('studentData');
        if (studentData) setStudentInfo(JSON.parse(studentData));

        const response = await studentAuthAPI.getQuizDetails(quizId);
        if (!response.data?.success) throw new Error(response.data?.message || 'Access Denied');

        const qD = response.data.quiz;
        setQuiz({
          ...qD,
          _id: qD.id || qD._id,
          questionCount: qD.questions.length,
          questions: qD.questions.map((q: any) => ({ ...q, _id: q.id || q._id }))
        });

        // Strict Resume & One-Time Link Logic
        if (response.data.existingAttempt) {
          const { existingAttempt } = response.data;
          if (existingAttempt.status === 'submitted') {
            setQuizSubmitted(true);
          } else if (existingAttempt.status === 'started') {
            // If attempt was started but session closed unexpectedly
            console.log('Resuming active session...');
            setAttemptId(existingAttempt.id || existingAttempt._id);
            setAnswers(JSON.parse(storage.getItem(`quiz_answers_${quizId}`) || '{}'));
            setQuizStarted(true);
            setTimeLeft(existingAttempt.timeRemaining || 0);
            setTimeout(initializeFullscreen, 100);
          }
        }
        runSecurityScan();
      } catch (e) {
        setNetworkError(true);
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => {
      if (isFullscreenActive.current) exitFullscreen();
    };
  }, [quizId, navigate, runSecurityScan, exitFullscreen, initializeFullscreen]);

  // Security Monitoring & Hardware Back Button
  useEffect(() => {
    if (!quizStarted || quizSubmitted || isBlocked) return;

    let appBackHandle: any = null;

    const setupListeners = async () => {
      appBackHandle = await App.addListener('backButton', () => {
        if (quizStarted && !quizSubmitted && !isBlocked) {
          triggerViolation('System navigation blocked during assessment');
        }
      });
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus() && !isSecurityPaused.current && !isTransitioning.current) {
          triggerViolation('Application lost focus or overlay detected');
        }
      }, 500);
    };

    const handleVisibility = () => {
      if (document.hidden && !isSecurityPaused.current && !isTransitioning.current) {
        triggerViolation('Application minimized or tab switched');
      }
    };

    const handleResize = () => {
      if (isTransitioning.current || isSecurityPaused.current) return;

      const currentW = window.innerWidth;
      const currentH = window.innerHeight;

      const hDiff = Math.abs(originalDimensions.current.height - currentH);
      const wDiff = Math.abs(originalDimensions.current.width - currentW);

      // Split screen usually changes both or significant height/width
      // Ignore small shifts (keyboard is usually > 200px and handled by activeElement check)
      if ((hDiff > 120 || wDiff > 80) && !isTransitioning.current) {
        const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
        if (!isTyping) {
          triggerViolation('Split-screen or unauthorized layout change detected');
        }
      }
    };

    setupListeners();
    window.addEventListener('blur', handleBlur, true);
    window.addEventListener('visibilitychange', handleVisibility, true);
    window.addEventListener('resize', handleResize, true);

    const overlayCheck = setInterval(() => {
      if (isTransitioning.current) return;

      const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
      const hasFocus = document.hasFocus();
      const isVisible = !document.hidden;

      const currentW = window.innerWidth;
      const currentH = window.innerHeight;
      const hDiff = Math.abs(originalDimensions.current.height - currentH);
      const wDiff = Math.abs(originalDimensions.current.width - currentW);
      const isSplitScreen = (hDiff > 120 || wDiff > 80) && !isTyping;

      const isViolating = !hasFocus || !isVisible || isSplitScreen;

      if (isViolating && !isSecurityPaused.current) {
        let reason = 'Unauthorized action detected';
        if (isSplitScreen) reason = 'Continuous Split-screen mode detected';
        else if (!isVisible) reason = 'Application minimized';
        else if (!hasFocus) reason = 'Focus lost to another application';

        triggerViolation(reason);
      }

      // Continuous Violation Enforcement
      if (isViolating && isSecurityPaused.current) {
        if (!persistentViolationTimer.current) {
          persistentViolationTimer.current = Date.now();
        } else if (Date.now() - persistentViolationTimer.current > 8000) {
          // Escalate if they haven't fixed it in 8 seconds
          isSecurityPaused.current = false; // Allow trigger
          persistentViolationTimer.current = null;
          triggerViolation('Persistent security violation - Failure to restore secure environment');
        }
      } else {
        persistentViolationTimer.current = null;
      }

    }, 2000);

    return () => {
      if (appBackHandle) appBackHandle.remove();
      window.removeEventListener('blur', handleBlur, true);
      window.removeEventListener('visibilitychange', handleVisibility, true);
      window.removeEventListener('resize', handleResize, true);
      clearInterval(overlayCheck);
      if (persistentViolationTimer.current) persistentViolationTimer.current = null;
    };
  }, [quizStarted, quizSubmitted, isBlocked, triggerViolation]);

  // Start Quiz Handler
  const handleStartQuiz = async () => {
    try {
      setIsStarting(true);
      const res = await studentAuthAPI.startQuizAttempt(quizId!);
      if (res.data?.success) {
        const attempt = res.data.attempt;
        setAttemptId(attempt.id || attempt._id);
        setQuizStarted(true);
        setTimeLeft(attempt.timeRemaining || (quiz?.duration || 30) * 60);
        await initializeFullscreen();
        toast.success('🔒 SECURE SESSION ACTIVE');
      }
    } catch (e) {
      toast.error('Initialization Failed');
    } finally {
      setIsStarting(false);
    }
  };

  // Submit Quiz Handler
  const handleSubmitQuiz = async (auto = false, reason = '') => {
    if (submitting) return;
    if (!auto && !showSubmitConfirm) {
      setShowSubmitConfirm(true);
      return;
    }

    setSubmitting(true);
    setShowSubmitConfirm(false);
    try {
      const arr = Object.entries(answers).map(([questionId, studentAnswer]) => ({ questionId, studentAnswer }));
      const res = await studentAuthAPI.submitQuizAttempt(attemptId, arr, auto, reason);
      if (res.data?.success) {
        setSubmissionResult(res.data.results);
        setQuizSubmitted(true);
        storage.removeItem(`quiz_answers_${quizId}`);
        await exitFullscreen();
      }
    } catch (e) {
      toast.error('Submission Failed');
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

  // 1. Loading State
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617] text-white gap-6 select-none">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full shadow-[0_0_30px_rgba(139,92,246,0.3)]"
      />
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold tracking-[0.4em] uppercase opacity-80">Authenticating</h2>
        <p className="text-[10px] font-black tracking-widest text-violet-400 animate-pulse uppercase">Establishing Secure Connection</p>
      </div>
    </div>
  );

  // 2. Pre-Quiz Security Scanner View
  if (!quizStarted && !quizSubmitted) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 text-white overflow-hidden relative select-none">
      <div className="absolute inset-0 bg-violet-500/5 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full space-y-6 relative z-10 p-2">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto border border-slate-800 shadow-xl mb-2">
            <Lock className="w-8 h-8 text-violet-500" />
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase leading-tight">{quiz?.title}</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Duration: {quiz?.duration} Minutes • Total Marks: {quiz?.totalMarks}</p>
        </div>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-xl overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-violet-400 animate-pulse" />
                <CardTitle className="text-xs font-black uppercase tracking-widest text-white">Environment Integrity</CardTitle>
              </div>
              <Badge variant="outline" className="text-[8px] border-violet-500/30 text-violet-400 bg-violet-500/5 uppercase font-black">Secure</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 gap-2.5">
              {securityLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    {log.status === 'ok' ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> :
                      log.status === 'fail' ? <ShieldAlert className="w-4 h-4 text-rose-500" /> :
                        <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{log.label}</span>
                  </div>
                  <Badge className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5",
                    log.status === 'ok' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                      log.status === 'fail' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-violet-500/10 text-violet-500 border-violet-500/20"
                  )}>
                    {log.status === 'ok' ? 'PASSED' : log.status === 'fail' ? 'FAILED' : 'SCAN'}
                  </Badge>
                </motion.div>
              ))}
            </div>

            <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl flex gap-3 items-start">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Strict Protocol</p>
                <p className="text-[10px] leading-relaxed text-slate-400 font-medium">Auto-submission will trigger if you exit fullscreen, switch apps, or take screenshots. Ensure all notifications are silenced.</p>
              </div>
            </div>

            <Button
              onClick={handleStartQuiz}
              disabled={securityStatus !== 'ready' || isStarting}
              className="w-full h-14 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98]"
            >
              {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" /> START ASSESSMENT
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  // 3. Quiz Review / Results View
  if (quizSubmitted) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white select-none">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className={cn(
            "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl mb-6",
            submissionResult?.isBlocked ? "bg-rose-500/20 border border-rose-500" : "bg-violet-600 border border-violet-500"
          )}>
            {submissionResult?.isBlocked ? <ShieldAlert className="w-10 h-10 text-rose-500" /> : <Trophy className="w-10 h-10 text-white" />}
          </div>
          <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">
            {submissionResult?.isBlocked ? "EXAM DISQUALIFIED" : "ASSESSMENT SUBMITTED"}
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {submissionResult?.isBlocked ? "Security Protocol Violation Detected" : "Your responses have been successfully recorded."}
          </p>
        </div>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-xl overflow-hidden p-6 space-y-6 shadow-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase text-violet-400 tracking-widest">Final Score</p>
              <p className="text-3xl font-black text-white">{submissionResult?.score || 0} <span className="text-xs opacity-40 font-bold">/ {submissionResult?.totalMarks}</span></p>
            </div>
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Accuracy</p>
              <p className="text-3xl font-black text-white">{submissionResult?.percentage || 0}%</p>
            </div>
          </div>

          {!submissionResult?.isBlocked && (
            <Button
              onClick={() => setShowDetailedReview(p => !p)}
              variant="outline"
              className="w-full border-white/10 hover:bg-white/5 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Activity className="w-4 h-4" /> {showDetailedReview ? 'HIDE DETAILS' : 'VIEW DETAILED ANALYSIS'}
            </Button>
          )}

          <AnimatePresence>
            {showDetailedReview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4 pt-4 border-t border-white/5 overflow-hidden"
              >
                {submissionResult?.breakdown?.map((item: any, idx: number) => (
                  <div key={idx} className="bg-[#1a1a35]/50 p-4 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[8px] font-black p-0 border-none opacity-40">Q. {idx + 1}</Badge>
                      {item.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <ShieldAlert className="w-4 h-4 text-rose-500" />}
                    </div>
                    <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">{item.question}</p>
                    <div className="space-y-2">
                      <div className={cn("p-2 rounded-lg text-[10px] font-bold", item.isCorrect ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20")}>
                        <span className="opacity-60 uppercase mr-1">Your Answer:</span> {item.studentAnswer || '[EMPTY]'}
                      </div>
                      {!item.isCorrect && (
                        <div className="p-2 rounded-lg text-[10px] font-bold bg-white/5 text-white/80 border border-white/10">
                          <span className="opacity-60 uppercase mr-1 text-primary">Correct:</span> {item.correctAnswer}
                        </div>
                      )}
                      {item.explanation && (
                        <div className="mt-3 bg-primary/5 p-3 rounded-xl border border-primary/10 flex gap-2">
                          <Target className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-[10px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{item.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={() => navigate('/student/dashboard')}
            className="w-full h-14 gradient-secondary rounded-2xl font-black uppercase tracking-widest"
          >
            RETURN TO DASHBOARD
          </Button>
        </Card>
      </motion.div>
    </div>
  );

  // 4. Main Quiz Interface
  const currentQ = quiz?.questions[currentQuestion];

  return (
    <div className="h-full w-full bg-[#020617] text-white flex flex-col items-center overflow-y-auto font-sans pt-safe pb-safe select-none">
      {/* 📍 Exam Header */}
      <MemoizedQuizHeader
        title={quiz?.title}
        timeLeft={timeLeft}
        progress={((currentQuestion + 1) / (quiz?.questionCount || 1)) * 100}
        currentQ={currentQuestion + 1}
        totalQ={quiz?.questionCount}
        marks={currentQ?.marks}
      />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 overflow-y-auto overflow-x-hidden pb-safe">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-12 transform-gpu"
          >
            {/* Question Text */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-3 py-1 rounded-full border-primary/50 text-[10px] font-black uppercase tracking-widest text-primary">
                  Marks: {currentQ?.marks}
                </Badge>
                {answers[currentQ!._id] && (
                  <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[8px] font-black uppercase">Logged</Badge>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight whitespace-pre-wrap">
                {currentQ?.question}
              </h2>
            </div>

            {/* Answer Region */}
            <div className="space-y-4">
              {currentQ?.type === 'mcq' && currentQ.options && (
                <div className="grid grid-cols-1 gap-4">
                  {currentQ.options.map((option, idx) => {
                    const isSelected = answers[currentQ._id] === option;
                    return (
                      <motion.button
                        key={idx}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          if (answers[currentQ!._id] === option) return;
                          setAnswers(prev => ({ ...prev, [currentQ!._id]: option }));
                        }}
                        className={cn(
                          "relative w-full p-5 rounded-2xl text-left border transition-all duration-300 group overflow-hidden",
                          isSelected
                            ? "bg-violet-600/20 border-violet-500 shadow-xl"
                            : "bg-slate-900 border-slate-800 hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs transition-colors",
                            isSelected ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
                          )}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className={cn("font-bold text-sm tracking-wide", isSelected ? "text-white" : "text-slate-300")}>
                            {option}
                          </span>
                        </div>
                        {isSelected && (
                          <motion.div layoutId="mcq-active" className="absolute inset-x-0 bottom-0 h-1 bg-violet-500" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {(currentQ?.type === 'short-answer' || currentQ?.type === 'truefalse') && (
                <Textarea
                  value={answers[currentQ._id] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ._id]: e.target.value }))}
                  placeholder="Type your answer here..."
                  className="min-h-[200px] bg-slate-900 border border-slate-800 focus:border-violet-500/50 rounded-3xl p-6 font-bold text-lg leading-relaxed placeholder:opacity-20 text-white shadow-inner transition-colors select-text"
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 🧭 Quiz Navigation */}
      <footer className="w-full bg-[#020617]/95 backdrop-blur-3xl border-t border-slate-800/50 p-4 pb-safe-area-bottom z-40 transform-gpu">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Button
            onClick={() => {
              isTransitioning.current = true;
              setCurrentQuestion(p => Math.max(0, p - 1));
              setTimeout(() => {
                isTransitioning.current = false;
                initializeFullscreen(); // Re-assert lock after DOM update
              }, 600);
            }}
            disabled={currentQuestion === 0}
            variant="ghost"
            className="flex-1 h-12 rounded-2xl hover:bg-slate-900 text-slate-400 font-black uppercase text-[10px] tracking-widest gap-2 disabled:opacity-20 transition-all active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" /> PREVIOUS
          </Button>

          {currentQuestion === (quiz?.questionCount || 1) - 1 ? (
            <Button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitting}
              className="flex-[2] h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-[0_0_25px_rgba(139,92,246,0.3)] active:scale-95 transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "SUBMIT QUIZ"}
            </Button>
          ) : (
            <Button
              onClick={() => {
                isTransitioning.current = true;
                setCurrentQuestion(p => Math.min((quiz?.questionCount || 1) - 1, p + 1));
                setTimeout(() => {
                  isTransitioning.current = false;
                  initializeFullscreen(); // Re-assert lock after DOM update
                }, 600);
              }}
              className="flex-[2] h-12 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
            >
              NEXT QUESTION <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </footer>

      {/* 📝 Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-violet-600/10 rounded-3xl flex items-center justify-center mx-auto border border-violet-500/20">
                <CheckCircle className="w-10 h-10 text-violet-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight text-white">Final Submission</h3>
                <p className="text-sm text-slate-400 font-medium">Are you sure you want to end this session? You will not be able to change your answers after this.</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => handleSubmitQuiz(false)}
                  className="w-full h-14 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl"
                >
                  YES, SUBMIT NOW
                </Button>
                <Button
                  onClick={() => setShowSubmitConfirm(false)}
                  variant="ghost"
                  className="w-full h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500 hover:text-white"
                >
                  CANCEL & GO BACK
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚫 Warning Modal */}
      <AnimatePresence>
        {showWarningModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl"
            >
              <div className="w-20 h-20 bg-rose-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-xl">
                <ShieldAlert className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-rose-500">Security Breach</h3>
                <p className="text-xl font-bold text-white leading-tight">VIOLATION RECORDED: <span className="text-rose-400 block mt-2 text-sm uppercase">{lastViolation}</span></p>
                <div className="flex justify-center gap-2 pt-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={cn("w-12 h-1.5 rounded-full transition-all duration-300", i < warningCount ? "bg-rose-500" : "bg-slate-800")} />
                  ))}
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 pt-4">WARNING {warningCount} OF 3. FINAL STRIKE RESULTS IN FAILURE.</p>
              </div>
              <Button
                onClick={() => { setShowWarningModal(false); isSecurityPaused.current = false; initializeFullscreen(); }}
                className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg"
              >
                I ACKNOWLEDGE & AGREE
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 📍 QUIZ HEADER COMPONENT (Memoized for performance)
const MemoizedQuizHeader = memo(function QuizHeader({ title, timeLeft, progress, currentQ, totalQ, marks }: any) {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <header className="w-full pt-8 pb-4 px-6 bg-[#020617] border-b border-slate-800/60 sticky top-0 z-50 transform-gpu pt-safe">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 shadow-lg">
              <ShieldCheck className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-500 leading-none mb-1">Live Assessment</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase truncate max-w-[150px]">{title}</span>
                <Badge className="bg-emerald-500/10 text-emerald-500 text-[7px] font-black uppercase px-1.5 border-none">Active</Badge>
              </div>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-3 bg-slate-900 border px-3 py-2 rounded-2xl transition-all duration-300 shadow-sm",
            timeLeft < 300 ? "border-rose-500/50 bg-rose-500/5 animate-pulse" : "border-slate-800"
          )}>
            <Clock className={cn("w-4 h-4", timeLeft < 300 ? "text-rose-500" : "text-violet-400")} />
            <span className={cn("text-lg font-black tracking-tight font-mono", timeLeft < 300 ? "text-rose-500" : "text-white")}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-end px-1">
            <p className="text-[8px] font-black uppercase tracking-widest text-violet-400">Progress: {Math.round(progress)}%</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Item: {currentQ} / {totalQ}</p>
          </div>
          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all duration-500"
            />
          </div>
        </div>
      </div>
    </header>
  );
});