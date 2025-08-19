import { useState, useEffect, useCallback } from "react";
import type { Task } from "./tasks";
import { calculateProgress } from "./tasks";
import { askAI, generateTaskHint, evaluateUserAnswer } from "./openaiClient";

interface WalkthroughProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskComplete: (taskId: string) => void;
  onSessionComplete: () => void;
}

interface TaskAttempt {
  input: string;
  timestamp: Date;
  feedback?: string;
}

export default function Walkthrough({ 
  tasks, 
  onTaskUpdate, 
  onTaskComplete, 
  onSessionComplete 
}: WalkthroughProps) {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<TaskAttempt[]>([]);
  const [aiChatMessages, setAiChatMessages] = useState<Array<{
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }>>([]);
  const [showAiChat, setShowAiChat] = useState(false);
  const [taskStartTime, setTaskStartTime] = useState<Date>(new Date());

  const currentTask = tasks[currentTaskIndex];
  const progress = calculateProgress(tasks);

  useEffect(() => {
    if (currentTask && currentTask.status === "pending") {
      setTaskStartTime(new Date());
      onTaskUpdate(currentTask.id, { 
        status: "in-progress", 
        startTime: new Date(),
        attempts: 0 
      });
    }
  }, [currentTask?.id, onTaskUpdate]);

  const handleNext = useCallback(() => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
      setUserInput("");
      setHints([]);
      setAttempts([]);
      setShowHint(false);
    } else {
      onSessionComplete();
    }
  }, [currentTaskIndex, tasks.length, onSessionComplete]);

  const handleTaskComplete = useCallback(async (taskId: string, userAnswer?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const completionTime = new Date();

    onTaskUpdate(taskId, {
      status: "completed",
      completionTime,
      userNotes: userAnswer,
      attempts: (task.attempts || 0) + 1
    });

    onTaskComplete(taskId);
    
    // Generate AI feedback for the completed task
    if (userAnswer && task.type === "qa") {
      try {
        setIsLoading(true);
        const evaluation = await evaluateUserAnswer(
          task.question || task.description,
          task.answer || "",
          userAnswer
        );
        
        setAiChatMessages(prev => [...prev, {
          role: 'ai',
          content: `Great job completing "${task.title}"! ${evaluation.feedback} (Score: ${evaluation.score}/100)`,
          timestamp: new Date()
        }]);
      } catch (error) {
        console.warn("Failed to generate AI feedback:", error);
      } finally {
        setIsLoading(false);
      }
    }

    setTimeout(handleNext, 1500); // Auto-advance after showing feedback
  }, [tasks, taskStartTime, onTaskUpdate, onTaskComplete, handleNext]);

  const handleGetHint = useCallback(async () => {
    if (!currentTask) return;
    
    setIsLoading(true);
    try {
      const hint = await generateTaskHint(
        currentTask.description,
        userInput || undefined
      );
      setHints(prev => [...prev, hint]);
      setShowHint(true);
    } catch (error) {
      setHints(prev => [...prev, "Try breaking the problem into smaller steps or check the documentation."]);
      setShowHint(true);
    } finally {
      setIsLoading(false);
    }
  }, [currentTask, userInput]);

  const handleAiChat = useCallback(async (message: string) => {
    if (!currentTask) return;
    
    setAiChatMessages(prev => [...prev, {
      role: 'user',
      content: message,
      timestamp: new Date()
    }]);

    setIsLoading(true);
    try {
      const context = `Current task: "${currentTask.title}" - ${currentTask.description}`;
      const response = await askAI(message, {}, context);
      
      setAiChatMessages(prev => [...prev, {
        role: 'ai',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      setAiChatMessages(prev => [...prev, {
        role: 'ai',
        content: "I'm having trouble responding right now. Please try again or continue with the task.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [currentTask]);

  const handleQuizSubmit = useCallback(async (selectedOption: number) => {
    if (!currentTask?.quiz) return;
    
    const isCorrect = selectedOption === currentTask.quiz.correctAnswer;
    const attemptCount = (currentTask.attempts || 0) + 1;
    
    onTaskUpdate(currentTask.id, { attempts: attemptCount });
    
    if (isCorrect) {
      await handleTaskComplete(currentTask.id, currentTask.quiz.options[selectedOption]);
    } else {
      setAttempts(prev => [...prev, {
        input: currentTask.quiz!.options[selectedOption],
        timestamp: new Date(),
        feedback: `Incorrect. ${currentTask.quiz!.explanation}`
      }]);
      
      if (attemptCount >= 3) {
        // Show correct answer after 3 attempts
        setHints(prev => [...prev, `The correct answer is: ${currentTask.quiz!.options[currentTask.quiz!.correctAnswer]}. ${currentTask.quiz!.explanation}`]);
        setShowHint(true);
      }
    }
  }, [currentTask, onTaskUpdate, handleTaskComplete]);

  if (!currentTask) {
    return (
      <div className="walkthrough-complete">
        <h2>🎉 Onboarding Complete!</h2>
        <p>You've successfully completed all tasks. Welcome to the team!</p>
      </div>
    );
  }

  return (
    <div className="walkthrough-container" style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      padding: "16px",
      backgroundColor: "#252526",
      color: "#cccccc",
      overflow: "hidden"
    }}>
      {/* Progress Header */}
      <div className="progress-header" style={{
        marginBottom: "16px",
        padding: "12px",
        backgroundColor: "#2d2d30",
        borderRadius: "6px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h3 style={{ margin: 0, color: "#ffffff" }}>
            {currentTask.title}
          </h3>
          <span style={{ fontSize: "12px", color: "#888" }}>
            {currentTaskIndex + 1} / {tasks.length}
          </span>
        </div>
        
        <div style={{ 
          width: "100%", 
          height: "6px", 
          backgroundColor: "#3c3c3c", 
          borderRadius: "3px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${progress.percentage}%`,
            height: "100%",
            backgroundColor: "#0e639c",
            transition: "width 0.3s ease"
          }} />
        </div>
        
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          fontSize: "11px", 
          color: "#888",
          marginTop: "4px"
        }}>
          <span>Progress: {progress.percentage}%</span>
          <span>Est. time: {currentTask.estimatedTime}min</span>
          <span className={`difficulty-${currentTask.difficulty}`}>
            {currentTask.difficulty.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Task Content */}
      <div className="task-content" style={{ 
        flex: 1, 
        overflow: "auto",
        marginBottom: "16px"
      }}>
        <p style={{ 
          lineHeight: "1.5", 
          marginBottom: "16px",
          color: "#cccccc"
        }}>
          {currentTask.description}
        </p>

        {/* Task Type Specific Content */}
        {currentTask.type === "terminal" && (
          <div className="terminal-task">
            <div style={{ 
              backgroundColor: "#1e1e1e", 
              padding: "12px", 
              borderRadius: "4px",
              fontFamily: "monospace",
              fontSize: "13px",
              border: "1px solid #3c3c3c"
            }}>
              <span style={{ color: "#569cd6" }}>$</span> {currentTask.command}
            </div>
            {currentTask.expectedOutput && (
              <p style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
                Expected output should contain: "{currentTask.expectedOutput}"
              </p>
            )}
          </div>
        )}

        {currentTask.type === "explore" && currentTask.file && (
          <div className="explore-task">
            <div style={{
              padding: "12px",
              backgroundColor: "#2d2d30",
              borderRadius: "4px",
              border: "1px solid #3c3c3c"
            }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "16px", marginRight: "8px" }}>📁</span>
                <code style={{ color: "#569cd6" }}>{currentTask.file}</code>
              </div>
              <p style={{ fontSize: "12px", color: "#888", margin: 0 }}>
                Open this file and explore its contents to understand the implementation.
              </p>
            </div>
          </div>
        )}

        {currentTask.type === "quiz" && currentTask.quiz && (
          <div className="quiz-task">
            <h4 style={{ color: "#ffffff", marginBottom: "12px" }}>
              {currentTask.quiz.question}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {currentTask.quiz.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleQuizSubmit(index)}
                  style={{
                    padding: "12px",
                    backgroundColor: "#2d2d30",
                    border: "1px solid #3c3c3c",
                    borderRadius: "4px",
                    color: "#cccccc",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background-color 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#37373d"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2d2d30"}
                >
                  {String.fromCharCode(65 + index)}. {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentTask.type === "qa" && (
          <div className="qa-task">
            <div style={{
              padding: "12px",
              backgroundColor: "#2d2d30",
              borderRadius: "4px",
              border: "1px solid #3c3c3c",
              marginBottom: "12px"
            }}>
              <strong style={{ color: "#ffffff" }}>Question:</strong>
              <p style={{ margin: "8px 0 0 0", color: "#cccccc" }}>
                {currentTask.question}
              </p>
            </div>
            
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your answer here..."
              style={{
                width: "100%",
                minHeight: "100px",
                padding: "12px",
                backgroundColor: "#1e1e1e",
                border: "1px solid #3c3c3c",
                borderRadius: "4px",
                color: "#cccccc",
                fontFamily: "inherit",
                fontSize: "14px",
                resize: "vertical"
              }}
            />
          </div>
        )}

        {/* Show previous attempts for feedback */}
        {attempts.length > 0 && (
          <div className="attempts-feedback" style={{ marginTop: "16px" }}>
            <h5 style={{ color: "#ffffff", marginBottom: "8px" }}>Previous Attempts:</h5>
            {attempts.map((attempt, index) => (
              <div key={index} style={{
                padding: "8px",
                backgroundColor: "#2d2d30",
                borderRadius: "4px",
                marginBottom: "8px",
                borderLeft: "3px solid #f48771"
              }}>
                <div style={{ fontSize: "12px", color: "#888" }}>
                  {attempt.timestamp.toLocaleTimeString()}
                </div>
                <div style={{ color: "#cccccc", marginBottom: "4px" }}>
                  {attempt.input}
                </div>
                {attempt.feedback && (
                  <div style={{ fontSize: "12px", color: "#f48771" }}>
                    {attempt.feedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hints */}
        {showHint && hints.length > 0 && (
          <div className="hints-section" style={{ marginTop: "16px" }}>
            <h5 style={{ color: "#ffffff", marginBottom: "8px" }}>💡 Hints:</h5>
            {hints.map((hint, index) => (
              <div key={index} style={{
                padding: "12px",
                backgroundColor: "#2d2d30",
                borderRadius: "4px",
                marginBottom: "8px",
                borderLeft: "3px solid #ffcc02"
              }}>
                {hint}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons" style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}>
        {currentTask.type === "qa" && (
          <button
            onClick={() => handleTaskComplete(currentTask.id, userInput)}
            disabled={!userInput.trim() || isLoading}
            style={{
              padding: "12px",
              backgroundColor: userInput.trim() ? "#0e639c" : "#3c3c3c",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: userInput.trim() ? "pointer" : "not-allowed",
              transition: "background-color 0.2s"
            }}
          >
            {isLoading ? "Submitting..." : "Submit Answer"}
          </button>
        )}

        {(currentTask.type === "terminal" || currentTask.type === "explore") && (
          <button
            onClick={() => handleTaskComplete(currentTask.id)}
            style={{
              padding: "12px",
              backgroundColor: "#0e639c",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Mark as Complete ✓
          </button>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleGetHint}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: "#2d2d30",
              color: "#cccccc",
              border: "1px solid #3c3c3c",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            {isLoading ? "..." : "💡 Get Hint"}
          </button>

          <button
            onClick={() => setShowAiChat(!showAiChat)}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: showAiChat ? "#0e639c" : "#2d2d30",
              color: showAiChat ? "white" : "#cccccc",
              border: "1px solid #3c3c3c",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            🤖 AI Chat
          </button>
        </div>

        {/* Skip button for advanced users */}
        <button
          onClick={() => {
            onTaskUpdate(currentTask.id, { status: "skipped" });
            handleNext();
          }}
          style={{
            padding: "6px",
            backgroundColor: "transparent",
            color: "#888",
            border: "1px solid #3c3c3c",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px"
          }}
        >
          Skip this task →
        </button>
      </div>

      {/* AI Chat Panel */}
      {showAiChat && (
        <div className="ai-chat-panel" style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#252526",
          padding: "16px",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "16px"
          }}>
            <h4 style={{ margin: 0, color: "#ffffff" }}>🤖 AI Mentor</h4>
            <button
              onClick={() => setShowAiChat(false)}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: "#888",
                cursor: "pointer",
                fontSize: "18px"
              }}
            >
              ✕
            </button>
          </div>

          <div style={{
            flex: 1,
            overflow: "auto",
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#1e1e1e",
            borderRadius: "4px"
          }}>
            {aiChatMessages.map((msg, index) => (
              <div key={index} style={{
                marginBottom: "12px",
                padding: "8px",
                backgroundColor: msg.role === "user" ? "#2d2d30" : "#1e1e1e",
                borderRadius: "4px",
                borderLeft: `3px solid ${msg.role === "user" ? "#0e639c" : "#ffcc02"}`
              }}>
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>
                  {msg.role === "user" ? "You" : "AI Mentor"} • {msg.timestamp.toLocaleTimeString()}
                </div>
                <div style={{ color: "#cccccc" }}>{msg.content}</div>
              </div>
            ))}
            {isLoading && (
              <div style={{ textAlign: "center", color: "#888" }}>
                AI is thinking...
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Ask the AI mentor anything..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  const input = e.currentTarget;
                  if (input.value.trim()) {
                    handleAiChat(input.value);
                    input.value = "";
                  }
                }
              }}
              style={{
                flex: 1,
                padding: "8px",
                backgroundColor: "#1e1e1e",
                border: "1px solid #3c3c3c",
                borderRadius: "4px",
                color: "#cccccc"
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
