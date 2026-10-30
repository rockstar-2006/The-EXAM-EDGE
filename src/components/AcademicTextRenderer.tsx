import React, { useState } from 'react';
import { Code, Check, Copy, ZoomIn, Image as ImageIcon, Workflow, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface AcademicTextRendererProps {
  text?: string;
  content?: string;
  isQuestion?: boolean;
  imageUrl?: string;
  className?: string;
  onSnipRequest?: () => void;
  hideCopyButton?: boolean;
}

/**
 * Sanitizes and renders academic text with:
 * - Clean stripping/handling of raw HTML tags (<br>, <p>, <b>)
 * - Markdown bold (**text**), italic (*text*), inline code (`code`)
 * - Multi-line formatted code blocks with copy action
 * - Attached diagram / figure rendering with lightbox zoom
 */
export const cleanAcademicText = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
};

export const AcademicTextRenderer: React.FC<AcademicTextRendererProps> = ({
  text,
  content,
  isQuestion = false,
  imageUrl,
  className,
  onSnipRequest,
  hideCopyButton = false
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const rawText = text ?? content ?? '';
  if (!rawText && !imageUrl) return null;

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Clean raw HTML tags into natural line breaks or remove them
  const sanitizeRawText = (raw: string) => {
    if (!raw) return '';
    return raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p>/gi, '')
      .replace(/<\/?(div|span|strong|b|em|i)>/gi, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');
  };

  // Render inline formatting: **bold**, *italic*, `code`
  const renderInlineFormatted = (line: string, keyPrefix: string) => {
    // Regex matches inline code `...`, bold **...**, or italic *...*
    const tokens = line.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return tokens.map((token, idx) => {
      if (!token) return null;
      const key = `${keyPrefix}-${idx}`;

      if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
        return (
          <code
            key={key}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 text-indigo-700 font-mono text-[0.88em] border border-slate-200/80 font-semibold align-baseline"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
        return (
          <strong key={key} className="font-extrabold text-slate-900">
            {token.slice(2, -2)}
          </strong>
        );
      }

      if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
        return (
          <em key={key} className="italic text-slate-800">
            {token.slice(1, -1)}
          </em>
        );
      }

      // Plain string - strip any lingering accidental lone asterisks
      const cleaned = token.replace(/\*\*/g, '');
      return <span key={key}>{cleaned}</span>;
    });
  };

  const cleanedText = sanitizeRawText(rawText);
  // Split on code fences: ```language\n...```
  const parts = cleanedText.split(/(```[\s\S]*?```)/g);

  return (
    <div className={cn("space-y-4 leading-relaxed font-sans", className)}>
      {/* Attached Figure / Diagram if available */}
      {imageUrl && (
        <div className="my-3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50/70 p-3 shadow-sm group">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-indigo-600 font-extrabold">
              <ImageIcon className="w-3.5 h-3.5" />
              Examination Figure / Diagram
            </span>
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              className="flex items-center gap-1 hover:text-slate-800 transition-colors cursor-pointer text-[10px]"
            >
              <ZoomIn className="w-3 h-3" /> Click to Expand
            </button>
          </div>
          <div
            className="flex items-center justify-center bg-white rounded-xl p-3 cursor-pointer min-h-[140px] max-h-[380px] overflow-hidden"
            onClick={() => setIsZoomOpen(true)}
          >
            <img
              src={imageUrl}
              alt="Question Figure"
              className="max-h-[350px] w-auto max-w-full object-contain rounded-lg transition-transform hover:scale-[1.01]"
              loading="lazy"
            />
          </div>

          {/* Full Lightbox Dialog */}
          <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
            <DialogContent className="max-w-4xl p-6 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Figure Lightbox Inspection
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  High-resolution diagram extracted from course material
                </DialogDescription>
              </DialogHeader>
              <div className="p-2 flex flex-col items-center">
                <img
                  src={imageUrl}
                  alt="Expanded Figure"
                  className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-lg border border-slate-100"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Question / Text Content */}
      {parts.map((part, i) => {
        if (!part) return null;

        // Code / Diagram Block
        if (part.startsWith('```')) {
          const lines = part.split('\n');
          const firstLine = lines[0].replace('```', '').trim();
          const language = firstLine || 'code';
          const codeContent = lines.slice(1, -1).join('\n').trim() || part.replace(/^```[a-zA-Z]*\n?|```$/g, '').trim();
          const isDiagram = ['diagram', 'ascii', 'blueprint', 'schema', 'flowchart', 'visual', 'circuit'].includes(language.toLowerCase());

          // If a real image was attached by user/faculty, suppress redundant raw ASCII diagram text
          if (imageUrl && isDiagram) {
            return null;
          }

          return (
            <div
              key={i}
              className={cn(
                "my-3.5 rounded-2xl overflow-hidden border shadow-md group relative text-left",
                isDiagram
                  ? "border-cyan-800/80 bg-[#0A1128]"
                  : "border-slate-800 bg-[#0F172A]"
              )}
            >
              <div className={cn(
                "flex items-center justify-between px-4 py-2 border-b text-[11px] font-mono",
                isDiagram
                  ? "bg-[#070D1E] border-cyan-900/60 text-cyan-300"
                  : "bg-slate-900/90 border-slate-800 text-slate-400"
              )}>
                <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider">
                  {isDiagram ? <Workflow className="w-3.5 h-3.5 text-cyan-400" /> : <Code className="w-3.5 h-3.5 text-indigo-400" />}
                  {isDiagram ? "Examination Visual Schema / Diagram" : language}
                </span>
                <div className="flex items-center gap-2">
                  {isDiagram && onSnipRequest && (
                    <button
                      type="button"
                      onClick={onSnipRequest}
                      className="flex items-center gap-1 text-[10px] text-cyan-300 hover:text-white px-2 py-0.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/50 transition-all font-sans font-bold cursor-pointer"
                      title="Snip original figure from PDF"
                    >
                      <Scissors className="w-3 h-3 text-cyan-400" /> Snip from PDF
                    </button>
                  )}
                  {!hideCopyButton && (
                    <button
                      type="button"
                      onClick={() => handleCopy(codeContent, i)}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-all font-sans font-bold"
                    >
                      {copiedIndex === i ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <pre className={cn(
                "p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-snug overflow-x-auto scrollbar-thin",
                hideCopyButton ? "select-none" : "select-all",
                isDiagram ? "text-cyan-200" : "text-emerald-300"
              )}>
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        }

        // Paragraphs and lines
        const paragraphs = part.split(/\n\n+/);
        return paragraphs.map((para, pIdx) => {
          if (!para.trim()) return null;
          const lines = para.split('\n');

          return (
            <p
              key={`${i}-${pIdx}`}
              className={cn(
                "leading-relaxed whitespace-pre-wrap break-words",
                isQuestion
                  ? "text-slate-900 font-bold text-sm sm:text-base lg:text-lg"
                  : "text-slate-700 text-xs sm:text-sm font-medium"
              )}
            >
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {renderInlineFormatted(line, `${i}-${pIdx}-${lIdx}`)}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          );
        });
      })}
    </div>
  );
};
export default AcademicTextRenderer;
