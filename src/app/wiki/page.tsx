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
  BookOpen,
  Plus,
  RefreshCw,
  ArrowLeft,
  FileText,
  FolderOpen,
  Edit,
  Trash2,
  Search,
  Save,
  History,
  RotateCcw,
  Eye,
  Code,
  AlertTriangle,
} from "lucide-react";

interface WikiPageType {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  projectId: string | null;
  parentId: string | null;
  order: number;
  author: { id: string; name: string; email: string };
  _count?: { children: number; attachments: number };
  createdAt: string;
  updatedAt: string;
}

interface WikiVersion {
  id: string;
  version: number;
  title: string;
  content: string;
  changeSummary: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  key: string;
}

export default function WikiPageComponent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [pages, setPages] = useState<WikiPageType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<WikiPageType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "edit" | "view">("list");

  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [versions, setVersions] = useState<WikiVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<WikiVersion | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    projectId: "none",
    parentId: "none",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      setError(null);

      const [pagesRes, projectsRes] = await Promise.all([
        fetch("/api/wiki"),
        fetch("/api/projects"),
      ]);

      if (!pagesRes.ok) {
        const errorData = await pagesRes.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to fetch wiki pages (${pagesRes.status})`);
      }

      const pagesData = await pagesRes.json();
      setPages(pagesData.pages || []);

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.message || "Failed to load wiki pages. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session, fetchData]);

  const handleCreatePage = async () => {
    if (!form.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content,
          projectId: form.projectId === "none" ? null : form.projectId,
          parentId: form.parentId === "none" ? null : form.parentId,
        }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Wiki page created successfully" });
        setCreateDialog(false);
        setForm({ title: "", content: "", projectId: "none", parentId: "none" });
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create page", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to create page", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePage = async () => {
    if (!selectedPage) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/wiki/${selectedPage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedPage.title,
          content: selectedPage.content,
        }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Wiki page updated successfully" });
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to update page", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update page", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const fetchVersions = async () => {
    if (!selectedPage) return;
    
    try {
      setLoadingVersions(true);
      const res = await fetch(`/api/wiki-versions?pageId=${selectedPage.id}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error("Failed to fetch versions:", err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (version: WikiVersion) => {
    if (!selectedPage) return;
    
    try {
      const res = await fetch(`/api/wiki/${selectedPage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: version.title,
          content: version.content,
        }),
      });

      if (res.ok) {
        toast({ title: "Success", description: `Restored to version ${version.version}` });
        setHistoryDialog(false);
        setSelectedPage({ ...selectedPage, title: version.title, content: version.content });
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to restore version", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to restore version", variant: "destructive" });
    }
  };

  const handleDeletePage = async () => {
    if (!selectedPage) return;

    try {
      const res = await fetch(`/api/wiki/${selectedPage.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({ title: "Success", description: "Wiki page deleted successfully" });
        setDeleteDialog(false);
        setSelectedPage(null);
        setViewMode("list");
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete page", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete page", variant: "destructive" });
    }
  };

  // Build tree structure
  const buildTree = (pageList: WikiPageType[], parentId: string | null = null): any[] => {
    return pageList
      .filter((page) => page.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .map((page) => ({
        ...page,
        children: buildTree(pageList, page.id),
      }));
  };

  const rootPages = buildTree(pages);

  const filteredPages = searchQuery
    ? pages.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const renderPageItem = (page: any, depth = 0) => (
    <div key={page.id}>
      <button
        onClick={() => {
          setSelectedPage(page);
          setViewMode("view");
        }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-left transition-colors"
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {page.children?.length > 0 ? (
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="flex-1 truncate">{page.title}</span>
        {page._count?.children ? (
          <Badge variant="secondary" className="text-xs">
            {page._count.children}
          </Badge>
        ) : null}
      </button>
      {page.children?.map((child: WikiPageType) => renderPageItem(child, depth + 1))}
    </div>
  );

  // Simple markdown to HTML converter
  const renderMarkdown = (content: string) => {
    return content
      .replace(/^### (.*$)/gim, "<h3 class='text-lg font-semibold mt-4 mb-2'>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2 class='text-xl font-semibold mt-6 mb-3'>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1 class='text-2xl font-bold mt-6 mb-4'>$1</h1>")
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" class="max-w-full h-auto rounded-lg my-4" />')
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" class="text-blue-500 hover:underline" target="_blank">$1</a>')
      .replace(/`([^`]+)`/gim, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/^```(\w*)\n([\s\S]*?)```/gim, '<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4"><code>$2</code></pre>')
      .replace(/^- (.*$)/gim, "<li class='ml-4'>$1</li>")
      .replace(/^\n/gim, "<br>");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading wiki...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6">
          <CardContent className="text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg mb-4">Please sign in to access the Wiki</p>
            <Button onClick={() => router.push("/auth/signin")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6 max-w-md">
          <CardContent className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-lg mb-4">{error}</p>
            <Button onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
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
              <h1 className="text-lg font-semibold">Wiki</h1>
              <p className="text-sm text-muted-foreground">Documentation & Knowledge Base</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedPage && (
              <div className="flex items-center gap-1 border-r pr-2 mr-2">
                <Button
                  variant={viewMode === "view" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("view")}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
                <Button
                  variant={viewMode === "edit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("edit")}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => setCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Page
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-72 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredPages ? (
                filteredPages.length > 0 ? (
                  filteredPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        setSelectedPage(page);
                        setViewMode("view");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-left"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{page.title}</span>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No pages found</p>
                  </div>
                )
              ) : rootPages.length > 0 ? (
                rootPages.map((page) => renderPageItem(page))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No wiki pages yet</p>
                  <Button className="mt-4" onClick={() => setCreateDialog(true)}>
                    Create First Page
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {selectedPage ? (
            <>
              {viewMode === "edit" ? (
                <div className="flex-1 flex flex-col p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Input
                      value={selectedPage.title}
                      onChange={(e) =>
                        setSelectedPage({ ...selectedPage, title: e.target.value })
                      }
                      className="text-2xl font-bold border-none p-0 h-auto focus-visible:ring-0"
                      placeholder="Page Title"
                    />
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setHistoryDialog(true);
                          fetchVersions();
                        }}
                        title="View history"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleteDialog(true)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button onClick={handleUpdatePage} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      <span className="text-sm font-medium">Markdown Editor</span>
                    </div>
                    <Textarea
                      value={selectedPage.content}
                      onChange={(e) =>
                        setSelectedPage({ ...selectedPage, content: e.target.value })
                      }
                      className="flex-1 min-h-[400px] resize-none border-0 rounded-none focus-visible:ring-0 font-mono"
                      placeholder="Write your content here... (Markdown supported)

# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text*

- List item 1
- List item 2

`inline code`

```
code block
```

[Link text](url)
![Image alt](image-url)"
                    />
                  </div>
                </div>
              ) : (
                <ScrollArea className="flex-1 p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h1 className="text-3xl font-bold">{selectedPage.title}</h1>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setViewMode("edit")}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(selectedPage.content),
                        }}
                      />
                    </div>
                    <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <div>
                          <p><strong>Last updated:</strong> {new Date(selectedPage.updatedAt).toLocaleString()}</p>
                          <p><strong>Author:</strong> {selectedPage.author?.name || "Unknown"}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setHistoryDialog(true);
                            fetchVersions();
                          }}
                        >
                          <History className="mr-2 h-4 w-4" />
                          View History
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No page selected</p>
                <p className="text-sm mb-4">Select a page from the sidebar or create a new one</p>
                <Button onClick={() => setCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Page
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Page Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Wiki Page</DialogTitle>
            <DialogDescription>Add a new documentation page</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Page Title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project (Optional)</Label>
                <Select 
                  value={form.projectId} 
                  onValueChange={(v) => setForm({ ...form, projectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parent Page (Optional)</Label>
                <Select 
                  value={form.parentId} 
                  onValueChange={(v) => setForm({ ...form, parentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root)</SelectItem>
                    {pages
                      .filter((p) => !p.parentId)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write your content here... (Markdown supported)"
                className="min-h-[200px] font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePage} disabled={!form.title.trim() || saving}>
              {saving ? "Creating..." : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedPage?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePage}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              View and restore previous versions of this page
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {loadingVersions ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No version history available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedVersion?.id === version.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/50"
                    }`}
                    onClick={() => setSelectedVersion(version)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{version.version}</Badge>
                        <span className="font-medium">{version.title}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(version.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {version.changeSummary && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {version.changeSummary}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreVersion(version);
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {selectedVersion && (
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-2">Preview (v{selectedVersion.version})</h4>
              <ScrollArea className="h-[200px] bg-muted/50 rounded-lg p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(selectedVersion.content),
                    }}
                  />
                </div>
              </ScrollArea>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setHistoryDialog(false);
              setSelectedVersion(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
