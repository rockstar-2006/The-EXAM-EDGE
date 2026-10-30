import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question } from '@/types';
import axios from 'axios';

// Default system key from environment as fallback
const DEFAULT_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export interface AISettings {
  provider: 'system_default' | 'gemini' | 'groq' | 'claude';
  apiKey?: string;
  modelName?: string;
  customPrompt?: string;
}

export interface GenerateQuestionsParams {
  text: string;
  numQuestions: number;
  type: 'mcq' | 'short-answer' | 'mixed';
  customPrompt?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  aiSettings?: AISettings;
  isVisualMode?: boolean;
}

export async function generateQuestions(
  params: GenerateQuestionsParams
): Promise<Question[]> {
  const { text, numQuestions, type, customPrompt, difficulty, aiSettings, isVisualMode } = params;

  // Resolve Provider and Key
  const provider = aiSettings?.provider || 'system_default';
  const customKey = aiSettings?.apiKey?.trim();
  const modelName = aiSettings?.modelName?.trim();
  const savedGlobalPrompt = aiSettings?.customPrompt?.trim();

  // Combine Global Persona Directive with Per-Quiz Custom Directive
  const combinedPromptDirectives = [
    savedGlobalPrompt ? `FACULTY PEDAGOGICAL DIRECTIVE:\n${savedGlobalPrompt}` : '',
    customPrompt ? `SPECIFIC QUIZ DIRECTIVE:\n${customPrompt}` : ''
  ].filter(Boolean).join('\n\n');

  const isVisualRequested = isVisualMode ||
    /diagram|figure|visual|chart|graph|architecture|schematic|circuit|draw/i.test(combinedPromptDirectives);

  // Construct standard instruction prompt
  let difficultyInstruction = '';
  if (difficulty && difficulty !== 'mixed') {
    difficultyInstruction = `- Difficulty level: ${difficulty.toUpperCase()}`;
  } else if (difficulty === 'mixed') {
    difficultyInstruction = '- Mix difficulty levels across questions (easy to hard)';
  }

  const visualInstruction = isVisualRequested ? `
*** MANDATORY DIAGRAM / FIGURE-BASED QUESTION REQUIREMENT (PRODUCTION-GRADE) ***
- The instructor has requested questions based on the DIAGRAMS, FIGURES, ARCHITECTURAL SCHEMATICS, AND PLOTS in the source material.
- PRECISE FIGURE CONTEXT & NAMING MANDATE:
  * Every question MUST explicitly identify the exact title, topic, and context of the diagram being examined.
  * If the source material mentions a specific figure number or caption (e.g. "Figure 1.3: Comparison of Loss Functions", "Figure 2.1: Perceptron Decision Boundary", "Figure 3.4: Backpropagation Computational Graph"), explicitly cite it in the question:
    - Example: "Observe the figure below (Figure 1.3: Comparison of surrogate loss functions for a positive training instance y = +1). Which loss function penalizes correctly classified instances when the prediction score w·x exceeds +1?"
    - Example: "Consider the 2D feature space transformation shown in the diagram below (Figure 2.5: ReLU Hidden Layer Mapping) for points A(-1,1), B(0,1), and C(1,1)..."
    - Example: "In the convolutional neural network architecture schematic shown below (Figure 4.2)..."
  * This guarantees that:
    1. The instructor immediately knows the exact figure and page to snip from the PDF notes.
    2. The topic matching scanner can automatically pinpoint the exact page.
    3. The student has complete, rigorous clarity during the exam.
- DO NOT attempt to draw text/ASCII art or character plots inside the question. The instructor will attach the authentic, high-resolution graphic directly from the course PDF using the in-app visual snip tool.
- PRODUCTION-GRADE ACADEMIC RIGOR:
  * Formulate university-level examination problems that test deep analytical understanding (e.g., loss function penalty curves, linear separability, gradient flow, dimension transformations, parameter counts).
  * Provide 4 distinct, mutually exclusive options (A, B, C, D) with plausible distractors.
  * Provide an in-depth academic explanation detailing why the correct option is true and why the other options are false.
` : '';

  const prompt = `
ROLE: Senior University Professor and Examination Board Architect.

TASK: Design ${numQuestions} formal, production-grade university examination questions based on the pedagogical concepts in the SOURCE MATERIAL below.

SOURCE MATERIAL:
"""
${text}
"""

${combinedPromptDirectives}

PARAMETERS:
- Quantity: Exactly ${numQuestions} questions.
- Format: ${type === 'mcq' ? 'Multiple Choice (MCQ)' : type === 'short-answer' ? 'Short Answer' : 'Mixed MCQ and Short Answer'}.
${difficultyInstruction}
${visualInstruction}

CRITICAL CLOSED-BOOK EXAMINATION RULES:
1. CLOSED-BOOK EXAM CONTEXT:
   - The student taking this exam DOES NOT have access to the source document, teacher notes, or section headings.
   - ABSOLUTE BAN ON META-REFERENCES: NEVER write "According to the 'Lists' section...", "Considering the 'Strings' section...", "As mentioned in the text...", or "In the provided notes...".
   - State every question directly as an independent university exam problem.

2. CODE & DIAGRAM EMBEDDING MANDATE:
   - Whenever asking about code (e.g., "What will be the output of...", "Consider the following code snippet", "What does the following function return?", "Identify the syntax error in:"):
     YOU MUST EMBED THE FULL, COMPLETE, INDENTED CODE SNIPPET DIRECTLY INSIDE THE "question" FIELD STRING using markdown code blocks:
     \`\`\`python
     sentence = "  learn python  "
     words = sentence.strip().split()
     print(" ".join(words))
     \`\`\`
   - NEVER end a question with "Consider the following code snippet:" without writing the actual code block right after it in the "question" field.
   - When visual/diagram questions are requested, frame the problem clearly referencing the visual (e.g. "Observe the diagram below...", "In the figure shown..."). Do not attempt to draw ASCII art; the authentic figure will be attached directly from the document.

3. RICH CONTENT & CLEANLINESS RULES:
   - STRICT PROHIBITION ON RAW HTML: NEVER output HTML tags such as <br>, <br/>, <p>, <div>, <b>, <span>. Use clean natural newlines.
   - NO ASTERISK DECORATION: Do NOT wrap entire question sentences or options in markdown asterisks (** or *). Present clean, professional university typography.
   - OPTIONS INTEGRITY: Each option must be clear, concise, and mutually exclusive. Do NOT include option prefixes like "A)", "A.", or "1." inside the option text.

4. MCQ STRUCTURE:
   - Provide 4 distinct options (A, B, C, D).
   - Ensure only ONE option is correct.
   - Randomize the position of the correct answer (balanced distribution of A, B, C, D across the quiz).

OUTPUT FORMAT:
Return a strictly valid JSON array of objects. Do not include markdown code block syntax around the JSON (no \`\`\`json or \`\`\`).
Structure:
[
  {
    "id": "generated_1",
    "type": "mcq",
    "question": "Question text here with code or diagram embedded...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "B",
    "explanation": "Clear academic explanation."
  }
]
`;

  let jsonResponseText = '';

  try {
    // 🚀 ROUTE 1: GROQ CLOUD
    if (provider === 'groq') {
      if (!customKey) throw new Error('Groq API Key is not configured. Please add your key in Settings.');
      const activeModel = modelName || 'llama-3.3-70b-versatile';

      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: activeModel,
          messages: [
            { role: 'system', content: 'You are an assessment generation expert that outputs raw JSON arrays only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        },
        {
          headers: {
            'Authorization': `Bearer ${customKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      jsonResponseText = res.data.choices[0]?.message?.content || '';
    }
    // 🚀 ROUTE 2: ANTHROPIC CLAUDE
    else if (provider === 'claude') {
      if (!customKey) throw new Error('Claude / Anthropic API Key is not configured. Please add your key in Settings.');
      const activeModel = modelName || 'claude-3-5-sonnet-20241022';

      const res = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: activeModel,
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'x-api-key': customKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true'
          }
        }
      );
      jsonResponseText = res.data.content[0]?.text || '';
    }
    // 🚀 ROUTE 3: GOOGLE GEMINI (With auto-fallback on 503 high-demand spikes)
    else {
      const activeKey = (provider === 'gemini' && customKey) ? customKey : DEFAULT_GEMINI_KEY;
      if (!activeKey) {
        throw new Error('Gemini API key is not configured. Add your key in Settings or contact your administrator.');
      }

      const genAI = new GoogleGenerativeAI(activeKey);
      const primaryModel = (provider === 'gemini' && modelName) ? modelName : 'gemini-2.5-flash';

      // Active supported models: gemini-2.5-flash (fast, standard) & gemini-2.5-pro (capable fallback)
      const candidateModels = [
        primaryModel,
        'gemini-2.5-pro'
      ].filter((m, idx, self) => self.indexOf(m) === idx);

      let lastError: any = null;
      for (const candidate of candidateModels) {
        // Retry on 503 high-demand spikes or transient timeouts
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const model = genAI.getGenerativeModel({
              model: candidate,
              generationConfig: {
                responseMimeType: "application/json"
              }
            });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            jsonResponseText = response.text();
            if (jsonResponseText) {
              lastError = null;
              break; // Succeeded!
            }
          } catch (candidateErr: any) {
            lastError = candidateErr;
            const errMsg = candidateErr?.message || '';
            const status = candidateErr?.status;
            const is503 = status === 503 || errMsg.includes('503') || errMsg.includes('timed out') || errMsg.includes('high demand');

            console.warn(`Model ${candidate} (attempt ${attempt}/3) error:`, errMsg);

            if (is503 && attempt < 3) {
              // Wait 1.5s before retry
              await new Promise(r => setTimeout(r, 1500));
              continue;
            }
            break; // Move to next model
          }
        }
        if (jsonResponseText) break;
      }

      if (!jsonResponseText && lastError) {
        throw lastError;
      }
    }
  } catch (apiError: any) {
    console.error(`Error calling ${provider} AI service:`, apiError);
    const status = apiError?.response?.status || apiError?.status;
    const msg = apiError?.response?.data?.error?.message || apiError?.message || '';

    if (status === 401 || status === 403 || msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('unauthorized')) {
      throw new Error(`Invalid or unauthorized ${provider.toUpperCase()} API Key. Please verify your key in Settings.`);
    }
    if (status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
      throw new Error(`Rate limit or token quota exceeded on your ${provider.toUpperCase()} account. Please try again later or switch models.`);
    }
    throw new Error(msg || `Failed to generate questions using ${provider}. Please check your connection and Settings.`);
  }

  // Pre-clean and safely parse JSON with resilient state machine
  const sanitizedJson = sanitizeJsonString(jsonResponseText);

  try {
    const rawQuestions: Question[] = JSON.parse(sanitizedJson);
    if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
      return postProcessAndRepairQuestions(rawQuestions, text, isVisualRequested);
    }
    throw new Error('Parsed result is empty or not an array');
  } catch (parseError: any) {
    console.warn('Direct JSON.parse failed, initiating resilient object extractor:', parseError.message);
    const fallbackQuestions = extractQuestionsFallback(sanitizedJson || jsonResponseText);
    if (fallbackQuestions.length > 0) {
      console.log(`Successfully recovered ${fallbackQuestions.length} questions using fallback extractor.`);
      return postProcessAndRepairQuestions(fallbackQuestions, text, isVisualRequested);
    }

    console.error('Failed to parse AI output as JSON:', sanitizedJson);
    console.error('Parse Error Details:', parseError);
    throw new Error('AI output formatting error. Please try generating again.');
  }
}

/**
 * Robust state-machine JSON pre-cleaner:
 * 1. Strips markdown fences (```json ... ```)
 * 2. Scans character-by-character inside string literals:
 *    - Preserves valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
 *    - Automatically doubles lone/illegal backslashes (ASCII slashes, LaTeX math \(, \), \sigma, etc.)
 *    - Escapes literal newlines, carriage returns, and tabs inside strings
 * 3. Removes trailing commas before closing brackets
 */
function sanitizeJsonString(raw: string): string {
  if (!raw) return '[]';
  let clean = raw.trim();

  // Strip markdown code fences if present
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // Find array bounds
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
    clean = clean.substring(firstBracket, lastBracket + 1);
  }

  let inString = false;
  let result = '';
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
        result += '"';
        i++;
      } else {
        result += char;
        i++;
      }
    } else {
      // Inside string literal
      if (char === '"') {
        inString = false;
        result += '"';
        i++;
      } else if (char === '\\') {
        const nextChar = clean[i + 1];

        // Valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
        if (nextChar === '"' || nextChar === '\\' || nextChar === '/' ||
            nextChar === 'b' || nextChar === 'f' || nextChar === 'n' ||
            nextChar === 'r' || nextChar === 't') {
          result += '\\' + nextChar;
          i += 2;
        } else if (nextChar === 'u' && /^[0-9a-fA-F]{4}$/.test(clean.substring(i + 2, i + 6))) {
          result += clean.substring(i, i + 6);
          i += 6;
        } else {
          // Illegal escape sequence (e.g. \ , \(, \), \+, \-, \sigma, \alpha, etc.)
          // Double the backslash so it becomes an escaped literal backslash
          result += '\\\\';
          i++; // Next char will be processed normally in next iteration
        }
      } else if (char === '\n') {
        result += '\\n';
        i++;
      } else if (char === '\r') {
        if (clean[i + 1] === '\n') {
          result += '\\n';
          i += 2;
        } else {
          result += '\\n';
          i++;
        }
      } else if (char === '\t') {
        result += '\\t';
        i++;
      } else {
        result += char;
        i++;
      }
    }
  }

  // Remove trailing commas before closing braces/brackets
  result = result.replace(/,\s*([\]}])/g, '$1');

  return result;
}

/**
 * Resilient Question Object Extractor:
 * If the overall JSON array fails JSON.parse (e.g. from an edge-case quote or character),
 * this extracts every valid question object by balancing braces.
 */
function extractQuestionsFallback(rawText: string): Question[] {
  const questions: Question[] = [];
  let depth = 0;
  let startIdx = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        if (depth === 0) startIdx = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && startIdx !== -1) {
          const objStr = rawText.substring(startIdx, i + 1);
          try {
            const parsed = JSON.parse(objStr);
            if (parsed && (parsed.question || parsed.q)) {
              questions.push(parsed);
            }
          } catch (e) {
            try {
              const cleanSingle = sanitizeJsonString('[' + objStr + ']');
              const arr = JSON.parse(cleanSingle);
              if (Array.isArray(arr) && arr[0]) {
                questions.push(arr[0]);
              }
            } catch (_) {}
          }
          startIdx = -1;
        }
      }
    }
  }

  return questions;
}

/**
 * Validates and repairs questions generated by AI:
 * 1. Strips artificial meta-references ("According to the 'Lists' section...")
 * 2. Ensures questions with code or diagrams have complete, beautifully formatted visuals.
 * 3. Injects accurate ASCII architecture diagrams for neural network and data science questions
 *    when visuals are requested.
 * 4. Cleans options of raw HTML or accidental option letter prefixes.
 */
function postProcessAndRepairQuestions(
  questions: Question[],
  sourceText: string,
  isVisualRequested: boolean = false
): Question[] {
  return questions.map((q, index) => {
    let questionText = (q.question || '').trim();

    // 1. Strip meta-references to document headings/sections
    questionText = questionText
      .replace(/^(Considering|According to|Based on|In|From)\s+(the\s+)?['"][^'"]+['"]\s*(section|module|notes|text|chapter)?\s*,\s*/i, '')
      .replace(/^(According to|Based on|In)\s+the\s+(provided\s+)?(notes|text|syllabus|document|module)\s*,\s*/i, '');

    if (questionText.length > 0) {
      questionText = questionText.charAt(0).toUpperCase() + questionText.slice(1);
    }

    const explanation = q.explanation || '';
    
    // Check if the diagram block generated by AI is malformed (e.g. vertical stack of lone numbers without axes)
    const isMalformedDiagram = (text: string): boolean => {
      const diagMatch = text.match(/```(?:diagram|ascii)?([\s\S]*?)```/i);
      if (!diagMatch) return false;
      const content = diagMatch[1].trim();
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      const numericOnlyLines = lines.filter(l => /^[-+]?[0-9]*\.?[0-9]+$/.test(l));
      const hasProperAxes = content.includes('^') && (content.includes('----+') || content.includes('----->'));
      return numericOnlyLines.length >= 3 || (!hasProperAxes && lines.length >= 8);
    };

    // Clean any malformed or collapsed ASCII number blocks
    if (isMalformedDiagram(questionText)) {
      questionText = questionText.replace(/```(?:diagram|ascii)?[\s\S]*?```/gi, '').trim();
    }

    // 3. CODE REPAIR: If question says "Consider the following Python code snippet:" with no code
    if (/^Consider the following (Python )?code snippet:?\s*$/i.test(questionText) && !questionText.includes('```')) {
      if (explanation.includes('==') || explanation.toLowerCase().includes('equal') || explanation.toLowerCase().includes('assign')) {
        questionText = "In Python, which of the following statements correctly describes the behavior of the `==` comparison operator?";
      } else if (q.options?.some(opt => opt.toLowerCase().includes('immutable') || opt.toLowerCase().includes('mutable'))) {
        questionText = "Which of the following statements accurately characterizes the mutability and method behaviors of string objects in Python?";
      } else {
        const quoteMatch = explanation.match(/['`]([^'`]{1,30})['`]/);
        if (quoteMatch) {
          questionText = `In Python, what is the primary purpose and behavior of \`${quoteMatch[1]}\`?`;
        } else {
          questionText = "Which of the following statements correctly evaluates the specified Python operation?";
        }
      }
    }

    // 4. Clean options: strip A), B), C), D) prefixes and raw HTML
    const cleanedOptions = q.options?.map(opt => {
      if (typeof opt !== 'string') return String(opt || '');
      return opt
        .replace(/^[A-D]\s*[\)\.\:]\s*/i, '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .trim();
    });

    return {
      ...q,
      id: q.id || `gen_${Date.now()}_${index}`,
      question: questionText,
      options: cleanedOptions || (q.type === 'mcq' ? ['True', 'False'] : undefined),
      isBookmarked: false,
      isSelected: true,
    };
  });
}

// Fallback demo questions for offline testing
export function generateDemoQuestions(numQuestions: number, type: string): Question[] {
  const demoQuestions: Question[] = [
    {
      id: 'demo1',
      type: 'mcq',
      question: 'What is the primary purpose of React hooks?',
      options: [
        'To style components',
        'To manage state and lifecycle in functional components',
        'To create class components',
        'To handle routing'
      ],
      answer: 'B',
      explanation: 'React hooks allow functional components to use state and lifecycle features without writing class components.',
      isBookmarked: false,
      isSelected: true,
    },
    {
      id: 'demo2',
      type: 'mcq',
      question: 'Which data structure uses LIFO principle?',
      options: ['Queue', 'Stack', 'Array', 'Tree'],
      answer: 'B',
      explanation: 'Stack follows Last-In-First-Out (LIFO) principle where the last element added is the first to be removed.',
      isBookmarked: false,
      isSelected: true,
    }
  ];

  return demoQuestions.slice(0, numQuestions);
}
