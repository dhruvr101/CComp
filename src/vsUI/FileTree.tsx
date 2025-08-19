import { useState } from "react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  isOpen?: boolean;
}

interface FileTreeProps {
  onSelectFile: (file: string, content: string) => void;
  currentTask?: {
    type: string;
    file?: string;
  };
}

// Simulated file system structure
const projectStructure: FileNode = {
  name: "colicitv2",
  path: "",
  type: "folder",
  isOpen: true,
  children: [
    {
      name: "src",
      path: "src",
      type: "folder",
      isOpen: true,
      children: [
        { name: "App.tsx", path: "src/App.tsx", type: "file" },
        { name: "Auth.tsx", path: "src/Auth.tsx", type: "file" },
        { name: "AdminDashboard.tsx", path: "src/AdminDashboard.tsx", type: "file" },
        { name: "firebase.ts", path: "src/firebase.ts", type: "file" },
        { name: "main.tsx", path: "src/main.tsx", type: "file" },
        {
          name: "vsUI",
          path: "src/vsUI",
          type: "folder",
          isOpen: false,
          children: [
            { name: "CodeEditor.tsx", path: "src/vsUI/CodeEditor.tsx", type: "file" },
            { name: "FileTree.tsx", path: "src/vsUI/FileTree.tsx", type: "file" },
            { name: "Onboarding.tsx", path: "src/vsUI/Onboarding.tsx", type: "file" },
            { name: "Terminal.tsx", path: "src/vsUI/Terminal.tsx", type: "file" },
            { name: "Walkthrough.tsx", path: "src/vsUI/Walkthrough.tsx", type: "file" },
            { name: "openaiClient.ts", path: "src/vsUI/openaiClient.ts", type: "file" },
            { name: "tasks.ts", path: "src/vsUI/tasks.ts", type: "file" },
          ]
        }
      ]
    },
    {
      name: "backend",
      path: "backend",
      type: "folder",
      isOpen: false,
      children: [
        { name: "main.py", path: "backend/main.py", type: "file" },
        { name: "requirements.txt", path: "backend/requirements.txt", type: "file" },
        { name: "colicit-firebase-adminsdk-fbsvc-3d5bc416c3.json", path: "backend/colicit-firebase-adminsdk-fbsvc-3d5bc416c3.json", type: "file" },
      ]
    },
    {
      name: "public",
      path: "public",
      type: "folder",
      isOpen: false,
      children: [
        { name: "vite.svg", path: "public/vite.svg", type: "file" },
      ]
    },
    { name: "package.json", path: "package.json", type: "file" },
    { name: "vite.config.ts", path: "vite.config.ts", type: "file" },
    { name: "tsconfig.json", path: "tsconfig.json", type: "file" },
    { name: "README.md", path: "README.md", type: "file" },
    { name: ".env", path: ".env", type: "file" },
    { name: ".gitignore", path: ".gitignore", type: "file" },
  ]
};

// Simulated file contents
const fileContents: Record<string, string> = {
  "src/App.tsx": `import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import Auth from './Auth';
import AdminDashboard from './AdminDashboard';
import Onboarding from './vsUI/Onboarding';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (showOnboarding) {
    return <Onboarding />;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div>
      <AdminDashboard />
      <button onClick={() => setShowOnboarding(true)}>
        Show Onboarding
      </button>
    </div>
  );
}

export default App;`,

  "src/Auth.tsx": `import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{isLogin ? 'Sign In' : 'Sign Up'}</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
      </button>
      <button type="button" onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Create Account' : 'Already have account?'}
      </button>
    </form>
  );
}`,

  "backend/main.py": `from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, auth, firestore
import os

# Initialize Firebase Admin
cred = credentials.Certificate("colicit-firebase-adminsdk-fbsvc-3d5bc416c3.json")
firebase_admin.initialize_app(cred)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = firestore.client()

@app.post("/assign-role")
async def assign_role(uid: str, role: str):
    """Assign a role to a user via Firebase Custom Claims"""
    try:
        # Set custom claims
        auth.set_custom_user_claims(uid, {"role": role})
        
        # Also store in Firestore for easier querying
        user_ref = db.collection("users").document(uid)
        user_ref.set({
            "role": role,
            "assigned_at": firestore.SERVER_TIMESTAMP
        }, merge=True)
        
        return {"message": f"Role {role} assigned to user {uid}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/users/{uid}")
async def get_user_profile(uid: str):
    """Get user profile from Firestore"""
    try:
        user_ref = db.collection("users").document(uid)
        doc = user_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)`,

  "package.json": `{
  "name": "colicitv2",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@mantine/core": "^8.2.5",
    "@mantine/hooks": "^8.2.5",
    "@mantine/notifications": "^8.2.5",
    "@monaco-editor/react": "^4.7.0",
    "@tabler/icons-react": "^3.34.1",
    "firebase": "^12.1.0",
    "framer-motion": "^12.23.12",
    "monaco-editor": "^0.52.2",
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.33.0",
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7",
    "@vitejs/plugin-react": "^5.0.0",
    "eslint": "^9.33.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.3.0",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.39.1",
    "vite": "^7.1.2"
  }
}`
};

