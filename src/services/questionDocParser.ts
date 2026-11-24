import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { Question } from '@/types';

/**
 * Parses raw text containing formatted questions into structured Question objects.
 * Handles formats like:
 * Q1: Question text
 * A) Option A
 * B) Option B
 * C) Option C
 * D) Option D
 * Correct Answer: B (or Option B text)
 * Explanation: Some explanation
 */
export function parseTextContent(rawText: string): Question[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize line endings
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into question blocks
  // Look for line-starting question identifiers (Q1, 1., Question 1, etc.)
  const questionBlocks = text.split(/(?=(?:^|\n)\s*(?:Q(?:uestion)?\s*\d+[\.:\)]|\d+[\.:\)]))/i)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  const parsed: Question[] = [];

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let questionText = '';
    const options: string[] = [];
    let answer = '';
    let explanation = '';
    let type: 'mcq' | 'short-answer' = 'mcq';
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    let marks = 1;

    for (const line of lines) {
      // Question line (e.g. "Q1: What is...", "1. Explain...", "Question 2: ...")
      const qMatch = line.match(/^(?:Q(?:uestion)?\s*\d*[\.:\)]|\d+[\.:\)])\s*(.+)/i);
      if (qMatch && !questionText) {
        questionText = qMatch[1].trim();
        continue;
      }

      // Option line (e.g. "A) ...", "A. ...", "(A) ...", "[A] ...")
      const optMatch = line.match(/^(?:[A-D][\)\.\:\-]|(?:\([A-D]\))|(?:\[[A-D]\]))\s*(.+)/i);
      if (optMatch) {
        options.push(optMatch[1].trim());
        continue;
      }

      // Correct Answer line (e.g. "Correct Answer: B", "Answer: git status", "Ans: A")
      const ansMatch = line.match(/^(?:Correct\s*Answer|Answer|Ans)\s*[\:\-]\s*(.+)/i);
      if (ansMatch) {
        answer = ansMatch[1].trim();
        continue;
      }

      // Explanation line (e.g. "Explanation: ...", "Reason: ...")
      const expMatch = line.match(/^(?:Explanation|Reason|Rationale)\s*[\:\-]\s*(.+)/i);
      if (expMatch) {
        explanation = expMatch[1].trim();
        continue;
      }

      // Question Type specification (e.g. "Type: short-answer" or "Type: mcq")
      const typeMatch = line.match(/^(?:Type|Format)\s*[\:\-]\s*(.+)/i);
      if (typeMatch) {
        if (/short/i.test(typeMatch[1])) type = 'short-answer';
        continue;
      }

      // Marks specification (e.g. "Marks: 2")
      const marksMatch = line.match(/^(?:Marks?|Score|Points?)\s*[\:\-]\s*(\d+)/i);
      if (marksMatch) {
        marks = parseInt(marksMatch[1], 10) || 1;
        continue;
      }

      // Difficulty specification (e.g. "Difficulty: easy/medium/hard")
      const diffMatch = line.match(/^(?:Difficulty|Level)\s*[\:\-]\s*(easy|medium|hard)/i);
      if (diffMatch) {
        difficulty = diffMatch[1].toLowerCase() as any;
        continue;
      }

      // If no options or answer hit yet, it might be a multi-line question
      if (options.length === 0 && !answer && !explanation) {
        if (!questionText) {
          questionText = line;
        } else {
          questionText += ' ' + line;
        }
      }
    }

    if (questionText) {
      if (options.length >= 2) {
        type = 'mcq';
        // If answer is single letter like 'A' or 'Option A', map to option text
        const letterMatch = answer.match(/^(?:Option\s*)?([A-D])$/i);
        if (letterMatch) {
          const letterIndex = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
          if (options[letterIndex]) {
            answer = options[letterIndex];
          }
        }
      } else {
        type = 'short-answer';
      }

      parsed.push({
        id: `imported-${Date.now()}-${i}`,
        question: questionText,
        options: type === 'mcq' ? options : [],
        answer: answer || (options[0] || ''),
        explanation: explanation || '',
        marks,
        type,
        difficulty,
        isSelected: true
      });
    }
  }

  return parsed;
}

/**
 * Extracts plain text from a Word .docx file using JSZip and DOMParser,
 * then parses it into Question objects.
 */
