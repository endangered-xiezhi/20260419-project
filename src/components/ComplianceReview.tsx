import React, { useState, useEffect, useRef } from "react";
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
}

interface ComplianceReviewProps {
  meetingId?: string | null;
  onGenerateDocuments?: (id: string) => void;
}

export const ComplianceReview: React.FC<ComplianceReviewProps> = ({ meetingId, onGenerateDocuments }) => {
  const [records, setRecords] = useState<ReviewRecord[]>(() => {
    const saved = localStorage.getItem("corporate_compliance_records");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeRecord, setActiveRecord] = useState<ReviewRecord | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const [expandedPanel, setExpandedPanel] = useState<"none" | "content" | "result">("none");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("corporate_compliance_records", JSON.stringify(records));
  }, [records]);

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

      const text = await file.text();
      
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

  const startAnalysis = async (record: ReviewRecord) => {
    setIsAnalyzing(true);
    
    setRecords(prev => prev.map(r => 
      r.id === record.id ? { ...r, status: "analyzing" } : r
    ));
    setActiveRecord(prev => prev?.id === record.id ? { ...prev, status: "analyzing" } : prev);

    setTimeout(() => {
      const thinkingProcess = `正在分析文件内容...
识别文档类型：会议记录
提取关键信息：
- 会议类型：临时股东大会
- 通知时间：2026年3月20日
- 会议时间：2026年3月31日
- 间隔天数：11天

对照法规库检索...
发现潜在问题：《公司法》第111条规定临时股东大会应提前15日通知

生成合规建议...`;

      const aiResponse = `## 合规审查结果

### 问题识别
根据《中华人民共和国公司法》(2024修订) 第一百一十一条规定：
> "召开临时股东大会会议，应当将会议召开的时间、地点和审议的事项于会议召开十五日前通知各股东。"

经审查，本次会议通知时间为2026年3月20日，会议召开时间为2026年3月31日，**间隔仅为11天**，未达到法定15日期限。

### 风险等级
🔴 **高风险** - 程序性违规

### 修正建议
1. **方案一（推荐）**：将会议日期顺延至2026年4月5日之后，确保满足15日通知期
2. **方案二**：通过电子投票系统获取全体股东对缩短通知期的书面豁免函
3. **方案三**：改为召开董事会会议审议该事项（如权限允许）

### 相关法规
- 《公司法》第111条
- 《上市公司股东大会规则》第15条

### 操作建议
建议立即采取补救措施，避免后续决议被质疑效力。`;

      const riskAlerts = [
        "程序性风险：通知期限不足，可能导致决议效力瑕疵",
        "诉讼风险：股东可能以此为由提起撤销之诉",
        "监管风险：可能被监管部门关注并要求整改"
      ];

      const updatedRecord: ReviewRecord = {
        ...record,
        status: "completed",
        aiThinking: thinkingProcess,
        aiResponse: aiResponse,
        riskAlerts: riskAlerts
      };

      setRecords(prev => prev.map(r => 
        r.id === record.id ? updatedRecord : r
      ));
      setActiveRecord(updatedRecord);
      setIsAnalyzing(false);
    }, 3000);
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
      case "pending":
        return <Clock size={14} className="text-orange-500" />;
      case "analyzing":
        return <Loader2 size={14} className="text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle2 size={14} className="text-green-500" />;
      case "error":
        return <AlertTriangle size={14} className="text-red-500" />;
    }
  };

  const getStatusText = (status: ReviewRecord["status"]) => {
    switch (status) {
      case "pending":
        return "待分析";
      case "analyzing":
        return "分析中";
      case "completed":
        return "已完成";
      case "error":
        return "失败";
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
    <div className="mck-card overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 flex items-center gap-2">
          <Brain size={14} />
          AI 审查结果
        </h4>
        <button
          onClick={() => setExpandedPanel("result")}
          className="p-1.5 hover:bg-mck-bg rounded transition-colors"
          title="放大查看"
        >
          <Maximize2 size={14} className="text-mck-navy/40" />
        </button>
      </div>
      
      {activeRecord?.status === "analyzing" ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={32} className="text-mck-blue animate-spin mx-auto mb-4" />
            <p className="text-mck-navy/60">AI 正在分析中...</p>
          </div>
        </div>
      ) : activeRecord?.status === "completed" ? (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeRecord.aiThinking && (
            <div className="border border-mck-border rounded overflow-hidden">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="w-full px-4 py-2 bg-mck-bg/50 flex items-center justify-between text-xs font-medium text-mck-navy/60 hover:bg-mck-bg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Brain size={12} />
                  思考过程
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
                      <pre className="text-xs text-mck-navy/60 whitespace-pre-wrap font-mono">
                        {activeRecord.aiThinking}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeRecord.aiResponse && (
            <div className="prose prose-sm max-w-none">
              <div className="bg-blue-50/50 p-4 rounded border border-blue-100">
                <div dangerouslySetInnerHTML={{ 
                  __html: activeRecord.aiResponse
                  .replace(/## (.*)/g, '<h3 class="text-lg font-bold text-mck-navy mb-3">$1</h3>')
                  .replace(/### (.*)/g, '<h4 class="text-sm font-bold text-mck-navy/80 mb-2 mt-4">$1</h4>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/> (.*)/g, '<blockquote class="border-l-4 border-mck-blue pl-3 my-2 text-mck-navy/70 italic">$1</blockquote>')
                  .replace(/- (.*)/g, '<li class="ml-4 text-sm text-mck-navy/80">$1</li>')
                  .replace(/🔴 (.*)/g, '<span class="text-red-600 font-bold">🔴 $1</span>')
                  .replace(/\n\n/g, '</p><p class="text-sm text-mck-navy/80 my-2">')
                }} />
              </div>
            </div>
          )}

          {activeRecord.riskAlerts && activeRecord.riskAlerts.length > 0 && (
            <div className="border border-red-200 rounded overflow-hidden">
              <div className="px-4 py-2 bg-red-50 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs font-bold text-red-700">合规风险提示</span>
              </div>
              <div className="p-4 space-y-2">
                {activeRecord.riskAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span className="text-sm text-mck-navy/80">{alert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-mck-navy/40">点击"开始审查"启动 AI 分析</p>
        </div>
      )}
    </div>
  );

  // 放大视图
  if (expandedPanel !== "none" && activeRecord) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-mck-border bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-mck-blue/10 flex items-center justify-center">
                {expandedPanel === "content" ? <FileText size={20} className="text-mck-blue" /> : <Brain size={20} className="text-mck-blue" />}
              </div>
              <div>
                <h3 className="font-medium text-mck-navy">
                  {expandedPanel === "content" ? "审查内容" : "AI 审查结果"}
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

          {/* Content */}
          <div className="flex-1 overflow-hidden p-6">
            {expandedPanel === "content" ? (
              <div className="h-full overflow-y-auto bg-mck-bg/30 p-6 rounded max-w-4xl mx-auto">
                <pre className="text-base text-mck-navy/80 whitespace-pre-wrap font-sans leading-relaxed">
                  {activeRecord.content || "暂无内容"}
                </pre>
              </div>
            ) : (
              <div className="h-full overflow-y-auto space-y-6 max-w-4xl mx-auto">
                {activeRecord.aiThinking && (
                  <div className="border border-mck-border rounded overflow-hidden">
                    <div className="px-4 py-3 bg-mck-bg/50 flex items-center gap-2">
                      <Brain size={14} />
                      <span className="text-sm font-medium text-mck-navy/70">思考过程</span>
                    </div>
                    <div className="p-6 bg-gray-50">
                      <pre className="text-sm text-mck-navy/70 whitespace-pre-wrap font-mono leading-relaxed">
                        {activeRecord.aiThinking}
                      </pre>
                    </div>
                  </div>
                )}

                {activeRecord.aiResponse && (
                  <div className="bg-blue-50/50 p-6 rounded border border-blue-100">
                    <div dangerouslySetInnerHTML={{ 
                      __html: activeRecord.aiResponse
                      .replace(/## (.*)/g, '<h2 class="text-xl font-bold text-mck-navy mb-4">$1</h2>')
                      .replace(/### (.*)/g, '<h3 class="text-lg font-bold text-mck-navy/80 mb-3 mt-6">$1</h3>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/> (.*)/g, '<blockquote class="border-l-4 border-mck-blue pl-4 my-3 text-mck-navy/70 italic bg-white/50 p-3 rounded">$1</blockquote>')
                      .replace(/- (.*)/g, '<li class="ml-6 text-base text-mck-navy/80 mb-1">$1</li>')
                      .replace(/🔴 (.*)/g, '<span class="text-red-600 font-bold text-lg">🔴 $1</span>')
                      .replace(/\n\n/g, '</p><p class="text-base text-mck-navy/80 my-3 leading-relaxed">')
                    }} />
                  </div>
                )}

                {activeRecord.riskAlerts && activeRecord.riskAlerts.length > 0 && (
                  <div className="border border-red-200 rounded overflow-hidden">
                    <div className="px-4 py-3 bg-red-50 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500" />
                      <span className="text-sm font-bold text-red-700">合规风险提示</span>
                    </div>
                    <div className="p-6 space-y-3">
                      {activeRecord.riskAlerts.map((alert, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <span className="text-red-500 mt-1">•</span>
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

  // 正常视图
  return (
    <div className="space-y-6 h-[calc(100vh-120px)]">
      <header>
        <h2 className="text-3xl font-serif font-bold text-mck-navy">合规审查</h2>
        <p className="text-mck-navy/60 mt-1">AI 驱动的合规风险识别与建议</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100%-80px)]">
        {/* Left: Upload & History */}
        <div className="lg:col-span-1 flex flex-col gap-4 h-full">
          {/* Upload Area */}
          <div className="mck-card">
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
            
            <button
              onClick={triggerFileUpload}
              disabled={isUploading}
              className="w-full py-8 border-2 border-dashed border-mck-border hover:border-mck-blue hover:bg-mck-blue/5 transition-all flex flex-col items-center gap-3 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 size={24} className="text-mck-blue animate-spin" />
                  <span className="text-sm text-mck-navy/60">上传中 {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-mck-navy/40" />
                  <span className="text-sm text-mck-navy/60">点击上传会议文件</span>
                  <span className="text-[10px] text-mck-navy/40">支持 PDF, Word, TXT, Markdown</span>
                </>
              )}
            </button>

            {uploadError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded">
                {uploadError}
              </div>
            )}
          </div>

          {/* History List */}
          <div className="mck-card flex-1 overflow-hidden flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock size={14} />
                审查历史
              </span>
              <span className="bg-mck-bg px-2 py-0.5 rounded-full text-[10px]">{records.length}</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {records.length === 0 ? (
                <div className="text-center py-8 text-mck-navy/40 text-sm">
                  暂无审查记录
                </div>
              ) : (
                records.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => setActiveRecord(record)}
                    className={cn(
                      "p-3 border cursor-pointer transition-all group relative",
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
                          <span>·</span>
                          <span>{record.uploadTime}</span>
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

        {/* Right: Review Content */}
        <div className="lg:col-span-3 h-full overflow-hidden">
          {!activeRecord ? (
            <div className="h-full flex items-center justify-center mck-card">
              <div className="text-center">
                <ShieldCheck size={48} className="text-mck-navy/20 mx-auto mb-4" />
                <p className="text-mck-navy/40">请上传文件或选择历史记录开始审查</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-4">
              {/* File Info Header */}
              <div className="mck-card py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-mck-blue/10 flex items-center justify-center">
                      <FileText size={20} className="text-mck-blue" />
                    </div>
                    <div>
                      <h3 className="font-medium text-mck-navy">{activeRecord.fileName}</h3>
                      <div className="flex items-center gap-3 text-xs text-mck-navy/40 mt-0.5">
                        <span>{activeRecord.uploadTime}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(activeRecord.status)}
                          {getStatusText(activeRecord.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {activeRecord.status === "pending" && (
                    <button
                      onClick={() => startAnalysis(activeRecord)}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                      开始审查
                    </button>
                  )}
                </div>
              </div>

              {/* Analysis Content - Side by Side */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
                {renderContentPanel()}
                {renderResultPanel()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