export default function FileTree({ onSelectFile, currentTask }: FileTreeProps) {
  const [treeState, setTreeState] = useState<FileNode>(projectStructure);

  const toggleFolder = (path: string) => {
    const updateNode = (node: FileNode): FileNode => {
      if (node.path === path && node.type === "folder") {
        return { ...node, isOpen: !node.isOpen };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateNode) };
      }
      return node;
    };
    
    setTreeState(updateNode(treeState));
  };

  const handleFileClick = (filePath: string) => {
    const content = fileContents[filePath] || `// Contents of ${filePath}\n// This is a placeholder file content for the onboarding demo`;
    onSelectFile(filePath, content);
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const isHighlighted = currentTask?.file === node.path;
    const isPaddingLeft = depth * 16;

    return (
      <div key={node.path}>
        <div
          onClick={() => node.type === "folder" ? toggleFolder(node.path) : handleFileClick(node.path)}
          style={{
            paddingLeft: isPaddingLeft + 8,
            paddingTop: 4,
            paddingBottom: 4,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            backgroundColor: isHighlighted ? "#37373d" : "transparent",
            borderRadius: isHighlighted ? "3px" : "none",
            color: isHighlighted ? "#ffffff" : "#cccccc",
            transition: "background-color 0.15s ease"
          }}
          onMouseOver={(e) => {
            if (!isHighlighted) {
              e.currentTarget.style.backgroundColor = "#2a2d2e";
            }
          }}
          onMouseOut={(e) => {
            if (!isHighlighted) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <span style={{ marginRight: 6, fontSize: "12px", width: 12 }}>
            {node.type === "folder" 
              ? (node.isOpen ? "📂" : "📁")
              : getFileIcon(node.name)
            }
          </span>
          <span style={{ 
            fontSize: "13px",
            fontWeight: isHighlighted ? "500" : "400"
          }}>
            {node.name}
          </span>
          {isHighlighted && (
            <span style={{ 
              marginLeft: "auto", 
              marginRight: 8,
              fontSize: "10px",
              color: "#ffcc02"
            }}>
              ●
            </span>
          )}
        </div>
        
        {node.type === "folder" && node.isOpen && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const getFileIcon = (fileName: string): string => {
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
      case 'env':
        return '🔐';
      case 'svg':
      case 'png':
      case 'jpg':
        return '🖼️';
      default:
        return '📄';
    }
  };

  return (
    <div style={{
      height: "100%",
      overflow: "auto",
      fontSize: "13px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid #2d2d30",
        backgroundColor: "#2d2d30",
        color: "#ffffff",
        fontSize: "11px",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }}>
        Explorer
      </div>
      
      <div style={{ padding: "8px 0" }}>
        {renderNode(treeState)}
      </div>

      {currentTask?.type === "explore" && currentTask.file && (
        <div style={{
          margin: "12px 8px",
          padding: "8px",
          backgroundColor: "#2d2d30",
          borderRadius: "4px",
          border: "1px solid #ffcc02",
          fontSize: "11px"
        }}>
          <div style={{ color: "#ffcc02", fontWeight: "600", marginBottom: "4px" }}>
            📍 Current Task
          </div>
          <div style={{ color: "#cccccc" }}>
            Explore: <code style={{ color: "#569cd6" }}>{currentTask.file}</code>
          </div>
        </div>
      )}
    </div>
  );
}
