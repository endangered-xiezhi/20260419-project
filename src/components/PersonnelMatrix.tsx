import React, { useState, useEffect } from "react";
import { Users, UserPlus, Search, Trash2, Edit3, ShieldCheck, ShieldAlert, Calendar, Save, X, Filter, Building2, Briefcase, AlertTriangle, GitBranch, Percent, User } from "lucide-react";
import { Personnel } from "../types";
import { cn } from "@/lib/utils";
import { loadStoredPersonnel, saveStoredPersonnel } from "@/utils/personnelStorage";
import {
  createPersonnelInFeishu,
  deletePersonnelFromFeishu,
  listPersonnelFromFeishu,
  updatePersonnelInFeishu,
} from "@/services/feishuMeetings";

// 排序优先级：董事 > 监事 > 高级管理人员 > 单一身份股东
// 说明：所有 isShareholder=true 的人员统一排最后，股东之间按持股份额排序
// sortOrder 用于固定特定人员的相对位置，数值越小越靠前
const getSortPriority = (p: Personnel): number => {
  // 董事类职位优先级最高 (1)
  if (["董事长", "董事", "独立董事"].includes(p.role)) return 1;
  // 监事优先级第二 (2)
  if (p.role === "监事") return 2;
  // 高级管理人员优先级第三 (3)
  if (["总经理", "副总经理", "财务负责人", "董事会秘书"].includes(p.role)) return 3;
  // 单一身份股东（isShareholder=true）排最后 (4)
  if (p.isShareholder) return 4;
  // 默认 (5)
  return 5;
};

const initialPersonnel: Personnel[] = [
  { id: "p1", name: "张明德", role: "董事长", organization: "董事会", termStart: "2024-01-01", termEnd: "2027-01-01", isIndependent: false, conflictOfInterest: ["关联公司A"], status: "在职", phone: "138-0000-0001", email: "zhangmingde@company.com", sortOrder: 1 },
  { id: "p2", name: "李华", role: "独立董事", organization: "董事会", termStart: "2024-01-01", termEnd: "2027-01-01", isIndependent: true, conflictOfInterest: [], status: "在职", phone: "138-0000-0002", email: "lihua@company.com", sortOrder: 2 },
  { id: "p3", name: "王建国", role: "监事", organization: "监事会", termStart: "2024-01-01", termEnd: "2027-01-01", isIndependent: false, conflictOfInterest: [], status: "在职", phone: "138-0000-0003", email: "wangjianguo@company.com", sortOrder: 3 },
  { id: "p4", name: "赵敏", role: "董事会秘书", organization: "管理层", termStart: "2024-01-01", termEnd: "2027-01-01", isIndependent: false, conflictOfInterest: [], status: "在职", phone: "138-0000-0004", email: "zhaomin@company.com", sortOrder: 4 },
  { id: "p5", name: "陈志强", role: "总经理", organization: "管理层", termStart: "2024-01-01", termEnd: "2027-01-01", isIndependent: false, conflictOfInterest: [], status: "在职", phone: "138-0000-0005", email: "chenzhiqiang@company.com", sortOrder: 5 },
  { id: "p6", name: "刘财务", role: "财务负责人", organization: "管理层", termStart: "2024-01-01", termEnd: "2027-01-01", isIndependent: false, conflictOfInterest: [], status: "在职", phone: "138-0000-0006", email: "liucaiwu@company.com", sortOrder: 6 },
  { id: "p11", name: "鼎盛集团", role: "法人股东", organization: "股东", termStart: "2024-01-01", termEnd: "2029-01-01", isShareholder: true, shareholding: 15, status: "正常", phone: "139-0000-0011", email: "dingshenggroup@example.com", sortOrder: 11 },
  { id: "p12", name: "周建国", role: "自然人股东", organization: "股东", termStart: "2024-01-01", termEnd: "2029-01-01", isShareholder: true, shareholding: 10, status: "正常", phone: "139-0000-0012", email: "zhoujianguo@example.com", sortOrder: 12 },
];

