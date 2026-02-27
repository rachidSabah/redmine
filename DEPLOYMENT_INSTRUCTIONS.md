# Deployment Instructions

## Problem
The production Vercel deployment has an old version of the code with a bug:
- Error: "A <Select.Item /> must have a value prop that is not an empty string"

## Solution
The fix has been applied locally. You need to push these changes to production.

## Option 1: Push to GitHub (Recommended if connected)

```bash
cd /home/z/my-project
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main --force
```

Vercel will automatically deploy when connected to GitHub.

## Option 2: Deploy via Vercel CLI

```bash
cd /home/z/my-project
npx vercel --prod
```

You will need to log in first:
```bash
npx vercel login
```

## Option 3: Use the Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Find your project "my-project"
3. Go to Settings > Git
4. Connect a GitHub repository or trigger a manual redeploy

## Changes Made

### Files Modified:
- `src/components/education/education-dashboard.tsx`

### Fixes Applied:
1. All Select components now use fallback values to prevent empty strings:
   - `value={field || "placeholder"}` pattern
   
2. All dynamic SelectItem lists have ID filters:
   - `items.filter(item => item.id).map(item => ...)`

3. Default placeholder options added to all selects:
   - "select-class", "no-class", "no-session", "all", etc.

## Verify the Fix

After deployment, check:
1. https://my-project-eta-tawny.vercel.app/api/version
   Should show: `{"version": "2024-02-27-fix3", ...}`

2. Go to Education > Attendance tab - should load without error

## Quick Test

Run locally first:
```bash
cd /home/z/my-project
bun run dev
# Visit http://localhost:3000 and check the Education > Attendance tab
```
