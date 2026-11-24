import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Question } from '@/types';
import {
  parseQuestionsFile,
  parseTextContent,
  downloadSampleExcelTemplate,
  downloadSampleWordTemplate,
  downloadSampleTextTemplate
} from '@/services/questionDocParser';

interface QuestionDocImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportQuestions: (questions: Question[]) => void;
}

export function QuestionDocImportModal({
  open,
  onOpenChange,
  onImportQuestions
}: QuestionDocImportModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'templates'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);
    try {
      const results = await parseQuestionsFile(file);
      if (results.length === 0) {
        toast.error('No questions could be identified in the file. Please check the format guide.');
      } else {
        setParsedQuestions(results);
        toast.success(`Successfully extracted ${results.length} questions from ${file.name}!`);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      toast.error(err.message || 'Failed to parse document. Please check the format.');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      toast.error('Please paste your questions text first');
      return;
    }

    setIsProcessing(true);
    try {
      const results = parseTextContent(pastedText);
      if (results.length === 0) {
        toast.error('Could not detect question pattern. Ensure each question starts with Q1:, 1., or Question 1.');
      } else {
        setParsedQuestions(results);
        toast.success(`Extracted ${results.length} questions! Review below and click 'Add to Quiz'.`);
      }
    } catch (err: any) {
      toast.error('Error parsing text: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedQuestions.length === 0) {
      toast.error('No questions to import');
      return;
    }
    onImportQuestions(parsedQuestions);
    toast.success(`Imported ${parsedQuestions.length} questions into your quiz!`);
    onOpenChange(false);
    setParsedQuestions([]);
    setPastedText('');
    setFileName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 rounded-3xl">
        <DialogHeader className="space-y-2 border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <DialogTitle className="text-xl md:text-2xl font-black tracking-tight">
              Import Questions from Document / Sheet
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs md:text-sm text-muted-foreground font-medium">
            Upload Word documents (.docx), Excel sheets (.xlsx), or Text files (.txt) to automatically extract your questions directly into the quiz editor.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6 pt-2">
          <TabsList className="grid grid-cols-3 p-1 bg-muted/50 rounded-2xl">
            <TabsTrigger value="upload" className="rounded-xl font-bold text-xs gap-2">
              <Upload className="w-3.5 h-3.5" /> Upload File
            </TabsTrigger>
            <TabsTrigger value="paste" className="rounded-xl font-bold text-xs gap-2">
              <FileText className="w-3.5 h-3.5" /> Paste Text
            </TabsTrigger>
            <TabsTrigger value="templates" className="rounded-xl font-bold text-xs gap-2">
              <Download className="w-3.5 h-3.5" /> Download Templates
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FILE UPLOAD */}
          <TabsContent value="upload" className="space-y-4">
            <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-indigo-200 dark:border-indigo-900 rounded-3xl cursor-pointer bg-indigo-50/30 hover:bg-indigo-50/70 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20 transition-all group">
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                  Choose Word (.docx), Excel (.xlsx), or Text (.txt)
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  Click to browse or drag and drop your question file here
                </p>
                {fileName && (
                  <Badge className="mt-3 bg-indigo-600 text-white text-[10px] font-bold">
                    {fileName}
                  </Badge>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept=".docx,.xlsx,.xls,.csv,.txt,.md"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </label>
          </TabsContent>

          {/* TAB 2: PASTE TEXT */}
          <TabsContent value="paste" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-foreground tracking-wider">
                  Paste Formatted Questions (Word / Text)
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPastedText(`Q1: Which command creates and switches to a new branch in Git?
A) git branch new-branch
B) git checkout -b new-branch
C) git merge new-branch
D) git push origin new-branch
Correct Answer: B
Explanation: git checkout -b creates the branch and immediately checks it out.

Q2: What is the primary function of the Git staging area?
A) To permanently delete files
B) To prepare and curate changes before committing them
C) To run automated tests
D) To compile application code
Correct Answer: B
Explanation: The staging area allows developers to selectively organize files for commit.`);
                  }}
                  className="h-6 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <Copy className="w-3 h-3 mr-1" /> Load Sample Example
                </Button>
              </div>
              <Textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Q1: What is the primary purpose of Git?
A) Video editing
B) Distributed version control
C) Operating system
D) Web hosting
Correct Answer: B
Explanation: Git tracks source code modifications across development history.

