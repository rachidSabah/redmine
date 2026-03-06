# Synchro PM - Complete System Documentation

## Multi-Tenant SaaS Project Management System

A comprehensive, production-ready project management platform combining the best features of Jira, Redmine, and Asana, designed for deployment on Vercel.

---

## System Architecture Overview

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15 + React 19 | App Router, Server Components |
| Styling | TailwindCSS 4 + ShadCN UI | Modern design system |
| State | Zustand + TanStack Query | Client state & server state |
| Backend | Next.js API Routes | Serverless functions |
| Database | PostgreSQL (Neon/Supabase) | Primary data store |
| ORM | Prisma | Type-safe database access |
| Auth | NextAuth.js | JWT sessions, OAuth |
| Real-time | Pusher (ready) | WebSocket alternative |
| Files | Vercel Blob | File storage |
| Charts | Recharts | Data visualization |
| DnD | @dnd-kit | Drag and drop |

---

## Directory Structure

```
/home/z/my-project/
├── prisma/
│   └── schema.prisma          # Complete database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── organizations/route.ts
│   │   │   ├── projects/route.ts
│   │   │   ├── tickets/route.ts
│   │   │   ├── comments/route.ts
│   │   │   ├── time-logs/route.ts
│   │   │   ├── notifications/route.ts
│   │   │   └── attachments/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Main dashboard
│   │   └── providers.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── theme-provider.tsx
│   │   ├── dashboard/
│   │   │   ├── stats-cards.tsx
│   │   │   ├── activity-feed.tsx
│   │   │   └── charts.tsx
│   │   ├── projects/
│   │   │   └── project-list.tsx
│   │   ├── tickets/
│   │   │   └── kanban-board.tsx
│   │   ├── gantt/
│   │   │   └── gantt-chart.tsx
│   │   ├── calendar/
│   │   │   └── calendar-view.tsx
│   │   ├── chat/
│   │   │   └── chat-panel.tsx
│   │   └── ui/                # ShadCN components
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   ├── permissions.ts     # RBAC system
│   │   └── utils.ts
│   ├── hooks/
│   │   └── use-*.ts
│   └── store/
│       └── app-store.ts       # Zustand store
├── .env.example
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Database Schema Overview

### Core Models

#### User Management
- **User**: Account with OAuth support
- **Account**: OAuth provider connections
- **Session**: User sessions

#### Multi-Tenant Architecture
- **Organization**: Tenant isolation
- **OrganizationMember**: User-Organization relationship with roles
- **OrganizationInvitation**: Pending invitations

#### Project Management
- **Project**: Work container with hierarchy support
- **ProjectMember**: User-Project relationship
- **Milestone**: Project milestones
- **Module**: Project modules/categories

#### Ticket System
- **Ticket**: Work items with full lifecycle
- **TicketDependency**: Task relationships
- **KanbanColumn**: Board columns
- **Sprint**: Agile sprint management

#### Collaboration
- **Comment**: Ticket discussions
- **Attachment**: File attachments
- **ChatChannel**: Team channels
- **ChatMessage**: Chat messages

#### Time & Activity
- **TimeLog**: Time tracking entries
- **Activity**: Activity feed entries
- **Notification**: User notifications

#### Automation
- **CustomField**: Custom field definitions
- **CustomFieldValue**: Field values
- **Workflow**: Automation workflows
- **WorkflowStep**: Workflow actions

#### Billing (Stripe Ready)
- **Subscription**: Organization subscriptions
- **Invoice**: Payment records

---

## Role-Based Access Control (RBAC)

### Roles Hierarchy

```
OWNER (Full Access)
   │
   ├── ADMIN (Manage All)
   │      │
   │      ├── MANAGER (Manage Projects)
   │      │      │
   │      │      ├── MEMBER (Work on Items)
   │      │      │      │
   │      │      │      └── GUEST (Read Only)
