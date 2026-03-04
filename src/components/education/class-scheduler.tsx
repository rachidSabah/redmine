"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  BookOpen,
  Save,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  School,
} from "lucide-react";
import { format, getDaysInMonth, getDay, startOfMonth, addMonths, subMonths } from "date-fns";

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  specialization?: string;
}

interface Module {
  id: string;
  name: string;
  code?: string;
  color?: string;
  creditHours?: number;
}

interface ScheduleEntry {
  id: string;
  date: Date;
  teacherId?: string;
  moduleId?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  dayOfWeek: number;
  teacher?: Teacher;
  module?: Module;
}

interface MonthlySchedule {
  id: string;
  classId: string;
  month: number;
  year: number;
  schoolName?: string;
  isPublished: boolean;
  entries: ScheduleEntry[];
}

interface EduClass {
  id: string;
  name: string;
  grade?: string;
  section?: string;
}

interface SchoolSettings {
  schoolName: string;
}

interface ClassSchedulerProps {
  classes: EduClass[];
  teachers: Teacher[];
  modules: Module[];
  schoolSettings: SchoolSettings | null;
  organizationId: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function ClassScheduler({ 
  classes, 
  teachers, 
  modules, 
  schoolSettings,
}: ClassSchedulerProps) {
  const { toast } = useToast();

  // State for selectors
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // State for schedule data
  const [schedule, setSchedule] = useState<MonthlySchedule | null>(null);
  const [entries, setEntries] = useState<Map<string, ScheduleEntry>>(new Map());
  
  // State for UI
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Generate year options (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Fetch schedule when selections change
  const fetchSchedule = useCallback(async () => {
    if (!selectedClassId) {
      setSchedule(null);
      setEntries(new Map());
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/education/schedules?classId=${selectedClassId}&month=${selectedMonth}&year=${selectedYear}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const scheduleData = data.data?.schedule || data.schedule;
        const entriesData = data.data?.entries || data.entries || [];
        
        setSchedule(scheduleData);
        
        // Convert entries array to map for easy lookup
        const entriesMap = new Map<string, ScheduleEntry>();
        entriesData.forEach((entry: ScheduleEntry) => {
          const dateKey = format(new Date(entry.date), "yyyy-MM-dd");
          entriesMap.set(dateKey, entry);
        });
        
        setEntries(entriesMap);
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
      toast({
        title: "Error",
        description: "Failed to fetch schedule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedMonth, selectedYear, toast]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Get days in the selected month
  const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth - 1));

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newDate = subMonths(new Date(selectedYear, selectedMonth - 1), 1);
    setSelectedMonth(newDate.getMonth() + 1);
    setSelectedYear(newDate.getFullYear());
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newDate = addMonths(new Date(selectedYear, selectedMonth - 1), 1);
    setSelectedMonth(newDate.getMonth() + 1);
    setSelectedYear(newDate.getFullYear());
  };

  // Update entry for a specific date
  const updateEntry = (dateKey: string, updates: Partial<ScheduleEntry>) => {
    setEntries(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(dateKey);
      
      const date = new Date(dateKey);
      newMap.set(dateKey, {
        id: existing?.id || `temp-${dateKey}`,
        date,
        dayOfWeek: getDay(date),
        ...existing,
        ...updates,
      });
      
      return newMap;
    });
    setHasChanges(true);
  };

  // Clear entry for a specific date
  const clearEntry = (dateKey: string) => {
    setEntries(prev => {
      const newMap = new Map(prev);
      newMap.delete(dateKey);
      return newMap;
    });
    setHasChanges(true);
  };

  // Save schedule
  const saveSchedule = async () => {
    if (!selectedClassId) {
      toast({
        title: "Error",
        description: "Please select a class",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const entriesArray = Array.from(entries.values()).map(entry => ({
        date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
        teacherId: entry.teacherId || null,
        moduleId: entry.moduleId || null,
        startTime: entry.startTime || null,
        endTime: entry.endTime || null,
        notes: entry.notes || null,
      }));

      const response = await fetch("/api/education/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          month: selectedMonth,
          year: selectedYear,
          schoolName: schoolSettings?.schoolName,
          entries: entriesArray,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Schedule saved successfully",
        });
        setHasChanges(false);
        fetchSchedule();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save schedule",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save schedule",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Export schedule
  const exportSchedule = async () => {
    if (!selectedClassId) {
      toast({
        title: "Error",
        description: "Please select a class",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/education/export?type=schedule&classId=${selectedClassId}&month=${selectedMonth}&year=${selectedYear}&format=csv`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `schedule_${selectedClassId}_${selectedMonth}_${selectedYear}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast({
          title: "Error",
          description: "Failed to export schedule",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export schedule",
        variant: "destructive",
      });
    }
  };

  // Clear entire schedule
  const clearSchedule = async () => {
    if (!confirm("Are you sure you want to clear the entire schedule?")) {
      return;
    }

    setEntries(new Map());
    setHasChanges(true);
  };

  // Render day cell
  const renderDayCell = (day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    const dateKey = format(date, "yyyy-MM-dd");
    const dayOfWeek = getDay(date);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const entry = entries.get(dateKey);

    return (
      <Card 
        key={dateKey} 
        className={cn(
          "min-h-[180px]",
          isWeekend && "bg-muted/30"
        )}
      >
        <CardHeader className="p-2 pb-1">
          <div className="flex items-center justify-between">
            <Badge variant={isWeekend ? "secondary" : "outline"}>
              {day}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {DAYS[dayOfWeek].slice(0, 3)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-0 space-y-2">
          <Select
            value={entry?.teacherId || ""}
            onValueChange={(value) => updateEntry(dateKey, { teacherId: value || undefined })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map(teacher => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={entry?.moduleId || ""}
            onValueChange={(value) => updateEntry(dateKey, { moduleId: value || undefined })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              {modules.map(module => (
                <SelectItem key={module.id} value={module.id}>
                  <div className="flex items-center gap-2">
                    {module.color && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: module.color }}
                      />
                    )}
                    {module.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Input
              type="time"
              className="h-7 text-xs flex-1"
              placeholder="Start"
              value={entry?.startTime || ""}
              onChange={(e) => updateEntry(dateKey, { startTime: e.target.value || undefined })}
            />
            <Input
              type="time"
              className="h-7 text-xs flex-1"
              placeholder="End"
              value={entry?.endTime || ""}
              onChange={(e) => updateEntry(dateKey, { endTime: e.target.value || undefined })}
            />
          </div>

          <Textarea
            className="h-12 text-xs resize-none"
            placeholder="Notes..."
            value={entry?.notes || ""}
            onChange={(e) => updateEntry(dateKey, { notes: e.target.value || undefined })}
          />

          {entry && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-6 text-xs text-destructive hover:text-destructive"
              onClick={() => clearEntry(dateKey)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Class Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* School Name Display */}
            <div className="flex items-center gap-2">
              <School className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {schoolSettings?.schoolName || "School Name Not Set"}
              </span>
            </div>

            {/* Class Selector */}
            <div>
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(eduClass => (
                    <SelectItem key={eduClass.id} value={eduClass.id}>
                      {eduClass.name} {eduClass.grade && `(${eduClass.grade})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Selector */}
            <div>
              <Label>Month</Label>
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Selector */}
            <div>
              <Label>Year</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous Month
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            Next Month
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSchedule}
            disabled={loading || !selectedClassId}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={clearSchedule}
            disabled={!selectedClassId || entries.size === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear Schedule
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportSchedule}
            disabled={!selectedClassId || entries.size === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button 
            size="sm" 
            onClick={saveSchedule}
            disabled={!selectedClassId || saving || !hasChanges}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save Schedule"}
          </Button>
        </div>
      </div>

      {/* Schedule Status */}
      {hasChanges && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 p-2 rounded">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          You have unsaved changes
        </div>
      )}

      {/* Monthly Calendar View */}
      {selectedClassId ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </CardTitle>
              <Badge variant="outline">
                {entries.size} entries
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium p-2 bg-muted/50 rounded">
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the start of the month */}
              {Array.from({ length: getDay(startOfMonth(new Date(selectedYear, selectedMonth - 1))) }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[180px]" />
              ))}
              
              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => renderDayCell(i + 1))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a class to view and edit the schedule</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
