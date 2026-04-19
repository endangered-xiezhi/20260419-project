import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { RecordingWorkspace } from "./components/RecordingWorkspace";
import { DocumentCenter } from "./components/DocumentCenter";
import { MeetingManager } from "./components/MeetingManager";
import { ComplianceReview } from "./components/ComplianceReview";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { SystemSettings } from "./components/SystemSettings";
import { PersonnelMatrix } from "./components/PersonnelMatrix";
import { Search, Bell, User, LogOut, Settings, ChevronDown } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("corporate_active_tab") || "dashboard";
  });
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(() => {
    return localStorage.getItem("corporate_active_meeting_id");
  });
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 导航函数 - 使用 History API 支持浏览器前进/后退
  const navigateTo = (tab: string) => {
    window.history.pushState({ tab }, "", `#${tab}`);
    setActiveTab(tab);
  };

  // 监听浏览器前进/后退
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.tab) {
        setActiveTab(e.state.tab);
      } else {
        setActiveTab("dashboard");
      }
    };

    window.addEventListener("popstate", handlePopState);
    // 初始化时设置当前状态
    window.history.replaceState({ tab: activeTab }, "", `#${activeTab}`);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    localStorage.setItem("corporate_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedMeetingId) {
      localStorage.setItem("corporate_active_meeting_id", selectedMeetingId);
    } else {
      localStorage.removeItem("corporate_active_meeting_id");
    }
  }, [selectedMeetingId]);

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showUserMenu) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = () => {
    // 清除登录状态
    localStorage.clear();
    setShowUserMenu(false);
    // 刷新页面或跳转到登录页
    window.location.reload();
  };

  const handleStartMeeting = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    navigateTo("recording");
  };

  const handleGoToCompliance = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    navigateTo("compliance");
  };

  const handleGoToDocuments = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    navigateTo("documents");
  };

  const handleEditMeeting = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    navigateTo("documents");
  };

  return (
    <div className="flex min-h-screen bg-mck-bg">
      <Sidebar activeTab={activeTab} setActiveTab={navigateTo} />
      
      <main className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-mck-border flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 text-mck-navy/40">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="搜索议案、法规或文书..." 
              className="text-sm bg-transparent focus:outline-none w-64 text-mck-navy"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative text-mck-navy/60 hover:text-mck-blue transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-mck-red rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-mck-border" />
            {/* 用户信息下拉菜单 */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
                className="flex items-center gap-3 hover:bg-mck-bg/50 rounded-lg px-2 py-1 transition-colors"
              >
                <div className="text-right">
                  <p className="text-xs font-bold text-mck-navy leading-none">bmmemail@163.com</p>
                  <p className="text-[10px] text-mck-navy/40 uppercase tracking-wider mt-1">法务总监</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-mck-navy flex items-center justify-center text-white">
                  <User size={16} />
                </div>
                <ChevronDown size={14} className={`text-mck-navy/40 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
              </button>

              {/* 下拉菜单 */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-mck-border z-50 overflow-hidden">
                  {/* 用户信息头部 */}
                  <div className="p-4 bg-mck-bg/30 border-b border-mck-border">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-mck-navy flex items-center justify-center text-white">
                        <User size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-mck-navy">bmmemail@163.com</p>
                        <p className="text-xs text-mck-navy/40 mt-0.5">法务总监</p>
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-green-100 text-green-700 rounded">已激活</span>
                      </div>
                    </div>
                  </div>

                  {/* 基本信息 */}
                  <div className="p-4 border-b border-mck-border space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-mck-navy/40">用户ID</span>
                      <span className="font-mono text-mck-navy">USR-2026-001</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-mck-navy/40">所属部门</span>
                      <span className="text-mck-navy">法务合规部</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-mck-navy/40">最后登录</span>
                      <span className="text-mck-navy">2026-04-15 22:30</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="p-2">
                    <button
                      onClick={() => { setShowUserMenu(false); navigateTo("settings"); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-mck-navy hover:bg-mck-bg rounded-lg transition-colors"
                    >
                      <Settings size={16} className="text-mck-navy/40" />
                      <span>账户设置</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-mck-red hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut size={16} />
                      <span>退出登录</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 flex-1 overflow-y-auto">
          {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === "meetings" && (
            <MeetingManager onStartMeeting={handleStartMeeting} onNavigate={navigateTo} />
          )}
          {activeTab === "recording" && (
            <RecordingWorkspace 
              meetingId={selectedMeetingId} 
              onAnalysisComplete={handleGoToCompliance} 
            />
          )}
          {activeTab === "compliance" && (
            <ComplianceReview 
              meetingId={selectedMeetingId} 
              onGenerateDocuments={handleGoToDocuments} 
            />
          )}
          {activeTab === "documents" && (
            <DocumentCenter meetingId={selectedMeetingId} />
          )}
          {activeTab === "knowledge" && <KnowledgeBase />}
          {activeTab === "settings" && <SystemSettings />}
          {activeTab === "users" && <PersonnelMatrix />}
          
          {/* Fallback for unknown tabs */}
          {!["dashboard", "meetings", "recording", "compliance", "documents", "knowledge", "settings", "users"].includes(activeTab) && (
            <div className="h-full flex flex-col items-center justify-center text-mck-navy/40">
              <p className="text-lg font-serif italic">模块建设中...</p>
              <p className="text-xs mt-2 uppercase tracking-widest">Module under construction</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
