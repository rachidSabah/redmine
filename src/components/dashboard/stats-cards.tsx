"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  FolderOpen,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  Target,
  Timer,
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  progress?: number;
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  change,
  changeLabel,
  icon,
  progress,
  className,
}: StatsCardProps) {
  const isPositive = change && change > 0;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || change !== undefined) && (
          <div className="flex items-center gap-2 mt-1">
            {change !== undefined && (
              <span
                className={cn(
                  "flex items-center text-xs font-medium",
                  isPositive ? "text-green-500" : "text-red-500"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {Math.abs(change)}%
              </span>
            )}
            {changeLabel && (
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  const stats = [
    {
      title: "Active Projects",
      value: "12",
      change: 12,
      changeLabel: "from last month",
      icon: <FolderOpen className="h-4 w-4" />,
    },
    {
      title: "Tasks Completed",
      value: "156",
      change: 8,
      changeLabel: "this week",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      title: "Hours Logged",
      value: "1,234",
      change: -3,
      changeLabel: "from last week",
      icon: <Timer className="h-4 w-4" />,
    },
    {
      title: "Team Members",
      value: "24",
      change: 4,
      changeLabel: "new this month",
      icon: <Users className="h-4 w-4" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
}

export function ProjectProgressCard() {
  const projects = [
    { name: "Website Redesign", progress: 75, tasks: "23/30", color: "bg-blue-500" },
    { name: "Mobile App MVP", progress: 45, tasks: "12/27", color: "bg-purple-500" },
    { name: "API Integration", progress: 90, tasks: "18/20", color: "bg-green-500" },
    { name: "Dashboard v2", progress: 30, tasks: "8/26", color: "bg-orange-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Project Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.map((project, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{project.name}</span>
              <span className="text-muted-foreground">{project.tasks}</span>
            </div>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("absolute h-full rounded-full transition-all", project.color)}
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TicketSummaryCard() {
  const tickets = [
    { status: "To Do", count: 23, color: "bg-blue-500" },
    { status: "In Progress", count: 15, color: "bg-yellow-500" },
    { status: "In Review", count: 8, color: "bg-purple-500" },
    { status: "Done", count: 45, color: "bg-green-500" },
  ];

  const total = tickets.reduce((sum, t) => sum + t.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Ticket Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-3 rounded-full overflow-hidden mb-4">
          {tickets.map((ticket, index) => (
            <div
              key={index}
              className={cn(ticket.color, "h-full")}
              style={{ width: `${(ticket.count / total) * 100}%` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {tickets.map((ticket, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded-full", ticket.color)} />
              <span className="text-sm">{ticket.status}</span>
              <span className="text-sm font-medium ml-auto">{ticket.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PriorityIssuesCard() {
  const issues = [
    { key: "PROJ-145", title: "Fix login authentication bug", priority: "Critical", assignee: "JD" },
    { key: "PROJ-139", title: "Database connection timeout", priority: "High", assignee: "AS" },
    { key: "PROJ-142", title: "Update payment gateway", priority: "High", assignee: "MK" },
    { key: "PROJ-137", title: "Memory leak in worker process", priority: "Critical", assignee: "JD" },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "text-red-500";
      case "High":
        return "text-orange-500";
      case "Medium":
        return "text-yellow-500";
      default:
        return "text-green-500";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Priority Issues</CardTitle>
        <AlertCircle className="h-5 w-5 text-red-500" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {issues.map((issue, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <span className="text-xs font-mono text-muted-foreground">{issue.key}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{issue.title}</p>
                <p className={cn("text-xs font-medium", getPriorityColor(issue.priority))}>
                  {issue.priority}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                  {issue.assignee}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
