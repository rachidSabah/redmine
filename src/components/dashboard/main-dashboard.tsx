"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ChatbotWidget } from "@/components/chatbot/chatbot-widget";
import { EducationDashboard } from "@/components/education/education-dashboard";
import {
  LayoutDashboard,
  FolderKanban,
  Kanban,
  Calendar as CalendarIcon,
  MessageSquare,
  Settings,
  Moon,
  Sun,
  Shield,
  LogOut,
  User,
  RefreshCw,
  Menu,
  Trash2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Paperclip,
  BookOpen,
  HardDrive,
  Edit,
  Archive,
  Play,
  Zap,
  Map,
  Timer,
  BarChart3,
  Layers,
  FileText,
  Upload,
  MoreHorizontal,
  Activity,
  Flag,
  PieChart,
  GanttChart,
  Users,
  X,
  Download,
  ExternalLink,
  GraduationCap,
} from "lucide-react";
import { format, isSameDay } from "date-fns";

interface Project {
  id: string;
  name: string;
  key: string;
  description?: string;
  color?: string;
  progress: number;
  isActive?: boolean;
  isArchived?: boolean;
  _count?: { tickets: number; members: number };
}

interface Ticket {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  description?: string;
  dueDate?: string | null;
  assignee?: { name: string } | null;
  projectId: string;
  estimatedHours?: number;
  componentId?: string;
}

interface ComponentItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
  _count?: { tickets: number };
}

interface WorkloadProfile {
  id: string | null;
  userId: string;
  weeklyCapacity: number;
  user: { id: string; name: string | null; email: string; image?: string | null };
  assignedTickets: number;
  totalEstimatedHours: number;
  loggedThisWeek: number;
  utilization: number;
}

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  actionType: string;
  isActive: boolean;
  executionCount: number;
}

interface RoadmapItem {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  milestones: { id: string; title: string; dueDate: string; isCompleted: boolean }[];
}

interface CustomField {
  id: string;
  name: string;
  key: string;
  type: string;
  required: boolean;
}

interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  project?: { id: string; name: string; key: string };
  tickets?: { id: string; key: string; title: string; status: string; storyPoints?: number | null }[];
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user?: { id: string; name: string | null; email: string; image?: string | null };
  ticket?: { id: string; key: string; title: string } | null;
}

