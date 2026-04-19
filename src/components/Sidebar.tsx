import React from "react";
import { LayoutDashboard, FileText, ShieldCheck, Settings, Users, Calendar, Book } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", label: "全局控制台", icon: LayoutDashboard },
  { id: "meetings", label: "会议管理", icon: Calendar },
  { id: "recording", label: "会议纪要", icon: FileText },
  { id: "compliance", label: "合规审查", icon: ShieldCheck },
  { id: "documents", label: "文书中心", icon: FileText },
  { id: "knowledge", label: "规则文件库", icon: Book },
  { id: "users", label: "人员名单", icon: Users },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="w-64 bg-mck-navy text-white flex flex-col h-screen sticky top-0">
      <div className="p-8 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-mck-blue flex items-center justify-center font-serif font-bold text-xl">智</div>
          <h1 className="text-xl font-serif font-bold tracking-tight">智理·三会</h1>
        </div>
        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-sans">Corporate Governance AI</p>
      </div>

      <nav className="flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "sidebar-item w-full text-left",
              activeTab === item.id && "active"
            )}
          >
            <item.icon size={18} className={activeTab === item.id ? "text-mck-blue" : "text-white/60"} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-8 border-t border-white/10">
        <button 
          onClick={() => setActiveTab("settings")}
          className={cn(
            "sidebar-item w-full text-left p-0",
            activeTab === "settings" ? "active opacity-100" : "opacity-60 hover:opacity-100"
          )}
        >
          <Settings size={18} className={activeTab === "settings" ? "text-mck-blue" : ""} />
          <span>系统设置</span>
        </button>
      </div>
    </div>
  );
};