export const PersonnelMatrix: React.FC = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>(() => loadStoredPersonnel(initialPersonnel));
  const [syncError, setSyncError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOrg, setFilterOrg] = useState<string>("全部");
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPerson, setCurrentPerson] = useState<Partial<Personnel>>({});

  const refreshPersonnel = async () => {
    try {
      const { personnel: records } = await listPersonnelFromFeishu();
      if (records.length) {
        setPersonnel(records);
        saveStoredPersonnel(records);
      }
      setSyncError("");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "飞书人员读取失败");
    }
  };

  useEffect(() => {
    void refreshPersonnel();
  }, []);

  useEffect(() => {
    if (personnel.length) saveStoredPersonnel(personnel);
  }, [personnel]);

  const filteredPersonnel = personnel
    .filter(p => 
      (p.name.includes(searchQuery) || p.role.includes(searchQuery) || (p.phone && p.phone.includes(searchQuery)) || (p.email && p.email.includes(searchQuery))) &&
      (filterOrg === "全部" || 
        (filterOrg === "股东" ? p.isShareholder : p.organization === filterOrg))
    )
    .sort((a, b) => {
      const priorityA = getSortPriority(a);
      const priorityB = getSortPriority(b);
      // 先按类别优先级排序
      if (priorityA !== priorityB) return priorityA - priorityB;
      // 同类别内，使用固定排序（sortOrder）
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      // 同类别内，股东按持股份额从高到低排序
      if (a.isShareholder && b.isShareholder) {
        return (b.shareholding || 0) - (a.shareholding || 0);
      }
      return 0;
    });

  const handleSave = async () => {
    if (!currentPerson.name) return;
    const isDirector = ["董事长", "董事", "独立董事"].includes(currentPerson.role || "");
    if (currentPerson.isShareholder && (currentPerson.shares === undefined || currentPerson.shareholding === undefined)) {
      setSyncError("股东必须填写持股数量和持股比例");
      return;
    }
    const input = {
      name: currentPerson.name,
      role: currentPerson.role,
      organization: currentPerson.organization || "董事会",
      status: currentPerson.status || "在任",
      phone: currentPerson.phone || "",
      email: currentPerson.email || "",
      termStart: currentPerson.termStart,
      termEnd: currentPerson.termEnd,
      isIndependent: isDirector && Boolean(currentPerson.isIndependent),
      isShareholder: Boolean(currentPerson.isShareholder),
      shares: currentPerson.isShareholder ? currentPerson.shares : undefined,
      shareholding: currentPerson.isShareholder ? currentPerson.shareholding : undefined,
    };
    const localPerson: Personnel = {
      id: currentPerson.id || `local-${Date.now()}`,
      name: input.name,
      role: (input.role || "无") as Personnel["role"],
      organization: input.organization as Personnel["organization"],
      status: currentPerson.status || "在职",
      phone: input.phone,
      email: input.email,
      termStart: input.termStart,
      termEnd: input.termEnd,
      isIndependent: input.isIndependent,
      isShareholder: input.isShareholder,
      shares: input.shares,
      shareholding: input.shareholding,
      conflictOfInterest: currentPerson.conflictOfInterest || [],
      sortOrder: currentPerson.sortOrder,
    };
    const localRecords = currentPerson.id
      ? personnel.map((person) => person.id === currentPerson.id ? localPerson : person)
      : [localPerson, ...personnel];
    setPersonnel(localRecords);
    saveStoredPersonnel(localRecords);
    try {
      if (currentPerson.id?.startsWith("rec")) {
        await updatePersonnelInFeishu(currentPerson.id, input);
      } else {
        await createPersonnelInFeishu(input);
      }
      await refreshPersonnel();
      setIsEditing(false);
      setCurrentPerson({});
    } catch (error) {
      setIsEditing(false);
      setCurrentPerson({});
      const message = error instanceof Error ? error.message : "人员保存失败";
      setSyncError(`人员已保存在本机，但飞书同步失败：${message}`);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      const localRecords = personnel.filter((person) => person.id !== deleteConfirmId);
      setPersonnel(localRecords);
      saveStoredPersonnel(localRecords);
      try {
        if (deleteConfirmId.startsWith("rec")) {
          await deletePersonnelFromFeishu(deleteConfirmId);
        }
        setDeleteConfirmId(null);
      } catch (error) {
        setDeleteConfirmId(null);
        const message = error instanceof Error ? error.message : "人员删除失败";
        setSyncError(`本机记录已删除，但飞书同步失败：${message}`);
      }
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-mck-navy">与会人员</h2>
        </div>
        <button 
          onClick={() => { setIsEditing(true); setCurrentPerson({ organization: "董事会", isIndependent: false }); }}
          className="flex items-center gap-2 px-6 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all"
        >
          <UserPlus size={16} />
          新增成员
        </button>
      </header>

      {syncError && (
        <div className="flex items-center gap-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} />
          {syncError}
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl mck-card shadow-2xl">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-mck-border">
              <h3 className="text-xl font-serif font-bold">编辑成员信息</h3>
              <button onClick={() => setIsEditing(false)} className="text-mck-navy/40 hover:text-mck-navy"><X size={20} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">姓名</label>
                  <input 
                    type="text" 
                    value={currentPerson.name || ""} 
                    onChange={e => setCurrentPerson({...currentPerson, name: e.target.value})}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue"
                    placeholder="请输入姓名"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">所属机构</label>
                  <select 
                    value={currentPerson.organization || "董事会"} 
                    onChange={e => setCurrentPerson({...currentPerson, organization: e.target.value as any})}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue bg-white"
                  >
                    <option>董事会</option>
                    <option>监事会</option>
                    <option>管理层</option>
                    <option>无</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">职位</label>
                  <select 
                    value={currentPerson.role || "董事"} 
                    onChange={e => {
                      const newRole = e.target.value as any;
                      const shouldBeIndependent = newRole === "独立董事";
                      const isDirector = ["董事长", "董事", "独立董事"].includes(newRole);
                      setCurrentPerson({...currentPerson, role: newRole, isIndependent: isDirector ? (shouldBeIndependent || currentPerson.isIndependent) : false});
                    }}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue bg-white"
                  >
                    <optgroup label="董事会">
                      <option>董事长</option>
                      <option>董事</option>
                      <option>独立董事</option>
                    </optgroup>
                    <optgroup label="监事会">
                      <option>监事</option>
                    </optgroup>
                    <optgroup label="管理层">
                      <option>总经理</option>
                      <option>副总经理</option>
                      <option>财务负责人</option>
                      <option>董事会秘书</option>
                    </optgroup>
                    <option>无</option>
                  </select>
                  {/* 监事任职提醒 */}
                  {currentPerson.role === "监事" && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700 leading-relaxed">
                      <span className="font-bold">⚠️ 任职限制：</span>
                      公司的董事和所有高级管理人员均<span className="font-bold">绝对不能</span>兼任公司的监事。
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">是否股东</label>
                  <select 
                    value={currentPerson.isShareholder ? "是" : "否"} 
                    onChange={e => {
                      const isShareholder = e.target.value === "是";
                      setCurrentPerson({
                        ...currentPerson,
                        isShareholder,
                        shares: isShareholder ? currentPerson.shares : undefined,
                        shareholding: isShareholder ? currentPerson.shareholding : undefined,
                      });
                    }}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue bg-white"
                  >
                    <option value="否">否</option>
                    <option value="是">是</option>
                  </select>
                  {/* 股权占比输入框 */}
                  {currentPerson.isShareholder && (
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">持股数量（股）</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={currentPerson.shares ?? ""}
                          onChange={e => setCurrentPerson({...currentPerson, shares: e.target.value === "" ? undefined : Number(e.target.value)})}
                          className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue bg-white"
                          placeholder="请输入持股数量"
                        />
                      </div>
                      <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">持股比例 (%)</label>
                      <input
                        type="number" 
                        min="0"
                        max="100"
                        step="0.01"
                        value={currentPerson.shareholding ?? ""}
                        onChange={e => setCurrentPerson({...currentPerson, shareholding: e.target.value === "" ? undefined : Number(e.target.value)})}
                        className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue bg-white"
                        placeholder="请输入持股比例"
                      />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* 独立性声明 - 仅对董事显示 */}
              {(currentPerson.role === "董事长" || currentPerson.role === "董事" || currentPerson.role === "独立董事") && (
                <div className="space-y-2">
                  <label className={cn(
                    "flex items-center gap-2",
                    currentPerson.role === "独立董事" ? "cursor-default" : "cursor-pointer"
                  )}>
                    {currentPerson.role === "独立董事" ? (
                      // 独立董事：必须勾选，不可取消
                      <>
                        <input 
                          type="checkbox" 
                          checked={true}
                          disabled
                          className="w-4 h-4 accent-mck-blue cursor-not-allowed"
                        />
                        <span className="flex items-center gap-1.5 text-xs font-bold text-mck-navy">
                          <ShieldCheck size={14} className="text-blue-600" />
                          独立性声明 <span className="text-mck-red">(必选)</span>
                        </span>
                      </>
                    ) : (
                      // 其他董事：可选择是否声明独立
                      <>
                        <input 
                          type="checkbox" 
                          checked={currentPerson.isIndependent || false}
                          onChange={e => setCurrentPerson({...currentPerson, isIndependent: e.target.checked})}
                          className="w-4 h-4 accent-mck-blue"
                        />
                        <span className="text-xs font-bold text-mck-navy">独立性声明</span>
                      </>
                    )}
                  </label>
                  {currentPerson.role === "独立董事" && (
                    <p className="text-[10px] text-blue-600/70 italic">
                      * 独立董事依法必须保持独立性，声明不可撤销
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">任期开始</label>
                  <input 
                    type="date" 
                    value={currentPerson.termStart || ""} 
                    onChange={e => setCurrentPerson({...currentPerson, termStart: e.target.value})}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">任期结束</label>
                  <input 
                    type="date" 
                    value={currentPerson.termEnd || ""} 
                    onChange={e => setCurrentPerson({...currentPerson, termEnd: e.target.value})}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">手机号</label>
                  <input 
                    type="tel" 
                    value={currentPerson.phone || ""} 
                    onChange={e => setCurrentPerson({...currentPerson, phone: e.target.value})}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue"
                    placeholder="138-xxxx-xxxx"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">邮箱</label>
                  <input 
                    type="email" 
                    value={currentPerson.email || ""} 
                    onChange={e => setCurrentPerson({...currentPerson, email: e.target.value})}
                    className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-mck-navy/60 hover:text-mck-navy">取消</button>
                <button onClick={handleSave} className="flex items-center gap-2 px-8 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all">
                  <Save size={16} />
                  保存记录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md mck-card shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 flex items-center justify-center text-mck-red">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-mck-navy">确认删除</h3>
                <p className="text-[10px] text-mck-navy/40 uppercase tracking-widest">此操作不可撤销</p>
              </div>
            </div>
            
            <p className="text-sm text-mck-navy/60 mb-8">
              您确定要移除该人员记录吗？该操作将从系统中永久删除该成员的所有任期和关联关系数据。
            </p>

            <div className="flex justify-end gap-4">
              <button 
                onClick={() => setDeleteConfirmId(null)} 
                className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-mck-navy/60 hover:text-mck-navy"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-8 py-2 bg-mck-red text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
              >
                确认移除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mck-navy/40" />
          <input 
            type="text" 
            placeholder="搜索姓名、职位..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-mck-border pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-mck-blue"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-mck-border px-4 py-3">
          <Filter size={16} className="text-mck-navy/40" />
          <select 
            value={filterOrg} 
            onChange={e => setFilterOrg(e.target.value)}
            className="text-sm bg-transparent focus:outline-none font-bold text-mck-navy"
          >
            <option>全部</option>
            <option>董事会</option>
            <option>监事会</option>
            <option>管理层</option>
            <option>股东</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredPersonnel.map(p => (
          <div key={p.id} className="mck-card group hover:border-mck-blue transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-mck-bg flex items-center justify-center text-mck-navy/40 group-hover:text-mck-blue transition-colors">
                <Users size={24} />
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => { setCurrentPerson(p); setIsEditing(true); }}
                  className="p-1 hover:bg-mck-bg text-mck-navy/40 hover:text-mck-blue"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(p.id)}
                  className="p-1 hover:bg-mck-bg text-mck-navy/40 hover:text-mck-red"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-serif font-bold text-mck-navy">{p.name}</h4>
                {p.isIndependent && (
                  <span className="flex items-center gap-1 text-[9px] font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5">
                    <ShieldCheck size={10} />
                    独立
                  </span>
                )}
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-mck-navy/40">
                {p.isShareholder ? "股东" : `${p.role} · ${p.organization}`}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-mck-border">
              {p.isShareholder ? (
                <>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                    <span className="text-mck-navy/40">持股数量</span>
                    <span className="font-bold text-orange-600">{p.shares ?? 0} 股</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                    <span className="text-mck-navy/40">持股比例</span>
                    <span className="font-bold text-orange-600">{p.shareholding}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-orange-600 font-bold">
                    <Percent size={12} />
                    <span>股东会表决权</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                    <span className="text-mck-navy/40">任期状态</span>
                    <span className="font-bold text-green-600">正常</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-mck-navy/60">
                    <Calendar size={12} />
                    <span>{p.termStart} 至 {p.termEnd || "至今"}</span>
                  </div>
                </>
              )}
              {(p.conflictOfInterest?.length ?? 0) > 0 ? (
                <div className="flex items-center gap-2 text-[10px] text-mck-red font-bold">
                  <ShieldAlert size={12} />
                  <span>关联关系: {p.conflictOfInterest?.join(", ")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] text-green-600 font-bold">
                  <ShieldCheck size={12} />
                  <span>无关联冲突</span>
                </div>
              )}
              {(p.phone || p.email) && (
                <div className="pt-2 space-y-1">
                  {p.phone && (
                    <div className="flex items-center gap-2 text-[10px] text-mck-navy/60">
                      <span className="w-4">📱</span>
                      <span>{p.phone}</span>
                    </div>
                  )}
                  {p.email && (
                    <div className="flex items-center gap-2 text-[10px] text-mck-navy/60">
                      <span className="w-4">✉️</span>
                      <span className="truncate">{p.email}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Section - 组织结构图与统计 */}
      <div className="mt-12 space-y-8">
        <h3 className="text-lg font-serif font-bold text-mck-navy flex items-center gap-2">
          <GitBranch size={20} className="text-mck-blue" />
          组织结构概览
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 组织结构图 */}
          <div className="lg:col-span-2 mck-card bg-white">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-mck-border">
              <Building2 size={18} className="text-mck-blue" />
              <h4 className="text-sm font-bold text-mck-navy">公司治理架构</h4>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {/* 董事会 */}
              <div className="text-center">
                <div className="w-full h-16 bg-purple-100 border-2 border-purple-500 rounded-lg flex flex-col items-center justify-center mb-2">
                  <span className="text-xs font-bold text-purple-700">董事会</span>
                  <span className="text-lg font-serif font-bold text-purple-600">{personnel.filter(p => p.organization === "董事会").length}人</span>
                </div>
                <div className="space-y-1">
                  {personnel.filter(p => p.organization === "董事会").slice(0, 3).map(p => (
                    <div key={p.id} className="text-[10px] text-mck-navy/60 truncate">{p.name}</div>
                  ))}
                </div>
              </div>

              {/* 监事会 */}
              <div className="text-center">
                <div className="w-full h-16 bg-teal-100 border-2 border-teal-500 rounded-lg flex flex-col items-center justify-center mb-2">
                  <span className="text-xs font-bold text-teal-700">监事会</span>
                  <span className="text-lg font-serif font-bold text-teal-600">{personnel.filter(p => p.organization === "监事会").length}人</span>
                </div>
                <div className="space-y-1">
                  {personnel.filter(p => p.organization === "监事会").map(p => (
                    <div key={p.id} className="text-[10px] text-mck-navy/60 truncate">{p.name}</div>
                  ))}
                </div>
              </div>

              {/* 管理层 */}
              <div className="text-center">
                <div className="w-full h-16 bg-blue-100 border-2 border-blue-500 rounded-lg flex flex-col items-center justify-center mb-2">
                  <span className="text-xs font-bold text-blue-700">管理层</span>
                  <span className="text-lg font-serif font-bold text-blue-600">{personnel.filter(p => p.organization === "管理层").length}人</span>
                </div>
                <div className="space-y-1">
                  {personnel.filter(p => p.organization === "管理层").slice(0, 3).map(p => (
                    <div key={p.id} className="text-[10px] text-mck-navy/60 truncate">{p.name}</div>
                  ))}
                </div>
              </div>

              {/* 股东 */}
              <div className="text-center">
                <div className="w-full h-16 bg-orange-100 border-2 border-orange-500 rounded-lg flex flex-col items-center justify-center mb-2">
                  <span className="text-xs font-bold text-orange-700">股东</span>
                  <span className="text-lg font-serif font-bold text-orange-600">{personnel.filter(p => p.isShareholder).length}人</span>
                </div>
                <div className="space-y-1">
                  {personnel.filter(p => p.isShareholder).map(p => (
                    <div key={p.id} className="text-[10px] text-orange-600 truncate font-bold">
                      {p.name} {p.shareholding}%
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 股东持股示意 */}
            <div className="mt-6 pt-4 border-t border-mck-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-mck-navy/40 uppercase tracking-widest">股东持股分布</span>
                <span className="text-[10px] text-mck-navy/40">含范例数据</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-mck-bg">
                <div className="bg-purple-500 w-[35%]" title="控股股东"></div>
                <div className="bg-blue-400 w-[25%]" title="机构投资者"></div>
                <div className="bg-teal-400 w-[20%]" title="其他股东"></div>
                <div className="bg-gray-300 w-[20%]" title="流通股"></div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-mck-navy/50">控股股东 35%</span>
                <span className="text-[10px] text-mck-navy/50">机构 25%</span>
                <span className="text-[10px] text-mck-navy/50">其他 20%</span>
                <span className="text-[10px] text-mck-navy/50">流通 20%</span>
              </div>
            </div>
          </div>

          {/* 交叉任职检测 */}
          <div className="mck-card bg-white">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-mck-border">
              <AlertTriangle size={16} className="text-amber-500" />
              <h4 className="text-sm font-bold text-mck-navy">任职合规检测</h4>
            </div>
            
            {/* 董事监事互任检测 */}
            <div className="space-y-3">
              {(() => {
                const directors = personnel.filter(p => p.organization === "董事会");
                const supervisors = personnel.filter(p => p.organization === "监事会");
                const executives = personnel.filter(p => p.organization === "管理层");
                
                // 检查是否有董事兼任监事
                const isValid = directors.length > 0 && supervisors.length > 0;
                
                return (
                  <>
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      isValid ? "bg-green-50" : "bg-amber-50"
                    )}>
                      {isValid ? (
                        <>
                          <ShieldCheck size={18} className="text-green-600" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-green-700">董事与监事分立</p>
                            <p className="text-[10px] text-green-600">符合《公司法》要求</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={18} className="text-amber-600" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-amber-700">组织架构待完善</p>
                            <p className="text-[10px] text-amber-600">需配置董事会和监事会</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="p-3 bg-mck-bg/50 rounded-lg">
                      <div className="flex justify-between text-[10px] mb-2">
                        <span className="text-mck-navy/40">独立董事占比</span>
                        <span className="font-bold text-mck-blue">
                          {personnel.filter(p => p.organization === "董事会" && p.isIndependent).length}/{personnel.filter(p => p.organization === "董事会").length}
                        </span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all",
                            directors.filter(d => d.isIndependent).length / Math.max(directors.length, 1) >= 0.33 ? "bg-green-500" : "bg-amber-500"
                          )}
                          style={{ width: `${Math.round((directors.filter(d => d.isIndependent).length / Math.max(directors.length, 1)) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-mck-navy/40 mt-1">
                        {directors.filter(d => d.isIndependent).length / Math.max(directors.length, 1) >= 0.33 ? "✓ 符合监管要求" : "⚠ 建议增加独立董事"}
                      </p>
                    </div>

                    <div className="text-[10px] text-mck-navy/40 p-2 bg-mck-bg/30 rounded">
                      <p className="font-bold mb-1">高管兼任检测：</p>
                      {executives.some(e => directors.some(d => d.name === e.name)) ? (
                        <p className="text-amber-600">⚠ 发现交叉任职情况</p>
                      ) : (
                        <p className="text-green-600">✓ 高管与董事无交叉</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* 任期预警 */}
          <div className="mck-card bg-white">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-mck-border">
              <Calendar size={16} className="text-mck-blue" />
              <h4 className="text-sm font-bold text-mck-navy">任期预警</h4>
            </div>
            
            <div className="space-y-3">
              {(() => {
                const today = new Date();
                // 董事任期2年，监事任期3年
                const DIRECTOR_TERM_YEARS = 2;
                const SUPERVISOR_TERM_YEARS = 3;
                const WARNING_DAYS = 30; // 预警天数

                // 计算人员任期
                const personnelWithTerms = personnel
                  .filter(p => p.role === "董事长" || p.role === "董事" || p.role === "独立董事" || p.role === "监事")
                  .map(p => {
                    let termStart = p.termStart ? new Date(p.termStart) : null;
                    let termEnd = p.termEnd ? new Date(p.termEnd) : null;

                    // 如果没有设置任期，根据角色计算
                    if (!termStart || !termEnd) {
                      const termYears = (p.role === "监事") ? SUPERVISOR_TERM_YEARS : DIRECTOR_TERM_YEARS;
                      if (!termStart) {
                        termStart = today;
                      }
                      if (!termEnd) {
                        termEnd = new Date(termStart);
                        termEnd.setFullYear(termEnd.getFullYear() + termYears);
                      }
                    }

                    const daysUntil = Math.ceil((termEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const totalDays = Math.ceil((termEnd.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24));
                    const daysPassed = Math.ceil((today.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24));
                    const progress = totalDays > 0 ? Math.min(100, Math.max(0, (daysPassed / totalDays) * 100)) : 0;
                    const isWarning = daysUntil <= WARNING_DAYS && daysUntil > 0;

                    return {
                      ...p,
                      termStart,
                      termEnd,
                      daysUntil,
                      totalDays,
                      progress,
                      isWarning,
                      termYears: p.role === "监事" ? SUPERVISOR_TERM_YEARS : DIRECTOR_TERM_YEARS
                    };
                  });

                const warnings = personnelWithTerms.filter(p => p.isWarning);
                const normalItems = personnelWithTerms.filter(p => !p.isWarning && p.daysUntil > 0);

                if (personnelWithTerms.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users size={24} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-bold text-gray-600">暂无董事/监事数据</p>
                      <p className="text-[10px] text-gray-400 mt-1">请在人员矩阵中添加相关人员</p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* 预警人员 */}
                    {warnings.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={14} className="text-red-600" />
                          <span className="text-[10px] font-bold text-red-700">任期预警 ({warnings.length})</span>
                        </div>
                        {warnings.map(w => (
                          <div key={w.id} className="text-[10px] text-red-600 py-1.5 border-b border-red-100 last:border-0">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{w.name}</span>
                              <span className="font-bold text-red-700">
                                剩余 {w.daysUntil} 天
                              </span>
                            </div>
                            <div className="text-red-500/70">{w.role} · 任期{w.termYears}年</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 正常人员 */}
                    {normalItems.map(w => (
                      <div key={w.id} className="p-2 bg-mck-bg/50 rounded-lg">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-medium text-mck-navy">{w.name}</span>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            w.daysUntil <= 60 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                          )}>
                            剩余 {w.daysUntil} 天
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-mck-navy/50 mb-1">
                          <span>{w.role}</span>
                          <span>任期{w.termYears}年</span>
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${w.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
