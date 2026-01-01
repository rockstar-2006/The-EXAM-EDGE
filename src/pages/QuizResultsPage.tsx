import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Download, ArrowLeft, Loader2, FileSpreadsheet, Users, Award, TrendingUp, RefreshCw, ChevronRight, Activity, Database, Sparkles, X, Search, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface QuizAttempt {
  _id: string;
  studentName: string;
  studentUSN: string;
  studentEmail: string;
  studentBranch: string;
  studentYear: string;
  studentSemester: string;
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

  const fetchResults = useCallback(async () => {
    try {
      const response = await quizAPI.getResults(quizId!);
      const data = response.data || response;
      setQuizTitle(data.quiz?.title || data.title || '');
      setAttempts(data.attempts || []);
    } catch (error: any) {
      console.error('Error fetching results:', error);
      toast.error('Sync failed: Persistence layer error');
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
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1];

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
      toast.success('Excel artifact generated successfully');
    } catch (error: any) {
      toast.error('Artifact generation failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleSort = (key: keyof QuizAttempt) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedAttempts = useMemo(() => {
    let result = [...attempts];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.studentName.toLowerCase().includes(lowerSearch) ||
        a.studentUSN.toLowerCase().includes(lowerSearch) ||
        a.studentEmail.toLowerCase().includes(lowerSearch)
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
    avgPercentage: (attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length).toFixed(1),
    passRate: ((attempts.filter((a) => a.percentage >= 40).length / attempts.length) * 100).toFixed(1),
    highestScore: Math.max(...attempts.map((a) => a.totalMarks)),
    lowestScore: Math.min(...attempts.map((a) => a.totalMarks)),
  } : null;

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
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Polling Data Matrix...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/results')} className="h-8 px-0 text-muted-foreground hover:text-primary transition-colors font-black uppercase text-[10px] tracking-widest gap-2">
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
            <Activity className="w-4 h-4" />
            Quiz Performance Analysis
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic truncate max-w-2xl">
            {quizTitle || 'Assessment Module'}
          </h1>
          {autoRefresh && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60">
              <RefreshCw className="w-3 h-3 animate-spin" /> Live Syncing Active
            </div>
          )}
        </div>

        <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            className={cn(
              "h-14 px-6 border-sidebar-border/50 font-black uppercase text-[10px] tracking-widest transition-all",
              autoRefresh ? "bg-primary/5 text-primary border-primary/20" : "opacity-60"
            )}
          >
            {autoRefresh ? 'Sync On' : 'Sync Off'}
          </Button>
          <Button onClick={() => handleDownloadExcel(false)} disabled={downloading || attempts.length === 0} className="h-14 px-8 gradient-primary font-black uppercase tracking-widest shadow-glow">
            {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5 mr-3" />}
            Export Summary
          </Button>
          <Button onClick={() => handleDownloadExcel(true)} variant="outline" disabled={downloading || attempts.length === 0} className="h-14 px-6 border-sidebar-border/50 font-black uppercase text-[10px] tracking-widest">
            <Download className="w-4 h-4 mr-3" />
            Detailed Report
          </Button>
        </div>
      </motion.div>

      {stats && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Enrolled', value: attempts.length, icon: Users, color: 'primary' },
            { label: 'Mean Performance', value: `${stats.avgPercentage}%`, icon: TrendingUp, color: 'secondary' },
            { label: 'Efficiency Rate', value: `${stats.passRate}%`, icon: Sparkles, color: 'accent' },
            { label: 'Score Variation', value: `${stats.lowestScore} — ${stats.highestScore}`, icon: Award, color: 'primary' }
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

      <motion.div variants={itemVariants}>
        <Card className="shadow-elevated border-sidebar-border/50 glass-effect overflow-hidden">
          <CardHeader className="bg-muted/10 border-b border-sidebar-border/50 py-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <CardTitle className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-foreground">
                  <Database className="w-5 h-5 text-primary" />
                  Student Matrix Ledger
                </CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-foreground/60">Historical records for current unit.</CardDescription>
              </div>
              <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search ledger (Name, USN, Email)..."
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
                      <TableHead className="text-[10px] font-black uppercase text-foreground">Security Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase pr-8 text-right text-foreground">Details</TableHead>
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
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-sm text-foreground">
                          {attempt.totalMarks} <span className="text-foreground/30 font-bold">/</span> {attempt.maxMarks}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "text-sm font-black italic tracking-tighter px-3 py-1 rounded-md",
                            attempt.percentage >= 40 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                          )}>
                            {attempt.percentage.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[9px] font-black uppercase tracking-widest w-fit",
                            attempt.status === 'blocked' ? "bg-rose-500 shadow-glow shadow-rose-500/20" :
                              attempt.status === 'graded' || attempt.status === 'submitted' ? "bg-emerald-500" : "bg-muted text-muted-foreground"
                          )}>
                            {attempt.status === 'blocked' ? 'RESTRICTED' : attempt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-8 text-right">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedAttempt(attempt)} className="h-8 w-8 hover:bg-primary/10">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
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
                    <DialogDescription className="text-[10px] font-black uppercase text-foreground/80 flex items-center gap-2">
                      {selectedAttempt.studentEmail} <span className="opacity-20">•</span> {selectedAttempt.studentUSN} <span className="opacity-20">•</span> <span className="text-primary italic">{selectedAttempt.studentBranch}</span>
                    </DialogDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-primary tracking-tighter">{selectedAttempt.percentage.toFixed(1)}%</div>
                    <div className="text-[10px] font-black uppercase text-muted-foreground/40">Calibration</div>
                  </div>
                </div>
                {selectedAttempt.status === 'blocked' && (
                  <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-4">
                    <Activity className="w-5 h-5 text-rose-500 mt-1" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-rose-600">Violation Detected</p>
                      <p className="text-sm font-bold text-rose-900 mt-0.5 uppercase italic">{selectedAttempt.violationReason || 'TERMINATED BY SYSTEM'}</p>
                    </div>
                  </div>
                )}
              </DialogHeader>
              <div className="flex-1 overflow-auto p-8 space-y-6 bg-muted/5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40 px-2">Unit Breakdown</h3>
                {selectedAttempt.answers?.map((ans, idx) => (
                  <Card key={idx} className={cn("border-sidebar-border/60 relative overflow-hidden bg-white shadow-sm", ans.isCorrect ? "bg-emerald-500/[0.02]" : "bg-rose-500/[0.02]")}>
                    <div className={cn("absolute left-0 top-0 w-1.5 h-full", ans.isCorrect ? "bg-emerald-500" : "bg-rose-500")} />
                    <CardContent className="p-6">
                      <div className="flex justify-between mb-4">
                        <Badge variant="outline" className="text-[8px] font-black uppercase">Unit {idx + 1}</Badge>
                        <span className={cn("font-black text-xs", ans.isCorrect ? "text-emerald-600" : "text-rose-600")}>{ans.marks} PTS</span>
                      </div>
                      <p className="text-lg font-black tracking-tight whitespace-pre-wrap mb-6">{ans.question}</p>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase text-muted-foreground">Response</p>
                          <div className={cn("p-4 rounded-xl border font-black text-sm", ans.isCorrect ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-900" : "bg-rose-500/5 border-rose-500/20 text-rose-900")}>{ans.studentAnswer || 'N/A'}</div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase text-muted-foreground">Correct</p>
                          <div className="p-4 rounded-xl border border-sidebar-border bg-muted/40 font-black text-sm text-foreground">{ans.correctAnswer}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="p-8 bg-muted/20 border-t flex justify-end">
                <Button onClick={() => setSelectedAttempt(null)} className="font-black uppercase text-[10px] h-12 px-8 gradient-primary shadow-glow">Close Report</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
