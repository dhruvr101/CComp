import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { auth } from "./firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Stack,
  Alert,
  Badge,
  Group,
} from "@mantine/core";
import { IconAlertCircle, IconUser, IconMail } from "@tabler/icons-react";

interface OnboardingSessionData {
  id: string;
  email: string;
  role: string;
  repositories: string[];
  customInstructions?: string;
  adminUid: string;
  adminName?: string;
  adminEmail?: string;
}

interface EmployeeSignupProps {
  token: string;
  onSignupComplete: (sessionData: OnboardingSessionData) => void;
}

export default function EmployeeSignup({ token, onSignupComplete }: EmployeeSignupProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionData, setSessionData] = useState<OnboardingSessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    console.log("🔍 EmployeeSignup component mounted with token:", token);
    loadOnboardingSession();
  }, [token]);

  const loadOnboardingSession = async () => {
    try {
      console.log("🔍 Loading onboarding session for token:", token);
      setLoading(true);
      const response = await fetch(`http://localhost:8001/employee-onboarding/${token}`);
      
      console.log("🔍 API response status:", response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Invalid or expired onboarding link. Please contact your administrator.");
        } else {
          const errorData = await response.json();
          console.error("🔍 API error:", errorData);
          setError(errorData.detail || "Failed to load onboarding session");
        }
        return;
      }

      const data = await response.json();
      console.log("🔍 Session data loaded:", data);
      setSessionData(data);
      setEmail(data.email); // Pre-fill email from invitation
    } catch (err) {
      console.error("🔍 Network error:", err);
      setError("Failed to connect to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!sessionData) return;

    // Validation
    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }
    
    if (email !== sessionData.email) {
      setError("Email must match the invitation email");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Complete employee signup on backend
      const response = await fetch("http://localhost:8001/employee-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          name: name.trim(),
          email,
          onboarding_token: token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to complete signup");
      }

      const result = await response.json();
      
      // Call parent component to proceed to onboarding
      onSignupComplete({
        id: result.session.id,
        email,
        role: result.session.role,
        repositories: result.session.repositories,
        customInstructions: result.session.customInstructions,
        adminUid: sessionData.adminUid,
      });

    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Please contact your administrator.");
      } else {
        setError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

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
        <Text>Loading onboarding information...</Text>
      </div>
    );
  }

  if (error && !sessionData) {
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
        <Paper
          radius="lg"
          p="xl"
          shadow="xl"
          withBorder
          style={{
            width: 420,
            backgroundColor: "#111",
            border: "1px solid #333",
            color: "white",
          }}
        >
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
            {error}
          </Alert>
        </Paper>
      </div>
    );
  }

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
      <Paper
        radius="lg"
        p="xl"
        shadow="xl"
        withBorder
        style={{
          width: 500,
          backgroundColor: "#111",
          border: "1px solid #333",
          color: "white",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Title
            order={2}
            ta="center"
            mb="md"
            style={{ color: "white", fontWeight: 700 }}
          >
            Welcome to the Team!
          </Title>

          <Text ta="center" size="sm" c="dimmed" mb="xl">
            Complete your account setup to begin your onboarding journey
          </Text>

          {sessionData && (
            <Paper
              p="md"
              mb="xl"
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
              }}
            >
              <Text size="sm" fw={500} mb="sm" style={{ color: "#fff" }}>
                Onboarding Details
              </Text>
              
              {sessionData.adminName && (
                <Group gap="xs" mb="xs">
                  <IconUser size={14} />
                  <Text size="sm">Invited by: {sessionData.adminName}</Text>
                </Group>
              )}
              
              <Group gap="xs" mb="xs">
                <IconUser size={14} />
                <Text size="sm">Role: </Text>
                <Badge variant="light">{sessionData.role}</Badge>
              </Group>
              
              <Group gap="xs" mb="xs">
                <IconMail size={14} />
                <Text size="sm">Email: {sessionData.email}</Text>
              </Group>
              
              {sessionData.repositories.length > 0 && (
                <div>
                  <Text size="sm" mb="xs">Repositories:</Text>
                  <Group gap="xs">
                    {sessionData.repositories.map((repo) => (
                      <Badge key={repo} size="sm" variant="outline">
                        {repo}
                      </Badge>
                    ))}
                  </Group>
                </div>
              )}
              
              {sessionData.customInstructions && (
                <div style={{ marginTop: "8px" }}>
                  <Text size="sm" fw={500} mb="xs">Special Instructions:</Text>
                  <Text size="xs" c="dimmed">{sessionData.customInstructions}</Text>
                </div>
              )}
            </Paper>
          )}

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
              {error}
            </Alert>
          )}

          <Stack>
            <TextInput
              label="Full Name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              styles={{
                input: {
                  backgroundColor: "#1a1a1a",
                  color: "white",
                  borderColor: "#333",
                },
                label: { color: "#bbb" },
              }}
              withAsterisk
              disabled={submitting}
            />

            <TextInput
              label="Email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              styles={{
                input: {
                  backgroundColor: "#1a1a1a",
                  color: "white",
                  borderColor: "#333",
                },
                label: { color: "#bbb" },
              }}
              withAsterisk
              disabled={true} // Email is pre-filled and readonly
            />

            <PasswordInput
              label="Password"
              placeholder="Create a secure password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              styles={{
                input: {
                  backgroundColor: "#1a1a1a",
                  color: "white",
                  borderColor: "#333",
                },
                label: { color: "#bbb" },
              }}
              withAsterisk
              disabled={submitting}
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              styles={{
                input: {
                  backgroundColor: "#1a1a1a",
                  color: "white",
                  borderColor: "#333",
                },
                label: { color: "#bbb" },
              }}
              withAsterisk
              disabled={submitting}
            />
          </Stack>

          <Button
            fullWidth
            mt="xl"
            size="md"
            radius="md"
            onClick={handleSignup}
            loading={submitting}
            disabled={submitting}
            styles={{
              root: {
                background: "linear-gradient(90deg, #ffffff, #888888)",
                color: "black",
                fontWeight: 600,
              },
            }}
          >
            Create Account & Start Onboarding
          </Button>

          <Text c="dimmed" size="xs" ta="center" mt="md" style={{ color: "#aaa" }}>
            By creating an account, you agree to complete the onboarding process
            and follow company guidelines.
          </Text>
        </motion.div>
      </Paper>
    </div>
  );
}