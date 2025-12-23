import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question } from '@/types';

// Add your Gemini API key to .env as VITE_GEMINI_API_KEY
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('VITE_GEMINI_API_KEY is not set. Please add it to your .env file.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export interface GenerateQuestionsParams {
  text: string;
  numQuestions: number;
  type: 'mcq' | 'short-answer' | 'mixed';
  customPrompt?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}

export async function generateQuestions(
  params: GenerateQuestionsParams
): Promise<Question[]> {
  if (!genAI) {
    throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
  }

  const { text, numQuestions, type, customPrompt, difficulty } = params;

  // Construct the prompt based on question type and difficulty
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

${customPrompt ? `CUSTOM DIRECTIVE: ${customPrompt}` : ''}

PARAMETERS:
- Quantity: ${numQuestions} items.
- Format: ${type === 'mcq' ? 'Multiple Choice (MCQ)' : type === 'short-answer' ? 'Short Answer' : 'Mixed MCQ and Short Answer'}.
${difficultyInstruction}
RICH CONTENT RULES:
- If the source material contains code snippets, diagrams (described in text), or figures, YOU MUST INCLUDE THEM in the "question" field using Markdown code blocks or clear descriptions.
- For programming topics (like C, Python), PRIORITIZE questions that include code snippets for analysis (e.g., "What is the output of this code?", "Find the bug in this function").
- Format code snippets using markdown code blocks (\`\`\`c ... \`\`\`).
- Ensure the question text clearly references the code or figure.

MCQ RULES:
- Provide 4 distinct options (A, B, C, D).
- Ensure only ONE option is correct.
- Distractors should be plausible but clearly incorrect based on the text.
- Randomize the position of the correct answer (ensure a balanced distribution of A, B, C, D across the quiz).
- Avoid repeating the same correct answer letter for consecutive questions (e.g., do not output Answer: C, Answer: C, Answer: C).
- Ensure all 4 options are distinct and unique.

OUTPUT FORMAT:
Return a strictly valid JSON array of objects. No markdown, no intro/outro text.
Structure:
[
  {
    "id": "generated_1",
    "type": "mcq", // or "short-answer"
    "question": "Question text here...",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // only for MCQ
    "answer": "B", // The correct option letter (A/B/C/D) for MCQ, or the text answer for short-answer
    "explanation": "Brief explanation citing the source text."
  }
]
`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',  // Using the correct, stable model name
      generationConfig: {
        temperature: 0.7,  // Balanced creativity
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,  // Sufficient for large quizzes
      }
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Extract JSON from response (remove markdown code blocks if present)
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const questions: Question[] = JSON.parse(jsonText);

    // Validate and enhance the questions
    return questions.map((q, index) => ({
      ...q,
      id: q.id || `gen_${Date.now()}_${index}`,
      isBookmarked: false,
      isSelected: true,
      // Ensure options are present for MCQs if missing
      options: q.type === 'mcq' && !q.options ? ['True', 'False'] : q.options
    }));
  } catch (error) {
    console.error('Error generating questions with Gemini:', error);

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid API key. Please check your VITE_GEMINI_API_KEY in .env file.');
      }
      throw new Error(`Failed to generate questions: ${error.message}`);
    }

    throw new Error('Failed to generate questions. Please try again.');
  }
}

// Fallback demo questions for testing without API key
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
    },
    {
      id: 'demo3',
      type: 'short-answer',
      question: 'Explain the concept of closure in JavaScript.',
      answer: 'A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned.',
      explanation: 'Closures are created when a function is defined inside another function, giving the inner function access to the outer function\'s variables.',
      isBookmarked: false,
      isSelected: true,
    },
  ];

  return demoQuestions.slice(0, numQuestions);
}
