import { useState } from "react";

interface RoleSelectionProps {
  onRoleSelected: (role: string, level: string, repositories: string[]) => void;
  availableRepositories?: string[];
}

const AVAILABLE_ROLES = [
  { value: "frontend developer", label: "🎨 Frontend Developer", description: "React, UI/UX, Component Development" },
  { value: "backend developer", label: "⚙️ Backend Developer", description: "APIs, Databases, Server Logic" },
  { value: "full-stack developer", label: "🌐 Full-Stack Developer", description: "End-to-end Development" },
  { value: "devops", label: "🚀 DevOps Engineer", description: "Deployment, Infrastructure, CI/CD" },
  { value: "product manager", label: "📊 Product Manager", description: "Strategy, Features, User Experience" },
  { value: "designer", label: "🎯 UI/UX Designer", description: "Design Systems, User Experience" },
  { value: "qa", label: "🔍 QA Engineer", description: "Testing, Quality Assurance" },
  { value: "developer", label: "💻 General Developer", description: "All-around Development" }
];

const SKILL_LEVELS = [
  { value: "beginner", label: "🌱 Beginner", description: "New to this technology stack" },
  { value: "intermediate", label: "🔥 Intermediate", description: "Some experience with similar tools" },
  { value: "advanced", label: "⚡ Advanced", description: "Experienced developer" }
];

export default function RoleSelection({ 
  onRoleSelected, 
  availableRepositories = ["colicitv2", "frontend-app", "backend-api", "mobile-app"] 
}: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedRepos, setSelectedRepos] = useState<string[]>(["colicitv2"]);

  const handleSubmit = () => {
    if (selectedRole && selectedLevel) {
      onRoleSelected(selectedRole, selectedLevel, selectedRepos);
    }
  };

  const toggleRepository = (repo: string) => {
    setSelectedRepos(prev => 
      prev.includes(repo) 
        ? prev.filter(r => r !== repo)
        : [...prev, repo]
    );
  };

  return (
    <div style={{
      height: "100vh",
      backgroundColor: "#1e1e1e",
      color: "#cccccc",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        backgroundColor: "#252526",
        padding: "40px",
        borderRadius: "12px",
        border: "1px solid #3c3c3c",
        maxWidth: "600px",
        width: "90%"
      }}>
        <h1 style={{ margin: "0 0 8px 0", color: "#ffffff", textAlign: "center" }}>
          🎯 Personalized Onboarding
        </h1>
        <p style={{ 
          margin: "0 0 32px 0", 
          textAlign: "center", 
          color: "#888",
          fontSize: "14px"
        }}>
          Tell us about your role and experience level to get a customized walkthrough
        </p>

        {/* Role Selection */}
        <div style={{ marginBottom: "32px" }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#ffffff" }}>What's your role?</h3>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "12px"
          }}>
            {AVAILABLE_ROLES.map(role => (
              <div
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                style={{
                  padding: "16px",
                  backgroundColor: selectedRole === role.value ? "#0e639c" : "#2d2d30",
                  border: `1px solid ${selectedRole === role.value ? "#0e639c" : "#3c3c3c"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => {
                  if (selectedRole !== role.value) {
                    e.currentTarget.style.backgroundColor = "#37373d";
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedRole !== role.value) {
                    e.currentTarget.style.backgroundColor = "#2d2d30";
                  }
                }}
              >
                <div style={{ 
                  fontWeight: "600", 
                  marginBottom: "4px",
                  color: selectedRole === role.value ? "#ffffff" : "#cccccc"
                }}>
                  {role.label}
                </div>
                <div style={{ 
                  fontSize: "12px", 
                  color: selectedRole === role.value ? "#cce7ff" : "#888"
                }}>
                  {role.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skill Level Selection */}
        <div style={{ marginBottom: "32px" }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#ffffff" }}>What's your experience level?</h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {SKILL_LEVELS.map(level => (
              <div
                key={level.value}
                onClick={() => setSelectedLevel(level.value)}
                style={{
                  padding: "12px 16px",
                  backgroundColor: selectedLevel === level.value ? "#0e639c" : "#2d2d30",
                  border: `1px solid ${selectedLevel === level.value ? "#0e639c" : "#3c3c3c"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  flex: "1",
                  minWidth: "150px",
                  textAlign: "center"
                }}
                onMouseOver={(e) => {
                  if (selectedLevel !== level.value) {
                    e.currentTarget.style.backgroundColor = "#37373d";
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedLevel !== level.value) {
                    e.currentTarget.style.backgroundColor = "#2d2d30";
                  }
                }}
              >
                <div style={{ 
                  fontWeight: "600", 
                  marginBottom: "4px",
                  color: selectedLevel === level.value ? "#ffffff" : "#cccccc"
                }}>
                  {level.label}
                </div>
                <div style={{ 
                  fontSize: "11px", 
                  color: selectedLevel === level.value ? "#cce7ff" : "#888"
                }}>
                  {level.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Repository Selection */}
        <div style={{ marginBottom: "32px" }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#ffffff" }}>
            Which repositories will you work with?
          </h3>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {availableRepositories.map(repo => (
              <button
                key={repo}
                onClick={() => toggleRepository(repo)}
                style={{
                  padding: "8px 12px",
                  backgroundColor: selectedRepos.includes(repo) ? "#0e639c" : "transparent",
                  border: `1px solid ${selectedRepos.includes(repo) ? "#0e639c" : "#3c3c3c"}`,
                  borderRadius: "4px",
                  color: selectedRepos.includes(repo) ? "#ffffff" : "#cccccc",
                  cursor: "pointer",
                  fontSize: "12px",
                  transition: "all 0.2s ease"
                }}
              >
                {selectedRepos.includes(repo) ? "✓ " : ""}{repo}
              </button>
            ))}
          </div>
          <p style={{ 
            fontSize: "11px", 
            color: "#888", 
            margin: "8px 0 0 0"
          }}>
            Select the repositories you'll be working with to get relevant examples
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!selectedRole || !selectedLevel}
          style={{
            width: "100%",
            padding: "16px",
            backgroundColor: selectedRole && selectedLevel ? "#0e639c" : "#3c3c3c",
            color: selectedRole && selectedLevel ? "#ffffff" : "#888",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: selectedRole && selectedLevel ? "pointer" : "not-allowed",
            transition: "background-color 0.2s ease"
          }}
        >
          🚀 Start My Personalized Walkthrough
        </button>

        {(!selectedRole || !selectedLevel) && (
          <p style={{ 
            textAlign: "center", 
            fontSize: "12px", 
            color: "#888", 
            margin: "12px 0 0 0"
          }}>
            Please select your role and experience level to continue
          </p>
        )}
      </div>
    </div>
  );
}
