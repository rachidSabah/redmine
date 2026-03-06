"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  FolderKanban,
  Clock,
  MoreHorizontal,
  Plus,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  color?: string;
  progress: number;
  memberCount: number;
  ticketCount: number;
  dueDate?: Date;
  status: "on-track" | "at-risk" | "behind";
}

const sampleProjects: Project[] = [
  {
    id: "1",
    name: "Website Redesign",
    key: "WEB",
    description: "Complete overhaul of the company website with new design system",
    color: "#3B82F6",
    progress: 75,
    memberCount: 6,
    ticketCount: 24,
    dueDate: new Date(2024, 11, 20),
    status: "on-track",
  },
  {
    id: "2",
    name: "Mobile App MVP",
    key: "APP",
    description: "Build the minimum viable product for iOS and Android",
    color: "#8B5CF6",
    progress: 45,
    memberCount: 4,
    ticketCount: 32,
    dueDate: new Date(2024, 11, 28),
    status: "at-risk",
  },
  {
    id: "3",
    name: "API Integration",
    key: "API",
    description: "Third-party API integrations and documentation",
    color: "#10B981",
    progress: 90,
    memberCount: 3,
    ticketCount: 15,
    dueDate: new Date(2024, 11, 15),
    status: "on-track",
  },
  {
    id: "4",
    name: "Dashboard v2",
    key: "DASH",
    description: "Redesign analytics dashboard with real-time data",
    color: "#F59E0B",
    progress: 30,
    memberCount: 5,
    ticketCount: 28,
    dueDate: new Date(2025, 0, 10),
    status: "behind",
  },
  {
    id: "5",
    name: "Security Audit",
    key: "SEC",
    description: "Complete security review and penetration testing",
    color: "#EF4444",
    progress: 60,
    memberCount: 2,
    ticketCount: 12,
    dueDate: new Date(2024, 11, 25),
    status: "on-track",
  },
];

export function ProjectList() {
  const getStatusBadge = (status: Project["status"]) => {
    switch (status) {
      case "on-track":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            On Track
          </Badge>
        );
      case "at-risk":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            At Risk
          </Badge>
        );
      case "behind":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Behind
          </Badge>
        );
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-green-500";
    if (progress >= 50) return "bg-yellow-500";
    if (progress >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Projects</CardTitle>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="divide-y">
            {sampleProjects.map((project) => (
              <div
                key={project.id}
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="font-medium">{project.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {project.key}
                      </span>
                      {getStatusBadge(project.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                      {project.description}
                    </p>
                    
                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("absolute h-full rounded-full transition-all", getProgressColor(project.progress))}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{project.memberCount} members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FolderKanban className="h-3.5 w-3.5" />
                        <span>{project.ticketCount} tickets</span>
                      </div>
                      {project.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Due {format(project.dueDate, "MMM d")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
