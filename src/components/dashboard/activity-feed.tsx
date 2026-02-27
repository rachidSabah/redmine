"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  MessageSquare,
  GitCommit,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  Clock,
  UserPlus,
  FileText,
  Activity as ActivityIcon,
} from "lucide-react";

interface Activity {
  id: string;
  type: string;
  description: string;
  user: {
    id: string;
    name: string | null;
    image?: string | null;
  };
  createdAt: string;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities?: Activity[];
  className?: string;
}

const activityIcons: Record<string, React.ReactNode> = {
  CREATED: <Plus className="h-4 w-4" />,
  UPDATED: <Edit className="h-4 w-4" />,
  DELETED: <Trash2 className="h-4 w-4" />,
  COMMENTED: <MessageSquare className="h-4 w-4" />,
  STATUS_CHANGED: <CheckCircle2 className="h-4 w-4" />,
  ASSIGNED: <UserPlus className="h-4 w-4" />,
  TIME_LOGGED: <Clock className="h-4 w-4" />,
  ATTACHMENT_ADDED: <FileText className="h-4 w-4" />,
  COMMIT: <GitCommit className="h-4 w-4" />,
};

const activityColors: Record<string, string> = {
  CREATED: "bg-green-500/10 text-green-500",
  UPDATED: "bg-blue-500/10 text-blue-500",
  DELETED: "bg-red-500/10 text-red-500",
  COMMENTED: "bg-purple-500/10 text-purple-500",
  STATUS_CHANGED: "bg-yellow-500/10 text-yellow-500",
  ASSIGNED: "bg-indigo-500/10 text-indigo-500",
  TIME_LOGGED: "bg-orange-500/10 text-orange-500",
  ATTACHMENT_ADDED: "bg-cyan-500/10 text-cyan-500",
  COMMIT: "bg-pink-500/10 text-pink-500",
};

const formatActivityTime = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return format(d, "MMM d, yyyy");
};

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  const defaultActivities: Activity[] = [
    {
      id: "1",
      type: "STATUS_CHANGED",
      description: "moved PROJ-145 to In Progress",
      user: { id: "1", name: "John Doe" },
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: "2",
      type: "COMMENTED",
      description: "commented on PROJ-139: \"Looks good to me!\"",
      user: { id: "2", name: "Alice Smith", image: undefined },
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: "3",
      type: "CREATED",
      description: "created new ticket PROJ-146",
      user: { id: "3", name: "Mike Johnson" },
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "4",
      type: "ASSIGNED",
      description: "assigned PROJ-142 to @sarah",
      user: { id: "4", name: "Sarah Wilson" },
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: "5",
      type: "TIME_LOGGED",
      description: "logged 4h on PROJ-137",
      user: { id: "1", name: "John Doe" },
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: "6",
      type: "ATTACHMENT_ADDED",
      description: "attached design.pdf to PROJ-140",
      user: { id: "2", name: "Alice Smith" },
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
    {
      id: "7",
      type: "STATUS_CHANGED",
      description: "completed PROJ-135",
      user: { id: "3", name: "Mike Johnson" },
      createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    },
  ];

  const displayActivities = activities || defaultActivities;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ActivityIcon className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {displayActivities.length} updates
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6 pb-6">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
            
            <div className="space-y-4">
              {displayActivities.map((activity, index) => (
                <div key={activity.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
                      activityColors[activity.type] || "bg-muted"
                    )}
                  >
                    {activityIcons[activity.type] || <ActivityIcon className="h-4 w-4" />}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={activity.user.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {activity.user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm">
                          <span className="font-medium">{activity.user.name}</span>{" "}
                          <span className="text-muted-foreground">{activity.description}</span>
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatActivityTime(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
