import { askAI } from "./openaiClient";

export type TaskType = "terminal" | "explore" | "qa" | "code-challenge" | "quiz" | "interactive";

export type TaskStatus = "pending" | "in-progress" | "completed" | "skipped";

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  estimatedTime: number; // in minutes
  difficulty: "easy" | "medium" | "hard";
  prerequisites?: string[]; // task IDs that must be completed first
  
  // Type-specific properties
  file?: string;
  command?: string;
  question?: string;
  answer?: string;
  expectedOutput?: string;
  
  // For quiz type
  quiz?: QuizQuestion;
  
  // For code challenges
  codeChallenge?: {
    prompt: string;
    starterCode: string;
    tests: { input: string; expected: string }[];
  };
  
  // AI-generated hints and feedback
  hints?: string[];
  aiContext?: string;
  
  // Progress tracking
  attempts?: number;
  startTime?: Date;
  completionTime?: Date;
  userNotes?: string;
};

export type OnboardingSession = {
  id: string;
  userId: string;
  repositoryName: string;
  startedAt: Date;
  currentTaskIndex: number;
  tasks: Task[];
  completedTasks: string[];
  sessionNotes: string;
  aiPersonality: "mentor" | "friendly" | "technical" | "encouraging";
};

// Advanced task generation with AI integration
export async function generateAdvancedTasks(
  repoName: string, 
  userLevel: "beginner" | "intermediate" | "advanced" = "intermediate",
  userRole?: string,
  repositories?: string[]
): Promise<Task[]> {
  // Generate role-specific base tasks
  const baseTasks = generateRoleSpecificTasks(repoName, userRole, userLevel, repositories);
  
  // Generate AI-enhanced tasks based on user level, role, and repository analysis
  try {
    const aiPrompt = `Generate 3 personalized onboarding tasks for a ${userLevel} ${userRole || 'developer'} working with the ${repoName} repository.
    
    Repository context: ${repoName} appears to be a React/TypeScript project with Firebase auth and Python backend.
    User role: ${userRole || 'developer'}
    Available repositories: ${repositories?.join(', ') || repoName}
    
    Create tasks that are:
    1. Specific to their role and responsibilities
    2. Relevant to the technology stack
    3. Progressive in difficulty from ${userLevel} level
    4. Include specific file references and commands
    5. Focus on what this role would actually do day-to-day
    
    For different roles, focus on:
    - Frontend Developer: React components, state management, UI/UX
    - Backend Developer: API endpoints, database, authentication
    - Full-Stack Developer: End-to-end features, integration
    - DevOps: Deployment, CI/CD, infrastructure
    - Product Manager: Feature analysis, user flows, requirements
    - Designer: UI components, user experience, design system
    - QA/Tester: Testing flows, edge cases, quality assurance
    
    Return tasks in this format:
    Task 1: [title] - [description] - Type: [qa/explore/terminal/quiz] - File: [filename if applicable] - Role Focus: [what this teaches them about their role]
    Task 2: [title] - [description] - Type: [qa/explore/terminal/quiz] - File: [filename if applicable] - Role Focus: [what this teaches them about their role]
    Task 3: [title] - [description] - Type: [qa/explore/terminal/quiz] - File: [filename if applicable] - Role Focus: [what this teaches them about their role]`;

    const aiResponse = await askAI(aiPrompt);
    const aiTasks = parseAITasks(aiResponse);
    
    return [...baseTasks, ...aiTasks];
  } catch (error) {
    console.warn("AI task generation failed:", error);
    
    // Fallback to role-specific tasks if AI fails
    const fallbackTasks = generateFallbackRoleTasks(repoName, userRole, userLevel);
    return [...baseTasks, ...fallbackTasks];
  }
}

