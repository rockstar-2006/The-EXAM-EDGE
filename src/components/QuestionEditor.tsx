import { useState, useRef, useEffect } from 'react';
import { Edit2, Bookmark, BookmarkCheck, Trash2, Save, X, Check, Target, Layers, Activity, Code, Image as ImageIcon, Upload, Link as LinkIcon, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Question } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { AcademicTextRenderer } from '@/components/AcademicTextRenderer';
import { PDFVisualSnipModal } from '@/components/PDFVisualSnipModal';

interface QuestionEditorProps {
  question: Question;
  index: number;
  uploadedPdfFile?: File | null;
  onUpdate: (question: Question) => void;
  onDelete: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onToggleSelect: (id: string) => void;
}

// 📝 CODE AWARE TEXT RENDERING
const FormattedText = ({ text, isQuestion = false }: { text: string; isQuestion?: boolean }) => {
  if (!text) return null;

  const parts = text.split(/(```)/g);
  let isCode = false;
  let codeBuffer = "";
  const result: React.ReactNode[] = [];

  parts.forEach((part, i) => {
    if (part === "```") {
      if (isCode) {
        const formattedCode = formatCodeSnippet(codeBuffer);
        result.push(
          <div key={i} className="my-4 relative group">
            <pre
              style={{ textTransform: 'none' }}
              className="relative p-5 bg-muted border rounded-xl font-mono text-[11px] sm:text-xs leading-relaxed overflow-x-auto text-foreground shadow-sm scrollbar-thin"
            >
              <code>{formattedCode}</code>
            </pre>
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-20">
              <Code className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">CODE</span>
            </div>
          </div>
        );
        codeBuffer = "";
        isCode = false;
      } else {
        isCode = true;
      }
    } else {
      if (isCode) {
        codeBuffer += part;
      } else if (part.trim()) {
        result.push(
          <p key={i} className="whitespace-pre-wrap leading-relaxed inline-block w-full text-inherit normal-case" style={{ textTransform: 'none' }}>
            {part}
          </p>
        );
      }
    }
  });

  if (isCode && codeBuffer) {
    result.push(
      <pre key="unclosed" style={{ textTransform: 'none' }} className="p-5 bg-muted border rounded-xl font-mono text-xs overflow-x-auto">
        <code>{formatCodeSnippet(codeBuffer)}</code>
      </pre>
    );
  }

  return (
    <div className={cn("space-y-3", isQuestion ? "text-foreground" : "text-muted-foreground")}>
      {result}
    </div>
  );
};

const formatCodeSnippet = (code: string) => {
  let clean = code.trim();
  clean = clean.replace(/^[a-zA-Z]+\n/, '');
  if (clean === clean.toUpperCase() && clean.length > 50) {
    clean = clean.toLowerCase();
  }
  if (!clean.includes('\n') && (clean.includes('{') || clean.includes(';'))) {
    clean = clean
      .replace(/{\s*/g, ' {\n  ')
      .replace(/;\s*/g, ';\n  ')
      .replace(/}\s*/g, '\n}\n')
      .replace(/\n\s*\n/g, '\n');
  }
  return clean;
};

