"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  Users,
  UserCog,
  BookOpen,
  Calendar,
  Settings,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  User,
  Clock,
  School,
  MessageSquare,
  X,
  Send,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

// Types
interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianAddress?: string;
  guardianRelation?: string;
  guardian2Name?: string;
  guardian2Phone?: string;
  guardian2Email?: string;
  guardian2Address?: string;
  guardian2Relation?: string;
  classId?: string;
  sessionId?: string;
  enrollmentDate?: string;
  sessionStartDate?: string;
  status: string;
  class?: { id: string; name: string; grade?: string };
  session?: { id: string; name: string };
  grades?: { id: string; subject: string; grade?: string; score?: number }[];
  _count?: { grades: number; attendance: number };
}

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  qualification?: string;
  specialization?: string;
  joiningDate?: string;
  status: string;
  classes?: { id: string; name: string; grade?: string }[];
  _count?: { classes: number };
}

interface EduClass {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  teacherId?: string;
  sessionId?: string;
  capacity: number;
  roomNumber?: string;
  teacher?: { id: string; firstName: string; lastName: string; employeeId: string };
  session?: { id: string; name: string };
  _count?: { students: number };
}

interface EduSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isCurrent: boolean;
  description?: string;
  _count?: { classes: number; students: number };
}

interface SchoolSettings {
  id: string;
  schoolName: string;
  schoolLogo?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  principalName?: string;
}

