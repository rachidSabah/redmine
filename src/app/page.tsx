import MainDashboard from "@/components/dashboard/main-dashboard";

// Force dynamic rendering to avoid prerender errors with useSession
export const dynamic = 'force-dynamic';

export default function Page() {
  return <MainDashboard />;
}
