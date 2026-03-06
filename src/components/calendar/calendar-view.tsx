"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, addMonths, subMonths } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  AlertCircle,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "deadline" | "meeting" | "reminder" | "milestone";
  color: string;
  ticketKey?: string;
  project?: string;
  assignee?: { name: string; image?: string };
}

const sampleEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Website Redesign Deadline",
    date: new Date(2024, 11, 15),
    type: "deadline",
    color: "#EF4444",
    ticketKey: "PROJ-103",
    project: "Website Redesign",
    assignee: { name: "John Doe" },
  },
  {
    id: "2",
    title: "Sprint Planning Meeting",
    date: new Date(2024, 11, 18),
    type: "meeting",
    color: "#3B82F6",
    project: "Mobile App MVP",
  },
  {
    id: "3",
    title: "API Integration Due",
    date: new Date(2024, 11, 20),
    type: "deadline",
    color: "#F59E0B",
    ticketKey: "PROJ-145",
    project: "API Development",
    assignee: { name: "Alice Smith" },
  },
  {
    id: "4",
    title: "Team Standup",
    date: new Date(2024, 11, 16),
    type: "meeting",
    color: "#8B5CF6",
  },
  {
    id: "5",
    title: "MVP Release Milestone",
    date: new Date(2024, 11, 25),
    type: "milestone",
    color: "#10B981",
    project: "Mobile App MVP",
  },
  {
    id: "6",
    title: "Design Review",
    date: new Date(2024, 11, 17),
    type: "meeting",
    color: "#3B82F6",
    project: "Website Redesign",
    assignee: { name: "Mike Johnson" },
  },
  {
    id: "7",
    title: "Documentation Due",
    date: new Date(2024, 11, 22),
    type: "deadline",
    color: "#EF4444",
    ticketKey: "PROJ-120",
    project: "API Development",
  },
  {
    id: "8",
    title: "Testing Phase Start",
    date: new Date(2024, 11, 28),
    type: "milestone",
    color: "#10B981",
    project: "Mobile App MVP",
  },
];

const eventTypeIcons: Record<string, React.ReactNode> = {
  deadline: <AlertCircle className="h-4 w-4" />,
  meeting: <Clock className="h-4 w-4" />,
  reminder: <Clock className="h-4 w-4" />,
  milestone: <span className="text-sm">🚩</span>,
};

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events] = useState(sampleEvents);

  const selectedDateEvents = selectedDate
    ? events.filter((event) => isSameDay(event.date, selectedDate))
    : [];

  const upcomingEvents = events
    .filter((event) => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const goToToday = () => {
    setSelectedDate(new Date());
    setCurrentMonth(new Date());
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex h-[calc(100vh-280px)]">
          {/* Calendar */}
          <div className="flex-1 border-r p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border"
              modifiers={{
                hasEvent: events.map((e) => e.date),
              }}
              modifiersStyles={{
                hasEvent: {
                  position: "relative",
                  fontWeight: "bold",
                },
              }}
            />
          </div>

          {/* Events sidebar */}
          <div className="w-80 flex flex-col">
            {/* Selected date events */}
            <div className="border-b p-4">
              <h3 className="font-medium text-sm mb-3">
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
              </h3>
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events for this date</p>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div
                        className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${event.color}20`, color: event.color }}
                      >
                        {eventTypeIcons[event.type]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {event.ticketKey && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {event.ticketKey}
                            </span>
                          )}
                          {event.project && (
                            <Badge variant="secondary" className="text-xs">
                              {event.project}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {event.assignee && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={event.assignee.image} />
                          <AvatarFallback className="text-xs">
                            {event.assignee.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming events */}
            <div className="flex-1 p-4">
              <h3 className="font-medium text-sm mb-3">Upcoming Events</h3>
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedDate(event.date);
                        setCurrentMonth(event.date);
                      }}
                    >
                      <div
                        className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${event.color}20`, color: event.color }}
                      >
                        {eventTypeIcons[event.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(event.date, "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
