import React, { useState, useEffect, useRef } from "react";
import { FileText, Upload, Loader2, Edit3, Save, Download, Mic, Clock, Trash2, FileAudio, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordingWorkspaceProps {
  meetingId?: string | null;
  onAnalysisComplete?: (meetingId: string) => void;
}

interface MeetingMinutesRecord {
  id: string;
  title: string;
  date: string;
  content: string;
  hasAudio: boolean;
  audioFileName?: string;
}

interface DocumentFormat {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  textAlign: "left" | "center" | "right" | "justify";
  titleFontSize: number;
}

const mockMeetingMinutes = `会议时间：2026年3月31日 10:00
会议地点：公司会议室
主持人：王董事长
记录人：李董秘
出席人员：王董事长、张独立董事、刘监事等

会议内容：

王董事长：各位董事，现在开始审议关于公司向银行申请5000万元授信的议案。

李董秘：该授信主要用于补充流动资金，利率为3.5%，期限一年。

张独立董事：我关注到公司目前的资产负债率已经接近65%，这次授信是否会触发重大资产重组的审批程序？

刘监事：监事会已对该议案进行预审，认为程序符合公司章程。`;

const STORAGE_KEY = "corporate_meeting_minutes_records";

const fontOptions = [
  { value: "SimSun, '宋体', serif", label: "宋体" },
  { value: "SimHei, '黑体', sans-serif", label: "黑体" },
  { value: "'Microsoft YaHei', '微软雅黑', sans-serif", label: "微软雅黑" },
  { value: "'KaiTi', '楷体', serif", label: "楷体" },
  { value: "'FangSong', '仿宋', serif", label: "仿宋" },
];

export const RecordingWorkspace: React.FC<RecordingWorkspaceProps> = ({ meetingId, onAnalysisComplete }) => {
  const [records, setRecords] = useState<MeetingMinutesRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentRecord, setCurrentRecord] = useState<MeetingMinutesRecord | null>(null);
  const [meetingContent, setMeetingContent] = useState<string>(mockMeetingMinutes);
  const [meetingTitle, setMeetingTitle] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<"editor" | "preview" | null>(null);
  
  const [docFormat, setDocFormat] = useState<DocumentFormat>({
    fontSize: 14,
    lineHeight: 1.8,
    fontFamily: "SimSun, '宋体', serif",
    textAlign: "justify",
    titleFontSize: 22,
  });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const createNewRecord = () => {
    const newRecord: MeetingMinutesRecord = {
      id: Date.now().toString(),
      title: `会议纪要 - ${new Date().toLocaleString('zh-CN')}`,
      date: new Date().toISOString(),
      content: mockMeetingMinutes,
      hasAudio: false,
    };
    setRecords(prev => [newRecord, ...prev]);
    setCurrentRecord(newRecord);
    setMeetingContent(newRecord.content);
    setMeetingTitle(newRecord.title);
    setIsEditing(true);
  };

  const selectRecord = (record: MeetingMinutesRecord) => {
    setCurrentRecord(record);
    setMeetingContent(record.content);
    setMeetingTitle(record.title);
    setIsEditing(false);
  };

  const deleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecords(prev => prev.filter(r => r.id !== id));
    if (currentRecord?.id === id) {
      setCurrentRecord(null);
      setMeetingContent(mockMeetingMinutes);
      setMeetingTitle("");
    }
  };

  const handleSaveContent = () => {
    setIsEditing(false);
    if (currentRecord) {
      const updatedRecord = { ...currentRecord, content: meetingContent, title: meetingTitle || currentRecord.title };
      setCurrentRecord(updatedRecord);
      setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    } else {
      const newRecord: MeetingMinutesRecord = {
        id: Date.now().toString(),
        title: meetingTitle || `会议纪要 - ${new Date().toLocaleString('zh-CN')}`,
        date: new Date().toISOString(),
        content: meetingContent,
        hasAudio: false,
      };
      setRecords(prev => [newRecord, ...prev]);
      setCurrentRecord(newRecord);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 20, 90));
      }, 100);

      const text = await file.text();
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      setMeetingContent(text);
      setIsEditing(true);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("文件读取失败:", error);
      setUploadError(error.message || "文件读取失败，请重试");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      const mockTranscription = `【语音识别结果 - ${file.name}】\n\n${mockMeetingMinutes}`;
      setMeetingContent(mockTranscription);
      
      if (currentRecord) {
        const updatedRecord = { 
          ...currentRecord, 
          content: mockTranscription,
          hasAudio: true,
          audioFileName: file.name
        };
        setCurrentRecord(updatedRecord);
        setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
      } else {
        const newRecord: MeetingMinutesRecord = {
          id: Date.now().toString(),
          title: `会议纪要 - ${new Date().toLocaleString('zh-CN')}`,
          date: new Date().toISOString(),
          content: mockTranscription,
          hasAudio: true,
          audioFileName: file.name
        };
        setRecords(prev => [newRecord, ...prev]);
        setCurrentRecord(newRecord);
      }
      
      setIsEditing(true);
      
      if (audioInputRef.current) {
        audioInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("音频处理失败:", error);
      setUploadError(error.message || "音频处理失败，请重试");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerAudioUpload = () => {
    audioInputRef.current?.click();
  };

  const exportToWord = () => {
    const content = meetingContent;
    const title = meetingTitle || "会议纪要";
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 2.54cm; }
    body { 
      font-family: ${docFormat.fontFamily}; 
      font-size: ${docFormat.fontSize}pt; 
      line-height: ${docFormat.lineHeight}; 
      text-align: ${docFormat.textAlign};
    }
    .title { 
      font-size: ${docFormat.titleFontSize}pt; 
      font-weight: bold; 
      text-align: center; 
      margin-bottom: 24pt; 
      font-family: SimHei, '黑体', sans-serif;
    }
    .content { white-space: pre-wrap; }
    p { margin: 0 0 12pt 0; text-indent: 2em; }
    .header { text-indent: 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="title">${title}</div>
  <div class="content">${content.replace(/\n/g, '</p><p>')}</div>
</body>
</html>`;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 渲染编辑器内容
  const renderEditor = () => (
    <div className="flex flex-col h-[400px] max-w-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-serif font-bold flex items-center gap-2">
            <FileText size={18} className="text-mck-blue" />
            会议纪要
          </h3>
          {currentRecord?.hasAudio && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-[10px] rounded-full flex items-center gap-1">
              <Mic size={10} />
              含录音
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {expandedPanel !== "editor" && (
            <button
              onClick={() => setExpandedPanel("editor")}
              className="p-1.5 text-mck-navy/60 hover:text-mck-blue hover:bg-mck-bg rounded transition-all"
              title="放大"
            >
              <Maximize2 size={16} />
            </button>
          )}
          
          <input ref={audioInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.wma,.flac,.mp4,.webm" onChange={handleAudioUpload} className="hidden" />
          <button onClick={triggerAudioUpload} disabled={isUploading} className="px-2.5 py-1.5 text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1 rounded">
            {isUploading ? <><Loader2 size={10} className="animate-spin" />{uploadProgress}%</> : <><Mic size={10} />录音</>}
          </button>

          <input ref={fileInputRef} type="file" accept=".txt,.doc,.docx,.md,.pdf" onChange={handleFileUpload} className="hidden" />
          <button onClick={triggerFileUpload} disabled={isUploading} className="px-2.5 py-1.5 text-xs font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 rounded">
            <Upload size={10} />文稿
          </button>

          <button onClick={() => isEditing ? handleSaveContent() : setIsEditing(true)} disabled={isUploading} className={cn("px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 rounded", isEditing ? "bg-mck-blue text-white" : "bg-mck-navy text-white")}>
            {isEditing ? <Save size={10} /> : <Edit3 size={10} />}
            {isEditing ? "保存" : "编辑"}
          </button>
        </div>
      </div>

      <div className="mb-3 flex-shrink-0">
        <input type="text" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} placeholder="输入会议纪要标题..." className="w-full px-3 py-2 text-sm font-bold text-mck-navy bg-mck-bg/30 border border-mck-border rounded focus:outline-none focus:border-mck-blue" readOnly={!isEditing} />
      </div>

      {uploadError && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex-shrink-0">{uploadError}</div>}

      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          <textarea ref={textareaRef} value={meetingContent} onChange={(e) => setMeetingContent(e.target.value)} className="w-full h-[300px] p-4 text-sm leading-relaxed text-mck-navy/80 bg-mck-bg/30 border border-mck-border rounded resize-none focus:outline-none focus:border-mck-blue font-sans" placeholder="在此输入或编辑会议纪要..." />
        ) : (
          <div className="w-full h-[300px] p-4 overflow-y-auto bg-mck-bg/20 rounded">
            <pre className="text-sm leading-relaxed text-mck-navy/80 whitespace-pre-wrap font-sans">{meetingContent}</pre>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染预览内容
  const renderPreview = () => (
    <div className="flex flex-col h-[400px] max-w-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-base font-serif font-bold flex items-center gap-2">
          <FileText size={18} className="text-mck-blue" />
          Word 预览
        </h3>
        <div className="flex items-center gap-2">
          {expandedPanel !== "preview" && (
            <button
              onClick={() => setExpandedPanel("preview")}
              className="p-1.5 text-mck-navy/60 hover:text-mck-blue hover:bg-mck-bg rounded transition-all"
              title="放大"
            >
              <Maximize2 size={16} />
            </button>
          )}
          <button onClick={exportToWord} className="px-3 py-1.5 text-xs font-bold bg-mck-blue text-white hover:bg-mck-navy flex items-center gap-1.5 rounded">
            <Download size={12} />导出
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-mck-bg/30 rounded flex-shrink-0">
        <select value={docFormat.fontFamily} onChange={(e) => setDocFormat(prev => ({ ...prev, fontFamily: e.target.value }))} className="text-xs px-2 py-1 border border-mck-border rounded bg-white">
          {fontOptions.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}
        </select>

        <div className="flex items-center gap-1">
          <span className="text-xs text-mck-navy/60">字号</span>
          <input type="range" min={10} max={18} step={0.5} value={docFormat.fontSize} onChange={(e) => setDocFormat(prev => ({ ...prev, fontSize: parseFloat(e.target.value) }))} className="w-16" />
          <span className="text-xs text-mck-navy/80 w-6">{docFormat.fontSize}</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-mck-navy/60">行距</span>
          <input type="range" min={1} max={3} step={0.1} value={docFormat.lineHeight} onChange={(e) => setDocFormat(prev => ({ ...prev, lineHeight: parseFloat(e.target.value) }))} className="w-16" />
          <span className="text-xs text-mck-navy/80 w-6">{docFormat.lineHeight}</span>
        </div>

        <div className="flex items-center gap-1 border-l border-mck-border pl-2">
          {[{ key: "left", icon: AlignLeft }, { key: "center", icon: AlignCenter }, { key: "right", icon: AlignRight }, { key: "justify", icon: AlignJustify }].map(({ key, icon: Icon }) => (
            <button key={key} onClick={() => setDocFormat(prev => ({ ...prev, textAlign: key as any }))} className={cn("p-1 rounded transition-colors", docFormat.textAlign === key ? "bg-mck-blue text-white" : "text-mck-navy/60 hover:bg-mck-bg")}>
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-100 border border-mck-border rounded">
        <div className="h-[300px] overflow-y-auto p-4">
          <div className="bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '25.4mm', boxSizing: 'border-box' }}>
            <div className="border-b border-gray-300 pb-4 mb-6">
              <p className="text-xs text-gray-400 text-center">智理科技股份有限公司</p>
            </div>

            <h1 className="font-bold text-center mb-8 text-black" style={{ fontSize: `${docFormat.titleFontSize}pt`, fontFamily: "SimHei, '黑体', sans-serif", lineHeight: 1.4 }}>
              {meetingTitle || "会议纪要"}
            </h1>

            <div className="text-black" style={{ fontSize: `${docFormat.fontSize}pt`, lineHeight: docFormat.lineHeight, fontFamily: docFormat.fontFamily, textAlign: docFormat.textAlign }}>
              {meetingContent.split('\n').map((line, index) => {
                const isHeader = line.match(/^(会议时间|会议地点|主持人|记录人|出席人员|会议内容)：/);
                const isSpeaker = line.match(/^([^：:]+)[：:]/);
                
                if (!line.trim()) return <div key={index} style={{ height: `${docFormat.fontSize * docFormat.lineHeight * 0.5}pt` }} />;
                
                if (isHeader) return <p key={index} className="font-bold mb-2" style={{ fontFamily: "SimHei, '黑体', sans-serif", textIndent: 0 }}>{line}</p>;
                
                if (isSpeaker && !line.startsWith('会议')) {
                  const [speaker, ...contentParts] = line.split(/[：:]/);
                  const content = contentParts.join('：');
                  return <p key={index} className="mb-3" style={{ textIndent: 0 }}><span className="font-bold" style={{ fontFamily: "SimHei, '黑体', sans-serif" }}>{speaker}：</span>{content}</p>;
                }
                
                return <p key={index} className="mb-3" style={{ textIndent: `${docFormat.fontSize * 2}pt` }}>{line}</p>;
              })}
            </div>

            <div className="border-t border-gray-300 pt-4 mt-12">
              <p className="text-xs text-gray-400 text-center">生成时间：{new Date().toLocaleString('zh-CN')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Expanded Panel Overlay */}
      {expandedPanel && (
        <div className="fixed inset-0 z-50 bg-white p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-bold text-mck-navy">
              {expandedPanel === "editor" ? "会议纪要" : "Word 预览"}
            </h2>
            <button
              onClick={() => setExpandedPanel(null)}
              className="p-2 text-mck-navy/60 hover:text-mck-red hover:bg-red-50 rounded-full transition-all"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {expandedPanel === "editor" ? renderEditor() : renderPreview()}
          </div>
        </div>
      )}

      {/* Normal Layout — 与合规审查、规则文件库等板块的 1/4 侧栏比例一致 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar: History Records */}
        <div className="lg:col-span-1 mck-card overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-mck-navy/60 flex items-center gap-2">
              <Clock size={14} />历史记录
            </h3>
            <button onClick={createNewRecord} className="px-2 py-1 text-xs font-bold bg-mck-blue text-white hover:bg-mck-navy transition-all rounded">+ 新建</button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {records.length === 0 ? (
              <div className="text-center py-8 text-mck-navy/40 text-xs">
                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                <p>暂无会议纪要</p>
              </div>
            ) : (
              records.map((record) => (
                <div
                  key={record.id}
                  onClick={() => selectRecord(record)}
                  className={cn("p-3 rounded cursor-pointer transition-all group relative border", currentRecord?.id === record.id ? "bg-mck-blue/10 border-mck-blue/50" : "bg-white border-mck-border hover:border-mck-blue/30")}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn("w-8 h-8 rounded flex items-center justify-center flex-shrink-0", record.hasAudio ? "bg-purple-100 text-purple-600" : "bg-mck-bg text-mck-navy/60")}>
                      {record.hasAudio ? <FileAudio size={16} /> : <FileText size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-mck-navy truncate pr-5">{record.title}</p>
                      <p className="text-[10px] text-mck-navy/50 mt-1">{formatDate(record.date)}</p>
                      {record.audioFileName && <p className="text-[10px] text-purple-500 truncate">🎤 {record.audioFileName}</p>}
                    </div>
                  </div>
                  <button onClick={(e) => deleteRecord(record.id, e)} className="absolute top-2 right-2 p-1 text-mck-navy/20 hover:text-mck-red opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content: Editor + Preview */}
        <div className="lg:col-span-3 flex gap-4 min-w-0">
          {/* Editor */}
          <div className="flex-1 mck-card overflow-hidden">
            {renderEditor()}
          </div>

          {/* Preview */}
          <div className="flex-1 mck-card overflow-hidden">
            {renderPreview()}
          </div>
        </div>
      </div>
    </div>
  );
};
