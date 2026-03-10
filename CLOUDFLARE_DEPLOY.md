# Cloudflare Pages Deployment Guide

This guide explains how to deploy this Next.js application to Cloudflare Pages with Turso (libSQL) database.

## Prerequisites

1. **Cloudflare Account** (Free tier works)
2. **Turso Database** - Get one at [turso.tech](https://turso.tech)
3. **GitHub Repository** - Your code must be on GitHub

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Cloudflare Pages  │────▶│   Turso Database    │
│   (Edge Runtime)    │     │   (libSQL/SQLite)   │
│                     │     │                     │
│   - Static Pages    │     │   - Global Edge     │
│   - Pages Functions │     │   - 9GB Free        │
└─────────────────────┘     └─────────────────────┘
```

## Key Configuration Files

| File | Purpose |
|------|---------|
| `wrangler.toml` | Cloudflare configuration with `nodejs_compat` flag |
| `dev.vars` | Local development environment variables |
| `prisma/schema.prisma` | Database schema with `driverAdapters` feature |
| `src/lib/db.ts` | Edge-compatible Prisma client using libsql adapter |

## Step-by-Step Deployment

### Step 1: Enable nodejs_compat Flag

The `nodejs_compat` compatibility flag is already configured in `wrangler.toml`:

```toml
compatibility_flags = ["nodejs_compat"]
```

This enables Node.js APIs in Cloudflare Workers/Pages.

### Step 2: Set Environment Variables in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → Your Project → **Settings** → **Environment Variables**
3. Add the following variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | `libsql://your-db.turso.io` | Production & Preview |
| `TURSO_AUTH_TOKEN` | Your Turso auth token | Production & Preview |
| `NEXTAUTH_SECRET` | Random string (generate one) | Production |
| `NEXTAUTH_URL` | `https://your-app.pages.dev` | Production |
| `NODE_ENV` | `production` | Production |

### Step 3: Connect GitHub Repository

1. In Cloudflare Dashboard, go to **Pages** → **Create a project**
2. Select **Connect to Git**
3. Choose your GitHub repository
4. Configure build settings:
   - **Framework preset**: Next.js
   - **Build command**: `bun run build`
   - **Build output directory**: `.next`
   - **Root directory**: `/`

### Step 4: Deploy

Click **Save and Deploy**. Cloudflare will:
1. Pull your code from GitHub
2. Install dependencies
3. Run the build command
4. Deploy to their global edge network

## Local Development

```bash
# Install dependencies
bun install

# Generate Prisma client
bun run db:generate

# Run development server
bun run dev
```

## Important Notes

### Prisma with libSQL Adapter

Standard Prisma doesn't work in Edge runtime. We use `@prisma/adapter-libsql`:

```typescript
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const libsql = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });
```

### Limitations

1. **No WebSocket** - Use HTTP polling or Cloudflare Durable Objects
2. **No fs module** - Use Cloudflare KV or R2 for file storage
3. **No native modules** - Must use pure JS alternatives

### Troubleshooting

| Error | Solution |
|-------|----------|
| `PrismaClientInitializationError` | Check DATABASE_URL and TURSO_AUTH_TOKEN |
| `Cannot find module '@prisma/client'` | Run `bun run db:generate` |
| `Edge runtime error` | Check all dependencies are edge-compatible |

## Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Turso Documentation](https://docs.turso.tech/)
- [Prisma with libSQL](https://www.prisma.io/docs/orm/overview/databases/libsql)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/functions/frameworks/nextjs/)
