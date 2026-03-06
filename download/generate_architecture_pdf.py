from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import os

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

# Define colors
TABLE_HEADER_COLOR = colors.HexColor('#1F4E79')
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = colors.HexColor('#F5F5F5')

# Create PDF
pdf_path = '/home/z/my-project/download/SynchroPM_Architecture_Documentation.pdf'
title_for_metadata = os.path.splitext(os.path.basename(pdf_path))[0]

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    title=title_for_metadata,
    author='Z.ai',
    creator='Z.ai',
    subject='Multi-Tenant SaaS Project Management System Architecture Documentation'
)

# Define styles
styles = getSampleStyleSheet()

cover_title_style = ParagraphStyle(
    name='CoverTitle',
    fontName='Times New Roman',
    fontSize=42,
    leading=50,
    alignment=TA_CENTER,
    spaceAfter=36
)

cover_subtitle_style = ParagraphStyle(
    name='CoverSubtitle',
    fontName='Times New Roman',
    fontSize=20,
    leading=28,
    alignment=TA_CENTER,
    spaceAfter=48
)

heading1_style = ParagraphStyle(
    name='Heading1Custom',
    fontName='Times New Roman',
    fontSize=18,
    leading=24,
    spaceBefore=18,
    spaceAfter=12,
    textColor=colors.HexColor('#1F4E79')
)

heading2_style = ParagraphStyle(
    name='Heading2Custom',
    fontName='Times New Roman',
    fontSize=14,
    leading=18,
    spaceBefore=12,
    spaceAfter=8,
    textColor=colors.HexColor('#2E75B6')
)

body_style = ParagraphStyle(
    name='BodyStyle',
    fontName='Times New Roman',
    fontSize=10.5,
    leading=18,
    alignment=TA_JUSTIFY,
    spaceAfter=6
)

header_style = ParagraphStyle(
    name='TableHeader',
    fontName='Times New Roman',
    fontSize=11,
    textColor=colors.white,
    alignment=TA_CENTER
)

cell_style = ParagraphStyle(
    name='TableCell',
    fontName='Times New Roman',
    fontSize=10,
    textColor=colors.black,
    alignment=TA_CENTER
)

cell_style_left = ParagraphStyle(
    name='TableCellLeft',
    fontName='Times New Roman',
    fontSize=10,
    textColor=colors.black,
    alignment=TA_LEFT
)

story = []

# Cover Page
story.append(Spacer(1, 120))
story.append(Paragraph('<b>Synchro PM</b>', cover_title_style))
story.append(Spacer(1, 36))
story.append(Paragraph('Multi-Tenant SaaS Project Management System', cover_subtitle_style))
story.append(Paragraph('Complete Architecture Documentation', ParagraphStyle(
    name='CoverDesc',
    fontName='Times New Roman',
    fontSize=16,
    leading=22,
    alignment=TA_CENTER,
    spaceAfter=48
)))
story.append(Spacer(1, 48))
story.append(Paragraph('Version 1.0', ParagraphStyle(
    name='CoverVersion',
    fontName='Times New Roman',
    fontSize=14,
    leading=22,
    alignment=TA_CENTER
)))
story.append(Paragraph('2024', ParagraphStyle(
    name='CoverYear',
    fontName='Times New Roman',
    fontSize=14,
    leading=22,
    alignment=TA_CENTER
)))
story.append(PageBreak())

# Executive Summary
story.append(Paragraph('<b>1. Executive Summary</b>', heading1_style))
story.append(Paragraph(
    'Synchro PM is a comprehensive, production-ready multi-tenant SaaS project management system designed as a modern alternative to Jira, Redmine, and Asana. Built on Next.js 15 with App Router, it provides a complete solution for organizations to manage projects, tickets, team collaboration, and time tracking with enterprise-grade features.',
    body_style
))
story.append(Spacer(1, 12))
story.append(Paragraph(
    'The system features a modern, responsive UI with dark/light theme support, real-time collaboration capabilities, and comprehensive API endpoints for all operations. It is optimized for deployment on Vercel with serverless architecture and edge function support.',
    body_style
))
story.append(Spacer(1, 18))

# Technology Stack
story.append(Paragraph('<b>2. Technology Stack</b>', heading1_style))
story.append(Paragraph('The system is built on a modern, Vercel-compatible technology stack:', body_style))
story.append(Spacer(1, 12))

