"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import HistoryPage from "@/components/chat/HistoryPage";
import ReposPage from "@/components/github/ReposPage";
import DeploymentsPage from "@/components/deploy/DeploymentsPage";
import SettingsPage from "@/components/settings/SettingsPage";
import { useChatHistory } from "@/contexts/ChatHistoryContext";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [isHydrated, setIsHydrated] = useState(false);
  const { loadSession, clearCurrentSession } = useChatHistory();

  useEffect(() => {
    setIsHydrated(true);
    clearCurrentSession();
  }, [clearCurrentSession]);

  if (!isHydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground/60 text-sm">Loading OS Athena...</p>
        </div>
      </div>
    );
  }

  const handleResumeChat = (sessionId: string) => {
    loadSession(sessionId);
    setActiveTab("chat");
  };

  const handleNewChat = () => {
    clearCurrentSession();
    setActiveTab("chat");
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "chat" && <ChatInterface />}
      {activeTab === "history" && <HistoryPage onResumeChat={handleResumeChat} onNewChat={handleNewChat} />}
      {activeTab === "repos" && <ReposPage />}
      {activeTab === "deploy" && <DeploymentsPage />}
      {activeTab === "settings" && <SettingsPage />}
    </DashboardLayout>
  );
}
