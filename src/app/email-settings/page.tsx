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
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Shield,
  Server,
  Key,
  Settings,
  Edit,
} from "lucide-react";

interface EmailConfig {
  id: string;
  name: string;
  provider: string;
  fromEmail: string;
  fromName?: string;
  isActive: boolean;
  isDefault: boolean;
  lastTestAt?: string;
  lastTestStatus?: string;
  lastTestError?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  brevoApiKey?: string;
  sendGridApiKey?: string;
  mailgunApiKey?: string;
  mailgunDomain?: string;
}

export default function EmailSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [configurations, setConfigurations] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [configDialog, setConfigDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<EmailConfig | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [form, setForm] = useState({
    name: "",
    provider: "SMTP",
    fromEmail: "",
    fromName: "",
    replyTo: "",
    isActive: true,
    isDefault: false,
    smtpHost: "",
    smtpPort: "587",
    smtpUsername: "",
    smtpPassword: "",
    smtpSecure: true,
    brevoApiKey: "",
    sendGridApiKey: "",
    mailgunApiKey: "",
    mailgunDomain: "",
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

  const fetchConfigurations = useCallback(async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const res = await fetch("/api/email/config");
      if (res.ok) {
        const data = await res.json();
        setConfigurations(data.configurations || []);
      }
    } catch (error) {
      console.error("Failed to fetch configurations:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user && isAdmin) {
      fetchConfigurations();
    }
  }, [session, isAdmin, fetchConfigurations]);

  const openEditDialog = async (config: EmailConfig) => {
    try {
      // Fetch full config details
      const res = await fetch(`/api/email/config/${config.id}`);
      if (res.ok) {
        const data = await res.json();
        const fullConfig = data.configuration;
        
        setForm({
          name: fullConfig.name || "",
          provider: fullConfig.provider || "SMTP",
          fromEmail: fullConfig.fromEmail || "",
          fromName: fullConfig.fromName || "",
          replyTo: fullConfig.replyTo || "",
          isActive: fullConfig.isActive ?? true,
          isDefault: fullConfig.isDefault ?? false,
          smtpHost: fullConfig.smtpHost || "",
          smtpPort: fullConfig.smtpPort?.toString() || "587",
          smtpUsername: fullConfig.smtpUsername || "",
          smtpPassword: "", // Don't prefill password - user must enter new one if they want to change
          smtpSecure: fullConfig.smtpSecure ?? true,
          brevoApiKey: "", // Don't prefill API keys
          sendGridApiKey: "",
          mailgunApiKey: "",
          mailgunDomain: fullConfig.mailgunDomain || "",
        });
        
        setSelectedConfig(fullConfig);
        setIsEditMode(true);
        setConfigDialog(true);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load configuration", variant: "destructive" });
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setSelectedConfig(null);
    setIsEditMode(false);
    setConfigDialog(true);
  };

  const handleSaveConfig = async () => {
    if (!form.name || !form.fromEmail) {
      toast({ title: "Error", description: "Name and From Email are required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      
      const url = isEditMode && selectedConfig 
        ? `/api/email/config/${selectedConfig.id}` 
        : "/api/email/config";
      
      const method = isEditMode ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast({ 
          title: "Success", 
          description: isEditMode ? "Email configuration updated successfully" : "Email configuration created successfully" 
        });
        setConfigDialog(false);
        resetForm();
        fetchConfigurations();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to save configuration", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async () => {
    if (!selectedConfig) return;

    try {
      const res = await fetch(`/api/email/config/${selectedConfig.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({ title: "Success", description: "Configuration deleted successfully" });
        setDeleteDialog(false);
        setSelectedConfig(null);
        fetchConfigurations();
      } else {
        toast({ title: "Error", description: "Failed to delete configuration", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete configuration", variant: "destructive" });
    }
  };

  const handleTestConfig = async () => {
    if (!selectedConfig) return;

    try {
      setTesting(true);
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configId: selectedConfig.id,
          testEmail,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: "Success", description: "Test email sent successfully!" });
        setTestDialog(false);
        setTestEmail("");
        fetchConfigurations();
      } else {
        toast({ title: "Error", description: data.error || "Failed to send test email", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send test email", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      provider: "SMTP",
      fromEmail: "",
      fromName: "",
      replyTo: "",
      isActive: true,
      isDefault: false,
      smtpHost: "",
      smtpPort: "587",
      smtpUsername: "",
      smtpPassword: "",
      smtpSecure: true,
      brevoApiKey: "",
      sendGridApiKey: "",
      mailgunApiKey: "",
      mailgunDomain: "",
    });
    setSelectedConfig(null);
    setIsEditMode(false);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "GMAIL": return "📧";
      case "BREVO": return "📬";
      case "SENDGRID": return "📨";
      case "MAILGUN": return "🔫";
      case "AMAZON_SES": return "☁️";
      case "OUTLOOK": return "📋";
      default: return "🖥️";
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
              <h1 className="text-lg font-semibold">Email Settings</h1>
              <p className="text-sm text-muted-foreground">Configure email providers and notifications</p>
            </div>
          </div>
          <Badge variant="default" className="gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Provider Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setForm({ ...form, provider: "GMAIL" }); openCreateDialog(); }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">📧 Gmail</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Connect Gmail accounts with OAuth or App Password</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setForm({ ...form, provider: "BREVO" }); openCreateDialog(); }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">📬 Brevo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Send emails via Brevo (Sendinblue) API</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setForm({ ...form, provider: "SMTP" }); openCreateDialog(); }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">🖥️ Custom SMTP</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Configure any SMTP email server</p>
            </CardContent>
          </Card>
        </div>

        {/* Configurations Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Email Configurations</CardTitle>
              <CardDescription>Manage your email provider settings</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchConfigurations}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Configuration
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {configurations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No email configurations yet.</p>
                <p className="text-sm">Click on a provider card above or the Add button to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>From Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Test</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configurations.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getProviderIcon(config.provider)}</span>
                          <span>{config.provider}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{config.name}</span>
                          {config.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{config.fromEmail}</TableCell>
                      <TableCell>
                        <Badge variant={config.isActive ? "default" : "secondary"}>
                          {config.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {config.lastTestAt ? (
                          <div className="flex items-center gap-1">
                            {config.lastTestStatus === "success" ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-xs">
                              {new Date(config.lastTestAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not tested</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit Configuration"
                            onClick={() => openEditDialog(config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Test Configuration"
                            onClick={() => {
                              setSelectedConfig(config);
                              setTestEmail(session?.user?.email || "");
                              setTestDialog(true);
                            }}
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            title="Delete Configuration"
                            onClick={() => {
                              setSelectedConfig(config);
                              setDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Setup Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">📧 Gmail Setup</h4>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Enable 2-Factor Authentication on your Google account</li>
                <li>Go to Google Account Settings → Security → App passwords</li>
                <li>Generate a new App password for "Mail"</li>
                <li>Use your Gmail address as username and the App password as password</li>
                <li>SMTP Host: smtp.gmail.com, Port: 587, Secure: TLS</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-2">📬 Brevo (Sendinblue) Setup</h4>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Create a Brevo account at brevo.com</li>
                <li>Go to SMTP & API settings</li>
                <li>Copy your API key</li>
                <li>Paste the API key in the configuration</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-2">🖥️ Custom SMTP Setup</h4>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Get SMTP credentials from your email provider</li>
                <li>Enter the SMTP host, port, username, and password</li>
                <li>Common ports: 25, 465 (SSL), 587 (TLS)</li>
                <li>Enable TLS/SSL for secure connections</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Dialog - Create/Edit */}
      <Dialog open={configDialog} onOpenChange={setConfigDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Email Configuration" : "Add Email Configuration"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update your email provider settings. Leave password fields blank to keep existing values."
                : "Configure your email provider settings"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Configuration Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Company Gmail"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GMAIL">Gmail</SelectItem>
                    <SelectItem value="BREVO">Brevo (Sendinblue)</SelectItem>
                    <SelectItem value="SENDGRID">SendGrid</SelectItem>
                    <SelectItem value="MAILGUN">Mailgun</SelectItem>
                    <SelectItem value="SMTP">Custom SMTP</SelectItem>
                    <SelectItem value="OUTLOOK">Outlook</SelectItem>
                    <SelectItem value="AMAZON_SES">Amazon SES</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email *</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                  placeholder="noreply@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  value={form.fromName}
                  onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                  placeholder="Synchro PM"
                />
              </div>
            </div>

            {/* SMTP Settings */}
            {["SMTP", "GMAIL", "OUTLOOK"].includes(form.provider) && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  SMTP Settings
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={form.smtpHost}
                      onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                      placeholder={form.provider === "GMAIL" ? "smtp.gmail.com" : "smtp.example.com"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">Port</Label>
                    <Input
                      id="smtpPort"
                      value={form.smtpPort}
                      onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUsername">Username</Label>
                    <Input
                      id="smtpUsername"
                      value={form.smtpUsername}
                      onChange={(e) => setForm({ ...form, smtpUsername: e.target.value })}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">
                      Password / App Password
                      {isEditMode && <span className="text-xs text-muted-foreground ml-1">(leave blank to keep existing)</span>}
                    </Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={form.smtpPassword}
                      onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.smtpSecure}
                    onCheckedChange={(v) => setForm({ ...form, smtpSecure: v })}
                  />
                  <Label>Use TLS/SSL</Label>
                </div>
              </div>
            )}

            {/* Brevo Settings */}
            {form.provider === "BREVO" && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Brevo API Settings
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="brevoApiKey">
                    API Key
                    {isEditMode && <span className="text-xs text-muted-foreground ml-1">(leave blank to keep existing)</span>}
                  </Label>
                  <Input
                    id="brevoApiKey"
                    type="password"
                    value={form.brevoApiKey}
                    onChange={(e) => setForm({ ...form, brevoApiKey: e.target.value })}
                    placeholder="xkeysib-..."
                  />
                </div>
              </div>
            )}

            {/* SendGrid Settings */}
            {form.provider === "SENDGRID" && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  SendGrid API Settings
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="sendGridApiKey">
                    API Key
                    {isEditMode && <span className="text-xs text-muted-foreground ml-1">(leave blank to keep existing)</span>}
                  </Label>
                  <Input
                    id="sendGridApiKey"
                    type="password"
                    value={form.sendGridApiKey}
                    onChange={(e) => setForm({ ...form, sendGridApiKey: e.target.value })}
                    placeholder="SG..."
                  />
                </div>
              </div>
            )}

            {/* Mailgun Settings */}
            {form.provider === "MAILGUN" && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Mailgun Settings
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mailgunApiKey">
                      API Key
                      {isEditMode && <span className="text-xs text-muted-foreground ml-1">(leave blank to keep existing)</span>}
                    </Label>
                    <Input
                      id="mailgunApiKey"
                      type="password"
                      value={form.mailgunApiKey}
                      onChange={(e) => setForm({ ...form, mailgunApiKey: e.target.value })}
                      placeholder="key-..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mailgunDomain">Domain</Label>
                    <Input
                      id="mailgunDomain"
                      value={form.mailgunDomain}
                      onChange={(e) => setForm({ ...form, mailgunDomain: e.target.value })}
                      placeholder="mg.yourdomain.com"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={(v) => setForm({ ...form, isDefault: v })}
                />
                <Label>Default</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig} disabled={!form.name || !form.fromEmail || saving}>
              {saving ? "Saving..." : (isEditMode ? "Update Configuration" : "Save Configuration")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Email Configuration</DialogTitle>
            <DialogDescription>Send a test email to verify your configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(false)}>Cancel</Button>
            <Button onClick={handleTestConfig} disabled={testing || !testEmail}>
              {testing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Configuration</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedConfig?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfig}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
