import React, { useState, useEffect, useMemo } from "react";
import { Plus, Filter, Calendar as CalendarIcon, MoreHorizontal, ChevronRight, ChevronLeft, List, X, Edit2 } from "lucide-react";
import { Meeting, MeetingType } from "../types";
import { cn } from "@/lib/utils";

const initialMeetings: Meeting[] = [
  { id: "1", title: "2026年第一次临时股东大会", type: "股东会", date: "2026-04-10", status: "筹备中", complianceScore: 98, notifiedDays: 11 },
  { id: "2", title: "第三届董事会第十二次会议", type: "董事会", date: "2026-03-30", status: "进行中", complianceScore: 85, notifiedDays: 10 },
  { id: "3", title: "2025年度监事会工作会议", type: "监事会", date: "2026-03-15", status: "已结束", complianceScore: 100, notifiedDays: 15 },
  { id: "4", title: "关于股权激励计划的董事会专题会议", type: "董事会", date: "2026-04-20", status: "筹备中", complianceScore: 92, notifiedDays: 22 },
];

interface MeetingManagerProps {
  onStartMeeting?: (id: string) => void;
  onNavigate?: (tab: string) => void;
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
    meetings.forEach((m) => { map[m.date] = (map[m.date] || []).concat(m); });
    return map;
  }, [meetings]);

  const typeColors: Record<string, string> = {
    "股东会": "bg-purple-500",
    "董事会": "bg-mck-blue",
    "监事会": "bg-teal-500",
  };
  const statusColors: Record<string, string> = {
    "进行中": "bg-mck-blue text-white",
    "筹备中": "bg-white text-mck-navy border border-mck-border",
    "已结束": "bg-mck-bg text-mck-navy/40",
  };

  const prevMonth = () => onDateChange(new Date(year, month - 1, 1));
  const nextMonth = () => onDateChange(new Date(year, month + 1, 1));

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1;
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
          "min-h-[80px] border rounded-lg p-1.5 transition-all cursor-pointer",
          isSelected ? "border-mck-blue bg-mck-blue/5 ring-1 ring-mck-blue" : "border-mck-border",
          isCurrentMonth ? "bg-white hover:bg-mck-bg/50" : "bg-mck-bg/30 opacity-40 cursor-default",
          isToday && isCurrentMonth ? "ring-2 ring-mck-blue/40" : ""
        )}
      >
        {isCurrentMonth && (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className={cn(
                "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                isToday ? "bg-mck-blue text-white" : "text-mck-navy",
                isSelected && !isToday ? "bg-mck-blue/10 text-mck-blue" : ""
              )}>
                {dayNum}
              </span>
              {dayMeetings.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-mck-blue" />
              )}
            </div>
            {dayMeetings.slice(0, 2).map((m) => (
              <div key={m.id} className={cn(
                "text-[10px] px-1 py-0.5 rounded truncate text-white font-bold mb-0.5",
                typeColors[m.type] || "bg-gray-400"
              )} title={m.title}>
                {m.title.length > 12 ? m.title.slice(0, 12) + "…" : m.title}
              </div>
            ))}
            {dayMeetings.length > 2 && (
              <div className="text-[10px] text-center text-mck-navy/40 font-bold">
                +{dayMeetings.length - 2}
              </div>
            )}
            {dayMeetings.length > 0 && (
              <div className="text-[9px] text-center mt-1">
                <span className={cn("px-1 py-0.5 rounded font-bold uppercase", statusColors[dayMeetings[0].status] || "")}>
                  {dayMeetings[0].status}
                </span>
              </div>
            )}
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

// 日历右侧详情面板
function DayPanel({ selectedDate, meetings, onClose }: {
  selectedDate: string;
  meetings: Meeting[];
  onClose: () => void;
}) {
  const dayMeetings = meetings.filter((m) => m.date === selectedDate);
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
          <div className="text-[10px] uppercase tracking-widest text-mck-navy/40">{dayMeetings.length} 场会议</div>
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
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1 bg-mck-bg rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all", m.complianceScore > 90 ? "bg-green-500" : "bg-mck-blue")} style={{ width: `${m.complianceScore}%` }} />
                </div>
                <span className="text-[10px] font-bold font-mono">{m.complianceScore}%</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 text-[10px] font-bold uppercase tracking-widest text-mck-navy/40 hover:text-mck-blue transition-colors py-1 flex items-center justify-center gap-1">
                  <Edit2 size={10} /> 编辑
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export const MeetingManager: React.FC<MeetingManagerProps> = ({ onStartMeeting, onNavigate }) => {
  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    const saved = localStorage.getItem("corporate_meetings_list");
    return saved ? JSON.parse(saved) : initialMeetings;
  });
  const [filterType, setFilterType] = useState<MeetingType | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    localStorage.setItem("corporate_meetings_list", JSON.stringify(meetings));
  }, [meetings]);

  const filteredMeetings = filterType === "ALL"
    ? meetings
    : meetings.filter((m) => m.type === filterType);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setShowDayPanel(true);
  };

  const calendarFiltered = viewMode === "calendar" && showDayPanel
    ? filteredMeetings.filter((m) => m.date === selectedDate)
    : filteredMeetings;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-mck-navy">会议管理</h2>
          <p className="text-mck-navy/60 mt-1">全生命周期管理三会运作流程</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all">
          <Plus size={16} />
          发起新会议
        </button>
      </header>

      {/* 视图切换 */}
      <div className="flex items-center justify-between border-b border-mck-border pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-mck-navy/40 mr-4">
            <Filter size={14} />
            筛选:
          </div>
          {(["ALL", "股东会", "董事会", "监事会"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-4 py-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2",
                filterType === type ? "border-mck-blue text-mck-blue" : "border-transparent text-mck-navy/40 hover:text-mck-navy"
              )}
            >
              {type === "ALL" ? "全部类型" : type}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-mck-bg rounded-lg p-0.5">
          <button
            onClick={() => { setViewMode("list"); setShowDayPanel(false); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
              viewMode === "list" ? "bg-white text-mck-navy shadow-sm" : "text-mck-navy/40 hover:text-mck-navy"
            )}
          >
            <List size={14} />
            列表
          </button>
          <button
            onClick={() => { setViewMode("calendar"); setShowDayPanel(false); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
              viewMode === "calendar" ? "bg-white text-mck-navy shadow-sm" : "text-mck-navy/40 hover:text-mck-navy"
            )}
          >
            <CalendarIcon size={14} />
            日历
          </button>
        </div>
      </div>

      {/* 日历视图 */}
      {viewMode === "calendar" && (
        <div className="flex gap-6" style={{ minHeight: "520px" }}>
          <div className="flex-1">
            <div className="mck-card">
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
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 列表视图 */}
      {viewMode === "list" && (
        <div className="flex gap-6">
          <div className="flex-1 grid grid-cols-1 gap-4">
            {calendarFiltered.length === 0 ? (
              <div className="mck-card border-dashed">
                <div className="h-full flex flex-col items-center justify-center text-mck-navy/20 py-12">
                  <CalendarIcon size={48} className="mb-4 opacity-10" />
                  <p className="text-sm font-serif italic">暂无符合条件的会议</p>
                </div>
              </div>
            ) : (
              calendarFiltered.map((meeting) => (
                <div 
                  key={meeting.id} 
                  className={cn(
                    "mck-card group transition-all cursor-pointer",
                    selectedMeeting?.id === meeting.id 
                      ? "border-mck-blue ring-1 ring-mck-blue bg-mck-blue/5" 
                      : "hover:border-mck-blue"
                  )}
                  onClick={() => setSelectedMeeting(selectedMeeting?.id === meeting.id ? null : meeting)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-mck-bg flex flex-col items-center justify-center text-mck-navy/40 group-hover:bg-mck-blue/10 group-hover:text-mck-blue transition-colors">
                        <CalendarIcon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-mck-bg text-mck-navy/60">
                            {meeting.type}
                          </span>
                          <h4 className="text-base font-serif font-bold text-mck-navy">{meeting.title}</h4>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-mck-navy/40 font-mono uppercase tracking-wider">
                          <span>日期: {meeting.date}</span>
                          <span>•</span>
                          <span className={cn(
                            meeting.notifiedDays >= 10 ? "text-green-600" : "text-mck-red font-bold"
                          )}>
                            通知期: {meeting.notifiedDays}日
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-mck-navy/40 mb-1">合规指数</p>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-mck-bg rounded-full overflow-hidden">
                            <div
                              className={cn("h-full transition-all duration-1000", meeting.complianceScore > 90 ? "bg-green-500" : "bg-mck-blue")}
                              style={{ width: `${meeting.complianceScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold font-mono">{meeting.complianceScore}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-3 py-1 border",
                          meeting.status === "进行中" ? "bg-mck-blue text-white border-mck-blue" :
                          meeting.status === "筹备中" ? "bg-white text-mck-navy border-mck-border" : "bg-mck-bg text-mck-navy/40 border-mck-bg"
                        )}>
                          {meeting.status}
                        </span>
                        {meeting.status === "进行中" && onStartMeeting && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onStartMeeting(meeting.id); }}
                            className="px-4 py-1 bg-mck-blue text-white text-[10px] font-bold uppercase tracking-widest hover:bg-mck-navy transition-all"
                          >
                            开始会议
                          </button>
                        )}
                        <button className="p-2 text-mck-navy/20 hover:text-mck-navy transition-colors">
                          <MoreHorizontal size={18} />
                        </button>
                        <ChevronRight size={18} className={cn(
                          "transition-colors",
                          selectedMeeting?.id === meeting.id ? "text-mck-blue rotate-90" : "text-mck-navy/20 group-hover:text-mck-blue"
                        )} />
                      </div>
                    </div>
                  </div>

                  {/* 展开的详情 */}
                  {selectedMeeting?.id === meeting.id && (
                    <div className="mt-4 pt-4 border-t border-mck-border">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-mck-navy/40 mb-1">会议类型</p>
                          <p className="text-sm font-medium">{meeting.type}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-mck-navy/40 mb-1">会议状态</p>
                          <p className="text-sm font-medium">{meeting.status}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-mck-navy/40 mb-1">会议日期</p>
                          <p className="text-sm font-medium font-mono">{meeting.date}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-mck-navy/40 mb-1">通知期限</p>
                          <p className={cn("text-sm font-medium", meeting.notifiedDays >= 10 ? "text-green-600" : "text-mck-red")}>
                            {meeting.notifiedDays}日
                          </p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="text-[10px] uppercase tracking-widest text-mck-navy/40 mb-2">合规评分</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-mck-bg rounded-full overflow-hidden">
                            <div
                              className={cn("h-full transition-all", meeting.complianceScore > 90 ? "bg-green-500" : "bg-mck-blue")}
                              style={{ width: `${meeting.complianceScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold font-mono">{meeting.complianceScore}%</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => onNavigate && onNavigate("documents")}
                          className="flex-1 px-4 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all"
                        >
                          编辑会议
                        </button>
                        {meeting.status === "筹备中" && (
                          <button className="flex-1 px-4 py-2 bg-white text-mck-navy text-xs font-bold uppercase tracking-widest border border-mck-border hover:bg-mck-bg transition-all">
                            查看通知书
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="mck-card bg-white border border-mck-border p-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-mck-navy/40 mb-4">程序合规引擎</h3>
          <p className="text-sm text-mck-navy/80 leading-relaxed mb-4">
            系统已自动对标 2024 新《公司法》，实时计算法定通知期限、出席人数比例及表决权权重。
          </p>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-mck-blue flex items-center justify-center text-[10px] font-bold text-white">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <span className="text-[10px] uppercase tracking-widest text-mck-navy/40">3位合规专家在线</span>
          </div>
        </div>

        <div className="md:col-span-2 mck-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-mck-navy">即将召开的会议</h3>
            <span className="text-[10px] text-mck-navy/40">{meetings.filter(m => m.status === "筹备中" || m.status === "进行中").length} 场待办</span>
          </div>
          {meetings.filter(m => m.status === "筹备中" || m.status === "进行中").length > 0 ? (
            <div className="space-y-3">
              {meetings
                .filter(m => m.status === "筹备中" || m.status === "进行中")
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 3)
                .map(meeting => (
                  <div 
                    key={meeting.id} 
                    className="flex items-center gap-3 p-3 bg-mck-bg/50 rounded-lg hover:bg-mck-bg cursor-pointer transition-colors"
                    onClick={() => setSelectedMeeting(selectedMeeting?.id === meeting.id ? null : meeting)}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold",
                      meeting.type === "股东会" ? "bg-purple-100 text-purple-700" :
                      meeting.type === "董事会" ? "bg-mck-blue/10 text-mck-blue" :
                      "bg-teal-100 text-teal-700"
                    )}>
                      <span>{new Date(meeting.date).getMonth() + 1}月</span>
                      <span>{new Date(meeting.date).getDate()}日</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-mck-navy truncate">{meeting.title}</p>
                      <p className="text-[10px] text-mck-navy/40">{meeting.type}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-1 rounded",
                      meeting.status === "进行中" ? "bg-mck-blue text-white" : "bg-white text-mck-navy border border-mck-border"
                    )}>
                      {meeting.status}
                    </span>
                  </div>
                ))}
              {meetings.filter(m => m.status === "筹备中" || m.status === "进行中").length > 3 && (
                <button className="w-full mt-2 text-[10px] font-bold uppercase tracking-widest text-mck-blue hover:text-mck-navy transition-colors">
                  查看全部 {meetings.filter(m => m.status === "筹备中" || m.status === "进行中").length} 场会议 →
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-mck-navy/40">
              <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无待办会议</p>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-mck-border relative z-10">
            <button className="w-full text-[10px] font-bold uppercase tracking-widest text-mck-blue hover:text-mck-navy transition-colors cursor-pointer bg-transparent">
              查看历史会议档案 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
