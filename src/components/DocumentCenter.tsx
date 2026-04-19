import React, { useState, useMemo } from "react";
import { FileText, Download, Printer, Check, Edit3, Save, X, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentCenterProps {
  meetingId?: string | null;
}

interface DocumentItem {
  id: string;
  name: string;
  date: string;
  status: string;
  meetingId: string;
  content?: string;
}

const mockDocuments: DocumentItem[] = [
  { 
    id: "d1", 
    name: "会议通知 - 2026年第一次临时股东大会", 
    date: "2026-03-25", 
    status: "已签章", 
    meetingId: "1",
    content: "关于召开2026年第一次临时股东大会的通知\n\n各位股东：\n根据《公司法》及公司章程规定，董事会决定于2026年4月10日召开临时股东大会..."
  },
  { 
    id: "d2", 
    name: "会议记录 - 第三届董事会第十二次会议", 
    date: "2026-03-30", 
    status: "草稿", 
    meetingId: "2",
    content: "第三届董事会第十二次会议记录\n\n时间：2026年3月30日\n地点：公司一号会议室\n出席人员：王董事长、李董事、张董事...\n\n会议议程：\n1. 审议向银行申请授信的议案..."
  },
  { 
    id: "d3", 
    name: "决议公告 - 关于向银行申请授信的议案", 
    date: "2026-03-30", 
    status: "待审核", 
    meetingId: "2",
    content: "智理科技股份有限公司董事会决议公告\n\n公司董事会于2026年3月30日召开会议，审议通过了《关于向银行申请5000万元授信的议案》..."
  },
];

export const DocumentCenter: React.FC<DocumentCenterProps> = ({ meetingId }) => {
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [localDocs, setLocalDocs] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem("corporate_generated_documents");
    const allGenerated = saved ? JSON.parse(saved) : [];
    return allGenerated.map((d: any) => ({
      id: d.id,
      name: d.title,
      date: d.date,
      status: d.status,
      meetingId: d.meetingId,
      content: d.content || "（暂无内容，请开始编辑）"
    }));
  });

  const documents = useMemo(() => {
    const combined = [...mockDocuments, ...localDocs];
    return meetingId ? combined.filter(d => d.meetingId === meetingId) : combined;
  }, [meetingId, localDocs]);

  const handleEdit = (doc: DocumentItem) => {
    setEditingDoc({ ...doc });
  };

  const handleSave = () => {
    if (!editingDoc) return;

    // Update local state and localStorage
    const isMock = mockDocuments.some(d => d.id === editingDoc.id);
    
    if (isMock) {
      // For mock docs, we save them to localDocs to "override" or just handle them as local now
      const updatedLocal = [...localDocs];
      const existingIdx = updatedLocal.findIndex(d => d.id === editingDoc.id);
      if (existingIdx >= 0) {
        updatedLocal[existingIdx] = editingDoc;
      } else {
        updatedLocal.push(editingDoc);
      }
      setLocalDocs(updatedLocal);
      // We should probably save these "overrides" separately or just treat all as one list
    } else {
      const updatedLocal = localDocs.map(d => d.id === editingDoc.id ? editingDoc : d);
      setLocalDocs(updatedLocal);
      
      // Update the specific storage for generated docs
      const saved = localStorage.getItem("corporate_generated_documents");
      const allGenerated = saved ? JSON.parse(saved) : [];
      const updatedGenerated = allGenerated.map((d: any) => 
        d.id === editingDoc.id ? { ...d, title: editingDoc.name, content: editingDoc.content } : d
      );
      localStorage.setItem("corporate_generated_documents", JSON.stringify(updatedGenerated));
    }

    setEditingDoc(null);
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-mck-navy">文书中心</h2>
          <p className="text-mck-navy/60 mt-1">一键生成标准合规的三会档案</p>
        </div>
        <button className="px-6 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all">
          新建文书模板
        </button>
      </header>

      {editingDoc && (
        <div className="fixed inset-0 bg-mck-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[80vh] mck-card shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-mck-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-mck-blue/10 flex items-center justify-center text-mck-blue">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold">在线编辑: {editingDoc.name}</h3>
                  <p className="text-[10px] text-mck-navy/40 uppercase tracking-widest">正在编辑文书正文内容</p>
                </div>
              </div>
              <button onClick={() => setEditingDoc(null)} className="text-mck-navy/40 hover:text-mck-navy transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              <div className="flex-1 border border-mck-border p-8 overflow-y-auto bg-mck-bg/30">
                <textarea
                  value={editingDoc.content}
                  onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })}
                  className="w-full h-full bg-transparent border-none focus:outline-none font-serif text-lg leading-relaxed text-mck-navy resize-none"
                  placeholder="在此输入文书内容..."
                />
              </div>
              
              <div className="p-4 bg-mck-bg border border-mck-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">
                  <FileCheck size={14} />
                  自动保存至本地缓存
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setEditingDoc(null)}
                    className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-mck-navy/60 hover:text-mck-navy"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-8 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all"
                  >
                    <Save size={16} />
                    保存修改
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 mck-card">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-mck-border">
            <h3 className="text-lg font-serif font-bold">文书列表</h3>
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="搜索文书..." 
                className="text-xs border border-mck-border px-4 py-2 w-64 focus:outline-none focus:border-mck-blue"
              />
            </div>
          </div>

          <div className="space-y-4">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-4 border border-mck-border hover:border-mck-blue transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-mck-bg flex items-center justify-center text-mck-navy/40 group-hover:text-mck-blue transition-colors">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-mck-navy">{doc.name}</p>
                    <p className="text-[10px] text-mck-navy/40 uppercase tracking-wider font-mono">{doc.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-2 py-1",
                    doc.status === "已签章" ? "bg-green-100 text-green-700" : 
                    doc.status === "草稿" ? "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-700"
                  )}>
                    {doc.status}
                  </span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(doc)}
                      title="编辑" 
                      className="p-2 hover:bg-mck-bg text-mck-navy/60 hover:text-mck-blue"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button title="下载" className="p-2 hover:bg-mck-bg text-mck-navy/60 hover:text-mck-blue"><Download size={16} /></button>
                    <button title="打印" className="p-2 hover:bg-mck-bg text-mck-navy/60 hover:text-mck-blue"><Printer size={16} /></button>
                    <button title="审核通过" className="p-2 hover:bg-mck-bg text-mck-navy/60 hover:text-green-600"><Check size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="mck-card mck-card-accent-blue">
            <h3 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-6">文书生成统计</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span>股东会文书</span>
                  <span className="font-bold">12/12</span>
                </div>
                <div className="h-1 bg-mck-bg rounded-full overflow-hidden">
                  <div className="h-full bg-mck-blue w-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span>董事会文书</span>
                  <span className="font-bold">45/48</span>
                </div>
                <div className="h-1 bg-mck-bg rounded-full overflow-hidden">
                  <div className="h-full bg-mck-blue w-[93%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span>监事会文书</span>
                  <span className="font-bold">18/20</span>
                </div>
                <div className="h-1 bg-mck-bg rounded-full overflow-hidden">
                  <div className="h-full bg-mck-blue w-[90%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="mck-card bg-mck-bg">
            <h3 className="text-xs font-bold uppercase tracking-widest text-mck-navy/40 mb-4">智能排版引擎</h3>
            <p className="text-sm text-mck-navy/80 mb-6">
              系统已根据《党政机关公文格式》(GB/T 9704-2012) 自动优化所有文书排版。
            </p>
            <button className="w-full py-3 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all">
              更新排版标准
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
