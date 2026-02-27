"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  MoreHorizontal,
  Calendar,
  MessageSquare,
  Paperclip,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Ticket {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  type: string;
  assignee?: { id: string; name: string | null; image?: string | null } | null;
  progress: number;
  dueDate?: string | null;
  commentsCount?: number;
  attachmentsCount?: number;
}

interface Column {
  id: string;
  name: string;
  color: string;
  tickets: Ticket[];
}

const defaultColumns: Column[] = [
  {
    id: "backlog",
    name: "Backlog",
    color: "#6B7280",
    tickets: [
      {
        id: "1",
        key: "PROJ-101",
        title: "Implement user authentication flow",
        status: "BACKLOG",
        priority: "HIGH",
        type: "FEATURE",
        assignee: { id: "1", name: "John Doe" },
        progress: 0,
        commentsCount: 3,
      },
      {
        id: "2",
        key: "PROJ-102",
        title: "Design system documentation",
        status: "BACKLOG",
        priority: "MEDIUM",
        type: "DOCUMENTATION",
        progress: 0,
        attachmentsCount: 2,
      },
    ],
  },
  {
    id: "todo",
    name: "To Do",
    color: "#3B82F6",
    tickets: [
      {
        id: "3",
        key: "PROJ-103",
        title: "API endpoint for user profiles",
        status: "TODO",
        priority: "HIGH",
        type: "TASK",
        assignee: { id: "2", name: "Alice Smith" },
        progress: 0,
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      },
      {
        id: "4",
        key: "PROJ-104",
        title: "Fix navigation menu on mobile",
        status: "TODO",
        priority: "CRITICAL",
        type: "BUG",
        progress: 0,
        commentsCount: 5,
      },
    ],
  },
  {
    id: "in-progress",
    name: "In Progress",
    color: "#F59E0B",
    tickets: [
      {
        id: "5",
        key: "PROJ-105",
        title: "Dashboard analytics widgets",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        type: "FEATURE",
        assignee: { id: "3", name: "Mike Johnson" },
        progress: 45,
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        commentsCount: 2,
        attachmentsCount: 1,
      },
    ],
  },
  {
    id: "in-review",
    name: "In Review",
    color: "#8B5CF6",
    tickets: [
      {
        id: "6",
        key: "PROJ-106",
        title: "Optimize database queries",
        status: "IN_REVIEW",
        priority: "HIGH",
        type: "IMPROVEMENT",
        assignee: { id: "1", name: "John Doe" },
        progress: 90,
        commentsCount: 8,
      },
    ],
  },
  {
    id: "done",
    name: "Done",
    color: "#10B981",
    tickets: [
      {
        id: "7",
        key: "PROJ-107",
        title: "Setup CI/CD pipeline",
        status: "DONE",
        priority: "HIGH",
        type: "TASK",
        assignee: { id: "4", name: "Sarah Wilson" },
        progress: 100,
      },
      {
        id: "8",
        key: "PROJ-108",
        title: "User registration form",
        status: "DONE",
        priority: "MEDIUM",
        type: "FEATURE",
        assignee: { id: "2", name: "Alice Smith" },
        progress: 100,
      },
    ],
  },
];

interface SortableTicketProps {
  ticket: Ticket;
}

function SortableTicket({ ticket }: SortableTicketProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-500";
      case "HIGH":
        return "bg-orange-500";
      case "MEDIUM":
        return "bg-yellow-500";
      default:
        return "bg-green-500";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "BUG":
        return "🐛";
      case "FEATURE":
        return "✨";
      case "IMPROVEMENT":
        return "🚀";
      case "DOCUMENTATION":
        return "📚";
      default:
        return "📋";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Priority indicator */}
      <div className={cn("w-full h-1 rounded-full mb-2", getPriorityColor(ticket.priority))} />
      
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{getTypeIcon(ticket.type)}</span>
          <span className="text-xs text-muted-foreground font-mono">{ticket.key}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Assign</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Title */}
      <h4 className="text-sm font-medium mb-2 line-clamp-2">{ticket.title}</h4>
      
      {/* Progress */}
      {ticket.progress > 0 && (
        <div className="mb-2">
          <Progress value={ticket.progress} className="h-1" />
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t">
        <div className="flex items-center gap-2">
          {ticket.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{new Date(ticket.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          {ticket.commentsCount && ticket.commentsCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{ticket.commentsCount}</span>
            </div>
          )}
          {ticket.attachmentsCount && ticket.attachmentsCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              <span>{ticket.attachmentsCount}</span>
            </div>
          )}
        </div>
        {ticket.assignee && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={ticket.assignee.image || undefined} />
            <AvatarFallback className="text-xs">
              {ticket.assignee.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  column: Column;
}

function KanbanColumn({ column }: KanbanColumnProps) {
  const { setNodeRef } = useSortable({ id: column.id });

  return (
    <div className="flex-shrink-0 w-72">
      <div className="bg-muted/30 rounded-lg">
        {/* Column Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            <span className="font-medium text-sm">{column.name}</span>
            <Badge variant="secondary" className="text-xs">
              {column.tickets.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Tickets */}
        <ScrollArea className="h-[calc(100vh-280px)]">
          <SortableContext
            items={column.tickets.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div ref={setNodeRef} className="p-2 space-y-2">
              {column.tickets.map((ticket) => (
                <SortableTicket key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticket = columns
      .flatMap((col) => col.tickets)
      .find((t) => t.id === active.id);
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source and destination columns
    let sourceColumn: Column | null = null;
    let destinationColumn: Column | null = null;
    let movedTicket: Ticket | null = null;

    for (const col of columns) {
      const ticketIndex = col.tickets.findIndex((t) => t.id === activeId);
      if (ticketIndex !== -1) {
        sourceColumn = col;
        movedTicket = col.tickets[ticketIndex];
        break;
      }
    }

    for (const col of columns) {
      if (col.id === overId) {
        destinationColumn = col;
        break;
      }
      if (col.tickets.some((t) => t.id === overId)) {
        destinationColumn = col;
        break;
      }
    }

    if (!sourceColumn || !destinationColumn || !movedTicket) return;

    // If dropping on a column
    if (columns.some((col) => col.id === overId)) {
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === sourceColumn!.id) {
            return { ...col, tickets: col.tickets.filter((t) => t.id !== activeId) };
          }
          if (col.id === overId) {
            return {
              ...col,
              tickets: [...col.tickets, { ...movedTicket!, status: overId.toUpperCase().replace("-", "_") }],
            };
          }
          return col;
        })
      );
    }
    // If dropping on another ticket
    else {
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === sourceColumn!.id) {
            return { ...col, tickets: col.tickets.filter((t) => t.id !== activeId) };
          }
          if (col.id === destinationColumn!.id) {
            const overIndex = col.tickets.findIndex((t) => t.id === overId);
            const newTickets = [...col.tickets];
            newTickets.splice(overIndex, 0, { ...movedTicket!, status: col.id.toUpperCase().replace("-", "_") });
            return { ...col, tickets: newTickets };
          }
          return col;
        })
      );
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Kanban Board</CardTitle>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Ticket
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto p-4">
            <SortableContext items={columns.map((c) => c.id)}>
              {columns.map((column) => (
                <KanbanColumn key={column.id} column={column} />
              ))}
            </SortableContext>
          </div>
          <DragOverlay>
            {activeTicket && <SortableTicket ticket={activeTicket} />}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
}
