import { useEffect, useState, useCallback } from "react";
import FileTree from "./FileTree";
import CodeEditor from "./CodeEditor";
import Terminal from "./Terminal";
import Walkthrough from "./Walkthrough";
import type { Task, OnboardingSession } from "./tasks";
import { generateAdvancedTasks, getNextAvailableTask } from "./tasks";
import { generatePersonalizedFeedback } from "./openaiClient";

interface OnboardingProps {
  userId?: string;
  repositoryName?: string;
  userLevel?: "beginner" | "intermediate" | "advanced";
  userRole?: string;
  repositories?: string[];
  customInstructions?: string;
  isPreviewMode?: boolean;
  onComplete?: (session: OnboardingSession) => void;
}

export default function Onboarding({ 
  userId = "demo-user",
  repositoryName = "colicitv2",
  userLevel = "intermediate",
  userRole = "developer",
  repositories = ["colicitv2"],
  customInstructions,
  isPreviewMode = false,
  onComplete
}: OnboardingProps) {
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [personalizedFeedback, setPersonalizedFeedback] = useState<string>("");

  // Initialize onboarding session
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate tasks based on repository and user level
      const tasks = await generateAdvancedTasks(repositoryName, userLevel, userRole, repositories, customInstructions);

      const newSession: OnboardingSession = {
        id: `session-${Date.now()}`,
        userId,
        repositoryName,
        startedAt: new Date(),
        currentTaskIndex: 0,
        tasks,
        completedTasks: [],
        sessionNotes: "",
        aiPersonality: "mentor"
      };

      setSession(newSession);
    } catch (err) {
      console.error("Failed to initialize onboarding session:", err);
      setError("Failed to load onboarding content. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  // Handle task updates
  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    if (!session) return;

    setSession(prev => {
      if (!prev) return prev;
      
      const updatedTasks = prev.tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      );

      return {
        ...prev,
        tasks: updatedTasks
      };
    });
  }, [session]);

  // Handle task completion
  const handleTaskComplete = useCallback((taskId: string) => {
    if (!session) return;

    setSession(prev => {
      if (!prev) return prev;

      const completedTasks = [...prev.completedTasks, taskId];
      const nextTask = getNextAvailableTask(prev.tasks, completedTasks);
      const currentTaskIndex = nextTask 
        ? prev.tasks.findIndex(t => t.id === nextTask.id)
        : prev.tasks.length;

      return {
        ...prev,
        completedTasks,
        currentTaskIndex
      };
    });
  }, [session]);

  // Handle session completion
  const handleSessionComplete = useCallback(async () => {
    if (!session) return;

    try {
      // Calculate session statistics
      const totalTime = Math.round((new Date().getTime() - session.startedAt.getTime()) / 1000 / 60);
      const struggledTasks = session.tasks
        .filter(task => (task.attempts || 0) > 2)
        .map(task => task.title);

      // Generate personalized feedback
      const feedback = await generatePersonalizedFeedback(
        session.completedTasks,
        totalTime,
        struggledTasks
      );

      setPersonalizedFeedback(feedback);
      setShowCompletionModal(true);

      // Notify parent component
      onComplete?.(session);
    } catch (error) {
      console.warn("Failed to generate completion feedback:", error);
      setPersonalizedFeedback("Congratulations on completing your onboarding! You've successfully learned the key concepts of this repository.");
      setShowCompletionModal(true);
    }
  }, [session, onComplete]);

  // Handle file selection
  const handleFileSelect = useCallback((filePath: string, content: string) => {
    setActiveFile(filePath);
    setFileContent(content);
  }, []);

  // Handle terminal command execution
  const handleCommandExecuted = useCallback((command: string, _output: string, success: boolean) => {
    if (!session) return;

    const currentTask = session.tasks[session.currentTaskIndex];
    if (currentTask?.type === "terminal" && success) {
      handleTaskComplete(currentTask.id);
    }

    // Log command for session notes
    const timestamp = new Date().toLocaleTimeString();
    const commandLog = `${timestamp}: ${command} ${success ? "✓" : "✗"}`;
    
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sessionNotes: prev.sessionNotes + commandLog + "\n"
      };
    });
  }, [session, handleTaskComplete]);

  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1e1e1e",
        color: "#cccccc"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            fontSize: "48px", 
            marginBottom: "16px",
            animation: "spin 2s linear infinite"
          }}>
            ⚙️
          </div>
          <h2 style={{ margin: "0 0 8px 0" }}>Loading Onboarding</h2>
          <p style={{ margin: 0, color: "#888" }}>
            Setting up your personalized learning experience...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1e1e1e",
        color: "#cccccc"
      }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
          <h2 style={{ margin: "0 0 8px 0", color: "#f48771" }}>Error Loading Onboarding</h2>
          <p style={{ margin: "0 0 16px 0", color: "#888" }}>{error}</p>
          <button
            onClick={initializeSession}
            style={{
              padding: "12px 24px",
              backgroundColor: "#0e639c",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const currentTask = session.tasks[session.currentTaskIndex];

  return (
    <div style={{ 
      height: "100vh", 
      overflow: "hidden",
      backgroundColor: "#1e1e1e",
      color: "#cccccc"
    }}>
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div style={{
          backgroundColor: "#e3f2fd",
          borderBottom: "2px solid #2196f3",
          padding: "12px 24px",
          textAlign: "center",
          fontWeight: "bold",
          color: "#1565c0",
          fontSize: "14px"
        }}>
          🔍 PREVIEW MODE - This is what the user will see during onboarding
          <button 
            style={{
              marginLeft: "16px",
              padding: "6px 12px",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px"
            }}
            onClick={() => onComplete && onComplete({ 
              id: session.id, 
              userId: session.userId, 
              repositoryName: session.repositoryName,
              startedAt: session.startedAt,
              currentTaskIndex: session.currentTaskIndex,
              tasks: session.tasks,
              completedTasks: session.completedTasks,
              sessionNotes: session.sessionNotes,
              aiPersonality: session.aiPersonality
            })}
          >
            Exit Preview
          </button>
        </div>
      )}
      
      {/* VS Code-like layout */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "280px 1fr 320px", 
        gridTemplateRows: "1fr 240px", 
        height: "100vh",
        gap: "1px",
        backgroundColor: "#3c3c3c"
      }}>
        
        {/* Sidebar - File Explorer */}
        <aside style={{ 
          gridRow: "1 / 3", 
          gridColumn: "1", 
          backgroundColor: "#252526",
          overflow: "hidden"
        }}>
          <FileTree 
            onSelectFile={handleFileSelect}
            currentTask={currentTask}
          />
        </aside>

        {/* Main Editor Area */}
        <main style={{ 
          gridRow: "1", 
          gridColumn: "2", 
          backgroundColor: "#1e1e1e",
          overflow: "hidden"
        }}>
          <CodeEditor 
            fileName={activeFile} 
            content={fileContent}
            currentTask={currentTask}
          />
        </main>

        {/* Right Panel - Walkthrough */}
        <section style={{ 
          gridRow: "1", 
          gridColumn: "3", 
          backgroundColor: "#252526",
          overflow: "hidden"
        }}>
          <Walkthrough 
            tasks={session.tasks}
            onTaskUpdate={handleTaskUpdate}
            onTaskComplete={handleTaskComplete}
            onSessionComplete={handleSessionComplete}
          />
        </section>

        {/* Bottom Panel - Terminal */}
        <footer style={{ 
          gridRow: "2", 
          gridColumn: "2 / 4", 
          backgroundColor: "#1e1e1e",
          overflow: "hidden"
        }}>
          <Terminal 
            currentTask={currentTask}
            onCommandExecuted={handleCommandExecuted}
          />
        </footer>
      </div>

      {/* Session Progress Indicator */}
      <div style={{
        position: "fixed",
        top: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 16px",
        backgroundColor: "#2d2d30",
        borderRadius: "20px",
        border: "1px solid #3c3c3c",
        fontSize: "11px",
        color: "#cccccc",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "12px"
      }}>
        <span>{repositoryName} Onboarding</span>
        <span style={{ color: "#888" }}>•</span>
        <span>{session.completedTasks.length} / {session.tasks.length} completed</span>
        <span style={{ color: "#888" }}>•</span>
        <span style={{ color: userLevel === "beginner" ? "#98c379" : userLevel === "intermediate" ? "#e5c07b" : "#e06c75" }}>
          {userLevel.toUpperCase()}
        </span>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: "#2d2d30",
            borderRadius: "8px",
            padding: "32px",
            maxWidth: "500px",
            textAlign: "center",
            border: "1px solid #3c3c3c"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>🎉</div>
            <h2 style={{ margin: "0 0 16px 0", color: "#ffffff" }}>
              Onboarding Complete!
            </h2>
            <p style={{ 
              margin: "0 0 24px 0", 
              lineHeight: "1.6",
              color: "#cccccc"
            }}>
              {personalizedFeedback}
            </p>
            
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center"
            }}>
              <button
                onClick={() => setShowCompletionModal(false)}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#0e639c",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Continue to App
              </button>
              <button
                onClick={initializeSession}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "transparent",
                  color: "#cccccc",
                  border: "1px solid #3c3c3c",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Restart Onboarding
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