export async function parseWordDocx(file: File): Promise<Question[]> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const docXml = await zip.file('word/document.xml')?.async('text');

  if (!docXml) {
    throw new Error('Could not find word/document.xml in the provided .docx file');
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXml, 'application/xml');
  const paragraphs = xmlDoc.getElementsByTagName('w:p');

  const lines: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const textNodes = paragraphs[i].getElementsByTagName('w:t');
    let line = '';
    for (let j = 0; j < textNodes.length; j++) {
      line += textNodes[j].textContent || '';
    }
    if (line.trim()) {
      lines.push(line.trim());
    }
  }

  const fullText = lines.join('\n');
  return parseTextContent(fullText);
}

/**
 * Parses an Excel (.xlsx, .xls, .csv) file into structured questions.
 */
export async function parseExcelFile(file: File): Promise<Question[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const parsed: Question[] = [];

  rows.forEach((row, idx) => {
    const qText = row['Question'] || row['question'] || row['Question Text'] || row['QUESTION'] || row['Prompt'];
    if (!qText || !String(qText).trim()) return;

    const optA = String(row['Option A'] || row['OptionA'] || row['A'] || row['Option 1'] || '').trim();
    const optB = String(row['Option B'] || row['OptionB'] || row['B'] || row['Option 2'] || '').trim();
    const optC = String(row['Option C'] || row['OptionC'] || row['C'] || row['Option 3'] || '').trim();
    const optD = String(row['Option D'] || row['OptionD'] || row['D'] || row['Option 4'] || '').trim();

    const options = [optA, optB, optC, optD].filter(Boolean);
    const rawType = String(row['Type'] || row['type'] || '').toLowerCase();
    const isShortAnswer = rawType.includes('short') || options.length === 0;

    let ans = String(row['Correct Answer'] || row['Answer'] || row['answer'] || row['Correct'] || row['Key'] || '').trim();
    const letterMatch = ans.match(/^(?:Option\s*)?([A-D])$/i);
    if (letterMatch && options.length > 0) {
      const charIdx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
      if (options[charIdx]) {
        ans = options[charIdx];
      }
    }

    const exp = String(row['Explanation'] || row['explanation'] || row['Reason'] || '').trim();
    const marks = Number(row['Marks'] || row['marks'] || 1) || 1;
    const diff = (row['Difficulty'] || 'medium').toString().toLowerCase();

    parsed.push({
      id: `imported-excel-${Date.now()}-${idx}`,
      question: String(qText).trim(),
      options: isShortAnswer ? [] : options,
      answer: ans || (options[0] || ''),
      explanation: exp,
      marks,
      type: isShortAnswer ? 'short-answer' : 'mcq',
      difficulty: (['easy', 'medium', 'hard'].includes(diff) ? diff : 'medium') as any,
      isSelected: true
    });
  });

  return parsed;
}

/**
 * Universal auto-detection parser for any question document file (.docx, .xlsx, .csv, .txt, .md).
 */
export async function parseQuestionsFile(file: File): Promise<Question[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) {
    return await parseWordDocx(file);
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    return await parseExcelFile(file);
  } else {
    // Plain text or markdown
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
    return parseTextContent(text);
  }
}

/**
 * Generates and triggers download of a pre-formatted Excel template.
 */
export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      "S.No": 1,
      "Question": "Which command is used to create and switch to a new branch in Git?",
      "Type": "MCQ",
      "Option A": "git branch new-branch",
      "Option B": "git checkout -b new-branch",
      "Option C": "git merge new-branch",
      "Option D": "git push origin new-branch",
      "Correct Answer": "git checkout -b new-branch",
      "Explanation": "git checkout -b creates the specified branch and immediately checks it out.",
      "Difficulty": "easy"
    },
    {
      "S.No": 2,
      "Question": "What is the primary function of the Git staging area (Index)?",
      "Type": "MCQ",
      "Option A": "To delete untracked files",
      "Option B": "To prepare and curate commits before permanently saving them",
      "Option C": "To run continuous integration tests",
      "Option D": "To compile source code into binaries",
      "Correct Answer": "To prepare and curate commits before permanently saving them",
      "Explanation": "The staging area allows developers to review and organize specific changes for commit.",
      "Difficulty": "medium"
    },
    {
      "S.No": 3,
      "Question": "Explain the difference between 'git merge' and 'git rebase'.",
      "Type": "SHORT-ANSWER",
      "Option A": "",
      "Option B": "",
      "Option C": "",
      "Option D": "",
      "Correct Answer": "Merge creates a 3-way merge commit preserving history, while rebase rewrites commits sequentially onto the base branch.",
      "Explanation": "Merge preserves complete branching topology whereas rebase produces a linear commit history.",
      "Difficulty": "hard"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");

  ws['!cols'] = [
    { wch: 6 }, { wch: 55 }, { wch: 14 }, { wch: 25 }, { wch: 30 },
    { wch: 25 }, { wch: 25 }, { wch: 35 }, { wch: 45 }, { wch: 12 }
  ];

  XLSX.writeFile(wb, "FacultyQuest_Quiz_Template.xlsx");
}

