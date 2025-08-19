import { useState, useEffect, useRef } from "react";

interface TerminalCommand {
  command: string;
  output: string;
  timestamp: Date;
  exitCode: number;
}

interface TerminalProps {
  currentTask?: {
    type: string;
    command?: string;
    expectedOutput?: string;
  };
  onCommandExecuted?: (command: string, output: string, success: boolean) => void;
}

export default function Terminal({ currentTask, onCommandExecuted }: TerminalProps) {
  const [history, setHistory] = useState<TerminalCommand[]>([
    {
      command: "# Welcome to the onboarding terminal",
      output: "This terminal simulates command execution for learning purposes.\nType 'help' for available commands.",
      timestamp: new Date(),
      exitCode: 0
    }
  ]);
  const [currentInput, setCurrentInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Cursor blinking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input when terminal is clicked
  const focusInput = () => {
    inputRef.current?.focus();
  };

  // Simulate command execution
  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsExecuting(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    let output: string;
    let exitCode: number;
    let success = false;

    // Simulate various commands
    switch (command.toLowerCase().trim()) {
      case "help":
        output = `Available commands:
  help          - Show this help message
  ls            - List directory contents
  pwd           - Show current directory
  npm install   - Install project dependencies
  npm run dev   - Start development server
  npm run build - Build the project
  git status    - Show git repository status
  clear         - Clear terminal
  exit          - Close terminal

This is a simulated terminal for onboarding purposes.`;
        exitCode = 0;
        success = true;
        break;

      case "ls":
        output = `total 48
drwxr-xr-x  12 user  staff   384 Aug 18 14:30 .
drwxr-xr-x   5 user  staff   160 Aug 18 14:20 ..
-rw-r--r--   1 user  staff   123 Aug 18 14:25 .env
-rw-r--r--   1 user  staff   456 Aug 18 14:20 .gitignore
-rw-r--r--   1 user  staff  1234 Aug 18 14:25 README.md
drwxr-xr-x   4 user  staff   128 Aug 18 14:25 backend
-rw-r--r--   1 user  staff   678 Aug 18 14:20 index.html
drwxr-xr-x   3 user  staff    96 Aug 18 14:20 node_modules
-rw-r--r--   1 user  staff  2456 Aug 18 14:20 package.json
drwxr-xr-x   3 user  staff    96 Aug 18 14:20 public
drwxr-xr-x   8 user  staff   256 Aug 18 14:25 src
-rw-r--r--   1 user  staff   345 Aug 18 14:20 tsconfig.json
-rw-r--r--   1 user  staff   567 Aug 18 14:20 vite.config.ts`;
        exitCode = 0;
        success = true;
        break;

      case "pwd":
        output = "/Users/user/Projects/colicitv2";
        exitCode = 0;
        success = true;
        break;

      case "npm install":
        output = `npm WARN deprecated package@1.0.0: This package is deprecated
npm WARN deprecated another-package@2.0.0: Please upgrade

added 234 packages, and audited 235 packages in 12s

45 packages are looking for funding
  run \`npm fund\` for details

found 0 vulnerabilities`;
        exitCode = 0;
        success = true;
        break;

      case "npm run dev":
        output = `> colicitv2@0.0.0 dev
> vite

  VITE v7.1.2  ready in 432 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help`;
        exitCode = 0;
        success = true;
        break;

      case "npm run build":
        output = `> colicitv2@0.0.0 build
> tsc -b && vite build

vite v7.1.2 building for production...
✓ 89 modules transformed.
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-DiwrgTda.css    1.39 kB │ gzip:  0.72 kB
dist/assets/index-BNtlz3gO.js   142.84 kB │ gzip: 45.98 kB
✓ built in 2.34s`;
        exitCode = 0;
        success = true;
        break;

      case "git status":
        output = `On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

        modified:   src/vsUI/Onboarding.tsx
        modified:   src/vsUI/Walkthrough.tsx

Untracked files:
  (use "git add <file>..." to include in what will be committed)

        src/vsUI/tasks.ts
        src/vsUI/openaiClient.ts

no changes added to commit (use "git add ..." or "git commit -a")`;
        exitCode = 0;
        success = true;
        break;

      case "clear":
        setHistory([]);
        setIsExecuting(false);
        return;

      case "exit":
        output = "Terminal session ended.";
        exitCode = 0;
        success = true;
        break;

      default:
        if (command.startsWith("cd ")) {
          output = `cd: ${command.substring(3)}: No such file or directory`;
          exitCode = 1;
        } else if (command.startsWith("cat ")) {
          output = `cat: ${command.substring(4)}: No such file or directory`;
          exitCode = 1;
        } else if (command.startsWith("mkdir ")) {
          output = `Directory '${command.substring(6)}' created.`;
          exitCode = 0;
          success = true;
        } else {
          output = `bash: ${command}: command not found
Hint: Try 'help' to see available commands.`;
          exitCode = 127;
        }
        break;
    }

    const newCommand: TerminalCommand = {
      command,
      output,
      timestamp: new Date(),
      exitCode
    };

    setHistory(prev => [...prev, newCommand]);
    setIsExecuting(false);

    // Check if this matches expected output for current task
    if (currentTask?.command && currentTask.expectedOutput) {
      const isExpectedCommand = command.toLowerCase().includes(currentTask.command.toLowerCase());
      const hasExpectedOutput = output.toLowerCase().includes(currentTask.expectedOutput.toLowerCase());
      success = success && isExpectedCommand && hasExpectedOutput;
    }

    // Notify parent component
    onCommandExecuted?.(command, output, success);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isExecuting) {
      executeCommand(currentInput);
      setCurrentInput("");
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-US", { 
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#1e1e1e",
      color: "#d4d4d4",
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      fontSize: "13px"
    }}>
      {/* Terminal Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        backgroundColor: "#2d2d30",
        borderBottom: "1px solid #3c3c3c",
        fontSize: "11px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🖥️</span>
          <span style={{ color: "#ffffff", fontWeight: "600" }}>TERMINAL</span>
          {currentTask?.type === "terminal" && (
            <span style={{
              padding: "2px 6px",
              backgroundColor: "#ffcc02",
              color: "#000",
              borderRadius: "3px",
              fontSize: "10px",
              fontWeight: "600"
            }}>
              TASK
            </span>
          )}
        </div>
        
        <div style={{ color: "#888" }}>
          bash - {history.length} commands
        </div>
      </div>

      {/* Current Task Hint */}
      {currentTask?.type === "terminal" && currentTask.command && (
        <div style={{
          padding: "8px 16px",
          backgroundColor: "#2d2d30",
          borderBottom: "1px solid #ffcc02",
          fontSize: "11px",
          color: "#cccccc"
        }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ color: "#ffcc02", marginRight: "8px" }}>⚡</span>
            <strong>Expected command:</strong>
          </div>
          <code style={{ color: "#569cd6" }}>{currentTask.command}</code>
          {currentTask.expectedOutput && (
            <div style={{ marginTop: "4px", fontSize: "10px", color: "#888" }}>
              Expected output should contain: "{currentTask.expectedOutput}"
            </div>
          )}
        </div>
      )}

      {/* Terminal Content */}
      <div 
        ref={terminalRef}
        onClick={focusInput}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px 16px",
          cursor: "text",
          lineHeight: "1.4"
        }}
      >
        {/* Command History */}
        {history.map((cmd, index) => (
          <div key={index} style={{ marginBottom: "12px" }}>
            {/* Command Input Line */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ color: "#98c379", marginRight: "8px" }}>
                user@onboarding
              </span>
              <span style={{ color: "#61dafb", marginRight: "8px" }}>
                ~/colicitv2
              </span>
              <span style={{ color: "#e06c75", marginRight: "8px" }}>
                $
              </span>
              <span style={{ color: cmd.exitCode === 0 ? "#d4d4d4" : "#f48771" }}>
                {cmd.command}
              </span>
              <span style={{ 
                marginLeft: "auto", 
                fontSize: "10px", 
                color: "#666"
              }}>
                {formatTimestamp(cmd.timestamp)}
              </span>
            </div>
            
            {/* Command Output */}
            {cmd.output && (
              <div style={{ 
                marginLeft: "16px",
                whiteSpace: "pre-wrap",
                color: cmd.exitCode === 0 ? "#d4d4d4" : "#f48771"
              }}>
                {cmd.output}
              </div>
            )}
          </div>
        ))}

        {/* Current Input Line */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ color: "#98c379", marginRight: "8px" }}>
            user@onboarding
          </span>
          <span style={{ color: "#61dafb", marginRight: "8px" }}>
            ~/colicitv2
          </span>
          <span style={{ color: "#e06c75", marginRight: "8px" }}>
            $
          </span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isExecuting}
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              color: "#d4d4d4",
              fontSize: "inherit",
              fontFamily: "inherit"
            }}
            placeholder={isExecuting ? "Executing..." : "Type a command..."}
          />
          <span style={{ 
            color: "#d4d4d4",
            visibility: cursorVisible && !isExecuting ? "visible" : "hidden"
          }}>
            ▋
          </span>
        </div>

        {/* Loading indicator */}
        {isExecuting && (
          <div style={{ 
            marginTop: "8px",
            marginLeft: "16px",
            color: "#888",
            fontStyle: "italic"
          }}>
            Executing command...
          </div>
        )}
      </div>

      {/* Terminal Footer */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 16px",
        backgroundColor: "#007acc",
        color: "white",
        fontSize: "10px"
      }}>
        <div>
          Ready | Last exit code: {history[history.length - 1]?.exitCode ?? 0}
        </div>
        <div>
          Type 'help' for commands
        </div>
      </div>
    </div>
  );
}
