"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  FolderKanban,
  Kanban,
  GanttChart,
  Calendar,
  MessageSquare,
  Settings,
  Users,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Bell,
  Moon,
  Sun,
  Building2,
  Projector,
  LogOut,
  Menu,
  X,
  Megaphone,
  BookOpen,
  Mail,
} from "lucide-react";

interface NavItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  badge?: number;
  children?: NavItem[];
}

const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: "#dashboard",
  },
  {
    title: "Projects",
    icon: <FolderKanban className="h-4 w-4" />,
    href: "#projects",
  },
  {
    title: "My Tasks",
    icon: <Kanban className="h-4 w-4" />,
    href: "#tasks",
    badge: 12,
  },
  {
    title: "Kanban Board",
    icon: <Kanban className="h-4 w-4" />,
    href: "#kanban",
  },
  {
    title: "Gantt Chart",
    icon: <GanttChart className="h-4 w-4" />,
    href: "#gantt",
  },
  {
    title: "Calendar",
    icon: <Calendar className="h-4 w-4" />,
    href: "#calendar",
  },
  {
    title: "Team Chat",
    icon: <MessageSquare className="h-4 w-4" />,
    href: "#chat",
    badge: 3,
  },
];

const extraNavItems: NavItem[] = [
  {
    title: "Wiki",
    icon: <BookOpen className="h-4 w-4" />,
    href: "/wiki",
  },
  {
    title: "Announcements",
    icon: <Megaphone className="h-4 w-4" />,
    href: "/announcements",
  },
  {
    title: "Email Settings",
    icon: <Mail className="h-4 w-4" />,
    href: "/email-settings",
  },
];

const settingsNavItems: NavItem[] = [
  {
    title: "Team",
    icon: <Users className="h-4 w-4" />,
    href: "#team",
  },
  {
    title: "Settings",
    icon: <Settings className="h-4 w-4" />,
    href: "#settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarOpen,
    toggleSidebar,
    user,
    currentOrganization,
    organizations,
    theme,
    setTheme,
    activeView,
    setActiveView,
    notifications,
  } = useAppStore();

  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((i) => i !== title)
        : [...prev, title]
    );
  };

  const handleNavClick = (href: string | undefined) => {
    if (href) {
      const view = href.replace("#", "") as typeof activeView;
      if (view === "dashboard" || view === "projects" || view === "kanban" || view === "gantt" || view === "calendar" || view === "chat" || view === "settings") {
        setActiveView(view);
      }
      setMobileOpen(false);
    }
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const isActive = activeView === item.href?.replace("#", "");
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);

    return (
      <div key={item.title}>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {hasChildren ? (
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.title)}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
                        isChild && "pl-8",
                        isActive && "bg-accent text-accent-foreground"
                      )}
                    >
                      {item.icon}
                      {!sidebarOpen && <span className="sr-only">{item.title}</span>}
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left">{item.title}</span>
                          {item.badge && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                              {item.badge}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {item.children?.map((child) => renderNavItem(child, true))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <button
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
                    isChild && "pl-8",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  {item.icon}
                  {!sidebarOpen && <span className="sr-only">{item.title}</span>}
                  {sidebarOpen && (
                    <>
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )}
            </TooltipTrigger>
            {!sidebarOpen && (
              <TooltipContent side="right">
                {item.title}
                {item.badge && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-card border-r transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            {sidebarOpen ? (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Projector className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">Synchro PM</span>
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
                <Projector className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Organization selector */}
          {sidebarOpen && currentOrganization && (
            <div className="border-b p-3">
              <button className="flex w-full items-center gap-2 rounded-lg p-2 hover:bg-accent">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentOrganization.logo || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {currentOrganization.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{currentOrganization.name}</p>
                  <p className="text-xs text-muted-foreground">{currentOrganization.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Quick actions */}
          {sidebarOpen && (
            <div className="border-b p-3">
              <Button className="w-full" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
          )}

          {/* Search */}
          {sidebarOpen && (
            <div className="border-b p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {mainNavItems.map((item) => renderNavItem(item))}
            </nav>

            <div className="mt-6">
              <h3 className={cn(
                "mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground",
                !sidebarOpen && "text-center"
              )}>
                {sidebarOpen ? "Resources" : "•••"}
              </h3>
              <nav className="space-y-1">
                {extraNavItems.map((item) => (
                  <Link key={item.title} href={item.href || "#"}>
                    <button className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent"
                    )}>
                      {item.icon}
                      {sidebarOpen && <span>{item.title}</span>}
                    </button>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="mt-6">
              <h3 className={cn(
                "mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground",
                !sidebarOpen && "text-center"
              )}>
                {sidebarOpen ? "Workspace" : "•••"}
              </h3>
              <nav className="space-y-1">
                {settingsNavItems.map((item) => renderNavItem(item))}
              </nav>
            </div>
          </ScrollArea>

          {/* Theme toggle */}
          <div className="border-t p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {sidebarOpen && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
            </Button>
          </div>

          {/* User section */}
          <div className="border-t p-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback>
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="flex-1">
                  <p className="text-sm font-medium">{user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              )}
              {sidebarOpen && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="relative rounded-lg p-2 hover:bg-accent">
                        <Bell className="h-4 w-4" />
                        {unreadNotifications > 0 && (
                          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Notifications</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Collapse button */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center border-t p-2 hover:bg-accent"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                sidebarOpen && "rotate-180"
              )}
            />
          </button>
        </div>
      </aside>
    </>
  );
}