tech_data = [
    [Paragraph('<b>Layer</b>', header_style), Paragraph('<b>Technology</b>', header_style), Paragraph('<b>Purpose</b>', header_style)],
    [Paragraph('Frontend', cell_style), Paragraph('Next.js 15 + React 19', cell_style), Paragraph('App Router, Server Components', cell_style_left)],
    [Paragraph('Styling', cell_style), Paragraph('TailwindCSS 4 + ShadCN UI', cell_style), Paragraph('Modern design system', cell_style_left)],
    [Paragraph('State', cell_style), Paragraph('Zustand + TanStack Query', cell_style), Paragraph('Client & server state management', cell_style_left)],
    [Paragraph('Backend', cell_style), Paragraph('Next.js API Routes', cell_style), Paragraph('Serverless functions', cell_style_left)],
    [Paragraph('Database', cell_style), Paragraph('PostgreSQL (Neon/Supabase)', cell_style), Paragraph('Primary data store', cell_style_left)],
    [Paragraph('ORM', cell_style), Paragraph('Prisma', cell_style), Paragraph('Type-safe database access', cell_style_left)],
    [Paragraph('Auth', cell_style), Paragraph('NextAuth.js', cell_style), Paragraph('JWT sessions, OAuth', cell_style_left)],
    [Paragraph('Charts', cell_style), Paragraph('Recharts', cell_style), Paragraph('Data visualization', cell_style_left)],
    [Paragraph('DnD', cell_style), Paragraph('@dnd-kit', cell_style), Paragraph('Drag and drop', cell_style_left)],
]

tech_table = Table(tech_data, colWidths=[1.5*inch, 2.5*inch, 3*inch])
tech_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 7), (-1, 7), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 8), (-1, 8), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 9), (-1, 9), TABLE_ROW_EVEN),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(tech_table)
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Table 1.</b> Technology Stack Overview', ParagraphStyle(name='Caption', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER)))
story.append(Spacer(1, 18))

# Multi-Tenant Architecture
story.append(Paragraph('<b>3. Multi-Tenant Architecture</b>', heading1_style))
story.append(Paragraph(
    'The system implements organization-based multi-tenancy where each organization has complete data isolation. Users can belong to multiple organizations with different roles in each. This design enables true SaaS functionality with subscription-based access control.',
    body_style
))
story.append(Spacer(1, 12))

story.append(Paragraph('<b>3.1 Data Isolation Model</b>', heading2_style))
story.append(Paragraph(
    'All tenant data is scoped at the organization level through foreign key relationships. The Prisma schema enforces cascade deletes to maintain referential integrity while allowing organizations to manage their own data lifecycle. Each organization has isolated projects, tickets, members, and settings.',
    body_style
))
story.append(Spacer(1, 12))

story.append(Paragraph('<b>3.2 Role-Based Access Control</b>', heading2_style))
story.append(Paragraph('The system implements a 5-tier role hierarchy for fine-grained permissions:', body_style))
story.append(Spacer(1, 12))

role_data = [
    [Paragraph('<b>Role</b>', header_style), Paragraph('<b>Permissions</b>', header_style), Paragraph('<b>Use Case</b>', header_style)],
    [Paragraph('OWNER', cell_style), Paragraph('Full organization control, billing, delete org', cell_style_left), Paragraph('Organization founder', cell_style_left)],
    [Paragraph('ADMIN', cell_style), Paragraph('Manage members, create/delete projects, approve time', cell_style_left), Paragraph('Team administrator', cell_style_left)],
    [Paragraph('MANAGER', cell_style), Paragraph('Create projects, manage team assignments', cell_style_left), Paragraph('Project manager', cell_style_left)],
    [Paragraph('MEMBER', cell_style), Paragraph('Create/edit tickets, log time, comment', cell_style_left), Paragraph('Team member', cell_style_left)],
    [Paragraph('GUEST', cell_style), Paragraph('Read-only access to assigned projects', cell_style_left), Paragraph('External stakeholder', cell_style_left)],
]

role_table = Table(role_data, colWidths=[1.2*inch, 3.3*inch, 2.5*inch])
role_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(role_table)
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Table 2.</b> Role-Based Access Control Hierarchy', ParagraphStyle(name='Caption', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER)))
story.append(Spacer(1, 18))

