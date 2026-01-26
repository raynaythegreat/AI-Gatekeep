"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import HistoryPage from "@/components/chat/HistoryPage";
import ReposPage from "@/components/github/ReposPage";
import DeploymentsPage from "@/components/deploy/DeploymentsPage";
import MobilePage from '@/app/mobile/page';
import SettingsPage from "@/components/settings/SettingsPage";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { useChatHistory } from "@/contexts/ChatHistoryContext";
import AthenaLogo from "@/components/ui/AthenaLogo";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [isHydrated, setIsHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { loadSession, clearCurrentSession } = useChatHistory();

  useEffect(() => {
    setIsHydrated(true);
    clearCurrentSession();

    // Check if onboarding has been completed
    const onboardingCompleted = localStorage.getItem('onboarding-completed');
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [clearCurrentSession]);

  if (!isHydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-blue-50/5 to-background dark:from-surface-900 dark:via-blue-900/5 dark:to-surface-900">
        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
          <div className="w-20 h-20 mx-auto animate-pulse transition-all">
            <AthenaLogo className="w-full h-full" />
          </div>
          <div className="flex flex-col items-center justify-center space-y-2">
            <p className="text-blue-600 dark:text-blue-400 text-lg font-bold tracking-wide animate-pulse">
              Loading Athena AI<span className="loading-dots">
                <span className="dot-1 animate-blink">.</span>
                <span className="dot-2 animate-blink">.</span>
                <span className="dot-3 animate-blink">.</span>
              </span>
            </p>
            <p className="text-blue-500/80 dark:text-blue-300/80 text-xs font-medium">
              Initializing secure connections
            </p>
          </div>
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
    <>
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
      <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "chat" && <ChatInterface />}
        {activeTab === "history" && <HistoryPage onResumeChat={handleResumeChat} onNewChat={handleNewChat} />}
        {activeTab === "repos" && <ReposPage />}
        {activeTab === "deploy" && <DeploymentsPage />}
        {activeTab === "settings" && <SettingsPage setActiveTab={setActiveTab} />}
        {activeTab === "mobile" && <MobilePage />}
      </DashboardLayout>
    </>
  );
}
