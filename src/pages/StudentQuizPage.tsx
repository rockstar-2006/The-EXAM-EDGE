import { useState, useEffect } from 'react';
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
import { Loader2, Clock, CheckCircle2, AlertCircle, Sparkles, Shield, ChevronRight, Activity, Target, Zap, Waves, BadgeCheck } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Question {
  id: string;
  type: 'mcq' | 'short-answer';
  question: string;
  options?: string[];
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  numQuestions?: number;
  questions?: Question[];
}

export default function StudentQuizPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [email, setEmail] = useState('');

  const [showInfoForm, setShowInfoForm] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentUSN, setStudentUSN] = useState('');
  const [studentBranch, setStudentBranch] = useState('');
  const [studentYear, setStudentYear] = useState('');
  const [studentSemester, setStudentSemester] = useState('');

  const [quizStarted, setQuizStarted] = useState(false);
  const [attemptId, setAttemptId] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    fetchQuizData();
  }, [token]);

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

  const fetchQuizData = async () => {
    try {
      const response = await axios.get(`${API_URL}/student-quiz/attempt/${token}`);
      const data = response.data;

      if (data.alreadySubmitted) {
        toast.info('Session Logged: Multiple attempts prohibited');
        setQuizSubmitted(true);
        setResults(data.existingResults || null);
        setLoading(false);
        return;
      }

      setQuiz(data.quiz);
      setEmail(data.email);

      if (data.hasStarted && data.attemptId) {
        setAttemptId(data.attemptId);
        setQuizStarted(true);
        setAnswers(new Array(data.quiz.questions.length).fill(''));
        setTimeLeft((data.quiz.duration || 30) * 60);
        setStudentName(data.studentInfo.name);
        setStudentUSN(data.studentInfo.usn);
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
      toast.error('Protocol Error: All identity parameters required');
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
      });

      setAttemptId(response.data.attemptId);
      setQuiz(response.data.quiz);
      setAnswers(new Array(response.data.quiz.questions.length).fill(''));
      setTimeLeft((response.data.quiz.duration || 30) * 60);
      setQuizStarted(true);
      setShowInfoForm(false);

      toast.success('Environment Locked: Assessment Initialized');
    } catch (error: any) {
      console.error('Error starting quiz:', error);
      toast.error(error.response?.data?.message || 'Initialization Failed: Environment unstable');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (submitting || quizSubmitted) return;

    setSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/student-quiz/attempt/submit`, {
        attemptId,
        answers,
      });

      setResults(response.data.results);
      setQuizSubmitted(true);
      toast.success('Encryption Complete: Session secured in database');
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      toast.error('Transmission Failure: Attempting local cache fallback');
      setSubmitting(false);
    }
  };

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);
  };

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
      <div className="min-h-screen flex items-center justify-center bg-background select-none">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Establishing Secure Tunnel...</p>
        </motion.div>
      </div>
    );
  }

  if (quizSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 select-none">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-md w-full">
          <Card className="shadow-elevated border-sidebar-border/50 glass-effect bg-card/40 backdrop-blur-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 opacity-50" />
            <CardHeader className="text-center p-10">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tighter uppercase italic">Session Secured</CardTitle>
              <CardDescription className="font-bold text-xs uppercase tracking-widest opacity-60 leading-relaxed mt-2">
                Assessment data synchronized with central repository.
                <br />Identity verification complete.
              </CardDescription>
            </CardHeader>
            {results && (
              <CardContent className="p-10 pt-0">
                <div className="bg-muted/30 rounded-2x border border-sidebar-border/50 p-6 space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Efficiency Rating</p>
                      <h3 className="text-4xl font-black tracking-tighter">{results.percentage}%</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Score Output</p>
                      <p className="text-xl font-black italic">{results.totalMarks} / {results.maxMarks}</p>
                    </div>
                  </div>
                  <Progress value={results.percentage} className="h-2" />
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  if (showInfoForm && quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 overflow-hidden relative select-none">
        <div className="absolute inset-0 opacity-[0.03] grayscale pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-xl w-full relative z-10">
          <Card className="shadow-elevated border-sidebar-border/50 glass-effect bg-card/40 backdrop-blur-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-50" />
            <CardHeader className="p-10 pb-6">
              <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px] mb-4">
                <Shield className="w-4 h-4" /> Identification Protocol
              </div>
              <CardTitle className="text-4xl font-black tracking-tighter uppercase italic">{quiz.title}</CardTitle>
              <CardDescription className="font-bold text-xs uppercase tracking-widest opacity-60 mt-2">
                Provide valid credentials to initialize assessment session.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-4 space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">Full Legal Name</Label>
                  <Input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="ENTER FULL NAME"
                    className="h-12 bg-muted/20 border-sidebar-border/50 font-bold uppercase text-xs tracking-wider"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">USN IDENTIFIER</Label>
                    <Input
                      value={studentUSN}
                      onChange={(e) => setStudentUSN(e.target.value.toUpperCase())}
                      placeholder="1XX21CS001"
                      className="h-12 bg-muted/20 border-sidebar-border/50 font-bold uppercase text-xs tracking-wider"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">AUTHENTICATED EMAIL</Label>
                    <Input
                      value={email}
                      disabled
                      className="h-12 bg-muted/40 border-sidebar-border/30 font-bold uppercase text-xs tracking-wider opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">ACADEMIC BRANCH</Label>
                  <Select value={studentBranch} onValueChange={setStudentBranch}>
                    <SelectTrigger className="h-12 bg-muted/20 border-sidebar-border/50 font-bold uppercase text-[10px] tracking-widest">
                      <SelectValue placeholder="SELECT DEPLOYMENT BRANCH" />
                    </SelectTrigger>
                    <SelectContent>
                      {['CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CE'].map(branch => (
                        <SelectItem key={branch} value={branch} className="font-bold uppercase text-[10px]">{branch} DEPARTMENT</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">CURRENT YEAR</Label>
                    <Select value={studentYear} onValueChange={setStudentYear}>
                      <SelectTrigger className="h-12 bg-muted/20 border-sidebar-border/50 font-bold uppercase text-[10px] tracking-widest">
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
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">SEMESTER</Label>
                    <Select value={studentSemester} onValueChange={setStudentSemester}>
                      <SelectTrigger className="h-12 bg-muted/20 border-sidebar-border/50 font-bold uppercase text-[10px] tracking-widest">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <SelectItem key={s} value={s.toString()} className="font-bold uppercase text-[10px]">SEM {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartQuiz}
                className="w-full h-14 gradient-primary shadow-glow font-black uppercase tracking-widest text-sm group mt-4"
                disabled={loading}
              >
                {loading ? (
                  <Activity className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">INITIALIZE ASSESSMENT <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
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
      <div className="min-h-screen bg-background relative overflow-hidden flex flex-col select-none">
        {/* Header Telemetry */}
        <header className="bg-card/40 backdrop-blur-2xl border-b border-sidebar-border/50 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{quiz.title}</h1>
                  <div className="flex items-center gap-3 mt-1.5 font-bold uppercase text-[8px] tracking-[0.2em] text-muted-foreground/60 italic">
                    <Activity className="w-3 h-3 text-primary animate-pulse" />
                    ENCRYPTED SESSION_ID: {attemptId.slice(-8)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 bg-muted/30 p-4 rounded-2xl border border-sidebar-border/50">
                <div className="flex items-center gap-3">
                  <Clock className={cn("h-5 w-5", timeLeft < 300 ? "text-destructive animate-pulse" : "text-primary")} />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">TTL Remaining</span>
                    <span className={cn("text-xl font-black tabular-nums tracking-tight", timeLeft < 300 ? "text-destructive" : "text-foreground")}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-sidebar-border/30" />
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-secondary" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Progress Matrix</span>
                    <span className="text-xl font-black tabular-nums tracking-tight">{currentQuestion + 1} / {quiz.questions.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Deployment Status</span>
                <span className="text-[10px] font-black tabular-nums uppercase tracking-widest">{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-1.5 bg-muted/30" />
            </div>
          </div>
        </header>

        {/* Content Console */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 relative group/console">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <Card className="shadow-elevated border-sidebar-border/50 glass-effect bg-card/40 backdrop-blur-2xl overflow-hidden min-h-[400px] flex flex-col">
              <CardHeader className="p-10 border-b border-sidebar-border/30 bg-muted/5 relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Waves className="w-16 h-16" />
                </div>
                <div className="flex gap-4">
                  <div className="text-4xl font-black text-primary/20 italic tracking-tighter">Q{currentQuestion + 1}</div>
                  <div className="space-y-4 pt-1 flex-1">
                    <h2 className="text-2xl font-black tracking-tight leading-snug whitespace-pre-wrap">
                      {question.question}
                    </h2>
                    <div className="flex gap-2">
                      <BadgeCheck className="w-3 h-3 text-secondary" />
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{question.type === 'mcq' ? 'MULTIPLE CHOICE INPUT' : 'DESCRIPTIVE ANALYSIS'}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 flex-1 flex flex-col justify-center">
                {question.type === 'mcq' && question.options ? (
                  <RadioGroup value={answers[currentQuestion]} onValueChange={handleAnswerChange} className="grid md:grid-cols-2 gap-4">
                    {question.options.map((option, index) => (
                      <div
                        key={index}
                        onClick={() => handleAnswerChange(String.fromCharCode(65 + index))}
                        className={cn(
                          "flex items-center space-x-4 p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group/option relative overflow-hidden",
                          answers[currentQuestion] === String.fromCharCode(65 + index)
                            ? "border-primary bg-primary/5 shadow-glow-sm"
                            : "border-sidebar-border/50 hover:border-primary/30 hover:bg-muted/30"
                        )}
                      >
                        <RadioGroupItem value={String.fromCharCode(65 + index)} id={`option-${index}`} className="sr-only" />
                        <div className={cn(
                          "w-8 h-8 rounded-lg border-2 flex items-center justify-center font-black transition-all",
                          answers[currentQuestion] === String.fromCharCode(65 + index)
                            ? "bg-primary border-primary text-white scale-110 shadow-glow-sm"
                            : "border-sidebar-border group-hover/option:border-primary/50 text-muted-foreground"
                        )}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <Label htmlFor={`option-${index}`} className="text-sm font-bold cursor-pointer flex-1 group-hover/option:text-primary transition-colors">
                          {option}
                        </Label>
                        {answers[currentQuestion] === String.fromCharCode(65 + index) && (
                          <div className="absolute top-0 right-0 w-8 h-8 bg-primary/10 rotate-45 translate-x-4 -translate-y-4" />
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="answer" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Analysis Input Console</Label>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Streaming: Buffer Active</div>
                    </div>
                    <Textarea
                      id="answer"
                      value={answers[currentQuestion]}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Input comprehensive analysis response here..."
                      className="min-h-[240px] bg-muted/20 border-sidebar-border/50 focus:ring-primary/10 font-medium text-base resize-none p-8 leading-relaxed rounded-2xl select-text"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Core Navigation Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-12">
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="h-14 px-8 border-sidebar-border font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-muted/50 transition-all active:scale-95"
              >
                BACKPEDAL
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.min(quiz.questions.length - 1, currentQuestion + 1))}
                disabled={currentQuestion === quiz.questions.length - 1}
                className="h-14 px-8 border-sidebar-border font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-muted/50 transition-all active:scale-95"
              >
                ADVANCE
              </Button>
            </div>

            <div className="h-14 bg-muted/30 px-6 rounded-2xl border border-sidebar-border/50 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">ACTIVE LINE</span>
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {quiz.questions.slice(Math.max(0, currentQuestion - 4), Math.min(quiz.questions.length, currentQuestion + 6)).map((_, idx) => {
                  const realIdx = quiz.questions?.indexOf(_) || 0;
                  return (
                    <div
                      key={realIdx}
                      className={cn(
                        "w-1.5 h-6 rounded-full transition-all duration-500",
                        currentQuestion === realIdx ? "h-10 bg-primary shadow-glow-sm" : answers[realIdx] ? "bg-secondary/40" : "bg-muted-foreground/20"
                      )}
                    />
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className={cn(
                "h-14 px-12 font-black uppercase tracking-widest text-sm rounded-2xl shadow-glow transition-all active:scale-95 group",
                currentQuestion === quiz.questions.length - 1 ? "gradient-primary" : "bg-muted/20 text-muted-foreground/60 border border-sidebar-border hover:bg-muted/40"
              )}
            >
              {submitting ? (
                <Activity className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  TERMINATE & SYNC <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </div>

          {/* Quick Navigator Matrix */}
          <div className="mt-16 space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 ml-1 italic">Segment Map Matrix</Label>
            <div className="p-8 rounded-[2rem] bg-muted/10 border border-sidebar-border/30 grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-3">
              {quiz.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={cn(
                    "w-full aspect-square rounded-xl text-[10px] font-black transition-all active:scale-90 border-2",
                    currentQuestion === index
                      ? "gradient-primary text-white border-primary shadow-glow-sm scale-110"
                      : answers[index]
                        ? "bg-secondary/20 border-secondary/40 text-secondary"
                        : "bg-background border-sidebar-border/50 text-muted-foreground/60 hover:border-primary/40 hover:text-primary"
                  )}
                >
                  {(index + 1).toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
        </main>

        <footer className="mt-auto border-t border-sidebar-border/20 py-8 px-6">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 opacity-30">
            <div className="text-[8px] font-black uppercase tracking-[0.3em] flex gap-4">
              <span>LATENCY: 12ms</span>
              <span>BUFFER: OPTIMIZED</span>
              <span>ENCRYPTION: 256-AES</span>
            </div>
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em]">
              SECURED BY SMARTQUIZ CORE <Shield className="w-2.5 h-2.5" />
            </div>
          </div>
        </footer>
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
