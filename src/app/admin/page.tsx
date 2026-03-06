"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  Building2,
  FolderKanban,
  RefreshCw,
  Plus,
  Search,
  Edit,
  Trash2,
  UserPlus,
  Settings,
  Database,
  Activity,
  ArrowLeft,
  Mail,
  MoreHorizontal,
  Archive,
  RotateCcw,
  Key,
  UserX,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Clock,
  HardDrive,
  Zap,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  memberships: Array<{
    role: string;
    organization: { name: string };
  }>;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  maxMembers: number;
  maxProjects: number;
  createdAt: string;
  _count?: {
    members: number;
    projects: number;
  };
}

interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  visibility: string;
  progress: number;
  isActive: boolean;
  createdAt: string;
  organization: { name: string };
  _count?: {
    tickets: number;
    members: number;
  };
}

interface Stats {
  users: { total: number; active: number; inactive: number; newLast30Days: number; growthPercent: number };
  organizations: { total: number; active: number };
  projects: { total: number; active: number };
  tickets: { total: number; open: number; completed: number; overdue: number; byStatus: Array<{ status: string; count: number }>; byPriority: Array<{ priority: string; count: number }> };
  storage: { totalBytes: number; totalMB: number };
  recentActivity: Array<any>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Dialog states
  const [userDialog, setUserDialog] = useState(false);
  const [orgDialog, setOrgDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  
  // Edit target
  const [editTarget, setEditTarget] = useState<{ type: "user" | "organization" | "project"; data: any } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "user" | "organization" | "project"; id: string; name: string } | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; email: string } | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "MEMBER", isActive: true });
  const [orgForm, setOrgForm] = useState({ name: "", slug: "", description: "", subscriptionPlan: "FREE" });
  const [projectForm, setProjectForm] = useState({ name: "", key: "", description: "", visibility: "PUBLIC" });
  const [bulkAction, setBulkAction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin panel.",
        variant: "destructive",
      });
      router.push("/");
    }
  }, [status, isAdmin, router, toast]);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;

    try {
      setLoading(true);

      const [usersRes, orgsRes, projectsRes, statsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/organizations"),
        fetch("/api/projects"),
        fetch("/api/admin/stats"),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }

      if (orgsRes.ok) {
        const data = await orgsRes.json();
        setOrganizations(data.organizations || []);
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data || null);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    if (session?.user && isAdmin) {
      fetchData();
    }
  }, [session, isAdmin, fetchData]);

  // CRUD Operations
  const handleCreateUser = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "User created successfully" });
        setUserDialog(false);
        setUserForm({ name: "", email: "", password: "", role: "MEMBER", isActive: true });
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create user", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create user", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrg = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Organization created successfully" });
        setOrgDialog(false);
        setOrgForm({ name: "", slug: "", description: "", subscriptionPlan: "FREE" });
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create organization", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create organization", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;

    try {
      setIsSubmitting(true);
      const endpoint = editTarget.type === "user"
        ? `/api/admin/users/${editTarget.data.id}`
        : editTarget.type === "organization"
        ? `/api/admin/organizations/${editTarget.data.id}`
        : `/api/projects/${editTarget.data.id}`;

      const body = editTarget.type === "user"
        ? { name: editTarget.data.name, email: editTarget.data.email, isActive: editTarget.data.isActive }
        : editTarget.type === "organization"
        ? { name: editTarget.data.name, description: editTarget.data.description }
        : { name: editTarget.data.name, description: editTarget.data.description };

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: "Success", description: `${editTarget.type} updated successfully` });
        setEditDialog(false);
        setEditTarget(null);
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to update", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsSubmitting(true);
      const endpoint = deleteTarget.type === "user"
        ? `/api/admin/users/${deleteTarget.id}`
        : deleteTarget.type === "organization"
        ? `/api/admin/organizations/${deleteTarget.id}`
        : `/api/projects/${deleteTarget.id}`;

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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedItems.size === 0) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: bulkAction,
          entityType: activeTab === "users" ? "users" : activeTab === "organizations" ? "organizations" : "projects",
          ids: Array.from(selectedItems),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({ title: "Success", description: `${data.affected} items ${bulkAction}d successfully` });
        setBulkDialog(false);
        setSelectedItems(new Set());
        setBulkAction("");
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to perform bulk action", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to perform bulk action", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordTarget) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/users/${resetPasswordTarget.id}/reset-password`, {
        method: "POST",
      });

      if (res.ok) {
        toast({ title: "Success", description: "Password reset email sent" });
        setResetPasswordDialog(false);
        setResetPasswordTarget(null);
      } else {
        toast({ title: "Error", description: "Failed to reset password", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to reset password", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectAll = (items: any[]) => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrgs = organizations.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground">Manage users, organizations, and projects</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <Shield className="h-3 w-3" />
              {session?.user?.role}
            </Badge>
            <Button variant="outline" onClick={() => router.push("/email-settings")}>
              <Mail className="mr-2 h-4 w-4" />
              Email Settings
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Overview */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users.total}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {stats.users.growthPercent >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={stats.users.growthPercent >= 0 ? "text-green-500" : "text-red-500"}>
                    {Math.abs(stats.users.growthPercent)}%
                  </span>
                  <span className="ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.organizations.total}</div>
                <p className="text-xs text-muted-foreground">{stats.organizations.active} active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.projects.total}</div>
                <p className="text-xs text-muted-foreground">{stats.projects.active} active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tickets</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tickets.total}</div>
                <p className="text-xs text-muted-foreground">{stats.tickets.open} open</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{stats.tickets.overdue}</div>
                <p className="text-xs text-muted-foreground">tickets overdue</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Storage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.storage.totalMB} MB</div>
                <p className="text-xs text-muted-foreground">used storage</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">
                <Users className="mr-2 h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="organizations">
                <Building2 className="mr-2 h-4 w-4" />
                Organizations
              </TabsTrigger>
              <TabsTrigger value="projects">
                <FolderKanban className="mr-2 h-4 w-4" />
                Projects
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <Button variant="outline" onClick={() => setBulkDialog(true)}>
                  <Zap className="mr-2 h-4 w-4" />
                  Bulk Action ({selectedItems.size})
                </Button>
              )}
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {activeTab === "users" && (
                <Button onClick={() => setUserDialog(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              )}
              {activeTab === "organizations" && (
                <Button onClick={() => setOrgDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Organization
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Content */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {stats?.recentActivity?.length ? (
                      <div className="space-y-3">
                        {stats.recentActivity.map((activity, i) => (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={activity.user?.image} />
                              <AvatarFallback>{activity.user?.name?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p><span className="font-medium">{activity.user?.name}</span> {activity.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(activity.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No recent activity
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Ticket Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Tickets by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats?.tickets?.byStatus?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={(item.count / stats.tickets.total) * 100} className="w-24" />
                          <span className="text-sm font-medium w-8">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.size === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={() => toggleSelectAll(filteredUsers)}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className={selectedItems.has(user.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(user.id)}
                            onCheckedChange={() => toggleSelect(user.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback>{user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.memberships[0]?.role === "OWNER" ? "default" : "secondary"}>
                            {user.memberships[0]?.role || "GUEST"}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.memberships[0]?.organization?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "destructive"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditTarget({ type: "user", data: user });
                                setEditDialog(true);
                              }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setResetPasswordTarget({ id: user.id, email: user.email });
                                setResetPasswordDialog(true);
                              }}>
                                <Key className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                // Toggle user status
                              }}>
                                {user.isActive ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setDeleteTarget({ type: "user", id: user.id, name: user.name || user.email });
                                  setDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organizations">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.size === filteredOrgs.length && filteredOrgs.length > 0}
                          onCheckedChange={() => toggleSelectAll(filteredOrgs)}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrgs.map((org) => (
                      <TableRow key={org.id} className={selectedItems.has(org.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(org.id)}
                            onCheckedChange={() => toggleSelect(org.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell className="font-mono text-sm">{org.slug}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{org.subscriptionPlan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.subscriptionStatus === "ACTIVE" ? "default" : "destructive"}>
                            {org.subscriptionStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{org._count?.members || 0}</TableCell>
                        <TableCell>{org._count?.projects || 0}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditTarget({ type: "organization", data: org });
                                setEditDialog(true);
                              }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setDeleteTarget({ type: "organization", id: org.id, name: org.name });
                                  setDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.size === filteredProjects.length && filteredProjects.length > 0}
                          onCheckedChange={() => toggleSelectAll(filteredProjects)}
                        />
                      </TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Tickets</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id} className={selectedItems.has(project.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(project.id)}
                            onCheckedChange={() => toggleSelect(project.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell className="font-mono text-sm">{project.key}</TableCell>
                        <TableCell>{project.organization?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{project.visibility}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={project.progress} className="w-16" />
                            <span className="text-sm">{project.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{project._count?.tickets || 0}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditTarget({ type: "project", data: project });
                                setEditDialog(true);
                              }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setDeleteTarget({ type: "project", id: project.id, name: project.name });
                                  setDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create User Dialog */}
      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="********"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={!userForm.email || !userForm.password || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Organization Dialog */}
      <Dialog open={orgDialog} onOpenChange={setOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>Add a new organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                placeholder="Acme Inc"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={orgForm.slug}
                onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })}
                placeholder="acme-inc"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={orgForm.description}
                onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                placeholder="Organization description..."
              />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={orgForm.subscriptionPlan} onValueChange={(v) => setOrgForm({ ...orgForm, subscriptionPlan: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="STARTER">Starter</SelectItem>
                  <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateOrg} disabled={!orgForm.name || !orgForm.slug || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editTarget?.type}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editTarget.data.name || ""}
                  onChange={(e) => setEditTarget({ ...editTarget, data: { ...editTarget.data, name: e.target.value } })}
                />
              </div>
              {editTarget.type === "user" && (
                <>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={editTarget.data.email || ""}
                      onChange={(e) => setEditTarget({ ...editTarget, data: { ...editTarget.data, email: e.target.value } })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={editTarget.data.isActive}
                      onCheckedChange={(checked) => setEditTarget({ ...editTarget, data: { ...editTarget.data, isActive: checked } })}
                    />
                    <Label>Active</Label>
                  </div>
                </>
              )}
              {editTarget.type !== "user" && (
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editTarget.data.description || ""}
                    onChange={(e) => setEditTarget({ ...editTarget, data: { ...editTarget.data, description: e.target.value } })}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Action</DialogTitle>
            <DialogDescription>
              Apply action to {selectedItems.size} selected items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activate">Activate</SelectItem>
                  <SelectItem value="deactivate">Deactivate</SelectItem>
                  <SelectItem value="archive">Archive</SelectItem>
                  <SelectItem value="restore">Restore</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkAction} disabled={!bulkAction || isSubmitting}>
              {isSubmitting ? "Processing..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Send a password reset email to {resetPasswordTarget?.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              Send Reset Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