```

### Permission Matrix

| Permission | OWNER | ADMIN | MANAGER | MEMBER | GUEST |
|------------|-------|-------|---------|--------|-------|
| Delete Organization | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Billing | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Members | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create Projects | ✓ | ✓ | ✓ | ✗ | ✗ |
| Delete Projects | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage Project Members | ✓ | ✓ | ✓ | ✗ | ✗ |
| Create Tickets | ✓ | ✓ | ✓ | ✓ | ✗ |
| Edit Own Tickets | ✓ | ✓ | ✓ | ✓ | ✗ |
| Delete Tickets | ✓ | ✓ | ✓ | ✗ | ✗ |
| Assign Tickets | ✓ | ✓ | ✓ | ✗ | ✗ |
| Log Time | ✓ | ✓ | ✓ | ✓ | ✗ |
| Approve Time | ✓ | ✓ | ✓ | ✗ | ✗ |
| View Content | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## API Documentation

### Authentication Endpoints

```
POST   /api/auth/signin/:provider   # OAuth sign-in
POST   /api/auth/signout            # Sign out
GET    /api/auth/session            # Get session
GET    /api/auth/csrf               # CSRF token
```

### Organization Endpoints

```
GET    /api/organizations           # List user's organizations
POST   /api/organizations           # Create organization
GET    /api/organizations/:id       # Get organization
PUT    /api/organizations/:id       # Update organization
DELETE /api/organizations/:id       # Delete organization
POST   /api/organizations/:id/invite # Invite member
```

### Project Endpoints

```
GET    /api/projects                # List projects
POST   /api/projects                # Create project
GET    /api/projects/:id            # Get project
PUT    /api/projects/:id            # Update project
DELETE /api/projects/:id            # Delete project
POST   /api/projects/:id/members    # Add member
```

### Ticket Endpoints

```
GET    /api/tickets                 # List tickets (filterable)
POST   /api/tickets                 # Create ticket
GET    /api/tickets/:id             # Get ticket
PUT    /api/tickets/:id             # Update ticket
DELETE /api/tickets/:id             # Delete ticket
POST   /api/tickets/:id/comments    # Add comment
POST   /api/tickets/:id/time-logs   # Log time
```

### Query Parameters

```
GET /api/tickets?projectId=xxx&status=IN_PROGRESS&priority=HIGH&assigneeId=yyy&search=keyword
```

---

## Frontend Views

### 1. Dashboard View
- Statistics cards with trends
- Productivity charts
- Sprint burndown
- Project distribution pie chart
- Team performance metrics
- Activity feed
- Priority issues list

### 2. Projects View
- Project list with progress
- Status indicators (On Track, At Risk, Behind)
- Member counts and ticket counts
- Due date tracking

### 3. Kanban Board
- Drag-and-drop ticket cards
- Multiple columns (Backlog, To Do, In Progress, In Review, Done)
- Priority indicators
- Assignee avatars
- Comment/attachment counts

### 4. Gantt Chart
- Timeline visualization
- Project/task hierarchy
- Progress bars
- Today indicator
- Zoom controls
- Navigation

### 5. Calendar View
- Monthly calendar
- Event types (deadline, meeting, milestone)
- Upcoming events sidebar
- Date selection

### 6. Chat View
- Channel list
- Direct messages
- Message threading
- User presence
- File attachments

### 7. Settings View
- Organization settings
- Billing management
- Integration configuration

---

## Deployment Checklist

### Pre-Deployment
- [ ] Set up PostgreSQL database (Neon/Supabase)
- [ ] Generate NEXTAUTH_SECRET
- [ ] Configure OAuth providers (optional)
- [ ] Set up Vercel Blob for file storage (optional)
- [ ] Configure Pusher for real-time (optional)

### Vercel Configuration
- [ ] Set DATABASE_URL
- [ ] Set NEXTAUTH_SECRET
- [ ] Set NEXTAUTH_URL
- [ ] Set OAuth credentials (if using)
- [ ] Configure custom domain

### Post-Deployment
- [ ] Run Prisma migrations
- [ ] Create first admin user
- [ ] Configure organization settings
- [ ] Invite team members

---

## Security Considerations

1. **Authentication**: JWT sessions with configurable expiration
2. **Authorization**: Role-based access control at API level
3. **CSRF Protection**: Built-in NextAuth protection
4. **Input Validation**: Zod schemas for all inputs
5. **SQL Injection**: Prisma parameterized queries
6. **XSS Protection**: React automatic escaping

---

## Performance Optimizations

1. **Edge Functions**: API routes compatible with Edge runtime
2. **Static Generation**: Server components where possible
3. **Incremental Static Regeneration**: Dynamic content caching
4. **Image Optimization**: Next.js Image component
5. **Code Splitting**: Automatic route-based splitting
6. **Bundle Size**: Tree-shaking and dynamic imports

---

## Support & Resources

- **Documentation**: `/download/DEPLOYMENT_GUIDE.md`
- **Environment Template**: `.env.example`
- **Issues**: GitHub Issues

---

*Generated for Synchro PM - Multi-Tenant SaaS Project Management System*
