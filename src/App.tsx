import { useState, useEffect } from "react";
import type { User, IdTokenResult } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Auth from "./Auth";
import AdminDashboard from "./AdminDashboard";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

      // 👇 Safely read the claim — check it's a string
      const claimRole = tokenResult.claims.role;
      if (typeof claimRole === "string") {
        setRole(claimRole);
      } else {
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

  if (!user) return <Auth />;

  return role === "admin" ? (
    <AdminDashboard user={user} />
  ) : (
    <div style={{ color: "white" }}>You are logged in but not an admin.</div>
  );
}
