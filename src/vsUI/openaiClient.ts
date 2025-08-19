// Enhanced OpenAI client with error handling and rate limiting
export interface AIResponse {
  success: boolean;
  content: string;
  error?: string;
  tokensUsed?: number;
}

export interface AIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}

const defaultConfig: AIConfig = {
  model: "gpt-4o-mini",
  maxTokens: 800,
  temperature: 0.7,
  systemPrompt: "You are a friendly and knowledgeable coding mentor helping new developers learn a codebase. Provide clear, encouraging guidance while being concise and practical."
};

// Rate limiting
const rateLimiter = {
  requests: [] as number[],
  maxRequestsPerMinute: 20,
  
  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < 60000);
    return this.requests.length < this.maxRequestsPerMinute;
  },
  
  recordRequest(): void {
    this.requests.push(Date.now());
  }
};

export async function askAI(
  prompt: string, 
  config: Partial<AIConfig> = {},
  context?: string
): Promise<string> {
  const response = await askAIWithDetails(prompt, config, context);
  if (!response.success) {
    throw new Error(response.error || "AI request failed");
  }
  return response.content;
}

export async function askAIWithDetails(
  prompt: string,
  config: Partial<AIConfig> = {},
  context?: string
): Promise<AIResponse> {
  // Check rate limiting
  if (!rateLimiter.canMakeRequest()) {
    return {
      success: false,
      content: "",
      error: "Rate limit exceeded. Please wait a moment before asking again."
    };
  }

  // Check for API key
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    return {
      success: false,
      content: "",
      error: "OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file."
    };
  }

  const finalConfig = { ...defaultConfig, ...config };
  
  try {
    rateLimiter.recordRequest();
    
    const messages = [
      { role: "system", content: finalConfig.systemPrompt }
    ];
    
    if (context) {
      messages.push({ role: "user", content: `Context: ${context}` });
    }
    
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: finalConfig.model,
        messages,
        max_tokens: finalConfig.maxTokens,
        temperature: finalConfig.temperature,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = `HTTP ${response.status}`;
      
      if (response.status === 401) {
        errorMessage = "Invalid API key. Please check your OpenAI API key.";
      } else if (response.status === 429) {
        errorMessage = "API rate limit reached. Please try again later.";
      } else if (response.status === 500) {
        errorMessage = "OpenAI server error. Please try again.";
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
      
      return {
        success: false,
        content: "",
        error: errorMessage
      };
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        content: "",
        error: "No response from AI model"
      };
    }

    const content = data.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        content: "",
        error: "Empty response from AI model"
      };
    }

    return {
      success: true,
      content: content.trim(),
      tokensUsed: data.usage?.total_tokens
    };

  } catch (error) {
    console.error("AI request failed:", error);
    
    let errorMessage = "Failed to connect to AI service";
    if (error instanceof Error) {
      if (error.message.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      content: "",
      error: errorMessage
    };
  }
}

// Specialized AI functions for different use cases
export async function generateTaskHint(taskDescription: string, userAttempt?: string): Promise<string> {
  const prompt = userAttempt 
    ? `The user is stuck on: "${taskDescription}". They tried: "${userAttempt}". Give a helpful hint without revealing the answer.`
    : `Give a helpful hint for this task: "${taskDescription}"`;
    
  return askAI(prompt, {
    maxTokens: 200,
    temperature: 0.8,
    systemPrompt: "You are an encouraging mentor. Give concise, actionable hints that guide learning."
  });
}

export async function evaluateUserAnswer(question: string, expectedAnswer: string, userAnswer: string): Promise<{
  isCorrect: boolean;
  feedback: string;
  score: number; // 0-100
}> {
  const prompt = `Question: "${question}"
Expected: "${expectedAnswer}"  
User answered: "${userAnswer}"

Evaluate if the user's answer demonstrates understanding. Give a score 0-100 and helpful feedback.`;

  try {
    const response = await askAI(prompt, {
      maxTokens: 300,
      systemPrompt: "You are a fair evaluator. Be encouraging while being accurate about correctness."
    });
    
    // Simple parsing - in production you'd want structured output
    const scoreMatch = response.match(/(\d+)\/100|(\d+)%|score:?\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3]) : 50;
    
    const isCorrect = score >= 70; // 70% threshold for correctness
    
    return {
      isCorrect,
      score,
      feedback: response
    };
  } catch (error) {
    return {
      isCorrect: false,
      score: 0,
      feedback: "Could not evaluate answer due to AI service error."
    };
  }
}

export async function generatePersonalizedFeedback(
  completedTasks: string[],
  timeSpent: number,
  struggledTasks: string[]
): Promise<string> {
  const prompt = `The user completed ${completedTasks.length} onboarding tasks in ${timeSpent} minutes.
They struggled with: ${struggledTasks.join(", ") || "none"}.

Generate encouraging personalized feedback about their progress and suggestions for continued learning.`;

  return askAI(prompt, {
    maxTokens: 400,
    temperature: 0.8,
    systemPrompt: "You are a supportive mentor celebrating progress and providing constructive guidance."
  });
}
