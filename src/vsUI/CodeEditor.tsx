import Editor from "@monaco-editor/react";
import { useState, useEffect } from "react";

interface CodeEditorProps {
  fileName: string | null;
  content: string;
  currentTask?: {
    type: string;
    file?: string;
    description?: string;
  };
}

export default function CodeEditor({ fileName, content, currentTask }: CodeEditorProps) {
  const [editorContent, setEditorContent] = useState(content);
  const [theme, setTheme] = useState("vs-dark");
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);

  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  // Determine programming language from file extension
  const getLanguage = (fileName: string | null): string => {
    if (!fileName) return "plaintext";
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'jsx':
        return 'typescript';
      case 'ts':
        return 'typescript';
      case 'js':
        return 'javascript';
      case 'py':
        return 'python';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'yml':
      case 'yaml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  };

  // Highlight important lines based on current task
  useEffect(() => {
    if (currentTask?.type === "explore" && currentTask.file === fileName && editorContent) {
      // Simple heuristic to highlight important lines
      const lines = editorContent.split('\n');
      const importantLines: number[] = [];
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (
          trimmedLine.includes('export') ||
          trimmedLine.includes('function') ||
          trimmedLine.includes('class') ||
          trimmedLine.includes('interface') ||
          trimmedLine.includes('type') ||
          trimmedLine.includes('const') && trimmedLine.includes('=') ||
          trimmedLine.includes('useState') ||
          trimmedLine.includes('useEffect') ||
          trimmedLine.includes('async') ||
          trimmedLine.includes('await') ||
          trimmedLine.includes('try') ||
          trimmedLine.includes('catch') ||
          trimmedLine.includes('// TODO') ||
          trimmedLine.includes('// FIXME') ||
          trimmedLine.includes('// NOTE')
        ) {
          importantLines.push(index + 1);
        }
      });
      
      setHighlightedLines(importantLines.slice(0, 10)); // Limit to 10 highlights
    } else {
      setHighlightedLines([]);
    }
  }, [currentTask, fileName, editorContent]);

  if (!fileName) {
    return (
      <div style={{ 
        height: "100%", 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center",
        backgroundColor: "#1e1e1e",
        color: "#888"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
          <h3 style={{ margin: "0 0 8px 0", color: "#cccccc" }}>No File Selected</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Select a file from the explorer to view its contents
          </p>
          {currentTask?.type === "explore" && currentTask.file && (
            <div style={{
              marginTop: "24px",
              padding: "16px",
              backgroundColor: "#2d2d30",
              borderRadius: "6px",
              border: "2px solid #ffcc02"
            }}>
              <div style={{ color: "#ffcc02", fontWeight: "600", marginBottom: "8px" }}>
                🎯 Current Task
              </div>
              <div style={{ color: "#cccccc", marginBottom: "8px" }}>
                {currentTask.description}
              </div>
              <div style={{ fontSize: "12px", color: "#888" }}>
                👈 Click on <code style={{ color: "#569cd6" }}>{currentTask.file}</code> in the explorer
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Editor Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        backgroundColor: "#2d2d30",
        borderBottom: "1px solid #3c3c3c",
        fontSize: "13px"
      }}>
        <div style={{ display: "flex", alignItems: "center", color: "#cccccc" }}>
          <span style={{ marginRight: "8px" }}>
            {getFileIcon(fileName)}
          </span>
          <span style={{ fontWeight: "500" }}>{fileName}</span>
          {currentTask?.file === fileName && (
            <span style={{ 
              marginLeft: "12px",
              padding: "2px 6px",
              backgroundColor: "#ffcc02",
              color: "#000",
              borderRadius: "3px",
              fontSize: "10px",
              fontWeight: "600"
            }}>
              TASK FILE
            </span>
          )}
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{
              backgroundColor: "#1e1e1e",
              color: "#cccccc",
              border: "1px solid #3c3c3c",
              borderRadius: "3px",
              padding: "4px",
              fontSize: "11px"
            }}
          >
            <option value="vs-dark">Dark</option>
            <option value="light">Light</option>
            <option value="hc-black">High Contrast</option>
          </select>
          
          <div style={{ fontSize: "11px", color: "#888" }}>
            {getLanguage(fileName).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Task Context Banner */}
      {currentTask?.type === "explore" && currentTask.file === fileName && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: "#2d2d30",
          borderBottom: "1px solid #ffcc02",
          color: "#cccccc",
          fontSize: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ color: "#ffcc02", marginRight: "8px" }}>🔍</span>
            <strong>Exploration Task:</strong>
          </div>
          <div>{currentTask.description}</div>
          {highlightedLines.length > 0 && (
            <div style={{ marginTop: "8px", fontSize: "11px", color: "#888" }}>
              💡 Important lines are highlighted: {highlightedLines.slice(0, 5).join(", ")}
              {highlightedLines.length > 5 && "..."}
            </div>
          )}
        </div>
      )}

      {/* Monaco Editor */}
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          theme={theme}
          language={getLanguage(fileName)}
          value={editorContent}
          path={fileName}
          options={{
            readOnly: true,
            fontSize: 14,
            lineNumbers: "on",
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            renderLineHighlight: "line",
            selectOnLineNumbers: true,
            cursorBlinking: "blink",
            cursorStyle: "line",
            scrollbar: {
              useShadows: false,
              verticalHasArrows: true,
              horizontalHasArrows: true,
              vertical: "visible",
              horizontal: "visible",
              verticalScrollbarSize: 14,
              horizontalScrollbarSize: 14
            },
            overviewRulerBorder: false,
          }}
          onMount={(editor, monaco) => {
            // Highlight important lines
            if (highlightedLines.length > 0) {
              const decorations = highlightedLines.map(lineNumber => ({
                range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                options: {
                  isWholeLine: true,
                  className: 'highlighted-line',
                  glyphMarginClassName: 'highlighted-glyph',
                  linesDecorationsClassName: 'highlighted-line-decoration'
                }
              }));
              
              editor.deltaDecorations([], decorations);
            }

            // Add custom CSS for highlighting
            const style = document.createElement('style');
            style.textContent = `
              .highlighted-line {
                background-color: rgba(255, 204, 2, 0.1) !important;
              }
              .highlighted-line-decoration {
                background-color: #ffcc02 !important;
                width: 3px !important;
              }
              .highlighted-glyph::before {
                content: "🎯";
                font-size: 10px;
              }
            `;
            document.head.appendChild(style);
          }}
        />
      </div>

      {/* File Stats Footer */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 16px",
        backgroundColor: "#007acc",
        color: "white",
        fontSize: "11px"
      }}>
        <div>
          Lines: {editorContent.split('\n').length} | 
          Characters: {editorContent.length}
        </div>
        <div>
          {getLanguage(fileName)} | Read-only
        </div>
      </div>
    </div>
  );
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return '⚛️';
    case 'ts':
    case 'js':
      return '📄';
    case 'py':
      return '🐍';
    case 'json':
      return '⚙️';
    case 'md':
      return '📖';
    case 'css':
      return '🎨';
    case 'html':
      return '🌐';
    case 'env':
      return '🔐';
    case 'svg':
    case 'png':
    case 'jpg':
      return '🖼️';
    default:
      return '📄';
  }
}