export function QuestionEditor({
  question,
  index,
  uploadedPdfFile,
  onUpdate,
  onDelete,
  onToggleBookmark,
  onToggleSelect,
}: QuestionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSnipModalOpen, setIsSnipModalOpen] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(question);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedQuestion(question);
  }, [question]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('Figure file size exceeds 4MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditedQuestion(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onUpdate(editedQuestion);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedQuestion(question);
    setIsEditing(false);
  };

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...(editedQuestion.options || [])];
    newOptions[optionIndex] = value;
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  return (
    <>
    <Card
      className={cn(
        "transition-all duration-300 relative overflow-hidden group",
        question.isSelected
          ? "border-primary shadow-glow bg-primary/[0.02]"
          : "border-sidebar-border/50 bg-card/40 backdrop-blur-sm opacity-60 hover:opacity-100"
      )}
    >
      <div className={cn(
        "absolute left-0 top-0 w-1 h-full transition-all",
        question.isSelected ? "bg-primary" : "bg-primary/10 group-hover:bg-primary/30"
      )} />

      <div className="p-6 flex items-start gap-4">
        {/* Selection Checkbox */}
        <div className="pt-1.5">
          <Checkbox
            checked={question.isSelected}
            onCheckedChange={() => onToggleSelect(question.id)}
            className="border-primary/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-6 w-6 rounded-lg transition-all"
          />
        </div>

        <div className="flex-1 space-y-6">
          {/* Header Area */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                QUESTION {index + 1}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest px-2.5 h-6">
                  {question.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSnipModalOpen(true)}
                    className="h-8 px-2.5 rounded-xl border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 transition-all font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    title="Crop figure directly from PDF"
                  >
                    <Scissors className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Crop Figure from PDF</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onToggleBookmark(question.id)} className="h-9 w-9 rounded-xl transition-all">
                    {question.isBookmarked ? (
                      <BookmarkCheck className="h-5 w-5 text-amber-500 fill-amber-500 animate-bounce-short" />
                    ) : (
                      <Bookmark className="h-5 w-5 opacity-40 hover:opacity-100" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)} className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Form / Content */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div key="editing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Question Text</Label>
                  <Textarea
                    value={editedQuestion.question}
                    onChange={(e) => setEditedQuestion({ ...editedQuestion, question: e.target.value })}
                    className="min-h-[100px] bg-slate-50 border-2 border-slate-300 hover:border-slate-400 focus:bg-white text-slate-900 rounded-2xl p-4 font-bold text-sm tracking-tight focus-visible:ring-primary/20"
                  />
                </div>

                {editedQuestion.type === 'mcq' && editedQuestion.options && (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Options</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {editedQuestion.options.map((option, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border-2 border-slate-300 hover:border-slate-400 focus-within:border-primary focus-within:bg-white transition-all shadow-xs">
                          <span className="text-xs font-black text-primary w-4">{String.fromCharCode(65 + i)}</span>
                          <Input
                            value={option}
                            onChange={(e) => updateOption(i, e.target.value)}
                            className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 font-bold text-xs text-slate-900"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Correct Answer</Label>
                    <Input
                      value={editedQuestion.answer}
                      onChange={(e) => setEditedQuestion({ ...editedQuestion, answer: e.target.value })}
                      className="h-10 bg-slate-50 border-2 border-slate-300 hover:border-slate-400 focus:bg-white font-black uppercase text-xs text-slate-900"
                      placeholder={editedQuestion.type === 'mcq' ? 'e.g., A' : 'Expected answer string'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Marks / Points</Label>
                    <Input
                      type="number"
                      value={editedQuestion.marks}
                      onChange={(e) => setEditedQuestion({ ...editedQuestion, marks: Number(e.target.value) })}
                      className="h-10 bg-slate-50 border-2 border-slate-300 hover:border-slate-400 focus:bg-white font-black text-xs text-slate-900"
                    />
                  </div>
                </div>

                {/* 🖼️ Figure / Diagram Attachment */}
                <div className="space-y-2 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Question Diagram / Image (Optional)
                    </Label>
                    {editedQuestion.imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditedQuestion(prev => ({ ...prev, imageUrl: '' }))}
                        className="h-7 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remove Image
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={editedQuestion.imageUrl || ''}
                        onChange={(e) => setEditedQuestion({ ...editedQuestion, imageUrl: e.target.value })}
                        placeholder="Paste image / diagram URL (https://...)"
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 px-3 text-xs font-bold shrink-0 gap-1.5 border-sidebar-border/60"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload File
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSnipModalOpen(true)}
                      className="h-9 px-3 text-xs font-bold shrink-0 gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                      title="Crop figure directly from PDF"
                    >
                      <Scissors className="w-3.5 h-3.5" /> Crop from PDF
                    </Button>
                  </div>
                  {editedQuestion.imageUrl && (
                    <div className="mt-2 p-2 bg-background border border-sidebar-border/40 rounded-xl flex items-center gap-3">
                      <img
                        src={editedQuestion.imageUrl}
                        alt="Figure Preview"
                        className="w-16 h-16 object-contain rounded-lg border bg-slate-50"
                      />
                      <div className="text-xs text-muted-foreground truncate">
                        <span className="font-bold text-foreground">Figure attached:</span> Image will render above question for students.
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Answer Explanation (Optional)</Label>
                  <Textarea
                    value={editedQuestion.explanation || ''}
                    onChange={(e) => setEditedQuestion({ ...editedQuestion, explanation: e.target.value })}
                    className="min-h-[80px] bg-muted/20 border-sidebar-border/50 rounded-2xl p-4 text-xs font-medium italic"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSave} size="sm" className="h-10 px-6 gradient-primary font-black uppercase text-[10px] tracking-widest shadow-glow">
                    <Save className="h-4 w-4 mr-2" /> Commit Changes
                  </Button>
                  <Button onClick={handleCancel} variant="ghost" size="sm" className="h-10 px-6 font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                    Abort
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="text-lg sm:text-xl font-black tracking-tight group-hover:text-primary transition-colors">
                  <AcademicTextRenderer
                    text={question.question}
                    isQuestion={true}
                    imageUrl={question.imageUrl}
                    onSnipRequest={() => setIsSnipModalOpen(true)}
                  />
                  {!question.imageUrl && /diagram|figure|plot|schematic|shown below/i.test(question.question) && (
                    <div className="mt-3 p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between gap-3 text-xs font-bold text-indigo-950">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-indigo-600" />
                        <span>Figure reference detected. Click to attach diagram from your slides.</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsSnipModalOpen(true)}
                        className="h-7 text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs shrink-0"
                      >
                        Snip from PDF
                      </Button>
                    </div>
                  )}
                </div>

                {question.type === 'mcq' && question.options && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {question.options.map((option, i) => {
                      const isCorrect = question.answer === String.fromCharCode(65 + i);
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                            isCorrect ? "bg-emerald-500/10 border-emerald-500 shadow-glow shadow-emerald-500/10" : "bg-muted/10 border-sidebar-border/50"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                            isCorrect ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground/40"
                          )}>{String.fromCharCode(65 + i)}</div>
                          <span className={cn("text-xs font-bold whitespace-pre-wrap tracking-tight", isCorrect ? "text-emerald-700" : "opacity-80")}>{option}</span>
                          {isCorrect && <Check className="w-4 h-4 text-emerald-500 ml-auto" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!question.options && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-[1.5rem] flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600"><Check className="w-5 h-5" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Registry Answer</p>
                      <p className="text-sm font-black italic tracking-tighter text-emerald-900 mt-1">{question.answer}</p>
                    </div>
                  </div>
                )}

                {question.explanation && (
                  <div className="bg-primary/5 border border-primary/10 p-5 rounded-[1.5rem] flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary"><Activity className="w-5 h-5" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Insight Breakdown</p>
                      <div className="text-sm font-medium opacity-70 mt-1 leading-relaxed">
                        <FormattedText text={question.explanation} />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>

    {isSnipModalOpen && (
      <PDFVisualSnipModal
        isOpen={isSnipModalOpen}
        onClose={() => setIsSnipModalOpen(false)}
        pdfFile={uploadedPdfFile}
        questionIndex={index}
        questionText={question.question}
        questionExplanation={question.explanation}
        onAttach={(dataUrl) => {
          setEditedQuestion(prev => ({ ...prev, imageUrl: dataUrl }));
          onUpdate({ ...question, imageUrl: dataUrl });
        }}
      />
    )}
  </>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      variant === 'outline' ? "border border-input bg-background" : "bg-primary text-primary-foreground",
      className
    )}>{children}</span>
  )
}