Q2: Which command shows commit history?
A) git status
B) git log
C) git pull
D) git init
Correct Answer: B`}
                className="font-mono text-xs bg-slate-50 dark:bg-slate-900 border-2 border-border/80 rounded-2xl resize-none p-4"
              />
            </div>
            <Button
              type="button"
              onClick={handleParsePastedText}
              disabled={isProcessing || !pastedText.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl h-11"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Parse & Extract Questions
            </Button>
          </TabsContent>

          {/* TAB 3: DOWNLOAD TEMPLATES & FORMAT GUIDE */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={downloadSampleExcelTemplate}
                className="h-16 flex flex-col items-center justify-center border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 rounded-2xl p-2 gap-1 font-bold"
              >
                <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel Template (.xlsx)
                </div>
                <span className="text-[10px] text-emerald-700 font-medium">Download Pre-built Spreadsheet</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={downloadSampleWordTemplate}
                className="h-16 flex flex-col items-center justify-center border-blue-300 bg-blue-50/50 hover:bg-blue-100/60 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-2xl p-2 gap-1 font-bold"
              >
                <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <FileText className="w-4 h-4 text-blue-600" /> Word Template (.docx)
                </div>
                <span className="text-[10px] text-blue-700 font-medium">Download Pre-built Word Doc</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={downloadSampleTextTemplate}
                className="h-16 flex flex-col items-center justify-center border-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-2xl p-2 gap-1 font-bold"
              >
                <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <Download className="w-4 h-4 text-slate-600" /> Plain Text (.txt)
                </div>
                <span className="text-[10px] text-slate-600 font-medium">Download Formatted Text File</span>
              </Button>
            </div>

            {/* Format Specifications */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-4 text-xs">
              <h4 className="font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" /> Format Requirements
              </h4>

              <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border">
                  <p className="font-bold text-indigo-600 mb-1 font-sans">1. Word / Text Format (.docx / .txt):</p>
                  <pre className="text-muted-foreground whitespace-pre-wrap">
{`Q1: Your question text here?
A) First option text
B) Second option text
C) Third option text
D) Fourth option text
Correct Answer: B (or exact text of option)
Explanation: Brief explanation of why B is correct.`}
                  </pre>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border">
                  <p className="font-bold text-emerald-600 mb-1 font-sans">2. Excel Spreadsheet Columns (.xlsx):</p>
                  <p className="text-muted-foreground font-sans">
                    <strong>Columns:</strong> <code className="bg-muted px-1 py-0.5 rounded">S.No</code> | <code className="bg-muted px-1 py-0.5 rounded">Question</code> | <code className="bg-muted px-1 py-0.5 rounded">Type</code> | <code className="bg-muted px-1 py-0.5 rounded">Option A</code> | <code className="bg-muted px-1 py-0.5 rounded">Option B</code> | <code className="bg-muted px-1 py-0.5 rounded">Option C</code> | <code className="bg-muted px-1 py-0.5 rounded">Option D</code> | <code className="bg-muted px-1 py-0.5 rounded">Correct Answer</code> | <code className="bg-muted px-1 py-0.5 rounded">Explanation</code>
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* PARSED QUESTIONS PREVIEW */}
        {parsedQuestions.length > 0 && (
          <div className="space-y-4 border-t pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-black uppercase tracking-wider text-foreground">
                  Extracted Questions ({parsedQuestions.length})
                </h4>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                Ready to Import
              </Badge>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-3 p-1">
              {parsedQuestions.map((q, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl border border-border/70 bg-card space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-foreground">
                      {idx + 1}. {q.question}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold shrink-0">
                      {q.type}
                    </Badge>
                  </div>
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2 text-[11px] text-muted-foreground">
                      {q.options.map((opt, i) => {
                        const isAns = opt.trim().toLowerCase() === q.answer.trim().toLowerCase() ||
                          String.fromCharCode(65 + i) === q.answer.trim().toUpperCase();
                        return (
                          <div
                            key={i}
                            className={`p-1.5 rounded-lg border flex items-center gap-1.5 ${
                              isAns
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold'
                                : 'border-border/50'
                            }`}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + i)})</span> {opt}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {q.answer && (
                    <p className="text-[11px] text-emerald-600 font-medium pl-2">
                      <strong>Correct Answer:</strong> {q.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setParsedQuestions([])}
                className="font-bold text-xs rounded-xl"
              >
                Clear
              </Button>
              <Button
                type="button"
                onClick={handleConfirmImport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl px-5 h-11 shadow-sm gap-2"
              >
                <span>Add {parsedQuestions.length} Questions to Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
