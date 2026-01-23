import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatHistoryProvider } from "@/contexts/ChatHistoryContext";
import { ApiUsageProvider } from "@/contexts/ApiUsageContext";
import { DeploymentProvider } from "@/contexts/DeploymentContext";
import { FileAccessProvider } from "@/contexts/FileAccessContext";

export const metadata: Metadata = {
  title: "OS Athena - AI Dev Command Center",
  description:
    "OS Athena is a professional AI command center for planning, building, and deploying web applications with confidence.",
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <style dangerouslySetInnerHTML={{__html: `
          body {
            background: #0a0a0f;
            color: #ffffff;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
          }
          #__next { min-height: 100vh; }
        `}} />
      </head>
      <body className="antialiased overflow-x-hidden">
        <ThemeProvider>
          <ChatHistoryProvider>
            <ApiUsageProvider>
              <DeploymentProvider>
                <FileAccessProvider>
                  <div className="min-h-screen bg-background text-foreground">
                    {children}
                  </div>
                </FileAccessProvider>
              </DeploymentProvider>
            </ApiUsageProvider>
          </ChatHistoryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}