// Generate role-specific base tasks
function generateRoleSpecificTasks(
  repoName: string, 
  userRole?: string, 
  userLevel: "beginner" | "intermediate" | "advanced" = "intermediate",
  repositories?: string[]
): Task[] {
  const welcomeTask: Task = {
    id: "welcome",
    title: `🎉 Welcome ${userRole ? `${userRole}` : 'Developer'} to ${repoName}`,
    description: `Let's get you onboarded with a ${userRole ? `${userRole}-focused` : 'personalized'} walkthrough designed for your role and responsibilities.`,
    type: "interactive",
    status: "pending",
    estimatedTime: 2,
    difficulty: "easy",
  };

  const setupTask: Task = {
    id: "setup-environment",
    title: "🔧 Environment Setup",
    description: `Set up your development environment. ${getRoleSpecificSetupTips(userRole)}`,
    type: "terminal",
    status: "pending",
    estimatedTime: 5,
    difficulty: "easy",
    command: "npm install && npm run dev",
    expectedOutput: "Local: http://localhost:",
    hints: getRoleSpecificHints(userRole, "setup")
  };

  // Role-specific tasks
  const roleTasks = generateTasksByRole(userRole, repoName, userLevel, repositories);

  return [welcomeTask, setupTask, ...roleTasks];
}

// Generate tasks specific to user role
function generateTasksByRole(
  userRole?: string, 
  repoName: string = "colicitv2", 
  userLevel: "beginner" | "intermediate" | "advanced" = "intermediate",
  repositories?: string[]
): Task[] {
  switch (userRole?.toLowerCase()) {
    case "frontend developer":
    case "frontend":
      return generateFrontendTasks(repoName, userLevel);
    
    case "backend developer":
    case "backend":
      return generateBackendTasks(repoName, userLevel);
    
    case "full-stack developer":
    case "fullstack":
    case "full stack":
      return generateFullStackTasks(repoName, userLevel);
    
    case "devops":
    case "devops engineer":
      return generateDevOpsTasks(repoName, userLevel);
    
    case "product manager":
    case "pm":
      return generateProductManagerTasks(repoName, userLevel, repositories);
    
    case "designer":
    case "ui/ux designer":
    case "ux designer":
      return generateDesignerTasks(repoName, userLevel);
    
    case "qa":
    case "tester":
    case "qa engineer":
      return generateQATasks(repoName, userLevel);
    
    default:
      return generateGeneralDeveloperTasks(repoName, userLevel);
  }
}

// Frontend Developer specific tasks
function generateFrontendTasks(repoName: string, userLevel: string): Task[] {
  return [
    {
      id: "frontend-components",
      title: "⚛️ React Component Architecture",
      description: "Explore how React components are structured in this application. Focus on component composition and state management patterns.",
      type: "explore",
      status: "pending",
      estimatedTime: 10,
      difficulty: userLevel === "beginner" ? "medium" : "easy",
      file: "src/App.tsx",
      hints: [
        "Look for useState and useEffect hooks",
        "Notice how authentication state flows through components",
        "Pay attention to component composition patterns"
      ]
    },
    {
      id: "frontend-auth-flow",
      title: "🔐 Authentication UI Flow",
      description: "Understand how the authentication user interface works and integrates with Firebase Auth.",
      type: "explore", 
      status: "pending",
      estimatedTime: 12,
      difficulty: "medium",
      file: "src/Auth.tsx",
      prerequisites: ["frontend-components"]
    },
    {
      id: "frontend-quiz",
      title: "🧩 Frontend Architecture Quiz",
      description: "Test your understanding of the React architecture and state management.",
      type: "quiz",
      status: "pending",
      estimatedTime: 5,
      difficulty: "medium",
      prerequisites: ["frontend-auth-flow"],
      quiz: {
        question: "In this React app, what pattern is used for managing authentication state across components?",
        options: [
          "Redux with global store",
          "Context API with providers", 
          "Props drilling from App component",
          "Local state with Firebase hooks"
        ],
        correctAnswer: 3,
        explanation: "The app uses Firebase Auth with React hooks (useState/useEffect) to manage authentication state locally in the App component, then conditionally renders components based on auth state."
      }
    }
  ];
}