export function EducationDashboard() {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<EduClass[]>([]);
  const [sessions, setSessions] = useState<EduSession[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);

  // Dialog states
  const [studentDialog, setStudentDialog] = useState(false);
  const [teacherDialog, setTeacherDialog] = useState(false);
  const [classDialog, setClassDialog] = useState(false);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [gradeDialog, setGradeDialog] = useState(false);
  const [messageDialog, setMessageDialog] = useState(false);

  // Edit states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingClass, setEditingClass] = useState<EduClass | null>(null);
  const [editingSession, setEditingSession] = useState<EduSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState<Student | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [messageTemplates, setMessageTemplates] = useState([
    { id: "greeting", name: "Default Greeting", template: "Dear Parent/Guardian of {{student_name}}, this is a message from {{school_name}}." },
    { id: "reminder", name: "Activity Reminder", template: "Dear Parent/Guardian, we would like to remind you about the upcoming school activities for {{student_name}}. Thank you." },
    { id: "absence", name: "Absence Notification", template: "Dear Parent/Guardian, we noticed that {{student_name}} was absent today. Please contact the school if there are any concerns. - {{school_name}}" },
    { id: "late", name: "Late Arrival", template: "Dear Parent/Guardian, {{student_name}} arrived late to school today. Please ensure timely attendance. - {{school_name}}" },
  ]);

  // Form states
  const [studentForm, setStudentForm] = useState({
    studentId: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
    guardianAddress: "",
    guardianRelation: "",
    guardian2Name: "",
    guardian2Phone: "",
    guardian2Email: "",
    guardian2Address: "",
    guardian2Relation: "",
    classId: "",
    sessionId: "",
    enrollmentDate: "",
    sessionStartDate: "",
    status: "active",
  });

  const [teacherForm, setTeacherForm] = useState({
    employeeId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    gender: "",
    qualification: "",
    specialization: "",
    joiningDate: "",
    status: "active",
  });

  const [classForm, setClassForm] = useState({
    name: "",
    grade: "",
    section: "",
    teacherId: "",
    sessionId: "",
    capacity: 30,
    roomNumber: "",
  });

  const [sessionForm, setSessionForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
    isCurrent: false,
  });

  const [settingsForm, setSettingsForm] = useState({
    schoolName: "",
    schoolLogo: "",
    schoolAddress: "",
    schoolPhone: "",
    schoolEmail: "",
    principalName: "",
  });

  // Search states
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");

  // Attendance states
  const [attendanceClassId, setAttendanceClassId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceSessionId, setAttendanceSessionId] = useState("");
  const [attendanceStudents, setAttendanceStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: string; remarks: string }>>({});
  const [attendanceStats, setAttendanceStats] = useState<{ total: number; present: number; absent: number; late: number; excused: number } | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    // Don't fetch if session is still loading
    if (status === "loading") return;
    
    // If not authenticated, show message and stop loading
    if (status === "unauthenticated" || !session?.user) {
      setLoading(false);
      setError("Please log in to view education data");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log("[Education] Fetching data for user:", session.user.email);
      
      const [studentsRes, teachersRes, classesRes, sessionsRes, settingsRes] = await Promise.all([
        fetch("/api/education/students"),
        fetch("/api/education/teachers"),
        fetch("/api/education/classes"),
        fetch("/api/education/sessions"),
        fetch("/api/education/school-settings"),
      ]);

      console.log("[Education] API Responses:", {
        students: studentsRes.status,
        teachers: teachersRes.status,
        classes: classesRes.status,
        sessions: sessionsRes.status,
        settings: settingsRes.status,
      });

      // Handle students response
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        console.log("[Education] Students data:", data);
        // API returns { success: true, data: { students: [...] } }
        setStudents(data.data?.students || data.students || []);
      } else {
        const errData = await studentsRes.json().catch(() => ({}));
        console.error("[Education] Students API error:", errData);
      }

      // Handle teachers response
      if (teachersRes.ok) {
        const data = await teachersRes.json();
        console.log("[Education] Teachers data:", data);
        // API returns { success: true, data: { teachers: [...] } }
        setTeachers(data.data?.teachers || data.teachers || []);
      } else {
        const errData = await teachersRes.json().catch(() => ({}));
        console.error("[Education] Teachers API error:", errData);
      }

      // Handle classes response
      if (classesRes.ok) {
        const data = await classesRes.json();
        console.log("[Education] Classes data:", data);
        // API returns { success: true, data: { classes: [...] } }
        setClasses(data.data?.classes || data.classes || []);
      } else {
        const errData = await classesRes.json().catch(() => ({}));
        console.error("[Education] Classes API error:", errData);
      }

      // Handle sessions response
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        console.log("[Education] Sessions data:", data);
        // API returns { success: true, data: { sessions: [...] } }
        setSessions(data.data?.sessions || data.sessions || []);
      } else {
        const errData = await sessionsRes.json().catch(() => ({}));
        console.error("[Education] Sessions API error:", errData);
      }

      // Handle settings response
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        console.log("[Education] Settings data:", data);
        // API returns { success: true, data: { settings: {...} } }
        const settings = data.data?.settings || data.settings;
        setSchoolSettings(settings);
        if (settings) {
          setSettingsForm({
            schoolName: settings.schoolName || "",
            schoolLogo: settings.schoolLogo || "",
            schoolAddress: settings.schoolAddress || "",
            schoolPhone: settings.schoolPhone || "",
            schoolEmail: settings.schoolEmail || "",
            principalName: settings.principalName || "",
          });
        }
      } else {
        const errData = await settingsRes.json().catch(() => ({}));
        console.error("[Education] Settings API error:", errData);
      }

    } catch (error) {
      console.error("[Education] Error fetching education data:", error);
      setError("Failed to fetch education data. Please try again.");
      toast({
        title: "Error",
        description: "Failed to fetch education data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session, status, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Student handlers
  const handleCreateStudent = async () => {
    try {
      const res = await fetch("/api/education/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Student created successfully" });
        setStudentDialog(false);
        resetStudentForm();
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create student", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create student", variant: "destructive" });
    }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    try {
      const res = await fetch("/api/education/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingStudent.id, ...studentForm }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Student updated successfully" });
        setStudentDialog(false);
        setEditingStudent(null);
        resetStudentForm();
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to update student", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update student", variant: "destructive" });
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/education/students?id=${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({ title: "Success", description: "Student deleted successfully" });
        setDeleteDialog(false);
        setDeleteTarget(null);
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete student", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete student", variant: "destructive" });
    }
  };

  // Teacher handlers
  const handleCreateTeacher = async () => {
    try {
      const res = await fetch("/api/education/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Teacher created successfully" });
        setTeacherDialog(false);
        resetTeacherForm();
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create teacher", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create teacher", variant: "destructive" });
    }
  };

  const handleUpdateTeacher = async () => {
    if (!editingTeacher) return;
    try {
      const res = await fetch("/api/education/teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTeacher.id, ...teacherForm }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Teacher updated successfully" });
        setTeacherDialog(false);
        setEditingTeacher(null);
        resetTeacherForm();
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to update teacher", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update teacher", variant: "destructive" });
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/education/teachers?id=${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({ title: "Success", description: "Teacher deleted successfully" });
        setDeleteDialog(false);
        setDeleteTarget(null);
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete teacher", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete teacher", variant: "destructive" });
    }
  };

  // Class handlers
  const handleCreateClass = async () => {
    try {
      const res = await fetch("/api/education/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Class created successfully" });
        setClassDialog(false);
        resetClassForm();
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create class", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create class", variant: "destructive" });
    }
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;
    try {
      const res = await fetch("/api/education/classes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingClass.id, ...classForm }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Class updated successfully" });
        setClassDialog(false);
        setEditingClass(null);
        resetClassForm();
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to update class", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update class", variant: "destructive" });
    }
  };

  const handleDeleteClass = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/education/classes?id=${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({ title: "Success", description: "Class deleted successfully" });
        setDeleteDialog(false);
        setDeleteTarget(null);
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete class", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete class", variant: "destructive" });
    }
  };

  // Session handlers
  const handleCreateSession = async () => {
    try {
      const res = await fetch("/api/education/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Session created successfully" });
        setSessionDialog(false);
        resetSessionForm();
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create session", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create session", variant: "destructive" });
    }
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;
    try {
      const res = await fetch("/api/education/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingSession.id, ...sessionForm }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Session updated successfully" });
        setSessionDialog(false);
        setEditingSession(null);
        resetSessionForm();
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to update session", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update session", variant: "destructive" });
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/education/sessions?id=${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({ title: "Success", description: "Session deleted successfully" });
        setDeleteDialog(false);
        setDeleteTarget(null);
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete session", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete session", variant: "destructive" });
    }
  };

  // Settings handler
  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/education/school-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });

      if (res.ok) {
        toast({ title: "Success", description: "School settings saved successfully" });
        setSettingsDialog(false);
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to save settings", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    }
  };

  // Reset forms
  const resetStudentForm = () => {
    setStudentForm({
      studentId: "",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      email: "",
      phone: "",
      address: "",
      guardianName: "",
      guardianPhone: "",
      guardianEmail: "",
      guardianAddress: "",
      guardianRelation: "",
      guardian2Name: "",
      guardian2Phone: "",
      guardian2Email: "",
      guardian2Address: "",
      guardian2Relation: "",
      classId: "",
      sessionId: "",
      enrollmentDate: "",
      sessionStartDate: "",
      status: "active",
    });
  };

  const resetTeacherForm = () => {
    setTeacherForm({
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      gender: "",
      qualification: "",
      specialization: "",
      joiningDate: "",
      status: "active",
    });
  };

  const resetClassForm = () => {
    setClassForm({
      name: "",
      grade: "",
      section: "",
      teacherId: "",
      sessionId: "",
      capacity: 30,
      roomNumber: "",
    });
  };

  const resetSessionForm = () => {
    setSessionForm({
      name: "",
      startDate: "",
      endDate: "",
      description: "",
      isCurrent: false,
    });
  };

  // WhatsApp message handler
  const handleSendMessage = (student: Student) => {
    if (!student.guardianPhone) {
      toast({ title: "Error", description: "No guardian phone number available", variant: "destructive" });
      return;
    }
    setSelectedStudentForMessage(student);
    setMessageDialog(true);
  };

  const sendWhatsAppMessage = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, "_blank");
  };

  // Attendance Management Functions
  const loadAttendance = async () => {
    if (!attendanceClassId || !attendanceDate) {
      toast({ title: "Error", description: "Please select a class and date", variant: "destructive" });
      return;
    }

    try {
      // Get students for the selected class
      const classStudents = students.filter(s => s.classId === attendanceClassId);
      setAttendanceStudents(classStudents);

      // Load existing attendance for this class and date
      const res = await fetch(`/api/education/attendance?classId=${attendanceClassId}&date=${attendanceDate}`);
      if (res.ok) {
        const data = await res.json();
        const records = data.data?.attendance || data.attendance || [];
        const stats = data.data?.stats || data.stats || null;
        
        // Convert records to a map for easy lookup
        const recordMap: Record<string, { status: string; remarks: string }> = {};
        records.forEach((r: any) => {
          recordMap[r.studentId] = {
            status: r.status,
            remarks: r.remarks || "",
          };
        });
        
        // Initialize all students with default status
        classStudents.forEach(student => {
          if (!recordMap[student.id]) {
            recordMap[student.id] = { status: "present", remarks: "" };
          }
        });
        
        setAttendanceRecords(recordMap);
        setAttendanceStats(stats || {
          total: classStudents.length,
          present: classStudents.length,
          absent: 0,
          late: 0,
          excused: 0,
        });
      }

      // Load attendance history
      const historyRes = await fetch(`/api/education/attendance?limit=20`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setAttendanceHistory(historyData.data?.attendance || historyData.attendance || []);
      }
    } catch (error) {
      console.error("Error loading attendance:", error);
      toast({ title: "Error", description: "Failed to load attendance data", variant: "destructive" });
    }
  };

  const updateStudentAttendance = (studentId: string, status: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
    
    // Update stats
    const records = { ...attendanceRecords, [studentId]: { ...attendanceRecords[studentId], status } };
    const stats = {
      total: attendanceStudents.length,
      present: Object.values(records).filter(r => r.status === "present").length,
      absent: Object.values(records).filter(r => r.status === "absent").length,
      late: Object.values(records).filter(r => r.status === "late").length,
      excused: Object.values(records).filter(r => r.status === "excused").length,
    };
    setAttendanceStats(stats);
  };

  const updateStudentRemarks = (studentId: string, remarks: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const markAllStudents = (status: string) => {
    const newRecords: Record<string, { status: string; remarks: string }> = {};
    attendanceStudents.forEach(student => {
      newRecords[student.id] = { status, remarks: "" };
    });
    setAttendanceRecords(newRecords);
    
    setAttendanceStats({
      total: attendanceStudents.length,
      present: status === "present" ? attendanceStudents.length : 0,
      absent: status === "absent" ? attendanceStudents.length : 0,
      late: status === "late" ? attendanceStudents.length : 0,
      excused: status === "excused" ? attendanceStudents.length : 0,
    });
  };

  const saveAttendance = async () => {
    if (!attendanceDate) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }

    setSavingAttendance(true);
    try {
      const records = Object.entries(attendanceRecords).map(([studentId, data]) => ({
        studentId,
        classId: attendanceClassId,
        sessionId: attendanceSessionId || undefined,
        date: attendanceDate,
        status: data.status,
        remarks: data.remarks,
      }));

      const res = await fetch("/api/education/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({ 
          title: "Success", 
          description: `Saved ${records.length} attendance records. ${data.data?.automationTriggers || data.automationTriggers || 0} notifications triggered.` 
        });
        loadAttendance();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to save attendance", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast({ title: "Error", description: "Failed to save attendance", variant: "destructive" });
    } finally {
      setSavingAttendance(false);
    }
  };

  // Stats
  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter(s => s.status === "active").length,
    totalTeachers: teachers.length,
    activeTeachers: teachers.filter(t => t.status === "active").length,
    totalClasses: classes.length,
    totalSessions: sessions.length,
    currentSession: sessions.find(s => s.isCurrent),
  };

  // Show loading spinner while session is loading or data is being fetched
  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading education data...</p>
      </div>
    );
  }

  // Show error if not authenticated or other error
  if (status === "unauthenticated" || !session?.user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h3 className="text-lg font-semibold">Authentication Required</h3>
        <p className="text-muted-foreground">Please log in to access the Education module.</p>
        <Button onClick={() => window.location.href = "/auth/signin"}>Sign In</Button>
      </div>
    );
  }

  // Show error message if there was an error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h3 className="text-lg font-semibold">Error Loading Data</h3>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Education
          </h2>
          <p className="text-muted-foreground">
            {schoolSettings?.schoolName || "School Management System"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">{stats.activeStudents} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">{stats.activeTeachers} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Session</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentSession?.name || "Not Set"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="templates">Messages</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Students</CardTitle>
              </CardHeader>
              <CardContent>
                {students.slice(0, 5).map(student => (
                  <div key={student.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-muted-foreground">{student.studentId}</p>
                      </div>
                    </div>
                    <Badge variant={student.status === "active" ? "default" : "secondary"}>
                      {student.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Classes Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {classes.slice(0, 5).map(cls => (
                  <div key={cls.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.teacher ? `${cls.teacher.firstName} ${cls.teacher.lastName}` : "No teacher"}
                      </p>
                    </div>
                    <Badge variant="outline">{cls._count?.students || 0} students</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={() => {
              resetStudentForm();
              setEditingStudent(null);
              setStudentDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">Student ID</th>
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Class</th>
                      <th className="text-left p-4 font-medium">Guardian</th>
                      <th className="text-left p-4 font-medium">Phone</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter(s => 
                        studentSearch === "" || 
                        `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        s.studentId.toLowerCase().includes(studentSearch.toLowerCase())
                      )
                      .map(student => (
                        <tr key={student.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-4 text-sm">{student.studentId}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm">{student.class?.name || "-"}</td>
                          <td className="p-4 text-sm">{student.guardianName || "-"}</td>
                          <td className="p-4 text-sm">{student.guardianPhone || "-"}</td>
                          <td className="p-4">
                            <Badge variant={student.status === "active" ? "default" : "secondary"}>
                              {student.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setEditingStudent(student);
                                  setStudentForm({
                                    studentId: student.studentId,
                                    firstName: student.firstName,
                                    lastName: student.lastName,
                                    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : "",
                                    gender: student.gender || "",
                                    email: student.email || "",
                                    phone: student.phone || "",
                                    address: student.address || "",
                                    guardianName: student.guardianName || "",
                                    guardianPhone: student.guardianPhone || "",
                                    guardianEmail: student.guardianEmail || "",
                                    guardianAddress: student.guardianAddress || "",
                                    guardianRelation: student.guardianRelation || "",
                                    guardian2Name: student.guardian2Name || "",
                                    guardian2Phone: student.guardian2Phone || "",
                                    guardian2Email: student.guardian2Email || "",
                                    guardian2Address: student.guardian2Address || "",
                                    guardian2Relation: student.guardian2Relation || "",
                                    classId: student.classId || "",
                                    sessionId: student.sessionId || "",
                                    enrollmentDate: student.enrollmentDate ? student.enrollmentDate.split('T')[0] : "",
                                    sessionStartDate: student.sessionStartDate ? student.sessionStartDate.split('T')[0] : "",
                                    status: student.status,
                                  });
                                  setStudentDialog(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleSendMessage(student)}
                                disabled={!student.guardianPhone}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setDeleteTarget({ type: "student", id: student.id });
                                  setDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teachers..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={() => {
              resetTeacherForm();
              setEditingTeacher(null);
              setTeacherDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">Employee ID</th>
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Phone</th>
                      <th className="text-left p-4 font-medium">Classes</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers
                      .filter(t => 
                        teacherSearch === "" || 
                        `${t.firstName} ${t.lastName}`.toLowerCase().includes(teacherSearch.toLowerCase()) ||
                        t.employeeId.toLowerCase().includes(teacherSearch.toLowerCase())
                      )
                      .map(teacher => (
                        <tr key={teacher.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-4 text-sm">{teacher.employeeId}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{teacher.firstName[0]}{teacher.lastName[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{teacher.firstName} {teacher.lastName}</p>
                                {teacher.specialization && (
                                  <p className="text-xs text-muted-foreground">{teacher.specialization}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm">{teacher.email || "-"}</td>
                          <td className="p-4 text-sm">{teacher.phone || "-"}</td>
                          <td className="p-4">
                            <Badge variant="outline">{teacher._count?.classes || 0} classes</Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={teacher.status === "active" ? "default" : "secondary"}>
                              {teacher.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setEditingTeacher(teacher);
                                  setTeacherForm({
                                    employeeId: teacher.employeeId,
                                    firstName: teacher.firstName,
                                    lastName: teacher.lastName,
                                    email: teacher.email || "",
                                    phone: teacher.phone || "",
                                    address: teacher.address || "",
                                    dateOfBirth: teacher.dateOfBirth ? teacher.dateOfBirth.split('T')[0] : "",
                                    gender: teacher.gender || "",
                                    qualification: teacher.qualification || "",
                                    specialization: teacher.specialization || "",
                                    joiningDate: teacher.joiningDate ? teacher.joiningDate.split('T')[0] : "",
                                    status: teacher.status,
                                  });
                                  setTeacherDialog(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setDeleteTarget({ type: "teacher", id: teacher.id });
                                  setDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classes Tab */}
        <TabsContent value="classes" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              resetClassForm();
              setEditingClass(null);
              setClassDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map(cls => (
              <Card key={cls.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingClass(cls);
                          setClassForm({
                            name: cls.name,
                            grade: cls.grade || "",
                            section: cls.section || "",
                            teacherId: cls.teacherId || "",
                            sessionId: cls.sessionId || "",
                            capacity: cls.capacity,
                            roomNumber: cls.roomNumber || "",
                          });
                          setClassDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setDeleteTarget({ type: "class", id: cls.id });
                          setDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {cls.grade && `Grade: ${cls.grade}`} {cls.section && `Section: ${cls.section}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teacher:</span>
                      <span>{cls.teacher ? `${cls.teacher.firstName} ${cls.teacher.lastName}` : "Not assigned"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Students:</span>
                      <span>{cls._count?.students || 0} / {cls.capacity}</span>
                    </div>
                    {cls.roomNumber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Room:</span>
                        <span>{cls.roomNumber}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              resetSessionForm();
              setEditingSession(null);
              setSessionDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Session
            </Button>
          </div>

          <div className="grid gap-4">
            {sessions.map(sess => (
              <Card key={sess.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {sess.name}
                        {sess.isCurrent && <Badge>Current</Badge>}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(sess.startDate), "MMM dd, yyyy")} - {format(new Date(sess.endDate), "MMM dd, yyyy")}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingSession(sess);
                          setSessionForm({
                            name: sess.name,
                            startDate: sess.startDate.split('T')[0],
                            endDate: sess.endDate.split('T')[0],
                            description: sess.description || "",
                            isCurrent: sess.isCurrent,
                          });
                          setSessionDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setDeleteTarget({ type: "session", id: sess.id });
                          setDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Classes: </span>
                      <span className="font-medium">{sess._count?.classes || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Students: </span>
                      <span className="font-medium">{sess._count?.students || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          {/* Attendance Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance Management
              </CardTitle>
              <CardDescription>
                Select a class and date to mark or view attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Select Class</Label>
                  <Select value={attendanceClassId || "select-class"} onValueChange={(v) => setAttendanceClassId(v === "select-class" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select-class">Choose a class...</SelectItem>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.grade ? `(${cls.grade})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Session (Optional)</Label>
                  <Select value={attendanceSessionId || "all"} onValueChange={(v) => setAttendanceSessionId(v === "all" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All sessions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sessions</SelectItem>
                      {sessions.map(sess => (
                        <SelectItem key={sess.id} value={sess.id}>
                          {sess.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={loadAttendance} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Load
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Stats */}
          {attendanceStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{attendanceStats.total}</div>
                  <div className="text-xs text-muted-foreground">Total Students</div>
                </CardContent>
              </Card>
              <Card className="border-green-200 dark:border-green-900">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
                  <div className="text-xs text-muted-foreground">Present</div>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-900">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
                  <div className="text-xs text-muted-foreground">Absent</div>
                </CardContent>
              </Card>
              <Card className="border-yellow-200 dark:border-yellow-900">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</div>
                  <div className="text-xs text-muted-foreground">Late</div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 dark:border-blue-900">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{attendanceStats.excused}</div>
                  <div className="text-xs text-muted-foreground">Excused</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance Marking */}
          {attendanceClassId && attendanceDate && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mark Attendance</CardTitle>
                    <CardDescription>
                      {classes.find(c => c.id === attendanceClassId)?.name} - {attendanceDate}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => markAllStudents('present')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      All Present
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={saveAttendance}
                      disabled={savingAttendance}
                    >
                      {savingAttendance ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-1" />
                      )}
                      Save Attendance
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {attendanceStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No students in this class</p>
                    <p className="text-sm mt-2">Add students to the class first</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Student ID</th>
                          <th className="text-left p-3 font-medium">Name</th>
                          <th className="text-left p-3 font-medium">Guardian</th>
                          <th className="text-left p-3 font-medium">Phone</th>
                          <th className="text-center p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Remarks</th>
                          <th className="text-center p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceStudents.map((student) => {
                          const record = attendanceRecords[student.id];
                          return (
                            <tr key={student.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="p-3 text-sm">{student.studentId}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-sm">{student.guardianName || '-'}</td>
                              <td className="p-3 text-sm">{student.guardianPhone || '-'}</td>
                              <td className="p-3">
                                <div className="flex justify-center gap-1">
                                  <Button
                                    variant={record?.status === 'present' ? 'default' : 'outline'}
                                    size="sm"
                                    className={record?.status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                                    onClick={() => updateStudentAttendance(student.id, 'present')}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant={record?.status === 'absent' ? 'default' : 'outline'}
                                    size="sm"
                                    className={record?.status === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                                    onClick={() => updateStudentAttendance(student.id, 'absent')}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant={record?.status === 'late' ? 'default' : 'outline'}
                                    size="sm"
                                    className={record?.status === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                                    onClick={() => updateStudentAttendance(student.id, 'late')}
                                  >
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant={record?.status === 'excused' ? 'default' : 'outline'}
                                    size="sm"
                                    className={record?.status === 'excused' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                                    onClick={() => updateStudentAttendance(student.id, 'excused')}
                                  >
                                    <AlertCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                              <td className="p-3">
                                <Input
                                  placeholder="Add remarks..."
                                  className="h-8 text-sm"
                                  value={record?.remarks || ''}
                                  onChange={(e) => updateStudentRemarks(student.id, e.target.value)}
                                />
                              </td>
                              <td className="p-3 text-center">
                                {student.guardianPhone && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const message = `Dear Parent/Guardian, your child ${student.firstName} ${student.lastName} was marked as ${record?.status || 'not marked'} on ${attendanceDate}. - ${schoolSettings?.schoolName || 'School'}`;
                                      window.open(`https://wa.me/${student.guardianPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                                    }}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Attendance History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Attendance Records
              </CardTitle>
              <CardDescription>
                View recently marked attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance records yet</p>
                  <p className="text-sm mt-2">Select a class and date to mark attendance</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Student</th>
                        <th className="text-left p-3 font-medium">Class</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceHistory.slice(0, 10).map((record) => (
                        <tr key={record.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-3 text-sm">
                            {format(new Date(record.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback>
                                  {record.student?.firstName?.[0]}{record.student?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {record.student?.firstName} {record.student?.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {record.student?.studentId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            {record.student?.class?.name || '-'}
                          </td>
                          <td className="p-3 text-center">
                            <Badge 
                              variant={
                                record.status === 'present' ? 'default' :
                                record.status === 'absent' ? 'destructive' :
                                record.status === 'late' ? 'secondary' : 'outline'
                              }
                              className={
                                record.status === 'present' ? 'bg-green-600' :
                                record.status === 'late' ? 'bg-yellow-600' :
                                record.status === 'excused' ? 'bg-blue-600' : ''
                              }
                            >
                              {record.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {record.remarks || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Grade Management
              </CardTitle>
              <CardDescription>
                Enter and manage student grades with the INFOHAS grading system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Student Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Select Student</Label>
                    <Select onValueChange={(v) => {
                      const student = students.find(s => s.id === v);
                      setSelectedStudent(student || null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} ({s.studentId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-2025">2024-2025</SelectItem>
                        <SelectItem value="2023-2024">2023-2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year Level</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedStudent && (
                  <>
                    {/* Student Info Card */}
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Name:</span>
                            <p className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Student ID:</span>
                            <p className="font-medium">{selectedStudent.studentId}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Class:</span>
                            <p className="font-medium">{selectedStudent.class?.name || "Not assigned"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Session:</span>
                            <p className="font-medium">{selectedStudent.session?.name || "Not assigned"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Grade Entry Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead>
                            <tr className="bg-slate-800 text-white">
                              <th className="p-3 text-left text-sm font-medium w-[8%]">UF</th>
                              <th className="p-3 text-left text-sm font-medium w-[8%]">Code</th>
                              <th className="p-3 text-left text-sm font-medium w-[25%]">Module Title</th>
                              <th className="p-3 text-center text-sm font-medium w-[10%]">CC</th>
                              <th className="p-3 text-center text-sm font-medium w-[10%]">EFCF T</th>
                              <th className="p-3 text-center text-sm font-medium w-[10%]">EFCF P</th>
                              <th className="p-3 text-left text-sm font-medium w-[20%]">Comment</th>
                              <th className="p-3 text-center text-sm font-medium w-[9%]">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b hover:bg-muted/50">
                              <td className="p-3">
                                <Input className="h-8 w-full" placeholder="UF1" defaultValue="UF1" />
                              </td>
                              <td className="p-3">
                                <Input className="h-8 w-full" placeholder="C2.2" defaultValue="C2.2" />
                              </td>
                              <td className="p-3">
                                <Input className="h-8 w-full" placeholder="Module name" />
                              </td>
                              <td className="p-3">
                                <Input type="number" step="0.01" className="h-8 w-full text-center" placeholder="0.00" min="0" max="20" />
                              </td>
                              <td className="p-3">
                                <Input type="number" step="0.01" className="h-8 w-full text-center" placeholder="0.00" min="0" max="20" />
                              </td>
                              <td className="p-3">
                                <Input type="number" step="0.01" className="h-8 w-full text-center" placeholder="0.00" min="0" max="20" />
                              </td>
                              <td className="p-3">
                                <Input className="h-8 w-full" placeholder="Comment" />
                              </td>
                              <td className="p-3 text-center">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Results Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Year Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <table className="w-full text-sm">
                            <tbody>
                              <tr className="border-b">
                                <td className="py-2 text-muted-foreground">MCC (Average of Continuous Controls)</td>
                                <td className="py-2 text-right font-medium">-</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 text-muted-foreground">MEFCFT (Average of Theoretical Exams)</td>
                                <td className="py-2 text-right font-medium">-</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 text-muted-foreground">MEFCFP (Average of Practical Exams)</td>
                                <td className="py-2 text-right font-medium">-</td>
                              </tr>
                              <tr className="bg-green-50 dark:bg-green-900/20">
                                <td className="py-2 font-medium">Final Average</td>
                                <td className="py-2 text-right font-bold text-green-600">-/20</td>
                              </tr>
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Grade Formula</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground">
                              <strong>Final Grade = </strong>
                              (CC × 3 + EFCF T × 2 + EFCF P × 3) / 8
                            </p>
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                              <p className="text-xs text-muted-foreground">Weight Distribution:</p>
                              <ul className="text-xs mt-1 space-y-1">
                                <li>• Continuous Control (CC): 37.5%</li>
                                <li>• Theoretical Exams (EFCF T): 25%</li>
                                <li>• Practical Exams (EFCF P): 37.5%</li>
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Calculate Grades
                      </Button>
                      <Button variant="outline">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Save Grades
                      </Button>
                      <Button variant="secondary">
                        Export Transcript
                      </Button>
                    </div>
                  </>
                )}

                {!selectedStudent && (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a student to enter grades</p>
                    <p className="text-sm mt-2">The INFOHAS grading system supports CC, EFCF T, and EFCF P scores</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message Templates
              </CardTitle>
              <CardDescription>
                Create and manage message templates for automated notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Templates support variables like {`{{student_name}}`}, {`{{date}}`}, {`{{class_name}}`}
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates created yet</p>
                  <p className="text-sm mt-2">Create templates for absence, delay, and reminder messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Communication History
              </CardTitle>
              <CardDescription>
                View all sent messages and their delivery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No communication logs yet</p>
                <p className="text-sm mt-2">Logs will appear here when messages are sent</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                WhatsApp Web Integration
              </CardTitle>
              <CardDescription>
                Send messages to guardians via WhatsApp Web - No API required!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">✅ How It Works</h3>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-2">
                    <li>• Click the message icon (💬) next to any student</li>
                    <li>• Choose a template or write a custom message</li>
                    <li>• Click "Send via WhatsApp" to open WhatsApp Web</li>
                    <li>• Review and send the message from WhatsApp</li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📱 Available Message Templates</h3>
                  <div className="space-y-2">
                    {messageTemplates.map((tmpl) => (
                      <div key={tmpl.id} className="text-sm">
                        <span className="font-medium text-blue-700 dark:text-blue-300">{tmpl.name}:</span>
                        <p className="text-blue-600 dark:text-blue-400 ml-2">{tmpl.template}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">⚡ Variables You Can Use</h3>
                  <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    <p><code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">{"{{student_name}}"}</code> - Student's full name</p>
                    <p><code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">{"{{school_name}}"}</code> - Your school name</p>
                  </div>
                </div>

                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    No API keys or tokens needed - works directly with WhatsApp Web!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message Templates Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Customize Message Templates
              </CardTitle>
              <CardDescription>
                Edit the default message templates for your school
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messageTemplates.map((tmpl, index) => (
                  <div key={tmpl.id} className="space-y-2 p-3 border rounded-lg">
                    <Label className="font-medium">{tmpl.name}</Label>
                    <Textarea
                      value={tmpl.template}
                      onChange={(e) => {
                        const newTemplates = [...messageTemplates];
                        newTemplates[index] = { ...tmpl, template: e.target.value };
                        setMessageTemplates(newTemplates);
                      }}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                ))}
                <Button className="w-full" onClick={() => {
                  toast({ title: "Success", description: "Message templates updated for this session" });
                }}>
                  Save Template Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Student Dialog */}
      <Dialog open={studentDialog} onOpenChange={setStudentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Edit Student" : "Add New Student"}</DialogTitle>
            <DialogDescription>
              {editingStudent ? "Update student information" : "Enter student details"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  value={studentForm.studentId}
                  onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={studentForm.status} onValueChange={(v) => setStudentForm({ ...studentForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="graduated">Graduated</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                    <SelectItem value="dropped">Dropped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={studentForm.firstName}
                  onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={studentForm.lastName}
                  onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={studentForm.dateOfBirth}
                  onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={studentForm.gender || "none"} onValueChange={(v) => setStudentForm({ ...studentForm, gender: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="classId">Class</Label>
                <Select value={studentForm.classId || "no-class"} onValueChange={(v) => setStudentForm({ ...studentForm, classId: v === "no-class" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-class">No class assigned</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={studentForm.address}
                onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
              />
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Primary Guardian</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guardianName">Name</Label>
                  <Input
                    id="guardianName"
                    value={studentForm.guardianName}
                    onChange={(e) => setStudentForm({ ...studentForm, guardianName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianRelation">Relationship</Label>
                  <Select value={studentForm.guardianRelation || "none"} onValueChange={(v) => setStudentForm({ ...studentForm, guardianRelation: v === "none" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="Father">Father</SelectItem>
                      <SelectItem value="Mother">Mother</SelectItem>
                      <SelectItem value="Guardian">Guardian</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="guardianPhone">Phone</Label>
                  <Input
                    id="guardianPhone"
                    value={studentForm.guardianPhone}
                    onChange={(e) => setStudentForm({ ...studentForm, guardianPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianEmail">Email</Label>
                  <Input
                    id="guardianEmail"
                    type="email"
                    value={studentForm.guardianEmail}
                    onChange={(e) => setStudentForm({ ...studentForm, guardianEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="guardianAddress">Address</Label>
                <Input
                  id="guardianAddress"
                  value={studentForm.guardianAddress}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianAddress: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Second Guardian (Optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guardian2Name">Name</Label>
                  <Input
                    id="guardian2Name"
                    value={studentForm.guardian2Name}
                    onChange={(e) => setStudentForm({ ...studentForm, guardian2Name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian2Relation">Relationship</Label>
                  <Select value={studentForm.guardian2Relation || "none"} onValueChange={(v) => setStudentForm({ ...studentForm, guardian2Relation: v === "none" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="Father">Father</SelectItem>
                      <SelectItem value="Mother">Mother</SelectItem>
                      <SelectItem value="Guardian">Guardian</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="guardian2Phone">Phone</Label>
                  <Input
                    id="guardian2Phone"
                    value={studentForm.guardian2Phone}
                    onChange={(e) => setStudentForm({ ...studentForm, guardian2Phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian2Email">Email</Label>
                  <Input
                    id="guardian2Email"
                    type="email"
                    value={studentForm.guardian2Email}
                    onChange={(e) => setStudentForm({ ...studentForm, guardian2Email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="guardian2Address">Address</Label>
                <Input
                  id="guardian2Address"
                  value={studentForm.guardian2Address}
                  onChange={(e) => setStudentForm({ ...studentForm, guardian2Address: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Academic Info</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionId">Session</Label>
                  <Select value={studentForm.sessionId || "no-session"} onValueChange={(v) => setStudentForm({ ...studentForm, sessionId: v === "no-session" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-session">Not assigned</SelectItem>
                      {sessions.map(sess => (
                        <SelectItem key={sess.id} value={sess.id}>{sess.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enrollmentDate">Enrollment Date</Label>
                  <Input
                    id="enrollmentDate"
                    type="date"
                    value={studentForm.enrollmentDate}
                    onChange={(e) => setStudentForm({ ...studentForm, enrollmentDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionStartDate">Session Start Date</Label>
                  <Input
                    id="sessionStartDate"
                    type="date"
                    value={studentForm.sessionStartDate}
                    onChange={(e) => {
                      const startDate = e.target.value;
                      setStudentForm({ ...studentForm, sessionStartDate: startDate });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Completion (9 Months)</Label>
                  <Input
                    disabled
                    value={studentForm.sessionStartDate ? (() => {
                      const start = new Date(studentForm.sessionStartDate);
                      const end = new Date(start);
                      end.setMonth(end.getMonth() + 9);
                      return end.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    })() : "Auto-calculated"}
                    className="bg-muted"
                  />
                </div>
              </div>
              {studentForm.sessionStartDate && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <span className="text-green-600 font-medium">Academic Duration:</span> 9 months from Session Start Date
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialog(false)}>Cancel</Button>
            <Button onClick={editingStudent ? handleUpdateStudent : handleCreateStudent}>
              {editingStudent ? "Update" : "Add"} Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Dialog */}
      <Dialog open={teacherDialog} onOpenChange={setTeacherDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? "Edit Teacher" : "Add New Teacher"}</DialogTitle>
            <DialogDescription>
              {editingTeacher ? "Update teacher information" : "Enter teacher details"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={teacherForm.employeeId}
                  onChange={(e) => setTeacherForm({ ...teacherForm, employeeId: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={teacherForm.status} onValueChange={(v) => setTeacherForm({ ...teacherForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teacherFirstName">First Name *</Label>
                <Input
                  id="teacherFirstName"
                  value={teacherForm.firstName}
                  onChange={(e) => setTeacherForm({ ...teacherForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherLastName">Last Name *</Label>
                <Input
                  id="teacherLastName"
                  value={teacherForm.lastName}
                  onChange={(e) => setTeacherForm({ ...teacherForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teacherEmail">Email</Label>
                <Input
                  id="teacherEmail"
                  type="email"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherPhone">Phone</Label>
                <Input
                  id="teacherPhone"
                  value={teacherForm.phone}
                  onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification</Label>
                <Input
                  id="qualification"
                  value={teacherForm.qualification}
                  onChange={(e) => setTeacherForm({ ...teacherForm, qualification: e.target.value })}
                  placeholder="e.g., PhD, Masters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={teacherForm.specialization}
                  onChange={(e) => setTeacherForm({ ...teacherForm, specialization: e.target.value })}
                  placeholder="e.g., Math, Science"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherAddress">Address</Label>
              <Textarea
                id="teacherAddress"
                value={teacherForm.address}
                onChange={(e) => setTeacherForm({ ...teacherForm, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeacherDialog(false)}>Cancel</Button>
            <Button onClick={editingTeacher ? handleUpdateTeacher : handleCreateTeacher}>
              {editingTeacher ? "Update" : "Add"} Teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Dialog */}
      <Dialog open={classDialog} onOpenChange={setClassDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
            <DialogDescription>
              {editingClass ? "Update class information" : "Enter class details"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="className">Class Name *</Label>
              <Input
                id="className"
                value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                placeholder="e.g., Class 10-A"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={classForm.grade}
                  onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })}
                  placeholder="e.g., 10th Grade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={classForm.section}
                  onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                  placeholder="e.g., A"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classTeacher">Class Teacher</Label>
                <Select value={classForm.teacherId || "no-teacher"} onValueChange={(v) => setClassForm({ ...classForm, teacherId: v === "no-teacher" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-teacher">Not assigned</SelectItem>
                    {teachers.filter(t => t.status === "active").map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="classSession">Session</Label>
                <Select value={classForm.sessionId || "no-session"} onValueChange={(v) => setClassForm({ ...classForm, sessionId: v === "no-session" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-session">Not assigned</SelectItem>
                    {sessions.map(sess => (
                      <SelectItem key={sess.id} value={sess.id}>{sess.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={classForm.capacity}
                  onChange={(e) => setClassForm({ ...classForm, capacity: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomNumber">Room Number</Label>
                <Input
                  id="roomNumber"
                  value={classForm.roomNumber}
                  onChange={(e) => setClassForm({ ...classForm, roomNumber: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialog(false)}>Cancel</Button>
            <Button onClick={editingClass ? handleUpdateClass : handleCreateClass}>
              {editingClass ? "Update" : "Add"} Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Dialog */}
      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSession ? "Edit Session" : "Add New Session"}</DialogTitle>
            <DialogDescription>
              {editingSession ? "Update session information" : "Enter session details. End date is auto-calculated as 9 months from start date."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sessionName">Session Name *</Label>
              <Input
                id="sessionName"
                value={sessionForm.name}
                onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                placeholder="e.g., 2024-2025 Academic Year"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionStart">Start Date *</Label>
                <Input
                  id="sessionStart"
                  type="date"
                  value={sessionForm.startDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionEnd">End Date</Label>
                <Input
                  id="sessionEnd"
                  type="date"
                  value={sessionForm.endDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionDescription">Description</Label>
              <Textarea
                id="sessionDescription"
                value={sessionForm.description}
                onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isCurrent"
                checked={sessionForm.isCurrent}
                onChange={(e) => setSessionForm({ ...sessionForm, isCurrent: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isCurrent">Set as current session</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialog(false)}>Cancel</Button>
            <Button onClick={editingSession ? handleUpdateSession : handleCreateSession}>
              {editingSession ? "Update" : "Add"} Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialog} onOpenChange={setSettingsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>School Settings</DialogTitle>
            <DialogDescription>Configure your school information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name *</Label>
              <Input
                id="schoolName"
                value={settingsForm.schoolName}
                onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schoolPhone">Phone</Label>
                <Input
                  id="schoolPhone"
                  value={settingsForm.schoolPhone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, schoolPhone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolEmail">Email</Label>
                <Input
                  id="schoolEmail"
                  type="email"
                  value={settingsForm.schoolEmail}
                  onChange={(e) => setSettingsForm({ ...settingsForm, schoolEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolAddress">Address</Label>
              <Textarea
                id="schoolAddress"
                value={settingsForm.schoolAddress}
                onChange={(e) => setSettingsForm({ ...settingsForm, schoolAddress: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="principalName">Principal Name</Label>
              <Input
                id="principalName"
                value={settingsForm.principalName}
                onChange={(e) => setSettingsForm({ ...settingsForm, principalName: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message via WhatsApp</DialogTitle>
            <DialogDescription>
              Send a message to {selectedStudentForMessage?.guardianName || "Guardian"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Phone: {selectedStudentForMessage?.guardianPhone}
            </p>
            
            {/* Custom Message Input */}
            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Message</Label>
              <Textarea
                id="customMessage"
                placeholder="Type your custom message here..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  if (selectedStudentForMessage?.guardianPhone && customMessage.trim()) {
                    sendWhatsAppMessage(selectedStudentForMessage.guardianPhone, customMessage);
                  } else if (!customMessage.trim()) {
                    toast({ title: "Error", description: "Please enter a message", variant: "destructive" });
                  }
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Send via WhatsApp
              </Button>
            </div>

            {/* Quick Message Templates */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Quick Templates (Click to Send)</Label>
              <div className="grid gap-2">
                {messageTemplates.map((tmpl) => (
                  <Button 
                    key={tmpl.id}
                    variant="outline" 
                    size="sm"
                    className="justify-start text-left h-auto py-2"
                    onClick={() => {
                      if (selectedStudentForMessage?.guardianPhone) {
                        const message = tmpl.template
                          .replace(/{{student_name}}/g, `${selectedStudentForMessage.firstName} ${selectedStudentForMessage.lastName}`)
                          .replace(/{{school_name}}/g, schoolSettings?.schoolName || "School");
                        sendWhatsAppMessage(selectedStudentForMessage.guardianPhone, message);
                      }
                    }}
                  >
                    <Send className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{tmpl.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Info Note */}
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <strong>Note:</strong> Clicking any button will open WhatsApp Web in a new tab with the message pre-filled. You can edit before sending.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setMessageDialog(false);
              setCustomMessage("");
            }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deleteTarget?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget?.type === "student") handleDeleteStudent();
                else if (deleteTarget?.type === "teacher") handleDeleteTeacher();
                else if (deleteTarget?.type === "class") handleDeleteClass();
                else if (deleteTarget?.type === "session") handleDeleteSession();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
