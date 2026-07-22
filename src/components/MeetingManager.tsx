import React, { useState, useEffect, useMemo } from "react";
import { Plus, Filter, Calendar as CalendarIcon, MoreHorizontal, ChevronRight, ChevronLeft, List, X, Edit2, Users, Save, Mail, Send, Pencil, Check, Trash2, History } from "lucide-react";
import { Meeting, MeetingType, Personnel } from "../types";
import { cn } from "@/lib/utils";
import {
  createMeetingInFeishu,
  deleteMeetingFromFeishu,
  listPersonnelFromFeishu,
  listMeetingsFromFeishu,
  toFrontendMeeting,
  updateMeetingInFeishu,
} from "@/services/feishuMeetings";

// 排序优先级：董事 > 监事 > 高级管理人员 > 单一身份股东
const getPersonnelSortPriority = (p: Personnel): number => {
  // 董事类职位优先级最高 (1)
  if (["董事长", "董事", "独立董事"].includes(p.role)) return 1;
  // 监事优先级第二 (2)
  if (p.role === "监事") return 2;
  // 高级管理人员优先级第三 (3)
  if (["总经理", "副总经理", "财务负责人", "董事会秘书"].includes(p.role)) return 3;
  // 单一身份股东排最后 (4)
  if (p.isShareholder) return 4;
  // 默认 (5)
  return 5;
};

// 会议类型门槛说明
const meetingThresholds: Record<string, { threshold: string; description: string }> = {
  "股东会": { threshold: "全体股东", description: "股东会是公司的最高权力机构" },
  "董事会": { threshold: "全体董事", description: "董事会是公司的执行机构" },
  "监事会": { threshold: "全体监事", description: "监事会是公司的监督机构" },
  "临时股东会": { threshold: "≥10%股份", description: "提议召开临时股东会/自行召集和主持" },
};

const initialMeetings: Meeting[] = [
  { id: "1", title: "2026年第一次临时股东会会议", type: "股东会", date: "2026-04-10", status: "筹备中", complianceScore: 98, notifiedDays: 11 },
  { id: "2", title: "第三届董事会第十二次会议", type: "董事会", date: "2026-03-30", status: "进行中", complianceScore: 85, notifiedDays: 10 },
  { id: "3", title: "2025年度监事会工作会议", type: "监事会", date: "2026-03-15", status: "已结束", complianceScore: 100, notifiedDays: 15 },
  { id: "4", title: "关于股权激励计划的董事会专题会议", type: "董事会", date: "2026-04-20", status: "筹备中", complianceScore: 92, notifiedDays: 22 },
];

