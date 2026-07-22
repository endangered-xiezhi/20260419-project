export type MeetingType = "股东会" | "董事会" | "监事会" | "临时股东会";

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  date: string;
  status: "筹备中" | "进行中" | "已结束";
  complianceScore: number;
  notifiedDays: number;
  participants?: string[];
  threshold?: string;
  nature?: "定期" | "临时";
  startTime?: string;
  location?: string;
  noticeDate?: string;
  meetingMode?: "现场" | "视频" | "通讯" | "现场加通讯" | "其他";
  votingMethod?: "现场投票" | "通讯表决" | "举手表决" | "其他";
  expectedAttendance?: number;
  actualAttendance?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
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
  category: "法律法规" | "公司内部规范性文件" | "规章制度" | "监管问答";
  content: string;
  lastModified: string;
  status: "已生效" | "草案";
  filePath?: string;
  fileName?: string;
  fullContent?: string;
  /** 静态资源路径，全文按需 fetch（OCR 批量导入） */
  ocrSourceUrl?: string;
  isImportedRegulation?: boolean;
  originalRegulation?: {
    id: string;
    name: string;
    typeName: string;
    content: string;
    date: string;
  };
}

export interface Personnel {
  id: string;
  name: string;
  role: "董事长" | "董事" | "独立董事" | "监事" | "董事会秘书" | "总经理" | "副总经理" | "财务负责人" | "法务" | "法务负责人" | "无" | "法人股东" | "自然人股东";
  organization: "董事会" | "监事会" | "管理层" | "法务部" | "无" | "股东";
  isShareholder?: boolean; // 是否股东
  shares?: number; // 持股数量（股）
  shareholding?: number; // 股权占比，百分比
  votingRights?: number; // 股东会表决权，百分比
  termStart?: string;
  termEnd?: string;
  isIndependent?: boolean;
  conflictOfInterest?: string[];
  status?: "在职" | "离职" | "正常";
  phone?: string;
  email?: string;
  sortOrder?: number; // 固定排序，数值越小越靠前
}
