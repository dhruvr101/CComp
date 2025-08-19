import { useState, useEffect } from "react";
import type { User, IdTokenResult } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Auth from "./Auth";
import AdminDashboard from "./AdminDashboard";
import EmployeeSignup from "./EmployeeSignup";
import Onboarding from "./vsUI/Onboarding";
import RoleSelection from "./vsUI/RoleSelection";
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

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
    const isEmployeeSignup = urlParams.has('employee-signup') || window.location.pathname === '/employee-signup';
    
    if (token && isEmployeeSignup) {
      console.log("🔍 Employee signup token found:", token);
      setEmployeeSignupToken(token);
      setShowEmployeeSignup(true);
      setLoading(false);
      return; // Don't proceed with auth checks if this is an employee signup
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(user);

      const tokenResult: IdTokenResult = await user.getIdTokenResult(true);

      const claimRole = tokenResult.claims.role;
      if (typeof claimRole === "string") {
        setRole(claimRole);
      } else {
        setRole(null);
      }

      setLoading(false);

      // If employee, fetch session via users/{uid} then admins/{invitedBy}/onboarding_sessions/{sessionId}
      if (claimRole === 'employee') {
        try {
          // Get user doc to find admin and session token
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const udata = userSnap.data() as any;
            const adminUid = udata.invitedBy;
            const sessionId = udata.onboardingSessionId;
            if (adminUid && sessionId) {
              const sessRef = doc(db, 'admins', adminUid, 'onboarding_sessions', sessionId);
              const sessSnap = await getDoc(sessRef);
              if (sessSnap.exists()) {
                const sdata = sessSnap.data() as any;
                setOnboardingConfig({
                  role: sdata.role,
                  level: sdata.userLevel || sdata.level,
                  repositories: sdata.repositories,
                });
                setShowOnboarding(true);
              }
            }
          }
        } catch (e) {
          console.error('Failed to hydrate onboarding config:', e);
        }
      }
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

  // Show employee signup if we have a token
  if (showEmployeeSignup && employeeSignupToken) {
    // If user is logged in, show logout option
    if (user) {
      return (
        <div
          style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "black",
            color: "white",
            flexDirection: "column",
          }}
        >
          <h2>Already Logged In</h2>
          <p>You are already logged in as {user.email}. Please log out first to create a new employee account.</p>
          <button
            onClick={() => {
              auth.signOut();
              setShowEmployeeSignup(false);
              setEmployeeSignupToken(null);
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
            style={{
              padding: "12px 24px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
              marginTop: "20px"
            }}
          >
            Logout and Try Again
          </button>
        </div>
      );
    }
    
    // If no user, show employee signup
    return (
      <EmployeeSignup
        token={employeeSignupToken}
        onSignupComplete={(sessionData) => {
          console.log("🔍 Employee signup completed:", sessionData);
          setOnboardingConfig({
            role: sessionData.role,
            level: sessionData.userLevel || "beginner",
            repositories: sessionData.repositories,
          });
          setShowEmployeeSignup(false);
          setEmployeeSignupToken(null);
          // Clear the URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          // The onAuthStateChanged will trigger and eventually show onboarding
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
      <p>You are logged in but not an admin.</p>
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