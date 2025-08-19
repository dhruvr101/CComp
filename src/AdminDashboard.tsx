import { useState, useEffect } from "react";
import {
  Container,
  Title,
  Text,
  Button,
  TextInput,
  Select,
  MultiSelect,
  Stack,
  Group,
  Card,
  Badge,
  ActionIcon,
  Tabs,
  Grid,
  Alert,
  Modal,
  Textarea,
  Table,
  ScrollArea,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconGitBranch,
  IconUsers,
  IconMail,
  IconCode,
  IconAlertCircle,
  IconExternalLink,
  IconLogout,
} from "@tabler/icons-react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import type { User } from "firebase/auth";

interface Repository {
  id: string;
  name: string;
  url: string;
  description: string;
  language: string;
  lastSync: Date;
  status: "synced" | "syncing" | "error";
  adminUid: string;
}

interface OnboardingSession {
  id: string;
  email: string;
  role: string;
  repositories: string[]; // repo IDs
  status: "pending" | "in_progress" | "completed" | "expired";
  createdAt: Date;
  completedAt?: Date;
  progress: number;
  adminUid: string;
}

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<string | null>("repositories");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [onboardingSessions, setOnboardingSessions] = useState<OnboardingSession[]>([]);

  // Modals
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);

  // Forms
  const [newRepo, setNewRepo] = useState({
    name: "",
    url: "",
    description: "",
    language: "",
  });

  const [newOnboarding, setNewOnboarding] = useState({
    email: "",
    role: "",
    repositories: [] as string[], // repo IDs
    customInstructions: "",
  });

  const roles = [
    "Frontend Engineer",
    "Backend Engineer",
    "Full Stack Engineer",
    "DevOps Engineer",
    "Data Scientist",
    "Product Manager",
    "Designer",
    "QA Engineer",
  ];

  const languages = [
    "JavaScript/TypeScript",
    "Python",
    "Java",
    "Go",
    "Rust",
    "C#",
    "PHP",
    "Ruby",
    "Other",
  ];

  useEffect(() => {
    loadRepositories();
    loadOnboardingSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRepositories = async () => {
    try {
      console.log("🔄 Loading repositories for user:", user.uid);
      const response = await fetch(`http://localhost:8001/repositories/${user.uid}`);
      console.log("📡 Repository response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Repository fetch failed:", errorText);
        throw new Error(`Failed to fetch repos: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("📦 Repository data received:", data);
      
      const repos = data.map((repo: any) => ({
        ...repo,
        lastSync: new Date(repo.lastSync * 1000 || repo.lastSync),
      })) as Repository[];
      setRepositories(repos);
      console.log("✅ Repositories loaded successfully:", repos.length);
    } catch (err) {
      console.error("❌ Error loading repositories:", err);
      setRepositories([]);
    }
  };

  const loadOnboardingSessions = async () => {
    try {
      console.log("🔄 Loading onboarding sessions for user:", user.uid);
      const response = await fetch(`http://localhost:8001/onboarding-sessions/${user.uid}`);
      console.log("📡 Onboarding response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Onboarding fetch failed:", errorText);
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("📦 Onboarding data received:", data);
      
      const sessions = data.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt * 1000 || s.createdAt),
        completedAt: s.completedAt ? new Date(s.completedAt * 1000 || s.completedAt) : undefined,
      })) as OnboardingSession[];
      setOnboardingSessions(sessions);
      console.log("✅ Onboarding sessions loaded successfully:", sessions.length);
    } catch (err) {
      console.error("❌ Error loading onboarding sessions:", err);
      setOnboardingSessions([]);
    }
  };

  const handleAddRepository = async () => {
    if (!newRepo.name || !newRepo.url) return;
    try {
      console.log("🔄 Creating repository:", newRepo);
      const payload = { ...newRepo, adminUid: user.uid };
      console.log("📡 Sending payload:", payload);
      
      const response = await fetch("http://localhost:8001/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("📡 Repository create response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Repository create failed:", errorText);
        throw new Error(`Failed to create repository: ${response.status}`);
      }
      
      const repository = await response.json();
      console.log("📦 Repository created:", repository);
      
      repository.lastSync = new Date(repository.lastSync);
      setRepositories((prev) => [...prev, repository]);
      setNewRepo({ name: "", url: "", description: "", language: "" });
      setRepoModalOpen(false);
      console.log("✅ Repository added successfully");
    } catch (err) {
      console.error("❌ Error creating repository:", err);
      alert("Failed to create repository. Please try again.");
    }
  };

  const handleCreateOnboarding = async () => {
    if (!newOnboarding.email || !newOnboarding.role || newOnboarding.repositories.length === 0) return;
    try {
      console.log("🔄 Creating onboarding session:", newOnboarding);
      const payload = { ...newOnboarding, adminUid: user.uid };
      console.log("📡 Sending payload:", payload);
      
      const response = await fetch("http://localhost:8001/onboarding-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("📡 Onboarding create response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Onboarding create failed:", errorText);
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create onboarding session");
      }
      
      const session = await response.json();
      console.log("📦 Onboarding session created:", session);
      
      session.createdAt = new Date(session.createdAt);
      setOnboardingSessions((prev) => [...prev, session]);
      setNewOnboarding({ email: "", role: "", repositories: [], customInstructions: "" });
      setOnboardingModalOpen(false);

      alert(
        `Onboarding session created!\n\n📧 Email invitation sent to: ${session.email}\n🔗 Signup link (dev): http://localhost:5174/employee-signup?token=${session.id}\n\nThe employee will create their account via this link and be directed to onboarding.`
      );
      console.log("✅ Onboarding session added successfully");
    } catch (err) {
      console.error("❌ Error creating onboarding session:", err);
      alert("Failed to create onboarding session. Please try again.");
    }
  };

  const handleDeleteRepository = async (repoId: string) => {
    if (!confirm("Delete this repository?")) return;
    try {
      const response = await fetch(`http://localhost:8001/repositories/${user.uid}/${repoId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete repository");
      setRepositories((prev) => prev.filter((r) => r.id !== repoId));
    } catch (err) {
      console.error("Error deleting repository:", err);
      alert("Failed to delete repository.");
    }
  };

  const handleDeleteOnboarding = async (sessionId: string) => {
    if (!confirm("Delete this onboarding session?")) return;
    try {
      const response = await fetch(`http://localhost:8001/onboarding-sessions/${user.uid}/${sessionId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete onboarding session");
      setOnboardingSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error("Error deleting onboarding session:", err);
      alert("Failed to delete onboarding session.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "synced":
      case "completed":
        return "green";
      case "syncing":
      case "in_progress":
        return "blue";
      case "pending":
        return "yellow";
      case "error":
      case "expired":
        return "red";
      default:
        return "gray";
    }
  };

  // helper to map repo id -> name
  const repoName = (id: string) => repositories.find((r) => r.id === id)?.name || id;

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Admin Dashboard</Title>
          <Text c="dimmed">Manage repositories and onboarding sessions</Text>
        </div>
        <Group>
          <Button
            variant="light"
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={() => signOut(auth)}
          >
            Logout
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="repositories" leftSection={<IconGitBranch size={16} />}>
            Repositories
          </Tabs.Tab>
          <Tabs.Tab value="onboarding" leftSection={<IconUsers size={16} />}>
            Onboarding Sessions
          </Tabs.Tab>
        </Tabs.List>

        {/* Repositories */}
        <Tabs.Panel value="repositories" pt="md">
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={500}>Repository Management</Text>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setRepoModalOpen(true)}>
              Add Repository
            </Button>
          </Group>

          <Grid>
            {repositories.map((repo) => (
              <Grid.Col span={{ base: 12, md: 6, lg: 4 }} key={repo.id}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>{repo.name}</Text>
                    <Badge color={getStatusColor(repo.status)} variant="light">
                      {repo.status}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed" mb="sm">{repo.description}</Text>
                  <Group justify="space-between" mb="md">
                    <Badge variant="outline">{repo.language}</Badge>
                    <Text size="xs" c="dimmed">Last sync: {repo.lastSync.toLocaleString()}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconExternalLink size={14} />}
                      component="a"
                      href={repo.url}
                      target="_blank"
                    >
                      View Repo
                    </Button>
                    <ActionIcon variant="light" color="red" onClick={() => handleDeleteRepository(repo.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </Tabs.Panel>

        {/* Onboarding Sessions */}
        <Tabs.Panel value="onboarding" pt="md">
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={500}>Onboarding Sessions</Text>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setOnboardingModalOpen(true)}>
              Create Onboarding
            </Button>
          </Group>

          <ScrollArea>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Repositories</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Progress</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
                            <Table.Tbody>
                {onboardingSessions.map((s) => (
                  <Table.Tr key={s.id}>
                    <Table.Td>{s.email}</Table.Td>
                    <Table.Td><Badge variant="outline">{s.role}</Badge></Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {s.repositories.map((rid) => (
                          <Badge key={rid} size="sm" variant="light">{repoName(rid)}</Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(s.status)} variant="light">{s.status}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Text size="sm">{s.progress}%</Text>
                        <div style={{ width: 50, height: 6, backgroundColor: "#e9ecef", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{
                            width: `${s.progress}%`,
                            height: "100%",
                            backgroundColor: s.progress === 100 ? "#51cf66" : "#339af0",
                          }} />
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td><Text size="sm">{s.createdAt.toLocaleDateString()}</Text></Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          size="sm"
                          component="a"
                          href={`http://localhost:5174/employee-signup?token=${s.id}`}
                          target="_blank"
                        >
                          <IconExternalLink size={14} />
                        </ActionIcon>
                        <ActionIcon variant="light" color="red" size="sm" onClick={() => handleDeleteOnboarding(s.id)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Tabs.Panel>
      </Tabs>

      {/* Add Repository Modal */}
      <Modal opened={repoModalOpen} onClose={() => setRepoModalOpen(false)} title="Add Repository" size="md">
        <Stack>
          <TextInput label="Repository Name" placeholder="my-awesome-project"
            value={newRepo.name} onChange={(e) => setNewRepo((p) => ({ ...p, name: e.target.value }))} required />
          <TextInput label="Repository URL" placeholder="https://github.com/username/repo.git"
            value={newRepo.url} onChange={(e) => setNewRepo((p) => ({ ...p, url: e.target.value }))} required />
          <Textarea label="Description" placeholder="Brief description..."
            value={newRepo.description} onChange={(e) => setNewRepo((p) => ({ ...p, description: e.target.value }))} rows={3} />
          <Select label="Primary Language" placeholder="Select"
            data={languages} value={newRepo.language}
            onChange={(v) => setNewRepo((p) => ({ ...p, language: v || "" }))} />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setRepoModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRepository}>Add Repository</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Create Onboarding Modal */}
      <Modal opened={onboardingModalOpen} onClose={() => setOnboardingModalOpen(false)} title="Create Onboarding Session" size="lg">
        <Stack>
          <TextInput
            label="Employee Email"
            placeholder="employee@company.com"
            value={newOnboarding.email}
            onChange={(e) => setNewOnboarding((p) => ({ ...p, email: e.target.value }))}
            required
            leftSection={<IconMail size={16} />}
          />

          <Select
            label="Role"
            placeholder="Select role"
            data={roles}
            value={newOnboarding.role}
            onChange={(v) => setNewOnboarding((p) => ({ ...p, role: v || "" }))}
            required
            leftSection={<IconCode size={16} />}
          />

          {/* IMPORTANT: store repo IDs, not names */}
          <MultiSelect
            label="Repositories"
            placeholder="Select repositories for onboarding"
            data={repositories.map((repo) => ({ value: repo.id, label: repo.name }))}
            value={newOnboarding.repositories}
            onChange={(value) => setNewOnboarding((p) => ({ ...p, repositories: value }))}
            required
            leftSection={<IconGitBranch size={16} />}
          />

          <Textarea
            label="Custom Instructions (Optional)"
            placeholder="Any specific instructions..."
            value={newOnboarding.customInstructions}
            onChange={(e) => setNewOnboarding((p) => ({ ...p, customInstructions: e.target.value }))}
            rows={4}
          />

          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            An email will be sent to the employee with a personalized signup link.
          </Alert>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setOnboardingModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOnboarding}>Create Onboarding</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}