# Database Schema
story.append(Paragraph('<b>4. Database Schema</b>', heading1_style))
story.append(Paragraph(
    'The Prisma schema defines 30+ models covering all aspects of project management. The schema is designed for PostgreSQL with proper indexing for performance and cascade delete rules for data integrity.',
    body_style
))
story.append(Spacer(1, 12))

story.append(Paragraph('<b>4.1 Core Models</b>', heading2_style))

schema_data = [
    [Paragraph('<b>Category</b>', header_style), Paragraph('<b>Models</b>', header_style), Paragraph('<b>Description</b>', header_style)],
    [Paragraph('User Management', cell_style), Paragraph('User, Account, Session', cell_style_left), Paragraph('Authentication and session management', cell_style_left)],
    [Paragraph('Multi-Tenancy', cell_style), Paragraph('Organization, OrganizationMember, OrganizationInvitation', cell_style_left), Paragraph('Tenant isolation and membership', cell_style_left)],
    [Paragraph('Projects', cell_style), Paragraph('Project, ProjectMember, Milestone, Module', cell_style_left), Paragraph('Project hierarchy and organization', cell_style_left)],
    [Paragraph('Tickets', cell_style), Paragraph('Ticket, TicketDependency, KanbanColumn, Sprint', cell_style_left), Paragraph('Work items and workflow', cell_style_left)],
    [Paragraph('Collaboration', cell_style), Paragraph('Comment, Attachment, ChatChannel, ChatMessage', cell_style_left), Paragraph('Team communication', cell_style_left)],
    [Paragraph('Time Tracking', cell_style), Paragraph('TimeLog', cell_style_left), Paragraph('Hours logging and approval', cell_style_left)],
    [Paragraph('Automation', cell_style), Paragraph('CustomField, CustomFieldValue, Workflow, WorkflowStep', cell_style_left), Paragraph('Extensibility and automation', cell_style_left)],
    [Paragraph('Billing', cell_style), Paragraph('Subscription, Invoice', cell_style_left), Paragraph('Stripe-ready billing', cell_style_left)],
]

schema_table = Table(schema_data, colWidths=[1.5*inch, 2.5*inch, 3*inch])
schema_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 7), (-1, 7), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 8), (-1, 8), TABLE_ROW_ODD),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(schema_table)
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Table 3.</b> Database Model Categories', ParagraphStyle(name='Caption', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER)))
story.append(PageBreak())

# API Endpoints
story.append(Paragraph('<b>5. API Endpoints</b>', heading1_style))
story.append(Paragraph(
    'The system provides RESTful API endpoints for all operations, implemented as Next.js API routes. All endpoints require authentication via NextAuth.js JWT sessions and enforce role-based access control.',
    body_style
))
story.append(Spacer(1, 12))

api_data = [
    [Paragraph('<b>Endpoint</b>', header_style), Paragraph('<b>Methods</b>', header_style), Paragraph('<b>Description</b>', header_style)],
    [Paragraph('/api/organizations', cell_style), Paragraph('GET, POST', cell_style), Paragraph('List and create organizations', cell_style_left)],
    [Paragraph('/api/projects', cell_style), Paragraph('GET, POST, PUT, DELETE', cell_style), Paragraph('Full project CRUD operations', cell_style_left)],
    [Paragraph('/api/tickets', cell_style), Paragraph('GET, POST, PUT, DELETE', cell_style), Paragraph('Ticket management with filters', cell_style_left)],
    [Paragraph('/api/comments', cell_style), Paragraph('GET, POST, DELETE', cell_style), Paragraph('Ticket comments and replies', cell_style_left)],
    [Paragraph('/api/time-logs', cell_style), Paragraph('GET, POST, PUT', cell_style), Paragraph('Time tracking and approval', cell_style_left)],
    [Paragraph('/api/notifications', cell_style), Paragraph('GET, POST, PUT', cell_style), Paragraph('User notifications', cell_style_left)],
    [Paragraph('/api/attachments', cell_style), Paragraph('GET, POST, DELETE', cell_style), Paragraph('File uploads and management', cell_style_left)],
]

api_table = Table(api_data, colWidths=[2*inch, 1.5*inch, 3.5*inch])
api_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 7), (-1, 7), TABLE_ROW_EVEN),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(api_table)
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Table 4.</b> API Endpoints Summary', ParagraphStyle(name='Caption', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER)))
story.append(Spacer(1, 18))