// Backend Developer specific tasks  
function generateBackendTasks(repoName: string, userLevel: string): Task[] {
  return [
    {
      id: "backend-api-exploration",
      title: "🐍 Python FastAPI Backend",
      description: "Explore the FastAPI backend architecture, endpoints, and Firebase Admin integration.",
      type: "explore",
      status: "pending", 
      estimatedTime: 15,
      difficulty: userLevel === "beginner" ? "hard" : "medium",
      file: "backend/main.py",
      hints: [
        "Look for FastAPI route definitions (@app.post, @app.get)",
        "Notice how Firebase Admin SDK is used for authentication",
        "Pay attention to CORS configuration for frontend integration"
      ]
    },
    {
      id: "backend-setup",
      title: "🔧 Backend Environment Setup", 
      description: "Set up and run the Python backend server. Install dependencies and verify the API is working.",
      type: "terminal",
      status: "pending",
      estimatedTime: 8,
      difficulty: "medium",
      command: "cd backend && pip install -r requirements.txt && python main.py",
      expectedOutput: "Uvicorn running on",
      prerequisites: ["backend-api-exploration"]
    },
    {
      id: "backend-auth-analysis",
      title: "🔐 Authentication & Authorization Deep Dive",
      description: "Analyze how user roles are assigned and managed through Firebase Custom Claims and Firestore.",
      type: "qa",
      status: "pending",
      estimatedTime: 12,
      difficulty: "hard", 
      question: "Explain the role assignment flow: How does a user get assigned a role, and where is this information stored? What are the security implications?",
      prerequisites: ["backend-setup"]
    }
  ];
}

// Full-Stack Developer tasks
function generateFullStackTasks(repoName: string, userLevel: string): Task[] {
  return [
    {
      id: "fullstack-architecture",
      title: "🌐 Full-Stack Architecture Overview",
      description: "Understand how the React frontend communicates with the FastAPI backend through Firebase Auth.",
      type: "explore",
      status: "pending",
      estimatedTime: 12,
      difficulty: "medium", 
      file: "src/firebase.ts",
      hints: [
        "Look at Firebase configuration and initialization",
        "Notice how auth state connects frontend and backend",
        "Consider the security model with Firebase tokens"
      ]
    },
    {
      id: "fullstack-integration",
      title: "🔄 Frontend-Backend Integration",
      description: "Trace a complete user flow from frontend authentication to backend role assignment.",
      type: "qa",
      status: "pending",
      estimatedTime: 15,
      difficulty: "hard",
      question: "Walk through the complete flow: User signs up → Gets role assigned → Accesses admin features. What happens at each step between frontend and backend?",
      prerequisites: ["fullstack-architecture"]
    },
    {
      id: "fullstack-deployment",
      title: "🚀 Deployment Considerations",
      description: "Analyze what would be needed to deploy this full-stack application to production.",
      type: "qa",
      status: "pending",
      estimatedTime: 10,
      difficulty: userLevel === "advanced" ? "medium" : "hard",
      question: "What are the key considerations for deploying this React + FastAPI + Firebase app to production? Consider environment variables, CORS, database, and authentication.",
      prerequisites: ["fullstack-integration"]
    }
  ];
}

