import { useState, useEffect } from "react";
import {
  Container,
  Title,
  Paper,
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
  Notification,
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
  IconCheck,
  IconClock,
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
  repositories: string[];
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
  
  // Modal states
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  
  // Form states
  const [newRepo, setNewRepo] = useState({
    name: "",
    url: "",
    description: "",
    language: "",
  });
  
  const [newOnboarding, setNewOnboarding] = useState({
    email: "",
    role: "",
    repositories: [] as string[],
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

  // Mock data for demo
  useEffect(() => {
    loadRepositories();
    loadOnboardingSessions();
  }, []);

  const loadRepositories = async () => {
    try {
      const response = await fetch(`http://localhost:8001/repositories/${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        const repos = data.map((repo: any) => ({
          ...repo,
          lastSync: new Date(repo.lastSync * 1000 || repo.lastSync), // Handle timestamp conversion
        }));
        setRepositories(repos);
      }
    } catch (error) {
      console.error("Error loading repositories:", error);
      // Fallback to empty array
      setRepositories([]);
    }
  };

  const loadOnboardingSessions = async () => {
    try {
      const response = await fetch(`http://localhost:8001/onboarding-sessions/${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        const sessions = data.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt * 1000 || session.createdAt),
          completedAt: session.completedAt ? new Date(session.completedAt * 1000 || session.completedAt) : undefined,
        }));
        setOnboardingSessions(sessions);
      }
    } catch (error) {
      console.error("Error loading onboarding sessions:", error);
      // Fallback to empty array
      setOnboardingSessions([]);
    }
  };

  const handleAddRepository = async () => {
    if (!newRepo.name || !newRepo.url) return;

    try {
      const response = await fetch("http://localhost:8001/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRepo,
          adminUid: user.uid, // Include admin UID
        }),
      });

      if (response.ok) {
        const repository = await response.json();
        repository.lastSync = new Date(repository.lastSync);
        setRepositories(prev => [...prev, repository]);
        setNewRepo({ name: "", url: "", description: "", language: "" });
        setRepoModalOpen(false);
        
        // Simulate sync process
        setTimeout(() => {
          setRepositories(prev =>
            prev.map(r => (r.id === repository.id ? { ...r, status: "synced" } : r))
          );
        }, 3000);
      } else {
        throw new Error("Failed to create repository");
      }
    } catch (error) {
      console.error("Error creating repository:", error);
      alert("Failed to create repository. Please try again.");
    }
  };

  const handleCreateOnboarding = async () => {
    if (!newOnboarding.email || !newOnboarding.role || newOnboarding.repositories.length === 0) return;

    try {
      const response = await fetch("http://localhost:8001/onboarding-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newOnboarding,
          adminUid: user.uid, // Include admin UID
        }),
      });

      if (response.ok) {
        const session = await response.json();
        session.createdAt = new Date(session.createdAt);
        setOnboardingSessions(prev => [...prev, session]);
        setNewOnboarding({ email: "", role: "", repositories: [], customInstructions: "" });
        setOnboardingModalOpen(false);
        
        alert(`Onboarding session created! Email sent to ${session.email}`);
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create onboarding session");
      }
    } catch (error) {
      console.error("Error creating onboarding session:", error);
      alert("Failed to create onboarding session. Please try again.");
    }
  };

  const handleDeleteRepository = async (repoId: string) => {
    if (!confirm("Are you sure you want to delete this repository?")) return;

    try {
      const response = await fetch(`http://localhost:8001/repositories/${user.uid}/${repoId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRepositories(prev => prev.filter(r => r.id !== repoId));
      } else {
        throw new Error("Failed to delete repository");
      }
    } catch (error) {
      console.error("Error deleting repository:", error);
      alert("Failed to delete repository. Please try again.");
    }
  };

  const handleDeleteOnboarding = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this onboarding session?")) return;

    try {
      const response = await fetch(`http://localhost:8001/onboarding-sessions/${user.uid}/${sessionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setOnboardingSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        throw new Error("Failed to delete onboarding session");
      }
    } catch (error) {
      console.error("Error deleting onboarding session:", error);
      alert("Failed to delete onboarding session. Please try again.");
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

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Admin Dashboard</Title>
          <Text c="dimmed">Manage repositories and onboarding sessions</Text>
        </div>
        <Button
          variant="light"
          color="red"
          leftSection={<IconLogout size={16} />}
          onClick={() => signOut(auth)}
        >
          Logout
        </Button>
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

        <Tabs.Panel value="repositories" pt="md">
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={500}>Repository Management</Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setRepoModalOpen(true)}
            >
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

                  <Text size="sm" c="dimmed" mb="sm">
                    {repo.description}
                  </Text>

                  <Group justify="space-between" mb="md">
                    <Badge variant="outline">{repo.language}</Badge>
                    <Text size="xs" c="dimmed">
                      Last sync: {repo.lastSync.toLocaleString()}
                    </Text>
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
                    <ActionIcon 
                      variant="light" 
                      color="red"
                      onClick={() => handleDeleteRepository(repo.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="onboarding" pt="md">
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={500}>Onboarding Sessions</Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setOnboardingModalOpen(true)}
            >
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
                {onboardingSessions.map((session) => (
                  <Table.Tr key={session.id}>
                    <Table.Td>{session.email}</Table.Td>
                    <Table.Td>
                      <Badge variant="outline">{session.role}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {session.repositories.map((repoId) => {
                          const repo = repositories.find(r => r.id === repoId || r.name === repoId);
                          return (
                            <Badge key={repoId} size="sm" variant="light">
                              {repo?.name || repoId}
                            </Badge>
                          );
                        })}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(session.status)} variant="light">
                        {session.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Text size="sm">{session.progress}%</Text>
                        <div
                          style={{
                            width: 50,
                            height: 6,
                            backgroundColor: "#e9ecef",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${session.progress}%`,
                              height: "100%",
                              backgroundColor: session.progress === 100 ? "#51cf66" : "#339af0",
                            }}
                          />
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{session.createdAt.toLocaleDateString()}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="light" size="sm">
                          <IconExternalLink size={14} />
                        </ActionIcon>
                        <ActionIcon 
                          variant="light" 
                          color="red" 
                          size="sm"
                          onClick={() => handleDeleteOnboarding(session.id)}
                        >
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
      <Modal
        opened={repoModalOpen}
        onClose={() => setRepoModalOpen(false)}
        title="Add Repository"
        size="md"
      >
        <Stack>
          <TextInput
            label="Repository Name"
            placeholder="my-awesome-project"
            value={newRepo.name}
            onChange={(e) => setNewRepo(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          
          <TextInput
            label="Repository URL"
            placeholder="https://github.com/username/repo.git"
            value={newRepo.url}
            onChange={(e) => setNewRepo(prev => ({ ...prev, url: e.target.value }))}
            required
          />
          
          <Textarea
            label="Description"
            placeholder="Brief description of the project..."
            value={newRepo.description}
            onChange={(e) => setNewRepo(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
          
          <Select
            label="Primary Language"
            placeholder="Select primary language"
            data={languages}
            value={newRepo.language}
            onChange={(value) => setNewRepo(prev => ({ ...prev, language: value || "" }))}
          />
          
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setRepoModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRepository}>
              Add Repository
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Create Onboarding Modal */}
      <Modal
        opened={onboardingModalOpen}
        onClose={() => setOnboardingModalOpen(false)}
        title="Create Onboarding Session"
        size="lg"
      >
        <Stack>
          <TextInput
            label="Employee Email"
            placeholder="employee@company.com"
            value={newOnboarding.email}
            onChange={(e) => setNewOnboarding(prev => ({ ...prev, email: e.target.value }))}
            required
            leftSection={<IconMail size={16} />}
          />
          
          <Select
            label="Role"
            placeholder="Select role"
            data={roles}
            value={newOnboarding.role}
            onChange={(value) => setNewOnboarding(prev => ({ ...prev, role: value || "" }))}
            required
            leftSection={<IconCode size={16} />}
          />
          
          <MultiSelect
            label="Repositories"
            placeholder="Select repositories for onboarding"
            data={repositories.map(repo => ({ value: repo.name, label: repo.name }))}
            value={newOnboarding.repositories}
            onChange={(value) => setNewOnboarding(prev => ({ ...prev, repositories: value }))}
            required
            leftSection={<IconGitBranch size={16} />}
          />
          
          <Textarea
            label="Custom Instructions (Optional)"
            placeholder="Any specific instructions or focus areas for this onboarding..."
            value={newOnboarding.customInstructions}
            onChange={(e) => setNewOnboarding(prev => ({ ...prev, customInstructions: e.target.value }))}
            rows={4}
          />
          
          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            An email will be sent to the employee with a personalized onboarding link.
            The walkthrough will be tailored for their role and the selected repositories.
          </Alert>
          
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setOnboardingModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOnboarding}>
              Create Onboarding
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
