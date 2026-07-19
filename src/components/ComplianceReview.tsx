import React, { useState, useEffect, useRef, useCallback } from "react";
import { ShieldCheck, Upload, FileText, Brain, AlertTriangle, CheckCircle2, X, Loader2, Clock, ChevronDown, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { ComplianceIssue } from "../types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ReviewRecord {
  id: string;
  fileName: string;
  fileType: string;
  uploadTime: string;
  status: "pending" | "analyzing" | "completed" | "error";
  content?: string;
  aiResponse?: string;
  aiThinking?: string;
  riskAlerts?: string[];
  complianceScore?: number;
  reviewMode?: "evidence-rules";
  reviewConclusion?: string;
  missingItems?: string[];
  usedFeishu?: boolean;
}

interface ComplianceReviewProps {
  meetingId?: string | null;
  onGenerateDocuments?: (id: string) => void;
  onReviewComplete?: (docId: string, score: number, reviewRecordId: string) => void; // 审查完成回调
}

// 可拖动调整大小的分隔条组件
interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  direction: 'horizontal' | 'vertical';
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown, direction }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      className={cn(
        "group select-none transition-colors z-10",
        direction === 'horizontal' 
          ? "w-2 cursor-col-resize hover:bg-mck-blue/20" 
          : "h-2 cursor-row-resize hover:bg-mck-blue/20"
      )}
      style={{
        backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.3)' : isHovered ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
      }}
      onMouseDown={(e) => {
        setIsDragging(true);
        onMouseDown(e);
      }}
      onMouseUp={() => setIsDragging(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        "flex items-center justify-center transition-opacity",
        (isHovered || isDragging) ? "opacity-100" : "opacity-0"
      )}>
        <div className={cn(
          "bg-mck-blue/50 rounded-full",
          direction === 'horizontal' ? "w-0.5 h-8" : "h-0.5 w-8"
        )} />
      </div>
    </div>
  );
};