/**
 * Generates and triggers download of a pre-formatted Microsoft Word (.docx) template.
 */
export async function downloadSampleWordTemplate() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "FACULTYQUEST - QUIZ QUESTIONS TEMPLATE",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: "Standard Format for Multiple Choice (MCQ) & Short Answer Questions",
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "" }),

        // Question 1
        new Paragraph({
          children: [
            new TextRun({ text: "Q1: Which command is used to create and switch to a new branch in Git?", bold: true }),
          ],
          spacing: { before: 200 },
        }),
        new Paragraph({ text: "A) git branch new-branch", indent: { left: 720 } }),
        new Paragraph({ text: "B) git checkout -b new-branch", indent: { left: 720 } }),
        new Paragraph({ text: "C) git merge new-branch", indent: { left: 720 } }),
        new Paragraph({ text: "D) git push origin new-branch", indent: { left: 720 } }),
        new Paragraph({
          children: [
            new TextRun({ text: "Correct Answer: ", bold: true, color: "2e7d32" }),
            new TextRun({ text: "B" }),
          ],
          spacing: { before: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Explanation: ", italics: true, bold: true }),
            new TextRun({ text: "git checkout -b creates the branch and immediately checks it out into your working tree.", italics: true }),
          ],
          spacing: { after: 250 },
        }),

        // Question 2
        new Paragraph({
          children: [
            new TextRun({ text: "Q2: What is the primary function of the Git staging area (Index)?", bold: true }),
          ],
          spacing: { before: 200 },
        }),
        new Paragraph({ text: "A) To permanently delete untracked files", indent: { left: 720 } }),
        new Paragraph({ text: "B) To prepare and curate changes before committing them", indent: { left: 720 } }),
        new Paragraph({ text: "C) To automatically execute test suites", indent: { left: 720 } }),
        new Paragraph({ text: "D) To compile application source code", indent: { left: 720 } }),
        new Paragraph({
          children: [
            new TextRun({ text: "Correct Answer: ", bold: true, color: "2e7d32" }),
            new TextRun({ text: "B" }),
          ],
          spacing: { before: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Explanation: ", italics: true, bold: true }),
            new TextRun({ text: "The staging area allows developers to selectively organize files and modifications for the next commit.", italics: true }),
          ],
          spacing: { after: 250 },
        }),

        // Question 3
        new Paragraph({
          children: [
            new TextRun({ text: "Q3: Explain the difference between 'git merge' and 'git rebase'.", bold: true }),
          ],
          spacing: { before: 200 },
        }),
        new Paragraph({ text: "Type: short-answer", indent: { left: 720 } }),
        new Paragraph({
          children: [
            new TextRun({ text: "Correct Answer: ", bold: true, color: "2e7d32" }),
            new TextRun({ text: "Merge creates a 3-way merge commit preserving history; rebase moves existing commits onto the tip of the base branch." }),
          ],
          spacing: { before: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Explanation: ", italics: true, bold: true }),
            new TextRun({ text: "Merge keeps complete branch history with extra merge commits, while rebase gives a clean linear history.", italics: true }),
          ],
          spacing: { after: 200 },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "FacultyQuest_Quiz_Template.docx");
}

/**
 * Generates and triggers download of a pre-formatted plain text (.txt) template.
 */
export function downloadSampleTextTemplate() {
  const content = `FACULTYQUEST - SAMPLE QUESTIONS DOCUMENT (.TXT / WORD FORMAT)
=============================================================

Q1: Which command is used to create and switch to a new branch in Git?
A) git branch new-branch
B) git checkout -b new-branch
C) git merge new-branch
D) git push origin new-branch
Correct Answer: B
Explanation: git checkout -b creates the specified branch and immediately switches to it.

Q2: What is the primary function of the Git staging area (Index)?
A) To permanently delete untracked files
B) To prepare and curate changes before committing them
C) To automatically execute test suites
D) To compile application source code
Correct Answer: B
Explanation: The staging area allows developers to selectively organize files and modifications for the next commit.

Q3: Explain the difference between 'git merge' and 'git rebase'.
Type: short-answer
Correct Answer: Merge creates a 3-way merge commit preserving history; rebase moves existing commits onto the tip of the base branch.
Explanation: Merge keeps complete branch history with extra merge commits, while rebase gives a clean linear history.
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, "FacultyQuest_Quiz_Template.txt");
}
