"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, addDays, differenceInDays } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar as CalendarIcon,
} from "lucide-react";

interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  color?: string;
  assignee?: string;
  dependencies?: string[];
}

interface GanttProject {
  id: string;
  name: string;
  tasks: GanttTask[];
  expanded?: boolean;
}

const sampleProjects: GanttProject[] = [
  {
    id: "p1",
    name: "Website Redesign",
    expanded: true,
    tasks: [
      {
        id: "t1",
        name: "Research & Discovery",
        start: new Date(2024, 11, 1),
        end: new Date(2024, 11, 7),
        progress: 100,
        color: "#10B981",
        assignee: "John D.",
      },
      {
        id: "t2",
        name: "UI/UX Design",
        start: new Date(2024, 11, 8),
        end: new Date(2024, 11, 20),
        progress: 75,
        color: "#3B82F6",
        assignee: "Alice S.",
      },
      {
        id: "t3",
        name: "Frontend Development",
        start: new Date(2024, 11, 15),
        end: new Date(2024, 11, 30),
        progress: 30,
        color: "#8B5CF6",
        assignee: "Mike J.",
      },
      {
        id: "t4",
        name: "Backend Integration",
        start: new Date(2024, 11, 25),
        end: new Date(2025, 0, 10),
        progress: 0,
        color: "#F59E0B",
        assignee: "Sarah W.",
      },
    ],
  },
  {
    id: "p2",
    name: "Mobile App MVP",
    expanded: true,
    tasks: [
      {
        id: "t5",
        name: "App Architecture",
        start: new Date(2024, 11, 5),
        end: new Date(2024, 11, 12),
        progress: 100,
        color: "#10B981",
        assignee: "John D.",
      },
      {
        id: "t6",
        name: "Core Features",
        start: new Date(2024, 11, 13),
        end: new Date(2024, 11, 28),
        progress: 50,
        color: "#3B82F6",
        assignee: "Alice S.",
      },
      {
        id: "t7",
        name: "Testing & QA",
        start: new Date(2024, 11, 28),
        end: new Date(2025, 0, 5),
        progress: 0,
        color: "#EF4444",
        assignee: "David K.",
      },
    ],
  },
  {
    id: "p3",
    name: "API Development",
    expanded: false,
    tasks: [
      {
        id: "t8",
        name: "API Design",
        start: new Date(2024, 11, 10),
        end: new Date(2024, 11, 15),
        progress: 100,
        color: "#10B981",
      },
      {
        id: "t9",
        name: "Implementation",
        start: new Date(2024, 11, 16),
        end: new Date(2024, 11, 28),
        progress: 60,
        color: "#3B82F6",
      },
    ],
  },
];

export function GanttChart() {
  const [startDate, setStartDate] = React.useState(new Date(2024, 11, 1));
  const [scale, setScale] = React.useState(1);
  const [projects, setProjects] = React.useState(sampleProjects);

  const daysToShow = 35;
  const dayWidth = 32 * scale;
  const totalWidth = daysToShow * dayWidth;
  const rowHeight = 40;

  const endDate = addDays(startDate, daysToShow - 1);
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));

  const navigateDays = (delta: number) => {
    setStartDate((prev) => addDays(prev, delta));
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

  const toggleProject = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, expanded: !p.expanded } : p
      )
    );
  };

  const getTaskPosition = (task: GanttTask) => {
    const startOffset = differenceInDays(task.start, startDate);
    const duration = differenceInDays(task.end, task.start) + 1;
    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth,
    };
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const todayPosition = differenceInDays(new Date(), startDate) * dayWidth;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Gantt Chart</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDays(-7)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStartDate(new Date())}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDays(7)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button variant="outline" size="icon" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="icon" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex">
          {/* Project/Task list */}
          <div className="w-64 flex-shrink-0 border-r">
            <div className="h-10 border-b bg-muted/50 px-4 flex items-center">
              <span className="font-medium text-sm">Projects & Tasks</span>
            </div>
            <ScrollArea className="h-[calc(100vh-340px)]">
              {projects.map((project) => (
                <div key={project.id}>
                  {/* Project row */}
                  <div
                    className="h-10 border-b px-4 flex items-center gap-2 bg-muted/20 cursor-pointer hover:bg-muted/30"
                    onClick={() => toggleProject(project.id)}
                  >
                    <span
                      className={cn(
                        "transition-transform",
                        project.expanded && "rotate-90"
                      )}
                    >
                      ▶
                    </span>
                    <span className="font-medium text-sm">{project.name}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {project.tasks.length}
                    </Badge>
                  </div>
                  {/* Task rows */}
                  {project.expanded &&
                    project.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="h-10 border-b pl-8 pr-4 flex items-center text-sm"
                      >
                        <span className="truncate">{task.name}</span>
                      </div>
                    ))}
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Timeline */}
          <ScrollArea className="flex-1">
            <div style={{ width: totalWidth }}>
              {/* Header - Days */}
              <div className="h-10 border-b bg-muted/50 flex">
                {days.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex-shrink-0 border-r flex flex-col items-center justify-center text-xs",
                      isToday(day) && "bg-primary/10"
                    )}
                    style={{ width: dayWidth }}
                  >
                    <span className="text-muted-foreground">
                      {format(day, "EEE")}
                    </span>
                    <span className={cn(isToday(day) && "font-bold text-primary")}>
                      {format(day, "d")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Timeline body */}
              <div className="relative">
                {/* Today line */}
                {todayPosition >= 0 && todayPosition <= totalWidth && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                    style={{ left: todayPosition }}
                  />
                )}

                {/* Grid lines and tasks */}
                {projects.map((project) => (
                  <div key={project.id}>
                    {/* Project row (empty for grid) */}
                    <div
                      className="h-10 border-b relative"
                      style={{ width: totalWidth }}
                    >
                      {/* Vertical grid lines */}
                      {days.map((day, index) => (
                        <div
                          key={index}
                          className={cn(
                            "absolute top-0 bottom-0 w-px bg-border",
                            isToday(day) && "bg-red-500/20"
                          )}
                          style={{ left: index * dayWidth }}
                        />
                      ))}
                    </div>

                    {/* Task rows */}
                    {project.expanded &&
                      project.tasks.map((task) => {
                        const position = getTaskPosition(task);
                        return (
                          <div
                            key={task.id}
                            className="h-10 border-b relative"
                            style={{ width: totalWidth }}
                          >
                            {/* Vertical grid lines */}
                            {days.map((day, index) => (
                              <div
                                key={index}
                                className={cn(
                                  "absolute top-0 bottom-0 w-px bg-border",
                                  isToday(day) && "bg-red-500/20"
                                )}
                                style={{ left: index * dayWidth }}
                              />
                            ))}
                            {/* Task bar */}
                            <div
                              className="absolute top-2 h-6 rounded-md overflow-hidden"
                              style={{
                                left: position.left,
                                width: position.width,
                              }}
                            >
                              <div
                                className="h-full"
                                style={{ backgroundColor: task.color || "#3B82F6" }}
                              >
                                <div
                                  className="h-full bg-black/20"
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                              {/* Task name overlay */}
                              <div className="absolute inset-0 flex items-center px-2">
                                <span className="text-xs text-white font-medium truncate">
                                  {task.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