export const ComplianceReview: React.FC<ComplianceReviewProps> = ({ meetingId, onGenerateDocuments, onReviewComplete }) => {
  const [records, setRecords] = useState<ReviewRecord[]>(() => {
    const saved = localStorage.getItem("corporate_compliance_records");
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as ReviewRecord[];
      return parsed.map((record) => {
        const isLegacyDemo =
          record.aiThinking?.includes("2026年3月20日") ||
          record.aiResponse?.includes("间隔仅为11天");
        if (!isLegacyDemo) return record;
        return {
          ...record,
          status: "pending" as const,
          aiThinking: undefined,
          aiResponse: undefined,
          riskAlerts: undefined,
          reviewConclusion: undefined,
          complianceScore: undefined,
        };
      });
    } catch {
      return [];
    }
  });
  const [activeRecord, setActiveRecord] = useState<ReviewRecord | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const [expandedPanel, setExpandedPanel] = useState<"none" | "content" | "result">("none");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 从文书中心选择文件弹窗
  const [showDocCenterSelect, setShowDocCenterSelect] = useState(false);
  const [docCenterDocs, setDocCenterDocs] = useState<{id: string; name: string; meetingTitle: string; content?: string}[]>([]);
  
  // 面板宽度状态 (百分比)
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem("compliance_left_width");
    return saved ? parseFloat(saved) : 20; // 默认左侧20%
  });
  const [contentPanelWidth, setContentPanelWidth] = useState(() => {
    const saved = localStorage.getItem("compliance_content_width");
    return saved ? parseFloat(saved) : 30; // 默认内容区30%
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // 保存面板宽度到 localStorage
  useEffect(() => {
    localStorage.setItem("compliance_left_width", leftPanelWidth.toString());
  }, [leftPanelWidth]);

  useEffect(() => {
    localStorage.setItem("compliance_content_width", contentPanelWidth.toString());
  }, [contentPanelWidth]);

  useEffect(() => {
    localStorage.setItem("corporate_compliance_records", JSON.stringify(records));
  }, [records]);

  // 处理拖动
  const handleResizeStart = useCallback((panel: 'left' | 'content', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = panel;
    startXRef.current = e.clientX;
    
    if (panel === 'left') {
      startWidthRef.current = leftPanelWidth;
    } else {
      startWidthRef.current = contentPanelWidth;
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const deltaX = moveEvent.clientX - startXRef.current;
      const deltaPercent = (deltaX / containerWidth) * 100;

      if (isDraggingRef.current === 'left') {
        const newWidth = Math.max(10, Math.min(40, startWidthRef.current + deltaPercent));
        setLeftPanelWidth(newWidth);
      } else if (isDraggingRef.current === 'content') {
        const newWidth = Math.max(15, Math.min(50, startWidthRef.current + deltaPercent));
        setContentPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftPanelWidth, contentPanelWidth]);

  // 从文书中心加载文档
  const loadDocsFromDocCenter = () => {
    const savedDocs = localStorage.getItem("corporate_generated_docs");
    if (savedDocs) {
      const docs = JSON.parse(savedDocs);
      setDocCenterDocs(docs.map((d: any) => ({
        id: d.id,
        name: d.name,
        meetingTitle: d.meetingTitle,
        content: d.content
      })));
    } else {
      setDocCenterDocs([]);
    }
    setShowDocCenterSelect(true);
  };

  // 选择文书中心的文档进行审查
  const selectDocFromCenter = (doc: {id: string; name: string; meetingTitle: string; content?: string}) => {
    if (!doc.content) {
      setUploadError("该文档没有可审查的内容");
      setShowDocCenterSelect(false);
      return;
    }

    const newRecord: ReviewRecord = {
      id: `review-${Date.now()}`,
      fileName: doc.name,
      fileType: doc.meetingTitle,
      uploadTime: new Date().toISOString(),
      status: 'pending',
      content: doc.content,
    };
    
    setRecords(prev => {
      const updated = [newRecord, ...prev];
      localStorage.setItem("corporate_compliance_records", JSON.stringify(updated));
      return updated;
    });
    setActiveRecord(newRecord);
    setShowDocCenterSelect(false);
    
    // 开始审查（传递原始文档ID以便回调）
    setTimeout(() => {
      startAnalysis(newRecord, doc.id);
    }, 500);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 15, 90));
      }, 100);

      let text: string;
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

      if ([".docx", ".doc", ".pdf"].includes(ext)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/knowledge/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "文件解析失败");
        }

        const result = await response.json();
        text = result.data.fullContent || result.data.content;
      } else {
        text = await file.text();
      }
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      const newRecord: ReviewRecord = {
        id: `review-${Date.now()}`,
        fileName: file.name,
        fileType: file.type || file.name.split('.').pop() || 'unknown',
        uploadTime: new Date().toLocaleString('zh-CN'),
        status: "pending",
        content: text,
      };

      setRecords(prev => [newRecord, ...prev]);
      setActiveRecord(newRecord);
      
      setTimeout(() => {
        startAnalysis(newRecord);
      }, 500);

    } catch (error: any) {
      console.error("文件读取失败:", error);
      setUploadError(error.message || "文件读取失败，请重试");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const startAnalysis = async (record: ReviewRecord, sourceDocId?: string) => {
    setIsAnalyzing(true);
    
    setRecords(prev => prev.map(r => 
      r.id === record.id ? { ...r, status: "analyzing" as const } : r
    ));
    setActiveRecord(prev => prev?.id === record.id ? { ...prev, status: "analyzing" as const } : prev);

    try {
      const response = await fetch("/api/compliance/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: record.content || "",
          meetingId: meetingId || undefined,
        }),
        signal: AbortSignal.timeout(120000),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "审查服务返回失败");
      }

      const review = result.data as {
        score: number;
        conclusion: string;
        trace: string;
        markdown: string;
        riskAlerts: string[];
        missingItems: string[];
        mode: "evidence-rules";
        sources?: {
          document?: boolean;
          feishu?: boolean;
          feishuWarning?: string;
        };
      };
      const sourceTrace = review.sources?.feishu
        ? "\n8. 已与当前飞书会议表、议案和纪要字段交叉核验"
        : review.sources?.feishuWarning
          ? `\n8. 飞书交叉核验暂未完成：${review.sources.feishuWarning}`
          : "\n8. 当前未指定飞书会议，仅审查上传文件";

      const updatedRecord: ReviewRecord = {
        ...record,
        status: "completed",
        aiThinking: `${review.trace}${sourceTrace}`,
        aiResponse: review.markdown,
        riskAlerts: review.riskAlerts,
        complianceScore: review.score,
        reviewMode: review.mode,
        reviewConclusion: review.conclusion,
        missingItems: review.missingItems,
        usedFeishu: Boolean(review.sources?.feishu),
      };

      setRecords(prev => prev.map(r => r.id === record.id ? updatedRecord : r));
      setActiveRecord(updatedRecord);

      if (sourceDocId && onReviewComplete) {
        onReviewComplete(sourceDocId, review.score, record.id);
      }
    } catch (error: any) {
      console.error("合规审查错误:", error);
      const errorRecord: ReviewRecord = {
        ...record,
        status: "error",
        aiResponse: `## ❌ 审查失败\n\n**错误信息**：${error.message || "服务不可用"}\n\n请确认当前文件已经成功解析，然后重新点击审查。`,
      };
      setRecords(prev => prev.map(r => r.id === record.id ? errorRecord : r));
      setActiveRecord(errorRecord);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const deleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecords(prev => prev.filter(r => r.id !== id));
    if (activeRecord?.id === id) {
      setActiveRecord(null);
    }
  };

  const getStatusIcon = (status: ReviewRecord["status"]) => {
    switch (status) {
      case "pending": return <Clock size={14} className="text-orange-500" />;
      case "analyzing": return <Loader2 size={14} className="text-blue-500 animate-spin" />;
      case "completed": return <CheckCircle2 size={14} className="text-green-500" />;
      case "error": return <AlertTriangle size={14} className="text-red-500" />;
    }
  };

  const getStatusText = (status: ReviewRecord["status"]) => {
    switch (status) {
      case "pending": return "待分析";
      case "analyzing": return "分析中";
      case "completed": return "已完成";
      case "error": return "失败";
    }
  };

  // 渲染审查内容面板
  const renderContentPanel = () => (
    <div className="mck-card overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 flex items-center gap-2">
          <FileText size={14} />
          审查内容
        </h4>
        <button
          onClick={() => setExpandedPanel("content")}
          className="p-1.5 hover:bg-mck-bg rounded transition-colors"
          title="放大查看"
        >
          <Maximize2 size={14} className="text-mck-navy/40" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-mck-bg/30 p-4 rounded">
        <pre className="text-sm text-mck-navy/80 whitespace-pre-wrap font-sans">
          {activeRecord?.content || "暂无内容"}
        </pre>
      </div>
    </div>
  );

  // 渲染AI结果面板
  const renderResultPanel = () => (
    <div className="mck-card overflow-hidden flex flex-col h-full bg-gradient-to-br from-blue-50/30 to-white">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-mck-border">
        <h4 className="text-sm font-bold text-mck-navy flex items-center gap-2">
          <div className="w-8 h-8 bg-mck-blue/10 rounded-lg flex items-center justify-center">
            <Brain size={16} className="text-mck-blue" />
          </div>
          审查结果
        </h4>
        <div className="flex items-center gap-2">
          {activeRecord?.status === "completed" && (
            <span className={cn(
              "px-2 py-1 text-xs font-medium rounded-full",
              activeRecord.reviewConclusion === "高风险"
                ? "bg-red-100 text-red-700"
                : activeRecord.reviewConclusion === "中风险"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700",
            )}>
              已完成核验
              {activeRecord.reviewConclusion ? ` · ${activeRecord.reviewConclusion}` : ""}
              {typeof activeRecord.complianceScore === "number" ? ` · ${activeRecord.complianceScore}/100` : ""}
            </span>
          )}
          <button
            onClick={() => setExpandedPanel("result")}
            className="p-1.5 hover:bg-mck-bg rounded transition-colors"
            title="放大查看"
          >
            <Maximize2 size={14} className="text-mck-navy/40" />
          </button>
        </div>
      </div>
      
      {activeRecord?.status === "analyzing" ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={40} className="text-mck-blue animate-spin mx-auto mb-4" />
            <p className="text-mck-navy/60 mb-2">正在读取当前文件并逐项核验...</p>
            <p className="text-xs text-mck-navy/40">日期、通知、出席、表决和签署均从当前材料提取</p>
          </div>
        </div>
      ) : activeRecord?.status === "completed" ? (
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {activeRecord.aiThinking && (
            <div className="border border-mck-border rounded-lg overflow-hidden bg-white/50">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="w-full px-4 py-2 bg-mck-bg/70 flex items-center justify-between text-xs font-medium text-mck-navy/60 hover:bg-mck-bg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Brain size={12} />
                  证据核验过程
                </span>
                {showThinking ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              <AnimatePresence>
                {showThinking && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-gray-50">
                      <pre className="text-xs text-mck-navy/60 whitespace-pre-wrap font-mono leading-relaxed">
                        {activeRecord.aiThinking}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeRecord.aiResponse && (
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-mck-blue" />
                <span className="text-xs font-bold text-mck-blue">
                  当前文件审查结论
                  {activeRecord.usedFeishu ? " · 已交叉核验飞书会议" : ""}
                </span>
              </div>
              <div className="p-5">
                <div className="prose prose-sm max-w-none" style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  <div dangerouslySetInnerHTML={{ 
                    __html: activeRecord.aiResponse
                      .replace(/##\s*(.*)/g, '<h3 class="text-lg font-bold text-mck-navy mb-3 mt-0">$1</h3>')
                      .replace(/###\s*(.*)/g, '<h4 class="text-base font-bold text-mck-navy/80 mb-2 mt-4">$1</h4>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-mck-navy font-semibold">$1</strong>')
                      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono text-xs">$1</code>')
                      .replace(/>\s*(.*)/g, '<blockquote class="border-l-4 border-mck-blue pl-4 my-3 text-mck-navy/70 italic bg-blue-50/30 p-3 rounded-r">$1</blockquote>')
                      .replace(/(^|\n)-\s*(.*)/g, '<li class="ml-4 text-mck-navy/80 mb-2">$2</li>')
                      .replace(/(^|\n)(\d+)\.\s*(.*)/g, '<li class="ml-4 text-mck-navy/80 mb-2 list-decimal">$3</li>')
                      .replace(/🔴\s*(.*)/g, '<span class="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded font-bold text-sm">🔴 $1</span>')
                      .replace(/⚠️\s*(.*)/g, '<span class="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-bold text-sm">⚠️ $1</span>')
                      .replace(/✅\s*(.*)/g, '<span class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded font-bold text-sm">✅ $1</span>')
                      .replace(/\n\n/g, '</p><p class="text-mck-navy/80 mb-3">')
                      .replace(/\n/g, '<br/>')
                  }} />
                </div>
              </div>
            </div>
          )}

          {activeRecord.riskAlerts && activeRecord.riskAlerts.length > 0 && (
            <div className="border border-red-200 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-white border-b border-red-100 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs font-bold text-red-700">⚠️ 合规风险提示</span>
              </div>
              <div className="p-4 space-y-3">
                {activeRecord.riskAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 bg-red-50/50 rounded-lg">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">!</span>
                    <span className="text-sm text-mck-navy/80">{alert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeRecord?.status === "error" ? (
        <div className="flex-1 overflow-y-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 whitespace-pre-wrap">
                {activeRecord.aiResponse}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Brain size={48} className="text-mck-navy/10 mx-auto mb-4" />
            <p className="text-mck-navy/40 mb-1">审查结果将显示在这里</p>
            <p className="text-xs text-mck-navy/30">上传文件后点击"开始审查"</p>
          </div>
        </div>
      )}
    </div>
  );

  // 放大视图
  if (expandedPanel !== "none" && activeRecord) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-mck-border bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-mck-blue/10 flex items-center justify-center">
                {expandedPanel === "content" ? <FileText size={20} className="text-mck-blue" /> : <Brain size={20} className="text-mck-blue" />}
              </div>
              <div>
                <h3 className="font-medium text-mck-navy">
                  {expandedPanel === "content" ? "审查内容" : "审查结果"}
                </h3>
                <p className="text-xs text-mck-navy/40">{activeRecord.fileName}</p>
              </div>
            </div>
            <button
              onClick={() => setExpandedPanel("none")}
              className="p-2 hover:bg-mck-bg rounded-full transition-colors"
            >
              <Minimize2 size={20} className="text-mck-navy/60" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden p-6 bg-gradient-to-br from-mck-bg/30 to-white">
            {expandedPanel === "content" ? (
              <div className="h-full overflow-y-auto bg-white p-6 rounded-xl border border-mck-border max-w-4xl mx-auto shadow-sm">
                <pre className="text-base text-mck-navy/80 whitespace-pre-wrap font-sans leading-relaxed">
                  {activeRecord.content || "暂无内容"}
                </pre>
              </div>
            ) : (
              <div className="h-full overflow-y-auto space-y-6 max-w-4xl mx-auto">
                {activeRecord.aiThinking && (
                  <div className="border border-mck-border rounded-xl overflow-hidden bg-white/80">
                    <div className="px-4 py-3 bg-mck-bg/70 flex items-center gap-2">
                      <Brain size={14} />
                      <span className="text-sm font-medium text-mck-navy/70">证据核验过程</span>
                    </div>
                    <div className="p-6 bg-gray-50">
                      <pre className="text-sm text-mck-navy/70 whitespace-pre-wrap font-mono leading-relaxed">
                        {activeRecord.aiThinking}
                      </pre>
                    </div>
                  </div>
                )}

                {activeRecord.aiResponse && (
                  <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-mck-blue" />
                      <span className="text-sm font-bold text-mck-blue">
                        当前文件审查结论
                        {activeRecord.usedFeishu ? " · 已交叉核验飞书会议" : ""}
                      </span>
                    </div>
                    <div className="p-6">
                      <div className="prose prose-sm max-w-none" style={{ fontSize: '15px', lineHeight: '1.9' }}>
                        <div dangerouslySetInnerHTML={{ 
                          __html: activeRecord.aiResponse
                            .replace(/##\s*(.*)/g, '<h2 class="text-xl font-bold text-mck-navy mb-4 mt-0">$1</h2>')
                            .replace(/###\s*(.*)/g, '<h3 class="text-lg font-bold text-mck-navy/80 mb-3 mt-6">$1</h3>')
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-mck-navy font-semibold">$1</strong>')
                            .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono text-sm">$1</code>')
                            .replace(/>\s*(.*)/g, '<blockquote class="border-l-4 border-mck-blue pl-4 my-3 text-mck-navy/70 italic bg-blue-50/30 p-3 rounded-r">$1</blockquote>')
                            .replace(/(^|\n)-\s*(.*)/g, '<li class="ml-6 text-mck-navy/80 mb-2">$2</li>')
                            .replace(/(^|\n)(\d+)\.\s*(.*)/g, '<li class="ml-6 text-mck-navy/80 mb-2 list-decimal">$3</li>')
                            .replace(/🔴\s*(.*)/g, '<span class="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded font-bold">🔴 $1</span>')
                            .replace(/⚠️\s*(.*)/g, '<span class="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-bold">⚠️ $1</span>')
                            .replace(/✅\s*(.*)/g, '<span class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded font-bold">✅ $1</span>')
                            .replace(/\n\n/g, '</p><p class="text-mck-navy/80 mb-4 leading-relaxed">')
                            .replace(/\n/g, '<br/>')
                        }} />
                      </div>
                    </div>
                  </div>
                )}

                {activeRecord.riskAlerts && activeRecord.riskAlerts.length > 0 && (
                  <div className="border border-red-200 rounded-xl overflow-hidden bg-white">
                    <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-white border-b border-red-100 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500" />
                      <span className="text-sm font-bold text-red-700">⚠️ 合规风险提示</span>
                    </div>
                    <div className="p-6 space-y-3">
                      {activeRecord.riskAlerts.map((alert, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-red-50/50 rounded-lg">
                          <span className="text-red-500 mt-0.5 flex-shrink-0 font-bold">!</span>
                          <span className="text-base text-mck-navy/80">{alert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 正常视图 - 可拖动调整大小的三栏布局
  const resultPanelWidth = 100 - leftPanelWidth - contentPanelWidth;

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      <header>
        <h2 className="text-3xl font-serif font-bold text-mck-navy">合规审查</h2>
        <p className="text-xs text-mck-navy/40 mt-1">拖动各板块边缘可调整宽度</p>
      </header>

      <div 
        ref={containerRef}
        className="flex-1 flex gap-0 min-h-0"
      >
        {/* 左侧面板：上传 + 历史记录 */}
        <div 
          className="flex flex-col gap-4 h-full overflow-hidden"
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Upload Area */}
          <div className="mck-card flex-shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-4 flex items-center gap-2">
              <Upload size={14} />
              上传文件审查
            </h3>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.doc,.docx,.md,.pdf,.html"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={triggerFileUpload}
                disabled={isUploading}
                className="py-4 border-2 border-dashed border-mck-border hover:border-mck-blue hover:bg-mck-blue/5 transition-all flex flex-col items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={20} className="text-mck-blue animate-spin" />
                    <span className="text-[10px] text-mck-navy/60">上传中</span>
                  </>
                ) : (
                  <>
                    <Upload size={20} className="text-mck-navy/40" />
                    <span className="text-[10px] text-mck-navy/60">本地文件</span>
                  </>
                )}
              </button>
              <button
                onClick={loadDocsFromDocCenter}
                className="py-4 border-2 border-dashed border-mck-border hover:border-mck-blue hover:bg-mck-blue/5 transition-all flex flex-col items-center gap-2"
              >
                <FileText size={20} className="text-mck-navy/40" />
                <span className="text-[10px] text-mck-navy/60">文书中心</span>
              </button>
            </div>

            {uploadError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded">
                {uploadError}
              </div>
            )}
          </div>

          {/* History List */}
          <div className="mck-card flex-1 overflow-hidden flex flex-col min-h-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-4 flex items-center justify-between flex-shrink-0">
              <span className="flex items-center gap-2">
                <Clock size={14} />
                审查历史
              </span>
              <span className="bg-mck-bg px-2 py-0.5 rounded-full text-[10px]">{records.length}</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {records.length === 0 ? (
                <div className="text-center py-6 text-mck-navy/40 text-sm">
                  暂无审查记录
                </div>
              ) : (
                records.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => setActiveRecord(record)}
                    className={cn(
                      "p-2 border cursor-pointer transition-all group relative",
                      activeRecord?.id === record.id 
                        ? "border-mck-blue bg-mck-blue/5" 
                        : "border-mck-border hover:border-mck-blue/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={12} className="text-mck-navy/40 flex-shrink-0" />
                          <span className="text-xs font-medium text-mck-navy truncate">
                            {record.fileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-mck-navy/40">
                          {getStatusIcon(record.status)}
                          <span>{getStatusText(record.status)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteRecord(record.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                      >
                        <X size={12} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 第一个拖动分隔条 */}
        <ResizeHandle 
          direction="horizontal" 
          onMouseDown={(e) => handleResizeStart('left', e)} 
        />

        {/* 中间面板：审查内容 */}
        <div 
          className="h-full overflow-hidden"
          style={{ width: `${contentPanelWidth}%` }}
        >
          {!activeRecord ? (
            <div className="h-full flex items-center justify-center mck-card">
              <div className="text-center">
                <ShieldCheck size={32} className="text-mck-navy/20 mx-auto mb-3" />
                <p className="text-sm text-mck-navy/40">选择文件查看内容</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2">
              {/* File Info Header */}
              <div className="mck-card py-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-mck-blue/10 flex items-center justify-center">
                      <FileText size={16} className="text-mck-blue" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-mck-navy truncate max-w-[150px]">{activeRecord.fileName}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-mck-navy/40">
                        {getStatusIcon(activeRecord.status)}
                        <span>{getStatusText(activeRecord.status)}</span>
                      </div>
                    </div>
                  </div>
                  {activeRecord.status === "pending" && (
                    <button
                      onClick={() => startAnalysis(activeRecord)}
                      disabled={isAnalyzing}
                      className="px-3 py-1.5 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                    >
                      {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                      审查
                    </button>
                  )}
                </div>
              </div>

              {/* Content Panel */}
              <div className="flex-1 overflow-hidden min-h-0">
                {renderContentPanel()}
              </div>
            </div>
          )}
        </div>

        {/* 第二个拖动分隔条 */}
        <ResizeHandle 
          direction="horizontal" 
          onMouseDown={(e) => handleResizeStart('content', e)} 
        />

        {/* 右侧面板：审查结果 */}
        <div 
          className="h-full overflow-hidden"
          style={{ width: `${resultPanelWidth}%` }}
        >
          {renderResultPanel()}
        </div>
      </div>

      {/* 从文书中心选择文档弹窗 */}
      {showDocCenterSelect && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-mck-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-mck-blue/10 flex items-center justify-center">
                  <FileText size={20} className="text-mck-blue" />
                </div>
                <div>
                  <h3 className="font-medium text-mck-navy">从文书中心选择文档</h3>
                  <p className="text-[10px] text-mck-navy/40">选择要审查的文书</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDocCenterSelect(false)}
                className="p-2 hover:bg-mck-bg rounded-full"
              >
                <X size={20} className="text-mck-navy/60" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {docCenterDocs.length === 0 ? (
                <div className="text-center py-8 text-mck-navy/40">
                  <FileText size={48} className="mx-auto mb-2" />
                  <p className="text-sm">文书中心暂无文书</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 按会议分组显示 */}
                  {Object.entries(
                    docCenterDocs.reduce((acc: Record<string, typeof docCenterDocs>, doc) => {
                      const meeting = doc.meetingTitle || '未分组';
                      if (!acc[meeting]) acc[meeting] = [];
                      acc[meeting].push(doc);
                      return acc;
                    }, {})
                  ).map(([meetingTitle, docs]) => (
                    <div key={meetingTitle} className="border border-mck-border rounded">
                      <div className="px-3 py-2 bg-mck-navy text-white rounded-t">
                        <span className="text-xs font-bold">{meetingTitle}</span>
                      </div>
                      <div className="divide-y divide-mck-border/30">
                        {docs.map(doc => (
                          <div 
                            key={doc.id}
                            className="flex items-center justify-between px-3 py-2 hover:bg-mck-bg/30 cursor-pointer"
                            onClick={() => selectDocFromCenter(doc)}
                          >
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-mck-blue" />
                              <span className="text-sm text-mck-navy">{doc.name}</span>
                            </div>
                            <button className="px-3 py-1 bg-mck-blue/10 text-mck-blue text-[10px] rounded hover:bg-mck-blue/20">
                              选择
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
