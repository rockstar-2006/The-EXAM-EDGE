import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Download, ArrowLeft, Loader2, FileSpreadsheet, Search, Users, ChevronUp, ChevronDown, ChevronRight, Activity, Calendar, Clock,
  Trophy, Target, FileText, Trash2, Award, TrendingUp, RefreshCw, Database, Sparkles, X, Code, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { quizAPI } from '@/services/api';
import axios from 'axios';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AcademicTextRenderer } from '@/components/AcademicTextRenderer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface QuizAttempt {
  _id: string;
  studentName: string;
  studentUSN: string;
  studentEmail: string;
  studentBranch: string;
  studentYear: string;
  studentSemester: string;
  studentSection?: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  status: string;
  violationReason?: string;
  submittedAt: string;
  answers: any[];
}

export default function QuizResultsPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof QuizAttempt; direction: 'asc' | 'desc' } | null>(null);
  const [isResetting, setIsResetting] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      const response = await quizAPI.getResults(quizId!);
      const data = response.data || response;
      setQuizTitle(data.quiz?.title || data.title || '');
      setAttempts(data.attempts || []);
    } catch (error: any) {
      console.error('Error fetching results:', error);
      toast.error('Sync failed: Could not load quiz attempts');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchResults(), 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchResults]);

  const handleDownloadExcel = async (detailed: boolean = false) => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('teacherToken') || localStorage.getItem('token');
      
      const response = await axios.get(
        `${API_URL}/quiz/${quizId}/results/download${detailed ? '?detailed=true' : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${quizTitle.replace(/[^a-z0-9]/gi, '_')}_results.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel report generated successfully');
    } catch (error: any) {
      console.error('Artifact generation error:', error);
      let errorMessage = 'Report generation failed';
      
      if (error.response?.data) {
        if (error.response.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorData = JSON.parse(reader.result as string);
              toast.error(`Export failed: ${errorData.message || 'Server error'}`);
            } catch (e) {
              toast.error('Export failed: Internal Server Error');
            }
          };
          reader.readAsText(error.response.data);
          return;
        } else if (typeof error.response.data === 'object') {
          errorMessage = `Export failed: ${error.response.data.message || error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setDownloading(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: key as keyof QuizAttempt, direction });
  };

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!window.confirm('Permanently erase this assessment attempt?')) return;
    try {
      await quizAPI.deleteAttempt(attemptId);
      toast.success('Attempt record removed');
      fetchResults();
    } catch (error) {
      toast.error('Failed to remove record');
    }
  };

  const handleResetAttempt = async (attemptId: string) => {
    if (!window.confirm("Are you sure you want to reset this attempt and allow the student to retake the quiz? Previous marks will be cleared.")) {
      return;
    }
    setIsResetting(attemptId);
    try {
      await quizAPI.resetAttempt(quizId!, attemptId);
      toast.success("Attempt reset successfully. Student is unblocked and can retake the quiz.");
      if (selectedAttempt?._id === attemptId) {
        setSelectedAttempt(null);
      }
      await fetchResults();
    } catch (err: any) {
      console.error("Reset attempt error:", err);
      toast.error(err.response?.data?.message || "Failed to reset attempt");
    } finally {
      setIsResetting(null);
    }
  };

  const filteredAndSortedAttempts = useMemo(() => {
    let result = [...attempts];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.studentName.toLowerCase().includes(lowerSearch) ||
        a.studentUSN.toLowerCase().includes(lowerSearch) ||
        a.studentEmail.toLowerCase().includes(lowerSearch) ||
        (a.studentSection && a.studentSection.toLowerCase().includes(lowerSearch))
      );
    }

    // Sort logic
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || bValue === undefined) return 0;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [attempts, searchTerm, sortConfig]);

  const stats = attempts.length > 0 ? {
    avgPercentage: (attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length).toFixed(1),
    passRate: ((attempts.filter((a) => (a.percentage || 0) >= 40).length / attempts.length) * 100).toFixed(1),
    highestScore: Math.max(...attempts.map((a) => a.totalMarks || 0)),
    lowestScore: Math.min(...attempts.map((a) => a.totalMarks || 0)),
  } : null;

  const topPerformers = useMemo(() => {
    return [...attempts]
      .filter(a => a.status === 'submitted' || a.status === 'graded')
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
      .slice(0, 5);
  }, [attempts]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  if (loading && attempts.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Loading Records...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-sidebar-border/50">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/results')} className="h-10 w-10 rounded-xl hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Button>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary border-primary/20 bg-primary/5">
                  Quiz Analytics
                </Badge>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-foreground">{quizTitle || 'Assessment Analysis'}</h1>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            className={cn(
              "h-12 md:h-14 px-4 md:px-6 border-sidebar-border/50 font-black uppercase text-[10px] tracking-widest transition-all",
              autoRefresh ? "bg-primary/5 text-primary border-primary/20" : "opacity-60"
            )}
          >
            {autoRefresh ? 'Sync On' : 'Sync Off'}
          </Button>
          <Button onClick={() => handleDownloadExcel(false)} disabled={downloading || attempts.length === 0} className="h-12 md:h-14 px-4 md:px-8 gradient-primary font-black uppercase tracking-widest shadow-glow">
            {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5 mr-2 md:mr-3" />}
            Export
          </Button>
          <Button onClick={() => handleDownloadExcel(true)} variant="outline" disabled={downloading || attempts.length === 0} className="h-12 md:h-14 px-4 md:px-6 border-sidebar-border/50 font-black uppercase text-[10px] tracking-widest">
            <Download className="w-4 h-4 mr-2 md:mr-3" />
            Detailed
          </Button>
        </div>
      </motion.div>

      {stats && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Students', value: attempts.length, icon: Users, color: 'primary' },
            { label: 'Average Score', value: `${stats.avgPercentage}%`, icon: TrendingUp, color: 'secondary' },
            { label: 'Pass Rate', value: `${stats.passRate}%`, icon: Sparkles, color: 'accent' },
            { label: 'Score Range', value: `${stats.lowestScore} — ${stats.highestScore}`, icon: Award, color: 'primary' }
          ].map((stat, i) => (
            <Card key={i} className="shadow-elevated border-sidebar-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-full h-1 bg-${stat.color}`} />
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</p>
                    <h3 className="text-3xl font-black tracking-tighter">{stat.value}</h3>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-${stat.color}/10 flex items-center justify-center text-${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {topPerformers.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Trophy className="w-5 h-5 shadow-glow" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Top Achievers</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Leaderboard</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topPerformers.map((student, idx) => (
              <Card key={student._id} className="relative overflow-hidden border-sidebar-border/50 bg-card/40 backdrop-blur-md group hover:scale-[1.02] transition-transform duration-300">
                <div className={cn(
                  "absolute top-0 left-0 w-full h-1",
                  idx === 0 ? "bg-amber-400" : idx === 1 ? "bg-slate-300" : idx === 2 ? "bg-amber-600" : "bg-primary/20"
                )} />
                <CardContent className="p-5">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="relative">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-lg font-black",
                        idx === 0 ? "bg-amber-400/10 text-amber-500" : 
                        idx === 1 ? "bg-slate-300/10 text-slate-400" : 
                        idx === 2 ? "bg-amber-600/10 text-amber-700" : "bg-primary/10 text-primary"
                      )}>
                        {idx + 1}
                      </div>
                      {idx < 3 && <Sparkles className={cn("absolute -top-1 -right-1 w-4 h-4", idx === 0 ? "text-amber-400" : "text-slate-400")} />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-black text-sm uppercase truncate w-full max-w-[140px]">{student.studentName}</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                        {student.studentUSN} {student.studentSection ? `• SEC ${student.studentSection}` : ''}
                      </p>
                    </div>
                    <div className="mt-2 text-xl font-black italic tracking-tighter text-primary">
                      {(student.percentage || 0).toFixed(1)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Card className="shadow-elevated border-sidebar-border/50 glass-effect overflow-hidden">
          <CardHeader className="bg-muted/10 border-b border-sidebar-border/50 py-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <CardTitle className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-foreground">
                  <Database className="w-5 h-5 text-primary" />
                  Student Performance Records
                </CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                  Comprehensive list of student results with proctoring violations and retake controls.
                </CardDescription>
              </div>
              <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search students (Name, USN, Email, Sec)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 bg-white border-sidebar-border/50 text-foreground font-bold rounded-xl focus:ring-primary/20 shadow-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {attempts.length === 0 ? (
              <div className="py-24 text-center">
                <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground/40 italic">Zero attempt records synchronized</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-b-sidebar-border/50">
                      <TableHead onClick={() => handleSort('studentName')} className="text-[10px] font-black uppercase py-6 pl-8 cursor-pointer hover:text-primary transition-colors text-foreground">
                        <div className="flex items-center gap-2">Student {sortConfig?.key === 'studentName' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('totalMarks')} className="text-[10px] font-black uppercase text-center cursor-pointer hover:text-primary transition-colors text-foreground">
                        <div className="flex items-center justify-center gap-2">Score {sortConfig?.key === 'totalMarks' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('percentage')} className="text-[10px] font-black uppercase text-center cursor-pointer hover:text-primary transition-colors text-foreground">
                        <div className="flex items-center justify-center gap-2">Percentage {sortConfig?.key === 'percentage' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-foreground">Security Status & Violation</TableHead>
                      <TableHead className="text-[10px] font-black uppercase pr-8 text-right text-foreground">Actions & Retake</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedAttempts.map((attempt) => (
                      <TableRow key={attempt._id} className="group border-b-sidebar-border/20 hover:bg-primary/[0.02]">
                        <TableCell className="pl-8">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">{attempt.studentName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-foreground/70">{attempt.studentUSN}</span>
                              <span className="text-[10px] font-bold text-primary italic lowercase tracking-wider">{attempt.studentBranch}</span>
                              {attempt.studentSection && (
                                <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 py-0 border-indigo-200 text-indigo-700 bg-indigo-50/50">
                                  SEC {attempt.studentSection}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-sm text-foreground">
                          {attempt.totalMarks} <span className="text-foreground/30 font-bold">/</span> {attempt.maxMarks}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "text-sm font-black italic tracking-tighter px-3 py-1 rounded-md",
                            (attempt.percentage || 0) >= 40 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                          )}>
                            {(attempt.percentage || 0).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start max-w-[280px]">
                            <Badge className={cn(
                              "text-[9px] font-black uppercase tracking-widest w-fit",
                              attempt.status === 'blocked' ? "bg-rose-500 shadow-glow shadow-rose-500/20 text-white" :
                                attempt.status === 'graded' || attempt.status === 'submitted' ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                            )}>
                              {attempt.status === 'blocked' ? 'BLOCKED / RESTRICTED' : attempt.status}
                            </Badge>
                            {attempt.status === 'blocked' && (
                              <div className="bg-rose-50 border border-rose-200/80 rounded-md px-2 py-1 flex items-start gap-1.5 w-full">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                <span className="text-[10px] font-bold text-rose-700 leading-tight">
                                  {attempt.violationReason || 'Terminated by lockdown protocol'}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="pr-8 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetAttempt(attempt._id)}
                              disabled={isResetting === attempt._id}
                              className="h-8 px-3 text-[10px] font-black uppercase tracking-wider text-amber-700 border-amber-300 bg-amber-50/50 hover:bg-amber-100/80 hover:text-amber-800 transition-colors"
                              title="Reset marks & allow student to retake quiz"
                            >
                              {isResetting === attempt._id ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <RefreshCw className="w-3 h-3 mr-1 text-amber-600" />
                              )}
                              Allow Retake
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedAttempt(attempt)} className="h-8 w-8 hover:bg-primary/10">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAttempt(attempt._id)} className="h-8 w-8 hover:bg-destructive/10 text-destructive/40 hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!selectedAttempt} onOpenChange={() => setSelectedAttempt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background border-sidebar-border shadow-2xl">
          {selectedAttempt && (
            <>
              <DialogHeader className="p-8 bg-muted/40 border-b relative">
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic text-foreground">{selectedAttempt.studentName}</DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase text-foreground/80 flex items-center gap-2 mt-1">
                      {selectedAttempt.studentEmail} <span className="opacity-20">•</span> {selectedAttempt.studentUSN} <span className="opacity-20">•</span> <span className="text-primary italic">{selectedAttempt.studentBranch}</span>
                      {selectedAttempt.studentSection && (
                        <>
                          <span className="opacity-20">•</span>
                          <span className="font-bold text-indigo-600">SEC {selectedAttempt.studentSection}</span>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-primary tracking-tighter">{(selectedAttempt.percentage || 0).toFixed(1)}%</div>
                    <div className="text-[10px] font-black uppercase text-muted-foreground/40">Total Score</div>
                  </div>
                </div>

                {selectedAttempt.status === 'blocked' ? (
                  <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Lockdown Violation Reason</p>
                        <p className="text-sm font-bold text-rose-900 mt-0.5">{selectedAttempt.violationReason || 'Terminated by lockdown protocol'}</p>
                        <p className="text-[11px] text-rose-700/80 mt-1">
                          Click below to reset marks and allow this student to retake the exam.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleResetAttempt(selectedAttempt._id)}
                      disabled={isResetting === selectedAttempt._id}
                      className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider h-11 px-5 rounded-xl shadow-md"
                    >
                      {isResetting === selectedAttempt._id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-1.5" />
                      )}
                      Reset & Allow Retake
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => handleResetAttempt(selectedAttempt._id)}
                      disabled={isResetting === selectedAttempt._id}
                      className="text-amber-700 border-amber-300 bg-amber-50/50 hover:bg-amber-100 font-bold text-xs uppercase tracking-wider h-9 px-4 rounded-xl"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                      Reset Attempt & Retake
                    </Button>
                  </div>
                )}
              </DialogHeader>
              <div className="flex-1 overflow-auto p-8 space-y-6 bg-muted/5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40 px-2">Questions & Responses</h3>
                {selectedAttempt.answers?.map((ans, idx) => (
                  <Card key={idx} className={cn("border-sidebar-border/60 relative overflow-hidden bg-white shadow-sm", ans.isCorrect ? "bg-emerald-500/[0.02]" : "bg-rose-500/[0.02]")}>
                    <div className={cn("absolute left-0 top-0 w-1.5 h-full", ans.isCorrect ? "bg-emerald-500" : "bg-rose-500")} />
                    <CardContent className="p-6">
                      <div className="flex justify-between mb-4">
                        <Badge variant="outline" className="text-[8px] font-black uppercase">Question {idx + 1}</Badge>
                        <span className={cn("font-black text-xs", ans.isCorrect ? "text-emerald-600" : "text-rose-600")}>{ans.marks} PTS</span>
                      </div>
                      <div className="text-base font-bold tracking-tight mb-6 normal-case">
                        <AcademicTextRenderer text={ans.question} content={ans.question} isQuestion={true} imageUrl={ans.imageUrl} />
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase text-muted-foreground">Student Answer</p>
                          <div className={cn("p-4 rounded-xl border font-bold text-sm", ans.isCorrect ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-900" : "bg-rose-500/5 border-rose-500/20 text-rose-900")}>
                            {ans.studentAnswer || 'N/A'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase text-muted-foreground">Correct Answer</p>
                          <div className="p-4 rounded-xl border border-sidebar-border bg-muted/40 font-bold text-sm text-foreground">
                            {ans.correctAnswer}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="p-6 bg-muted/20 border-t flex justify-end">
                <Button onClick={() => setSelectedAttempt(null)} className="font-black uppercase text-[10px] h-12 px-8 gradient-primary shadow-glow">Close Report</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
