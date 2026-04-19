export type MeetingType = "股东会" | "董事会" | "监事会";

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  date: string;
  status: "筹备中" | "进行中" | "已结束";
  complianceScore: number;
  notifiedDays: number;
}

export interface ASRSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  role: "董事长" | "董秘" | "独立董事" | "股东代表" | "监事";
}

export interface ComplianceIssue {
  id: string;
  meetingId?: string; // Link to a specific meeting
  type: "程序性" | "实质性";
  title: string;
  description: string;
  lawReference: string;
  severity: "high" | "medium";
  status: "待处理" | "已修正" | "已豁免";
}

export interface GeneratedDocument {
  id: string;
  meetingId: string;
  title: string;
  type: "会议通知" | "会议记录" | "决议公告";
  date: string;
  status: "草稿" | "已签章";
}

export interface LegalArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  updateDate: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: "法律法规" | "公司章程" | "规章制度" | "监管问答";
  content: string;
  lastModified: string;
  status: "已生效" | "草案";
  filePath?: string;
  fileName?: string;
  fullContent?: string;
  /** 静态资源路径，全文按需 fetch（OCR 批量导入） */
  ocrSourceUrl?: string;
}

export interface Personnel {
  id: string;
  name: string;
  role: "董事长" | "董事" | "独立董事" | "监事" | "董秘" | "高管";
  organization: "董事会" | "监事会" | "管理层";
  termStart: string;
  termEnd: string;
  isIndependent: boolean;
  conflictOfInterest: string[];
  status: "在职" | "离职";
}