// DevOps Engineer tasks
function generateDevOpsTasks(repoName: string, userLevel: string): Task[] {
  return [
    {
      id: "devops-build-process",
      title: "🔨 Build & Development Workflow",
      description: "Understand the build process, dependencies, and development workflow for this application.",
      type: "terminal", 
      status: "pending",
      estimatedTime: 10,
      difficulty: "easy",
      command: "npm run build && ls -la dist/",
      expectedOutput: "dist/",
      hints: [
        "Notice the Vite build output structure",
        "Check the generated assets and their sizes", 
        "Consider optimization opportunities"
      ]
    },
    {
      id: "devops-environment-config",
      title: "⚙️ Environment Configuration",
      description: "Analyze environment variables, secrets management, and configuration requirements.",
      type: "explore",
      status: "pending",
      estimatedTime: 8,
      difficulty: "medium",
      file: ".env",
      prerequisites: ["devops-build-process"]
    },
    {
      id: "devops-deployment-strategy",
      title: "🚀 Deployment Architecture Planning", 
      description: "Design a deployment strategy for this full-stack application considering scalability and security.",
      type: "qa",
      status: "pending",
      estimatedTime: 20,
      difficulty: "hard",
      question: "Design a production deployment strategy for this app. Consider: Frontend hosting, backend containerization, database setup, CI/CD pipeline, monitoring, and security. What tools and services would you use?",
      prerequisites: ["devops-environment-config"]
    }
  ];
}

// Product Manager tasks
function generateProductManagerTasks(repoName: string, userLevel: string, repositories?: string[]): Task[] {
  return [
    {
      id: "pm-user-flows",
      title: "👥 User Journey Analysis",
      description: "Map out the key user journeys in this application, from onboarding to feature usage.",
      type: "explore",
      status: "pending",
      estimatedTime: 15,
      difficulty: "medium",
      file: "src/App.tsx",
      hints: [
        "Think about different user personas (admin vs regular user)",
        "Consider the authentication and onboarding flow",
        "Identify potential friction points"
      ]
    },
    {
      id: "pm-feature-analysis",
      title: "📊 Feature Capability Assessment",
      description: "Analyze the current features and identify opportunities for product enhancement.",
      type: "qa",
      status: "pending",
      estimatedTime: 12,
      difficulty: "medium",
      question: `Based on your exploration of ${repoName}, what are the core features? What user needs do they address? What gaps or opportunities do you see for product improvement?`,
      prerequisites: ["pm-user-flows"]
    },
    {
      id: "pm-repository-strategy",
      title: "🗂️ Multi-Repository Product Strategy",
      description: `Develop a strategy for managing onboarding across ${repositories?.length || 'multiple'} repositories in the product ecosystem.`,
      type: "qa",
      status: "pending",
      estimatedTime: 18,
      difficulty: "hard",
      question: `How would you design an onboarding strategy that scales across multiple repositories (${repositories?.join(', ') || 'various codebases'})? Consider different user roles, learning paths, and maintenance overhead.`,
      prerequisites: ["pm-feature-analysis"]
    }
  ];
}

// Designer tasks
function generateDesignerTasks(repoName: string, userLevel: string): Task[] {
  return [
    {
      id: "design-ui-patterns",
      title: "🎨 UI Component Analysis",
      description: "Explore the UI components and design patterns used in the application.",
      type: "explore",
      status: "pending",
      estimatedTime: 12,
      difficulty: "easy",
      file: "src/AdminDashboard.tsx",
      hints: [
        "Look for Mantine UI components and their usage",
        "Notice the design system patterns",
        "Consider accessibility and user experience"
      ]
    },
    {
      id: "design-user-experience",
      title: "👤 User Experience Evaluation",
      description: "Evaluate the user experience of the authentication and onboarding flow.",
      type: "qa",
      status: "pending",
      estimatedTime: 15,
      difficulty: "medium",
      question: "From a UX perspective, analyze the current authentication and admin dashboard experience. What works well? What could be improved for better usability and accessibility?",
      prerequisites: ["design-ui-patterns"]
    },
    {
      id: "design-system-proposal",
      title: "🎯 Design System Enhancement",
      description: "Propose improvements to the design system and user interface.",
      type: "qa",
      status: "pending",
      estimatedTime: 20,
      difficulty: "hard",
      question: "Based on your analysis, propose 3-5 specific design improvements that would enhance the user experience. Consider visual hierarchy, accessibility, mobile responsiveness, and user feedback.",
      prerequisites: ["design-user-experience"]
    }
  ];
}

