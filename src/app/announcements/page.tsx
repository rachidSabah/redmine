"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useToast } from "@/hooks/use-toast";
import {
  Megaphone,
  Plus,
  RefreshCw,
  ArrowLeft,
  Pin,
  Calendar,
  User,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  summary?: string;
  isPinned: boolean;
  viewCount: number;
  publishedAt?: string;
  expiresAt?: string;
  author: { id: string; name: string };
  project?: { id: string; name: string; key: string };
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  key: string;
}

export default function AnnouncementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    summary: "",
    projectId: "none",
    isPinned: false,
    expiresAt: "",
  });

  const isAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const [annRes, projRes] = await Promise.all([
        fetch("/api/announcements"),
        fetch("/api/projects"),
      ]);

      if (annRes.ok) {
        const data = await annRes.json();
        setAnnouncements(data.announcements || []);
      }

      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session, fetchData]);

  const handleCreate = async () => {
    if (!form.title || !form.content) {
      toast({ title: "Error", description: "Title and content are required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          summary: form.summary,
          projectId: form.projectId === "none" ? null : form.projectId,
          isPinned: form.isPinned,
          expiresAt: form.expiresAt || null,
        }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Announcement created successfully" });
        setCreateDialog(false);
        setForm({ title: "", content: "", summary: "", projectId: "none", isPinned: false, expiresAt: "" });
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create announcement", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <h1 className="text-lg font-semibold">Announcements</h1>
              <p className="text-sm text-muted-foreground">News & updates from your organization</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {isAdmin && (
              <Button onClick={() => setCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Pinned Announcements */}
        {announcements.filter(a => a.isPinned).length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Pin className="h-4 w-4" />
              PINNED
            </h2>
            <div className="space-y-4">
              {announcements.filter(a => a.isPinned).map(announcement => (
                <AnnouncementCard key={announcement.id} announcement={announcement} isAdmin={isAdmin} />
              ))}
            </div>
          </div>
        )}

        {/* Regular Announcements */}
        <div className="space-y-4">
          {announcements.filter(a => !a.isPinned).length === 0 && announcements.filter(a => a.isPinned).length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No announcements yet</p>
              </CardContent>
            </Card>
          ) : (
            announcements.filter(a => !a.isPinned).map(announcement => (
              <AnnouncementCard key={announcement.id} announcement={announcement} isAdmin={isAdmin} />
            ))
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>Share news and updates with your team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary (optional)</Label>
              <Input
                id="summary"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Brief summary for preview"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write your announcement..."
                className="min-h-[200px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All projects</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At (optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.isPinned}
                onCheckedChange={(v) => setForm({ ...form, isPinned: v })}
              />
              <Label>Pin this announcement</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.content || saving}>
              {saving ? "Creating..." : "Create Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementCard({ announcement, isAdmin }: { announcement: Announcement; isAdmin: boolean }) {
  return (
    <Card className={announcement.isPinned ? "border-primary/50 bg-primary/5" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {announcement.isPinned && <Pin className="h-4 w-4 text-primary" />}
              {announcement.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {announcement.author?.name || "Unknown"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(announcement.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {announcement.viewCount} views
              </span>
            </CardDescription>
          </div>
          {announcement.project && (
            <Badge variant="outline">{announcement.project.name}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {announcement.summary ? (
          <p className="text-muted-foreground">{announcement.summary}</p>
        ) : (
          <p className="text-muted-foreground line-clamp-3">{announcement.content}</p>
        )}
      </CardContent>
    </Card>
  );
}
