import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Globe,
  Copy,
  ExternalLink,
  Share2,
  Check,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Layers,
  Settings,
  Trash2,
  Plus,
  Eye,
  Users,
  Award,
  Clock,
  ArrowRight,
  Search,
  FileText,
  Shield,
  GraduationCap,
  User,
  Radio,
  FileQuestion,
  RefreshCw,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { quizAPI, foldersAPI, bookmarksAPI, publicQuizAPI } from '@/services/api';

interface QuestionItem {
  id?: string;
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
  marks?: number;
  type?: 'mcq' | 'short-answer';
}

export default function PublicQuizCreatorPage() {
  const navigate = useNavigate();

  // Active Top Tab
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  // Source selection method: 'bookmarks' | 'existing' | 'scratch'
  const [sourceMode, setSourceMode] = useState<'bookmarks' | 'existing' | 'scratch'>('bookmarks');

  // Loading states
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Data collections
  const [folders, setFolders] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [existingQuizzes, setExistingQuizzes] = useState<any[]>([]);
  const [publicQuizzesList, setPublicQuizzesList] = useState<any[]>([]);

  // Selected source items
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedExistingQuizId, setSelectedExistingQuizId] = useState<string>('');

  // Current Quiz Form State
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('Public proctored assessment for browser examination.');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      question: 'Sample Question 1',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 'Option A',
      explanation: '',
      marks: 1,
      type: 'mcq'
    }
  ]);

  // AI prompt helper
  const [aiTopic, setAiTopic] = useState('');
  const [aiQuestionCount, setAiQuestionCount] = useState('5');

  // Student Registration Form Customizer State
  const [requireName, setRequireName] = useState(true);
  const [nameLabel, setNameLabel] = useState('Full Name');
  const [namePlaceholder, setNamePlaceholder] = useState('Enter student full name');

  const [requireRollNo, setRequireRollNo] = useState(true);
  const [rollNoLabel, setRollNoLabel] = useState('Roll Number / USN / Reg No');
  const [rollNoPlaceholder, setRollNoPlaceholder] = useState('e.g. 4SO21CS001 or ROLL-24');

  const [requireAcademicLevel, setRequireAcademicLevel] = useState(true);
  const [academicLevelLabel, setAcademicLevelLabel] = useState('Class / Academic Level');
  const [academicLevels, setAcademicLevels] = useState<string[]>([
    'High School (8th - 10th)',
    '1st PUC / 11th Grade',
    '2nd PUC / 12th Grade',
    'Diploma',
    'Undergraduate (B.Tech / B.Sc / B.Com)',
    'Postgraduate / Masters',
    'Other'
  ]);
  const [newAcademicOption, setNewAcademicOption] = useState('');

  const [requireBranch, setRequireBranch] = useState(false);
  const [branchLabel, setBranchLabel] = useState('Stream / Department / Branch');
  const [branchPlaceholder, setBranchPlaceholder] = useState('e.g. Science / PCMB / Commerce / CS');

  const [requireSection, setRequireSection] = useState(false);
  const [sectionLabel, setSectionLabel] = useState('Section / Division');
  const [sectionPlaceholder, setSectionPlaceholder] = useState('e.g. Section A');

  const [requireEmail, setRequireEmail] = useState(false);
  const [allowInstantResults, setAllowInstantResults] = useState(true);

  // Resulting Generated Public Quiz Link
  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoadingInitial(true);
    try {
      const [foldersRes, bookmarksRes, quizzesRes] = await Promise.all([
        foldersAPI.getAll().catch(() => ({ data: [] })),
        bookmarksAPI.getAll().catch(() => ({ data: [] })),
        quizAPI.getAll().catch(() => ({ data: [] }))
      ]);

      const rawF = foldersRes.data?.folders || foldersRes.data;
      const fList = Array.isArray(rawF) ? rawF : [];

      const rawB = bookmarksRes.data?.bookmarks || bookmarksRes.data;
      const bList = Array.isArray(rawB) ? rawB : [];

      const rawQ = quizzesRes.data?.quizzes || quizzesRes.data;
      const qList = Array.isArray(rawQ) ? rawQ : [];

      setFolders(fList);
      setBookmarks(bList);
      setExistingQuizzes(qList);

      // Filter quizzes that have public links enabled or sort all
      setPublicQuizzesList(qList);

      // Auto select first folder if available
      if (fList.length > 0 && !selectedFolderId) {
        handleSelectFolder(fList[0]._id, fList, bList);
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Folder selection handler: loads all questions from this bookmark folder
  const handleSelectFolder = (folderId: string, folderList = folders, bookmarkList = bookmarks) => {
    setSelectedFolderId(folderId);
    const fArr = Array.isArray(folderList) ? folderList : [];
    const targetFolder = fArr.find((f: any) => f._id === folderId);
    if (!targetFolder) return;

    setQuizTitle(targetFolder.name);

    const bArr = Array.isArray(bookmarkList) ? bookmarkList : [];
    const folderQuestions = bArr
      .filter((b: any) => {
        const bFId = b.folderId && typeof b.folderId === 'object' ? b.folderId._id : b.folderId;
        return bFId === folderId && b.question;
      })
      .map((b: any) => {
        const q = b.question;
        return {
          question: q.question || '',
          options: Array.isArray(q.options)
            ? q.options.map((o: any) => typeof o === 'object' && o !== null ? o.text : String(o))
            : ['A', 'B', 'C', 'D'],
          answer: q.correctAnswer || q.answer || (q.options?.[0] ? (typeof q.options[0] === 'object' ? q.options[0].text : q.options[0]) : ''),
          explanation: q.explanation || '',
          marks: q.marks || 1,
          type: q.type || 'mcq'
        };
      });

    if (folderQuestions.length > 0) {
      setQuestions(folderQuestions);
      setDurationMinutes(String(Math.max(10, folderQuestions.length * 2)));
    } else {
      toast.info(`Folder "${targetFolder.name}" has no questions yet. You can add questions below.`);
    }
  };

  // Existing quiz selection handler
  const handleSelectExistingQuiz = (quizId: string) => {
    setSelectedExistingQuizId(quizId);
    const qList = Array.isArray(existingQuizzes) ? existingQuizzes : [];
    const qz = qList.find((q: any) => q._id === quizId);
    if (!qz) return;

    setQuizTitle(qz.title);
    setQuizDescription(qz.description || 'Public proctored assessment.');
    setDurationMinutes(String(qz.duration || 30));

    if (qz.questions && Array.isArray(qz.questions)) {
      setQuestions(qz.questions.map((q: any) => ({
        question: q.question || '',
        options: Array.isArray(q.options)
          ? q.options.map((o: any) => typeof o === 'object' && o !== null ? o.text : String(o))
          : ['A', 'B', 'C', 'D'],
        answer: q.correctAnswer || q.answer || '',
        explanation: q.explanation || '',
        marks: q.marks || 1,
        type: q.type || 'mcq'
      })));
    }

    // If quiz already has config, restore it
    if (qz.publicRegistrationConfig) {
      const cfg = qz.publicRegistrationConfig;
      if (cfg.nameLabel) setNameLabel(cfg.nameLabel);
      if (cfg.requireRollNo !== undefined) setRequireRollNo(cfg.requireRollNo);
      if (cfg.rollNoLabel) setRollNoLabel(cfg.rollNoLabel);
      if (cfg.requireAcademicLevel !== undefined) setRequireAcademicLevel(cfg.requireAcademicLevel);
      if (cfg.academicLevelLabel) setAcademicLevelLabel(cfg.academicLevelLabel);
      if (Array.isArray(cfg.academicLevels) && cfg.academicLevels.length > 0) {
        setAcademicLevels(cfg.academicLevels);
      }
      if (cfg.requireBranch !== undefined) setRequireBranch(cfg.requireBranch);
      if (cfg.branchLabel) setBranchLabel(cfg.branchLabel);
      if (cfg.requireSection !== undefined) setRequireSection(cfg.requireSection);
      if (cfg.sectionLabel) setSectionLabel(cfg.sectionLabel);
      if (cfg.requireEmail !== undefined) setRequireEmail(cfg.requireEmail);
      if (cfg.allowInstantResults !== undefined) setAllowInstantResults(cfg.allowInstantResults);
    }
  };

  // Add question manually
  const handleAddQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        question: `Question ${prev.length + 1}`,
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        answer: 'Option 1',
        explanation: '',
        marks: 1,
        type: 'mcq'
      }
    ]);
  };

  // Remove question
  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      toast.error('Quiz must have at least 1 question');
      return;
    }
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  // Update question field
  const handleUpdateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(prev => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
      return next;
    });
  };

  // Update option text
  const handleUpdateOption = (qIdx: number, oIdx: number, text: string) => {
    setQuestions(prev => {
      const next = [...prev];
      const nextOptions = [...next[qIdx].options];
      const oldVal = nextOptions[oIdx];
      nextOptions[oIdx] = text;
      next[qIdx].options = nextOptions;
      if (next[qIdx].answer === oldVal) {
        next[qIdx].answer = text;
      }
      return next;
    });
  };

  // Add academic level option
  const handleAddAcademicOption = () => {
    const trimmed = newAcademicOption.trim();
    if (!trimmed) return;
    if (academicLevels.includes(trimmed)) {
      toast.error('This class/level already exists');
      return;
    }
    setAcademicLevels(prev => [...prev, trimmed]);
    setNewAcademicOption('');
    toast.success(`Added "${trimmed}" to class dropdown`);
  };

  const handleRemoveAcademicOption = (option: string) => {
    if (academicLevels.length <= 1) {
      toast.error('Keep at least 1 academic level option');
      return;
    }
    setAcademicLevels(prev => prev.filter(o => o !== option));
  };

  // Submit & Generate Public Link
  const handleGeneratePublicLink = async () => {
    if (!quizTitle.trim()) {
      toast.error('Please enter a Quiz Title');
      return;
    }
    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    setIsGenerating(true);
    try {
      const publicConfig = {
        requireName: true,
        nameLabel: nameLabel.trim() || 'Full Name',
        namePlaceholder: namePlaceholder.trim(),
        requireRollNo,
        rollNoLabel: rollNoLabel.trim() || 'Roll Number / USN',
        rollNoPlaceholder: rollNoPlaceholder.trim(),
        requireAcademicLevel,
        academicLevelLabel: academicLevelLabel.trim() || 'Class / Academic Level',
        academicLevels,
        requireBranch,
        branchLabel: branchLabel.trim() || 'Stream / Department',
        branchPlaceholder: branchPlaceholder.trim(),
        requireSection,
        sectionLabel: sectionLabel.trim() || 'Section / Division',
        sectionPlaceholder: sectionPlaceholder.trim(),
        requireEmail,
        allowInstantResults
      };

      const normalizedQuestions = questions.map((q, i) => ({
        question: q.question.trim() || `Question ${i + 1}`,
        options: q.options.map(o => String(o || '').trim()).filter(Boolean),
        answer: q.answer.trim() || q.options[0],
        explanation: q.explanation || '',
        marks: q.marks || 1,
        type: q.type || 'mcq',
        isSelected: true
      }));

      const payload = {
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        duration: parseInt(durationMinutes) || 30,
        questions: normalizedQuestions,
        difficulty: 'medium',
        questionType: 'mcq',
        isPublicLinkEnabled: true,
        publicRegistrationConfig: publicConfig
      };

      let quizId = '';
      if (sourceMode === 'existing' && selectedExistingQuizId) {
        const updateRes = await quizAPI.update(selectedExistingQuizId, payload);
        quizId = selectedExistingQuizId;
        // Also update config endpoint
        await publicQuizAPI.updatePublicConfig(quizId, {
          isPublicLinkEnabled: true,
          publicRegistrationConfig: publicConfig
        });
      } else {
        const saveRes = await quizAPI.save(payload);
        quizId = saveRes.data.quizId || saveRes.data.quiz?._id;
        if (quizId) {
          await publicQuizAPI.updatePublicConfig(quizId, {
            isPublicLinkEnabled: true,
            publicRegistrationConfig: publicConfig
          });
        }
      }

      if (!quizId) throw new Error('Failed to retrieve Quiz ID from server');

      setGeneratedQuizId(quizId);
      const publicUrl = getPublicLink(quizId);

      await navigator.clipboard.writeText(publicUrl);
      setCopiedId(quizId);
      setTimeout(() => setCopiedId(null), 4000);

      toast.success('🎉 Public Proctored Web Quiz Created & Copied!', {
        description: 'Students can open this link in any desktop browser without logging in.'
      });

      // Refresh list
      loadAllData();
    } catch (err: any) {
      console.error('Failed to generate public quiz', err);
      toast.error(err.message || 'Failed to generate public quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPublicLink = (id: string) => {
    const isDesktopOrCap = typeof window !== 'undefined' && (
      Boolean((window as any).desktopSecurity) || 
      window.location.pathname.endsWith('.html')
    );
    return isDesktopOrCap 
      ? `${window.location.origin}/#/quiz/public/${id}`
      : `${window.location.origin}/quiz/public/${id}`;
  };

  const handleCopyLink = async (id: string) => {
    const url = getPublicLink(id);
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('🌐 Public Exam Link Copied!');
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-10 space-y-8 max-w-[1600px] mx-auto">

      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">
            <Globe className="w-4 h-4" /> Open Browser Assessments
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase italic text-foreground flex items-center gap-3">
            <span>Public Web</span>
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-primary bg-clip-text text-transparent">
              Quiz Creator
            </span>
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-2 max-w-3xl leading-relaxed">
            Generate proctored public links for any desktop or browser. Customize the student registration form (Name, Roll Number, Class/Level like High School & PUC) and share the URL directly without creating student accounts.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-2xl border border-border/60">
          <Button
            type="button"
            variant={activeTab === 'create' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('create')}
            className={cn(
              "font-bold text-xs uppercase tracking-wider rounded-xl h-10 px-4 gap-2",
              activeTab === 'create' && "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
            )}
          >
            <Plus className="w-4 h-4" />
            <span>Create Public Link</span>
          </Button>
          <Button
            type="button"
            variant={activeTab === 'manage' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('manage')}
            className={cn(
              "font-bold text-xs uppercase tracking-wider rounded-xl h-10 px-4 gap-2",
              activeTab === 'manage' && "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
            )}
          >
            <Layers className="w-4 h-4" />
            <span>Active Links ({publicQuizzesList.length})</span>
          </Button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="space-y-8 animate-in fade-in duration-300">

          {/* STEP 1: CHOOSE QUIZ SOURCE */}
          <Card className="border-border/60 shadow-sm rounded-3xl overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                    Select Question Source
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">
                    Choose questions from your saved Bookmarks, an existing quiz, or build manually.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Source Mode Selector Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSourceMode('bookmarks')}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3",
                    sourceMode === 'bookmarks'
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm"
                      : "border-border/60 hover:border-border hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    {sourceMode === 'bookmarks' && (
                      <Badge className="bg-indigo-600 text-white text-[10px]">Active</Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm uppercase">From Bookmarks</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Use questions from your Question Folders</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode('existing')}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3",
                    sourceMode === 'existing'
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm"
                      : "border-border/60 hover:border-border hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    {sourceMode === 'existing' && (
                      <Badge className="bg-indigo-600 text-white text-[10px]">Active</Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm uppercase">Existing Quiz</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Publish a previously created quiz</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode('scratch')}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3",
                    sourceMode === 'scratch'
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm"
                      : "border-border/60 hover:border-border hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </div>
                    {sourceMode === 'scratch' && (
                      <Badge className="bg-indigo-600 text-white text-[10px]">Active</Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm uppercase">Create Directly</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Type questions or use AI assistant</p>
                  </div>
                </button>
              </div>

              {/* Source Mode Pickers */}
              {sourceMode === 'bookmarks' && (
                <div className="p-5 rounded-2xl bg-muted/20 border border-border/50 space-y-4">
                  <Label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Select Question Collection Folder
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(Array.isArray(folders) ? folders : []).map(folder => {
                      const count = Array.isArray(bookmarks) ? bookmarks.filter(b => {
                        const bFId = b.folderId && typeof b.folderId === 'object' ? b.folderId._id : b.folderId;
                        return bFId === folder._id && b.question;
                      }).length : 0;

                      const isSelected = selectedFolderId === folder._id;
                      return (
                        <div
                          key={folder._id}
                          onClick={() => handleSelectFolder(folder._id)}
                          className={cn(
                            "p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/30 font-bold"
                              : "border-border/60 hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen className={cn("w-4 h-4", isSelected ? "text-indigo-600" : "text-muted-foreground")} />
                            <span className="text-xs font-bold truncate max-w-[170px]">{folder.name}</span>
                          </div>
                          <Badge variant={isSelected ? "default" : "secondary"} className="text-[10px]">
                            {count} Qs
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {sourceMode === 'existing' && (
                <div className="p-5 rounded-2xl bg-muted/20 border border-border/50 space-y-3">
                  <Label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Choose from Saved Quizzes
                  </Label>
                  <Select value={selectedExistingQuizId} onValueChange={handleSelectExistingQuiz}>
                    <SelectTrigger className="h-12 bg-background font-bold text-xs rounded-xl">
                      <SelectValue placeholder="Select a quiz to create public link..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(existingQuizzes) ? existingQuizzes : []).map(q => (
                        <SelectItem key={q._id} value={q._id} className="font-bold text-xs">
                          {q.title} ({q.questions?.length || 0} Questions, {q.duration || 30} mins)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quiz Basic Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Public Quiz Title</Label>
                  <Input
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="e.g. Unit 2 Mid-Term Proctored Examination"
                    className="h-12 font-bold text-sm rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Duration (Minutes)</Label>
                  <Input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="h-12 font-bold text-sm rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: STUDENT REGISTRATION FORM CUSTOMIZER & LIVE PREVIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left: Form Configuration Textboxes */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-border/60 shadow-sm rounded-3xl overflow-hidden bg-card">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                        Student Entry Form Settings
                      </CardTitle>
                      <CardDescription className="text-xs font-medium">
                        Configure the exact fields and text boxes students must fill before starting the exam.
                      </CardDescription>
                    </div>
                    <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-[10px]">
                      Google Forms Mode
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">

                  {/* Field: Full Name */}
                  <div className="p-4 rounded-2xl border border-border/60 bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-black uppercase tracking-wider">Student Name Field</span>
                      </div>
                      <Badge variant="secondary" className="text-[9px] uppercase font-bold">Always Required</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Box Label</Label>
                        <Input
                          value={nameLabel}
                          onChange={(e) => setNameLabel(e.target.value)}
                          placeholder="Full Name"
                          className="h-10 text-xs font-bold rounded-xl mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Placeholder</Label>
                        <Input
                          value={namePlaceholder}
                          onChange={(e) => setNamePlaceholder(e.target.value)}
                          placeholder="e.g. Enter your complete name"
                          className="h-10 text-xs font-medium rounded-xl mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field: Roll Number / USN */}
                  <div className="p-4 rounded-2xl border border-border/60 bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-black uppercase tracking-wider">Roll Number / USN</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="require-roll" className="text-xs font-bold cursor-pointer">
                          {requireRollNo ? 'Required' : 'Optional'}
                        </Label>
                        <Switch
                          id="require-roll"
                          checked={requireRollNo}
                          onCheckedChange={setRequireRollNo}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Box Label</Label>
                        <Input
                          value={rollNoLabel}
                          onChange={(e) => setRollNoLabel(e.target.value)}
                          placeholder="Roll Number / USN / Reg No"
                          className="h-10 text-xs font-bold rounded-xl mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Placeholder</Label>
                        <Input
                          value={rollNoPlaceholder}
                          onChange={(e) => setRollNoPlaceholder(e.target.value)}
                          placeholder="e.g. 4SO21CS001"
                          className="h-10 text-xs font-medium rounded-xl mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field: Academic Level / Year (PUC / High School / Degree) */}
                  <div className="p-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                            Academic Level Dropdown (PUC, High School, etc.)
                          </span>
                          <p className="text-[10px] text-muted-foreground">Students select their grade or college year</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="require-acad" className="text-xs font-bold cursor-pointer">
                          {requireAcademicLevel ? 'Required' : 'Optional'}
                        </Label>
                        <Switch
                          id="require-acad"
                          checked={requireAcademicLevel}
                          onCheckedChange={setRequireAcademicLevel}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Dropdown Label</Label>
                      <Input
                        value={academicLevelLabel}
                        onChange={(e) => setAcademicLevelLabel(e.target.value)}
                        placeholder="Class / Academic Level"
                        className="h-10 text-xs font-bold rounded-xl mt-1"
                      />
                    </div>

                    {/* Academic options manager */}
                    <div className="space-y-2 pt-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Dropdown Options List ({academicLevels.length} Options)
                      </Label>
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-background rounded-xl border border-border/50">
                        {academicLevels.map((opt) => (
                          <Badge
                            key={opt}
                            variant="secondary"
                            className="pl-2.5 pr-1 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-muted"
                          >
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAcademicOption(opt)}
                              className="w-4 h-4 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground transition-colors"
                            >
                              &times;
                            </button>
                          </Badge>
                        ))}
                      </div>

                      {/* Add new option */}
                      <div className="flex gap-2 pt-1">
                        <Input
                          value={newAcademicOption}
                          onChange={(e) => setNewAcademicOption(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddAcademicOption();
                            }
                          }}
                          placeholder="Type new option (e.g. 1st PUC Science, 10th ICSE)..."
                          className="h-9 text-xs rounded-xl"
                        />
                        <Button
                          type="button"
                          onClick={handleAddAcademicOption}
                          className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shrink-0 gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Field: Branch & Section Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Branch */}
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">Ask Department/Branch</Label>
                        <Switch checked={requireBranch} onCheckedChange={setRequireBranch} />
                      </div>
                      {requireBranch && (
                        <Input
                          value={branchLabel}
                          onChange={(e) => setBranchLabel(e.target.value)}
                          placeholder="Field Label"
                          className="h-9 text-xs mt-1"
                        />
                      )}
                    </div>

                    {/* Section */}
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">Ask Section/Division</Label>
                        <Switch checked={requireSection} onCheckedChange={setRequireSection} />
                      </div>
                      {requireSection && (
                        <Input
                          value={sectionLabel}
                          onChange={(e) => setSectionLabel(e.target.value)}
                          placeholder="Field Label"
                          className="h-9 text-xs mt-1"
                        />
                      )}
                    </div>
                  </div>

                  {/* Instant Results Toggle */}
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">Instant Score & Result Review</p>
                      <p className="text-[11px] text-muted-foreground">Show student their score and answers immediately upon submission</p>
                    </div>
                    <Switch checked={allowInstantResults} onCheckedChange={setAllowInstantResults} />
                  </div>

                </CardContent>
              </Card>

              {/* STEP 3: QUESTIONS REVIEW & ADD */}
              <Card className="border-border/60 shadow-sm rounded-3xl overflow-hidden bg-card">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                        Quiz Questions ({questions.length})
                      </CardTitle>
                      <CardDescription className="text-xs font-medium">
                        Verify and edit question content before generating public link.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddQuestion}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl gap-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                  {questions.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-border/60 bg-muted/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
                          Question {idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <Textarea
                        value={q.question}
                        onChange={(e) => handleUpdateQuestion(idx, 'question', e.target.value)}
                        placeholder="Type question text..."
                        className="min-h-[60px] text-xs font-medium bg-background rounded-xl resize-none"
                      />

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${idx}`}
                              checked={q.answer === opt}
                              onChange={() => handleUpdateQuestion(idx, 'answer', opt)}
                              className="accent-indigo-600 w-4 h-4 cursor-pointer"
                              title="Select as correct answer"
                            />
                            <Input
                              value={opt}
                              onChange={(e) => handleUpdateOption(idx, oIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                              className={cn(
                                "h-9 text-xs rounded-xl font-medium",
                                q.answer === opt && "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-bold"
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* GENERATE PUBLIC LINK BUTTON */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleGeneratePublicLink}
                  disabled={isGenerating}
                  className="w-full h-16 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-600/25 active:scale-[0.99] transition-all gap-3"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Generating Public Exam Link...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-5 h-5 text-indigo-200" />
                      <span>Generate & Copy Public Web Exam Link</span>
                    </>
                  )}
                </Button>
              </div>

            </div>

            {/* Right: Live Interactive Student Preview & Output Card */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">

              {/* GENERATED LINK OUTPUT CARD (when created) */}
              {generatedQuizId && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-2xl border border-indigo-500/30 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-green-500 text-white flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider">Public Exam Link Ready</h3>
                      <p className="text-[11px] text-indigo-200">Share with students on any browser</p>
                    </div>
                  </div>

                  <div className="bg-black/40 p-3 rounded-xl border border-white/10 font-mono text-xs break-all select-all text-indigo-200">
                    {getPublicLink(generatedQuizId)}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      type="button"
                      onClick={() => handleCopyLink(generatedQuizId)}
                      className="flex-1 h-11 bg-white hover:bg-slate-100 text-indigo-950 font-bold text-xs rounded-xl gap-2 shadow-sm"
                    >
                      {copiedId === generatedQuizId ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          <span>Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-indigo-600" />
                          <span>Copy Public Link</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open(getPublicLink(generatedQuizId), '_blank')}
                      className="h-11 px-4 border-white/20 text-white hover:bg-white/10 font-bold text-xs rounded-xl gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Test as Student</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-indigo-300">
                    <button
                      type="button"
                      onClick={() => {
                        const url = getPublicLink(generatedQuizId);
                        const msg = encodeURIComponent(`Please attend the proctored assessment "${quizTitle}": ${url}`);
                        window.open(`https://wa.me/?text=${msg}`, '_blank');
                      }}
                      className="flex items-center gap-1.5 hover:text-white transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Share via WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/quiz/${generatedQuizId}/results`)}
                      className="flex items-center gap-1.5 hover:text-white transition-colors font-bold underline"
                    >
                      <span>View Live Submissions &rarr;</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* LIVE STUDENT PREVIEW CARD */}
              <Card className="border-border/60 shadow-lg rounded-3xl overflow-hidden bg-card">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/20 border-b border-border/40 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-indigo-600" />
                      <CardTitle className="text-xs font-black uppercase tracking-wider">
                        Live Student Preview
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
                      Real-time Browser View
                    </Badge>
                  </div>
                  <CardDescription className="text-[11px]">
                    This is the registration screen students see before the exam starts:
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-5 bg-gradient-to-b from-muted/10 to-transparent">

                  {/* Fake Exam Header */}
                  <div className="text-center pb-3 border-b border-border/40 space-y-1">
                    <h4 className="font-extrabold text-base text-foreground">
                      {quizTitle || 'Your Quiz Title Here'}
                    </h4>
                    <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        {durationMinutes} Minutes
                      </span>
                      <span>•</span>
                      <span>{questions.length} Questions</span>
                    </div>
                  </div>

                  {/* Anti-cheat lockdown notice */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center gap-2 text-xs">
                    <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Fullscreen exam with tab-switch tracking enabled</span>
                  </div>

                  {/* Dynamic Form Preview */}
                  <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        {nameLabel || 'Full Name'} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        disabled
                        placeholder={namePlaceholder || 'Enter student full name'}
                        className="h-10 text-xs bg-background/50 cursor-not-allowed"
                      />
                    </div>

                    {/* Roll No */}
                    {requireRollNo && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <Label className="text-xs font-bold text-foreground">
                          {rollNoLabel || 'Roll Number / USN'} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          disabled
                          placeholder={rollNoPlaceholder || 'e.g. 4SO21CS001'}
                          className="h-10 text-xs bg-background/50 cursor-not-allowed"
                        />
                      </div>
                    )}

                    {/* Academic Level */}
                    {requireAcademicLevel && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <Label className="text-xs font-bold text-foreground">
                          {academicLevelLabel || 'Class / Academic Level'} <span className="text-destructive">*</span>
                        </Label>
                        <Select disabled>
                          <SelectTrigger className="h-10 text-xs bg-background/50 cursor-not-allowed">
                            <SelectValue placeholder="Select class / year..." />
                          </SelectTrigger>
                          <SelectContent>
                            {academicLevels.map((lvl) => (
                              <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          Includes: {academicLevels.slice(0, 3).join(', ')}... (+{Math.max(0, academicLevels.length - 3)} more)
                        </p>
                      </div>
                    )}

                    {/* Branch */}
                    {requireBranch && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <Label className="text-xs font-bold text-foreground">{branchLabel}</Label>
                        <Input
                          disabled
                          placeholder={branchPlaceholder}
                          className="h-10 text-xs bg-background/50 cursor-not-allowed"
                        />
                      </div>
                    )}

                    {/* Section */}
                    {requireSection && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <Label className="text-xs font-bold text-foreground">{sectionLabel}</Label>
                        <Input
                          disabled
                          placeholder={sectionPlaceholder}
                          className="h-10 text-xs bg-background/50 cursor-not-allowed"
                        />
                      </div>
                    )}

                    {/* Fake Start Exam Button */}
                    <div className="pt-2">
                      <Button
                        disabled
                        className="w-full h-11 bg-indigo-600/50 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-not-allowed"
                      >
                        Agree to Lockdown & Start Assessment
                      </Button>
                    </div>
                  </div>

                </CardContent>
              </Card>

            </div>

          </div>

        </div>
      ) : (
        /* TAB 2: ACTIVE PUBLIC QUIZZES & LINKS MANAGEMENT */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Active Public Quiz Links</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                All assessments published for open-web browser examinations.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setActiveTab('create')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-4 rounded-xl gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Public Link</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Array.isArray(publicQuizzesList) ? publicQuizzesList : []).map((quiz) => {
              const url = getPublicLink(quiz._id);
              const isCopied = copiedId === quiz._id;
              const qCount = quiz.questions?.length || 0;

              return (
                <Card key={quiz._id} className="border-border/60 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between">
                  <CardHeader className="p-6 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold mb-2">
                          🌐 Public Web Exam
                        </Badge>
                        <CardTitle className="text-lg font-black tracking-tight text-foreground line-clamp-1">
                          {quiz.title}
                        </CardTitle>
                        <CardDescription className="text-xs line-clamp-1 mt-1">
                          {quiz.description || 'Open proctored assessment'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        {quiz.duration || 30} mins
                      </span>
                      <span>•</span>
                      <span>{qCount} Questions</span>
                    </div>
                  </CardHeader>

                  <CardContent className="px-6 py-2">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 font-mono text-[11px] text-muted-foreground truncate select-all">
                      {url}
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 pt-3 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <Button
                        type="button"
                        onClick={() => handleCopyLink(quiz._id)}
                        className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-sm"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open(url, '_blank')}
                        className="h-10 border-border/80 font-bold text-xs rounded-xl gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Test View</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate(`/quiz/${quiz._id}/public-link`)}
                        className="h-9 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs font-bold rounded-xl gap-1.5"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Form Customizer</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate(`/quiz/${quiz._id}/results`)}
                        className="h-9 text-foreground hover:bg-muted text-xs font-bold rounded-xl gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>View Results</span>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
