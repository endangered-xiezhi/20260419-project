import React, { useState, useMemo } from "react";
import { StatCard } from "./StatCard";
import { Meeting } from "../types";
import { Clock, Calendar as CalendarIcon, ChevronRight, ChevronLeft, List, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const initialMeetings: Meeting[] = [
  { id: "1", title: "2026年第一次临时股东大会", type: "股东会", date: "2026-04-10", status: "筹备中", complianceScore: 98, notifiedDays: 11 },
  { id: "2", title: "第三届董事会第十二次会议", type: "董事会", date: "2026-03-30", status: "进行中", complianceScore: 85, notifiedDays: 10 },
  { id: "3", title: "2025年度监事会工作会议", type: "监事会", date: "2026-03-15", status: "已结束", complianceScore: 100, notifiedDays: 15 },
  { id: "4", title: "关于股权激励计划的董事会专题会议", type: "董事会", date: "2026-04-20", status: "筹备中", complianceScore: 92, notifiedDays: 22 },
];

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onStartMeeting?: (id: string) => void;
}

// 日历组件
function CalendarView({
  meetings,
  currentDate,
  onDateChange,
  onSelectDate,
  selectedDate,
}: {
  meetings: Meeting[];
  currentDate: Date;
  onDateChange: (d: Date) => void;
  onSelectDate: (date: string) => void;
  selectedDate: string;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    meetings.forEach((m) => {
      const d = m.date;
      if (!map[d]) map[d] = [];
      map[d].push(m);
    });
    return map;
  }, [meetings]);

  const typeColors: Record<string, string> = {
    "股东会": "bg-purple-500",
    "董事会": "bg-mck-blue",
    "监事会": "bg-teal-500",
  };

  const prevMonth = () => onDateChange(new Date(year, month - 1, 1));
  const nextMonth = () => onDateChange(new Date(year, month + 1, 1));

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1;
    const date = new Date(year, month, dayNum);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const isCurrentMonth = dayNum >= 1 && dayNum <= lastDay.getDate();
    const todayStr = new Date().toISOString().split("T")[0];
    const isToday = isCurrentMonth && dateStr === todayStr;
    const isSelected = isCurrentMonth && dateStr === selectedDate;
    const dayMeetings = meetingsByDate[dateStr] || [];

    cells.push(
      <div
        key={i}
        onClick={() => isCurrentMonth && onSelectDate(dateStr)}
        className={cn(
          "min-h-[72px] border rounded-lg p-1.5 transition-all cursor-pointer",
          isSelected ? "border-mck-blue bg-mck-blue/5 ring-1 ring-mck-blue" : "border-mck-border",
          isCurrentMonth ? "bg-white hover:bg-mck-bg/50" : "bg-mck-bg/30 opacity-40 cursor-default",
          isToday && isCurrentMonth ? "ring-2 ring-mck-blue/40" : ""
        )}
      >
        {isCurrentMonth && (
          <>
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-mck-blue text-white" : "text-mck-navy",
                  isSelected && !isToday ? "bg-mck-blue/10 text-mck-blue" : ""
                )}
              >
                {dayNum}
              </span>
            </div>
            <div className="space-y-0.5">
              {dayMeetings.slice(0, 2).map((m) => (
                <div
                  key={m.id}
                  className={cn("text-[10px] px-1 py-0.5 rounded truncate text-white font-bold", typeColors[m.type] || "bg-gray-400")}
                  title={m.title}
                >
                  {m.title}
                </div>
              ))}
              {dayMeetings.length > 2 && (
                <div className="text-[10px] text-center text-mck-navy/40 font-bold">
                  +{dayMeetings.length - 2}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 hover:bg-mck-bg rounded-lg transition-colors">
            <ChevronLeft size={20} className="text-mck-navy/60" />
          </button>
          <span className="text-sm font-serif font-bold text-mck-navy min-w-[140px] text-center">
            {year}年 {month + 1}月
          </span>
          <button onClick={nextMonth} className="p-1.5 hover:bg-mck-bg rounded-lg transition-colors">
            <ChevronRight size={20} className="text-mck-navy/60" />
          </button>
        </div>
        <button
          onClick={() => onDateChange(new Date())}
          className="text-[10px] font-bold uppercase tracking-widest text-mck-blue px-3 py-1 border border-mck-blue/20 rounded-full hover:bg-mck-blue/5 transition-colors"
        >
          今天
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-mck-navy/40 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">{cells}</div>

      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-mck-border">
        <span className="text-[10px] uppercase tracking-widest text-mck-navy/40 font-bold">会议类型：</span>
        {Object.entries({ "股东会": "bg-purple-500", "董事会": "bg-mck-blue", "监事会": "bg-teal-500" }).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-[10px] text-mck-navy/60 font-medium">
            <span className={cn("w-2 h-2 rounded-full", v)} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

// 日期详情面板
function DayPanel({
  selectedDate,
  meetings,
  onClose,
  onNavigate,
}: {
  selectedDate: string;
  meetings: Meeting[];
  onClose: () => void;
  onNavigate: (tab: string) => void;
}) {
  const dayMeetings = meetings
    .filter((m) => m.date === selectedDate)
    .sort((a, b) => a.title.localeCompare(b.title));

  const displayDate = new Date(selectedDate + "T00:00:00");
  const dateStr = `${displayDate.getMonth() + 1}月${displayDate.getDate()}日`;

  const typeColors: Record<string, string> = {
    "股东会": "bg-purple-50 text-purple-700 border-purple-200",
    "董事会": "bg-mck-blue/5 text-mck-blue border-mck-blue/20",
    "监事会": "bg-teal-50 text-teal-700 border-teal-200",
  };
  const statusColors: Record<string, string> = {
    "进行中": "bg-mck-blue text-white border-mck-blue",
    "筹备中": "bg-white text-mck-navy border-mck-border",
    "已结束": "bg-mck-bg text-mck-navy/40 border-mck-bg",
  };

  return (
    <div className="bg-white border-l border-mck-border h-full overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-mck-border px-4 py-3 flex items-center justify-between z-10">
        <div>
          <div className="font-serif font-bold text-sm text-mck-navy">{dateStr}</div>
          <div className="text-[10px] uppercase tracking-widest text-mck-navy/40">
            {dayMeetings.length} 场会议
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-mck-bg rounded transition-colors">
          <X size={16} className="text-mck-navy/40" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        {dayMeetings.length === 0 ? (
          <div className="text-center py-8">
            <CalendarIcon size={32} className="mx-auto text-mck-border mb-2" />
            <p className="text-[10px] text-mck-navy/40">暂无会议安排</p>
          </div>
        ) : (
          dayMeetings.map((m) => (
            <div key={m.id} className="border border-mck-border rounded-lg p-3 hover:shadow-sm transition-shadow bg-mck-bg/50">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border", typeColors[m.type] || "bg-mck-bg text-mck-navy/60 border-mck-border")}>
                  {m.type}
                </span>
                <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 border", statusColors[m.status] || "")}>
                  {m.status}
                </span>
              </div>
              <div className="font-serif font-bold text-sm text-mck-navy mb-2 leading-tight">{m.title}</div>
              <div className="text-[10px] text-mck-navy/40 font-mono uppercase tracking-wider mb-1">
                通知期: <span className={cn(m.notifiedDays < 10 ? "text-mck-red font-bold" : "text-green-600")}>{m.notifiedDays}日</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1 bg-mck-bg rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all", m.complianceScore > 90 ? "bg-green-500" : "bg-mck-blue")}
                    style={{ width: `${m.complianceScore}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold font-mono">{m.complianceScore}%</span>
              </div>
              <button
                onClick={() => onNavigate("meetings")}
                className="w-full text-[10px] font-bold uppercase tracking-widest text-mck-blue hover:text-mck-navy transition-colors py-1 border-t border-mck-border pt-2"
              >
                查看详情 →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [meetings] = useState<Meeting[]>(() => {
    const saved = localStorage.getItem("corporate_meetings_list");
    return saved ? JSON.parse(saved) : initialMeetings;
  });
  const [viewMode, setViewMode] = React.useState<"list" | "calendar">("calendar");
  const [calendarDate, setCalendarDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [showDayPanel, setShowDayPanel] = React.useState(false);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setShowDayPanel(true);
  };

  // 统计数据
  const activeMeetings = meetings.filter((m) => m.status === "筹备中" || m.status === "进行中").length;
  const complianceRate = meetings.length > 0
    ? Math.round(meetings.filter((m) => m.complianceScore >= 90).length / meetings.length * 100)
    : 0;
  const warningCount = meetings.filter((m) => m.notifiedDays < 10).length;
  const docRate = 100;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-serif font-bold text-mck-navy">全局控制台</h2>
        <p className="text-mck-navy/60 mt-1">实时监控三会运作合规性与进度</p>
      </header>

      {/* 可点击的统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate("meetings")}
          className="w-full text-left group cursor-pointer"
        >
          <div className="mck-card group-hover:border-mck-blue group-hover:shadow-md transition-all p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-mck-blue/10 rounded-xl flex items-center justify-center group-hover:bg-mck-blue/20 transition-colors shrink-0">
                <CalendarIcon size={20} className="text-mck-blue" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <div className="text-2xl font-serif font-bold text-mck-navy truncate">{activeMeetings}</div>
                <div className="text-[10px] uppercase tracking-widest text-mck-navy/40 font-bold whitespace-nowrap">待办会议</div>
              </div>
            </div>
            <div className="text-[10px] text-green-600 font-bold mt-2 whitespace-nowrap">查看全部 →</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate("compliance")}
          className="w-full text-left group cursor-pointer"
        >
          <div className="mck-card group-hover:border-green-500 group-hover:shadow-md transition-all p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors shrink-0">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <div className="text-2xl font-serif font-bold text-mck-navy truncate">{complianceRate}%</div>
                <div className="text-[10px] uppercase tracking-widest text-mck-navy/40 font-bold whitespace-nowrap">合规指数</div>
              </div>
            </div>
            <div className="text-[10px] text-green-600 font-bold mt-2 whitespace-nowrap">合规审查 →</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate("compliance")}
          className="w-full text-left group cursor-pointer"
        >
          <div className="mck-card mck-card-accent-red group-hover:shadow-md transition-all p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors shrink-0">
                <AlertCircle size={20} className="text-mck-red" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <div className="text-2xl font-serif font-bold text-mck-navy truncate">{warningCount}</div>
                <div className="text-[10px] uppercase tracking-widest text-mck-navy/40 font-bold whitespace-nowrap">法定通知预警</div>
              </div>
            </div>
            <div className="text-[10px] text-mck-red font-bold mt-2 whitespace-nowrap">查看详情 →</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate("documents")}
          className="w-full text-left group cursor-pointer"
        >
          <div className="mck-card group-hover:border-mck-blue group-hover:shadow-md transition-all p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-mck-blue/10 rounded-xl flex items-center justify-center group-hover:bg-mck-blue/20 transition-colors shrink-0">
                <Clock size={20} className="text-mck-blue" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <div className="text-2xl font-serif font-bold text-mck-navy truncate">{docRate}%</div>
                <div className="text-[10px] uppercase tracking-widest text-mck-navy/40 font-bold whitespace-nowrap">文书生成率</div>
              </div>
            </div>
            <div className="text-[10px] text-green-600 font-bold mt-2 whitespace-nowrap">文书中心 →</div>
          </div>
        </button>
      </div>

      {/* 日历视图 */}
      <div className="flex gap-6" style={{ minHeight: "520px" }}>
        <div className="flex-1">
          <div className="mck-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-serif font-bold text-mck-navy flex items-center gap-2">
                <CalendarIcon size={18} className="text-mck-blue" />
                会议日历
              </h3>
              <button
                onClick={() => { setViewMode("list"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest text-mck-navy/40 hover:text-mck-navy hover:bg-mck-bg transition-all"
              >
                <List size={14} />
                列表
              </button>
            </div>
            <CalendarView
              meetings={meetings}
              currentDate={calendarDate}
              onDateChange={setCalendarDate}
              onSelectDate={handleSelectDate}
              selectedDate={selectedDate}
            />
          </div>
        </div>
        {showDayPanel && (
          <div className="w-80">
            <div className="mck-card h-full">
              <DayPanel
                selectedDate={selectedDate}
                meetings={meetings}
                onClose={() => setShowDayPanel(false)}
                onNavigate={onNavigate}
              />
            </div>
          </div>
        )}
      </div>

      {/* 列表视图 */}
      {viewMode === "list" && (
        <div className="mck-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-serif font-bold flex items-center gap-2">
              <Clock size={20} className="text-mck-blue" />
              近期会议日程
            </h3>
            <button
              onClick={() => { setViewMode("calendar"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest text-mck-navy/40 hover:text-mck-navy hover:bg-mck-bg transition-all"
            >
              <CalendarIcon size={14} />
              日历
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-mck-border text-[10px] uppercase tracking-widest text-mck-navy/40">
                  <th className="pb-4 font-medium">会议名称</th>
                  <th className="pb-4 font-medium">类型</th>
                  <th className="pb-4 font-medium">日期</th>
                  <th className="pb-4 font-medium">通知状态</th>
                  <th className="pb-4 font-medium">合规性</th>
                  <th className="pb-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {meetings.map((m) => (
                  <tr key={m.id} className="border-b border-mck-border last:border-0">
                    <td className="py-4 font-medium">{m.title}</td>
                    <td className="py-4 text-mck-navy/60">{m.type}</td>
                    <td className="py-4 font-mono">{m.date}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase ${m.notifiedDays >= 10 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        提前 {m.notifiedDays} 日
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-mck-bg rounded-full overflow-hidden">
                          <div className="h-full bg-mck-blue" style={{ width: `${m.complianceScore}%` }} />
                        </div>
                        <span className="text-[10px] font-bold">{m.complianceScore}%</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => onNavigate("meetings")}
                        className="text-[10px] font-bold uppercase tracking-widest text-mck-blue hover:text-mck-navy transition-colors"
                      >
                        查看 <ChevronRight size={12} className="inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
