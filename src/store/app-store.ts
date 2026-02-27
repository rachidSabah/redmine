import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  color?: string | null;
  progress: number;
  memberCount: number;
  ticketCount: number;
}

export interface Ticket {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  type: string;
  assignee?: User | null;
  reporter: User;
  progress: number;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
  color?: string;
  tickets: Ticket[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  user: User;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  user: User;
  createdAt: string;
}

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Organization
  currentOrganization: Organization | null;
  organizations: Organization[];
  setCurrentOrganization: (org: Organization | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  
  // Projects
  projects: Project[];
  currentProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  
  // Tickets
  tickets: Ticket[];
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (id: string, data: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  
  // Kanban Columns
  columns: Column[];
  setColumns: (columns: Column[]) => void;
  moveTicket: (ticketId: string, toColumnId: string, newOrder: number) => void;
  
  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  unreadCount: () => number;
  
  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  
  // Activities
  activities: Activity[];
  setActivities: (activities: Activity[]) => void;
  
  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  
  // View State
  activeView: "dashboard" | "projects" | "kanban" | "gantt" | "calendar" | "chat" | "settings";
  setActiveView: (view: "dashboard" | "projects" | "kanban" | "gantt" | "calendar" | "chat" | "settings") => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // User
        user: null,
        setUser: (user) => set({ user }),
        
        // Organization
        currentOrganization: null,
        organizations: [],
        setCurrentOrganization: (org) => set({ currentOrganization: org }),
        setOrganizations: (orgs) => set({ organizations: orgs }),
        
        // Projects
        projects: [],
        currentProject: null,
        setProjects: (projects) => set({ projects }),
        setCurrentProject: (project) => set({ currentProject: project }),
        
        // Tickets
        tickets: [],
        setTickets: (tickets) => set({ tickets }),
        addTicket: (ticket) => set((state) => ({ tickets: [...state.tickets, ticket] })),
        updateTicket: (id, data) => set((state) => ({
          tickets: state.tickets.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),
        deleteTicket: (id) => set((state) => ({
          tickets: state.tickets.filter((t) => t.id !== id),
        })),
        
        // Kanban Columns
        columns: [],
        setColumns: (columns) => set({ columns }),
        moveTicket: (ticketId, toColumnId, newOrder) => set((state) => {
          const columns = [...state.columns];
          let movedTicket: Ticket | null = null;
          
          // Find and remove ticket from current column
          for (const col of columns) {
            const idx = col.tickets.findIndex((t) => t.id === ticketId);
            if (idx !== -1) {
              movedTicket = col.tickets[idx];
              col.tickets = col.tickets.filter((t) => t.id !== ticketId);
              break;
            }
          }
          
          // Add to new column
          if (movedTicket) {
            const targetCol = columns.find((c) => c.id === toColumnId);
            if (targetCol) {
              targetCol.tickets.splice(newOrder, 0, movedTicket);
            }
          }
          
          return { columns };
        }),
        
        // Notifications
        notifications: [],
        setNotifications: (notifications) => set({ notifications }),
        markNotificationRead: (id) => set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        })),
        unreadCount: () => get().notifications.filter((n) => !n.isRead).length,
        
        // Chat
        chatMessages: [],
        addChatMessage: (message) => set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),
        clearChat: () => set({ chatMessages: [] }),
        
        // Activities
        activities: [],
        setActivities: (activities) => set({ activities }),
        
        // UI State
        sidebarOpen: true,
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        
        theme: "system",
        setTheme: (theme) => set({ theme }),
        
        // View State
        activeView: "dashboard",
        setActiveView: (view) => set({ activeView: view }),
        
        // Loading
        isLoading: false,
        setIsLoading: (loading) => set({ isLoading: loading }),
      }),
      {
        name: "project-management-store",
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          theme: state.theme,
          activeView: state.activeView,
        }),
      }
    )
  )
);