# Frontend Views
story.append(Paragraph('<b>6. Frontend Views</b>', heading1_style))
story.append(Paragraph(
    'The user interface is built as a single-page application with multiple views accessible through sidebar navigation. Each view is optimized for its specific use case while maintaining consistent design language.',
    body_style
))
story.append(Spacer(1, 12))

views_data = [
    [Paragraph('<b>View</b>', header_style), Paragraph('<b>Features</b>', header_style)],
    [Paragraph('Dashboard', cell_style), Paragraph('Statistics cards, productivity charts, sprint burndown, activity feed, priority issues', cell_style_left)],
    [Paragraph('Projects', cell_style), Paragraph('Project list with progress, status indicators, member counts, due date tracking', cell_style_left)],
    [Paragraph('Kanban Board', cell_style), Paragraph('Drag-and-drop tickets, multiple columns, priority indicators, assignee avatars', cell_style_left)],
    [Paragraph('Gantt Chart', cell_style), Paragraph('Timeline visualization, project/task hierarchy, progress bars, zoom controls', cell_style_left)],
    [Paragraph('Calendar', cell_style), Paragraph('Monthly calendar, event types, upcoming events sidebar, date selection', cell_style_left)],
    [Paragraph('Team Chat', cell_style), Paragraph('Channel list, direct messages, message threading, user presence, file attachments', cell_style_left)],
    [Paragraph('Settings', cell_style), Paragraph('Organization settings, billing management, integration configuration', cell_style_left)],
]

views_table = Table(views_data, colWidths=[1.5*inch, 5.5*inch])
views_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 7), (-1, 7), TABLE_ROW_EVEN),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(views_table)
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Table 5.</b> Frontend Views and Features', ParagraphStyle(name='Caption', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER)))
story.append(Spacer(1, 18))

# Deployment
story.append(Paragraph('<b>7. Deployment Configuration</b>', heading1_style))
story.append(Paragraph(
    'The system is optimized for Vercel deployment with zero-configuration setup. The following environment variables are required for production deployment:',
    body_style
))
story.append(Spacer(1, 12))

env_data = [
    [Paragraph('<b>Variable</b>', header_style), Paragraph('<b>Required</b>', header_style), Paragraph('<b>Description</b>', header_style)],
    [Paragraph('DATABASE_URL', cell_style), Paragraph('Yes', cell_style), Paragraph('PostgreSQL connection string', cell_style_left)],
    [Paragraph('NEXTAUTH_SECRET', cell_style), Paragraph('Yes', cell_style), Paragraph('JWT secret (32+ chars)', cell_style_left)],
    [Paragraph('NEXTAUTH_URL', cell_style), Paragraph('Yes', cell_style), Paragraph('Production URL', cell_style_left)],
    [Paragraph('GOOGLE_CLIENT_ID', cell_style), Paragraph('Optional', cell_style), Paragraph('Google OAuth client ID', cell_style_left)],
    [Paragraph('GITHUB_CLIENT_ID', cell_style), Paragraph('Optional', cell_style), Paragraph('GitHub OAuth client ID', cell_style_left)],
    [Paragraph('PUSHER_KEY', cell_style), Paragraph('Optional', cell_style), Paragraph('Real-time notifications', cell_style_left)],
    [Paragraph('STRIPE_SECRET_KEY', cell_style), Paragraph('Optional', cell_style), Paragraph('Billing integration', cell_style_left)],
]

env_table = Table(env_data, colWidths=[2*inch, 1*inch, 4*inch])
env_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 7), (-1, 7), TABLE_ROW_EVEN),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(env_table)
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Table 6.</b> Environment Variables', ParagraphStyle(name='Caption', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER)))
story.append(Spacer(1, 18))

# Conclusion
story.append(Paragraph('<b>8. Conclusion</b>', heading1_style))
story.append(Paragraph(
    'Synchro PM provides a complete, production-ready solution for organizations seeking a modern project management platform. With its multi-tenant architecture, comprehensive feature set, and Vercel-optimized deployment, it offers an enterprise-grade alternative to established platforms while maintaining flexibility for customization and growth.',
    body_style
))
story.append(Spacer(1, 12))
story.append(Paragraph(
    'The system is designed to scale with organizational needs, supporting unlimited organizations through its subscription-ready architecture. Future enhancements can include additional integrations, advanced reporting, and AI-powered features.',
    body_style
))

# Build PDF
doc.build(story)
print(f"PDF generated: {pdf_path}")
