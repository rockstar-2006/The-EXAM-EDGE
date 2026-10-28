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
}

export async function generateQuestions(
  params: GenerateQuestionsParams
): Promise<Question[]> {
  const { text, numQuestions, type, customPrompt, difficulty, aiSettings } = params;

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

  // Construct standard instruction prompt
  let difficultyInstruction = '';
  if (difficulty && difficulty !== 'mixed') {
    difficultyInstruction = `- Difficulty level: ${difficulty.toUpperCase()}`;
  } else if (difficulty === 'mixed') {
    difficultyInstruction = '- Mix difficulty levels across questions (easy to hard)';
  }

  const prompt = `
ROLE: Academic Content Analyzer and Assessment Architect.

TASK: Generate ${numQuestions} assessment items based STRICTLY on the provided SOURCE MATERIAL below.
- You must NOT use outside knowledge or hallucinations. If the information is not in the SOURCE MATERIAL, do not ask about it.
- If the content provided is insufficient for ${numQuestions} questions, generate as many high-quality questions as possible based solely on the text.

SOURCE MATERIAL:
"""
${text}
"""

${combinedPromptDirectives}

PARAMETERS:
- Quantity: ${numQuestions} items.
- Format: ${type === 'mcq' ? 'Multiple Choice (MCQ)' : type === 'short-answer' ? 'Short Answer' : 'Mixed MCQ and Short Answer'}.
${difficultyInstruction}

RICH CONTENT RULES:
- If the source material contains code snippets, diagrams (described in text), or figures, YOU MUST INCLUDE THEM in the "question" field using Markdown code blocks or clear descriptions.
- For programming topics (like C, Python, Java), PRIORITIZE questions that include code snippets for analysis.
- Format code snippets using markdown code blocks (\`\`\`java ... \`\`\`).
- CRITICAL: Code blocks MUST use multi-line formatting with proper indentation. 
- CRITICAL: DO NOT output code in ALL CAPS. Use proper mixed case (e.g., "public class" not "PUBLIC CLASS").
- Ensure the question text clearly references the code or figure.

MCQ RULES:
- Provide 4 distinct options (A, B, C, D).
- Ensure only ONE option is correct.
- Distractors should be plausible but clearly incorrect based on the text.
- Randomize the position of the correct answer (ensure a balanced distribution of A, B, C, D across the quiz).
- Avoid repeating the same correct answer letter for consecutive questions.
- Ensure all 4 options are distinct and unique.

OUTPUT FORMAT:
Return a strictly valid JSON array of objects. No markdown formatting around the output, no intro/outro text.
Structure:
[
  {
    "id": "generated_1",
    "type": "mcq",
    "question": "Question text here...",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": "B",
    "explanation": "Brief explanation citing the source text."
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
          temperature: 0.3
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
    // 🚀 ROUTE 3: GOOGLE GEMINI (Custom or System Default)
    else {
      const activeKey = (provider === 'gemini' && customKey) ? customKey : DEFAULT_GEMINI_KEY;
      if (!activeKey) {
        throw new Error('Gemini API key is not configured. Add your key in Settings or contact your administrator.');
      }

      const genAI = new GoogleGenerativeAI(activeKey);
      const activeModel = (provider === 'gemini' && modelName) ? modelName : 'gemini-2.5-flash';
      const model = genAI.getGenerativeModel({ model: activeModel });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      jsonResponseText = response.text();
    }
  } catch (apiError: any) {
    console.error(`Error calling ${provider} AI service:`, apiError);
    const status = apiError?.response?.status;
    const msg = apiError?.response?.data?.error?.message || apiError?.message || '';

    if (status === 401 || status === 403 || msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('unauthorized')) {
      throw new Error(`Invalid or unauthorized ${provider.toUpperCase()} API Key. Please verify your key in Settings.`);
    }
    if (status === 404 || msg.toLowerCase().includes('model') || msg.toLowerCase().includes('not found')) {
      throw new Error(`The model "${modelName || 'default'}" was not found or is unavailable for ${provider}. Please check model name in Settings.`);
    }
    if (status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
      throw new Error(`Rate limit or token quota exceeded on your ${provider.toUpperCase()} account. Please try again later or switch models.`);
    }
    throw new Error(msg || `Failed to generate questions using ${provider}. Please check your connection and Settings.`);
  }

  // Sanitize and extract JSON
  let cleanJson = jsonResponseText.trim();
  cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // Find array boundaries in case the model added conversational prefix or suffix
  const firstBracket = cleanJson.indexOf('[');
  const lastBracket = cleanJson.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
    cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
  }

  try {
    const questions: Question[] = JSON.parse(cleanJson);
    return questions.map((q, index) => ({
      ...q,
      id: q.id || `gen_${Date.now()}_${index}`,
      isBookmarked: false,
      isSelected: true,
      options: q.type === 'mcq' && !q.options ? ['True', 'False'] : q.options
    }));
  } catch (parseError) {
    console.error('Failed to parse AI output as JSON:', cleanJson);
    throw new Error('AI output formatting error. Please try generating again.');
  }
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