// QA/Tester tasks
function generateQATasks(repoName: string, userLevel: string): Task[] {
  return [
    {
      id: "qa-test-authentication",
      title: "🔍 Authentication Testing Flow",
      description: "Explore the authentication system to understand test scenarios and edge cases.",
      type: "explore",
      status: "pending",
      estimatedTime: 10,
      difficulty: "medium",
      file: "src/Auth.tsx",
      hints: [
        "Think about positive and negative test cases",
        "Consider error handling scenarios",
        "Look for validation and security measures"
      ]
    },
    {
      id: "qa-test-scenarios",
      title: "📋 Test Case Development",
      description: "Develop comprehensive test scenarios for the application's core functionality.",
      type: "qa",
      status: "pending",
      estimatedTime: 15,
      difficulty: "medium",
      question: "Create a test plan covering: 1) Authentication flows (sign up, sign in, logout), 2) Role-based access control, 3) Admin dashboard functionality. Include positive, negative, and edge cases.",
      prerequisites: ["qa-test-authentication"]
    },
    {
      id: "qa-automation-strategy",
      title: "🤖 Test Automation Planning",
      description: "Design an automated testing strategy for this full-stack application.",
      type: "qa",
      status: "pending",
      estimatedTime: 18,
      difficulty: "hard",
      question: "Propose an automated testing strategy including unit tests (React components, Python functions), integration tests (API endpoints), and E2E tests (user journeys). What tools would you recommend and why?",
      prerequisites: ["qa-test-scenarios"]
    }
  ];
}

// General Developer tasks (fallback)
function generateGeneralDeveloperTasks(repoName: string, userLevel: string): Task[] {
  return [
    {
      id: "general-codebase-overview",
      title: "📖 Codebase Overview",
      description: "Get familiar with the overall structure and architecture of the application.",
      type: "explore",
      status: "pending",
      estimatedTime: 10,
      difficulty: "easy",
      file: "package.json",
      hints: [
        "Look at the dependencies to understand the tech stack",
        "Check the scripts to understand available commands",
        "Notice the project structure and organization"
      ]
    },
    {
      id: "general-key-features",
      title: "🔑 Key Features Exploration",
      description: "Understand the main features and functionality of the application.",
      type: "qa",
      status: "pending",
      estimatedTime: 12,
      difficulty: "medium",
      question: "After exploring the codebase, describe the main features of this application. What problems does it solve and how does it work?",
      prerequisites: ["general-codebase-overview"]
    }
  ];
}

// Generate fallback tasks for roles when AI fails
function generateFallbackRoleTasks(repoName: string, userRole?: string, userLevel: string = "intermediate"): Task[] {
  const roleFocus = userRole ? ` as a ${userRole}` : "";
  
  return [
    {
      id: "fallback-role-exploration",
      title: `🔍 ${userRole || 'Developer'} Focus Areas`,
      description: `Explore the parts of ${repoName} most relevant to your role${roleFocus}.`,
      type: "explore",
      status: "pending",
      estimatedTime: 12,
      difficulty: "medium",
      file: userRole?.toLowerCase().includes('backend') ? "backend/main.py" : "src/App.tsx",
      prerequisites: ["setup-environment"]
    },
    {
      id: "fallback-role-responsibilities",
      title: `📋 ${userRole || 'Developer'} Responsibilities`,
      description: `Understand what your day-to-day responsibilities would be${roleFocus} in this codebase.`,
      type: "qa",
      status: "pending",
      estimatedTime: 10,
      difficulty: "medium",
      question: `Based on your exploration, what would be your main responsibilities and focus areas${roleFocus} when working with this ${repoName} codebase?`,
      prerequisites: ["fallback-role-exploration"]
    }
  ];
}

