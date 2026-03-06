import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/layout/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synchro PM - Modern Project Management",
  description: "A comprehensive multi-tenant SaaS project management system combining the best of Jira, Redmine, and Asana.",
  keywords: ["Project Management", "SaaS", "Kanban", "Gantt", "Team Collaboration", "Issue Tracking"],
  authors: [{ name: "Synchro PM Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Synchro PM - Modern Project Management",
    description: "Multi-tenant SaaS project management system",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
