# Synchro PM - Deployment Guide

## Complete Multi-Tenant SaaS Project Management System

This guide provides step-by-step instructions for deploying Synchro PM to Vercel with PostgreSQL database.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [Environment Variables](#environment-variables)
5. [OAuth Configuration](#oauth-configuration)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- A [Vercel account](https://vercel.com) (free tier works)
- A PostgreSQL database (recommended: Neon, Supabase, or Railway)
- GitHub account for OAuth (optional)
- Google Cloud account for OAuth (optional)

---

## Database Setup

### Option 1: Neon (Recommended - Free Tier)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project named "synchro-pm"
3. Copy the connection string from the dashboard
4. Format: `postgresql://username:password@ep-xxx.region.aws.neon.tech/synchro_pm?sslmode=require`

### Option 2: Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. Navigate to Settings > Database
3. Copy the connection string (URI format)
4. Replace `[YOUR-PASSWORD]` with your database password

### Option 3: Railway

1. Go to [railway.app](https://railway.app)
2. Create a new PostgreSQL database
3. Copy the connection URL from the variables

---

## Vercel Deployment

### Step 1: Fork/Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/synchro-pm.git
cd synchro-pm
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." > "Project"
3. Import your repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `bun run build` (or `npm run build`)
   - **Output Directory**: `.next`

### Step 3: Add Environment Variables

Before clicking "Deploy", add these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `NEXTAUTH_SECRET` | Random 32+ character string | `your-secret-key-here` |
| `NEXTAUTH_URL` | Your Vercel URL | `https://synchro-pm.vercel.app` |

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### Step 4: Deploy

Click "Deploy" and wait for the build to complete.

---

## Environment Variables

### Required Variables

```env
# Database (Required)
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"

# NextAuth (Required)
NEXTAUTH_SECRET="your-super-secret-key-min-32-characters"
NEXTAUTH_URL="https://your-domain.vercel.app"
```

### Optional Variables

```env
# OAuth Providers
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN="vercel_blob_xxx"

# Real-time (Pusher)
PUSHER_APP_ID="xxx"
PUSHER_KEY="xxx"
PUSHER_SECRET="xxx"
PUSHER_CLUSTER="us2"

# Email (Resend)
RESEND_API_KEY="re_xxx"

# Billing (Stripe)
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
```

---

## OAuth Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to APIs & Services > Credentials
4. Click "Create Credentials" > "OAuth client ID"
5. Configure:
   - Application type: Web application
   - Authorized JavaScript origins: `https://your-domain.vercel.app`
   - Authorized redirect URIs: `https://your-domain.vercel.app/api/auth/callback/google`
6. Copy Client ID and Client Secret to Vercel environment variables

### GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Configure:
   - Application name: Synchro PM
   - Homepage URL: `https://your-domain.vercel.app`
   - Authorization callback URL: `https://your-domain.vercel.app/api/auth/callback/github`
4. Copy Client ID and generate Client Secret
5. Add to Vercel environment variables

---

## Post-Deployment

### Database Migration

After deployment, run Prisma migrations:

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Ensure `DATABASE_URL` is set correctly
4. Go to Deployments and click on the latest deployment
5. Click "Redeploy" with "Use existing Build Cache" unchecked

Or use Vercel CLI:
```bash
vercel env pull .env
npx prisma migrate deploy
npx prisma db seed
```

### Create First Admin User

1. Visit your deployed application
2. Sign up with Google or GitHub OAuth
3. The first user automatically becomes the organization owner

### Configure Custom Domain (Optional)

1. Go to Vercel project Settings > Domains
2. Add your custom domain
3. Update `NEXTAUTH_URL` to match the new domain
4. Update OAuth callback URLs

---

## System Architecture

### Multi-Tenant Data Model

```
┌─────────────────┐
│   User          │
│  (Account)      │
└────────┬────────┘
         │
         │ belongs to many
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Organization    │────▶│ OrganizationMember│
│ (Tenant)        │     │ (Role, Settings) │
└────────┬────────┘     └──────────────────┘
         │
         │ has many
         ▼
┌─────────────────┐
│    Project      │
│ (Workspace)     │
└────────┬────────┘
         │
         │ has many
         ▼
┌─────────────────┐     ┌──────────────────┐
│    Ticket       │────▶│ Comment, TimeLog │
│ (Work Item)     │     │ Attachment, etc. │
└─────────────────┘     └──────────────────┘
```

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| OWNER | Full organization control, billing, delete org |
| ADMIN | Manage members, create/delete projects, approve time |
| MANAGER | Create projects, manage team assignments |
| MEMBER | Create/edit tickets, log time, comment |
| GUEST | Read-only access to assigned projects |

---

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session

### Organizations
- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tickets
- `GET /api/tickets` - List tickets (with filters)
- `POST /api/tickets` - Create ticket
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket

### Comments
- `GET /api/comments?ticketId=xxx` - Get ticket comments
- `POST /api/comments` - Create comment
- `DELETE /api/comments/:id` - Delete comment

### Time Logs
- `GET /api/time-logs` - List time logs
- `POST /api/time-logs` - Log time
- `PUT /api/time-logs/:id` - Approve/reject time log

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications` - Mark as read

### Attachments
- `GET /api/attachments` - List attachments
- `POST /api/attachments` - Upload file
- `DELETE /api/attachments/:id` - Delete attachment

---

## Troubleshooting

### Common Issues

#### Database Connection Error
```
Error: P1001: Can't reach database server
```
**Solution**: Verify DATABASE_URL is correct and database is running. Check if SSL mode is required.

#### NextAuth Session Error
```
Error: JWT session error
```
**Solution**: Ensure NEXTAUTH_SECRET is at least 32 characters and NEXTAUTH_URL matches your domain.

#### Build Failure
```
Error: Prisma Client not found
```
**Solution**: Add `prisma generate` to build script or run postinstall hook.

### Debug Mode

Enable debug logging in Vercel:
1. Add environment variable: `DEBUG=*`
2. Check Vercel logs for detailed error messages

### Support

- GitHub Issues: [github.com/your-repo/issues](https://github.com/your-repo/issues)
- Documentation: [docs.synchro-pm.com](https://docs.synchro-pm.com)

---

## License

MIT License - See LICENSE file for details.