// Helper functions for role-specific content
function getRoleSpecificSetupTips(userRole?: string): string {
  switch (userRole?.toLowerCase()) {
    case "frontend developer":
    case "frontend":
      return "Pay special attention to the React development server and hot reloading.";
    case "backend developer": 
    case "backend":
      return "You'll also want to set up the Python backend - check the backend/requirements.txt file.";
    case "devops":
      return "Consider the deployment implications and build process.";
    case "designer":
      return "Focus on the UI components and design system patterns.";
    default:
      return "Make sure both frontend and backend services are running properly.";
  }
}

function getRoleSpecificHints(userRole?: string, context?: string): string[] {
  const baseHints = [
    "Make sure you have Node.js installed (version 16 or higher)",
    "If you see permission errors, try using 'sudo' or check your npm permissions",
    "The dev server should start on port 5173 by default"
  ];

  if (context === "setup") {
    switch (userRole?.toLowerCase()) {
      case "backend developer":
      case "backend": 
        return [
          ...baseHints,
          "You'll also need Python 3.8+ for the backend",
          "Consider setting up a virtual environment for Python dependencies"
        ];
      case "devops":
        return [
          ...baseHints,
          "Check the build output and consider containerization",
          "Think about environment variable management"
        ];
      default:
        return baseHints;
    }
  }

  return baseHints;
}

function parseAITasks(aiResponse: string): Task[] {
  const tasks: Task[] = [];
  const lines = aiResponse.split('\n').filter(line => line.trim().startsWith('Task'));
  
  lines.forEach((line, index) => {
    try {
      // Simple parsing - in production, you'd want more robust parsing
      const parts = line.split(' - ');
      if (parts.length >= 3) {
        const title = parts[0].replace(/Task \d+: /, '');
        const description = parts[1];
        const typeMatch = parts[2].match(/Type: (\w+)/);
        const fileMatch = parts[3]?.match(/File: (.+)/) || null;
        
        const task: Task = {
          id: `ai-generated-${index + 1}`,
          title: `🤖 ${title}`,
          description,
          type: (typeMatch?.[1] as TaskType) || "qa",
          status: "pending",
          estimatedTime: 10,
          difficulty: "medium",
          prerequisites: index === 0 ? ["code-challenge-component"] : [`ai-generated-${index}`],
          aiContext: aiResponse
        };
        
        if (fileMatch) {
          task.file = fileMatch[1];
          task.type = "explore";
        }
        
        tasks.push(task);
      }
    } catch (error) {
      console.warn("Failed to parse AI task:", line, error);
    }
  });
  
  return tasks;
}

// Helper functions for task management
export function canStartTask(task: Task, completedTaskIds: string[]): boolean {
  if (!task.prerequisites) return true;
  return task.prerequisites.every(prereqId => completedTaskIds.includes(prereqId));
}

export function getNextAvailableTask(tasks: Task[], completedTaskIds: string[]): Task | null {
  return tasks.find(task => 
    task.status === "pending" && canStartTask(task, completedTaskIds)
  ) || null;
}

export function calculateProgress(tasks: Task[]): {
  completed: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining: number;
} {
  const completed = tasks.filter(t => t.status === "completed").length;
  const total = tasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const remainingTasks = tasks.filter(t => t.status === "pending");
  const estimatedTimeRemaining = remainingTasks.reduce((sum, task) => sum + task.estimatedTime, 0);
  
  return { completed, total, percentage, estimatedTimeRemaining };
}

export async function generateHint(task: Task, userInput?: string): Promise<string> {
  try {
    const prompt = `The user is working on this onboarding task: "${task.title}" - ${task.description}
    ${userInput ? `They tried: "${userInput}"` : "They need a helpful hint."}
    
    Provide a concise, encouraging hint that guides them without giving away the complete answer.`;
    
    return await askAI(prompt);
  } catch (error) {
    // Fallback hints
    const fallbackHints = [
      "Try breaking down the problem into smaller steps.",
      "Check the documentation or comments in the code.",
      "Look for similar patterns elsewhere in the codebase.",
      "Consider what tools or resources might help here."
    ];
    return fallbackHints[Math.floor(Math.random() * fallbackHints.length)];
  }
}
