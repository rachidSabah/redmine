// Dashboard statistics types
export interface DashboardStats {
  totalProjects: number
  activeTickets: number
  completedTasks: number
  teamMembers: number
  hoursLogged: number
  overdueTasks: number
}

export interface ChartData {
  name: string
  value: number
  color?: string
}

export interface ProjectStats {
  projectId: string
  projectName: string
  totalTickets: number
  completedTickets: number
  inProgressTickets: number
  overdueTickets: number
}

// Activity feed types
export interface ActivityItem {
  id: string
  type: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
  description: string
  createdAt: string
  entity: string
  entityId: string
}

// Project types
export interface Project {
  id: string
  name: string
  slug: string | null
  description: string | null
  icon: string | null
  color: string | null
  visibility: string
  status: string
  startDate: string | null
  endDate: string | null
  progress: number
  createdAt: string
  organizationId: string
  parentId: string | null
  _count?: {
    tickets: number
    members: number
  }
}

// Ticket types
export interface Ticket {
  id: string
  key: string
  ticketNumber: number
  title: string
  description: string | null
  type: string
  priority: string
  status: string
  storyPoints: number | null
  estimatedHours: number | null
  loggedHours: number
  progress: number
  dueDate: string | null
  createdAt: string
  projectId: string
  assigneeId: string | null
  reporterId: string
  assignee?: {
    id: string
    name: string | null
    image: string | null
  } | null
  reporter?: {
    id: string
    name: string | null
    image: string | null
  }
  project?: {
    id: string
    name: string
    color: string | null
  }
  milestone?: {
    id: string
    name: string
  } | null
}

// Kanban types
export interface KanbanColumn {
  id: string
  title: string
  tickets: Ticket[]
}

// Comment types
export interface Comment {
  id: string
  content: string
  createdAt: string
  isEdited: boolean
  user: {
    id: string
    name: string | null
    image: string | null
  }
  replies?: Comment[]
}

// Time log types
export interface TimeLog {
  id: string
  description: string | null
  hours: number
  billable: boolean
  loggedAt: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
  ticket: {
    id: string
    key: string
    title: string
  }
}

// Notification types
export interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

// Chat types
export interface ChatMessage {
  id: string
  content: string
  createdAt: string
  isEdited: boolean
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

export interface ChatChannel {
  id: string
  name: string
  type: string
  description: string | null
  _count?: {
    messages: number
  }
}

// Gantt chart types
export interface GanttTask {
  id: string
  key: string
  title: string
  start: string
  end: string | null
  progress: number
  type: string
  project: string
  assignee?: string | null
}

// Calendar event types
export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string | null
  type: string
  ticket?: {
    key: string
    project: {
      color: string | null
    }
  }
}

// Organization types
export interface Organization {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  plan: string
}

export interface OrganizationMember {
  id: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  joinedAt: string
}

// User session
export interface UserSession {
  id: string
  name: string | null
  email: string | null
  image: string | null
}
