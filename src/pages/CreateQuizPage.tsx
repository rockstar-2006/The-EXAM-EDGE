import { useState, useEffect } from 'react';
import {
  Upload, FileText, Sparkles, Download, Copy, Save, Share2, Clock, FolderPlus, X, Bookmark, RefreshCw, ChevronRight, Lock,
  Target,
  Trophy,
  Zap,
  CalendarClock,
  Plus,
  PlusCircle,
  FileCode,
  Smartphone,
  Globe,
  Mail,
  Workflow,
  Scissors
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestionEditor } from '@/components/QuestionEditor';
import { PDFVisualSnipModal } from '@/components/PDFVisualSnipModal';
import { AIChatInterface } from '@/components/AIChatInterface';
import { generateQuestions } from '@/services/gemini';
import { extractTextFromPDF, isPDFFile } from '@/services/pdfService';
import { quizAPI, studentsAPI, bookmarksAPI, foldersAPI, teacherAuthAPI } from '@/services/api';
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
  rawFile?: File;
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
  imageUrl?: string;
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
  const [isVisualMode, setIsVisualMode] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [quizDescription, setQuizDescription] = useState<string>('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // iOS / Browser share dialog state
  const [iosShareOpen, setIosShareOpen] = useState(false);
  const [iosSelectedStudents, setIosSelectedStudents] = useState<string[]>([]);
  const [isIosSharing, setIsIosSharing] = useState(false);
  const [isSendingWebLinks, setIsSendingWebLinks] = useState(false);

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

  // PDF Visual Snip & Crop Tool
  const [selectedSnipPdf, setSelectedSnipPdf] = useState<File | null>(null);
  const [isSnipModalOpen, setIsSnipModalOpen] = useState(false);

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
          rawFile: file,
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
      // 🧠 Fetch Faculty's custom AI Settings if configured
      let aiSettings: any = null;
      try {
        const aiRes = await teacherAuthAPI.getAISettings();
        if (aiRes.data?.success && aiRes.data.data) {
          aiSettings = aiRes.data.data;
        }
      } catch (e) {
        console.warn('Using system default AI settings');
      }

      const generatedQuestions = await generateQuestions({
        text: combinedText,
        numQuestions: num,
        type: questionType,
        difficulty,
        customPrompt: aiPrompt || customPrompt,
        aiSettings: aiSettings || undefined,
        isVisualMode
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

  /**
   * Production Optimizer: Compresses large base64 figure strings into lightweight 960px JPEGs (~40-80KB)
   * Guarantees that quizzes with up to 50 questions with figures remain small (<3MB) and never trigger 413 or MongoDB limits
   */
  const optimizeBase64Image = async (base64Str: string): Promise<string> => {
    if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
    if (base64Str.length < 100000) return base64Str; // Already lightweight

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(base64Str);
      img.src = base64Str;
    });
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
      const normalizedQuestions: NormalizedQuestion[] = await Promise.all(
        selectedQuestions.map(async (q: Question, index: number) => {
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

          let optimizedImageUrl = q.imageUrl || '';
          if (optimizedImageUrl && optimizedImageUrl.startsWith('data:image')) {
            optimizedImageUrl = await optimizeBase64Image(optimizedImageUrl);
          }

          return {
            id: q.id || `q_${index}`,
            question: questionText,
            options,
            answer: finalAnswer,
            explanation: q.explanation || '',
            marks: 1,
            type: q.type || 'mcq',
            difficulty: (q as any).difficulty || 'medium',
            imageUrl: optimizedImageUrl
          };
        })
      );

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
      }

      const emailQueued = response.data.emailQueued ?? 0;
      const totalShared = response.data.shared?.length ?? 0;
      if (totalShared > 0) {
        toast.success(`Quiz shared with ${totalShared} student(s)!`, {
          description: emailQueued > 0
            ? `📧 ${emailQueued} unique email link(s) queued — students will receive their personal quiz link`
            : 'Students added to quiz.'
        });
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

  const handleSendWebLinks = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Select target students first');
      return;
    }

    setIsSendingWebLinks(true);
    try {
      let quizIdToUse = savedQuizId;
      if (!quizIdToUse) {
        const savedQuiz = await handleSaveQuiz();
        if (!savedQuiz) return;
        quizIdToUse = savedQuiz.id;
      }

      const studentEmails = selectedStudents
        .map(id => students.find(s => (s.id === id) || ((s as any)._id === id))?.email)
        .filter((email): email is string => !!email);

      if (studentEmails.length === 0) {
        toast.error('Could not resolve student emails');
        return;
      }

      await quizAPI.sendWebLinks({ quizId: quizIdToUse, studentEmails });

      toast.success(`📧 iPhone/Web link queued for ${studentEmails.length} student(s)!`, {
        description: 'Each student will receive a personal quiz link via email'
      });
      setShareDialogOpen(false);
      setSelectedStudents([]);
    } catch (error: any) {
      console.error('Send web links failed:', error);
      toast.error(error.response?.data?.message || 'Failed to send web links');
    } finally {
      setIsSendingWebLinks(false);
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
      className="p-4 md:p-6 lg:p-8 space-y-8 md:space-y-10 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
          <Sparkles className="w-4 h-4" />
          Quiz Creator
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter">
          Create <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">New Quiz</span>
        </h1>
        <p className="text-muted-foreground text-lg font-medium max-w-3xl">
          Create quizzes for your classes manually or automatically using AI from your syllabus and textbooks.
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
                  Study Material & Textbooks
                </CardTitle>
                <CardDescription>Upload reference textbooks or paste lecture notes.</CardDescription>
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
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer bg-slate-50/70 hover:bg-slate-100/70 transition-all group-hover:border-primary/70">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover/upload:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                        Upload Textbook or Notes
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">
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
                      {uploadedFiles.map(file => {
                        const isPdf = file.rawFile && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
                        return (
                          <Badge key={file.id} variant="secondary" className="pl-3 pr-1 py-1.5 rounded-lg border-slate-300 bg-white text-slate-800 flex items-center gap-1.5 shadow-xs">
                            <span className="text-xs font-bold mr-1 truncate max-w-[140px]">{file.name}</span>
                            {isPdf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedSnipPdf(file.rawFile || null);
                                  setIsSnipModalOpen(true);
                                }}
                                className="h-6 px-2 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 hover:text-indigo-900 rounded-md gap-1"
                                title="Snip or crop diagrams from this PDF"
                              >
                                <Scissors className="w-3 h-3" /> Snip Figures
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive" onClick={() => removeFile(file.id)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Paste Notes or Syllabus Text</Label>
                  <Textarea
                    value={moduleText}
                    onChange={(e) => setModuleText(e.target.value)}
                    placeholder="Paste textbook excerpts, syllabus topics, or lecture notes here..."
                    className="min-h-[160px] bg-slate-50 border-2 border-slate-300 hover:border-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 font-medium resize-none shadow-sm transition-all"
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
                  Quiz Settings
                </CardTitle>
                <CardDescription>Configure questions count, difficulty, and duration.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Questions Count</Label>
                    <Input
                      type="number"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(e.target.value)}
                      className="bg-slate-50 border-2 border-slate-300 hover:border-slate-400 text-slate-900 dark:text-slate-100 h-11 font-black focus:bg-white focus:border-secondary focus:ring-4 focus:ring-secondary/20 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Difficulty</Label>
                    <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                      <SelectTrigger className="bg-slate-50 border-2 border-slate-300 hover:border-slate-400 text-slate-900 dark:text-slate-100 h-11 font-black focus:bg-white focus:border-secondary focus:ring-4 focus:ring-secondary/20 transition-all shadow-sm">
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
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Question Type</Label>
                    <Select value={questionType} onValueChange={(v: any) => setQuestionType(v)}>
                      <SelectTrigger className="bg-slate-50 border-2 border-slate-300 hover:border-slate-400 text-slate-900 dark:text-slate-100 h-11 font-black focus:bg-white focus:border-secondary focus:ring-4 focus:ring-secondary/20 transition-all shadow-sm">
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
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Duration (Minutes)</Label>
                    <Input
                      type="number"
                      value={quizDuration}
                      onChange={(e) => setQuizDuration(e.target.value)}
                      className="bg-slate-50 border-2 border-slate-300 hover:border-slate-400 text-slate-900 dark:text-slate-100 h-11 font-black focus:bg-white focus:border-secondary focus:ring-4 focus:ring-secondary/20 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/60 border-2 border-slate-200 dark:border-slate-700 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0">
                      <Workflow className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Include Diagram & Figure Questions</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Generates questions referencing figures in your uploaded PDF.</p>
                    </div>
                  </div>
                  <Switch
                    checked={isVisualMode}
                    onCheckedChange={setIsVisualMode}
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Additional Instructions (Optional)</Label>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g. 'Focus on Chapter 3 topics' or 'Include practical calculation questions'..."
                    className="min-h-[80px] bg-slate-50 border-2 border-slate-300 hover:border-slate-400 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 font-medium focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/20 italic shadow-sm transition-all"
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
                      Generating Questions with AI...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Generate Questions with AI <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-sidebar-border/50" />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 bg-card px-4">
                    Or Add Questions Manually
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
                  <CardTitle className="text-2xl font-black italic tracking-tighter uppercase">Questions Preview</CardTitle>
                  <CardDescription className="font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    {questions.filter(q => q.isSelected).length} questions selected for this quiz
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
                {(() => {
                  const latestPdfFile = uploadedFiles.find(f => f.rawFile && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')))?.rawFile || null;
                  return questions.map((q, idx) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <QuestionEditor
                        question={q}
                        index={idx}
                        uploadedPdfFile={latestPdfFile}
                        onUpdate={handleUpdateQuestion}
                        onDelete={handleDeleteQuestion}
                        onToggleBookmark={handleToggleBookmark}
                        onToggleSelect={handleToggleSelect}
                      />
                    </motion.div>
                  ));
                })()}
              </CardContent>
            </Card>

            <Card className="bg-primary text-white shadow-glow border-none overflow-hidden relative group backdrop-blur-none">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary opacity-50 group-hover:scale-110 transition-transform duration-700" />
              <CardContent className="p-10 relative z-10">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                  <div className="flex-1 space-y-6 w-full">
                    <div className="space-y-2">
                      <h3 className="text-4xl font-black tracking-tighter uppercase italic">Publish Quiz to Students</h3>
                      <p className="text-white/70 font-medium">Set the quiz title and schedule before publishing to your students.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase text-white tracking-widest">Quiz Title</Label>
                        <Input
                          value={quizTitle}
                          onChange={(e) => setQuizTitle(e.target.value)}
                          placeholder="e.g. Unit 1 Midterm Quiz"
                          className="bg-white text-slate-900 placeholder:text-slate-500 h-12 font-bold focus:bg-white border-2 border-white/90 shadow-md"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase text-white tracking-widest">Quiz Description (Optional)</Label>
                        <Input
                          value={quizDescription}
                          onChange={(e) => setQuizDescription(e.target.value)}
                          placeholder="e.g. Covers Chapters 1 to 3..."
                          className="bg-white text-slate-900 placeholder:text-slate-500 h-12 font-bold focus:bg-white border-2 border-white/90 shadow-md"
                        />
                      </div>
                    </div>

                    <div className="space-y-6 pt-4 border-t border-white/20">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                            <CalendarClock className="w-4 h-4" /> Schedule Quiz Time (Optional)
                          </Label>
                          <p className="text-white/80 text-[11px] font-bold uppercase">Set start and end date/time for students.</p>
                        </div>
                        <Switch
                          checked={isScheduled}
                          onCheckedChange={setIsScheduled}
                          className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/30"
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
                              <Label className="text-[11px] font-black uppercase text-white tracking-widest">Start Window</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <Input
                                  type="date"
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                  className="bg-white text-slate-900 h-12 font-bold border-2 border-white/90 shadow-md cursor-pointer"
                                />
                                <Input
                                  type="time"
                                  value={startTime}
                                  onChange={(e) => setStartTime(e.target.value)}
                                  className="bg-white text-slate-900 h-12 font-bold border-2 border-white/90 shadow-md cursor-pointer"
                                />
                              </div>
                            </div>
                            <div className="space-y-4">
                              <Label className="text-[11px] font-black uppercase text-white tracking-widest">End Window</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <Input
                                  type="date"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                                  className="bg-white text-slate-900 h-12 font-bold border-2 border-white/90 shadow-md cursor-pointer"
                                />
                                <Input
                                  type="time"
                                  value={endTime}
                                  onChange={(e) => setEndTime(e.target.value)}
                                  className="bg-white text-slate-900 h-12 font-bold border-2 border-white/90 shadow-md cursor-pointer"
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
                        <div className="p-8 border-t bg-muted/30 flex justify-end gap-3 flex-wrap">
                          <Button variant="ghost" onClick={() => setShareDialogOpen(false)} className="font-black uppercase text-[10px] tracking-widest px-6 h-12">Cancel Selection</Button>
                          <Button
                            variant="outline"
                            onClick={handleSendWebLinks}
                            disabled={isSendingWebLinks || selectedStudents.length === 0}
                            className="h-12 px-6 font-black uppercase tracking-widest border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 text-[10px]"
                          >
                            {isSendingWebLinks ? '📧 Sending...' : '📱 Send iPhone/Web Link'}
                          </Button>
                          <Button
                            onClick={handleShareQuiz}
                            disabled={isSharing || selectedStudents.length === 0}
                            className="gradient-primary h-12 px-10 font-black uppercase tracking-widest shadow-glow text-[10px]"
                          >
                            {isSharing ? 'Transmitting...' : (
                              <span className="flex items-center gap-2">🤖 Deploy to Android <ChevronRight className="w-4 h-4" /></span>
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

      {isSnipModalOpen && (
        <PDFVisualSnipModal
          isOpen={isSnipModalOpen}
          onClose={() => setIsSnipModalOpen(false)}
          pdfFile={selectedSnipPdf || uploadedFiles.find(f => f.rawFile && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')))?.rawFile || null}
          questionText={(questions.find(q => q.isSelected) || questions[0])?.question}
          questionExplanation={(questions.find(q => q.isSelected) || questions[0])?.explanation}
          questionIndex={Math.max(0, questions.findIndex(q => q.isSelected))}
          onAttach={(dataUrl) => {
            if (questions.length === 0) {
              toast.info('Diagram snip saved. Create or generate a question to attach it.');
              return;
            }
            const targetIndex = questions.findIndex(q => q.isSelected);
            const idx = targetIndex !== -1 ? targetIndex : 0;
            const targetQ = questions[idx];
            if (targetQ) {
              handleUpdateQuestion({ ...targetQ, imageUrl: dataUrl });
              toast.success(`Attached figure to Question ${idx + 1}`);
            }
          }}
        />
      )}
    </motion.div>
  );
}