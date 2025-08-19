import { useState, useEffect } from "react";
import type { User, IdTokenResult } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Auth from "./Auth";
import AdminDashboard from "./AdminDashboard";
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
  const [onboardingConfig, setOnboardingConfig] = useState<{
    role: string;
    level: string;
    repositories: string[];
  } | null>(null);

  useEffect(() => {
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
