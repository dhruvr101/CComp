import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "./firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Anchor,
  Stack,
} from "@mantine/core";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit() {
    try {
      if (mode === "signup") {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);

        await fetch("http://localhost:8001/assign-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: userCred.user.uid,
            name,
            email,
            role: "admin",
          }),
        });

        alert("Signed up successfully!");
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCred.user.getIdTokenResult();
        alert(`Logged in as ${email}, role: ${token.claims.role || "none"}`);
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "black", // 🔥 Pure black background
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
          backgroundColor: "#111", // dark card
          border: "1px solid #333",
          color: "white",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === "login" ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "login" ? -80 : 80 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <Title
              order={2}
              ta="center"
              mb="lg"
              style={{ color: "white", fontWeight: 700 }}
            >
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </Title>

            <Stack>
              {mode === "signup" && (
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
                />
              )}

              <TextInput
                label="Email"
                placeholder="you@example.com"
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
              />

              <PasswordInput
                label="Password"
                placeholder="••••••••"
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
              />
            </Stack>

            <Button
              fullWidth
              mt="xl"
              size="md"
              radius="md"
              onClick={handleSubmit}
              styles={{
                root: {
                  background:
                    "linear-gradient(90deg, #ffffff, #888888)", // White → gray gradient
                  color: "black",
                  fontWeight: 600,
                },
              }}
            >
              {mode === "login" ? "Login" : "Sign Up"}
            </Button>

            <Text c="dimmed" size="sm" ta="center" mt="md" style={{ color: "#aaa" }}>
              {mode === "login"
                ? "Don't have an account? "
                : "Already have an account? "}
              <Anchor
                size="sm"
                style={{ color: "white", fontWeight: 600, cursor: "pointer" }}
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? "Sign Up" : "Login"}
              </Anchor>
            </Text>
          </motion.div>
        </AnimatePresence>
      </Paper>
    </div>
  );
}