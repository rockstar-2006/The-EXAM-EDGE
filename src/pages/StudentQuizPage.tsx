import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, Clock, CheckCircle2, AlertCircle, Sparkles, Shield, ChevronRight, Activity, Target, Zap, Waves, BadgeCheck, Code, ShieldAlert, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AcademicTextRenderer, cleanAcademicText } from '@/components/AcademicTextRenderer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Question {
  id: string;
  type: 'mcq' | 'short-answer';
  question: string;
  options?: string[];
  imageUrl?: string;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  numQuestions?: number;
  questions?: Question[];
}

// 📝 CODE AWARE TEXT RENDERING
const FormattedText = ({ text, isQuestion = false, imageUrl = '' }: { text: string; isQuestion?: boolean; imageUrl?: string }) => {
  return <AcademicTextRenderer content={text} isQuestion={isQuestion} imageUrl={imageUrl} />;
};

const formatCodeSnippet = (code: string) => {
  return code;
};

export default function StudentQuizPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [email, setEmail] = useState('');

  const [showInfoForm, setShowInfoForm] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentUSN, setStudentUSN] = useState('');
  const [studentBranch, setStudentBranch] = useState('');
  const [studentYear, setStudentYear] = useState('');
  const [studentSemester, setStudentSemester] = useState('');
  const [studentSection, setStudentSection] = useState('');

  const [quizStarted, setQuizStarted] = useState(false);
  const [attemptId, setAttemptId] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);

  const [warningCount, setWarningCount] = useState(0);
  const [lastViolation, setLastViolation] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingEscapeTime, setRemainingEscapeTime] = useState(30);
  const [isOutsideApp, setIsOutsideApp] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState(0); // NEW: blur overlay intensity

  // Refs
  const lastViolationTime = useRef<number>(0);
  const isSecurityPaused = useRef(false);
  const isTransitioning = useRef(false);
  const escapeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOutsideAppRef = useRef(false);
  const warningCountRef = useRef(0);
  const lastFocusEventTime = useRef(0);             // NEW: debounce focus events
  const originalDimensions = useRef({ w: 0, h: 0 }); // NEW: split-screen detection
  const devtoolsInterval = useRef<NodeJS.Timeout | null>(null); // NEW: devtools check
  const handleSubmitRef = useRef<(auto?: boolean, reason?: string) => void>(() => {}); // NEW: stable ref

  useEffect(() => {
    fetchQuizData();
  }, [token]);

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

    // Log violation to backend
    if (attemptId) {
      axios.post(`${API_URL}/student-quiz/attempt/log-violation`, {
        attemptId,
        violationType: 'keyboard-shortcut',
        reason
      }).then(res => {
        if (res.data?.blocked) {
          setIsBlocked(true);
          setBlurIntensity(20);
        }
      }).catch(() => {
        // Retry once (Requirement 5.3)
        axios.post(`${API_URL}/student-quiz/attempt/log-violation`, {
          attemptId,
          violationType: 'keyboard-shortcut',
          reason
        }).catch(err2 => console.error('Violation logging retry failed', err2));
      });
    }

    if (next >= 3) {
      setIsBlocked(true);
      setBlurIntensity(20);
      handleSubmitQuiz(true, `Strikes Exceeded: ${reason}`);
    } else {
      isSecurityPaused.current = true;
      setShowWarningModal(true);
    }
  }, [isBlocked, attemptId]);

  // Security Monitoring
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with state
  useEffect(() => { isOutsideAppRef.current = isOutsideApp; }, [isOutsideApp]);

  // 🔒 30-Second Escape Buffer Timer
  useEffect(() => {
    if (!quizStarted || quizSubmitted || isBlocked) return;

    if (isOutsideApp) {
      setBlurIntensity(15);
      escapeTimerRef.current = setInterval(() => {
        setRemainingEscapeTime(prev => {
          if (prev <= 1) {
            setIsBlocked(true);
            setBlurIntensity(25);
            handleSubmitRef.current(true, 'Total Escape Time Exceeded (30s)');
            if (escapeTimerRef.current) clearInterval(escapeTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (escapeTimerRef.current) { clearInterval(escapeTimerRef.current); escapeTimerRef.current = null; }
      setBlurIntensity(0);
      setRemainingEscapeTime(30);
    }

    return () => { if (escapeTimerRef.current) { clearInterval(escapeTimerRef.current); escapeTimerRef.current = null; } };
  }, [isOutsideApp, quizStarted, quizSubmitted, isBlocked]);

  // 🌐 BROWSER SECURITY LAYER — focus/visibility/keyboard/devtools
  useEffect(() => {
    if (!quizStarted || quizSubmitted || isBlocked) return;

    // Store original dimensions once for split-screen detection
    if (originalDimensions.current.w === 0) {
      originalDimensions.current = { w: window.innerWidth, h: window.innerHeight };
    }

    const debounce = (fn: () => void) => {
      const now = Date.now();
      if (now - lastFocusEventTime.current < 800) return;
      lastFocusEventTime.current = now;
      fn();
    };

    const handleFocusLoss = (reason: string) => {
      if (isSecurityPaused.current || isTransitioning.current || isBlocked) return;
      if (isOutsideAppRef.current) return;
      debounce(() => {
        isOutsideAppRef.current = true;
        setIsOutsideApp(true);
        setBlurIntensity(12);
        toast.error('🚨 SECURITY ALERT', {
          description: 'You left the exam. Return immediately or your session will terminate.',
          duration: 30000,
          position: 'top-center'
        });
      });
    };

    const handleFocusGain = () => {
      if (!isOutsideAppRef.current) return;
      if (isSecurityPaused.current) return;
      debounce(() => {
        isOutsideAppRef.current = false;
        setIsOutsideApp(false);
        setBlurIntensity(0);
        setRemainingEscapeTime(30);

        const next = warningCountRef.current + 1;
        warningCountRef.current = next;
        setWarningCount(next);
        setLastViolation('Tab switch / Focus loss detected');

        // Log violation to backend
        if (attemptId) {
          axios.post(`${API_URL}/student-quiz/attempt/log-violation`, {
            attemptId,
            violationType: 'app-switch',
            reason: 'Tab switch / Focus loss detected'
          }).then(res => {
            if (res.data?.blocked) {
              setIsBlocked(true);
              setBlurIntensity(20);
            }
          }).catch(() => {
            // Retry once
            axios.post(`${API_URL}/student-quiz/attempt/log-violation`, {
              attemptId,
              violationType: 'app-switch',
              reason: 'Tab switch / Focus loss detected'
            }).catch(err2 => console.error('Violation logging retry failed', err2));
          });
        }

        if (next >= 3) {
          setIsBlocked(true);
          setBlurIntensity(20);
          handleSubmitRef.current(true, 'Maximum Violations Reached');
        } else {
          isSecurityPaused.current = true;
          setShowWarningModal(true);
        }
        toast.success(`✓ Focus restored. Strike ${next} of 3.`);
      });
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus() && !isTransitioning.current) {
          handleFocusLoss('Focus lost to external app or notification');
        }
      }, 150);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        handleFocusLoss('Tab switched or screen minimised');
      } else if (isOutsideAppRef.current) {
        handleFocusGain();
      }
    };

    const handleFocus = () => {
      if (isOutsideAppRef.current && !document.hidden) handleFocusGain();
    };

    // Block keyboard shortcuts: F12, Ctrl+Shift+I/J/C, Ctrl+U
    const blockShortcuts = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
        (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'I')) // Safari devtools
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('Developer tools shortcut detected');
      }
    };

    // Block right-click context menu
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();

    // Block copy / cut / paste / drag
    const blockExtraction = (e: ClipboardEvent | DragEvent) => {
      e.preventDefault();
      toast.error('Content protection active — copying is disabled.', { position: 'top-center', duration: 2000 });
    };

    // Warn before leaving page
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    // 🔍 Polling monitor: overlay apps, split-screen, devtools open
    const monitorSecurity = () => {
      if (!quizStarted || quizSubmitted || isBlocked || isTransitioning.current) return;

      // Overlay app or floating window: focus gone but page visible
      if (!document.hasFocus() && !document.hidden && !isOutsideAppRef.current && !isSecurityPaused.current) {
        const now = Date.now();
        if (now - lastFocusEventTime.current >= 800) {
          handleFocusLoss('Floating app or overlay detected above exam');
        }
      }
      // Focus returned after overlay
      if (document.hasFocus() && !document.hidden && isOutsideAppRef.current) {
        const now = Date.now();
        if (now - lastFocusEventTime.current >= 800) handleFocusGain();
      }

      // Split-screen: window shrank significantly
      const { w: ow, h: oh } = originalDimensions.current;
      if (ow > 0) {
        const isSplit = window.innerWidth < ow * 0.7 || window.innerHeight < oh * 0.7;
        if (isSplit && !isOutsideAppRef.current && !isSecurityPaused.current) {
          const now = Date.now();
          if (now - lastFocusEventTime.current >= 800) {
            handleFocusLoss('Split-screen or window resize detected');
          }
        }
      }

      // DevTools: significant difference between outer and inner window size (desktop)
      const devtoolsOpen =
        window.outerWidth - window.innerWidth > 160 ||
        window.outerHeight - window.innerHeight > 160;
      if (devtoolsOpen && !isSecurityPaused.current) {
        const now = Date.now();
        if (now - lastViolationTime.current > 5000) {
          lastViolationTime.current = now;
          toast.error('DevTools detected — this is a proctored exam.', { position: 'top-center' });
          handleFocusLoss('Browser DevTools opened');
        }
      }
    };

    const monitorInterval = setInterval(monitorSecurity, 500);

    window.addEventListener('blur', handleBlur, true);
    window.addEventListener('visibilitychange', handleVisibility, true);
    window.addEventListener('focus', handleFocus, true);
    window.addEventListener('keydown', blockShortcuts, true);
    window.addEventListener('contextmenu', blockContextMenu);
    window.addEventListener('copy', blockExtraction as EventListener);
    window.addEventListener('cut', blockExtraction as EventListener);
    window.addEventListener('paste', blockExtraction as EventListener);
    window.addEventListener('dragstart', blockExtraction as EventListener);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(monitorInterval);
      window.removeEventListener('blur', handleBlur, true);
      window.removeEventListener('visibilitychange', handleVisibility, true);
      window.removeEventListener('focus', handleFocus, true);
      window.removeEventListener('keydown', blockShortcuts, true);
      window.removeEventListener('contextmenu', blockContextMenu);
      window.removeEventListener('copy', blockExtraction as EventListener);
      window.removeEventListener('cut', blockExtraction as EventListener);
      window.removeEventListener('paste', blockExtraction as EventListener);
      window.removeEventListener('dragstart', blockExtraction as EventListener);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    };
  }, [quizStarted, quizSubmitted, isBlocked, attemptId, triggerViolation]);

  useEffect(() => {
    if (quizStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quizStarted, timeLeft]);

  // Real-time answers auto-save
  useEffect(() => {
    if (!quizStarted || quizSubmitted || isBlocked || !attemptId || answers.length === 0) return;

    const saveTimeout = setTimeout(() => {
      axios.post(`${API_URL}/student-quiz/attempt/save-progress`, {
        attemptId,
        answers
      }).catch(err => console.error('Failed to save quiz progress:', err));
    }, 2000); // 2-second debounce

    return () => clearTimeout(saveTimeout);
  }, [answers, quizStarted, quizSubmitted, isBlocked, attemptId]);

  const fetchQuizData = async () => {
    try {
      const response = await axios.get(`${API_URL}/student-quiz/attempt/${token}`);
      const data = response.data;

      if (data.alreadySubmitted) {
        toast.info('Session Logged: Multiple attempts prohibited');
        setQuizSubmitted(true);
        setResults(data.existingResults || data.results || null);
        setLoading(false);
        return;
      }

      setQuiz(data.quiz);
      setEmail(data.email);

      // Pre-populate student details if returned from backend
      if (data.studentInfo) {
        setStudentName(data.studentInfo.name || '');
        setStudentUSN(data.studentInfo.usn || '');
        setStudentBranch(data.studentInfo.branch || '');
        setStudentYear(data.studentInfo.year || '');
        setStudentSemester(data.studentInfo.semester || '');
        setStudentSection(data.studentInfo.section || '');
      }

      if (data.isBlocked) {
        setIsBlocked(true);
        setBlurIntensity(20);
        setAttemptId(data.attemptId || '');
        setQuizStarted(true);
        setWarningCount(data.violationCount || 3);
        warningCountRef.current = data.violationCount || 3;
        setLastViolation(data.violationReason || 'Security violations detected during quiz attempt.');
        setLoading(false);
        return;
      }

      if (data.hasStarted && data.attemptId) {
        setAttemptId(data.attemptId);
        setQuizStarted(true);
        
        // Restore answers (progress)
        if (data.answers && Array.isArray(data.answers)) {
          setAnswers(data.answers);
        } else {
          setAnswers(new Array(data.quiz.questions.length).fill(''));
        }

        // Restore remaining time
        if (data.timeRemaining !== null && data.timeRemaining !== undefined) {
          setTimeLeft(data.timeRemaining);
        } else {
          setTimeLeft((data.quiz.duration || 30) * 60);
        }

        // Restore warning count
        setWarningCount(data.violationCount || 0);
        warningCountRef.current = data.violationCount || 0;
      } else {
        setShowInfoForm(true);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching quiz:', error);
      toast.error(error.response?.data?.message || 'Access Denied: Invalid Authentication Token');
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!studentName.trim() || !studentUSN.trim() || !studentBranch || !studentYear || !studentSemester) {
      toast.error('Identity Error: All identity parameters required');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/student-quiz/attempt/start`, {
        token,
        studentName,
        studentUSN,
        studentBranch,
        studentYear,
        studentSemester,
        studentSection,
      });

      setAttemptId(response.data.attemptId);
      setQuiz(response.data.quiz);
      setAnswers(new Array(response.data.quiz.questions.length).fill(''));
      setTimeLeft((response.data.quiz.duration || 30) * 60);
      setQuizStarted(true);
      setShowInfoForm(false);

      // 🌐 Request fullscreen for browser security (graceful on iOS Safari)
      isTransitioning.current = true;
      try {
        const el = document.documentElement as any;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen(); // Safari
        else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();      // Firefox old
      } catch { /* iOS Safari doesn't support fullscreen — silently ignore */ }
      setTimeout(() => { isTransitioning.current = false; }, 1200);

      // Store original window dimensions for split-screen detection
      originalDimensions.current = { w: window.innerWidth, h: window.innerHeight };

      toast.success('Assessment Initialized');
    } catch (error: any) {
      console.error('Error starting quiz:', error);
      toast.error(error.response?.data?.message || 'Initialization Failed: Environment unstable');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = async (auto = false, reason = '') => {
    if (submitting || quizSubmitted) return;

    setSubmitting(true);
    // Exit fullscreen on submit
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch { /* ignore */ }

    try {
      const response = await axios.post(`${API_URL}/student-quiz/attempt/submit`, {
        attemptId,
        answers,
        isAutoSubmit: auto,
        reason
      });

      setResults(response.data.results);
      setQuizSubmitted(true);
      toast.success('Assessment data synchronized');
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      toast.error('Submission Failure: Check your connection');
      setSubmitting(false);
    }
  };

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);
  };

  // Keep submit ref in sync — must be after handleSubmitQuiz declaration
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { handleSubmitRef.current = handleSubmitQuiz; });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 200 } }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white select-none">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Loading Quiz Content...</p>
        </motion.div>
      </div>
    );
  }

  // Show blocked screen if quiz access is denied due to violations
  if (isBlocked) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-red-50 via-white to-pink-50 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 w-32 h-32 bg-red-600 rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative w-32 h-32 bg-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/30">
                <ShieldAlert className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
          
          <div>
            <h1 className="text-3xl font-black text-red-600 mb-2">⚠️ Quiz Access Blocked</h1>
            <p className="text-slate-600 font-bold text-base leading-relaxed">
              Your attempt to complete this quiz was terminated due to security violations. The quiz has been permanently blocked.
            </p>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-left space-y-2">
            <p className="font-black text-sm text-red-600 uppercase tracking-wide">❌ Reason for Block:</p>
            <p className="text-slate-700 font-bold">"{lastViolation || 'Multiple security violations detected during attempt.'}"</p>
            <p className="text-sm text-slate-600 mt-3 font-semibold">Logged violation details:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-500 ml-2 font-bold">
              <li>Loss of window focus / tab switching</li>
              <li>Developer tools shortcuts (F12, Ctrl+U, etc.)</li>
              <li>Split-screen / window resizing attempts</li>
              <li>Strikes limit exceeded (3 strikes issued)</li>
            </ul>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-left">
            <p className="font-black text-sm text-blue-600 uppercase tracking-wide mb-2">📞 What To Do:</p>
            <p className="text-slate-700 font-bold text-sm">Contact your instructor to:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 mt-2 ml-2 font-semibold">
              <li>Review your proctoring logs</li>
              <li>Request quiz unblocking</li>
            </ul>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => navigate('/')}
              className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95"
            >
              Return to Base
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (quizSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 select-none">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-md w-full">
          <Card className="shadow-2xl shadow-teal-100/50 border-teal-50 bg-white rounded-[2.5rem] overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-teal-500" />
            <CardHeader className="text-center p-10">
              <div className="w-20 h-20 rounded-[2rem] bg-teal-50 flex items-center justify-center mx-auto mb-6 border-2 border-teal-100 shadow-sm">
                <CheckCircle2 className="h-10 w-10 text-teal-600" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tight text-slate-900 uppercase">Exam Submitted</CardTitle>
              <CardDescription className="font-bold text-xs uppercase tracking-widest text-slate-400 leading-relaxed mt-2">
                Your responses have been successfully saved.
                <br />Identity verification complete.
              </CardDescription>
            </CardHeader>
            {results && (
              <CardContent className="p-10 pt-0">
                <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 space-y-4 mb-8">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Score</p>
                      <h3 className="text-4xl font-black tracking-tight text-slate-900">{results.percentage}%</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Points Scored</p>
                      <p className="text-xl font-black text-indigo-600">{results.totalMarks} / {results.maxMarks}</p>
                    </div>
                  </div>
                  <Progress value={results.percentage} className="h-2" />
                </div>

                <div className="space-y-6">
                  {results.detailedResults?.map((item: any, index: number) => (
                    <div key={index} className="bg-white rounded-[2rem] border border-slate-100 p-8 hover:border-indigo-100 transition-colors shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-indigo-600" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question {index + 1}</h4>
                      </div>
                      <div className="text-base font-bold leading-relaxed text-slate-900">
                        <FormattedText text={item.question} />
                      </div>
                      <div className="mt-6 p-6 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-4">
                        <div className="flex items-center gap-3 text-xs font-bold">
                          <span className="text-slate-400 uppercase tracking-widest text-[8px]">Your Choice:</span>
                          <span className={cn("normal-case font-black", item.isCorrect ? "text-teal-600" : "text-red-500")}>{item.studentAnswer || '[NOT ANSWERED]'}</span>
                          {item.isCorrect ? <CheckCircle2 className="w-4 h-4 text-teal-600 ml-auto" /> : <AlertCircle className="w-4 h-4 text-red-500 ml-auto" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold">
                          <span className="text-slate-400 uppercase tracking-widest text-[8px]">Correct Answer:</span>
                          <span className="text-indigo-600 normal-case font-black">{item.correctAnswer}</span>
                        </div>
                        {item.explanation && (
                          <div className="mt-3 pt-3 border-t border-border flex gap-3">
                            <Target className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed text-muted-foreground italic">
                              <FormattedText text={item.explanation} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  if (showInfoForm && quiz) {
    const hasPrefetchedInfo = studentName && studentUSN && studentBranch && studentYear && studentSemester;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFDFF] p-6 overflow-hidden relative select-none">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-xl w-full relative z-10">
          <Card className="shadow-2xl shadow-indigo-100/50 border-slate-100 bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600" />
            <CardHeader className="p-10 pb-6">
              <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-4">
                <Shield className="w-4 h-4" /> Identity Verification
              </div>
              <CardTitle className="text-4xl font-black tracking-tight text-slate-900 uppercase">{quiz.title}</CardTitle>
              <CardDescription className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-2">
                {hasPrefetchedInfo && !isEditingDetails
                  ? "We found your student profile. Please confirm details below."
                  : "Please provide your details to begin the exam session."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-4 space-y-6">
              {/* iOS Safari Guidance Banner */}
              {!document.documentElement.requestFullscreen && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 text-left space-y-2 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> iOS Safari Notice
                  </div>
                  <p className="text-xs text-amber-700 font-bold leading-relaxed">
                    Fullscreen API is not natively supported in standard iOS Safari tabs. For the best proctored experience and to avoid accidental focus loss:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-amber-700 font-semibold space-y-1 ml-1">
                    <li>Tap the <span className="font-bold">Share button (up arrow in box)</span> in Safari</li>
                    <li>Select <span className="font-bold">"Add to Home Screen"</span> and launch from your home screen</li>
                    <li>Otherwise, ensure all notifications/focus modes are disabled before starting</li>
                  </ul>
                </div>
              )}

              {hasPrefetchedInfo && !isEditingDetails ? (
                // Premium Summary Card for pre-fetched info
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50 to-indigo-50/30 rounded-3xl border border-indigo-100/60 p-6 sm:p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
                      <BadgeCheck className="w-6 h-6 text-teal-600" />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Student Name</span>
                      <p className="text-xl font-bold text-slate-900 leading-snug">{studentName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">USN Number</span>
                        <p className="text-sm font-bold text-slate-800 tracking-wide">{studentUSN}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Department</span>
                        <p className="text-sm font-bold text-slate-800">{studentBranch} Department</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100/80">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Current Year</span>
                        <p className="text-sm font-bold text-slate-800">Year {studentYear}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Semester</span>
                        <p className="text-sm font-bold text-slate-800">Semester {studentSemester}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Wrong profile?</span>
                    <button 
                      onClick={() => setIsEditingDetails(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-widest"
                    >
                      Edit Details
                    </button>
                  </div>
                </div>
              ) : (
                // Original editable form fields
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Full Legal Name</Label>
                    <Input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="E.g. John Doe"
                      className="h-12 bg-slate-50 border-slate-100 font-bold uppercase text-xs tracking-wider rounded-xl focus:ring-indigo-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">USN Number</Label>
                      <Input
                        value={studentUSN}
                        onChange={(e) => setStudentUSN(e.target.value.toUpperCase())}
                        placeholder="1XX21CS001"
                        className="h-12 bg-slate-50 border-slate-100 font-bold uppercase text-xs tracking-wider rounded-xl focus:ring-indigo-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Email Address</Label>
                      <Input
                        value={email}
                        disabled
                        className="h-12 bg-slate-100 border-slate-200 font-bold text-xs tracking-wider opacity-60 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Department</Label>
                    <Select value={studentBranch} onValueChange={setStudentBranch}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-100 font-bold uppercase text-[10px] tracking-widest rounded-xl">
                        <SelectValue placeholder="Select Your Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {['CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CE'].map(branch => (
                          <SelectItem key={branch} value={branch} className="font-bold uppercase text-[10px]">{branch} Department</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">YEAR</Label>
                      <Select value={studentYear} onValueChange={setStudentYear}>
                        <SelectTrigger className="h-12 bg-muted/20 border-sidebar-border/50 font-bold uppercase text-[10px] tracking-widest px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['1', '2', '3', '4'].map(y => (
                            <SelectItem key={y} value={y} className="font-bold uppercase text-[10px]">YEAR {y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">SEM</Label>
                      <Select value={studentSemester} onValueChange={setStudentSemester}>
                        <SelectTrigger className="h-12 bg-muted/20 border-sidebar-border/50 font-bold uppercase text-[10px] tracking-widest px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                            <SelectItem key={s} value={s.toString()} className="font-bold uppercase text-[10px]">SEM {s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">SECTION</Label>
                      <Input
                        value={studentSection}
                        onChange={(e) => setStudentSection(e.target.value.toUpperCase())}
                        placeholder="A, B..."
                        className="h-12 bg-muted/20 border-sidebar-border/50 font-bold uppercase text-xs tracking-wider rounded-xl text-center px-1"
                      />
                    </div>
                  </div>

                  {hasPrefetchedInfo && (
                    <div className="flex justify-end px-2">
                      <button 
                        onClick={() => setIsEditingDetails(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 font-bold uppercase tracking-widest"
                      >
                        Cancel Editing
                      </button>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleStartQuiz}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 font-black uppercase tracking-widest text-sm group mt-4 rounded-2xl transition-all active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <Activity className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">Start Exam <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (quizStarted && quiz?.questions) {
    const question = quiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

    return (
      <div
        className="min-h-screen bg-white relative overflow-hidden flex flex-col select-none"
        style={{
          filter: blurIntensity > 0 ? `blur(${blurIntensity}px) grayscale(${Math.min(blurIntensity * 3, 80)}%)` : 'none',
          transition: 'filter 0.3s ease-in-out',
          pointerEvents: 'auto',
        }}
        onClick={() => { if (blurIntensity > 0) { setBlurIntensity(0); setIsOutsideApp(false); } }}
      >
        <style>{`
          * { -webkit-user-select: none; user-select: none; }
          @media print { body { display: none !important; } }
        `}</style>

        {/* 🚨 Security Overlay — blur countdown (same as native app) */}
        {isOutsideApp && (
          <div
            className="fixed inset-0 z-[100] bg-gradient-to-br from-black/95 via-red-900/90 to-black/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300"
            onClick={(e) => { e.stopPropagation(); if (document.hasFocus()) { setIsOutsideApp(false); setBlurIntensity(0); } }}
          >
            <div className="mb-6 relative">
              <div className="absolute inset-0 w-20 h-20 sm:w-24 sm:h-24 bg-red-600 rounded-full blur-2xl opacity-50 animate-pulse" />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-red-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2 uppercase">⚠️ SECURITY VIOLATION</h2>
            <p className="text-red-200 font-bold text-sm mb-8 max-w-xs leading-relaxed">
              FOCUS LOSS DETECTED<br />
              <span className="text-white/70 text-xs">Return immediately or session will terminate</span>
            </p>
            <div className="text-6xl sm:text-8xl font-black text-white tabular-nums tracking-tighter drop-shadow-2xl font-mono mb-3">
              {remainingEscapeTime}s
            </div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-8">Time Remaining</p>
            <button
              className="px-8 py-3 bg-white/10 border border-white/20 rounded-2xl text-white font-bold text-sm uppercase tracking-widest hover:bg-white/20 active:scale-95 transition-all"
              onClick={(e) => { e.stopPropagation(); setIsOutsideApp(false); setBlurIntensity(0); }}
            >
              Tap to Return to Exam
            </button>
            <div className="flex gap-2 mt-8">
              {[1, 2, 3].map(i => (
                <div key={i} className={cn('w-2 h-2 rounded-full transition-all', i <= warningCount ? 'bg-red-500 scale-125' : 'bg-white/30')} />
              ))}
            </div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-4">Strike {warningCount} of 3</p>
          </div>
        )}

        {/* Assessment Header */}
        <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-100 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-6">
            <div className="flex items-center justify-between gap-3 sm:gap-6 mb-3 sm:mb-8">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 border border-indigo-500 shrink-0">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase leading-none truncate max-w-[130px] sm:max-w-xs md:max-w-none">{quiz.title}</h1>
                  <div className="hidden sm:flex items-center gap-3 mt-1.5 font-bold uppercase text-[8px] tracking-[0.2em] text-slate-400 italic">
                    <Activity className="w-3 h-3 text-indigo-600 animate-pulse" />
                    Exam ID: {attemptId.slice(-8)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-8 bg-slate-50 px-3 sm:px-4 py-2 sm:py-4 rounded-2xl sm:rounded-[2rem] border border-slate-100 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Clock className={cn("h-4 w-4 sm:h-5 sm:w-5", timeLeft < 60 ? "text-red-600 animate-pulse font-black" : timeLeft < 300 ? "text-amber-500 font-bold animate-pulse" : "text-indigo-600")} />
                  <div className="flex flex-col">
                    <span className="hidden sm:block text-[8px] font-black uppercase tracking-widest text-slate-400">Time Left</span>
                    <span className={cn("text-base sm:text-xl font-black tabular-nums tracking-tight", timeLeft < 60 ? "text-red-600 animate-pulse font-black" : timeLeft < 300 ? "text-amber-500 font-bold" : "text-slate-900")}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                </div>
                <div className="h-6 sm:h-10 w-[1px] bg-slate-200" />
                <div className="flex items-center gap-2 sm:gap-3">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                  <div className="flex flex-col">
                    <span className="hidden sm:block text-[8px] font-black uppercase tracking-widest text-slate-400">Progress</span>
                    <span className="text-base sm:text-xl font-black tabular-nums tracking-tight text-slate-900">{currentQuestion + 1}<span className="text-slate-400 text-xs sm:text-base">/{quiz.questions.length}</span></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 italic">Progress</span>
                <span className="text-[10px] font-black tabular-nums uppercase tracking-widest text-slate-400">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1 sm:h-1.5 bg-slate-100" />
            </div>
          </div>
        </header>

        {/* Content Console - Scrollable Question List - Linear View */}
        <main className="flex-1 overflow-y-auto scroll-smooth w-full touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 relative group/console">
            <div className="space-y-8 sm:space-y-12 pb-24">
            {quiz.questions.map((question, qIdx) => qIdx === currentQuestion && (
              <motion.div
                key={question.id}
                id={`question-${qIdx}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <Card className={cn(
                  "shadow-xl shadow-slate-200/50 border-slate-100 bg-white rounded-3xl sm:rounded-[2.5rem] overflow-hidden min-h-[300px] sm:min-h-[400px] flex flex-col transition-all duration-500",
                  currentQuestion === qIdx ? "ring-4 ring-indigo-50 border-indigo-200" : ""
                )}>
                  <CardHeader className="p-6 sm:p-10 border-b border-slate-50 bg-[#FBFDFF] relative">
                    <div className="flex gap-3 sm:gap-6">
                      <div className="text-2xl sm:text-4xl font-black text-slate-100 italic tracking-tighter shrink-0">Q{(qIdx + 1).toString().padStart(2, '0')}</div>
                      <div className="space-y-3 sm:space-y-4 pt-1 flex-1">
                        <div className="text-base sm:text-xl md:text-2xl font-bold tracking-tight leading-relaxed text-slate-900">
                          <FormattedText text={question.question} isQuestion={true} imageUrl={question.imageUrl} />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-10 flex-1 flex flex-col justify-center">
                    {question.type === 'mcq' && question.options ? (
                      <RadioGroup
                        value={answers[qIdx]}
                        onValueChange={(val) => {
                          const newAns = [...answers];
                          newAns[qIdx] = val;
                          setAnswers(newAns);
                          setCurrentQuestion(qIdx);
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
                      >
                        {question.options.map((option, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              const newAns = [...answers];
                              newAns[qIdx] = String.fromCharCode(65 + index);
                              setAnswers(newAns);
                              setCurrentQuestion(qIdx);
                            }}
                            className={cn(
                              "flex items-center space-x-3 sm:space-x-4 p-4 sm:p-6 border-2 rounded-2xl sm:rounded-[1.75rem] cursor-pointer transition-all duration-300 group/option relative overflow-hidden active:scale-[0.98]",
                              answers[qIdx] === String.fromCharCode(65 + index)
                                ? "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50"
                                : "border-slate-50 bg-[#FBFDFF] hover:border-slate-100 hover:bg-white"
                            )}
                          >
                            <div className={cn(
                              "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border-2 flex items-center justify-center font-black text-xs transition-all shrink-0",
                              answers[qIdx] === String.fromCharCode(65 + index)
                                ? "bg-indigo-600 border-indigo-600 text-white scale-110"
                                : "bg-white border-slate-100 text-slate-300"
                            )}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <Label className="text-xs sm:text-sm font-bold cursor-pointer flex-1 group-hover/option:text-primary transition-colors whitespace-pre-wrap normal-case">
                              {cleanAcademicText(option)}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-4">
                        <Textarea
                          value={answers[qIdx]}
                          onChange={(e) => {
                            const newAns = [...answers];
                            newAns[qIdx] = e.target.value;
                            setAnswers(newAns);
                            setCurrentQuestion(qIdx);
                          }}
                          placeholder="Type your detailed answer here..."
                          className="min-h-[240px] bg-slate-50 border-slate-100 focus:bg-white focus:ring-8 focus:ring-indigo-50/50 font-bold text-base resize-none p-8 leading-relaxed rounded-[2rem] shadow-inner transition-all"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Core Navigation Controls */}
          <div className="flex items-center justify-between gap-3 sm:gap-6 mt-8 sm:mt-12">
            <div className="flex gap-2 sm:gap-4">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="h-12 sm:h-14 px-4 sm:px-8 font-bold uppercase tracking-widest text-[10px] rounded-xl sm:rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95 text-slate-400"
                >
                  PREV
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentQuestion(Math.min(quiz.questions.length - 1, currentQuestion + 1))}
                  disabled={currentQuestion === quiz.questions.length - 1}
                  className="h-12 sm:h-14 px-4 sm:px-8 font-bold uppercase tracking-widest text-[10px] rounded-xl sm:rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95 text-slate-400"
                >
                  NEXT
                </Button>
            </div>

            <div className="hidden sm:flex h-14 bg-slate-50 px-8 rounded-2xl border border-slate-100 items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">SESSION BAR</span>
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {quiz.questions.slice(Math.max(0, currentQuestion - 4), Math.min(quiz.questions.length, currentQuestion + 6)).map((_, idx) => {
                  const realIdx = quiz.questions?.indexOf(_) || 0;
                  return (
                    <div
                      key={realIdx}
                      className={cn(
                        "w-1.5 h-6 rounded-full transition-all duration-500",
                        currentQuestion === realIdx ? "h-10 bg-indigo-600 shadow-md shadow-indigo-100" : answers[realIdx] ? "bg-teal-500/40" : "bg-slate-200"
                      )}
                    />
                  );
                })}
              </div>
            </div>

            {/* Mobile question counter */}
            <div className="sm:hidden text-sm font-black text-slate-400">
              {currentQuestion + 1}/{quiz.questions.length}
            </div>

            <Button
              onClick={() => handleSubmitQuiz()}
              disabled={submitting}
              className={cn(
                "h-12 sm:h-14 px-6 sm:px-12 font-black uppercase tracking-widest text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all active:scale-95 group",
                currentQuestion === quiz.questions.length - 1 ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100" : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100"
              )}
            >
              {submitting ? (
                <Activity className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {currentQuestion === quiz.questions.length - 1 ? 'SUBMIT PAPER' : 'NOT READY'} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </div>

          {/* Enforcement of Linear Flow: Navigator Removed */}
          </div>
        </main>

        <footer className="mt-auto border-t border-slate-100 py-10 px-6">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 opacity-20">
            <div className="text-[8px] font-black uppercase tracking-[0.3em] flex gap-6">
              <span>SYNC_STABLE</span>
              <span>BUFFER_READY</span>
              <span>ENCRYPTED_SESSION</span>
            </div>
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em]">
              SMARTQUIZ STUDENT PORTAL <Shield className="w-2.5 h-2.5" />
            </div>
          </div>
        </footer>

        {/* Security Alert Modal */}
        <Dialog open={showWarningModal} onOpenChange={(o) => { if (!o) { isSecurityPaused.current = false; setShowWarningModal(false); setBlurIntensity(0); } }}>
          <DialogContent className="rounded-3xl p-8 max-w-sm w-[90vw] border-none shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-5">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto border-2 border-red-100 shadow-lg">
                <ShieldAlert className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-red-600 tracking-tight mb-1">⚠️ Security Violation</h2>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Strike {warningCount} of 3</p>
              </div>
              <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 text-left">
                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">Reason:</p>
                <p className="text-red-700 font-bold text-sm">"{lastViolation}"</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm text-slate-600 font-medium leading-relaxed">
                Two more violations will auto-submit and permanently block your attempt.
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strikes</p>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={cn('h-2 flex-1 rounded-full transition-all', i <= warningCount ? 'bg-red-500' : 'bg-slate-200')} />
                  ))}
                </div>
              </div>
              <Button
                onClick={() => { isSecurityPaused.current = false; setShowWarningModal(false); setBlurIntensity(0); }}
                className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-lg"
              >
                Understood — Resuming Exam
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-md w-full">
        <Card className="shadow-elevated border-destructive/20 glass-effect bg-card/40 backdrop-blur-2xl">
          <CardHeader className="text-center p-10">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-destructive/20">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tighter uppercase italic">Coordinate Invalid</CardTitle>
            <CardDescription className="font-bold text-xs uppercase tracking-widest opacity-60 mt-2">
              The requested assessment resource is either expired or missing from the repository.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-0">
            <Button variant="outline" onClick={() => navigate('/')} className="w-full h-12 border-sidebar-border font-black uppercase text-[10px] tracking-widest">RETURN TO BASE</Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
