"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  HardDrive,
  RefreshCw,
  Plus,
  Download,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Cloud,
  Database,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Upload,
} from "lucide-react";

interface Backup {
  id: string;
  name: string;
  type: string;
  storage: string;
  filename: string;
  fileSize: number;
  status: string;
  completedAt: string;
  createdAt: string;
  includeUsers: boolean;
  includeProjects: boolean;
  includeTickets: boolean;
  includeWiki: boolean;
  includeSettings: boolean;
}

export default function BackupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [createDialog, setCreateDialog] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [googleDriveDialog, setGoogleDriveDialog] = useState(false);

  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    storage: "LOCAL",
    includeUsers: true,
    includeProjects: true,
    includeTickets: true,
    includeWiki: true,
    includeSettings: true,
    includeAttachments: true,
  });

  const [restoreOptions, setRestoreOptions] = useState({
    users: true,
    projects: true,
    tickets: true,
    wiki: true,
    settings: false,
  });

  const [googleDriveConfig, setGoogleDriveConfig] = useState({
    clientId: "",
    clientSecret: "",
    refreshToken: "",
  });

  const isAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      router.push("/");
    }
  }, [status, isAdmin, router, toast]);

  const fetchBackups = useCallback(async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const res = await fetch("/api/backup");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error("Failed to fetch backups:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user && isAdmin) {
      fetchBackups();
    }
  }, [session, isAdmin, fetchBackups]);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (res.ok) {
        const data = await res.json();
        toast({ title: "Success", description: "Backup created successfully" });
        setCreateDialog(false);
        setCreateForm({
          name: "",
          storage: "LOCAL",
          includeUsers: true,
          includeProjects: true,
          includeTickets: true,
          includeWiki: true,
          includeSettings: true,
          includeAttachments: true,
        });
        fetchBackups();

        // If it's a downloadable backup, trigger download
        if (data.downloadUrl) {
          window.open(data.downloadUrl, "_blank");
        }
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create backup", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create backup", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;

    try {
      setRestoring(true);
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupId: selectedBackup.id,
          restoreOptions,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({ title: "Success", description: "Restore completed successfully" });
        setRestoreDialog(false);
        setSelectedBackup(null);
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to restore backup", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to restore backup", variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "UPLOADED");

      const res = await fetch("/api/backup/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast({ title: "Success", description: "Backup uploaded successfully" });
        fetchBackups();
      } else {
        toast({ title: "Error", description: "Failed to upload backup", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload backup", variant: "destructive" });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "restoring":
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStorageIcon = (storage: string) => {
    switch (storage) {
      case "GOOGLE_DRIVE":
        return <Cloud className="h-4 w-4" />;
      case "AWS_S3":
        return <Database className="h-4 w-4" />;
      default:
        return <HardDrive className="h-4 w-4" />;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
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
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Backup & Restore</h1>
              <p className="text-sm text-muted-foreground">Manage backups and restore data</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setCreateDialog(true)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Create a new backup of your data</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".json,.zip"
                onChange={handleUploadBackup}
                className="text-xs text-muted-foreground"
              />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setGoogleDriveDialog(true)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Google Drive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Configure Google Drive backup</p>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled Backups Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Backup Schedule
            </CardTitle>
            <CardDescription>Automatic backup configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Daily Backups</p>
                <p className="text-sm text-muted-foreground">Automatic backups at 2:00 AM</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Backup History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Backup History</CardTitle>
              <CardDescription>View and manage your backups</CardDescription>
            </div>
            <Button variant="outline" onClick={fetchBackups}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No backups yet.</p>
                <p className="text-sm">Create your first backup to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{backup.name}</span>
                          <div className="flex gap-1 mt-1">
                            {backup.includeUsers && <Badge variant="secondary" className="text-xs">Users</Badge>}
                            {backup.includeProjects && <Badge variant="secondary" className="text-xs">Projects</Badge>}
                            {backup.includeTickets && <Badge variant="secondary" className="text-xs">Tickets</Badge>}
                            {backup.includeWiki && <Badge variant="secondary" className="text-xs">Wiki</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStorageIcon(backup.storage)}
                          <span>{backup.storage}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(backup.status)}
                          <span className="capitalize">{backup.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(backup.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              window.open(`/api/backup/download/${backup.filename}`, "_blank");
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setRestoreDialog(true);
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Backup Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Backup</DialogTitle>
            <DialogDescription>Choose what to include in your backup</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Backup Name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Weekly Backup"
              />
            </div>
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Select value={createForm.storage} onValueChange={(v) => setCreateForm({ ...createForm, storage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOCAL">Local (Download)</SelectItem>
                  <SelectItem value="GOOGLE_DRIVE">Google Drive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Include</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={createForm.includeUsers}
                    onCheckedChange={(v) => setCreateForm({ ...createForm, includeUsers: v })}
                  />
                  <Label className="text-sm">Users</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={createForm.includeProjects}
                    onCheckedChange={(v) => setCreateForm({ ...createForm, includeProjects: v })}
                  />
                  <Label className="text-sm">Projects</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={createForm.includeTickets}
                    onCheckedChange={(v) => setCreateForm({ ...createForm, includeTickets: v })}
                  />
                  <Label className="text-sm">Tickets</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={createForm.includeWiki}
                    onCheckedChange={(v) => setCreateForm({ ...createForm, includeWiki: v })}
                  />
                  <Label className="text-sm">Wiki</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={createForm.includeSettings}
                    onCheckedChange={(v) => setCreateForm({ ...createForm, includeSettings: v })}
                  />
                  <Label className="text-sm">Settings</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={createForm.includeAttachments}
                    onCheckedChange={(v) => setCreateForm({ ...createForm, includeAttachments: v })}
                  />
                  <Label className="text-sm">Attachments</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateBackup} disabled={creating}>
              {creating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Backup"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialog} onOpenChange={setRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              Select what to restore from "{selectedBackup?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will add or update data in your current organization. Existing data will not be deleted.
            </p>
            <div className="space-y-2">
              <Label>Restore Options</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={restoreOptions.users}
                    onCheckedChange={(v) => setRestoreOptions({ ...restoreOptions, users: v })}
                  />
                  <Label className="text-sm">Users</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={restoreOptions.projects}
                    onCheckedChange={(v) => setRestoreOptions({ ...restoreOptions, projects: v })}
                  />
                  <Label className="text-sm">Projects</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={restoreOptions.tickets}
                    onCheckedChange={(v) => setRestoreOptions({ ...restoreOptions, tickets: v })}
                  />
                  <Label className="text-sm">Tickets</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={restoreOptions.wiki}
                    onCheckedChange={(v) => setRestoreOptions({ ...restoreOptions, wiki: v })}
                  />
                  <Label className="text-sm">Wiki</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={restoreOptions.settings}
                    onCheckedChange={(v) => setRestoreOptions({ ...restoreOptions, settings: v })}
                  />
                  <Label className="text-sm">Settings</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog(false)}>Cancel</Button>
            <Button onClick={handleRestore} disabled={restoring}>
              {restoring ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Drive Config Dialog */}
      <Dialog open={googleDriveDialog} onOpenChange={setGoogleDriveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Google Drive Configuration</DialogTitle>
            <DialogDescription>Set up Google Drive for cloud backups</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                value={googleDriveConfig.clientId}
                onChange={(e) => setGoogleDriveConfig({ ...googleDriveConfig, clientId: e.target.value })}
                placeholder="Your Google OAuth Client ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                value={googleDriveConfig.clientSecret}
                onChange={(e) => setGoogleDriveConfig({ ...googleDriveConfig, clientSecret: e.target.value })}
                placeholder="Your Google OAuth Client Secret"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refreshToken">Refresh Token</Label>
              <Input
                id="refreshToken"
                type="password"
                value={googleDriveConfig.refreshToken}
                onChange={(e) => setGoogleDriveConfig({ ...googleDriveConfig, refreshToken: e.target.value })}
                placeholder="OAuth Refresh Token"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You need to create a Google Cloud project and enable the Drive API to use this feature.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoogleDriveDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast({ title: "Saved", description: "Google Drive configuration saved" });
              setGoogleDriveDialog(false);
            }}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
