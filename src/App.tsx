import { useState, useEffect } from "react";
import type { User, IdTokenResult } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Auth from "./Auth";
import AdminDashboard from "./AdminDashboard";
import Onboarding from "./vsUI/Onboarding";
import RoleSelection from "./vsUI/RoleSelection";
import EmployeeSignup from "./EmployeeSignup";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [showEmployeeSignup, setShowEmployeeSignup] = useState(false);
  const [employeeSignupToken, setEmployeeSignupToken] = useState<string | null>(null);
  const [onboardingConfig, setOnboardingConfig] = useState<{
    role: string;
    level: string;
    repositories: string[];
  } | null>(null);

  useEffect(() => {
    // Check for employee signup token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    console.log("🔍 App useEffect - URL params:", window.location.search);
    console.log("🔍 App useEffect - Token found:", token);
    
    if (token) {
      console.log("✅ Token found, showing employee signup");
      setEmployeeSignupToken(token);
      setShowEmployeeSignup(true);
      return;
    }

    console.log("🔍 No token found, proceeding with auth check");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log("🔍 No user authenticated");
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      console.log("🔍 User authenticated:", user.email);
      setUser(user);

      const tokenResult: IdTokenResult = await user.getIdTokenResult(true);

      // 👇 Safely read the claim — check it's a string
      const claimRole = tokenResult.claims.role;
      if (typeof claimRole === "string") {
        console.log("🔍 User role:", claimRole);
        setRole(claimRole);
      } else {
        console.log("🔍 No role found for user");
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "black",
          color: "white",
        }}
      >
        Loading...
      </div>
    );
  }

  // Show employee signup if token is present
  if (showEmployeeSignup && employeeSignupToken) {
    return (
      <EmployeeSignup 
        token={employeeSignupToken}
        onSignupComplete={(sessionData) => {
          // After employee signs up, proceed to onboarding
          setOnboardingConfig({
            role: sessionData.role,
            level: "beginner", // Default level for employees
            repositories: sessionData.repositories
          });
          setShowEmployeeSignup(false);
          setEmployeeSignupToken(null);
          setShowOnboarding(true);
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  if (!user) return <Auth />;

  // Show role selection if requested
  if (showRoleSelection) {
    return (
      <RoleSelection
        onRoleSelected={(role, level, repositories) => {
          setOnboardingConfig({ role, level, repositories });
          setShowRoleSelection(false);
          setShowOnboarding(true);
        }}
        availableRepositories={["colicitv2", "frontend-dashboard", "api-service", "mobile-client", "analytics-platform"]}
      />
    );
  }

  // Show onboarding if requested
  if (showOnboarding && onboardingConfig) {
    return (
      <Onboarding 
        userId={user.uid}
        repositoryName={onboardingConfig.repositories[0] || "colicitv2"}
        userRole={onboardingConfig.role}
        userLevel={onboardingConfig.level as "beginner" | "intermediate" | "advanced"}
        repositories={onboardingConfig.repositories}
        onComplete={() => {
          setShowOnboarding(false);
          setOnboardingConfig(null);
        }}
      />
    );
  }

  return role === "admin" ? (
    <AdminDashboard user={user} />
  ) : role === "employee" ? (
    // For employees, show onboarding automatically if they haven't completed it
    <div style={{ 
      color: "white", 
      padding: "20px",
      height: "100vh",
      backgroundColor: "#1e1e1e",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <h2>Welcome to Your Onboarding!</h2>
      <p>You are logged in as an employee.</p>
      <button
        onClick={() => {
          // Get user's job role and repositories from the backend
          setOnboardingConfig({
            role: "Employee", // Will be updated with actual job role
            level: "beginner",
            repositories: ["colicitv2"] // Will be updated with actual repositories
          });
          setShowOnboarding(true);
        }}
        style={{
          padding: "12px 24px",
          backgroundColor: "#0e639c",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "16px",
          marginTop: "20px"
        }}
      >
        🚀 Start Your Onboarding
      </button>
    </div>
  ) : (
    <div style={{ 
      color: "white", 
      padding: "20px",
      height: "100vh",
      backgroundColor: "#1e1e1e",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <h2>Welcome to Colicitv2!</h2>
      <p>You are logged in but not assigned a role.</p>
      <button
        onClick={() => setShowRoleSelection(true)}
        style={{
          padding: "12px 24px",
          backgroundColor: "#0e639c",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "16px",
          marginTop: "20px"
        }}
      >
        🚀 Start Role-Based Walkthrough
      </button>
    </div>
  );
}
