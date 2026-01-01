import { useState, useEffect } from 'react';
import {
  Folder, Share2, Trash2, ArrowLeft,
  Search, BookOpen, Target,
  FileText, Plus, FolderPlus, MoreVertical,
  CalendarClock, Check, FolderEdit, Download, FileSpreadsheet, FileText as FileTextIcon, File as FileWord
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { bookmarksAPI, foldersAPI, quizAPI, studentsAPI } from '@/services/api';
import { Question, Student } from '@/types';
import { QuestionEditor } from '@/components/QuestionEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StudentTable } from '@/components/StudentTable';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function BookmarksPage() {
  const navigate = useNavigate();

  // Data State
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Action States
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<{ id: string, name: string } | null>(null);

  // Share States
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingType, setSharingType] = useState<'question' | 'quiz' | 'folder' | null>(null); // 'folder' sharing logic can be complex, usually implies sharing all items in it
  const [sharingItem, setSharingItem] = useState<any>(null); // Can be a bookmark or a folder object
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, fRes, sRes] = await Promise.all([
        bookmarksAPI.getAll(),
        foldersAPI.getAll(),
        studentsAPI.getAll()
      ]);

      setBookmarks(bRes.data?.bookmarks || bRes.data || []);
      setFolders(fRes.data?.folders || fRes.data || []);
      const sData = sRes.data?.students || sRes.data || [];
      setStudents(Array.isArray(sData) ? sData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  // --- Actions ---

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await foldersAPI.create({ name: newFolderName });
      toast.success('Collection created');
      setNewFolderName('');
      setIsCreatingFolder(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  const handleRenameFolder = async () => {
    if (!editingFolder || !editingFolder.name.trim()) return;
    try {
      await foldersAPI.update(editingFolder.id, { name: editingFolder.name });
      toast.success('Collection renamed');
      setEditingFolder(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update folder');
    }
  };

  const handleDeleteFolder = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this collection and all its contents?')) return;
    try {
      await foldersAPI.delete(id);
      toast.success('Collection deleted');
      if (activeFolderId === id) setActiveFolderId(null);
      fetchData();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      await bookmarksAPI.delete(id);
      toast.success('Question removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleDownloadExcel = (folderId: string, folderName: string) => {
    const folderBookmarks = bookmarks.filter(b => {
      const bFolderId = b.folderId && typeof b.folderId === 'object' ? (b.folderId as any)._id : b.folderId;
      return bFolderId === folderId && b.question;
    });

    if (folderBookmarks.length === 0) {
      toast.error('No questions found in this collection');
      return;
    }

    const exportData = folderBookmarks.map((b, idx) => ({
      "S.No": idx + 1,
      "Question": b.question.question,
      "Type": b.question.type?.toUpperCase(),
      "Option A": b.question.options?.[0] || '',
      "Option B": b.question.options?.[1] || '',
      "Option C": b.question.options?.[2] || '',
      "Option D": b.question.options?.[3] || '',
      "Correct Answer": b.question.answer,
      "Explanation": b.question.explanation || '',
      "Difficulty": b.question.difficulty || 'medium'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");

    const colWidths = [
      { wch: 5 }, { wch: 50 }, { wch: 10 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 10 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `${folderName.replace(/\s+/g, '_')}_questions.xlsx`);
    toast.success(`Excel export complete`);
  };

  const handleDownloadTXT = (folderId: string, folderName: string) => {
    const folderBookmarks = bookmarks.filter(b => {
      const bFolderId = b.folderId && typeof b.folderId === 'object' ? (b.folderId as any)._id : b.folderId;
      return bFolderId === folderId && b.question;
    });

    if (folderBookmarks.length === 0) {
      toast.error('No questions found');
      return;
    }

    let content = `COLLECTION: ${folderName.toUpperCase()}\n`;
    content += `Generated on: ${new Date().toLocaleString()}\n`;
    content += `Total Questions: ${folderBookmarks.length}\n`;
    content += `==========================================\n\n`;

    folderBookmarks.forEach((b, idx) => {
      const q = b.question;
      content += `Q${idx + 1}: ${q.question}\n`;
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt: string, i: number) => {
          content += `   ${String.fromCharCode(65 + i)}) ${opt}\n`;
        });
      }
      content += `\nCorrect Answer: ${q.answer}\n`;
      if (q.explanation) content += `Explanation: ${q.explanation}\n`;
      content += `------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${folderName.replace(/\s+/g, '_')}_questions.txt`);
    toast.success('Text export complete');
  };

  const handleDownloadWord = async (folderId: string, folderName: string) => {
    const folderBookmarks = bookmarks.filter(b => {
      const bFolderId = b.folderId && typeof b.folderId === 'object' ? (b.folderId as any)._id : b.folderId;
      return bFolderId === folderId && b.question;
    });

    if (folderBookmarks.length === 0) {
      toast.error('No questions found');
      return;
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: folderName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Questions Bank Export - ${new Date().toLocaleDateString()}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }), // Spacer

          ...folderBookmarks.flatMap((b, idx) => {
            const q = b.question;
            const elements = [
              new Paragraph({
                children: [
                  new TextRun({ text: `${idx + 1}. `, bold: true }),
                  new TextRun({ text: q.question }),
                ],
                spacing: { before: 400 },
              }),
            ];

            if (q.options && q.options.length > 0) {
              q.options.forEach((opt: string, i: number) => {
                elements.push(new Paragraph({
                  text: `${String.fromCharCode(65 + i)}) ${opt}`,
                  indent: { left: 720 },
                }));
              });
            }

            elements.push(new Paragraph({
              children: [
                new TextRun({ text: "Correct Answer: ", bold: true, color: "2e7d32" }),
                new TextRun({ text: q.answer }),
              ],
              spacing: { before: 120 },
            }));

            if (q.explanation) {
              elements.push(new Paragraph({
                children: [
                  new TextRun({ text: "Explanation: ", italics: true, bold: true }),
                  new TextRun({ text: q.explanation, italics: true }),
                ],
                spacing: { after: 200 },
              }));
            }

            return elements;
          })
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${folderName.replace(/\s+/g, '_')}_questions.docx`);
    toast.success('Word export complete');
  };

  const handleUpdateQuestion = async (updatedQ: Question) => {
    // This assumes the bookmark structure contains the question object directly
    // and we want to update the 'question' property of the bookmark
    try {
      // Find the bookmark that contains this question
      const bookmark = bookmarks.find(b =>
        (b.question && (b.question.id === updatedQ.id || b.question._id === updatedQ.id))
      );

      if (bookmark) {
        // We'd ideally call an API to update the bookmark's question content
        // Since bookmarksAPI doesn't have 'update', we might just success toast or 
        // if you have a specific endpoint. 
        // For now, let's assume we maintain local state at least.
        setBookmarks(prev => prev.map(b =>
          b._id === bookmark._id ? { ...b, question: updatedQ } : b
        ));
        toast.success('Question updated locally');
      }
    } catch (error) {
      toast.error('Update failed');
    }
  };

  // --- Sharing ---

  const initiateShare = (type: 'question' | 'quiz' | 'folder', item: any) => {
    setSharingType(type);
    setSharingItem(item);
    setShareDialogOpen(true);
  };

  const executeShare = async () => {
    if (selectedStudents.length === 0) return toast.error('Select students first');
    setIsSharing(true);
    try {
      let quizId;

      if (sharingType === 'folder') {
        // Sharing a whole folder means creating a quiz from ALL questions in that folder
        const folderQuestions = bookmarks
          .filter(b => {
            const bFolderId = b.folderId && typeof b.folderId === 'object' ? (b.folderId as any)._id : b.folderId;
            return bFolderId === sharingItem._id && b.question;
          })
          .map(b => b.question);

        if (folderQuestions.length === 0) throw new Error("This folder is empty");

        const res = await quizAPI.save({
          title: sharingItem.name,
          description: `Shared collection: ${sharingItem.name}`,
          questions: folderQuestions.map((q: any) => ({ ...q, isSelected: true })),
          duration: folderQuestions.length * 2, // Estimate 2 mins per question
          difficulty: 'mixed',
          questionType: 'mixed',
          isScheduled,
          startDate: isScheduled ? startDate : null,
          startTime: isScheduled ? startTime : null,
          endDate: isScheduled ? endDate : null,
          endTime: isScheduled ? endTime : null
        });
        quizId = res.data.quizId || res.data.quiz?._id;

      } else if (sharingType === 'question') {
        const q = sharingItem.question;
        const res = await quizAPI.save({
          title: `Practice: ${q.question.substring(0, 20)}...`,
          questions: [{ ...q, isSelected: true }],
          duration: 5,
          difficulty: q.difficulty || 'medium',
          questionType: q.type || 'mcq',
          isScheduled,
          startDate: isScheduled ? startDate : null,
          startTime: isScheduled ? startTime : null,
          endDate: isScheduled ? endDate : null,
          endTime: isScheduled ? endTime : null
        });

        quizId = res.data.quizId || res.data.quiz?._id;

      } else if (sharingType === 'quiz') {
        const quizData = sharingItem.quiz;
        const res = await quizAPI.save({
          ...quizData,
          questions: quizData.questions.map((q: any) => ({ ...q, isSelected: true })),
          title: quizData.title,
          description: quizData.description,
          isScheduled,
          startDate: isScheduled ? startDate : null,
          startTime: isScheduled ? startTime : null,
          endDate: isScheduled ? endDate : null,
          endTime: isScheduled ? endTime : null
        });
        quizId = res.data.quizId || res.data.quiz?._id;
      }

      if (!quizId) throw new Error("Failed to generate deployment");

      const studentEmails = selectedStudents
        .map(id => students.find(s => s.id === id || (s as any)._id === id)?.email)
        .filter((e): e is string => !!e);

      await quizAPI.share({ quizId, studentEmails });
      toast.success(`Distributed to ${studentEmails.length} students`);
      setShareDialogOpen(false);
      setSelectedStudents([]);

    } catch (error: any) {
      toast.error(error.message || 'Share failed');
    } finally {
      setIsSharing(false);
    }
  };


  // --- Helper Data ---
  const activeFolder = folders.find(f => f._id === activeFolderId);

  // Filter bookmarks: If folder selected, show only folder items. If no folder, show nothing (or show all? user said "folder inside that quiz question").
  // User's request: "see my folder... while clikcing the bookmark and i can see the question isde"
  // Implication: Root view = Folders. Inner view = Questions.

  // Calculate counts for badges
  const getFolderCount = (folderId: string) => bookmarks.filter(b =>
    (b.folderId === folderId) || (b.folderId && typeof b.folderId === 'object' && (b.folderId as any)._id === folderId)
  ).length;

  const displayedBookmarks = bookmarks.filter(b => {
    // Must match search
    const matchesSearch = (b.question?.question || b.quiz?.title || '').toLowerCase().includes(searchQuery.toLowerCase());

    const bFolderId = b.folderId && typeof b.folderId === 'object' ? (b.folderId as any)._id : b.folderId;

    // If at root (no active folder), show items that don't belong to any folder
    if (!activeFolderId) {
      return !bFolderId && matchesSearch;
    }

    // If folder selected, show its contents
    return bFolderId === activeFolderId && matchesSearch;
  });

  // If at root, fetch folders matching search
  const displayedFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto text-foreground">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
            <BookOpen className="w-4 h-4" /> Library
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-foreground">
            {activeFolderId ? (
              <span className="flex items-center gap-3 animate-in slide-in-from-left-4 fade-in duration-300">
                <Button variant="ghost" className="h-12 w-12 p-0 rounded-full bg-muted/20 hover:bg-muted/40" onClick={() => setActiveFolderId(null)}>
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                {activeFolder?.name}
              </span>
            ) : (
              <>Saved <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Collections</span></>
            )}
          </h1>
          <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-60 max-w-xl">
            {activeFolderId
              ? `${displayedBookmarks.length} Items stored in this folder`
              : "Select a folder to view saved questions and quizzes"
            }
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={activeFolderId ? "Search questions..." : "Search folders..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-12 bg-card/50 border-border/50 rounded-xl font-medium shadow-sm transition-all focus:ring-primary/20"
            />
          </div>
          {activeFolderId && displayedBookmarks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="h-12 px-6 gradient-primary font-black uppercase tracking-widest shadow-glow rounded-xl hover:scale-105 transition-transform"
                >
                  <Download className="w-5 h-5 mr-2" /> Export All
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-bold bg-card border-border">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50">Choose Format</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleDownloadExcel(activeFolderId, activeFolder?.name || 'Collection')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadWord(activeFolderId, activeFolder?.name || 'Collection')}>
                  <FileWord className="w-4 h-4 mr-2 text-blue-500" /> Word (.docx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadTXT(activeFolderId, activeFolder?.name || 'Collection')}>
                  <FileTextIcon className="w-4 h-4 mr-2 text-orange-500" /> Text (.txt)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!activeFolderId && (
            <Button onClick={() => setIsCreatingFolder(true)} className="h-12 px-6 gradient-primary font-black uppercase tracking-widest shadow-glow rounded-xl hover:scale-105 transition-transform">
              <FolderPlus className="w-5 h-5 mr-2" /> New Collection
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!activeFolderId ? (
          /* --- FOLDERS GRID VIEW --- */
          <motion.div
            key="folders"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {displayedFolders.length === 0 && (
              <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-3xl bg-card/10 text-muted-foreground/50">
                <Folder className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">No folders found</p>
              </div>
            )}

            {displayedFolders.map(folder => {
              const count = getFolderCount(folder._id);
              return (
                <Card
                  key={folder._id}
                  onClick={() => setActiveFolderId(folder._id)}
                  className="group relative cursor-pointer border-border/40 bg-card/30 hover:bg-card/60 hover:border-primary/30 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <CardContent className="p-6 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-white/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white group-hover:shadow-glow transition-all duration-300">
                        <Folder className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-lg uppercase tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">{folder.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-5 font-mono">{count} Items</Badge>
                          {count > 0 && <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider opacity-60">Ready</span>}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 font-bold">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50">Options</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); initiateShare('folder', folder) }}>
                          <Share2 className="w-4 h-4 mr-2" /> Share Collection
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadExcel(folder._id, folder.name) }}>
                          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" /> Download Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadWord(folder._id, folder.name) }}>
                          <FileWord className="w-4 h-4 mr-2 text-blue-500" /> Download Word
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadTXT(folder._id, folder.name) }}>
                          <FileTextIcon className="w-4 h-4 mr-2 text-orange-500" /> Download TXT
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingFolder({ id: folder._id, name: folder.name }) }}>
                          <FolderEdit className="w-4 h-4 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => handleDeleteFolder(folder._id, e as any)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        ) : (
          /* --- FOLDER CONTENTS VIEW --- */
          <motion.div
            key="contents"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {displayedBookmarks.length === 0 ? (
              <div className="h-96 flex flex-col items-center justify-center text-muted-foreground/40 border rounded-3xl bg-muted/5">
                <FileTextIcon className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-xl font-black uppercase text-foreground opacity-50">Empty Folder</h3>
                <p className="text-sm font-bold uppercase tracking-widest mt-2 opacity-50">Save questions here from the Quiz Creator</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {displayedBookmarks.map((bookmark, idx) => {
                  if (bookmark.question) {
                    const q = bookmark.question;
                    return (
                      <Card key={bookmark._id} className="border-border/50 glass-effect hover:border-primary/30 transition-all group overflow-hidden">
                        <div className="absolute left-0 top-0 h-full w-1 bg-primary/20 group-hover:bg-primary transition-all" />
                        <div className="p-1">
                          <QuestionEditor
                            question={{
                              ...q,
                              id: q.id || q._id,
                              isSelected: true,
                              isBookmarked: true
                            }}
                            index={idx}
                            onUpdate={handleUpdateQuestion}
                            onDelete={() => handleDeleteBookmark(bookmark._id)}
                            onToggleBookmark={() => handleDeleteBookmark(bookmark._id)} // Serves as delete here
                            onToggleSelect={() => { }}
                          />
                        </div>
                      </Card>
                    );
                  } else if (bookmark.quiz) {
                    // Fallback if full quiz is saved, though user asked for "questions inside"
                    // We display it as a simplified card
                    return (
                      <Card key={bookmark._id} className="p-6 border-border/50 bg-secondary/5 hover:bg-secondary/10 transition-all flex items-center justify-between group">
                        <div className="flex gap-4 items-center">
                          <div className="h-12 w-12 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
                            <Target className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex gap-2 mb-1">
                              <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-secondary/30 text-secondary">Full Quiz</Badge>
                            </div>
                            <h3 className="font-bold text-lg">{bookmark.quiz.title}</h3>
                            <p className="text-xs text-muted-foreground">{bookmark.quiz.questions?.length || 0} Questions • {bookmark.quiz.duration} Mins</p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" onClick={() => initiateShare('quiz', bookmark)}>
                            <Share2 className="w-4 h-4 text-emerald-500" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteBookmark(bookmark._id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => navigate('/create-quiz', { state: { quizData: bookmark.quiz } })}>
                            Open
                          </Button>
                        </div>
                      </Card>
                    )
                  }
                  return null;
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- DIALOGS --- */}

      {/* Create Folder */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent className="glass-effect border-border/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">New Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Physics Midterm Questions..."
                className="h-14 font-bold rounded-xl"
                autoFocus
              />
            </div>
            <Button onClick={handleCreateFolder} className="w-full h-14 gradient-primary font-black uppercase tracking-widest shadow-glow">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder */}
      <Dialog open={!!editingFolder} onOpenChange={() => setEditingFolder(null)}>
        <DialogContent className="glass-effect border-border/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Rename</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Input value={editingFolder?.name || ''} onChange={(e) => setEditingFolder(prev => prev ? { ...prev, name: e.target.value } : null)} className="h-14 font-bold rounded-xl" />
            </div>
            <Button onClick={handleRenameFolder} className="w-full h-14 gradient-primary font-black uppercase tracking-widest shadow-glow">Update</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background border-border shadow-2xl">
          <DialogHeader className="p-8 bg-muted/40 border-b">
            <DialogTitle className="text-3xl font-black uppercase italic flex items-center gap-3">
              <Share2 className="w-7 h-7 text-primary" /> Distribute Content
            </DialogTitle>
            <DialogDescription className="text-[10px] font-black opacity-80 uppercase tracking-widest">
              {sharingType === 'folder' ? 'Sharing entire collection as a quiz' : 'Sharing single resource'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4 md:p-8 bg-muted/5 space-y-6">
            <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-primary" /> Schedule Access
                  </Label>
                </div>
                <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
              </div>
              {isScheduled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Start</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">End</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                      <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
              <StudentTable students={students} selectedStudents={selectedStudents} onSelectionChange={setSelectedStudents} showCheckboxes={true} />
            </div>
          </div>
          <div className="p-8 bg-muted/30 border-t flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Recipients</span>
              <p className="text-lg font-black uppercase tracking-widest text-primary">{selectedStudents.length} Selected</p>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setShareDialogOpen(false)}>Cancel</Button>
              <Button onClick={executeShare} disabled={isSharing || selectedStudents.length === 0} className="gradient-primary h-12 px-8 shadow-glow font-black uppercase tracking-widest">
                {isSharing ? 'Processing...' : 'Deploy Now'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div >
  );
}
