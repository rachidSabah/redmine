"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  FileText,
  Download,
  Filter,
  Calculator,
  Award,
  TrendingUp,
  ExternalLink,
  Save,
  Eye,
  Copy,
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
  grades?: { id: string; subject: string; grade?: string; score?: number; gradeType?: string; period?: string }[];
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

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  subject?: string;
  body: string;
  variables?: string[];
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

interface CommunicationLog {
  id: string;
  studentId?: string;
  recipientPhone: string;
  recipientName?: string;
  messageContent: string;
  channel: string;
  status: string;
  errorMessage?: string;
  triggeredBy?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
  };
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  classId?: string;
  sessionId?: string;
  date: string;
  status: string;
  remarks?: string;
  markedBy?: string;
  student?: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    class?: { id: string; name: string };
  };
}

interface StudentGrade {
  id: string;
  studentId: string;
  sessionId?: string;
  classId?: string;
  subject: string;
  term?: string;
  grade?: string;
  score?: number;
  maxScore?: number;
  gradeType?: string;
  period?: string;
  comments?: string;
  gradedAt?: string;
}

export function EducationDashboard() {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<EduClass[]>([]);
  const [sessions, setSessions] = useState<EduSession[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);

  // Dialog states
  const [studentDialog, setStudentDialog] = useState(false);
  const [teacherDialog, setTeacherDialog] = useState(false);
  const [classDialog, setClassDialog] = useState(false);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [gradeDialog, setGradeDialog] = useState(false);
  const [messageDialog, setMessageDialog] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [transcriptDialog, setTranscriptDialog] = useState(false);

  // Edit states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingClass, setEditingClass] = useState<EduClass | null>(null);
  const [editingSession, setEditingSession] = useState<EduSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState<Student | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  // Attendance states
  const [attendanceClassId, setAttendanceClassId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [attendanceRecords_local, setAttendanceRecordsLocal] = useState<{ [studentId: string]: { status: string; remarks: string } }>({});
  const [attendanceStats, setAttendanceStats] = useState<{ total: number; present: number; absent: number; late: number; excused: number } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Grades states
  const [selectedStudentForGrades, setSelectedStudentForGrades] = useState<Student | null>(null);
  const [gradeForm, setGradeForm] = useState({
    subject: "",
    gradeType: "CC",
    period: "1",
    score: "",
    maxScore: "20",
    comments: "",
  });

  // Log filter states
  const [logFilters, setLogFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
  });

  
  // Presentation score state for 18-month grading
  const [presentationScore, setPresentationScore] = useState<string>("");

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

  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "absence",
    subject: "",
    body: "",
    isDefault: false,
    usePredefined: false,
  });

  // Search states
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const [studentsRes, teachersRes, classesRes, sessionsRes, settingsRes, templatesRes] = await Promise.all([
        fetch("/api/education/students"),
        fetch("/api/education/teachers"),
        fetch("/api/education/classes"),
        fetch("/api/education/sessions"),
        fetch("/api/education/school-settings"),
        fetch("/api/education/message-templates"),
      ]);
      
      if (studentsRes.ok) {
        const response = await studentsRes.json();
        const studentsData = response.data?.students || response.students || [];
        setStudents(studentsData);
      }
      
      if (teachersRes.ok) {
        const response = await teachersRes.json();
        const teachersData = response.data?.teachers || response.teachers || [];
        setTeachers(teachersData);
      }
      
      if (classesRes.ok) {
        const response = await classesRes.json();
        const classesData = response.data?.classes || response.classes || [];
        setClasses(classesData);
      }
      
      if (sessionsRes.ok) {
        const response = await sessionsRes.json();
        const sessionsData = response.data?.sessions || response.sessions || [];
        setSessions(sessionsData);
      }
      
      if (settingsRes.ok) {
        const response = await settingsRes.json();
        const settingsData = response.data?.settings || response.settings || null;
        setSchoolSettings(settingsData);
        if (settingsData) {
          setSettingsForm({
            schoolName: settingsData.schoolName || "",
            schoolLogo: settingsData.schoolLogo || "",
            schoolAddress: settingsData.schoolAddress || "",
            schoolPhone: settingsData.schoolPhone || "",
            schoolEmail: settingsData.schoolEmail || "",
            principalName: settingsData.principalName || "",
          });
        }
      }

      if (templatesRes.ok) {
        const response = await templatesRes.json();
        const templatesData = response.data?.templates || response.templates || [];
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error("Error fetching education data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch education data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session, toast]);

  // Fetch communication logs
  const fetchCommunicationLogs = useCallback(async () => {
    if (!session?.user) return;
    try {
      const params = new URLSearchParams();
      if (logFilters.startDate) params.append("startDate", logFilters.startDate);
      if (logFilters.endDate) params.append("endDate", logFilters.endDate);
      if (logFilters.status) params.append("status", logFilters.status);

      const res = await fetch(`/api/education/communication-logs?${params.toString()}`);
      if (res.ok) {
        const response = await res.json();
        setCommunicationLogs(response.data?.logs || response.logs || []);
      } else {
        console.error("Failed to fetch communication logs:", res.status);
        setCommunicationLogs([]);
      }
    } catch (error) {
      console.error("Error fetching communication logs:", error);
      setCommunicationLogs([]);
    }
  }, [session, logFilters]);

  // Fetch attendance for class and date
  const fetchAttendance = useCallback(async () => {
    if (!attendanceClassId || !attendanceDate) return;
    try {
      const res = await fetch(`/api/education/attendance?classId=${attendanceClassId}&date=${attendanceDate}`);
      if (res.ok) {
        const response = await res.json();
        const attendanceData = response.data?.attendance || response.attendance || [];
        setAttendanceRecords(attendanceData);
        
        const statsData = response.data?.stats || response.stats;
        setAttendanceStats(statsData);
        
        // Initialize local attendance records
        const classStudents = students.filter(s => s.classId === attendanceClassId);
        const initialRecords: { [studentId: string]: { status: string; remarks: string } } = {};
        
        classStudents.forEach(student => {
          const existing = attendanceData.find((a: AttendanceRecord) => a.studentId === student.id);
          initialRecords[student.id] = {
            status: existing?.status || "present",
            remarks: existing?.remarks || "",
          };
        });
        
        setAttendanceRecordsLocal(initialRecords);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  }, [attendanceClassId, attendanceDate, students]);

  // Calculate attendance stats from local records
  const calculateLocalStats = () => {
    const records = Object.values(attendanceRecords_local);
    return {
      total: records.length,
      present: records.filter(r => r.status === "present").length,
      absent: records.filter(r => r.status === "absent").length,
      late: records.filter(r => r.status === "late").length,
      excused: records.filter(r => r.status === "excused").length,
    };
  };

  useEffect(() => {
    if (session?.user) {
      fetchData();
    } else if (status === "unauthenticated") {
      // Stop loading when unauthenticated - the component will redirect to login
      setLoading(false);
    }
  }, [session, fetchData, status]);

  useEffect(() => {
    fetchCommunicationLogs();
  }, [fetchCommunicationLogs]);

  useEffect(() => {
    if (students.length > 0 && attendanceClassId && attendanceDate) {
      fetchAttendance();
    }
  }, [attendanceClassId, attendanceDate, students, fetchAttendance]);

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

  const sendWhatsAppMessage = async (phone: string, message: string, studentId?: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, "_blank");

    // Log the message
    if (studentId) {
      try {
        await fetch("/api/education/communication-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            recipientPhone: phone,
            recipientName: students.find(s => s.id === studentId)?.guardianName,
            messageContent: message,
            channel: "whatsapp",
            triggeredBy: "manual",
            status: "sent",
          }),
        });
        fetchCommunicationLogs();
      } catch (error) {
        console.error("Error logging message:", error);
      }
    }
  };

  // Attendance handlers
  const handleAttendanceStatusChange = (studentId: string, status: string) => {
    setAttendanceRecordsLocal(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleSaveAttendance = async () => {
    if (!attendanceClassId || !attendanceDate) {
      toast({ title: "Error", description: "Please select class and date", variant: "destructive" });
      return;
    }

    setSavingAttendance(true);
    try {
      const records = Object.entries(attendanceRecords_local).map(([studentId, data]) => ({
        studentId,
        classId: attendanceClassId,
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
        const response = await res.json();
        toast({ title: "Success", description: response.message || "Attendance saved successfully" });
        
        // Trigger WhatsApp for absent AND late students
        const studentsToNotify = Object.entries(attendanceRecords_local)
          .filter(([_, data]) => data.status === "absent" || data.status === "late")
          .map(([studentId, data]) => ({ 
            student: students.find(s => s.id === studentId), 
            status: data.status 
          }))
          .filter(item => item.student) as { student: Student; status: string }[];

        if (studentsToNotify.length > 0) {
          for (const { student, status } of studentsToNotify) {
            if (student.guardianPhone) {
              // Find appropriate template based on status
              // "late" status uses "delay" category template
              const templateCategory = status === "late" ? "delay" : status;
              const template = templates.find(t => t.category === templateCategory && t.isDefault) || 
                              templates.find(t => t.category === templateCategory) ||
                              templates.find(t => t.category === "absence");
              
              let message = template?.body || `Dear Parent/Guardian, we are informing you that {{student_name}} was marked {{status}} on {{date}}. {{school_name}}`;
              message = message
                .replace(/\{\{student_name\}\}/g, `${student.firstName} ${student.lastName}`)
                .replace(/\{\{date\}\}/g, format(new Date(attendanceDate), "MMMM dd, yyyy"))
                .replace(/\{\{class_name\}\}/g, student.class?.name || "")
                .replace(/\{\{status\}\}/g, status === "late" ? "late" : "absent")
                .replace(/\{\{school_name\}\}/g, schoolSettings?.schoolName || "School");
              
              // Open WhatsApp Web automatically
              sendWhatsAppMessage(student.guardianPhone, message, student.id);
            }
          }
        }

        fetchAttendance();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to save attendance", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save attendance", variant: "destructive" });
    } finally {
      setSavingAttendance(false);
    }
  };

  // Template handlers
  const handleCreateTemplate = async () => {
    try {
      let body = templateForm.body;
      
      // Use predefined template if selected
      if (templateForm.usePredefined) {
        if (templateForm.category === "absence") {
          body = `Dear Parent/Guardian, we are informing you that {{student_name}} was marked {{status}} on {{date}}. {{school_name}}`;
        } else if (templateForm.category === "delay") {
          body = `Dear Parent/Guardian, we are informing you that {{student_name}} arrived late on {{date}}. {{school_name}}`;
        }
      }

      const res = await fetch("/api/education/message-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...templateForm,
          body,
        }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Template created successfully" });
        setTemplateDialog(false);
        resetTemplateForm();
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to create template", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    try {
      const res = await fetch("/api/education/message-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTemplate.id,
          ...templateForm,
        }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Template updated successfully" });
        setTemplateDialog(false);
        setEditingTemplate(null);
        resetTemplateForm();
        fetchData();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to update template", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/education/message-templates?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({ title: "Success", description: "Template deleted successfully" });
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    }
  };

  const handleSetDefaultTemplate = async (id: string) => {
    try {
      const template = templates.find(t => t.id === id);
      if (!template) return;

      // Unset other defaults of same category
      const sameCategoryTemplates = templates.filter(t => t.category === template.category && t.isDefault);
      for (const t of sameCategoryTemplates) {
        if (t.id !== id) {
          await fetch("/api/education/message-templates", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: t.id, isDefault: false }),
          });
        }
      }

      const res = await fetch("/api/education/message-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDefault: true }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Default template updated" });
        fetchData();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to set default template", variant: "destructive" });
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      category: "absence",
      subject: "",
      body: "",
      isDefault: false,
      usePredefined: false,
    });
    setEditingTemplate(null);
  };

  // Grade handlers
  const handleAddGrade = async () => {
    if (!selectedStudentForGrades) return;
    try {
      const res = await fetch("/api/education/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentForGrades.id,
          ...gradeForm,
          score: parseFloat(gradeForm.score),
          maxScore: parseFloat(gradeForm.maxScore),
        }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Grade added successfully" });
        setGradeForm({ subject: "", gradeType: "CC", period: "1", score: "", maxScore: "20", comments: "" });
        fetchStudentGrades(selectedStudentForGrades.id);
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to add grade", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add grade", variant: "destructive" });
    }
  };

  const fetchStudentGrades = async (studentId: string) => {
    try {
      const res = await fetch(`/api/education/grades?studentId=${studentId}`);
      if (res.ok) {
        const response = await res.json();
        setStudentGrades(response.data?.grades || response.grades || []);
      }
    } catch (error) {
      console.error("Error fetching grades:", error);
    }
  };

  // Delete grade handler
  const handleDeleteGrade = async (gradeId: string) => {
    try {
      const res = await fetch(`/api/education/grades?id=${gradeId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({ title: "Success", description: "Grade deleted successfully" });
        if (selectedStudentForGrades) {
          fetchStudentGrades(selectedStudentForGrades.id);
        }
      } else {
        toast({ title: "Error", description: "Failed to delete grade", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete grade", variant: "destructive" });
    }
  };

  // Export logs
  const exportLogs = () => {
    const csv = [
      ["Date", "Student", "Phone", "Message", "Status", "Channel"].join(","),
      ...communicationLogs.map(log => [
        format(new Date(log.createdAt), "yyyy-MM-dd HH:mm"),
        log.student ? `${log.student.firstName} ${log.student.lastName}` : log.recipientName || "",
        log.recipientPhone,
        `"${log.messageContent.replace(/"/g, '""')}"`,
        log.status,
        log.channel,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `communication-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate grades for 18-month program
  const calculateFinalGrade = (grades: StudentGrade[]) => {
    // Group by period and type
    const period1 = grades.filter(g => g.period === "1");
    const period2 = grades.filter(g => g.period === "2");

    const calculatePeriodAverage = (periodGrades: StudentGrade[], type: string) => {
      const typeGrades = periodGrades.filter(g => g.gradeType === type);
      if (typeGrades.length === 0) return null;
      const sum = typeGrades.reduce((acc, g) => acc + (g.score || 0), 0);
      return sum / typeGrades.length;
    };

    // Period 1 calculations
    const p1_CC = calculatePeriodAverage(period1, "CC");
    const p1_EFCF_T = calculatePeriodAverage(period1, "EFCF_T");
    const p1_EFCF_P = calculatePeriodAverage(period1, "EFCF_P");

    // Period 2 calculations
    const p2_CC = calculatePeriodAverage(period2, "CC");
    const p2_EFCF_T = calculatePeriodAverage(period2, "EFCF_T");
    const p2_EFCF_P = calculatePeriodAverage(period2, "EFCF_P");

    // Combined averages (only if both periods have data)
    let combined_CC = null;
    let combined_EFCF_T = null;
    let combined_EFCF_P = null;

    if (p1_CC !== null && p2_CC !== null) {
      combined_CC = (p1_CC + p2_CC) / 2;
    } else if (p1_CC !== null) {
      combined_CC = p1_CC;
    } else if (p2_CC !== null) {
      combined_CC = p2_CC;
    }

    if (p1_EFCF_T !== null && p2_EFCF_T !== null) {
      combined_EFCF_T = (p1_EFCF_T + p2_EFCF_T) / 2;
    } else if (p1_EFCF_T !== null) {
      combined_EFCF_T = p1_EFCF_T;
    } else if (p2_EFCF_T !== null) {
      combined_EFCF_T = p2_EFCF_T;
    }

    if (p1_EFCF_P !== null && p2_EFCF_P !== null) {
      combined_EFCF_P = (p1_EFCF_P + p2_EFCF_P) / 2;
    } else if (p1_EFCF_P !== null) {
      combined_EFCF_P = p1_EFCF_P;
    } else if (p2_EFCF_P !== null) {
      combined_EFCF_P = p2_EFCF_P;
    }

    // Final grade formula: (CC × 3 + EFCF_T × 2 + EFCF_P × 3 + Presentation × 2) / 10
    let finalGrade = null;
    if (combined_CC !== null || combined_EFCF_T !== null || combined_EFCF_P !== null) {
      const presScore = presentationScore ? parseFloat(presentationScore) : 0;
      const ccScore = combined_CC || 0;
      const efcfTScore = combined_EFCF_T || 0;
      const efcfPScore = combined_EFCF_P || 0;
      
      finalGrade = (ccScore * 3 + efcfTScore * 2 + efcfPScore * 3 + presScore * 2) / 10;
    }

    return {
      period1: { CC: p1_CC, EFCF_T: p1_EFCF_T, EFCF_P: p1_EFCF_P },
      period2: { CC: p2_CC, EFCF_T: p2_EFCF_T, EFCF_P: p2_EFCF_P },
      combined: { CC: combined_CC, EFCF_T: combined_EFCF_T, EFCF_P: combined_EFCF_P },
      final: finalGrade,
    };
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

  // Show loading spinner while session is loading
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    signIn();
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show loading spinner while data is loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const classStudents = students.filter(s => s.classId === attendanceClassId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Education Management
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
          <TabsTrigger value="templates">Messages</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Students</CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No students added yet</p>
                  </div>
                ) : (
                  students.slice(0, 5).map(student => (
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
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Classes Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No classes created yet</p>
                  </div>
                ) : (
                  classes.slice(0, 5).map(cls => (
                    <div key={cls.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{cls.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cls.teacher ? `${cls.teacher.firstName} ${cls.teacher.lastName}` : "No teacher"}
                        </p>
                      </div>
                      <Badge variant="outline">{cls._count?.students || 0} students</Badge>
                    </div>
                  ))
                )}
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
              <ScrollArea className="h-[500px]">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-background">
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
                                    setSelectedStudentForGrades(student);
                                    fetchStudentGrades(student.id);
                                    setGradeDialog(true);
                                  }}
                                >
                                  <Award className="h-4 w-4" />
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
              </ScrollArea>
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
              <ScrollArea className="h-[500px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background">
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
              </ScrollArea>
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

          {classes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No classes created yet</p>
                <Button className="mt-4" onClick={() => setClassDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Class
                </Button>
              </CardContent>
            </Card>
          ) : (
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
          )}
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

          {sessions.length === 0? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No sessions created yet</p>
                <Button className="mt-4" onClick={() => setSessionDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Session
                </Button>
              </CardContent>
            </Card>
          ) : (
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
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance Management
              </CardTitle>
              <CardDescription>
                Track student attendance and automate parent notifications via WhatsApp Web
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selection Controls */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>Select Class</Label>
                  <Select value={attendanceClassId} onValueChange={setAttendanceClassId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
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
                    className="w-40"
                  />
                </div>
                <Button 
                  onClick={handleSaveAttendance}
                  disabled={!attendanceClassId || savingAttendance}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingAttendance ? "Saving..." : "Save Attendance"}
                </Button>
              </div>

              {/* Statistics */}
              {Object.keys(attendanceRecords_local).length > 0 && (
                <div className="grid grid-cols-5 gap-2 p-4 bg-muted/50 rounded-lg">
                  {(() => {
                    const stats = calculateLocalStats();
                    return (
                      <>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{stats.total}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                          <p className="text-xs text-muted-foreground">Present</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                          <p className="text-xs text-muted-foreground">Absent</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
                          <p className="text-xs text-muted-foreground">Late</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{stats.excused}</p>
                          <p className="text-xs text-muted-foreground">Excused</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Student List for Attendance */}
              {attendanceClassId && classStudents.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <ScrollArea className="max-h-96">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Student</th>
                          <th className="text-left p-3 font-medium">ID</th>
                          <th className="text-center p-3 font-medium">Present</th>
                          <th className="text-center p-3 font-medium">Absent</th>
                          <th className="text-center p-3 font-medium">Late</th>
                          <th className="text-center p-3 font-medium">Excused</th>
                          <th className="text-left p-3 font-medium">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map(student => (
                          <tr key={student.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{student.firstName} {student.lastName}</span>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">{student.studentId}</td>
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                name={`attendance-${student.id}`}
                                checked={attendanceRecords_local[student.id]?.status === "present"}
                                onChange={() => handleAttendanceStatusChange(student.id, "present")}
                                className="h-4 w-4 accent-green-600"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                name={`attendance-${student.id}`}
                                checked={attendanceRecords_local[student.id]?.status === "absent"}
                                onChange={() => handleAttendanceStatusChange(student.id, "absent")}
                                className="h-4 w-4 accent-red-600"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                name={`attendance-${student.id}`}
                                checked={attendanceRecords_local[student.id]?.status === "late"}
                                onChange={() => handleAttendanceStatusChange(student.id, "late")}
                                className="h-4 w-4 accent-yellow-600"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                name={`attendance-${student.id}`}
                                checked={attendanceRecords_local[student.id]?.status === "excused"}
                                onChange={() => handleAttendanceStatusChange(student.id, "excused")}
                                className="h-4 w-4 accent-blue-600"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                placeholder="Optional remarks..."
                                value={attendanceRecords_local[student.id]?.remarks || ""}
                                onChange={(e) => setAttendanceRecordsLocal(prev => ({
                                  ...prev,
                                  [student.id]: { ...prev[student.id], remarks: e.target.value }
                                }))}
                                className="w-40 h-8"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              ) : attendanceClassId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No students in this class</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a class and date to mark attendance</p>
                  <p className="text-sm mt-2">WhatsApp notifications will be automatically triggered for absent students</p>
                </div>
              )}
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
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Templates support variables: {`{{student_name}}`}, {`{{date}}`}, {`{{class_name}}`}, {`{{status}}`}, {`{{school_name}}`}
                </p>
                <Button onClick={() => {
                  resetTemplateForm();
                  setEditingTemplate(null);
                  setTemplateDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>

              {templates.length > 0 ? (
                <div className="grid gap-4">
                  {templates.map(template => (
                    <Card key={template.id} className={cn("relative", template.isDefault && "border-green-500")}>
                      {template.isDefault && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-green-600">Default</Badge>
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{template.category}</Badge>
                              <span className="text-xs">Used {template.usageCount} times</span>
                            </CardDescription>
                          </div>
                          <div className="flex gap-1">
                            {!template.isDefault && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefaultTemplate(template.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Set Default
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingTemplate(template);
                                setTemplateForm({
                                  name: template.name,
                                  category: template.category,
                                  subject: template.subject || "",
                                  body: template.body,
                                  isDefault: template.isDefault,
                                  usePredefined: false,
                                });
                                setTemplateDialog(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">{template.body}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates created yet</p>
                  <p className="text-sm mt-2">Create templates for absence, delay, and reminder messages</p>
                </div>
              )}
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
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={logFilters.startDate}
                    onChange={(e) => setLogFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={logFilters.endDate}
                    onChange={(e) => setLogFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={logFilters.status} onValueChange={(value) => setLogFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={exportLogs} disabled={communicationLogs.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              {/* Logs Table */}
              {communicationLogs.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Student</th>
                        <th className="text-left p-3 font-medium">Phone</th>
                        <th className="text-left p-3 font-medium">Message</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Channel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {communicationLogs.map(log => (
                        <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-3 text-sm">
                            {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm")}
                          </td>
                          <td className="p-3 text-sm">
                            {log.student ? `${log.student.firstName} ${log.student.lastName}` : log.recipientName || "-"}
                          </td>
                          <td className="p-3 text-sm">{log.recipientPhone}</td>
                          <td className="p-3">
                            <p className="text-sm truncate max-w-xs" title={log.messageContent}>
                              {log.messageContent.substring(0, 50)}...
                            </p>
                          </td>
                          <td className="p-3">
                            <Badge variant={
                              log.status === "sent" ? "default" :
                              log.status === "delivered" ? "success" :
                              log.status === "failed" ? "destructive" : "secondary"
                            }>
                              {log.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">{log.channel}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No communication logs yet</p>
                  <p className="text-sm mt-2">Messages sent via WhatsApp will be logged here</p>
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
                <Award className="h-5 w-5" />
                Student Grades - 18-Month Program
              </CardTitle>
              <CardDescription>
                Manage student grades with CC (Continuous Control), EFCF_T (Theoretical), EFCF_P (Practical) grade types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <Select 
                    value={selectedStudentForGrades?.id || ""} 
                    onValueChange={(value) => {
                      const student = students.find(s => s.id === value);
                      if (student) {
                        setSelectedStudentForGrades(student);
                        fetchStudentGrades(student.id);
                      }
                    }}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstName} {student.lastName} ({student.studentId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedStudentForGrades && (
                <>
                  {/* Grade Summary */}
                  {studentGrades.length > 0 && (
                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Grade Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const gradeSummary = calculateFinalGrade(studentGrades);
                          return (
                            <div className="space-y-4">
                              {/* Period 1 */}
                              <div>
                                <h4 className="font-medium mb-2">Period 1 (Months 1-9)</h4>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">CC Average</p>
                                    <p className="text-xl font-bold">{gradeSummary.period1.CC?.toFixed(2) ?? "-"}</p>
                                  </div>
                                  <div className="text-center p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">EFCF_T Average</p>
                                    <p className="text-xl font-bold">{gradeSummary.period1.EFCF_T?.toFixed(1) ?? "-"}</p>
                                  </div>
                                  <div className="text-center p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">EFCF_P Average</p>
                                    <p className="text-xl font-bold">{gradeSummary.period1.EFCF_P?.toFixed(1) ?? "-"}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Period 2 */}
                              <div>
                                <h4 className="font-medium mb-2">Period 2 (Months 10-18)</h4>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">CC Average</p>
                                    <p className="text-xl font-bold">{gradeSummary.period2.CC?.toFixed(1) ?? "-"}</p>
                                  </div>
                                  <div className="text-center p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">EFCF_T Average</p>
                                    <p className="text-xl font-bold">{gradeSummary.period2.EFCF_T?.toFixed(1) ?? "-"}</p>
                                  </div>
                                  <div className="text-center p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">EFCF_P Average</p>
                                    <p className="text-xl font-bold">{gradeSummary.period2.EFCF_P?.toFixed(1) ?? "-"}</p>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* Final Grade */}
                              <div>
                                <h4 className="font-medium mb-2">Final Grade Calculation</h4>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Formula: (CC × 3 + EFCF_T × 2 + EFCF_P × 3 + Presentation × 2) / 10
                                </p>
                                <div className="grid grid-cols-4 gap-4">
                                  <div className="text-center p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">Combined CC</p>
                                    <p className="text-xl font-bold">{gradeSummary.combined.CC?.toFixed(1) ?? "-"}</p>
                                  </div>
                                  <div className="text-center p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">Combined EFCF_T</p>
                                    <p className="text-xl font-bold">{gradeSummary.combined.EFCF_T?.toFixed(1) ?? "-"}</p>
                                  </div>
                                  <div className="text-center p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">Combined EFCF_P</p>
                                    <p className="text-xl font-bold">{gradeSummary.combined.EFCF_P?.toFixed(1) ?? "-"}</p>
                                  </div>
                                  <div className="text-center p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">Presentation</p>
                                    <Input
                                      type="number"
                                      value={presentationScore}
                                      onChange={(e) => setPresentationScore(e.target.value)}
                                      placeholder="0"
                                      className="w-20 h-8 mx-auto"
                                      min="0"
                                      max="20"
                                    />
                                  </div>
                                </div>
                                
                                {gradeSummary.final !== null && (
                                  <div className="text-center p-4 bg-green-100 rounded-lg mt-4">
                                    <p className="text-sm text-muted-foreground">Final Grade</p>
                                    <p className="text-3xl font-bold text-green-700">{gradeSummary.final.toFixed(2)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Add Grade Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Add New Grade</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Input
                            value={gradeForm.subject}
                            onChange={(e) => setGradeForm(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="e.g., Mathematics"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Grade Type</Label>
                          <Select value={gradeForm.gradeType} onValueChange={(value) => setGradeForm(prev => ({ ...prev, gradeType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CC">CC (Continuous Control)</SelectItem>
                              <SelectItem value="EFCF_T">EFCF_T (Theoretical)</SelectItem>
                              <SelectItem value="EFCF_P">EFCF_P (Practical)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Period</Label>
                          <Select value={gradeForm.period} onValueChange={(value) => setGradeForm(prev => ({ ...prev, period: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Period 1 (Months 1-9)</SelectItem>
                              <SelectItem value="2">Period 2 (Months 10-18)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Score</Label>
                          <Input
                            type="number"
                            value={gradeForm.score}
                            onChange={(e) => setGradeForm(prev => ({ ...prev, score: e.target.value }))}
                            placeholder="e.g., 15"
                            min="0"
                            max="20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Score</Label>
                          <Input
                            type="number"
                            value={gradeForm.maxScore}
                            onChange={(e) => setGradeForm(prev => ({ ...prev, maxScore: e.target.value }))}
                            placeholder="20"
                            min="1"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button onClick={handleAddGrade} disabled={!gradeForm.subject || !gradeForm.score}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Grade
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Grades List */}
                  {studentGrades.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Grade Records</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="max-h-96">
                          <table className="w-full">
                            <thead className="sticky top-0 bg-background">
                              <tr className="border-b bg-muted/50">
                                <th className="text-left p-3 font-medium">Subject</th>
                                <th className="text-left p-3 font-medium">Type</th>
                                <th className="text-left p-3 font-medium">Period</th>
                                <th className="text-left p-3 font-medium">Score</th>
                                <th className="text-left p-3 font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentGrades.map(grade => (
                                <tr key={grade.id} className="border-b last:border-0 hover:bg-muted/50">
                                  <td className="p-3 text-sm">{grade.subject}</td>
                                  <td className="p-3">
                                    <Badge variant="outline">{grade.gradeType}</Badge>
                                  </td>
                                  <td className="p-3 text-sm">Period {grade.period}</td>
                                  <td className="p-3 text-sm font-medium">
                                    {grade.score}/{grade.maxScore || 20}
                                  </td>
                                  <td className="p-3">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteGrade(grade.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {!selectedStudentForGrades && (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a student to manage their grades</p>
                  <p className="text-sm mt-2">The 18-month program consists of two 9-month periods</p>
                </div>
              )}
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
                <Label>Student ID *</Label>
                <Input value={studentForm.studentId} onChange={(e) => setStudentForm(prev => ({ ...prev, studentId: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={studentForm.status} onValueChange={(value) => setStudentForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="graduated">Graduated</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={studentForm.firstName} onChange={(e) => setStudentForm(prev => ({ ...prev, firstName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={studentForm.lastName} onChange={(e) => setStudentForm(prev => ({ ...prev, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={studentForm.dateOfBirth} onChange={(e) => setStudentForm(prev => ({ ...prev, dateOfBirth: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={studentForm.gender} onValueChange={(value) => setStudentForm(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <h4 className="font-medium">Contact Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={studentForm.email} onChange={(e) => setStudentForm(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={studentForm.phone} onChange={(e) => setStudentForm(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={studentForm.address} onChange={(e) => setStudentForm(prev => ({ ...prev, address: e.target.value }))} />
            </div>
            <Separator />
            <h4 className="font-medium">Primary Guardian</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Guardian Name</Label>
                <Input value={studentForm.guardianName} onChange={(e) => setStudentForm(prev => ({ ...prev, guardianName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Relation</Label>
                <Select value={studentForm.guardianRelation} onValueChange={(value) => setStudentForm(prev => ({ ...prev, guardianRelation: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Guardian Phone</Label>
                <Input value={studentForm.guardianPhone} onChange={(e) => setStudentForm(prev => ({ ...prev, guardianPhone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Guardian Email</Label>
                <Input type="email" value={studentForm.guardianEmail} onChange={(e) => setStudentForm(prev => ({ ...prev, guardianEmail: e.target.value }))} />
              </div>
            </div>
            <Separator />
            <h4 className="font-medium">Academic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={studentForm.classId} onValueChange={(value) => setStudentForm(prev => ({ ...prev, classId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={studentForm.sessionId} onValueChange={(value) => setStudentForm(prev => ({ ...prev, sessionId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent>
                    {sessions.map(sess => (
                      <SelectItem key={sess.id} value={sess.id}>{sess.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialog(false)}>Cancel</Button>
            <Button onClick={editingStudent ? handleUpdateStudent : handleCreateStudent}>
              {editingStudent ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Dialog */}
      <Dialog open={teacherDialog} onOpenChange={setTeacherDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? "Edit Teacher" : "Add New Teacher"}</DialogTitle>
            <DialogDescription>
              {editingTeacher ? "Update teacher information" : "Enter teacher details"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee ID *</Label>
                <Input value={teacherForm.employeeId} onChange={(e) => setTeacherForm(prev => ({ ...prev, employeeId: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={teacherForm.status} onValueChange={(value) => setTeacherForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>First Name *</Label>
                <Input value={teacherForm.firstName} onChange={(e) => setTeacherForm(prev => ({ ...prev, firstName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={teacherForm.lastName} onChange={(e) => setTeacherForm(prev => ({ ...prev, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={teacherForm.email} onChange={(e) => setTeacherForm(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={teacherForm.phone} onChange={(e) => setTeacherForm(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qualification</Label>
                <Input value={teacherForm.qualification} onChange={(e) => setTeacherForm(prev => ({ ...prev, qualification: e.target.value }))} placeholder="e.g., PhD, Masters" />
              </div>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input value={teacherForm.specialization} onChange={(e) => setTeacherForm(prev => ({ ...prev, specialization: e.target.value }))} placeholder="e.g., Mathematics" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeacherDialog(false)}>Cancel</Button>
            <Button onClick={editingTeacher ? handleUpdateTeacher : handleCreateTeacher}>
              {editingTeacher ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Dialog */}
      <Dialog open={classDialog} onOpenChange={setClassDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
            <DialogDescription>
              {editingClass ? "Update class information" : "Enter class details"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Class Name *</Label>
              <Input value={classForm.name} onChange={(e) => setClassForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Class 10-A" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input value={classForm.grade} onChange={(e) => setClassForm(prev => ({ ...prev, grade: e.target.value }))} placeholder="e.g., 10th Grade" />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input value={classForm.section} onChange={(e) => setClassForm(prev => ({ ...prev, section: e.target.value }))} placeholder="e.g., A" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class Teacher</Label>
                <Select value={classForm.teacherId} onValueChange={(value) => setClassForm(prev => ({ ...prev, teacherId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={classForm.sessionId} onValueChange={(value) => setClassForm(prev => ({ ...prev, sessionId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent>
                    {sessions.map(sess => (
                      <SelectItem key={sess.id} value={sess.id}>{sess.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" value={classForm.capacity} onChange={(e) => setClassForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 30 }))} />
              </div>
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input value={classForm.roomNumber} onChange={(e) => setClassForm(prev => ({ ...prev, roomNumber: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialog(false)}>Cancel</Button>
            <Button onClick={editingClass ? handleUpdateClass : handleCreateClass}>
              {editingClass ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Dialog */}
      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSession ? "Edit Session" : "Add New Session"}</DialogTitle>
            <DialogDescription>
              {editingSession ? "Update session information" : "Enter session details"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Session Name *</Label>
              <Input value={sessionForm.name} onChange={(e) => setSessionForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., 2024-2025 Academic Year" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={sessionForm.startDate} onChange={(e) => setSessionForm(prev => ({ ...prev, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={sessionForm.endDate} onChange={(e) => setSessionForm(prev => ({ ...prev, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={sessionForm.description} onChange={(e) => setSessionForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isCurrent" 
                checked={sessionForm.isCurrent} 
                onCheckedChange={(checked) => setSessionForm(prev => ({ ...prev, isCurrent: checked as boolean }))}
              />
              <Label htmlFor="isCurrent">Set as Current Session</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialog(false)}>Cancel</Button>
            <Button onClick={editingSession ? handleUpdateSession : handleCreateSession}>
              {editingSession ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* School Settings Dialog */}
      <Dialog open={settingsDialog} onOpenChange={setSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>School Settings</DialogTitle>
            <DialogDescription>
              Configure your school information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>School Name *</Label>
              <Input value={settingsForm.schoolName} onChange={(e) => setSettingsForm(prev => ({ ...prev, schoolName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>School Phone</Label>
                <Input value={settingsForm.schoolPhone} onChange={(e) => setSettingsForm(prev => ({ ...prev, schoolPhone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>School Email</Label>
                <Input type="email" value={settingsForm.schoolEmail} onChange={(e) => setSettingsForm(prev => ({ ...prev, schoolEmail: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>School Address</Label>
              <Textarea value={settingsForm.schoolAddress} onChange={(e) => setSettingsForm(prev => ({ ...prev, schoolAddress: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Principal Name</Label>
              <Input value={settingsForm.principalName} onChange={(e) => setSettingsForm(prev => ({ ...prev, principalName: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Message Template"}</DialogTitle>
            <DialogDescription>
              Create a reusable message template with variable support
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input value={templateForm.name} onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Absence Notification" />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={templateForm.category} onValueChange={(value) => setTemplateForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="absence">Absence</SelectItem>
                    <SelectItem value="delay">Delay</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="fee">Fee</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(templateForm.category === "absence" || templateForm.category === "delay") && !editingTemplate && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="usePredefined" 
                  checked={templateForm.usePredefined} 
                  onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, usePredefined: checked as boolean }))}
                />
                <Label htmlFor="usePredefined">Use predefined {templateForm.category} template</Label>
              </div>
            )}
            
            {!templateForm.usePredefined && (
              <div className="space-y-2">
                <Label>Message Body *</Label>
                <Textarea 
                  value={templateForm.body} 
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, body: e.target.value }))} 
                  placeholder="Dear Parent/Guardian, {{student_name}} was marked {{status}} on {{date}}."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {`{{student_name}}`}, {`{{date}}`}, {`{{class_name}}`}, {`{{status}}`}, {`{{school_name}}`}
                </p>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isDefault" 
                checked={templateForm.isDefault} 
                onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, isDefault: checked as boolean }))}
              />
              <Label htmlFor="isDefault">Set as default for this category</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(false)}>Cancel</Button>
            <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
              {editingTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to Guardian</DialogTitle>
            <DialogDescription>
              Send a WhatsApp message to {selectedStudentForMessage?.guardianName || "guardian"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={selectedStudentForMessage?.guardianPhone || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Choose a template or write custom" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Custom Message</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea 
                value={customMessage} 
                onChange={(e) => setCustomMessage(e.target.value)} 
                rows={5}
                placeholder="Type your message here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedStudentForMessage?.guardianPhone) {
                  let message = customMessage;
                  if (selectedTemplateId) {
                    const template = templates.find(t => t.id === selectedTemplateId);
                    if (template) {
                      message = template.body
                        .replace(/\{\{student_name\}\}/g, `${selectedStudentForMessage.firstName} ${selectedStudentForMessage.lastName}`)
                        .replace(/\{\{date\}\}/g, format(new Date(), "MMMM dd, yyyy"))
                        .replace(/\{\{class_name\}\}/g, selectedStudentForMessage.class?.name || "")
                        .replace(/\{\{school_name\}\}/g, schoolSettings?.schoolName || "School");
                    }
                  }
                  sendWhatsAppMessage(selectedStudentForMessage.guardianPhone, message, selectedStudentForMessage.id);
                  setMessageDialog(false);
                  setCustomMessage("");
                  setSelectedTemplateId("");
                }
              }}
              disabled={!customMessage && !selectedTemplateId}
            >
              <Send className="h-4 w-4 mr-2" />
              Send via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteTarget?.type}. This action cannot be undone.
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