interface ReportData {
  summary: {
    totalProjects: number;
    totalTickets: number;
    completedTickets: number;
    pendingTickets: number;
    completionRate: number;
    avgResolutionTime: number;
    totalTimeLogged: number;
  };
  ticketsByStatus: { status: string; count: number }[];
  ticketsByPriority: { priority: string; count: number }[];
  ticketsPerWeek: { week: string; count: number; completed: number }[];
  teamActivity: { user?: { id: string; name: string | null; email: string; image?: string | null }; activityCount: number }[];
  projectProgress: { id: string; name: string; key: string; progress: number }[];
}

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed for mobile
  const [activeView, setActiveView] = useState("dashboard");

  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [workloadProfiles, setWorkloadProfiles] = useState<WorkloadProfile[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapItem[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [projectAttachments, setProjectAttachments] = useState<Attachment[]>([]);

  const projectFileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());

  // Dialog states
  const [projectDialog, setProjectDialog] = useState(false);
  const [ticketDialog, setTicketDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editProjectDialog, setEditProjectDialog] = useState(false);
  const [componentDialog, setComponentDialog] = useState(false);
  const [timeLogDialog, setTimeLogDialog] = useState(false);
  const [roadmapDialog, setRoadmapDialog] = useState(false);
  const [automationDialog, setAutomationDialog] = useState(false);
  const [customFieldDialog, setCustomFieldDialog] = useState(false);
  const [sprintDialog, setSprintDialog] = useState(false);
  const [projectDetailDialog, setProjectDetailDialog] = useState(false);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<Project | null>(null);

  // Form states
  const [projectForm, setProjectForm] = useState({ 
    name: "", key: "", description: "", color: "#3B82F6",
    startDate: "", endDate: ""
  });
  const [ticketForm, setTicketForm] = useState({ 
    title: "", description: "", priority: "MEDIUM", projectId: "",
    estimatedHours: 0, componentId: "", dueDate: ""
  });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "project" | "ticket"; id: string } | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [componentForm, setComponentForm] = useState({ name: "", description: "", color: "#3B82F6", projectId: "" });
  const [timeLogForm, setTimeLogForm] = useState({ hours: 1, description: "", ticketId: "" });
  const [roadmapForm, setRoadmapForm] = useState({ name: "", description: "", projectId: "", startDate: "", endDate: "" });
  const [automationForm, setAutomationForm] = useState({ name: "", description: "", triggerType: "ticket_created", actionType: "send_email", projectId: "" });
  const [customFieldForm, setCustomFieldForm] = useState({ name: "", type: "text", required: false });
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [projectFiles, setProjectFiles] = useState<File[]>([]);
  const [sprintForm, setSprintForm] = useState({ name: "", goal: "", projectId: "", startDate: "", endDate: "" });

  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTickets: 0,
    completedTickets: 0,
    pendingTickets: 0,
  });

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!session?.user) return;

    try {
      setLoading(true);

      // Fetch projects
      const projectsRes = await fetch("/api/projects");
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }

      // Fetch tickets
      const ticketsRes = await fetch("/api/tickets");
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData.tickets || []);
        setStats((prev) => ({
          ...prev,
          totalTickets: ticketsData.tickets?.length || 0,
          completedTickets: ticketsData.tickets?.filter((t: Ticket) => t.status === "DONE").length || 0,
          pendingTickets: ticketsData.tickets?.filter((t: Ticket) => t.status !== "DONE").length || 0,
        }));
      }

      // Fetch workload
      try {
        const workloadRes = await fetch("/api/workload");
        if (workloadRes.ok) {
          const workloadData = await workloadRes.json();
          setWorkloadProfiles(workloadData.profiles || []);
        }
      } catch (e) { console.error("Workload fetch error:", e); }

      // Fetch automation rules
      try {
        const automationRes = await fetch("/api/automation");
        if (automationRes.ok) {
          const automationData = await automationRes.json();
          setAutomationRules(automationData.rules || []);
        }
      } catch (e) { console.error("Automation fetch error:", e); }

      // Fetch roadmaps
      try {
        const roadmapRes = await fetch("/api/roadmap");
        if (roadmapRes.ok) {
          const roadmapData = await roadmapRes.json();
          setRoadmaps(roadmapData.roadmaps || []);
        }
      } catch (e) { console.error("Roadmap fetch error:", e); }

      // Fetch custom fields
      try {
        const customFieldsRes = await fetch("/api/custom-fields");
        if (customFieldsRes.ok) {
          const customFieldsData = await customFieldsRes.json();
          setCustomFields(customFieldsData.customFields || []);
        }
      } catch (e) { console.error("Custom fields fetch error:", e); }

      // Fetch sprints
      try {
        const sprintsRes = await fetch("/api/sprints");
        if (sprintsRes.ok) {
          const sprintsData = await sprintsRes.json();
          setSprints(sprintsData.sprints || []);
        }
      } catch (e) { console.error("Sprints fetch error:", e); }

      // Fetch activities
      try {
        const activitiesRes = await fetch("/api/activities");
        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setActivities(activitiesData.activities || []);
        }
      } catch (e) { console.error("Activities fetch error:", e); }

      // Fetch reports
      try {
        const reportsRes = await fetch("/api/reports");
        if (reportsRes.ok) {
          const reportsData = await reportsRes.json();
          setReportData(reportsData);
        }
      } catch (e) { console.error("Reports fetch error:", e); }

    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session, toast]);

  // Fetch components for selected project
  const fetchComponents = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/components?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setComponents(data.components || []);
      }
    } catch (e) {
      console.error("Failed to fetch components:", e);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session, fetchData]);

  // File upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFiles(prev => [...prev, ...Array.from(files)]);
      toast({ title: "Files selected", description: `${files.length} file(s) ready to upload` });
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload files to server
  const uploadFiles = async (projectId: string, ticketId?: string) => {
    for (const file of uploadedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      if (projectId) formData.append("projectId", projectId);
      if (ticketId) formData.append("ticketId", ticketId);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          console.error("Failed to upload file:", file.name);
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }
    setUploadedFiles([]);
  };

  // Create project
  const handleCreateProject = async () => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Project created successfully" });
        setProjectDialog(false);
        setProjectForm({ name: "", key: "", description: "", color: "#3B82F6", startDate: "", endDate: "" });
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create project", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create project", variant: "destructive" });
    }
  };

  // Update project
  const handleUpdateProject = async () => {
    if (!editingProject) return;
    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingProject.id, ...projectForm }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Project updated successfully" });
        setEditProjectDialog(false);
        setEditingProject(null);
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to update project", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update project", variant: "destructive" });
    }
  };

  // Archive project
  const handleArchiveProject = async (projectId: string, archive: boolean) => {
    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, isActive: !archive }),
      });

      if (res.ok) {
        toast({ title: "Success", description: archive ? "Project archived" : "Project restored" });
        fetchData();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update project", variant: "destructive" });
    }
  };

  // Create ticket
  const handleCreateTicket = async () => {
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ticketForm.title,
          description: ticketForm.description,
          priority: ticketForm.priority,
          projectId: ticketForm.projectId,
          estimatedHours: ticketForm.estimatedHours || undefined,
          dueDate: ticketForm.dueDate || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Upload any pending files
        if (uploadedFiles.length > 0) {
          await uploadFiles(ticketForm.projectId, data.ticket?.id);
        }
        
        toast({ title: "Success", description: "Ticket created successfully" });
        setTicketDialog(false);
        setTicketForm({ title: "", description: "", priority: "MEDIUM", projectId: "", estimatedHours: 0, componentId: "", dueDate: "" });
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create ticket", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create ticket", variant: "destructive" });
    }
  };

  // Create component
  const handleCreateComponent = async () => {
    try {
      const res = await fetch("/api/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(componentForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Component created successfully" });
        setComponentDialog(false);
        setComponentForm({ name: "", description: "", color: "#3B82F6", projectId: "" });
        if (componentForm.projectId) {
          fetchComponents(componentForm.projectId);
        }
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create component", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create component", variant: "destructive" });
    }
  };

  // Log time
  const handleLogTime = async () => {
    try {
      const res = await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(timeLogForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Time logged successfully" });
        setTimeLogDialog(false);
        setTimeLogForm({ hours: 1, description: "", ticketId: "" });
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to log time", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to log time", variant: "destructive" });
    }
  };

  // Create roadmap
  const handleCreateRoadmap = async () => {
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roadmapForm.name,
          description: roadmapForm.description,
          projectId: roadmapForm.projectId || undefined,
          startDate: roadmapForm.startDate,
          endDate: roadmapForm.endDate,
        }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Roadmap created successfully" });
        setRoadmapDialog(false);
        setRoadmapForm({ name: "", description: "", projectId: "", startDate: "", endDate: "" });
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create roadmap", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create roadmap", variant: "destructive" });
    }
  };

  // Create automation rule
  const handleCreateAutomation = async () => {
    try {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(automationForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Automation rule created" });
        setAutomationDialog(false);
        setAutomationForm({ name: "", description: "", triggerType: "ticket_created", actionType: "send_email", projectId: "" });
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create rule", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create rule", variant: "destructive" });
    }
  };

  // Create custom field
  const handleCreateCustomField = async () => {
    try {
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customFieldForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Custom field created" });
        setCustomFieldDialog(false);
        setCustomFieldForm({ name: "", type: "text", required: false });
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create field", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create field", variant: "destructive" });
    }
  };

  // Delete item
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const endpoint = deleteTarget.type === "project" ? `/api/projects/${deleteTarget.id}` : `/api/tickets/${deleteTarget.id}`;
      const res = await fetch(endpoint, { method: "DELETE" });

      if (res.ok) {
        toast({ title: "Success", description: `${deleteTarget.type} deleted successfully` });
        setDeleteDialog(false);
        setDeleteTarget(null);
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  // Update ticket status
  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  // Close sidebar on mobile when clicking outside or navigating
  const handleNavClick = (viewId: string) => {
    setActiveView(viewId);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "kanban", label: "Kanban Board", icon: Kanban },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "workload", label: "Workload", icon: BarChart3 },
    { id: "components", label: "Components", icon: Layers },
    { id: "roadmap", label: "Roadmap", icon: Map },
    { id: "automation", label: "Automation", icon: Zap },
    { id: "timetrack", label: "Time Tracking", icon: Timer },
    { id: "customfields", label: "Custom Fields", icon: FileText },
  ];

  const linkItems = [
    { id: "wiki", label: "Wiki", icon: BookOpen, path: "/wiki" },
    { id: "backup", label: "Backup", icon: HardDrive, path: "/backup" },
  ];

  const adminNavItems = [
    { id: "admin", label: "Admin Panel", icon: Shield, path: "/admin" },
    { id: "settings", label: "Settings", icon: Settings, path: "/profile" },
  ];

  const isAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  // Get tickets for selected calendar date
  const selectedDateTickets = tickets.filter((t) =>
    t.dueDate && calendarDate && isSameDay(new Date(t.dueDate), calendarDate)
  );

  // Group tickets by status for Kanban
  const kanbanGroups = {
    BACKLOG: tickets.filter((t) => t.status === "BACKLOG"),
    TODO: tickets.filter((t) => t.status === "TODO"),
    IN_PROGRESS: tickets.filter((t) => t.status === "IN_PROGRESS"),
    IN_REVIEW: tickets.filter((t) => t.status === "IN_REVIEW"),
    DONE: tickets.filter((t) => t.status === "DONE"),
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-card border-r transition-all duration-300",
          "md:relative md:translate-x-0",
          sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:w-16 md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-4">
            {sidebarOpen ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">Synchro PM</span>
              </div>
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
                <FolderKanban className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
                    activeView === item.id && "bg-accent text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className={cn(
                    "whitespace-nowrap transition-opacity",
                    sidebarOpen ? "opacity-100" : "opacity-0 hidden md:hidden"
                  )}>{item.label}</span>
                </button>
              ))}

              <div className="my-4 border-t" />
              
              {linkItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    router.push(item.path);
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent"
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className={cn(
                    "whitespace-nowrap transition-opacity",
                    sidebarOpen ? "opacity-100" : "opacity-0 hidden md:hidden"
                  )}>{item.label}</span>
                </button>
              ))}

              {isAdmin && (
                <>
                  <div className="my-4 border-t" />
                  {adminNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        router.push(item.path);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className={cn(
                        "whitespace-nowrap transition-opacity",
                        sidebarOpen ? "opacity-100" : "opacity-0 hidden md:hidden"
                      )}>{item.label}</span>
                    </button>
                  ))}
                </>
              )}
            </nav>
          </ScrollArea>

          <div className="border-t p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {sidebarOpen && <span className="ml-2">{theme === "dark" ? "Light" : "Dark"} Mode</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300 w-full",
          "md:ml-16",
          sidebarOpen && "md:ml-64"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-full items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold capitalize">{activeView.replace(/([A-Z])/g, ' $1')}</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {session.user.name?.split(" ")[0] || "User"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant={isAdmin ? "default" : "secondary"}>
                {session.user.role}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.image || undefined} />
                      <AvatarFallback>
                        {session.user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{session.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {session.user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => router.push("/admin")}>
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    className="text-red-500"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Dashboard View */}
              {activeView === "dashboard" && (
                <>
                  <div className="flex gap-4 mb-6 flex-wrap">
                    <Button onClick={() => setProjectDialog(true)}>
                      <FolderKanban className="mr-2 h-4 w-4" />
                      New Project
                    </Button>
                    <Button variant="outline" onClick={() => setTicketDialog(true)}>
                      <Paperclip className="mr-2 h-4 w-4" />
                      New Ticket
                    </Button>
                    <Button variant="ghost" onClick={fetchData}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{projects.length}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTickets}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.completedTickets}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingTickets}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Projects */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Projects</CardTitle>
                      <CardDescription>Manage your projects</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {projects.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No projects yet. Create your first project.</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {projects.map((project) => (
                            <Card key={project.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="h-3 w-3 rounded"
                                      style={{ backgroundColor: project.color || "#3B82F6" }}
                                    />
                                    <span className="font-medium">{project.name}</span>
                                    {!project.isActive && (
                                      <Badge variant="secondary" className="text-xs">Archived</Badge>
                                    )}
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => {
                                        setEditingProject(project);
                                        setProjectForm({
                                          name: project.name,
                                          key: project.key,
                                          description: project.description || "",
                                          color: project.color || "#3B82F6",
                                          startDate: "",
                                          endDate: "",
                                        });
                                        setEditProjectDialog(true);
                                      }}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleArchiveProject(project.id, project.isActive !== false)}>
                                        {project.isActive === false ? (
                                          <>
                                            <Play className="mr-2 h-4 w-4" />
                                            Restore
                                          </>
                                        ) : (
                                          <>
                                            <Archive className="mr-2 h-4 w-4" />
                                            Archive
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => {
                                          setDeleteTarget({ type: "project", id: project.id });
                                          setDeleteDialog(true);
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{project.key}</p>
                                <Progress value={project.progress} className="h-2 mb-2" />
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{project.progress}% complete</span>
                                  <span>{project._count?.tickets || 0} tickets</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Tickets */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Tickets</CardTitle>
                      <CardDescription>View and manage tickets</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {tickets.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No tickets yet. Create your first ticket.</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-2">
                            {tickets.slice(0, 10).map((ticket) => (
                              <div
                                key={ticket.id}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {ticket.key}
                                  </span>
                                  <span className="font-medium">{ticket.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={
                                      ticket.priority === "HIGH"
                                        ? "border-red-500 text-red-500"
                                        : ticket.priority === "MEDIUM"
                                        ? "border-yellow-500 text-yellow-500"
                                        : "border-green-500 text-green-500"
                                    }
                                  >
                                    {ticket.priority}
                                  </Badge>
                                  <Badge variant="secondary">{ticket.status}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Education View */}
              {activeView === "education" && (
                <EducationDashboard />
              )}

              {/* Projects View */}
              {activeView === "projects" && (
                <Card>
                  <CardHeader>
                    <CardTitle>All Projects</CardTitle>
                    <CardDescription>Manage and view all your projects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {projects.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <FolderKanban className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">No projects yet</p>
                        <Button onClick={() => setProjectDialog(true)}>Create Project</Button>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                          <Card key={project.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div
                                  className="h-4 w-4 rounded"
                                  style={{ backgroundColor: project.color || "#3B82F6" }}
                                />
                                <span className="font-medium">{project.name}</span>
                                {!project.isActive && (
                                  <Badge variant="secondary">Archived</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{project.description || project.key}</p>
                              <Progress value={project.progress} className="h-2 mb-3" />
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{project.progress}% complete</span>
                                <span>{project._count?.tickets || 0} tickets</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Kanban View */}
              {activeView === "kanban" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Kanban Board</CardTitle>
                    <CardDescription>Drag and drop tickets to update status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-5 sm:gap-4 sm:overflow-visible">
                      {Object.entries(kanbanGroups).map(([status, statusTickets]) => (
                        <div key={status} className="bg-muted/30 rounded-lg p-3 min-w-[260px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    status === "BACKLOG" ? "#6B7280" :
                                    status === "TODO" ? "#3B82F6" :
                                    status === "IN_PROGRESS" ? "#F59E0B" :
                                    status === "IN_REVIEW" ? "#8B5CF6" : "#10B981"
                                }}
                              />
                              <span className="font-medium text-sm capitalize">{status.replace("_", " ").toLowerCase()}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">{statusTickets.length}</Badge>
                          </div>
                          <ScrollArea className="h-[300px] sm:h-[400px]">
                            <div className="space-y-2">
                              {statusTickets.map((ticket) => (
                                <div
                                  key={ticket.id}
                                  className="bg-card border rounded-lg p-3 hover:shadow-md transition-shadow"
                                >
                                  <p className="text-sm font-medium mb-2 line-clamp-2">{ticket.title}</p>
                                  <Badge
                                    variant="outline"
                                    className={
                                      ticket.priority === "HIGH"
                                        ? "border-red-500 text-red-500"
                                        : ticket.priority === "MEDIUM"
                                        ? "border-yellow-500 text-yellow-500"
                                        : "border-green-500 text-green-500"
                                    }
                                  >
                                    {ticket.priority}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Workload View */}
              {activeView === "workload" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Team Workload</CardTitle>
                    <CardDescription>Monitor team capacity and workload distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {workloadProfiles.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>No team members found</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {workloadProfiles.map((profile) => (
                          <Card key={profile.userId}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-4">
                                <Avatar>
                                  <AvatarImage src={profile.user.image || undefined} />
                                  <AvatarFallback>
                                    {profile.user.name?.charAt(0).toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{profile.user.name}</p>
                                  <p className="text-xs text-muted-foreground">{profile.user.email}</p>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Capacity</span>
                                  <span>{profile.weeklyCapacity}h/week</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Assigned</span>
                                  <span>{profile.assignedTickets} tickets</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Utilization</span>
                                  <span className={profile.utilization > 100 ? "text-red-500" : "text-green-500"}>
                                    {profile.utilization}%
                                  </span>
                                </div>
                                <Progress value={Math.min(profile.utilization, 100)} className="h-2" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Components View */}
              {activeView === "components" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Components</CardTitle>
                    <CardDescription>Manage project components</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Select value={selectedProject} onValueChange={(v) => {
                        setSelectedProject(v);
                        fetchComponents(v);
                      }}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!selectedProject ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <Layers className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>Select a project to view components</p>
                      </div>
                    ) : components.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <Layers className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">No components for this project</p>
                        <Button onClick={() => {
                          setComponentForm(prev => ({ ...prev, projectId: selectedProject }));
                          setComponentDialog(true);
                        }}>Create Component</Button>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {components.map((component) => (
                          <Card key={component.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-2">
                                <div
                                  className="h-3 w-3 rounded"
                                  style={{ backgroundColor: component.color || "#3B82F6" }}
                                />
                                <span className="font-medium">{component.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{component.description || "No description"}</p>
                              <Badge variant="secondary" className="mt-2">{component._count?.tickets || 0} tickets</Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Roadmap View */}
              {activeView === "roadmap" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Roadmaps</CardTitle>
                      <CardDescription>Plan and track your project milestones</CardDescription>
                    </div>
                    <Button onClick={() => setRoadmapDialog(true)}>
                      New Roadmap
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {roadmaps.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <Map className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">No roadmaps yet</p>
                        <Button onClick={() => setRoadmapDialog(true)}>Create Roadmap</Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {roadmaps.map((roadmap) => (
                          <Card key={roadmap.id}>
                            <CardHeader>
                              <CardTitle className="text-lg">{roadmap.name}</CardTitle>
                              <CardDescription>
                                {format(new Date(roadmap.startDate), "MMM d")} - {format(new Date(roadmap.endDate), "MMM d, yyyy")}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {roadmap.milestones.map((milestone) => (
                                  <div key={milestone.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                                    <div className={`h-2 w-2 rounded-full ${milestone.isCompleted ? "bg-green-500" : "bg-primary"}`} />
                                    <span className="flex-1">{milestone.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(milestone.dueDate), "MMM d")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Automation View */}
              {activeView === "automation" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Automation Rules</CardTitle>
                      <CardDescription>Automate your workflow</CardDescription>
                    </div>
                    <Button onClick={() => setAutomationDialog(true)}>
                      New Rule
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {automationRules.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <Zap className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">No automation rules yet</p>
                        <Button onClick={() => setAutomationDialog(true)}>Create Rule</Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {automationRules.map((rule) => (
                          <div key={rule.id} className="flex items-center justify-between p-4 rounded-lg border">
                            <div className="flex items-center gap-4">
                              <Zap className={`h-5 w-5 ${rule.isActive ? "text-yellow-500" : "text-muted-foreground"}`} />
                              <div>
                                <p className="font-medium">{rule.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {rule.triggerType} → {rule.actionType}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">Ran {rule.executionCount} times</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Time Tracking View */}
              {activeView === "timetrack" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Time Tracking</CardTitle>
                    <CardDescription>Log and track time spent on tickets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="font-medium mb-4">Log Time</h3>
                        <div className="space-y-4">
                          <Select value={timeLogForm.ticketId} onValueChange={(v) => setTimeLogForm(prev => ({ ...prev, ticketId: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ticket" />
                            </SelectTrigger>
                            <SelectContent>
                              {tickets.map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.key} - {t.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div>
                            <Label>Hours</Label>
                            <Input 
                              type="number" 
                              value={timeLogForm.hours} 
                              onChange={(e) => setTimeLogForm(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                              min={0.5}
                              step={0.5}
                            />
                          </div>
                          <Textarea
                            placeholder="Description (optional)"
                            value={timeLogForm.description}
                            onChange={(e) => setTimeLogForm(prev => ({ ...prev, description: e.target.value }))}
                          />
                          <Button onClick={handleLogTime} disabled={!timeLogForm.ticketId}>
                            Log Time
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Custom Fields View */}
              {activeView === "customfields" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Custom Fields</CardTitle>
                      <CardDescription>Define custom fields for tickets</CardDescription>
                    </div>
                    <Button onClick={() => setCustomFieldDialog(true)}>
                      New Field
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {customFields.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">No custom fields defined</p>
                        <Button onClick={() => setCustomFieldDialog(true)}>Create Field</Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {customFields.map((field) => (
                          <div key={field.id} className="flex items-center justify-between p-4 rounded-lg border">
                            <div className="flex items-center gap-4">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{field.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Type: {field.type} | Key: {field.key}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {field.required && <Badge variant="secondary">Required</Badge>}
                              <Badge>{field.type}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Calendar View */}
              {activeView === "calendar" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Calendar</CardTitle>
                    <CardDescription>View ticket deadlines and milestones</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Calendar
                        mode="single"
                        selected={calendarDate}
                        onSelect={setCalendarDate}
                        className="rounded-md border"
                      />
                      <div>
                        <h3 className="font-medium mb-4">
                          {calendarDate ? format(calendarDate, "EEEE, MMMM d, yyyy") : "Select a date"}
                        </h3>
                        {selectedDateTickets.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No tickets due on this date</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedDateTickets.map((ticket) => (
                              <div key={ticket.id} className="p-3 rounded-lg border">
                                <span className="text-xs font-mono text-muted-foreground">{ticket.key}</span>
                                <p className="font-medium">{ticket.title}</p>
                                <Badge variant="secondary" className="mt-1">{ticket.status}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        <ChatbotWidget />

        {/* Project Dialog */}
        <Dialog open={projectDialog} onOpenChange={setProjectDialog}>
          <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Add a new project to your workspace</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="Project name"
                />
              </div>
              <div>
                <Label>Key</Label>
                <Input
                  value={projectForm.key}
                  onChange={(e) => setProjectForm({ ...projectForm, key: e.target.value.toUpperCase().slice(0, 4) })}
                  placeholder="KEY"
                  maxLength={4}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Project description"
                />
              </div>
              <div>
                <Label>Color</Label>
                <Input
                  type="color"
                  value={projectForm.color}
                  onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProjectDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateProject} disabled={!projectForm.name || !projectForm.key}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog open={editProjectDialog} onOpenChange={setEditProjectDialog}>
          <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Update project details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Key</Label>
                <Input
                  value={projectForm.key}
                  onChange={(e) => setProjectForm({ ...projectForm, key: e.target.value.toUpperCase().slice(0, 4) })}
                  maxLength={4}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Color</Label>
                <Input
                  type="color"
                  value={projectForm.color}
                  onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditProjectDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdateProject}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ticket Dialog */}
        <Dialog open={ticketDialog} onOpenChange={setTicketDialog}>
          <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Ticket</DialogTitle>
              <DialogDescription>Add a new ticket to your project</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Project</Label>
                <Select value={ticketForm.projectId} onValueChange={(v) => {
                  setTicketForm({ ...ticketForm, projectId: v });
                  fetchComponents(v);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  placeholder="Ticket title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  placeholder="Ticket description"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={ticketForm.priority} onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOWEST">Lowest</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estimated Hours</Label>
                  <Input
                    type="number"
                    value={ticketForm.estimatedHours}
                    onChange={(e) => setTicketForm({ ...ticketForm, estimatedHours: parseFloat(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={ticketForm.dueDate}
                  onChange={(e) => setTicketForm({ ...ticketForm, dueDate: e.target.value })}
                />
              </div>
              {/* File Attachments */}
              <div>
                <Label>Attachments</Label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Select Files
                  </Button>
                  {uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.map((file, index) => (
                        <Badge key={index} variant="secondary">
                          {file.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setTicketDialog(false);
                setUploadedFiles([]);
              }}>Cancel</Button>
              <Button onClick={handleCreateTicket} disabled={!ticketForm.title || !ticketForm.projectId}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Component Dialog */}
        <Dialog open={componentDialog} onOpenChange={setComponentDialog}>
          <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Component</DialogTitle>
              <DialogDescription>Add a component to organize tickets</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={componentForm.name}
                  onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
                  placeholder="Component name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={componentForm.description}
                  onChange={(e) => setComponentForm({ ...componentForm, description: e.target.value })}
                  placeholder="Component description"
                />
              </div>
              <div>
                <Label>Color</Label>
                <Input
                  type="color"
                  value={componentForm.color}
                  onChange={(e) => setComponentForm({ ...componentForm, color: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setComponentDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateComponent} disabled={!componentForm.name}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Roadmap Dialog */}
        <Dialog open={roadmapDialog} onOpenChange={setRoadmapDialog}>
          <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Roadmap</DialogTitle>
              <DialogDescription>Plan your project timeline</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={roadmapForm.name}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, name: e.target.value })}
                  placeholder="Roadmap name"
                />
              </div>
              <div>
                <Label>Project (optional)</Label>
                <Select value={roadmapForm.projectId} onValueChange={(v) => setRoadmapForm({ ...roadmapForm, projectId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={roadmapForm.startDate}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={roadmapForm.endDate}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoadmapDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateRoadmap} disabled={!roadmapForm.name || !roadmapForm.startDate || !roadmapForm.endDate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Automation Dialog */}
        <Dialog open={automationDialog} onOpenChange={setAutomationDialog}>
          <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
              <DialogDescription>Automate your workflow</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Rule Name</Label>
                <Input
                  value={automationForm.name}
                  onChange={(e) => setAutomationForm({ ...automationForm, name: e.target.value })}
                  placeholder="e.g., Auto-assign high priority tickets"
                />
              </div>
              <div>
                <Label>Trigger</Label>
                <Select value={automationForm.triggerType} onValueChange={(v) => setAutomationForm({ ...automationForm, triggerType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ticket_created">Ticket Created</SelectItem>
                    <SelectItem value="ticket_updated">Ticket Updated</SelectItem>
                    <SelectItem value="ticket_assigned">Ticket Assigned</SelectItem>
                    <SelectItem value="status_changed">Status Changed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Action</Label>
                <Select value={automationForm.actionType} onValueChange={(v) => setAutomationForm({ ...automationForm, actionType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_email">Send Email</SelectItem>
                    <SelectItem value="update_field">Update Field</SelectItem>
                    <SelectItem value="assign_user">Assign User</SelectItem>
                    <SelectItem value="create_ticket">Create Ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAutomationDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateAutomation} disabled={!automationForm.name}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Field Dialog */}
        <Dialog open={customFieldDialog} onOpenChange={setCustomFieldDialog}>
          <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Custom Field</DialogTitle>
              <DialogDescription>Add a custom field to tickets</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Field Name</Label>
                <Input
                  value={customFieldForm.name}
                  onChange={(e) => setCustomFieldForm({ ...customFieldForm, name: e.target.value })}
                  placeholder="e.g., Customer Name"
                />
              </div>
              <div>
                <Label>Field Type</Label>
                <Select value={customFieldForm.type} onValueChange={(v) => setCustomFieldForm({ ...customFieldForm, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={customFieldForm.required}
                  onCheckedChange={(checked) => setCustomFieldForm({ ...customFieldForm, required: checked })}
                />
                <Label>Required field</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCustomFieldDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateCustomField} disabled={!customFieldForm.name}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this {deleteTarget?.type}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

export default DashboardContent;

// Named export for compatibility
export { DashboardContent as MainDashboard };
