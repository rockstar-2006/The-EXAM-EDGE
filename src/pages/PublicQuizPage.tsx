import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Shield,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Send,
  Lock,
  User,
  GraduationCap,
  Award,
  Layers,
  Maximize2,
  AlertCircle,
  RefreshCw,
  Loader2,
  BookOpen,
  FileCheck2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AcademicTextRenderer } from '@/components/AcademicTextRenderer';
import { publicQuizAPI } from '@/services/api';

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  imageUrl?: string;
  marks?: number;
}

interface RegistrationConfig {
  requireName?: boolean;
  nameLabel?: string;
  requireRollNo?: boolean;
  rollNoLabel?: string;
  requireAcademicLevel?: boolean;
  academicLevelLabel?: string;
  academicLevels?: string[];
  requireSection?: boolean;
  sectionLabel?: string;
  requireBranch?: boolean;
  branchLabel?: string;
  requireEmail?: boolean;
  requirePhone?: boolean;
  allowInstantResults?: boolean;
}

export default function PublicQuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  // Phase: 'loading' | 'register' | 'rules' | 'active' | 'completed' | 'blocked' | 'error'
  const [phase, setPhase] = useState<'loading' | 'register' | 'rules' | 'active' | 'completed' | 'blocked' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Quiz Metadata
  const [quizInfo, setQuizInfo] = useState<any>(null);
  const [regConfig, setRegConfig] = useState<RegistrationConfig>({});

  // Student Registration Form State
  const [studentName, setStudentName] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [academicLevel, setAcademicLevel] = useState('');
  const [studentBranch, setStudentBranch] = useState('');
  const [studentSection, setStudentSection] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Active Assessment State
  const [attemptId, setAttemptId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  // Security & Proctoring State
  const [warningCount, setWarningCount] = useState(0);
  const [lastViolationReason, setLastViolationReason] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isOutsideApp, setIsOutsideApp] = useState(false);
  const [remainingEscapeTime, setRemainingEscapeTime] = useState(30);

  // Proctoring Refs
  const lastViolationTime = useRef(0);
  const isSecurityPaused = useRef(false);
  const isTransitioning = useRef(false);
  const escapeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningCountRef = useRef(0);
  const isOutsideAppRef = useRef(false);
  const answersRef = useRef<string[]>([]);
  const attemptIdRef = useRef('');

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  useEffect(() => {
    isOutsideAppRef.current = isOutsideApp;
  }, [isOutsideApp]);

  // 1. Initial Load: Fetch Quiz Info & Registration Config
  useEffect(() => {
    if (!quizId) {
      setErrorMessage('Invalid assessment link. No quiz ID provided.');
      setPhase('error');
      return;
    }

    const loadQuiz = async () => {
      try {
        const res = await publicQuizAPI.getQuizInfo(quizId);
        if (res.data?.success) {
          setQuizInfo(res.data.quiz);
          setRegConfig(res.data.registrationConfig || {});
          
          const levels = res.data.registrationConfig?.academicLevels || [];
          if (levels.length > 0) {
            setAcademicLevel(levels[0]);
          }
          setPhase('register');
        } else {
          setErrorMessage(res.data?.message || 'Assessment not found or closed.');
          setPhase('error');
        }
      } catch (err: any) {
        console.error('Public quiz load error:', err);
        setErrorMessage(err.response?.data?.message || 'Unable to connect to the examination portal.');
        setPhase('error');
      }
    };

    loadQuiz();
  }, [quizId]);

  // 2. Escape Buffer Countdown (Grace period if window lost focus)
  useEffect(() => {
    if (phase !== 'active') return;

    if (isOutsideApp) {
      setRemainingEscapeTime(30);
      escapeTimerRef.current = setInterval(() => {
        setRemainingEscapeTime((prev) => {
          if (prev <= 1) {
            clearInterval(escapeTimerRef.current!);
            handleProctoringViolation('ESCAPE_BUFFER_EXCEEDED', 'Left examination window for more than 30 seconds');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (escapeTimerRef.current) {
        clearInterval(escapeTimerRef.current);
        escapeTimerRef.current = null;
      }
      setRemainingEscapeTime(30);
    }

    return () => {
      if (escapeTimerRef.current) clearInterval(escapeTimerRef.current);
    };
  }, [isOutsideApp, phase]);

  // 3. Security Violation Dispatcher
  const handleProctoringViolation = useCallback(async (type: string, reason: string) => {
    if (isSecurityPaused.current || isTransitioning.current) return;

    const now = Date.now();
    if (now - lastViolationTime.current < 2000) return; // Debounce rapid triggers
    lastViolationTime.current = now;

    const nextCount = warningCountRef.current + 1;
    warningCountRef.current = nextCount;
    setWarningCount(nextCount);
    setLastViolationReason(reason);

    try {
      if (attemptIdRef.current) {
        await publicQuizAPI.logViolation(attemptIdRef.current, type, reason);
      }
    } catch (e) {
      console.warn('Failed to report violation:', e);
    }

    if (nextCount >= 3) {
      // 3 strikes: Auto-terminate
      isSecurityPaused.current = true;
      toast.error('Maximum proctoring strikes reached. Submitting assessment...');
      handleAutoSubmitOnViolation('Max violations (3 strikes) reached: Tab switching / Exit');
    } else {
      isSecurityPaused.current = true;
      setShowWarningModal(true);
    }
  }, []);

  // 4. Auto-submit on 3 strikes
  const handleAutoSubmitOnViolation = async (reasonText: string) => {
    setIsSubmitting(true);
    try {
      if (attemptIdRef.current) {
        const res = await publicQuizAPI.submitQuiz(attemptIdRef.current, answersRef.current, true, reasonText);
        setSubmissionResult(res.data?.result || null);
      }
      setPhase('blocked');
    } catch (err: any) {
      setPhase('blocked');
    } finally {
      setIsSubmitting(false);
      exitFullscreenSafely();
    }
  };

  // 5. Lockdown Event Listeners
  useEffect(() => {
    if (phase !== 'active') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsOutsideApp(true);
        handleProctoringViolation('TAB_SWITCH', 'Switched browser tab or minimized window');
      } else {
        setIsOutsideApp(false);
      }
    };

    const handleWindowBlur = () => {
      setIsOutsideApp(true);
      handleProctoringViolation('WINDOW_BLUR', 'Clicked outside the examination window');
    };

    const handleWindowFocus = () => {
      setIsOutsideApp(false);
    };

    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (!isFull && !isSecurityPaused.current && !isTransitioning.current) {
        handleProctoringViolation('FULLSCREEN_EXIT', 'Exited fullscreen examination mode');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.altKey && e.key === 'Tab') || (e.ctrlKey && ['c', 'v', 'u', 'p', 's'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        toast.warning('Keyboard shortcut disabled during examination');
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [phase, handleProctoringViolation]);

  // 6. Exam Countdown Timer & Auto-Save
  useEffect(() => {
    if (phase !== 'active' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.info('Time expired! Submitting your examination...');
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  // Auto-save answers every 5 seconds
  useEffect(() => {
    if (phase !== 'active' || !attemptId) return;

    const autoSaveTimer = setInterval(async () => {
      try {
        if (attemptIdRef.current && answersRef.current.length > 0) {
          await publicQuizAPI.saveProgress(attemptIdRef.current, answersRef.current);
        }
      } catch (err) {
        // silent sync
      }
    }, 5000);

    return () => clearInterval(autoSaveTimer);
  }, [phase, attemptId]);

  // Helper: Request Fullscreen
  const enterFullscreenSafely = async () => {
    try {
      const doc = document.documentElement as any;
      if (doc.requestFullscreen) {
        await doc.requestFullscreen();
      } else if (doc.webkitRequestFullscreen) {
        await doc.webkitRequestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request bypassed or blocked by browser policy:', e);
    }
  };

  const exitFullscreenSafely = () => {
    try {
      const doc = document as any;
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  // Step 1: Proceed from Registration form to Rules
  const handleProceedToRules = (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (regConfig.requireRollNo !== false && !studentRollNo.trim()) {
      toast.error(`Please enter your ${regConfig.rollNoLabel || 'Roll Number / USN'}`);
      return;
    }
    if (regConfig.requireAcademicLevel !== false && !academicLevel.trim()) {
      toast.error('Please select your class or academic level');
      return;
    }

    setPhase('rules');
  };

  // Step 2: Start Exam & Enter Fullscreen Lockdown
  const handleStartExam = async () => {
    if (!agreedToTerms) {
      toast.error('You must agree to the examination rules to proceed');
      return;
    }

    setIsStarting(true);
    isTransitioning.current = true;

    try {
      await enterFullscreenSafely();

      const regData = {
        studentName: studentName.trim(),
        studentRollNo: studentRollNo.trim().toUpperCase(),
        academicLevel: academicLevel.trim(),
        studentBranch: studentBranch.trim(),
        studentSection: studentSection.trim().toUpperCase(),
        studentEmail: studentEmail.trim()
      };

      const res = await publicQuizAPI.startAttempt(quizId!, regData);

      if (res.data?.success) {
        const receivedQuestions: Question[] = res.data.questions || [];
        setAttemptId(res.data.attemptId);
        setQuestions(receivedQuestions);
        setAnswers(new Array(receivedQuestions.length).fill(''));
        setTimeLeft((res.data.duration || quizInfo?.duration || 30) * 60);

        setPhase('active');
        toast.success('Examination active. Good luck!');
      } else {
        toast.error(res.data?.message || 'Could not start assessment');
        setPhase('register');
      }
    } catch (err: any) {
      console.error('Failed to start quiz attempt:', err);
      toast.error(err.response?.data?.message || 'Server error starting assessment');
      setPhase('register');
    } finally {
      setIsStarting(false);
      setTimeout(() => {
        isTransitioning.current = false;
      }, 1000);
    }
  };

  // Select answer
  const handleSelectAnswer = (option: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIdx] = option;
      return next;
    });
  };

  // Submit assessment
  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (attemptIdRef.current) {
        const res = await publicQuizAPI.submitQuiz(attemptIdRef.current, answersRef.current, false, 'Student Normal Submission');
        setSubmissionResult(res.data?.result || null);
      }
      setPhase('completed');
      toast.success('Assessment submitted successfully!');
    } catch (err: any) {
      console.error('Submission error:', err);
      toast.error('Failed to submit, but progress was saved. Contact instructor.');
      setPhase('completed');
    } finally {
      setIsSubmitting(false);
      exitFullscreenSafely();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = answers.filter((a) => a && a.trim() !== '').length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const currentQ = questions[currentIdx];
  const levels = regConfig.academicLevels || [
    'High School (8th - 10th)',
    '1st PUC / 11th Grade',
    '2nd PUC / 12th Grade',
    'Diploma',
    'Undergraduate (B.Tech / B.Sc / B.Com)',
    'Postgraduate / Masters',
    'Other'
  ];

  // ==========================================
  // RENDER: Loading or Error
  // ==========================================
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center mb-4 animate-pulse shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <p className="text-sm font-bold text-slate-800 uppercase tracking-widest">Loading Examination Portal...</p>
        <p className="text-xs text-slate-500 mt-1">Please wait while the assessment is prepared.</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="bg-white border-slate-200 text-slate-900 shadow-xl max-w-md w-full rounded-3xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Exam Portal Notice</h2>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            {errorMessage || 'This examination link is invalid or closed by the instructor.'}
          </p>
          <Button onClick={() => window.location.reload()} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // ==========================================
  // RENDER: Phase 4 — Completed or Blocked
  // ==========================================
  if (phase === 'completed' || phase === 'blocked') {
    const isPass = submissionResult ? submissionResult.isPassed : false;
    const hasDetailedScore = submissionResult && submissionResult.score !== undefined && regConfig.allowInstantResults !== false;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <Card className="bg-white border-slate-200 shadow-2xl rounded-3xl overflow-hidden text-slate-900 p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className={cn(
                "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border shadow-sm",
                phase === 'blocked'
                  ? "bg-rose-50 text-rose-600 border-rose-200"
                  : isPass
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-indigo-50 text-indigo-600 border-indigo-200"
              )}>
                {phase === 'blocked' ? (
                  <ShieldAlert className="w-10 h-10" />
                ) : (
                  <CheckCircle2 className="w-10 h-10" />
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                {phase === 'blocked' ? 'Exam Terminated' : 'Exam Submitted Successfully!'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {phase === 'blocked'
                  ? lastViolationReason || 'Session terminated due to proctoring policy strikes.'
                  : `Your answers for "${quizInfo?.title}" have been recorded.`}
              </p>
            </div>

            {/* Candidate Summary Pill */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900 text-sm">{studentName}</p>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                  {studentRollNo ? `Roll No: ${studentRollNo}` : ''} {academicLevel ? `• ${academicLevel}` : ''}
                </p>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-[10px]">
                {studentSection ? `Sec ${studentSection}` : 'Submitted'}
              </Badge>
            </div>

            {/* Score Display (If faculty enabled instant results) */}
            {hasDetailedScore && phase !== 'blocked' && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 text-center space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Your Exam Score</p>
                <div className="text-4xl font-black text-indigo-950">
                  {submissionResult.score} <span className="text-lg text-slate-500 font-normal">/ {submissionResult.maxMarks}</span>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Badge className={cn("text-xs font-bold px-3 py-0.5", isPass ? "bg-emerald-600 text-white" : "bg-amber-600 text-white")}>
                    {submissionResult.percentage}% • {isPass ? 'PASSED' : 'COMPLETED'}
                  </Badge>
                </div>
              </div>
            )}

            {!hasDetailedScore && phase !== 'blocked' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <FileCheck2 className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  Detailed evaluation and answers will be published by your instructor.
                </p>
              </div>
            )}

            <Button
              onClick={() => window.close()}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs"
            >
              Close Window
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Phase 2 — Pre-Exam Proctoring Rules & Fullscreen Agreement
  // ==========================================
  if (phase === 'rules') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full"
        >
          <Card className="bg-white border-slate-200 text-slate-900 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Exam Instructions & Rules</h2>
                <p className="text-xs text-slate-500 font-medium">{quizInfo?.title}</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Maximize2 className="w-4 h-4 text-indigo-600" /> Fullscreen Mode Required
              </p>
              <ul className="space-y-2 list-disc list-inside text-slate-600 pl-1 font-medium">
                <li>This exam must be taken in <strong>Fullscreen Mode</strong> without leaving the screen.</li>
                <li><strong>Do not switch tabs, minimize, or open other windows</strong> — doing so triggers a warning.</li>
                <li>You are allowed up to <strong>3 strikes</strong> before the exam auto-submits.</li>
                <li><strong>Copying and right-clicking</strong> are disabled.</li>
                <li>Your answers are <strong>automatically saved</strong> as you select them.</li>
              </ul>
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-indigo-950">{studentName}</p>
                <p className="text-xs text-indigo-700 font-mono mt-0.5">
                  {studentRollNo ? `Roll No: ${studentRollNo} • ` : ''}{academicLevel}
                </p>
              </div>
              <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                {quizInfo?.duration} Mins Duration
              </Badge>
            </div>

            <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
              <span className="text-xs text-slate-700 font-semibold select-none">
                I agree to follow the examination rules and keep the window in full screen.
              </span>
            </label>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPhase('register')}
                className="h-12 px-5 border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl"
              >
                Back
              </Button>
              <Button
                disabled={!agreedToTerms || isStarting}
                onClick={handleStartExam}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md gap-2"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Launching Fullscreen Exam...</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    <span>Start Exam in Fullscreen</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Phase 1 — Student Registration
  // ==========================================
  if (phase === 'register') {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full space-y-5"
        >
          {/* Header Card matching website theme */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md text-slate-900 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" />
              Online College Assessment
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {quizInfo?.title}
              </h1>
              {quizInfo?.description && (
                <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed font-medium">
                  {quizInfo.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 px-3 py-1 font-bold text-xs gap-1.5 shadow-xs">
                <Clock className="w-3.5 h-3.5" />
                {quizInfo?.duration} Minutes Duration
              </Badge>
              <Badge className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1 font-bold text-xs gap-1.5 shadow-xs">
                <BookOpen className="w-3.5 h-3.5" />
                {quizInfo?.numQuestions} Questions
              </Badge>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 font-bold text-xs gap-1.5 shadow-xs">
                <Award className="w-3.5 h-3.5" />
                {quizInfo?.totalMarks} Marks
              </Badge>
            </div>
          </div>

          {/* Registration Form Card */}
          <Card className="bg-white border-slate-200 text-slate-900 rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8">
            <form onSubmit={handleProceedToRules} className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-black text-slate-900">Student Details</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Please enter your details before starting the examination.
                </p>
              </div>

              {/* Student Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>{regConfig.nameLabel || 'Full Name'}</span>
                  <span className="text-rose-500 text-[10px] font-bold">* Required</span>
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <Input
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter your first and last name"
                    className="pl-10 h-12 bg-white border-slate-300 text-slate-900 rounded-xl font-medium focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Roll No / USN / Reg No */}
              {regConfig.requireRollNo !== false && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>{regConfig.rollNoLabel || 'Roll Number / USN'}</span>
                    <span className="text-rose-500 text-[10px] font-bold">* Required</span>
                  </Label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <Input
                      required
                      value={studentRollNo}
                      onChange={(e) => setStudentRollNo(e.target.value.toUpperCase())}
                      placeholder="e.g. 4SO21CS001 or ROLL-24"
                      className="pl-10 h-12 bg-white border-slate-300 text-slate-900 rounded-xl font-mono font-bold tracking-wider focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Academic Level (High School, PUC 1/2, Degree, etc.) */}
              {regConfig.requireAcademicLevel !== false && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>{regConfig.academicLevelLabel || 'Class / Academic Level'}</span>
                    <span className="text-rose-500 text-[10px] font-bold">* Required</span>
                  </Label>
                  <Select value={academicLevel} onValueChange={setAcademicLevel}>
                    <SelectTrigger className="h-12 bg-white border-slate-300 text-slate-900 rounded-xl font-medium">
                      <SelectValue placeholder="Select class / year" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      {levels.map((lvl) => (
                        <SelectItem key={lvl} value={lvl} className="font-medium text-xs focus:bg-indigo-50 focus:text-indigo-900">
                          {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Branch / Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {regConfig.requireBranch && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {regConfig.branchLabel || 'Department / Branch'}
                    </Label>
                    <Input
                      value={studentBranch}
                      onChange={(e) => setStudentBranch(e.target.value)}
                      placeholder="e.g. Science / PCMB / CS"
                      className="h-12 bg-white border-slate-300 text-slate-900 rounded-xl font-medium"
                    />
                  </div>
                )}

                {regConfig.requireSection && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {regConfig.sectionLabel || 'Section / Division'}
                    </Label>
                    <Input
                      value={studentSection}
                      onChange={(e) => setStudentSection(e.target.value.toUpperCase())}
                      placeholder="e.g. Section A"
                      className="h-12 bg-white border-slate-300 text-slate-900 rounded-xl font-medium uppercase font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Email */}
              {regConfig.requireEmail && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="h-12 bg-white border-slate-300 text-slate-900 rounded-xl font-medium"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/25 active:scale-[0.99] transition-all gap-2"
              >
                <span>Continue to Exam Rules</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Phase 3 — Active Lockdown Examination (Clean Theme)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col select-none text-slate-900">

      {/* ⚠️ Grace Period Buffer Banner (If student navigated away) */}
      <AnimatePresence>
        {isOutsideApp && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-rose-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-lg z-50"
          >
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            <span>
              WARNING: You left the exam window! Return immediately. Auto-terminate in: {remainingEscapeTime}s
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean Top Navigation Bar matching Website Theme */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 truncate max-w-[220px] sm:max-w-md">
              {quizInfo?.title}
            </h1>
            <p className="text-[11px] text-slate-500 font-mono font-medium truncate max-w-[220px] sm:max-w-md">
              {studentName} {studentRollNo ? `• ${studentRollNo}` : ''}
            </p>
          </div>
        </div>

        {/* Status Indicators & Clock */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Proctoring Active</span>
          </div>

          {warningCount > 0 && (
            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Strike {warningCount}/3
            </Badge>
          )}

          {/* Time Remaining Pill */}
          <div className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm shadow-xs",
            timeLeft < 300
              ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
              : "bg-indigo-50 border-indigo-200 text-indigo-700"
          )}>
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      {/* Progress Line */}
      <Progress value={progressPercent} className="h-1 bg-slate-200 rounded-none" />

      {/* Main Examination Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {currentQ ? (
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Question Counter & Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-xs text-slate-500 font-bold">
                Answered: {answeredCount} / {questions.length}
              </span>
            </div>

            {/* Question Body Card - Crisp White Theme & 100% Readable Text */}
            <Card className="bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
              
              {/* Question Text - Big, Bold, Crisp Dark Slate */}
              <div className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
                <AcademicTextRenderer
                  content={currentQ.question || (currentQ as any).text || (currentQ.imageUrl ? 'Refer to the figure below to answer this question:' : `Question ${currentIdx + 1}`)}
                  isQuestion={true}
                  imageUrl={currentQ.imageUrl}
                  className="text-slate-900 font-bold"
                />
              </div>

              {/* MCQ Options */}
              {currentQ.options && currentQ.options.length > 0 && (
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((opt, optIdx) => {
                    const optLabel = String.fromCharCode(65 + optIdx); // A, B, C, D
                    const isSelected = answers[currentIdx] === opt;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectAnswer(opt)}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 group cursor-pointer",
                          isSelected
                            ? "bg-indigo-50/80 border-indigo-600 text-slate-900 shadow-sm"
                            : "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-800"
                        )}
                      >
                        <span className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 transition-colors",
                          isSelected
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-white border border-slate-300 text-slate-600 group-hover:border-slate-400"
                        )}>
                          {optLabel}
                        </span>
                        <span className="text-base font-medium mt-1 leading-relaxed text-slate-900">
                          <AcademicTextRenderer content={opt} className="text-slate-900 font-medium" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Short Answer Field (if question has no options) */}
              {(!currentQ.options || currentQ.options.length === 0) && (
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Type Your Answer</Label>
                  <Textarea
                    value={answers[currentIdx] || ''}
                    onChange={(e) => handleSelectAnswer(e.target.value)}
                    placeholder="Enter your response here..."
                    className="min-h-[120px] bg-white border-slate-300 text-slate-900 rounded-xl text-base font-medium focus:ring-indigo-500"
                  />
                </div>
              )}
            </Card>

            {/* Navigation Bar */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="h-12 px-6 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>

              <div className="flex items-center gap-2">
                {currentIdx < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentIdx(prev => prev + 1)}
                    className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-md"
                  >
                    <span>Next</span> <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    disabled={isSubmitting}
                    onClick={handleSubmitQuiz}
                    className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-md"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Submit Exam</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Question Jump Grid */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-2 justify-center">
                {questions.map((_, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isAnswered = answers[idx] && answers[idx].trim() !== '';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={cn(
                        "w-9 h-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer",
                        isCurrent
                          ? "ring-4 ring-indigo-200 bg-indigo-600 text-white font-black scale-105 shadow-sm"
                          : isAnswered
                            ? "bg-emerald-600 text-white font-bold shadow-xs"
                            : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : null}
      </main>

      {/* Footer Info */}
      <footer className="p-4 text-center text-[11px] text-slate-400 font-mono border-t border-slate-200 bg-white">
        Faculty Quest Proctored Examination • Fullscreen Active
      </footer>

      {/* ⚠️ Strike Warning Dialog */}
      <Dialog open={showWarningModal} onOpenChange={(open) => {
        if (!open) {
          setShowWarningModal(false);
          isSecurityPaused.current = false;
        }
      }}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 rounded-3xl p-6 sm:p-8 max-w-md shadow-2xl">
          <DialogHeader className="text-center space-y-3">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-black text-rose-600">
              Security Warning [Strike {warningCount}/3]
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-xs leading-relaxed font-medium">
              {lastViolationReason || 'You left the examination window or opened external software.'}
              <br /><br />
              <strong className="text-slate-900 block bg-slate-50 p-3 rounded-xl border border-slate-200">
                You have {3 - warningCount} strike(s) remaining. At 3 strikes, your examination will automatically submit.
              </strong>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              onClick={() => {
                setShowWarningModal(false);
                isSecurityPaused.current = false;
                const doc = document.documentElement as any;
                if (doc.requestFullscreen) doc.requestFullscreen().catch(() => {});
              }}
              className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs"
            >
              I Understand — Return to Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
