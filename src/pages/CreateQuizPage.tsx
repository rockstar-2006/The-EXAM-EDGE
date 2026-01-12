import { useState, useEffect } from 'react';
import {
  Upload, FileText, Sparkles, Download, Copy, Save, Share2, Clock, FolderPlus, X, Bookmark, RefreshCw, ChevronRight, Lock,
  Target,
  Trophy,
  Zap,
  CalendarClock,
  Plus,
  PlusCircle,
  FileCode
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestionEditor } from '@/components/QuestionEditor';
import { AIChatInterface } from '@/components/AIChatInterface';
import { generateQuestions } from '@/services/gemini';
import { extractTextFromPDF, isPDFFile } from '@/services/pdfService';
import { quizAPI, studentsAPI, bookmarksAPI, foldersAPI } from '@/services/api';
import { Question, Quiz, Student } from '@/types';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StudentTable } from '@/components/StudentTable';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  content: string;
  type: string;
}

interface NormalizedQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  marks: number;
  type: 'mcq' | 'short-answer' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
}

export default function CreateQuizPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [moduleText, setModuleText] = useState('');
  const [numQuestions, setNumQuestions] = useState('5');
  const [questionType, setQuestionType] = useState<'mcq' | 'short-answer' | 'mixed'>('mcq');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [quizDuration, setQuizDuration] = useState('30');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generating, setGenerating] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [quizDescription, setQuizDescription] = useState<string>('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Bookmark State
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('none');
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    // Handle edit question from bookmarks
    if (location.state?.editQuestion) {
      const editQ = location.state.editQuestion;
      setQuestions([{ ...editQ, isSelected: true }]);
    }

    // Handle edit quiz from bookmarks
    if (location.state?.quizData) {
      const data = location.state.quizData;
      setQuizTitle(data.title || '');
      setQuizDescription(data.description || '');
      setQuestions(data.questions || []);
      setNumQuestions(String(data.numQuestions || data.questions?.length || 5));
      setDifficulty(data.difficulty || 'medium');
      setQuestionType(data.questionType || 'mcq');
      setQuizDuration(String(data.duration || 30));

      if (data.isScheduled) {
        setIsScheduled(true);
        setStartDate(data.startDate || '');
        setStartTime(data.startTime || '');
        setEndDate(data.endDate || '');
        setEndTime(data.endTime || '');
        setTimezone(data.timezone || 'Asia/Kolkata');
      }
    }

    // Fetch students for sharing
    fetchStudents();
    fetchFolders();
  }, [location]);

  const fetchFolders = async () => {
    try {
      const res = await foldersAPI.getAll();
      setFolders(res.data?.folders || res.data || []);
    } catch (error) {
      console.error("Failed to fetch folders", error);
    }
  };

  const fetchStudents = async () => {
    try {
      setIsLoadingStudents(true);
      const response = await studentsAPI.getAll();
      const studentsData = response.data?.students || response.data || response;
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const newFiles: UploadedFile[] = [];

    for (const file of fileArray) {
      try {
        let content = '';

        if (isPDFFile(file)) {
          toast.info(`Extracting text from ${file.name}...`);
          content = await extractTextFromPDF(file);
        } else {
          // Attempt to read as text for all other file types (txt, word, markdown, etc.)
          // Note: Binary formats like .docx won't read correctly as text here without a parser, 
          // but we will allow the upload flow to proceed for now as requested.
          content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
          });
        }

        // Check for "500 page" timeout risk:
        // A very rough estimate: 1 page ~= 3000 characters. 500 pages ~= 1,500,000 chars.
        // Gemini flash context window is massive (1M tokens), but processing time can still time out or hit rate limits.
        // We will implement a soft cap for "interactive" speed.
        const CHAR_LIMIT = 500000; // Approx 150-200 pages. Safely processed in one go.

        if (content.length > CHAR_LIMIT) {
          toast.warning(`${file.name} is very large. Truncating to first ~150 pages to prevent AI timeout.`, {
            duration: 6000,
          });
          content = content.substring(0, CHAR_LIMIT);
          content += "\n\n[CONTENT TRUNCATED FOR PERFORMANCE]";
        }

        newFiles.push({
          id: `${Date.now()}-${file.name}`,
          name: file.name,
          content,
          type: file.type,
        });

        toast.success(`${file.name} loaded successfully`);
      } catch (error) {
        toast.error(`Failed to load ${file.name}`);
        console.error(error);
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleAddManualQuestion = () => {
    const newQuestion: Question = {
      id: `manual-${Date.now()}`,
      question: '',
      type: questionType === 'mixed' ? 'mcq' : questionType,
      options: questionType !== 'short-answer' ? ['', '', '', ''] : [],
      answer: '',
      explanation: '',
      marks: 1,
      isSelected: true
    };
    setQuestions([newQuestion, ...questions]);
    toast.success('Manual question entry added');
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    toast.success('File removed');
  };

  const handleGenerateQuestions = async (aiPrompt?: string) => {
    const combinedText = uploadedFiles.map((f) => f.content).join('\n\n') + '\n\n' + moduleText;

    if (!combinedText.trim()) {
      toast.error('Please upload files or paste notes');
      return;
    }

    const num = parseInt(numQuestions);
    if (isNaN(num) || num < 1 || num > 50) {
      toast.error('Please enter a valid number of questions (1-50)');
      return;
    }

    setGenerating(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        toast.error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
        setGenerating(false);
        return;
      }

      const generatedQuestions = await generateQuestions({
        text: combinedText,
        numQuestions: num,
        type: questionType,
        difficulty,
        customPrompt: aiPrompt || customPrompt,
      });

      setQuestions(generatedQuestions);
      setSavedQuizId(null);

      try {
        for (const question of generatedQuestions) {
          await bookmarksAPI.create({ question });
        }
        toast.success(`Generated and auto-bookmarked ${generatedQuestions.length} questions!`);
      } catch (bookmarkError) {
        console.warn('Error auto-bookmarking questions:', bookmarkError);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate questions. Please check your API key.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateQuestion = (updatedQuestion: Question) => {
    setQuestions(questions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
    setSavedQuizId(null);
    toast.success('Question updated');
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    setSavedQuizId(null);
    toast.success('Question deleted');
  };

  const handleToggleBookmark = async (id: string) => {
    const question = questions.find(q => q.id === id);
    if (!question) return;

    const newBookmarked = !question.isBookmarked;

    try {
      if (newBookmarked) {
        await bookmarksAPI.create({ question });
        toast.success('Question bookmarked');
      } else {
        toast.info('Bookmark removed from this session');
      }

      setQuestions(questions.map(q =>
        q.id === id ? { ...q, isBookmarked: newBookmarked } : q
      ));
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    }
  };

  const handleToggleSelect = (id: string) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, isSelected: !q.isSelected } : q
    ));
  };

  const handleExportJSON = () => {
    const selectedQuestions = questions.filter(q => q.isSelected);
    const dataStr = JSON.stringify(selectedQuestions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quiz_export_${Date.now()}.json`;
    link.click();
    toast.success('Questions exported');
  };

  const handleSaveQuiz = async (): Promise<Quiz | null> => {
    const selectedQuestions = questions.filter(q => q.isSelected);

    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question');
      return null;
    }

    if (!quizTitle.trim()) {
      toast.error('Please enter a quiz title');
      return null;
    }

    setSaving(true);
    try {
      const normalizedQuestions: NormalizedQuestion[] = selectedQuestions.map((q: Question, index: number) => {
        const questionText = q.question?.trim();
        if (!questionText) throw new Error(`Question ${index + 1} is empty`);

        let options: string[] = [];
        if (q.options && Array.isArray(q.options)) {
          options = q.options.map(o => String(typeof o === 'object' ? (o as any).text : o).trim()).filter(o => o !== '');
        }

        let finalAnswer = '';
        if ('correctAnswer' in q && q.correctAnswer) {
          finalAnswer = String(typeof q.correctAnswer === 'object' ? (q.correctAnswer as any).text : q.correctAnswer).trim();
        } else if ('answer' in q && q.answer) {
          finalAnswer = String(typeof q.answer === 'object' ? (q.answer as any).text : q.answer).trim();
        }

        return {
          id: q.id || `q_${index}`,
          question: questionText,
          options,
          answer: finalAnswer,
          explanation: q.explanation || '',
          marks: 1,
          type: q.type || 'mcq',
          difficulty: (q as any).difficulty || 'medium'
        };
      });

      const quizData = {
        title: quizTitle.trim(),
        description: quizDescription.trim() || `Quiz with ${normalizedQuestions.length} items`,
        questions: normalizedQuestions,
        questionCount: normalizedQuestions.length,
        totalMarks: normalizedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0),
        duration: parseInt(quizDuration) || 30,
        difficulty,
        questionType,
        isScheduled,
        startDate: isScheduled ? startDate : null,
        startTime: isScheduled ? startTime : null,
        endDate: isScheduled ? endDate : null,
        endTime: isScheduled ? endTime : null,
        timezone: isScheduled ? timezone : 'Asia/Kolkata'
      };

      let response;
      if (savedQuizId) {
        response = await quizAPI.update(savedQuizId, quizData);
      } else {
        response = await quizAPI.save(quizData);
      }

      const result = response.data;
      const quizId = result.quizId || result.quiz?._id;
      setSavedQuizId(quizId);
      toast.success('Quiz saved successfully');

      return {
        ...quizData,
        id: quizId,
        numQuestions: normalizedQuestions.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Save error:', error);
      const message = error.response?.data?.message || 'Failed to save quiz';
      toast.error(message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBookmarkDialog = () => {
    const selectedQuestions = questions.filter(q => q.isSelected);
    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question');
      return;
    }
    if (!quizTitle.trim()) {
      toast.error('Please enter a quiz title first to use as default');
      // allow opening anyway? User requested "ask name". 
      // Let's just set it to empty if empty.
    }
    setBookmarkName(quizTitle);
    setBookmarkDialogOpen(true);
  };

  const handleBookmarkQuiz = async () => {
    // If saving to a new folder, we need the name.
    if ((isNewFolder || selectedFolderId === 'new') && !bookmarkName.trim()) {
      toast.error('Please enter a name for the new folder');
      return;
    }

    const selectedQuestions = questions.filter(q => q.isSelected);

    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question to bookmark');
      return;
    }

    try {
      let finalFolderId = selectedFolderId;

      // Create new folder if needed
      if (selectedFolderId === 'new' || isNewFolder) {
        const folderRes = await foldersAPI.create({ name: bookmarkName });
        finalFolderId = folderRes.data?._id || folderRes.data?.folder?._id;

        if (!finalFolderId) throw new Error("Failed to create folder");
      }

      toast.info(`Saving ${selectedQuestions.length} questions to collection...`);

      // Save each question as an individual bookmark into the folder
      const savePromises = selectedQuestions.map(q =>
        bookmarksAPI.create({
          type: 'question',
          folderId: finalFolderId,
          question: q
        })
      );

      await Promise.all(savePromises);

      toast.success('Questions successfully archived!');
      setBookmarkDialogOpen(false);
      setBookmarkName('');
      setIsNewFolder(false);
      setSelectedFolderId('');
      fetchFolders();
    } catch (error) {
      console.error('Bookmark error:', error);
      toast.error('Failed to archive questions');
    }
  };

  const handleShareQuiz = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Select target students first');
      return;
    }

    setIsSharing(true);
    try {
      let quizIdToShare = savedQuizId;
      if (!quizIdToShare) {
        const savedQuiz = await handleSaveQuiz();
        if (!savedQuiz) return;
        quizIdToShare = savedQuiz.id;
      }

      // map IDs to emails if selectedStudents contains IDs from StudentTable
      const studentEmails = selectedStudents
        .map(id => students.find(s => (s.id === id) || ((s as any)._id === id))?.email)
        .filter((email): email is string => !!email);

      if (studentEmails.length === 0) {
        toast.error('Could not resolve student emails');
        return;
      }

      const response = await quizAPI.share({
        quizId: quizIdToShare,
        studentEmails
      });

      if (response.data.warning) {
        toast.warning(response.data.warning, {
          description: response.data.failed?.[0]?.reason || 'Some students could not be processed'
        });
      } else {
        toast.success('Quiz distributed successfully!');
      }

      setShareDialogOpen(false);
      setSelectedStudents([]);
    } catch (error: any) {
      console.error('Sharing failed:', error);
      const message = error.response?.data?.message || 'Sharing failed';
      toast.error(message);
    } finally {
      setIsSharing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 200 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
          <Sparkles className="w-4 h-4" />
          Assessment Builder
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
          Create <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">New Quiz</span>
        </h1>
        <p className="text-muted-foreground text-lg font-medium max-w-3xl">
          Build high-quality academic assessments manually or using our AI-assisted generation pipeline.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Module Content */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-elevated border-sidebar-border/50 overflow-hidden relative group backdrop-blur-sm bg-card/95">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Source Material
                </CardTitle>
                <CardDescription>Provide the source material for AI analysis.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className="relative group/upload"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const event = { target: { files } } as any;
                      handleFileUpload(event);
                    }
                  }}
                >
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-sidebar-border rounded-2xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all group-hover:border-primary/50">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover/upload:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Upload Reference Material
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        PDF, DOCX, TXT, or Markdown supported
                      </p>
                    </div>
                    <input type="file" className="hidden" multiple accept=".pdf,.txt,.md,.doc,.docx" onChange={handleFileUpload} />
                  </label>
                </div>

                <AnimatePresence>
                  {uploadedFiles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2"
                    >
                      {uploadedFiles.map(file => (
                        <Badge key={file.id} variant="secondary" className="pl-3 pr-1 py-1.5 rounded-lg border-sidebar-border bg-card">
                          <span className="text-xs font-bold mr-2 truncate max-w-[120px]">{file.name}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive" onClick={() => removeFile(file.id)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Direct Content Input</Label>
                  <Textarea
                    value={moduleText}
                    onChange={(e) => setModuleText(e.target.value)}
                    placeholder="Paste textbook excerpts or lecture notes here..."
                    className="min-h-[160px] bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium resize-none shadow-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Settings */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-elevated border-sidebar-border/50 overflow-hidden relative group backdrop-blur-sm bg-card/95">
              <div className="absolute top-0 left-0 w-1 h-full bg-secondary/20 group-hover:bg-secondary transition-colors" />
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-secondary" />
                  Generation Parameters
                </CardTitle>
                <CardDescription>Calibrate the AI to your specific requirements.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volume</Label>
                    <Input
                      type="number"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(e.target.value)}
                      className="bg-muted/30 h-11 font-bold border-sidebar-border focus:ring-secondary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Complexity</Label>
                    <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                      <SelectTrigger className="bg-muted/30 h-11 font-bold border-sidebar-border focus:ring-secondary/20 transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['easy', 'medium', 'hard', 'mixed'].map(d => (
                          <SelectItem key={d} value={d} className="font-bold uppercase text-[10px]">{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</Label>
                    <Select value={questionType} onValueChange={(v: any) => setQuestionType(v)}>
                      <SelectTrigger className="bg-muted/30 h-11 font-bold border-sidebar-border focus:ring-secondary/20 transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['mcq', 'short-answer', 'mixed'].map(t => (
                          <SelectItem key={t} value={t} className="font-bold uppercase text-[10px]">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Time (Min)</Label>
                    <Input
                      type="number"
                      value={quizDuration}
                      onChange={(e) => setQuizDuration(e.target.value)}
                      className="bg-muted/30 h-11 font-bold border-sidebar-border focus:ring-secondary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Custom Directives</Label>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Example: 'Focus on computational complexity' or 'Include real-world case studies'..."
                    className="min-h-[80px] bg-muted/30 border-sidebar-border font-medium italic shadow-sm"
                  />
                </div>

                <Button
                  onClick={() => handleGenerateQuestions()}
                  disabled={generating}
                  className="w-full h-14 gradient-primary shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all font-black uppercase tracking-[0.1em]"
                >
                  {generating ? (
                    <span className="flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Processing Academic Content...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Generate with AI <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-sidebar-border/50" />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 bg-card px-4">
                    Or Manual Entry
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleAddManualQuestion}
                  className="w-full h-14 border-sidebar-border/50 hover:bg-muted/30 font-black uppercase tracking-widest transition-all"
                >
                  <PlusCircle className="w-5 h-5 mr-3 text-primary" />
                  Add Question Manually
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="lg:col-span-1">
          <motion.div variants={itemVariants} className="h-full">
            <AIChatInterface onPromptSubmit={handleGenerateQuestions} isGenerating={generating} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="space-y-10"
          >
            <Card className="shadow-elevated border-sidebar-border/50 backdrop-blur-sm bg-card/95">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4 px-8">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black italic tracking-tighter uppercase">Assessment Draft</CardTitle>
                  <CardDescription className="font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    {questions.filter(q => q.isSelected).length} questions selected for deployment
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportJSON} className="font-bold uppercase text-[10px] tracking-widest h-9 px-4 border-sidebar-border shadow-sm">
                    <Download className="w-3.5 h-3.5 mr-2" /> Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const allSelected = questions.every(q => q.isSelected);
                    setQuestions(questions.map(q => ({ ...q, isSelected: !allSelected })));
                  }} className="font-bold uppercase text-[10px] tracking-widest h-9 px-4 border-sidebar-border shadow-sm">
                    {questions.every(q => q.isSelected) ? '/ Deselect All' : '/ Select All'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {questions.map((q, idx) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <QuestionEditor
                      question={q}
                      index={idx}
                      onUpdate={handleUpdateQuestion}
                      onDelete={handleDeleteQuestion}
                      onToggleBookmark={handleToggleBookmark}
                      onToggleSelect={handleToggleSelect}
                    />
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-primary text-white shadow-glow border-none overflow-hidden relative group backdrop-blur-none">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary opacity-50 group-hover:scale-110 transition-transform duration-700" />
              <CardContent className="p-10 relative z-10">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                  <div className="flex-1 space-y-6 w-full">
                    <div className="space-y-2">
                      <h3 className="text-4xl font-black tracking-tighter uppercase italic">Ready for Deployment</h3>
                      <p className="text-white/70 font-medium">Synchronize this assessment with your digital curriculum.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Quiz Designation</Label>
                        <Input
                          value={quizTitle}
                          onChange={(e) => setQuizTitle(e.target.value)}
                          placeholder="e.g. Unit 1 Advanced Research"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 font-bold focus:bg-white/20 transition-all border-2"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Optional Overview</Label>
                        <Input
                          value={quizDescription}
                          onChange={(e) => setQuizDescription(e.target.value)}
                          placeholder="Provide descriptive context..."
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 font-bold focus:bg-white/20 transition-all border-2"
                        />
                      </div>
                    </div>

                    <div className="space-y-6 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                            <CalendarClock className="w-4 h-4" /> Schedule Access Window
                          </Label>
                          <p className="text-white/50 text-[10px] font-bold uppercase">Define when students can start and finish this quiz.</p>
                        </div>
                        <Switch
                          checked={isScheduled}
                          onCheckedChange={setIsScheduled}
                          className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/20"
                        />
                      </div>

                      <AnimatePresence>
                        {isScheduled && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4"
                          >
                            <div className="space-y-4">
                              <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Start Window</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <Input
                                  type="date"
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                  className="bg-white/10 border-white/20 text-white h-12 font-bold focus:bg-white/20 transition-all cursor-pointer"
                                />
                                <Input
                                  type="time"
                                  value={startTime}
                                  onChange={(e) => setStartTime(e.target.value)}
                                  className="bg-white/10 border-white/20 text-white h-12 font-bold focus:bg-white/20 transition-all cursor-pointer"
                                />
                              </div>
                            </div>
                            <div className="space-y-4">
                              <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">End Window</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <Input
                                  type="date"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                                  className="bg-white/10 border-white/20 text-white h-12 font-bold focus:bg-white/20 transition-all cursor-pointer"
                                />
                                <Input
                                  type="time"
                                  value={endTime}
                                  onChange={(e) => setEndTime(e.target.value)}
                                  className="bg-white/10 border-white/20 text-white h-12 font-bold focus:bg-white/20 transition-all cursor-pointer"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 w-full lg:w-auto">
                    <Button
                      onClick={handleSaveQuiz}
                      disabled={saving}
                      className="bg-white text-primary hover:bg-white/90 h-14 px-10 font-bold uppercase tracking-widest shadow-xl active:scale-95 transition-all text-sm"
                    >
                      <Save className="w-5 h-5 mr-3" />
                      {saving ? 'Saving...' : 'Finalize & Save'}
                    </Button>

                    <Button
                      onClick={handleOpenBookmarkDialog}
                      variant="outline"
                      className="bg-white/5 text-secondary hover:bg-white/10 h-14 px-10 font-bold uppercase tracking-widest backdrop-blur-sm border border-secondary/20 active:scale-95 transition-all text-sm"
                    >
                      <Bookmark className="w-5 h-5 mr-3" />
                      Bookmark
                    </Button>

                    <Dialog open={bookmarkDialogOpen} onOpenChange={setBookmarkDialogOpen}>
                      <DialogContent className="bg-background border-border shadow-2xl border-2">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-foreground">Archive to Collection</DialogTitle>
                          <DialogDescription className="font-bold text-[10px] mt-2 uppercase tracking-widest text-muted-foreground">Save these questions into a folder.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Destination</Label>
                            <div className="flex gap-2">
                              <Select
                                value={selectedFolderId}
                                onValueChange={(v: string) => {
                                  setSelectedFolderId(v);
                                  if (v === 'new') setIsNewFolder(true);
                                  else setIsNewFolder(false);
                                }}
                              >
                                <SelectTrigger className="h-12 font-bold rounded-xl flex-1">
                                  <SelectValue placeholder="Choose Folder" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new" className="font-bold border-b text-primary">+ Create New Folder</SelectItem>
                                  {folders.map(f => (
                                    <SelectItem key={f._id} value={f._id} className="font-bold">{f.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {(isNewFolder || selectedFolderId === 'new') && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Folder Name</Label>
                              <Input
                                value={bookmarkName}
                                onChange={(e) => setBookmarkName(e.target.value)}
                                placeholder="e.g. Unit 1 Quiz Questions"
                                className="h-14 font-bold rounded-xl"
                                autoFocus
                              />
                            </div>
                          )}

                          <div className="flex gap-4 pt-2">
                            <Button variant="ghost" onClick={() => setBookmarkDialogOpen(false)} className="flex-1 h-12 font-black uppercase text-[10px] tracking-widest">Cancel</Button>
                            <Button onClick={handleBookmarkQuiz} className="flex-1 h-12 gradient-primary font-black uppercase tracking-widest shadow-glow">
                              Save to Folder
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="secondary" className="bg-black/20 text-white hover:bg-black/30 h-14 px-10 font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10 active:scale-95 transition-all text-sm">
                          <Share2 className="w-5 h-5 mr-3" />
                          Distribute to Students
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background border-sidebar-border shadow-2xl">
                        <DialogHeader className="p-8 bg-muted/40 border-b">
                          <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3 text-foreground">
                            <Target className="w-7 h-7 text-primary" />
                            Distribution Registry
                          </DialogTitle>
                          <DialogDescription className="font-bold text-[10px] mt-2 uppercase tracking-widest text-foreground/80">Identify student cohorts for prioritized assessment distribution.</DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto p-4 md:p-8 bg-muted/5">
                          <div className="bg-white rounded-2xl border border-sidebar-border/60 overflow-hidden shadow-sm">
                            <StudentTable
                              students={students}
                              selectedStudents={selectedStudents}
                              onSelectionChange={(ids) => setSelectedStudents(ids)}
                              showCheckboxes={true}
                            />
                          </div>
                        </div>
                        <div className="p-8 border-t bg-muted/30 flex justify-end gap-4">
                          <Button variant="ghost" onClick={() => setShareDialogOpen(false)} className="font-black uppercase text-[10px] tracking-widest px-6 h-12">Cancel Selection</Button>
                          <Button
                            onClick={handleShareQuiz}
                            disabled={isSharing || selectedStudents.length === 0}
                            className="gradient-primary h-12 px-10 font-black uppercase tracking-widest shadow-glow text-[10px]"
                          >
                            {isSharing ? 'Transmitting...' : (
                              <span className="flex items-center gap-2">Initiate Distribution <ChevronRight className="w-4 h-4" /></span>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}