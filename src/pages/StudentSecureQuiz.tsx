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
import { PrivacyScreen } from '@capacitor-community/privacy-screen';

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
  const [remainingEscapeTime, setRemainingEscapeTime] = useState(30);
  const [isOutsideApp, setIsOutsideApp] = useState(false);
  const [isTampered, setIsTampered] = useState(false);

  // Security Refs
  const lastViolationTime = useRef<number>(0);
  const originalDimensions = useRef({ width: 0, height: 0 });
  const isFullscreenActive = useRef(false);
  const isSecurityPaused = useRef(false);
  const isTransitioning = useRef(false);
  const tamperCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const escapeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOutsideAppRef = useRef(false);
  const warningCountRef = useRef(0);
  const [activeTab, setActiveTab] = useState<'question' | 'all'>('question');
  const [networkSecure, setNetworkSecure] = useState(true);

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
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      if (Capacitor.isNativePlatform()) {
        await PrivacyScreen.disable();
      }
    } catch (e) { console.error('Exit security error', e); }

    if (!Capacitor.isNativePlatform()) return;
    try {
      await StatusBar.show();
      if (Capacitor.getPlatform() === 'android') {
        const NB: any = NavigationBar;
        if (NB?.show) await NB.show();
      }
    } catch (e) { }
  }, []);

  const initializeFullscreen = useCallback(async () => {
    try {
      isTransitioning.current = true;
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
      if (Capacitor.isNativePlatform()) {
        await PrivacyScreen.enable();
      }
    } catch (e) { console.error('Security Init error', e); }

    if (!Capacitor.isNativePlatform()) {
      setTimeout(() => { isTransitioning.current = false; }, 1000);
      return;
    }
    
    const enforceImmersive = async () => {
      try {
        await StatusBar.hide();
        if (Capacitor.getPlatform() === 'android') {
          const NB: any = NavigationBar;
          if (NB?.setTransparency) await NB.setTransparency({ isTransparent: true });
          if (NB?.hide) await NB.hide();
        }
      } catch (e) { }
    };

    enforceImmersive();
    setTimeout(() => {
      isTransitioning.current = false;
    }, 1000);
  }, []);

  // 🛡️ Persistent Navigation Hardening Heartbeat
  useEffect(() => {
    if (!quizStarted || quizSubmitted || isBlocked) return;
    
    const enforceImmersive = async () => {
      try {
        await StatusBar.hide();
        if (Capacitor.getPlatform() === 'android') {
          const NB: any = NavigationBar;
          if (NB?.hide) await NB.hide();
        }
      } catch (e) {}
    };

    const interval = setInterval(enforceImmersive, 2000);
    return () => clearInterval(interval);
  }, [quizStarted, quizSubmitted, isBlocked]);

  const triggerViolation = useCallback((reason: string) => {
    if (isTransitioning.current || isSecurityPaused.current || isBlocked) return;
    const now = Date.now();
    if (now - lastViolationTime.current < 3000) return;
    lastViolationTime.current = now;

    const next = warningCountRef.current + 1;
    warningCountRef.current = next;
    setWarningCount(next);
    setLastViolation(reason);
    toast.error(`SECURITY ALERT [${next}/3]`, { description: reason, position: 'top-center' });

    if (next >= 3) {
      setIsBlocked(true);
      handleSubmitQuiz(true, `Strikes Exceeded: ${reason}`);
    } else {
      isSecurityPaused.current = true;
      setShowWarningModal(true);
    }
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
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with state for use in closures
  useEffect(() => { isOutsideAppRef.current = isOutsideApp; }, [isOutsideApp]);

  // 🔒 30-Second Escape Buffer Timer — runs independently when outside app
  useEffect(() => {
    if (!quizStarted || quizSubmitted || isBlocked) return;

    if (isOutsideApp) {
      // Start the countdown
      escapeTimerRef.current = setInterval(() => {
        setRemainingEscapeTime(prev => {
          if (prev <= 1) {
            setIsBlocked(true);
            handleSubmitQuiz(true, 'Total Escape Time Exceeded (30s)');
            if (escapeTimerRef.current) clearInterval(escapeTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // User returned — stop timer and reset buffer
      if (escapeTimerRef.current) {
        clearInterval(escapeTimerRef.current);
        escapeTimerRef.current = null;
      }
      setRemainingEscapeTime(30);
    }

    return () => {
      if (escapeTimerRef.current) {
        clearInterval(escapeTimerRef.current);
        escapeTimerRef.current = null;
      }
    };
  }, [isOutsideApp, quizStarted, quizSubmitted, isBlocked]);

  useEffect(() => {
    if (!quizStarted || quizSubmitted || isBlocked) return;

    const handleFocusLoss = (reason: string) => {
      if (isSecurityPaused.current || isTransitioning.current || isBlocked) return;
      if (isOutsideAppRef.current) return; // Already flagged
      setIsOutsideApp(true);
      toast.error('SURVEILLANCE ALERT', { 
        description: 'You have left the secure environment. Return immediately.',
        duration: 30000,
        position: 'top-center'
      });
    };

    const handleFocusGain = () => {
      if (!isOutsideAppRef.current) return; // Not flagged, ignore
      if (isSecurityPaused.current) return; // Already handling a violation
      setIsOutsideApp(false);
        
      // Issue a strike on return
      const next = warningCountRef.current + 1;
      warningCountRef.current = next;
      setWarningCount(next);
      setLastViolation('Loss of Focus / Screen Switching');
      
      if (next >= 3) {
        setIsBlocked(true);
        handleSubmitQuiz(true, 'Maximum Strikes Reached (Limit: 3)');
      } else {
        isSecurityPaused.current = true;
        setShowWarningModal(true);
      }
      toast.success(`Integrity restored. Strike ${next} of 3 issued.`);
    };

    const handleBlur = () => {
      if (!document.hasFocus()) {
        handleFocusLoss('Focus lost to external app or notification');
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        handleFocusLoss('Screen minimized or tab switch');
      } else {
        handleFocusGain();
      }
    };
    
    const handleFocus = () => handleFocusGain();

    const preventSecurityBreach = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        triggerViolation('Developer tools shortcut detected');
      }
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const preventContentExtraction = (e: any) => {
       e.preventDefault();
       toast.error("Content Protection Active", { description: "Copying/Pasting is restricted during the exam." });
    };
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (quizStarted && !quizSubmitted && !isBlocked) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    // Store original dimensions for split-screen detection
    if (originalDimensions.current.width === 0) {
      originalDimensions.current = { width: window.innerWidth, height: window.innerHeight };
    }
    
    // 🔍 Tamper-Resistant Proctoring Loop (500ms Check)
    const monitorSecurity = () => {
       if (quizStarted && !quizSubmitted && !isBlocked && !isTransitioning.current) {
          if (!document.hasFocus()) {
             if (!isOutsideAppRef.current) {
                handleFocusLoss('Unauthorized application overlay or window detected');
             }
          }
          
          if (window.innerHeight < (originalDimensions.current.height * 0.7)) {
             if (!isOutsideAppRef.current) handleFocusLoss('Split-screen or unauthorized resizing detected');
          }
          
          const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
          if (conn && (conn.type === 'vpn' || conn.rtt > 5000)) {
             setNetworkSecure(false);
             triggerViolation('Secure network connection lost (VPN Detection)');
          }
       }
    };

    window.addEventListener('blur', handleBlur, true);
    window.addEventListener('visibilitychange', handleVisibility, true);
    window.addEventListener('focus', handleFocus, true);
    window.addEventListener('keydown', preventSecurityBreach);
    window.addEventListener('contextmenu', preventContextMenu);
    window.addEventListener('copy', preventContentExtraction);
    window.addEventListener('paste', preventContentExtraction);
    window.addEventListener('cut', preventContentExtraction);
    window.addEventListener('dragstart', preventContentExtraction);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    tamperCheckInterval.current = setInterval(monitorSecurity, 500);
    
    // 📱 Native App State Listener (Capacitor)
    const setupNativeListeners = async () => {
      if (!Capacitor.isNativePlatform()) return;
      const listener = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          handleFocusLoss('System-level backgrounding or split-screen detected');
        } else {
          handleFocusGain();
        }
      });
      return () => { listener.remove(); };
    };

    const nativeCleanup = setupNativeListeners();

    return () => {
      nativeCleanup.then(clean => clean?.());
      window.removeEventListener('blur', handleBlur, true);
      window.removeEventListener('visibilitychange', handleVisibility, true);
      window.removeEventListener('focus', handleFocus, true);
      window.removeEventListener('keydown', preventSecurityBreach);
      window.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('copy', preventContentExtraction);
      window.removeEventListener('paste', preventContentExtraction);
      window.removeEventListener('cut', preventContentExtraction);
      window.removeEventListener('dragstart', preventContentExtraction);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (tamperCheckInterval.current) clearInterval(tamperCheckInterval.current);
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    };
  }, [quizStarted, quizSubmitted, isBlocked, triggerViolation, networkSecure]);

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

  const handleSubmitQuiz = useCallback(async (auto = false, reason = '') => {
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
      console.error('Quiz submission error:', e);
      toast.error('Sync Error: Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, answers, quizId, submitting, exitFullscreen]);

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
      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Loading Quiz</p>
    </div>
  );

  // 2. Pre-Quiz Entry
  if (!quizStarted && !quizSubmitted) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 uppercase text-[10px] py-1 px-3 mb-4 font-bold">Assessment</Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">{quiz?.title}</h1>
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
              <p className="text-sm font-bold text-slate-800">{quiz?.duration}m</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Questions</p>
              <p className="text-sm font-bold text-slate-800">{quiz?.questionCount}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Points</p>
              <p className="text-sm font-bold text-slate-800">{quiz?.totalMarks}</p>
            </div>
          </div>
        </div>

        <Card className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden mt-8 bg-white/70 backdrop-blur-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex items-center gap-2 text-indigo-600">
               <Shield className="w-5 h-5" />
              <CardTitle className="text-sm font-bold uppercase tracking-tight">Secure Quiz</CardTitle>
             </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <ul className="space-y-4">
              {[
                { icon: Shield, text: "Stay within the exam interface" },
                { icon: EyeOff, text: "Disable notifications to prevent focus loss" },
                { icon: Info, text: "Three safety violations will end your session" }
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
              {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Quiz"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // 3. Quiz Complete
  // Normalize results — support multiple backend response shapes
  const detailedResultsList = submissionResult?.detailedResults || submissionResult?.results || submissionResult?.answers || [];
  const resultScore = submissionResult?.score ?? submissionResult?.totalMarks ?? null;
  const resultTotal = submissionResult?.totalQuestions ?? submissionResult?.maxMarks ?? submissionResult?.total ?? null;
  const resultPercentage = submissionResult?.percentage ?? (resultScore !== null && resultTotal ? Math.round((resultScore / resultTotal) * 100) : null);

  if (quizSubmitted) return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center p-6 text-slate-900 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="max-w-xl w-full text-center space-y-8 py-10">
        <div className="w-20 h-20 bg-teal-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-teal-100 mb-4 animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">Assessment Submitted</h2>
          <p className="text-slate-500 font-medium mt-2 leading-relaxed">Your responses have been synchronized with the faculty portal.</p>
        </div>

        {/* Score Summary */}
        {resultScore !== null && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Score</p>
                <h4 className="text-3xl font-black text-slate-900">{resultScore}{resultTotal ? `/${resultTotal}` : ''}</h4>
              </div>
              {resultPercentage !== null && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Accuracy</p>
                  <h4 className="text-3xl font-black text-indigo-600">{resultPercentage}%</h4>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Results */}
        {Array.isArray(detailedResultsList) && detailedResultsList.length > 0 && (
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Activity className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Summary Report</p>
            </div>

            <div className="space-y-4">
              {detailedResultsList.map((item: any, idx: number) => (
                <div key={idx} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm text-left">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight block mb-1">Question {idx + 1}</span>
                      <p className="text-sm font-bold text-slate-800 leading-snug">{item.question || item.questionText || `Question ${idx + 1}`}</p>
                    </div>
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      item.isCorrect ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-600"
                    )}>
                      {item.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Your Choice</p>
                      <p className={cn("text-xs font-bold", item.isCorrect ? "text-teal-600" : "text-red-500")}>{item.studentAnswer || item.yourAnswer || item.selected || "No Choice"}</p>
                    </div>
                    {!item.isCorrect && (
                      <div className="p-3 bg-teal-50/30 rounded-xl border border-teal-100/30">
                        <p className="text-[8px] font-black text-teal-500 uppercase mb-1">Correct Answer</p>
                        <p className="text-xs font-bold text-teal-700">{item.correctAnswer || item.correct || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No detailed results fallback */}
        {(!Array.isArray(detailedResultsList) || detailedResultsList.length === 0) && (
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <p className="text-sm text-slate-400 font-medium">Detailed question breakdown is not available for this submission. Contact your instructor for more details.</p>
          </div>
        )}

        <Button
          onClick={() => navigate('/student/dashboard')}
          className="w-full h-15 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 py-6"
        >
          Return to Dashboard
        </Button>
        <div className="h-20" />
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
    <div className={cn(
      "h-screen w-full bg-white flex flex-col text-slate-900 overflow-hidden select-none relative",
      isOutsideApp && "filter blur-xl grayscale pointer-events-none"
    )}>
      <style>{`
        @media print {
          body { display: none !important; }
        }
        * {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>

      {isOutsideApp && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
           <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.5)]">
             <ShieldAlert className="w-12 h-12 text-white" />
           </div>
           <h2 className="text-3xl font-black text-white tracking-tight mb-2 uppercase">Violation in Progress</h2>
           <p className="text-red-400 font-bold text-sm mb-10 max-w-xs">RETURN TO THE APP IMMEDIATELY. YOUR SESSION WILL BE TERMINATED IN:</p>
           <div className="text-7xl font-black text-white tabular-nums tracking-tighter mb-4">
             {remainingEscapeTime}S
           </div>
           <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Strike Warning {warningCount + 1} of 3</p>
        </div>
      )}

      {/* 📍 Header - Premium Two-Row Layout */}
      <div className="flex flex-col bg-white border-b border-slate-100 relative z-30 shrink-0 pt-12 sm:pt-10">
        {/* Row 1: Session Info */}
        <div className="px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
             <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-600 flex items-center justify-center font-black text-white shadow-xl shadow-indigo-100 border border-indigo-500">
               {currentQuestion + 1}
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Exam Session</p>
               <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-none truncate max-w-[200px]">{quiz?.title}</h1>
             </div>
          </div>
          <div className="flex flex-col items-end">
            <div className={cn(
              "px-4 py-2.5 rounded-2xl font-black text-xs tabular-nums flex items-center gap-2 border shadow-sm transition-all",
              timeLeft < 120 ? "bg-red-50 text-red-600 animate-pulse border-red-100" : "bg-indigo-50 text-indigo-600 border-indigo-100 text-indigo-700"
            )}>
              <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Row 2: Status Bar */}
        <div className="px-6 py-3 bg-slate-50/80 flex items-center justify-between border-t border-slate-100/50 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-red-600 animate-ping opacity-40" />
            </div>
            <span className="text-[11px] font-black text-red-600 uppercase tracking-widest">Surveillance Active</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
             <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
             <span className="text-[10px] font-black text-slate-500 tabular-nums uppercase">
               Buffer: <span className="text-red-700 font-black">{remainingEscapeTime}S</span>
             </span>
          </div>
        </div>

        <Progress value={((currentQuestion + 1) / (quiz?.questions?.length || 1)) * 100} className="h-1.5 bg-slate-100 rounded-none shadow-none z-20 shrink-0" />
      </div>

      {/* 📝 Content - Amazon-Grade Smooth Scroll */}
      <main className="flex-1 overflow-y-auto scroll-smooth bg-white h-full touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="px-6 sm:px-10 py-10 pb-96 max-w-2xl mx-auto w-full flex flex-col min-h-full">
          <div className="flex-1 space-y-10 sm:space-y-14 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3 sm:space-y-4">
              <Badge className="bg-teal-50 text-teal-600 border-none font-black text-[8px] sm:text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider">{currentQ?.marks} Marks</Badge>
              <div className="text-base sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">
                <FormattedText text={currentQ?.question || ''} isQuestion={true} />
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 pt-2">
              {currentQ?.type === 'mcq' && currentQ.options?.map((option, idx) => {
                const isSelected = answers[currentQ._id] === option;
                return (
                  <button
                    key={idx}
                    onClick={() => setAnswers(p => ({ ...p, [currentQ._id]: option }))}
                    className={cn(
                      "w-full p-4 sm:p-5 rounded-2xl sm:rounded-[1.75rem] text-left border-2 transition-all flex items-center gap-3 sm:gap-4 group active:scale-[0.98]",
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50"
                        : "border-slate-50 bg-[#FBFDFF] hover:border-slate-100"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs shrink-0 transition-all",
                      isSelected ? "bg-indigo-600 text-white scale-110" : "bg-white text-slate-300 border border-slate-50"
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={cn("font-bold text-sm sm:text-base leading-snug break-words", isSelected ? "text-indigo-900" : "text-slate-500 group-hover:text-slate-700")}>{option}</span>
                  </button>
                );
              })}

              {currentQ?.type === 'short-answer' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">Your Answer</Label>
                  <Textarea
                    placeholder="Type your response here..."
                    className="min-h-[200px] sm:min-h-[250px] rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 border-slate-100 bg-[#FBFDFF] focus:bg-white focus:ring-8 focus:ring-indigo-50/50 font-bold text-sm sm:text-lg transition-all resize-none shadow-inner"
                    value={answers[currentQ._id] || ''}
                    onChange={(e) => setAnswers(p => ({ ...p, [currentQ._id]: e.target.value }))}
                  />
                </div>
              )}

              {currentQ?.type === 'truefalse' && (
                <div className="space-y-3 sm:space-y-4">
                  {['True', 'False'].map((option) => {
                    const isSelected = answers[currentQ._id] === option;
                    return (
                      <button
                        key={option}
                        onClick={() => setAnswers(p => ({ ...p, [currentQ._id]: option }))}
                        className={cn(
                          "w-full p-4 sm:p-5 rounded-2xl sm:rounded-[1.75rem] text-left border-2 transition-all flex items-center gap-3 sm:gap-4 group active:scale-[0.98]",
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50"
                            : "border-slate-50 bg-[#FBFDFF] hover:border-slate-100"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs shrink-0 transition-all",
                          isSelected ? "bg-indigo-600 text-white scale-110" : "bg-white text-slate-300 border border-slate-50"
                        )}>
                          {option === 'True' ? 'T' : 'F'}
                        </div>
                        <span className={cn("font-bold text-sm sm:text-base leading-snug", isSelected ? "text-indigo-900" : "text-slate-500 group-hover:text-slate-700")}>{option}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Enforcement of Linear Flow: Navigator Removed */}
          </div>
        </div>
      </main>

      {/* 🎮 Controls - High Performance Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-5 sm:p-8 pb-10 sm:pb-14 bg-white/95 backdrop-blur-2xl border-t border-slate-100 flex items-center justify-between gap-4 z-40 shrink-0">
        <Button
          variant="secondary"
          disabled={currentQuestion === 0}
          onClick={() => {
            setCurrentQuestion(p => p - 1);
            document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="h-14 sm:h-16 px-5 sm:px-10 rounded-2xl sm:rounded-3xl font-black text-slate-500 hover:text-indigo-600 bg-slate-50 border border-slate-100 transition-all active:scale-95 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" /> <span className="hidden sm:inline uppercase tracking-widest text-[10px]">Back</span>
        </Button>

        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Current Question</p>
          <p className="text-sm font-black text-slate-900 tracking-tight select-none">
            {currentQuestion + 1} <span className="text-slate-300 px-1">/</span> {quiz?.questions?.length || 1}
          </p>
        </div>

        {currentQuestion < (quiz?.questions?.length || 1) - 1 ? (
          <Button
            onClick={() => {
              setCurrentQuestion(p => p + 1);
              document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="h-14 sm:h-16 px-8 sm:px-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl sm:rounded-3xl font-black shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-3 uppercase tracking-widest text-[11px]"
          >
            Next <ArrowRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={submitting}
            className="h-14 sm:h-16 px-8 sm:px-14 bg-slate-900 hover:bg-black text-white rounded-2xl sm:rounded-3xl font-black shadow-2xl transition-all active:scale-95 uppercase tracking-widest text-[11px]"
          >
            Finish Exam
          </Button>
        )}
      </div>

      {/* Modals */}
      <Dialog open={showWarningModal} onOpenChange={(o) => { if (!o) { isSecurityPaused.current = false; setShowWarningModal(false); } }}>
        <DialogContent className="rounded-3xl p-8 max-w-sm w-[90vw] border-none shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
              <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-600 tracking-tight">Safety Alert</h2>
            <p className="text-slate-500 font-medium leading-relaxed text-sm">
              Notice: <span className="text-red-600 font-bold block mt-1">"{lastViolation}"</span>. Please return to your exam paper.
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
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Submit Exam?</h2>
            <p className="text-slate-500 font-medium leading-relaxed text-sm">
              You have answered <span className="text-indigo-600 font-bold">{Object.keys(answers).length}</span> out of <span className="font-bold">{quiz?.questionCount}</span> questions. Ready to submit?
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