interface MeetingManagerProps {
  onStartMeeting?: (id: string) => void;
  onNavigate?: (tab: string, params?: any) => void;
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
    "临时股东会": "bg-indigo-500",
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
        {Object.entries({
          "股东会": "bg-purple-500", 
          "董事会": "bg-mck-blue", 
          "监事会": "bg-teal-500",
          "临时股东会": "bg-indigo-500"
        }).map(([k, v]) => (
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
              <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex-shrink-0", typeColors[m.type] || "bg-mck-bg text-mck-navy/60 border-mck-border")}>
                  {m.type}
                </span>
                <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 border flex-shrink-0 whitespace-nowrap", statusColors[m.status] || "")}>
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
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filterType, setFilterType] = useState<MeetingType | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showHistoryMeetings, setShowHistoryMeetings] = useState(false); // 是否显示历史会议

  // 新建会议弹窗状态
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    type: "股东会",
    nature: "定期",
    status: "筹备中",
    participants: [],
    threshold: "",
    meetingMode: "现场",
    votingMethod: "现场投票",
  });

  // 编辑与会人员弹窗
  const [editingMeetingParticipants, setEditingMeetingParticipants] = useState<{ meetingId: string; participants: string[] } | null>(null);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [showEmailSuccess, setShowEmailSuccess] = useState(false);
  const [pendingEmailTarget, setPendingEmailTarget] = useState<{ name: string; email: string } | null>(null);
  const [showNotifyAllConfirm, setShowNotifyAllConfirm] = useState(false);
  const [showNotifyAllSuccess, setShowNotifyAllSuccess] = useState(false);
  // 单人发送通知弹窗
  const [showSingleNotifyConfirm, setShowSingleNotifyConfirm] = useState(false);
  const [showSingleNotifySuccess, setShowSingleNotifySuccess] = useState(false);
  const [pendingSingleNotify, setPendingSingleNotify] = useState<{ name: string; email: string } | null>(null);
  // 向其余全体股东发送邮件通知
  const [showMailAllConfirm, setShowMailAllConfirm] = useState(false);
  const [showMailAllSuccess, setShowMailAllSuccess] = useState(false);
  // 向其余全体股东发送邮件勾选状态
  const [sendMailToAllOthers, setSendMailToAllOthers] = useState(false);
  // 记录已发送邮件的人员ID和其余全体股东
  const [sentPersonnelIds, setSentPersonnelIds] = useState<Set<string>>(new Set());
  const [sentToAllOthers, setSentToAllOthers] = useState(false);

  // 编辑会议标题状态
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  // 删除会议确认弹窗
  const [deleteConfirm, setDeleteConfirm] = useState<{ meetingId: string; meetingTitle: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<"connecting" | "synced" | "saving" | "error">("connecting");
  const [syncMessage, setSyncMessage] = useState("正在连接飞书");

  // 获取法务联系人名字（从人员列表中查找法务角色）
  const getLegalContactName = (): string => {
    const legal = personnelList.find(
      p => p.role === "法务" || p.role === "法务负责人" || p.organization === "法务部",
    );
    if (legal) return legal.name;
    return "公司法务部"; // 默认法务名字
  };

  // 获取与会人员列表（排序：董监高在前，单一身份股东按持股比例在后）
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);

  useEffect(() => {
    let active = true;
    listPersonnelFromFeishu()
      .then((result) => {
        if (!active || result.personnel.length === 0) return;
        const sorted = [...result.personnel].sort((a, b) => {
          const priority = getPersonnelSortPriority(a) - getPersonnelSortPriority(b);
          return priority || a.name.localeCompare(b.name, "zh-CN");
        });
        setPersonnelList(sorted);
      })
      .catch(() => {
        // 飞书人员接口尚未部署或暂时不可用时，继续使用本地缓存。
      });
    return () => {
      active = false;
    };
  }, []);

  const personnelIdByName = useMemo(
    () => new Map(personnelList.map((person) => [person.name, person.id])),
    [personnelList],
  );

  useEffect(() => {
    let active = true;

    const syncMeetings = async () => {
      try {
        const result = await listMeetingsFromFeishu();
        if (!active) return;
        setMeetings(result.meetings.map((meeting) => toFrontendMeeting(meeting, personnelIdByName)));
        setSyncStatus("synced");
        setSyncMessage(`已与飞书同步 ${new Date(result.syncedAt).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}`);
      } catch (error) {
        if (!active) return;
        setSyncStatus("error");
        setSyncMessage(error instanceof Error ? error.message : "飞书同步失败");
      }
    };

    void syncMeetings();
    const timer = window.setInterval(() => {
      if (!showNewMeetingModal && !editingMeetingId && !editingMeetingParticipants && !deleteConfirm) {
        void syncMeetings();
      }
    }, 5_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [
    deleteConfirm,
    editingMeetingId,
    editingMeetingParticipants,
    personnelIdByName,
    showNewMeetingModal,
  ]);

  const filteredMeetings = filterType === "ALL"
    ? meetings.filter(m => !showHistoryMeetings ? m.status !== "已结束" : true)
    : meetings.filter((m) => m.type === filterType && (!showHistoryMeetings ? m.status !== "已结束" : true));

  // 历史会议列表
  const historyMeetings = filterType === "ALL"
    ? meetings.filter(m => m.status === "已结束")
    : meetings.filter((m) => m.type === filterType && m.status === "已结束");

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setShowDayPanel(true);
  };

  const calendarFiltered = viewMode === "calendar" && showDayPanel
    ? filteredMeetings.filter((m) => m.date === selectedDate)
    : filteredMeetings;

  // 处理会议类型变更
  const handleTypeChange = (type: MeetingType) => {
    setNewMeeting({
      ...newMeeting,
      type: type === "临时股东会" ? "股东会" : type,
      nature: type === "临时股东会" ? "临时" : newMeeting.nature || "定期",
      threshold: meetingThresholds[type]?.threshold || "",
    });
  };

  // 切换与会人员
  const toggleParticipant = (personId: string) => {
    const current = newMeeting.participants || [];
    const updated = current.includes(personId)
      ? current.filter(id => id !== personId)
      : [...current, personId];
    setNewMeeting({ ...newMeeting, participants: updated });
  };

  // 创建新会议
  const handleCreateMeeting = async () => {
    if (!newMeeting.title || !newMeeting.date) return;

    setSyncStatus("saving");
    setSyncMessage("正在保存到飞书");
    try {
      const participantNames = (newMeeting.participants || [])
        .map((id) => personnelList.find((person) => person.id === id)?.name)
        .filter((name): name is string => Boolean(name));
      const result = await createMeetingInFeishu({
        title: newMeeting.title,
        type: newMeeting.type as MeetingType,
        nature: newMeeting.nature,
        date: newMeeting.date,
        startTime: newMeeting.startTime,
        location: newMeeting.location,
        noticeDate: newMeeting.noticeDate,
        meetingMode: newMeeting.meetingMode,
        votingMethod: newMeeting.votingMethod,
        expectedAttendance: newMeeting.expectedAttendance,
        actualAttendance: newMeeting.actualAttendance,
        contactName: newMeeting.contactName,
        contactPhone: newMeeting.contactPhone,
        contactEmail: newMeeting.contactEmail,
        status: "筹备中",
        participantNames,
      });
      const saved = toFrontendMeeting(result.meeting, personnelIdByName);
      setMeetings((current) => [saved, ...current.filter((meeting) => meeting.id !== saved.id)]);
      setShowNewMeetingModal(false);
      setNewMeeting({
        type: "股东会",
        nature: "定期",
        status: "筹备中",
        participants: [],
        threshold: "",
        meetingMode: "现场",
        votingMethod: "现场投票",
      });
      setSyncStatus("synced");
      setSyncMessage(
        result.meeting.pendingFields?.length
          ? `已保存；待飞书增加字段：${result.meeting.pendingFields.join("、")}`
          : "已保存到飞书",
      );
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(error instanceof Error ? error.message : "保存失败");
      alert(error instanceof Error ? error.message : "会议没有保存到飞书");
    }
  };

  // 打开编辑与会人员弹窗
  const openEditParticipants = (meeting: Meeting) => {
    // 重置发送状态
    setSentPersonnelIds(new Set());
    setSentToAllOthers(false);
    setEditingMeetingParticipants({
      meetingId: meeting.id,
      participants: meeting.participants || [],
    });
  };

  // 切换与会人员
  const toggleEditParticipant = (personId: string) => {
    if (!editingMeetingParticipants) return;
    const current = editingMeetingParticipants.participants;
    const updated = current.includes(personId)
      ? current.filter(id => id !== personId)
      : [...current, personId];
    setEditingMeetingParticipants({ ...editingMeetingParticipants, participants: updated });
  };

  // 保存与会人员
  const saveParticipants = async () => {
    if (!editingMeetingParticipants) return;
    setSyncStatus("saving");
    setSyncMessage("正在保存参会人员");
    try {
      const participantNames = editingMeetingParticipants.participants
        .map((id) => personnelList.find((person) => person.id === id)?.name)
        .filter((name): name is string => Boolean(name));
      const result = await updateMeetingInFeishu(editingMeetingParticipants.meetingId, {
        participantNames,
      });
      const saved = toFrontendMeeting(result.meeting, personnelIdByName);
      setMeetings((current) => current.map((meeting) => meeting.id === saved.id ? saved : meeting));
      setEditingMeetingParticipants(null);
      setSyncStatus("synced");
      setSyncMessage("参会人员已保存到飞书");
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(error instanceof Error ? error.message : "参会人员保存失败");
      alert(error instanceof Error ? error.message : "参会人员没有保存到飞书");
    }
  };

  // 开始编辑会议标题
  const startEditTitle = (meeting: Meeting) => {
    setEditingMeetingId(meeting.id);
    setEditingTitle(meeting.title);
  };

  // 保存编辑后的会议标题
  const saveMeetingTitle = async () => {
    if (!editingMeetingId) return;
    setSyncStatus("saving");
    setSyncMessage("正在保存会议标题");
    try {
      const result = await updateMeetingInFeishu(editingMeetingId, { title: editingTitle.trim() });
      const saved = toFrontendMeeting(result.meeting, personnelIdByName);
      setMeetings((current) => current.map((meeting) => meeting.id === saved.id ? saved : meeting));
      setEditingMeetingId(null);
      setEditingTitle("");
      setSyncStatus("synced");
      setSyncMessage("会议标题已保存到飞书");
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(error instanceof Error ? error.message : "标题保存失败");
      alert(error instanceof Error ? error.message : "会议标题没有保存到飞书");
    }
  };

  // 取消编辑会议标题
  const cancelEditTitle = () => {
    setEditingMeetingId(null);
    setEditingTitle("");
  };

  // 删除会议
  const deleteMeeting = async () => {
    if (!deleteConfirm) return;
    setSyncStatus("saving");
    setSyncMessage("正在从飞书删除会议");
    try {
      await deleteMeetingFromFeishu(deleteConfirm.meetingId);
      setMeetings((current) => current.filter((meeting) => meeting.id !== deleteConfirm.meetingId));
      setDeleteConfirm(null);
      setSyncStatus("synced");
      setSyncMessage("已从飞书删除");
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(error instanceof Error ? error.message : "删除失败");
      alert(error instanceof Error ? error.message : "会议没有从飞书删除");
    }
  };

  // 发送邮件通知
  const sendEmailNotification = (person: Personnel) => {
    setPendingEmailTarget({ name: person.name, email: person.email || "" });
    setShowEmailConfirm(true);
  };

  const confirmSendEmail = () => {
    setShowEmailConfirm(false);
    setShowEmailSuccess(true);
  };

  // 一键通知全体股东
  const notifyAllShareholders = () => {
    setShowNotifyAllConfirm(true);
  };

  const confirmNotifyAll = () => {
    setShowNotifyAllConfirm(false);
    setShowNotifyAllSuccess(true);
  };

  const newMeetingThresholdKey =
    newMeeting.type === "股东会" && newMeeting.nature === "临时"
      ? "临时股东会"
      : newMeeting.type || "股东会";

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-mck-navy">会议管理</h2>
          <div className={cn(
            "mt-2 text-[10px] font-bold tracking-wider",
            syncStatus === "error" ? "text-mck-red" : syncStatus === "synced" ? "text-green-600" : "text-mck-blue",
          )}>
            {syncStatus === "saving" || syncStatus === "connecting" ? "● " : syncStatus === "synced" ? "✓ " : "⚠ "}
            {syncMessage}
          </div>
        </div>
        <button 
          onClick={() => setShowNewMeetingModal(true)}
          className="flex items-center gap-2 px-6 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all"
        >
          <Plus size={16} />
          发起新会议
        </button>
      </header>

      {/* 新建会议弹窗 */}
      {showNewMeetingModal && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl mck-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-mck-border">
              <h3 className="text-xl font-serif font-bold text-mck-navy">发起新会议</h3>
              <button onClick={() => setShowNewMeetingModal(false)} className="text-mck-navy/40 hover:text-mck-navy">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                飞书尚未创建的新字段会列在保存结果中，并暂不写入飞书；会议标题、类型、日期、状态和参会人员仍可正常保存。
                飞书字段补齐后，这些扩展信息会自动开始同步。
              </div>

              {/* 会议标题 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">会议标题</label>
                <input
                  type="text"
                  value={newMeeting.title || ""}
                  onChange={e => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue"
                  placeholder="请输入会议标题"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">会议类型</label>
                  <select
                    value={newMeeting.type || "股东会"}
                    onChange={e => handleTypeChange(e.target.value as MeetingType)}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue bg-white"
                  >
                    {["股东会", "董事会", "监事会"].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">会议性质</label>
                  <select
                    value={newMeeting.nature || "定期"}
                    onChange={e => setNewMeeting({ ...newMeeting, nature: e.target.value as Meeting["nature"] })}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue bg-white"
                  >
                    <option value="定期">定期</option>
                    <option value="临时">临时</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-mck-bg/50 rounded-lg border border-mck-border/50">
                {/* 门槛说明 */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-mck-blue uppercase">门槛要求</span>
                </div>
                <p className="text-sm font-medium text-mck-navy">{meetingThresholds[newMeetingThresholdKey]?.threshold}</p>
                <p className="text-[10px] text-mck-navy/50 mt-1">{meetingThresholds[newMeetingThresholdKey]?.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">会议日期</label>
                  <input
                    type="date"
                    value={newMeeting.date || ""}
                    onChange={e => setNewMeeting({ ...newMeeting, date: e.target.value })}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">开始时间</label>
                  <input
                    type="time"
                    value={newMeeting.startTime || ""}
                    onChange={e => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">会议地点</label>
                  <input
                    type="text"
                    value={newMeeting.location || ""}
                    onChange={e => setNewMeeting({ ...newMeeting, location: e.target.value })}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue"
                    placeholder="例如：公司第一会议室"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">通知日期</label>
                  <input
                    type="date"
                    value={newMeeting.noticeDate || ""}
                    onChange={e => setNewMeeting({ ...newMeeting, noticeDate: e.target.value })}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">召开方式</label>
                  <select
                    value={newMeeting.meetingMode || "现场"}
                    onChange={e => setNewMeeting({ ...newMeeting, meetingMode: e.target.value as Meeting["meetingMode"] })}
                    className="w-full border border-mck-border px-4 py-2 text-sm bg-white"
                  >
                    {["现场", "视频", "通讯", "现场加通讯", "其他"].map(value => <option key={value}>{value}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">表决方式</label>
                  <select
                    value={newMeeting.votingMethod || "现场投票"}
                    onChange={e => setNewMeeting({ ...newMeeting, votingMethod: e.target.value as Meeting["votingMethod"] })}
                    className="w-full border border-mck-border px-4 py-2 text-sm bg-white"
                  >
                    {["现场投票", "通讯表决", "举手表决", "其他"].map(value => <option key={value}>{value}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">应到人数</label>
                  <input
                    type="number"
                    min="0"
                    value={newMeeting.expectedAttendance ?? ""}
                    onChange={e => setNewMeeting({
                      ...newMeeting,
                      expectedAttendance: e.target.value === "" ? undefined : Number(e.target.value),
                    })}
                    className="w-full border border-mck-border px-4 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">实到人数</label>
                  <input
                    type="number"
                    min="0"
                    value={newMeeting.actualAttendance ?? ""}
                    onChange={e => setNewMeeting({
                      ...newMeeting,
                      actualAttendance: e.target.value === "" ? undefined : Number(e.target.value),
                    })}
                    className="w-full border border-mck-border px-4 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">会务联系人</label>
                  <select
                    value={newMeeting.contactName || ""}
                    onChange={e => {
                      const person = personnelList.find(item => item.name === e.target.value);
                      setNewMeeting({
                        ...newMeeting,
                        contactName: e.target.value,
                        contactPhone: person?.phone || newMeeting.contactPhone,
                        contactEmail: person?.email || newMeeting.contactEmail,
                      });
                    }}
                    className="w-full border border-mck-border px-3 py-2 text-sm bg-white"
                  >
                    <option value="">请选择</option>
                    {personnelList.map(person => <option key={person.id} value={person.name}>{person.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">联系电话</label>
                  <input
                    value={newMeeting.contactPhone || ""}
                    onChange={e => setNewMeeting({ ...newMeeting, contactPhone: e.target.value })}
                    className="w-full border border-mck-border px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">联系邮箱</label>
                  <input
                    type="email"
                    value={newMeeting.contactEmail || ""}
                    onChange={e => setNewMeeting({ ...newMeeting, contactEmail: e.target.value })}
                    className="w-full border border-mck-border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* 与会人员 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">
                  与会人员 <span className="text-mck-navy/30 normal-case font-normal">(可多选)</span>
                </label>
                {personnelList.length > 0 ? (
                  <div className="border border-mck-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {personnelList.map(person => (
                      <label
                        key={person.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          (newMeeting.participants || []).includes(person.id)
                            ? "bg-mck-blue/10 border border-mck-blue/30"
                            : "hover:bg-mck-bg"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={(newMeeting.participants || []).includes(person.id)}
                          onChange={() => toggleParticipant(person.id)}
                          className="w-4 h-4 accent-mck-blue"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-mck-navy">{person.name}</span>
                            {person.isShareholder ? (
                              <span className="text-[10px] bg-orange-100 px-1.5 py-0.5 text-orange-700 font-bold">股东 {person.shareholding}%</span>
                            ) : (
                              <span className="text-[10px] bg-mck-bg px-1.5 py-0.5 text-mck-navy/60">{person.role}</span>
                            )}
                          </div>
                          {person.phone && (
                            <span className="text-[10px] text-mck-navy/40">{person.phone}</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="border border-mck-border rounded-lg p-6 text-center">
                    <Users size={24} className="mx-auto text-mck-border mb-2" />
                    <p className="text-sm text-mck-navy/40">暂无与会人员数据</p>
                    <p className="text-[10px] text-mck-navy/30 mt-1">请先在"与会人员"中添加成员</p>
                  </div>
                )}
                {(newMeeting.participants || []).length > 0 && (
                  <p className="text-[10px] text-mck-navy/50">
                    已选择 {newMeeting.participants?.length} 人
                  </p>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-mck-border">
              <button
                onClick={() => setShowNewMeetingModal(false)}
                className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-mck-navy/60 hover:text-mck-navy"
              >
                取消
              </button>
              <button
                onClick={handleCreateMeeting}
                disabled={!newMeeting.title || !newMeeting.date}
                className="flex items-center gap-2 px-8 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                创建会议
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 视图切换 */}
      <div className="flex items-center justify-between border-b border-mck-border pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-mck-navy/40 mr-4">
            <Filter size={14} />
            筛选:
          </div>
          {(["ALL", "股东会", "董事会", "监事会", "临时股东会"] as const).map((type) => (
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
        <div className="mck-card overflow-x-auto">
          {/* 表头 */}
          <div className="flex items-center px-4 py-3 bg-mck-bg/50 border-b border-mck-border text-[10px] font-bold uppercase tracking-widest text-mck-navy/40 min-w-max">
            <div className="w-10 shrink-0"></div>
            <div className="w-48 shrink-0">会议名称</div>
            <div className="w-28 shrink-0 text-center">通知期</div>
            <div className="w-24 shrink-0 text-center">日期</div>
            <div className="w-20 shrink-0 text-center">状态</div>
            <div className="w-32 shrink-0 text-center">合规指数</div>
            <div className="w-20 shrink-0 text-center">操作</div>
            <div className="w-8 shrink-0"></div>
          </div>
          
          {/* 表格内容 */}
          <div className="divide-y divide-mck-border">
            {calendarFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-mck-navy/20 py-12">
                <CalendarIcon size={48} className="mb-4 opacity-10" />
                <p className="text-sm font-serif italic">暂无符合条件的会议</p>
              </div>
            ) : (
              calendarFiltered.map((meeting) => (
                <div 
                  key={meeting.id} 
                  className={cn(
                    "group transition-all cursor-pointer",
                    selectedMeeting?.id === meeting.id 
                      ? "bg-mck-blue/5" 
                      : "hover:bg-mck-bg/30"
                  )}
                  onClick={() => setSelectedMeeting(selectedMeeting?.id === meeting.id ? null : meeting)}
                >
                  {/* 主行 */}
                  <div className="flex items-center px-4 py-3 min-w-max">
                    <div className="w-10 shrink-0">
                      <div className="w-8 h-8 bg-mck-bg flex items-center justify-center text-mck-navy/40 group-hover:bg-mck-blue/10 group-hover:text-mck-blue transition-colors rounded">
                        <CalendarIcon size={16} />
                      </div>
                    </div>
                    
                    {/* 会议名称 */}
                    <div className="w-48 shrink-0 flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-mck-bg text-mck-navy/60 shrink-0 whitespace-nowrap">
                        {meeting.type}
                      </span>
                      {editingMeetingId === meeting.id ? (
                        <>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="px-2 py-0.5 text-sm font-serif font-bold text-mck-navy border border-mck-blue rounded"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); saveMeetingTitle(); }}
                            className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelEditTitle(); }}
                            className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <h4 className="text-sm font-serif font-bold text-mck-navy truncate">{meeting.title}</h4>
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditTitle(meeting); }}
                            className="p-1 text-mck-navy/30 hover:text-mck-blue transition-colors shrink-0"
                            title="编辑标题"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ meetingId: meeting.id, meetingTitle: meeting.title }); }}
                            className="p-1 text-mck-navy/30 hover:text-mck-red transition-colors shrink-0"
                            title="删除会议"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* 通知期 */}
                    <div className="w-28 shrink-0 text-center">
                      <span className={cn(
                        "text-xs font-mono",
                        meeting.notifiedDays >= 10 ? "text-green-600" : "text-mck-red font-bold"
                      )}>
                        {meeting.notifiedDays}日
                      </span>
                    </div>
                    
                    {/* 日期 */}
                    <div className="w-24 shrink-0 text-center">
                      <span className="text-xs font-mono text-mck-navy/60">{meeting.date}</span>
                    </div>
                    
                    {/* 状态 */}
                    <div className="w-20 shrink-0 text-center">
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5",
                        meeting.status === "进行中" ? "bg-mck-blue text-white" :
                        meeting.status === "筹备中" ? "bg-white text-mck-navy border border-mck-border" : "bg-mck-bg text-mck-navy/40"
                      )}>
                        {meeting.status}
                      </span>
                    </div>
                    
                    {/* 合规指数 */}
                    <div className="w-32 shrink-0 flex items-center justify-center gap-2">
                      <div className="w-20 h-1.5 bg-mck-bg rounded-full overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-1000", meeting.complianceScore > 90 ? "bg-green-500" : "bg-mck-blue")}
                          style={{ width: `${meeting.complianceScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold font-mono">{meeting.complianceScore}%</span>
                    </div>
                    
                    {/* 操作 */}
                    <div className="w-20 shrink-0 flex items-center justify-center gap-1">
                      {meeting.status === "进行中" && onStartMeeting && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onStartMeeting(meeting.id); }}
                          className="px-2 py-0.5 bg-mck-blue text-white text-[10px] font-bold hover:bg-mck-navy transition-all"
                        >
                          开始
                        </button>
                      )}
                    </div>
                    
                    {/* 展开箭头 */}
                    <div className="w-8 shrink-0 flex items-center justify-center">
                      <ChevronRight size={16} className={cn(
                        "transition-all",
                        selectedMeeting?.id === meeting.id ? "text-mck-blue rotate-90" : "text-mck-navy/20"
                      )} />
                    </div>
                  </div>

                  {/* 展开的详情 */}
                  {selectedMeeting?.id === meeting.id && (
                    <div className="px-4 pb-4 pt-2 border-t border-mck-border/50 overflow-x-auto">
                      <div className="flex gap-4 mb-4 min-w-max">
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

                      {/* 与会人员显示 */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase tracking-widest text-mck-navy/40">与会人员</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditParticipants(meeting); }}
                            className="text-[10px] text-mck-blue hover:text-mck-navy font-bold"
                          >
                            + 编辑与会人员
                          </button>
                        </div>
                        {meeting.participants && meeting.participants.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {meeting.participants.map(pId => {
                              const person = personnelList.find(p => p.id === pId);
                              if (!person) return null;
                              return (
                                <div key={pId} className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded text-[10px]",
                                  person.organization === "股东" ? "bg-orange-100 text-orange-700" :
                                  person.organization === "董事会" ? "bg-purple-100 text-purple-700" :
                                  person.organization === "监事会" ? "bg-teal-100 text-teal-700" :
                                  "bg-blue-100 text-blue-700"
                                )}>
                                  <span className="font-medium">{person.name}</span>
                                  {person.shareholding && (
                                    <span className="text-orange-600 font-bold">{person.shareholding}%</span>
                                  )}
                                  {person.email && sentPersonnelIds.has(person.id) && (
                                    <span
                                      className="ml-1 text-green-500"
                                      title="已发送邮件通知"
                                    >
                                      ✉️
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-mck-navy/40 italic">暂无与会人员</p>
                        )}

                        {/* 股东会额外按钮 */}
                        {meeting.type === "股东会" && personnelList.filter(p => p.organization === "股东").length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); notifyAllShareholders(); }}
                            className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-[10px] font-bold hover:bg-purple-700 transition-all rounded"
                          >
                            一键通知全体股东
                          </button>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={() => onNavigate && onNavigate("documents", { meetingId: meeting.id, meetingTitle: meeting.title })}
                          className="flex-1 px-4 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all"
                        >
                          查看会议文件
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
        <div className="mck-card">
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
          
          {/* 历史会议展开区域 */}
          {historyMeetings.length > 0 && (
            <div className="border-t border-mck-border">
              <button
                onClick={() => setShowHistoryMeetings(!showHistoryMeetings)}
                className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-mck-navy/60 hover:text-mck-navy hover:bg-mck-bg/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <History size={14} />
                  历史会议
                  <span className="bg-mck-bg px-2 py-0.5 rounded">{historyMeetings.length}</span>
                </span>
                <ChevronRight size={14} className={cn("transition-transform", showHistoryMeetings && "rotate-90")} />
              </button>
              {showHistoryMeetings && (
                <div className="divide-y divide-mck-border">
                  {historyMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="flex items-center gap-3 p-3 hover:bg-mck-bg/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedMeeting(selectedMeeting?.id === meeting.id ? null : meeting)}
                    >
                      <div className="w-8 h-8 bg-mck-bg flex items-center justify-center text-mck-navy/40 rounded">
                        <CalendarIcon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-mck-navy/60 truncate">{meeting.title}</p>
                        <p className="text-[10px] text-mck-navy/40">{meeting.type} · {meeting.date}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onNavigate?.("documents", { meetingId: meeting.id, meetingTitle: meeting.title }); }}
                        className="text-[10px] text-mck-blue hover:text-mck-navy font-bold"
                      >
                        查看文件
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 编辑与会人员弹窗 */}
      {editingMeetingParticipants && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg mck-card shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-mck-border">
              <h3 className="text-lg font-serif font-bold text-mck-navy">编辑与会人员</h3>
              <button onClick={() => setEditingMeetingParticipants(null)} className="text-mck-navy/40 hover:text-mck-navy">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {personnelList.length > 0 ? (
                personnelList.map(person => (
                  <div
                    key={person.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      editingMeetingParticipants.participants.includes(person.id)
                        ? "bg-mck-blue/10 border border-mck-blue/30"
                        : "bg-mck-bg/50 hover:bg-mck-bg"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={editingMeetingParticipants.participants.includes(person.id)}
                      onChange={() => toggleEditParticipant(person.id)}
                      className="w-4 h-4 accent-mck-blue flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-mck-navy">{person.name}</span>
                        {person.isShareholder ? (
                          <span className="text-[10px] bg-orange-100 px-1.5 py-0.5 rounded text-orange-700 font-bold flex-shrink-0">股东 {person.shareholding}%</span>
                        ) : (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded flex-shrink-0",
                            person.organization === "董事会" ? "bg-purple-100 text-purple-700" :
                            person.organization === "监事会" ? "bg-teal-100 text-teal-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {person.role}
                          </span>
                        )}
                      </div>
                      {person.email && (
                        <span className="text-[10px] text-mck-navy/40">{person.email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          const meeting = meetings.find(m => m.id === editingMeetingParticipants?.meetingId);
                          onNavigate?.("documents", {
                            editEmailFor: {
                              meetingId: editingMeetingParticipants?.meetingId || '',
                              meetingTitle: meeting?.title || '',
                              recipientName: person.name,
                              recipientEmail: person.email || '',
                              senderName: getLegalContactName(),
                              meetingDate: meeting?.date || '',
                              meetingTime: meeting?.startTime || '',
                              meetingLocation: meeting?.location || '公司会议室'
                            }
                          });
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-mck-navy/60 hover:text-mck-blue border border-mck-border/50 hover:border-mck-blue/50 rounded transition-colors"
                        title="编辑通知邮件"
                      >
                        <Mail size={12} />
                        <span className="hidden sm:inline">编辑通知</span>
                      </button>
                      <button
                        onClick={() => {
                          setPendingSingleNotify({ name: person.name, email: person.id });
                          setShowSingleNotifyConfirm(true);
                        }}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors",
                          sentPersonnelIds.has(person.id)
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "text-white bg-mck-blue/80 hover:bg-mck-blue"
                        )}
                        title="发送通知"
                        disabled={sentPersonnelIds.has(person.id)}
                      >
                        {sentPersonnelIds.has(person.id) ? (
                          <Check size={12} />
                        ) : (
                          <Send size={12} />
                        )}
                        <span className="hidden sm:inline">
                          {sentPersonnelIds.has(person.id) ? "已发送" : "发送"}
                        </span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-mck-navy/40">
                  <Users size={32} className="mx-auto mb-2" />
                  <p className="text-sm">暂无人员数据</p>
                </div>
              )}
            </div>

            {/* 其余全体股东 */}
            <div className="mt-2 flex items-center justify-between px-3 py-2.5 bg-mck-blue/5 rounded-lg border border-mck-blue/20 hover:border-mck-blue/40 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={sendMailToAllOthers}
                  onChange={(e) => setSendMailToAllOthers(e.target.checked)}
                  className="w-4 h-4 accent-mck-blue flex-shrink-0"
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-medium text-mck-navy">其余全体股东</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      const meeting = meetings.find(m => m.id === editingMeetingParticipants?.meetingId);
                      onNavigate?.("documents", {
                        editEmailFor: {
                          meetingId: editingMeetingParticipants?.meetingId || '',
                          meetingTitle: meeting?.title || '',
                          recipientName: '股东您好',
                          recipientEmail: '',
                          senderName: getLegalContactName(),
                          meetingDate: meeting?.date || '',
                          meetingTime: meeting?.startTime || '',
                          meetingLocation: meeting?.location || '公司会议室'
                        }
                      });
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-mck-navy/60 hover:text-mck-blue border border-mck-border/50 hover:border-mck-blue/50 rounded transition-colors"
                    title="编辑通知邮件"
                  >
                    <Mail size={12} />
                    <span className="hidden sm:inline">编辑通知</span>
                  </button>
                  <button
                    onClick={() => setShowMailAllConfirm(true)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors",
                      sentToAllOthers
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "text-white bg-mck-blue/80 hover:bg-mck-blue"
                    )}
                    title="发送通知"
                    disabled={sentToAllOthers}
                  >
                    {sentToAllOthers ? (
                      <Check size={12} />
                    ) : (
                      <Send size={12} />
                    )}
                    <span className="hidden sm:inline">
                      {sentToAllOthers ? "已发送" : "发送"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-mck-border">
              <button
                onClick={() => setEditingMeetingParticipants(null)}
                className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-mck-navy/60 hover:text-mck-navy"
              >
                取消
              </button>
              <button
                onClick={saveParticipants}
                className="flex items-center gap-2 px-8 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all"
              >
                <Save size={16} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发送邮件确认弹窗 */}
      {showEmailConfirm && pendingEmailTarget && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm mck-card shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✉️</span>
              </div>
              <h3 className="text-lg font-serif font-bold text-mck-navy mb-2">确认发送邮件</h3>
              <p className="text-sm text-mck-navy/60">
                确定要向 <span className="font-bold">{pendingEmailTarget.name}</span> 发送会议通知邮件吗？
              </p>
              <p className="text-[10px] text-mck-navy/40 mt-1">{pendingEmailTarget.email}</p>
            </div>
            <div className="flex gap-3 p-4 border-t border-mck-border">
              <button
                onClick={() => { setShowEmailConfirm(false); setPendingEmailTarget(null); }}
                className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest text-mck-navy/60 hover:text-mck-navy"
              >
                取消
              </button>
              <button
                onClick={confirmSendEmail}
                className="flex-1 px-4 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all"
              >
                确定发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发送邮件成功弹窗 */}
      {showEmailSuccess && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm mck-card shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h3 className="text-lg font-serif font-bold text-green-600 mb-2">发送成功</h3>
              <p className="text-sm text-mck-navy/60">
                会议通知邮件已成功发送！
              </p>
            </div>
            <div className="p-4 border-t border-mck-border">
              <button
                onClick={() => setShowEmailSuccess(false)}
                className="w-full px-4 py-2 bg-green-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-green-600 transition-all"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一键通知全体股东确认弹窗 */}
      {showNotifyAllConfirm && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm mck-card shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📢</span>
              </div>
              <h3 className="text-lg font-serif font-bold text-mck-navy mb-2">确认通知全体股东</h3>
              <p className="text-sm text-mck-navy/60">
                确定要向所有股东发送会议通知吗？
              </p>
              <p className="text-[10px] text-purple-600 mt-2 font-bold">
                共 {(personnelList.filter(p => p.organization === "股东")).length} 位股东
              </p>
            </div>
            <div className="flex gap-3 p-4 border-t border-mck-border">
              <button
                onClick={() => setShowNotifyAllConfirm(false)}
                className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest text-mck-navy/60 hover:text-mck-navy"
              >
                取消
              </button>
              <button
                onClick={confirmNotifyAll}
                className="flex-1 px-4 py-2 bg-purple-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-purple-700 transition-all"
              >
                确定发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一键通知全体股东成功弹窗 */}
      {showNotifyAllSuccess && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm mck-card shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h3 className="text-lg font-serif font-bold text-green-600 mb-2">发送成功</h3>
              <p className="text-sm text-mck-navy/60">
                已成功向全体股东发送会议通知！
              </p>
            </div>
            <div className="p-4 border-t border-mck-border">
              <button
                onClick={() => setShowNotifyAllSuccess(false)}
                className="w-full px-4 py-2 bg-green-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-green-600 transition-all"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 单人发送通知确认弹窗 */}
      {showSingleNotifyConfirm && pendingSingleNotify && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm mck-card shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-mck-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={24} className="text-mck-blue" />
              </div>
              <h3 className="text-lg font-serif font-bold text-mck-navy mb-2">确认发送通知</h3>
              <p className="text-sm text-mck-navy/60">
                确定要向 <span className="font-bold">{pendingSingleNotify.name}</span> 发送会议通知吗？
              </p>
              {pendingSingleNotify.email && (
                <p className="text-[10px] text-mck-navy/40 mt-2">
                  发送至：{pendingSingleNotify.email}
                </p>
              )}
            </div>
            <div className="flex gap-3 p-4 border-t border-mck-border">
              <button
                onClick={() => {
                  setShowSingleNotifyConfirm(false);
                  setPendingSingleNotify(null);
                }}
                className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest text-mck-navy/60 hover:text-mck-navy"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowSingleNotifyConfirm(false);
                  if (pendingSingleNotify) {
                    setSentPersonnelIds(prev => {
                      const newSet = new Set(prev);
                      newSet.add(pendingSingleNotify.email);
                      return newSet;
                    });
                  }
                  setShowSingleNotifySuccess(true);
                  setTimeout(() => setShowSingleNotifySuccess(false), 2000);
                }}
                className="flex-1 px-4 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all"
              >
                确认发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 单人发送通知成功弹窗 */}
      {showSingleNotifySuccess && (
        <div className="fixed inset-0 bg-transparent z-[60] flex items-center justify-center pointer-events-none">
          <div
            className="bg-gray-700 text-white px-6 py-3 rounded-lg shadow-lg"
            style={{ animation: "fadeInOut 2s ease-in-out forwards" }}
          >
            <style>{`
              @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(10px); }
                15% { opacity: 1; transform: translateY(0); }
                85% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-10px); }
              }
            `}</style>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-green-400" />
              <span className="text-sm font-medium">已发送</span>
            </div>
          </div>
        </div>
      )}

      {/* 向其余全体股东发送邮件确认弹窗 */}
      {showMailAllConfirm && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm mck-card shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <h3 className="text-lg font-serif font-bold text-mck-navy mb-2">确认发送邮件</h3>
              <p className="text-sm text-mck-navy/60">
                确定要向其余全体股东发送会议通知邮件吗？
              </p>
            </div>
            <div className="p-4 border-t border-mck-border flex gap-3">
              <button
                onClick={() => setShowMailAllConfirm(false)}
                className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest text-mck-navy/60 border border-mck-border hover:bg-mck-navy/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowMailAllConfirm(false);
                  setSentToAllOthers(true);
                  setShowMailAllSuccess(true);
                  setTimeout(() => setShowMailAllSuccess(false), 2000);
                }}
                className="flex-1 px-4 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all"
              >
                确认发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 向其余全体股东发送邮件成功弹窗 */}
      {showMailAllSuccess && (
        <div className="fixed inset-0 bg-transparent z-[60] flex items-center justify-center pointer-events-none">
          <div
            className="bg-gray-700 text-white px-6 py-3 rounded-lg shadow-lg"
            style={{ animation: "fadeInOut 2s ease-in-out forwards" }}
          >
            <style>{`
              @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(10px); }
                15% { opacity: 1; transform: translateY(0); }
                85% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-10px); }
              }
            `}</style>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-green-400" />
              <span className="text-sm font-medium">已发送</span>
            </div>
          </div>
        </div>
      )}

      {/* 删除会议确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm mck-card shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-mck-red" />
              </div>
              <h3 className="text-lg font-serif font-bold text-mck-navy mb-2">确认删除会议</h3>
              <p className="text-sm text-mck-navy/60">
                确定要删除会议 <span className="font-bold">"{deleteConfirm.meetingTitle}"</span> 吗？
              </p>
              <p className="text-[10px] text-mck-red mt-2">此操作不可撤销</p>
            </div>
            <div className="flex gap-3 p-4 border-t border-mck-border">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest text-mck-navy/60 border border-mck-border hover:bg-mck-navy/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={deleteMeeting}
                className="flex-1 px-4 py-2 bg-mck-red text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
