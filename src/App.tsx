import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { RecordingWorkspace } from "./components/RecordingWorkspace";
import { DocumentCenter } from "./components/DocumentCenter";
import { MeetingManager } from "./components/MeetingManager";
import { ComplianceReview } from "./components/ComplianceReview";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { SystemSettings } from "./components/SystemSettings";
import { PersonnelMatrix } from "./components/PersonnelMatrix";
import { Search, Bell, User, LogOut, Settings, ChevronDown, X, FileText, Book, Briefcase, Calendar, AlertCircle } from "lucide-react";
import { cn } from "./lib/utils";

// 模糊搜索函数
const fuzzySearch = (text: string, query: string): boolean => {
  if (!query.trim()) return true;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escapedQuery.split('').join('.*');
  const regex = new RegExp(pattern, 'i');
  return regex.test(text);
};

interface SearchResult {
  id: string;
  title: string;
  source: "文书生成" | "规则文件库";
  category?: string;
  status?: string;
  date?: string;
}

interface MeetingReminder {
  id: string;
  title: string;
  type: string;
  date: string;
  daysUntil: number;
  status: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem("corporate_active_tab") || "dashboard";
    } catch {
      return "dashboard";
    }
  });
  const [settingsSubTab, setSettingsSubTab] = useState<"account" | "system">("account");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("corporate_active_meeting_id");
    } catch {
      return null;
    }
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(() => {
    try {
      const lastRead = localStorage.getItem("corporate_notifications_last_read");
      const today = new Date().toDateString();
      return lastRead === today;
    } catch {
      return false;
    }
  });
  const [meetingReminders, setMeetingReminders] = useState<MeetingReminder[]>([]);
  const [emailEditParams, setEmailEditParams] = useState<any>(null);
  const [complianceWarningCount, setComplianceWarningCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // 导航函数 - 使用 History API 支持浏览器前进/后退
  const navigateTo = (tab: string, params?: any) => {
    if (tab === "documents" && params?.editEmailFor) {
      setEmailEditParams(params);
    } else {
      setEmailEditParams(null);
    }
    window.history.pushState({ tab }, "", `#${tab}`);
    setActiveTab(tab);
  };

  // 处理合规审查完成，将结果保存到文书中心
  const handleComplianceReviewComplete = (docId: string, score: number, reviewRecordId: string) => {
    // 保存合规审查结果到 localStorage（与 DocumentCenter 相同的存储位置）
    const savedResults = localStorage.getItem("corporate_doc_compliance_results");
    const results = savedResults ? JSON.parse(savedResults) : {};
    results[docId] = { docId, score, reviewRecordId };
    localStorage.setItem("corporate_doc_compliance_results", JSON.stringify(results));
    
    // 触发自定义事件通知文书中心刷新数据
    window.dispatchEvent(new CustomEvent('compliance-review-complete', { detail: { docId, score, reviewRecordId } }));
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

  // 计算合规审查预警数量
  useEffect(() => {
    const saved = localStorage.getItem("corporate_compliance_records");
    if (saved) {
      const records = JSON.parse(saved);
      // 计算有风险的记录数量
      let warningCount = 0;
      records.forEach((record: any) => {
        if (record.aiResponse) {
          const response = record.aiResponse.toLowerCase();
          if (response.includes("风险") || response.includes("不合规") || response.includes("违规")) {
            warningCount++;
          }
        }
      });
      setComplianceWarningCount(warningCount);
    } else {
      setComplianceWarningCount(0);
    }
  }, [activeTab]);

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

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // 点击外部关闭通知栏
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // 获取即将到来的会议提醒（提前10天）
  const fetchMeetingReminders = () => {
    const reminders: MeetingReminder[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 从 localStorage 读取会议数据
    let meetings: any[] = [];
    try {
      const savedMeetings = localStorage.getItem("corporate_meetings_list");
      meetings = savedMeetings ? JSON.parse(savedMeetings) : [];
    } catch {
      return reminders;
    }
    
    meetings.forEach((meeting: any) => {
      if (meeting.status === "已结束") return;
      
      const meetingDate = new Date(meeting.date);
      meetingDate.setHours(0, 0, 0, 0);
      
      const diffTime = meetingDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // 提前10天内且还未开始的会议
      if (diffDays >= 0 && diffDays <= 10) {
        reminders.push({
          id: meeting.id,
          title: meeting.title,
          type: meeting.type,
          date: meeting.date,
          daysUntil: diffDays,
          status: meeting.status,
        });
      }
    });
    
    // 按剩余天数排序（越近的排前面）
    reminders.sort((a, b) => a.daysUntil - b.daysUntil);
    return reminders;
  };

  // 定期更新会议提醒
  useEffect(() => {
    setMeetingReminders(fetchMeetingReminders());
    
    // 每分钟更新一次
    const interval = setInterval(() => {
      setMeetingReminders(fetchMeetingReminders());
    }, 60000);
    
    return () => clearInterval(interval);
  }, [activeTab]); // 切换页面时也更新

  // 监听其他页面/标签修改会议数据，重置已读状态以显示新提醒
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "corporate_meetings_list") {
        // 会议数据发生变化，重置已读状态
        setNotificationsRead(false);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 全局搜索逻辑
  const performGlobalSearch = (query: string) => {
    setGlobalSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const results: SearchResult[] = [];

    // 搜索文书生成
    try {
      const savedDocs = localStorage.getItem("corporate_generated_documents");
      if (savedDocs) {
        const docs = JSON.parse(savedDocs);
        docs.forEach((doc: any) => {
          if (fuzzySearch(doc.title, query) || fuzzySearch(doc.content || "", query)) {
            results.push({
              id: doc.id,
              title: doc.title,
              source: "文书生成",
              category: doc.category,
              status: doc.status,
              date: doc.date,
            });
          }
        });
      }
    } catch {}

    // 搜索规则文件库
    try {
      const savedKnowledge = localStorage.getItem("corporate_knowledge_base");
      if (savedKnowledge) {
        const knowledge = JSON.parse(savedKnowledge);
        knowledge.forEach((item: any) => {
          if (fuzzySearch(item.title, query) || fuzzySearch(item.content || "", query)) {
            results.push({
              id: item.id,
              title: item.title,
              source: "规则文件库",
              category: item.category,
              status: item.status,
              date: item.lastModified,
            });
          }
        });
      }
    } catch {}

    setSearchResults(results.slice(0, 20)); // 限制显示20条
    setShowSearchResults(true);
  };

  // 点击搜索结果导航
  const handleSearchResultClick = (result: SearchResult) => {
    setShowSearchResults(false);
    setGlobalSearchQuery("");
    if (result.source === "文书生成") {
      navigateTo("documents");
    } else {
      navigateTo("knowledge");
    }
  };

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
          <div className="relative" ref={searchRef}>
            <div className="flex items-center gap-4 text-mck-navy/40">
              <Search size={18} />
              <input
                type="text"
                placeholder="搜索议案、法规或文书..."
                value={globalSearchQuery}
                onChange={(e) => performGlobalSearch(e.target.value)}
                onFocus={() => globalSearchQuery && setShowSearchResults(true)}
                className="text-sm bg-transparent focus:outline-none w-64 text-mck-navy"
              />
              {globalSearchQuery && (
                <button
                  onClick={() => { setGlobalSearchQuery(""); setSearchResults([]); setShowSearchResults(false); }}
                  className="text-mck-navy/40 hover:text-mck-navy"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 搜索结果下拉 */}
            {showSearchResults && (
              <div className="absolute top-full left-0 mt-2 w-[480px] bg-white rounded-lg shadow-xl border border-mck-border z-50 max-h-[400px] overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-mck-navy/50">
                    未找到相关结果
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-mck-bg/50 border-b border-mck-border">
                      <span className="text-xs text-mck-navy/50">找到 {searchResults.length} 条结果</span>
                    </div>
                    {searchResults.map((result, index) => (
                      <div
                        key={`${result.id}-${index}`}
                        onClick={() => handleSearchResultClick(result)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-mck-bg cursor-pointer border-b border-mck-border/50 last:border-b-0 transition-colors"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded flex items-center justify-center",
                          result.source === "文书生成" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                        )}>
                          {result.source === "文书生成" ? <FileText size={16} /> : <Book size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-mck-navy truncate">{result.title}</p>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0",
                              result.source === "文书生成" 
                                ? result.category === "基础制度" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-600"
                            )}>
                              {result.category || result.source}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              result.source === "文书生成" ? "bg-mck-blue/10 text-mck-blue" : "bg-green-100 text-green-600"
                            )}>
                              {result.source}
                            </span>
                            {result.status && (
                              <span className={cn(
                                "text-[10px]",
                                result.status === "已签章" ? "text-green-600" :
                                result.status === "待审核" ? "text-orange-600" : "text-gray-500"
                              )}>
                                {result.status}
                              </span>
                            )}
                            {result.date && (
                              <span className="text-[10px] text-mck-navy/40">{result.date}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setShowNotifications(!showNotifications); 
                  setMeetingReminders(fetchMeetingReminders());
                  // 点击后标记为已读
                  if (!showNotifications) {
                    const today = new Date().toDateString();
                    localStorage.setItem("corporate_notifications_last_read", today);
                    setNotificationsRead(true);
                  }
                }}
                className="relative text-mck-navy/60 hover:text-mck-blue transition-colors"
              >
                <Bell size={20} />
                {meetingReminders.length > 0 && !notificationsRead && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-mck-red rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">{meetingReminders.length > 9 ? '9+' : meetingReminders.length}</span>
                  </span>
                )}
              </button>

              {/* 会议提醒下拉 */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-lg shadow-xl border border-mck-border z-50 max-h-[400px] overflow-y-auto">
                  <div className="px-4 py-3 bg-mck-blue text-white rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span className="text-sm font-bold">会议日程提醒</span>
                    </div>
                    <p className="text-[10px] text-white/70 mt-1">提前10天内即将召开的会议</p>
                  </div>
                  
                  {meetingReminders.length === 0 ? (
                    <div className="p-6 text-center text-sm text-mck-navy/50">
                      <Calendar size={32} className="mx-auto mb-2 text-mck-border" />
                      <p>近期没有待召开的会议</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-mck-border/50">
                      {meetingReminders.map((reminder) => (
                        <div
                          key={reminder.id}
                          onClick={() => {
                            setSelectedMeetingId(reminder.id);
                            navigateTo("meetings");
                            setShowNotifications(false);
                          }}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-mck-bg cursor-pointer transition-colors"
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0",
                            reminder.daysUntil === 0 ? "bg-mck-red text-white" :
                            reminder.daysUntil <= 3 ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                          )}>
                            <span className="text-lg font-bold leading-none">{reminder.daysUntil}</span>
                            <span className="text-[8px] uppercase">天</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-mck-navy truncate">{reminder.title}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                reminder.type === "股东会" ? "bg-purple-100 text-purple-600" :
                                reminder.type === "董事会" ? "bg-blue-100 text-blue-600" : "bg-teal-100 text-teal-600"
                              )}>
                                {reminder.type}
                              </span>
                              <span className="text-[10px] text-mck-navy/50">
                                {reminder.date}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {reminder.daysUntil === 0 ? (
                                <span className="text-[10px] font-bold text-mck-red">今日召开！</span>
                              ) : reminder.daysUntil === 1 ? (
                                <span className="text-[10px] font-bold text-orange-600">明天召开</span>
                              ) : (
                                <span className="text-[10px] text-mck-navy/40">
                                  距召开还有 <span className="font-bold text-mck-blue">{reminder.daysUntil}</span> 天
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="px-4 py-2 bg-mck-bg/50 border-t border-mck-border rounded-b-lg">
                    <button
                      onClick={() => {
                        navigateTo("meetings");
                        setShowNotifications(false);
                      }}
                      className="w-full text-center text-xs text-mck-blue hover:text-mck-navy font-bold transition-colors"
                    >
                      查看全部会议 →
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                      onClick={() => { 
                        setShowUserMenu(false); 
                        setSettingsSubTab("account");
                        navigateTo("settings"); 
                      }}
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
          {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} complianceWarningCount={complianceWarningCount} />}
          {activeTab === "meetings" && (
            <MeetingManager onStartMeeting={handleStartMeeting} onNavigate={navigateTo} />
          )}
          {activeTab === "recording" && (
            <RecordingWorkspace 
              meetingId={selectedMeetingId} 
              onAnalysisComplete={handleGoToCompliance}
              onNavigateToDocuments={() => {
                setActiveTab("documents");
                // 延迟滚动到锚点，等待DOM渲染完成
                setTimeout(() => {
                  const element = document.getElementById("document-folder-anchor");
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }, 100);
              }}
            />
          )}
          {activeTab === "compliance" && (
            <ComplianceReview 
              meetingId={selectedMeetingId} 
              onGenerateDocuments={handleGoToDocuments}
              onReviewComplete={handleComplianceReviewComplete}
            />
          )}
          {activeTab === "documents" && (
            <DocumentCenter 
              meetingId={selectedMeetingId}
              editEmailFor={emailEditParams?.editEmailFor}
              onEmailSaved={() => setEmailEditParams(null)}
              onEmailClosed={() => setEmailEditParams(null)}
              onSendComplete={() => {
                setEmailEditParams(null);
                setActiveTab("meetings");
              }}
              onComplianceReview={(docId) => {
                setActiveTab("compliance");
              }}
              onNavigateToKnowledge={() => setActiveTab("knowledge")}
            />
          )}
          {activeTab === "knowledge" && <KnowledgeBase />}
          {activeTab === "settings" && (
            <SystemSettings 
              defaultSubTab={settingsSubTab}
              onSubTabChange={setSettingsSubTab}
            />
          )}
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
