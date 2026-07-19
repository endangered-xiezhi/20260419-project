import React, { useState, useMemo, useEffect, useRef } from "react";
import { FileText, Download, Printer, Check, Edit3, Save, X, FileCheck, Plus, ChevronDown, ChevronRight, FolderOpen, Eye, Clock, History, Sparkles, File, Loader2, AlertCircle, Trash2, Users, Calendar, FileDown, Mail, Send, Undo2, ShieldCheck, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateWordDocument, generateRegulationWord } from "@/utils/documentGenerator";
import { downloadMeetingPackage, requestMeetingPackage, type MeetingPackageType } from "@/services/meetingPackage";
import { getMeetingFromFeishu, listMeetingsFromFeishu, type ApiMeeting } from "@/services/feishuMeetings";
import {
  createVotingDocument,
  getVotingContext,
  submitVotingOpinion,
  type VotingContext,
} from "@/services/feishuVoting";

// 一级分类类型：会议文件 / 制度文件
type DocumentLevel1Category = 'meeting' | 'regulation';
// 二级分类：会议文件(shareholder/board/supervisor) 或 制度文件
type MeetingCategory = 'shareholder' | 'board' | 'supervisor' | 'other';
type RegulationCategory = 'governance' | 'strategy' | 'finance' | 'disclosure' | 'risk' | 'management';

// 文书类型定义
interface DocumentTemplate {
  id: string;
  name: string;
}

// 制度文件模板（从文书xml/制度类目录读取）
const regulationTemplates: DocumentTemplate[] = [
  { id: 'internal_audit', name: '内部审计制度' },
  { id: 'fund_management', name: '募集资金管理制度' },
  { id: 'hedging_risk', name: '套期保值业务内部控制及风险管理制度' },
  { id: 'info_reporting', name: '对外信息报送和使用管理制度' },
  { id: 'investment', name: '对外投资管理制度' },
  { id: 'donation', name: '对外捐赠管理制度' },
  { id: 'market_cap', name: '市值管理制度' },
  { id: 'error_accountability', name: '年报信息披露重大差错责任追究制度' },
  { id: 'investor_relations', name: '投资者关系管理制度' },
  { id: 'independent_director', name: '独立董事工作制度' },
  { id: 'shares_management', name: '董事、监事、高级管理人员所持公司股份及变动管理制度' },
  { id: 'monetary_funds', name: '货币资金管理制度' },
  { id: 'controlling_shareholder', name: '防范控股股东及其关联方资金占用制度' },
  { id: 'insider_registration', name: '内幕信息知情人登记管理制度' },
];

interface GeneratedDocument {
  id: string;
  name: string;
  type: string;
  typeName: string;
  meetingTitle: string;
  meetingType?: 'shareholder' | 'board' | 'supervisor';
  level1Category: DocumentLevel1Category;
  level2Category?: MeetingCategory | RegulationCategory;
  date: string;
  content?: string;
  formData?: any;
  // 会议纪要导入专用字段
  isImportedMinutes?: boolean;
  sourceRecordId?: string;
  feishuRecordId?: string;
  syncStatus?: 'synced' | 'local';
}

// 导入的会议纪要记录类型
interface ImportedMinutesRecord {
  id: string;
  title: string;
  date: string;
  content: string;
  sourceRecordId: string;
  lastModified: string;
}

// 邮件文档类型
interface EmailDocument {
  id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderName: string;
  meetingTitle: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingLocation?: string;
  status: 'draft' | 'sent' | 'recalled';
  createdAt: string;
}

// 表单数据类型
interface VotingFormData {
  meetingDate: string;
  meetingId: string;
  meetingTitle: string;
  shareholderId: string;
  shareholderName: string;
  shares: string;
  shareholding: string;
  votingRights: string;
  proposalId: string;
  proposalNumber: string;
  proposalTitle: string;
}

interface VotingStatsFormData {
  meetingDate: string;
  meetingTime: string;
  meetingLocation: string;
  attendeeCount: string;
  totalShareholders: string;
  shareholderRatio: string;
  representedShares: string;
  votingRatio: string;
}

interface AgendaFormData {
  meetingDate: string;
  meetingTime: string;
}

interface MinutesFormData {
  meetingDate: string;
  meetingTime: string;
  hostName: string;
  recorderName: string;
  attendeeCount: string;
  totalShareholders: string;
  shareholderRatio: string;
  representedShares: string;
  votingRatio: string;
}

interface NoticeFormData {
  meetingDate: string;
  meetingTime: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  attendees: { name: string; phone: string; email: string }[];
}

interface ResolutionFormData {
  meetingDate: string;
  meetingTime: string;
  attendeeCount: string;
  totalShareholders: string;
  shareholderRatio: string;
  representedShares: string;
  votingRatio: string;
  resolutionContent: string;
}

interface SigninFormData {
  meetingDate: string;
}

interface ProxyFormData {
  principalName: string;
  principalId: string;
  agentName: string;
  agentId: string;
  proxyDate: string;
}

interface ProposalFormData {
  proposalId: string;
  proposalName: string;
  revenue: string;
  netProfit: string;
  totalAssets: string;
  totalLiabilities: string;
  growthRate: string;
  eps: string;
  boardMeetings: string;
  proposalCount: string;
  supervisionOpinions: string;
  budgetTarget: string;
  auditorName: string;
  companyName: string;
  establishedDate: string;
  registeredCapital: string;
  legalRepresentative: string;
  businessScope: string;
  background: string;
  content: string;
  description: string;
  proposer: string;
  proposalDate: string;
}

// 董事会议案表单
interface BoardProposalFormData {
  planningPeriod: string; // 战略规划期
  planningYears: string; // 规划年限（如"未来三年"）
  coreDirection: string; // 核心发展方向
  companyName: string; // 公司名称
  proposalDate: string; // 发文日期
}

// 董事会表决票表单
interface BoardVotingFormData {
  votingDate: string; // 表决日期
  companyName: string; // 公司名称
  meetingNumber: string; // 会议届次
}

// 董事会会议记录表单
interface BoardMinutesFormData {
  meetingDate: string; // 会议日期
  meetingTime: string; // 会议时间
  companyName: string; // 公司名称
  meetingNumber: string; // 会议届次
  attendeeNames: string; // 列席人员姓名
  convenerName: string; // 召集人姓名
  hostName: string; // 主持人姓名
  recorderName: string; // 记录人姓名
  expectedDirectors: string; // 应到董事人数
}

// 董事会决议表单
interface BoardResolutionFormData {
  meetingDate: string; // 会议日期
  meetingTime: string; // 会议时间
  companyName: string; // 公司名称
  meetingNumber: string; // 会议届次
  convenerHostName: string; // 召集人/主持人姓名
  expectedDirectors: string; // 应到董事人数
  resolutionDate: string; // 决议日期
}

// 董事会签到表表单
interface BoardSigninFormData {
  meetingDate: string; // 会议日期
  companyName: string; // 公司名称
  meetingNumber: string; // 会议届次
  directors: { name: string; position: string }[]; // 董事列表
}

// 董事会会议通知表单
interface BoardNoticeFormData {
  meetingDate: string; // 会议日期
  meetingTime: string; // 会议时间
  companyName: string; // 公司名称
  meetingNumber: string; // 会议届次
  contactName: string; // 联系人姓名
  contactPhone: string; // 联系电话
  proposalName: string; // 审议的议案名称
  noticeDate: string; // 通知落款日期
}

type FormData = VotingFormData | VotingStatsFormData | AgendaFormData | MinutesFormData | NoticeFormData | ResolutionFormData | SigninFormData | ProxyFormData | ProposalFormData | BoardProposalFormData | BoardVotingFormData | BoardMinutesFormData | BoardResolutionFormData | BoardSigninFormData | BoardNoticeFormData;

interface DocumentCenterProps {
  meetingId?: string | null;
  // 邮件编辑相关参数
  editEmailFor?: {
    meetingId: string;
    meetingTitle: string;
    recipientName: string;
    recipientEmail: string;
    senderName: string;
    meetingDate?: string;
    meetingTime?: string;
    meetingLocation?: string;
  };
  onEmailSaved?: (email: EmailDocument) => void;
  onEmailClosed?: () => void;
  onComplianceReview?: (docId?: string) => void; // 跳转到合规审查
  onNavigateToKnowledge?: () => void; // 跳转到规则文件库
}

// 合规审查结果
interface ComplianceResult {
  docId: string;
  score: number;
  reviewRecordId?: string;
}

// 股东会文书模板
const shareholderTemplates: DocumentTemplate[] = [
  { id: 'voting', name: '表决票' },
  { id: 'voting_stats', name: '表决统计票' },
  { id: 'agenda', name: '大会议程' },
  { id: 'minutes', name: '会议记录' },
  { id: 'notice', name: '会议通知' },
  { id: 'resolution', name: '决议' },
  { id: 'signin', name: '签到表' },
  { id: 'proxy', name: '委托书' },
  { id: 'proposal', name: '议案' },
];

// 董事会议书模板
const boardTemplates: DocumentTemplate[] = [
  { id: 'board_proposal', name: '董事会议案' },
  { id: 'board_voting', name: '董事会表决票' },
  { id: 'board_minutes', name: '董事会会议记录' },
  { id: 'board_resolution', name: '董事会决议' },
  { id: 'board_signin', name: '董事会签到表' },
  { id: 'board_notice', name: '董事会会议通知' },
];

const supervisorTemplates: DocumentTemplate[] = [
  { id: 'supervisor_notice', name: '监事会会议通知' },
  { id: 'supervisor_signin', name: '监事会签到表' },
  { id: 'supervisor_voting', name: '监事会表决票' },
  { id: 'supervisor_resolution', name: '监事会决议' },
  { id: 'supervisor_minutes', name: '监事会会议记录' },
  { id: 'supervisor_proposal', name: '监事会议案' },
];

const documentTypeMeetingType: Record<string, MeetingPackageType> = {
  voting: 'shareholder',
  voting_stats: 'shareholder',
  agenda: 'shareholder',
  minutes: 'shareholder',
  notice: 'shareholder',
  resolution: 'shareholder',
  signin: 'shareholder',
  proxy: 'shareholder',
  proposal: 'shareholder',
  board_proposal: 'board',
  board_voting: 'board',
  board_minutes: 'board',
  board_resolution: 'board',
  board_signin: 'board',
  board_notice: 'board',
  supervisor_notice: 'supervisor',
  supervisor_signin: 'supervisor',
  supervisor_voting: 'supervisor',
  supervisor_resolution: 'supervisor',
  supervisor_minutes: 'supervisor',
  supervisor_proposal: 'supervisor',
};

// 历史会议标题
const getMeetingHistory = (): string[] => {
  const saved = localStorage.getItem("corporate_meeting_titles");
  return saved ? JSON.parse(saved) : [];
};

const saveMeetingTitle = (title: string) => {
  const history = getMeetingHistory();
  if (!history.includes(title)) {
    const updated = [title, ...history].slice(0, 10);
    localStorage.setItem("corporate_meeting_titles", JSON.stringify(updated));
  }
};

// 获取与会人员列表
const getAttendees = (): { name: string; phone: string; email: string }[] => {
  const saved = localStorage.getItem("corporate_attendees");
  return saved ? JSON.parse(saved) : [];
};

// 生成文书内容
const generateDocumentContent = (meetingTitle: string, type: string, typeName: string, formData?: FormData): string => {
  const date = new Date().toLocaleDateString('zh-CN');
  
  const templates: Record<string, string> = {
    voting: (() => {
      const data = formData as VotingFormData;
      return `${meetingTitle}表决票\n\n会议日期：${data?.meetingDate || '____年__月__日'}\n股东名称：${data?.shareholderName || '______________'}\n持股数量：${data?.shares || '______________'}${data?.shareholding ? `\n持股比例：${data.shareholding}` : ''}\n\n表决事项：${data?.proposalNumber ? `\n${data.proposalNumber}` : ''}\n${data?.proposalTitle || '______________'}\n\n表决意见：\n□ 同意  □ 反对  □ 弃权\n\n说明：本票生成时为空白表决票，勾选并签署后方构成真实表决意见。\n\n股东签名：______________`;
    })(),
    
    voting_stats: (() => {
      const data = formData as VotingStatsFormData;
      return `${meetingTitle}表决统计票\n\n会议日期：${data?.meetingDate || '____年__月__日'} ${data?.meetingTime || '__时'}\n会议地点：${data?.meetingLocation || '公司会议室'}\n\n出席会议的股东及股东代表人数：${data?.attendeeCount || '____'}名\n\n股东总数：${data?.totalShareholders || '____'}名  占比：${data?.shareholderRatio || '___'}%\n代表股份数：${data?.representedShares || '____________'}股  占有表决权股份总数比例：${data?.votingRatio || '___'}%\n\n| 表决事项 | 同意票数 | 反对票数 | 弃权票数 | 表决结果 |\n|---------|---------|---------|---------|---------|\n|         |         |         |         |         |\n\n监票人：______________\n计票人：______________`;
    })(),

    agenda: (() => {
      const data = formData as AgendaFormData;
      return `${meetingTitle}大会议程\n\n会议时间：${data?.meetingDate || '____年__月__日'} ${data?.meetingTime || '__时'}\n\n一、主持人宣布开会\n二、宣布出席股东人数\n三、审议议题\n   1.\n   2.\n   3.\n四、表决\n五、形成决议\n六、散会`;
    })(),

    minutes: (() => {
      const data = formData as MinutesFormData;
      return `${meetingTitle}会议记录\n\n时间：${data?.meetingDate || '____年__月__日'} ${data?.meetingTime || '__时'}\n\n大会主持人：${data?.hostName || '______________'}\n大会记录人：${data?.recorderName || '______________'}\n\n出席会议的股东及股东代表人数：${data?.attendeeCount || '____'}名\n股东总数：${data?.totalShareholders || '____'}名  占比：${data?.shareholderRatio || '___'}%\n代表股份数：${data?.representedShares || '____________'}股  占有表决权股份总数比例：${data?.votingRatio || '___'}%\n\n会议内容：\n\n\n决议事项：\n`;
    })(),
    
    notice: (() => {
      const data = formData as NoticeFormData;
      const attendeesList = data?.attendees?.map(a => `${a.name}${a.phone ? ' ' + a.phone : ''}${a.email ? ' ' + a.email : ''}`).join('\n') || '与会人员信息';
      return `${meetingTitle}会议通知\n\n各位股东：\n\n根据《公司法》及公司章程规定，现决定召开股东会，会议事项如下：\n\n一、会议时间：${data?.meetingDate || '____年__月__日'} ${data?.meetingTime || '__时'}\n二、会议地点：\n三、会议议题：\n四、出席人员：\n${attendeesList}\n五、会务联系：\n联系人：${data?.contactName || '______________'}\n电  话：${data?.contactPhone || '______________'}\n邮  箱：${data?.contactEmail || '______________'}\n\n特此通知。\n\n                      ${new Date().toLocaleDateString('zh-CN')}
`;
    })(),
    
    resolution: (() => {
      const data = formData as ResolutionFormData;
      return `${meetingTitle}决议\n\n${data?.meetingDate || '____年__月__日'} ${data?.meetingTime || '__时'}，本公司召开股东会，会议审议通过了以下事项：\n\n决议内容：\n${data?.resolutionContent || '（请填写决议内容）'}\n\n出席会议的股东或股东代表人数：${data?.attendeeCount || '____'}名\n股东总数：${data?.totalShareholders || '____'}名  占比：${data?.shareholderRatio || '___'}%\n代表股份数：${data?.representedShares || '____________'}股  占有表决权股份总数比例：${data?.votingRatio || '___'}%\n\n表决结果：同意票占有效表决票数的___%\n\n与会股东签字：\n`;
    })(),
    
    signin: (() => {
      const data = formData as SigninFormData;
      return `${meetingTitle}签到表\n\n会议日期：${data?.meetingDate || '____年__月__日'}\n\n| 序号 | 股东名称/姓名 | 持股数 | 签名 | 备注 |\n|------|-------------|-------|------|------|\n| 1    |             |       |      |      |\n| 2    |             |       |      |      |\n| 3    |             |       |      |      |\n`;
    })(),
    
    proxy: (() => {
      const data = formData as ProxyFormData;
      return `${meetingTitle}委托书\n\n委托人（股东）：${data?.principalName || '______________'}\n营业执照号码/身份证号码：${data?.principalId || '______________'}\n\n受托人：${data?.agentName || '______________'}\n身份证号码：${data?.agentId || '______________'}\n\n委托日期：${data?.proxyDate || '____年__月__日'}\n\n委托事项：代表本人出席上述股东会，并行使表决权。\n\n委托期限：本委托书自签署之日起至本次股东会结束止。\n\n委托人签名：______________\n日期：______________`;
    })(),
    
    proposal: (() => {
      const data = formData as ProposalFormData;
      return `${meetingTitle}议案\n\n议案编号：${data?.proposalId || '______________'}\n议案名称：${data?.proposalName || '______________'}\n\n一、议案提出背景\n${data?.background || '（请填写议案提出背景）'}\n\n二、议案具体内容\n${data?.content || '（请填写议案具体内容）'}\n\n三、议案说明\n${data?.description || '（请填写议案说明）'}\n\n四、涉及数据\n${data?.revenue ? `营业收入：${data.revenue}万元` : ''}\n${data?.netProfit ? `净利润：${data.netProfit}万元` : ''}\n${data?.totalAssets ? `资产总额：${data.totalAssets}万元` : ''}\n${data?.totalLiabilities ? `负债总额：${data.totalLiabilities}万元` : ''}\n${data?.growthRate ? `增长率：${data.growthRate}%` : ''}\n${data?.eps ? `每股收益：${data.eps}元` : ''}\n${data?.boardMeetings ? `召开董事会次数：${data.boardMeetings}次` : ''}\n${data?.proposalCount ? `审议议案数：${data.proposalCount}项` : ''}\n${data?.supervisionOpinions ? `监事会监督意见：${data.supervisionOpinions}条` : ''}\n${data?.budgetTarget ? `预算目标数值：${data.budgetTarget}` : ''}\n${data?.auditorName ? `审计机构：${data.auditorName}` : ''}\n\n五、公司信息（议案五涉及）\n${data?.companyName ? `公司名称：${data.companyName}` : ''}\n${data?.establishedDate ? `成立日期：${data.establishedDate}` : ''}\n${data?.registeredCapital ? `注册资本：${data.registeredCapital}` : ''}\n${data?.legalRepresentative ? `法定代表人：${data.legalRepresentative}` : ''}\n${data?.businessScope ? `经营范围：${data.businessScope}` : ''}\n\n六、提案人：${data?.proposer || '______________'}\n日  期：${data?.proposalDate || '______________'}\n`;
    })(),

    // 董事会议案
    board_proposal: (() => {
      const data = formData as BoardProposalFormData;
      const company = data?.companyName || '某股份有限公司';
      return `${company}关于公司某某发展战略规划的议案

各位董事：

为适配行业政策导向、市场竞争新格局及技术发展新趋势，结合公司某年上半年经营实际成果与发展诉求，公司管理层牵头对现有中长期发展战略规划开展全面梳理、调研与调整，进一步明确公司未来${data?.planningYears || '___'}年内的核心发展方向、核心业务布局、阶段性战略目标及落地保障举措。

本次战略规划优化调整紧扣公司核心竞争力提升，贴合市场真实需求，符合公司可持续发展战略及全体股东的根本利益，相关方案已完成前期论证。

现将《公司某某发展战略规划方案》提交本次董事会审议，请予审议。

${company}董事会
${data?.proposalDate || '某年某月某日'}
`;
    })(),

    // 董事会表决票
    board_voting: (() => {
      const data = formData as BoardVotingFormData;
      const company = data?.companyName || '某股份有限公司';
      const meetingNum = data?.meetingNumber || '第一';
      return `${company}第${meetingNum}届董事会第三次会议表决票

请根据表决意见，在对应的表决栏中用"√"表示。

董事签名：________________
表决日期：${data?.votingDate || '____年__月__日'}
`;
    })(),

    // 董事会会议记录
    board_minutes: (() => {
      const data = formData as BoardMinutesFormData;
      const company = data?.companyName || '某股份有限公司';
      const meetingNum = data?.meetingNumber || '第一';
      return `${company}第${meetingNum}届董事会第三次会议记录

会议时间：${data?.meetingDate || '____年__月__日'} ${data?.meetingTime || '__时'}
会议地点：公司会议室
会议列席人员：${data?.attendeeNames || '某某某'}
会议召集人：${data?.convenerName || '某某某'}
会议主持人：${data?.hostName || '某某某'}
会议记录人：${data?.recorderName || '某某某'}

一、会议主持人宣布会议开始。

（本页无正文）
董事签名：________________
`;
    })(),

    // 董事会决议
    board_resolution: (() => {
      const data = formData as BoardResolutionFormData;
      const company = data?.companyName || '某股份有限公司';
      const meetingNum = data?.meetingNumber || '第一';
      return `${company}第${meetingNum}届董事会第三次会议决议

会议时间：${data?.meetingDate || '____年__月__日'} ${data?.meetingTime || '__时'}
召集人/主持人：${data?.convenerHostName || '某某某'}
应到董事人数：${data?.expectedDirectors || '___'}名

决议日期：${data?.resolutionDate || '____年__月__日'}

出席会议董事签名：________________
`;
    })(),

    // 董事会签到表
    board_signin: (() => {
      const data = formData as BoardSigninFormData;
      const company = data?.companyName || '某股份有限公司';
      const meetingNum = data?.meetingNumber || '第一';
      return `${company}第${meetingNum}届董事会第三次会议签到表

时间：${data?.meetingDate || '____年__月__日'}

| 序号 | 姓名 | 职务 | 签名 |
|------|-----|------|------|
| 1 | 某某某 | 董事 | |
| 2 | 某某某 | 董事 | |
| 3 | 某某某 | 董事 | |
`;
    })(),

    // 董事会会议通知
    board_notice: (() => {
      const data = formData as BoardNoticeFormData;
      const company = data?.companyName || '某股份有限公司';
      const meetingNum = data?.meetingNumber || '第一';
      return `${company}第${meetingNum}届董事会第三次会议通知

各位董事：

会议时间：${data?.meetingDate || '____年__月__日'} ${data?.meetingTime || '__时'}
联系人：${data?.contactName || '某某某'}
联系电话：${data?.contactPhone || '***********'}

审议议案：${data?.proposalName || '《关于公司中长期发展战略规划的议案》'}

${company}董事会
${data?.noticeDate || '____年__月__日'}
`;
    })(),
  };

  return templates[type] || `${meetingTitle}${typeName}\n\n（此处为空白模板内容）`;
};

// 下载文档
const downloadDocument = (doc: GeneratedDocument) => {
  const content = doc.content || generateDocumentContent(doc.meetingTitle, doc.type, doc.typeName);
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.name}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 表单输入组件
const FormInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-xs font-medium text-mck-navy/70 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-mck-border rounded-lg text-sm focus:outline-none focus:border-mck-blue"
    />
  </div>
);

// 表决票表单
const VotingForm: React.FC<{
  data: VotingFormData;
  onChange: (data: VotingFormData) => void;
}> = ({ data, onChange }) => (
  <div className="grid grid-cols-1 gap-4">
    <FormInput
      label="会议日期"
      value={data.meetingDate}
      onChange={(v) => onChange({ ...data, meetingDate: v })}
      type="date"
    />
    <FormInput
      label="股东名称"
      value={data.shareholderName}
      onChange={(v) => onChange({ ...data, shareholderName: v })}
      placeholder="请输入股东名称"
    />
    <FormInput
      label="持股数量"
      value={data.shares}
      onChange={(v) => onChange({ ...data, shares: v })}
      placeholder="请输入持股数量"
    />
  </div>
);

// 表决统计票表单
const VotingStatsForm: React.FC<{
  data: VotingStatsFormData;
  onChange: (data: VotingStatsFormData) => void;
}> = ({ data, onChange }) => (
  <div className="grid grid-cols-2 gap-4">
    <FormInput
      label="会议日期"
      value={data.meetingDate}
      onChange={(v) => onChange({ ...data, meetingDate: v })}
      type="date"
    />
    <FormInput
      label="会议时间"
      value={data.meetingTime}
      onChange={(v) => onChange({ ...data, meetingTime: v })}
      placeholder="如：09:00"
    />
    <FormInput
      label="会议地点"
      value={data.meetingLocation}
      onChange={(v) => onChange({ ...data, meetingLocation: v })}
      placeholder="默认公司会议室"
    />
    <FormInput
      label="出席人数（名）"
      value={data.attendeeCount}
      onChange={(v) => onChange({ ...data, attendeeCount: v })}
      placeholder="请输入"
    />
    <FormInput
      label="股东总数（名）"
      value={data.totalShareholders}
      onChange={(v) => onChange({ ...data, totalShareholders: v })}
      placeholder="请输入"
    />
    <FormInput
      label="占比（%）"
      value={data.shareholderRatio}
      onChange={(v) => onChange({ ...data, shareholderRatio: v })}
      placeholder="请输入"
    />
    <FormInput
      label="代表股份数（股）"
      value={data.representedShares}
      onChange={(v) => onChange({ ...data, representedShares: v })}
      placeholder="请输入"
    />
    <FormInput
      label="占有表决权比例（%）"
      value={data.votingRatio}
      onChange={(v) => onChange({ ...data, votingRatio: v })}
      placeholder="请输入"
    />
  </div>
);

// 大会议程表单
const AgendaForm: React.FC<{
  data: AgendaFormData;
  onChange: (data: AgendaFormData) => void;
}> = ({ data, onChange }) => (
  <div className="grid grid-cols-2 gap-4">
    <FormInput
      label="会议日期"
      value={data.meetingDate}
      onChange={(v) => onChange({ ...data, meetingDate: v })}
      type="date"
    />
    <FormInput
      label="会议时间"
      value={data.meetingTime}
      onChange={(v) => onChange({ ...data, meetingTime: v })}
      placeholder="如：09:00"
    />
  </div>
);

// 会议记录表单
const MinutesForm: React.FC<{
  data: MinutesFormData;
  onChange: (data: MinutesFormData) => void;
}> = ({ data, onChange }) => (
  <div className="grid grid-cols-2 gap-4">
    <FormInput
      label="会议日期"
      value={data.meetingDate}
      onChange={(v) => onChange({ ...data, meetingDate: v })}
      type="date"
    />
    <FormInput
      label="会议时间"
      value={data.meetingTime}
      onChange={(v) => onChange({ ...data, meetingTime: v })}
      placeholder="如：09:00"
    />
    <FormInput
      label="主持人姓名"
      value={data.hostName}
      onChange={(v) => onChange({ ...data, hostName: v })}
      placeholder="请输入"
    />
    <FormInput
      label="记录人姓名"
      value={data.recorderName}
      onChange={(v) => onChange({ ...data, recorderName: v })}
      placeholder="请输入"
    />
    <FormInput
      label="出席人数（名）"
      value={data.attendeeCount}
      onChange={(v) => onChange({ ...data, attendeeCount: v })}
      placeholder="请输入"
    />
    <FormInput
      label="股东总数（名）"
      value={data.totalShareholders}
      onChange={(v) => onChange({ ...data, totalShareholders: v })}
      placeholder="请输入"
    />
    <FormInput
      label="占比（%）"
      value={data.shareholderRatio}
      onChange={(v) => onChange({ ...data, shareholderRatio: v })}
      placeholder="请输入"
    />
    <FormInput
      label="代表股份数（股）"
      value={data.representedShares}
      onChange={(v) => onChange({ ...data, representedShares: v })}
      placeholder="请输入"
    />
    <FormInput
      label="占有表决权比例（%）"
      value={data.votingRatio}
      onChange={(v) => onChange({ ...data, votingRatio: v })}
      placeholder="请输入"
    />
  </div>
);

// 会议通知表单
const NoticeForm: React.FC<{
  data: NoticeFormData;
  onChange: (data: NoticeFormData) => void;
  availableAttendees: { name: string; phone: string; email: string }[];
}> = ({ data, onChange, availableAttendees }) => {
  const addAttendee = () => {
    onChange({ ...data, attendees: [...data.attendees, { name: '', phone: '', email: '' }] });
  };

  const removeAttendee = (index: number) => {
    onChange({ ...data, attendees: data.attendees.filter((_, i) => i !== index) });
  };

  const updateAttendee = (index: number, field: 'name' | 'phone' | 'email', value: string) => {
    const newAttendees = [...data.attendees];
    newAttendees[index] = { ...newAttendees[index], [field]: value };
    onChange({ ...data, attendees: newAttendees });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="会议日期"
          value={data.meetingDate}
          onChange={(v) => onChange({ ...data, meetingDate: v })}
          type="date"
        />
        <FormInput
          label="会议时间"
          value={data.meetingTime}
          onChange={(v) => onChange({ ...data, meetingTime: v })}
          placeholder="如：09:00"
        />
        <FormInput
          label="联系人姓名"
          value={data.contactName}
          onChange={(v) => onChange({ ...data, contactName: v })}
          placeholder="请输入"
        />
        <FormInput
          label="联系人电话"
          value={data.contactPhone}
          onChange={(v) => onChange({ ...data, contactPhone: v })}
          placeholder="请输入"
        />
        <div className="col-span-2">
          <FormInput
            label="联系人邮箱"
            value={data.contactEmail}
            onChange={(v) => onChange({ ...data, contactEmail: v })}
            placeholder="请输入"
          />
        </div>
      </div>
      
      <div className="border-t border-mck-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-mck-navy/70">与会人员</label>
          <div className="flex gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const attendee = availableAttendees.find(a => a.name === e.target.value);
                  if (attendee) {
                    onChange({ ...data, attendees: [...data.attendees, attendee] });
                  }
                }
                e.target.value = '';
              }}
              className="text-xs px-2 py-1 border border-mck-border rounded"
            >
              <option value="">从名单选择</option>
              {availableAttendees.map((a, i) => (
                <option key={i} value={a.name}>{a.name}</option>
              ))}
            </select>
            <button
              onClick={addAttendee}
              className="text-xs px-2 py-1 bg-mck-blue/10 text-mck-blue rounded"
            >
              添加人员
            </button>
          </div>
        </div>
        {data.attendees.map((attendee, index) => (
          <div key={index} className="flex items-center gap-2 mb-2 bg-mck-bg/30 p-2 rounded">
            <input
              value={attendee.name}
              onChange={(e) => updateAttendee(index, 'name', e.target.value)}
              placeholder="姓名"
              className="flex-1 px-2 py-1 text-xs border border-mck-border rounded"
            />
            <input
              value={attendee.phone}
              onChange={(e) => updateAttendee(index, 'phone', e.target.value)}
              placeholder="电话"
              className="w-28 px-2 py-1 text-xs border border-mck-border rounded"
            />
            <input
              value={attendee.email}
              onChange={(e) => updateAttendee(index, 'email', e.target.value)}
              placeholder="邮箱"
              className="w-36 px-2 py-1 text-xs border border-mck-border rounded"
            />
            <button
              onClick={() => removeAttendee(index)}
              className="p-1 text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {data.attendees.length === 0 && (
          <p className="text-xs text-mck-navy/40 text-center py-2">暂无与会人员</p>
        )}
      </div>
    </div>
  );
};

// 决议表单
const ResolutionForm: React.FC<{
  data: ResolutionFormData;
  onChange: (data: ResolutionFormData) => void;
}> = ({ data, onChange }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="会议日期"
        value={data.meetingDate}
        onChange={(v) => onChange({ ...data, meetingDate: v })}
        type="date"
      />
      <FormInput
        label="会议时间"
        value={data.meetingTime}
        onChange={(v) => onChange({ ...data, meetingTime: v })}
        placeholder="如：09:00"
      />
      <FormInput
        label="出席人数（名）"
        value={data.attendeeCount}
        onChange={(v) => onChange({ ...data, attendeeCount: v })}
        placeholder="请输入"
      />
      <FormInput
        label="股东总数（名）"
        value={data.totalShareholders}
        onChange={(v) => onChange({ ...data, totalShareholders: v })}
        placeholder="请输入"
      />
      <FormInput
        label="占比（%）"
        value={data.shareholderRatio}
        onChange={(v) => onChange({ ...data, shareholderRatio: v })}
        placeholder="请输入"
      />
      <FormInput
        label="代表股份数（股）"
        value={data.representedShares}
        onChange={(v) => onChange({ ...data, representedShares: v })}
        placeholder="请输入"
      />
      <FormInput
        label="占有表决权比例（%）"
        value={data.votingRatio}
        onChange={(v) => onChange({ ...data, votingRatio: v })}
        placeholder="请输入"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-mck-navy/70 mb-1">决议内容</label>
      <textarea
        value={data.resolutionContent}
        onChange={(e) => onChange({ ...data, resolutionContent: e.target.value })}
        placeholder="请填写决议内容"
        rows={4}
        className="w-full px-3 py-2 border border-mck-border rounded-lg text-sm focus:outline-none focus:border-mck-blue resize-none"
      />
    </div>
  </div>
);

// 签到表表单
const SigninForm: React.FC<{
  data: SigninFormData;
  onChange: (data: SigninFormData) => void;
}> = ({ data, onChange }) => (
  <FormInput
    label="会议日期"
    value={data.meetingDate}
    onChange={(v) => onChange({ ...data, meetingDate: v })}
    type="date"
  />
);

// 委托书表单
const ProxyForm: React.FC<{
  data: ProxyFormData;
  onChange: (data: ProxyFormData) => void;
}> = ({ data, onChange }) => (
  <div className="grid grid-cols-2 gap-4">
    <FormInput
      label="委托人姓名/名称"
      value={data.principalName}
      onChange={(v) => onChange({ ...data, principalName: v })}
      placeholder="请输入"
    />
    <FormInput
      label="委托人证件号码"
      value={data.principalId}
      onChange={(v) => onChange({ ...data, principalId: v })}
      placeholder="请输入"
    />
    <FormInput
      label="受托人姓名"
      value={data.agentName}
      onChange={(v) => onChange({ ...data, agentName: v })}
      placeholder="请输入"
    />
    <FormInput
      label="受托人身份证号码"
      value={data.agentId}
      onChange={(v) => onChange({ ...data, agentId: v })}
      placeholder="请输入"
    />
    <FormInput
      label="委托日期"
      value={data.proxyDate}
      onChange={(v) => onChange({ ...data, proxyDate: v })}
      type="date"
    />
  </div>
);

// 议案表单
const ProposalForm: React.FC<{
  data: ProposalFormData;
  onChange: (data: ProposalFormData) => void;
}> = ({ data, onChange }) => (
  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="议案编号"
        value={data.proposalId}
        onChange={(v) => onChange({ ...data, proposalId: v })}
        placeholder="请输入"
      />
      <FormInput
        label="议案名称"
        value={data.proposalName}
        onChange={(v) => onChange({ ...data, proposalName: v })}
        placeholder="请输入"
      />
    </div>
    
    <div>
      <label className="block text-xs font-medium text-mck-navy/70 mb-1">议案提出背景</label>
      <textarea
        value={data.background}
        onChange={(e) => onChange({ ...data, background: e.target.value })}
        placeholder="请填写议案提出背景"
        rows={2}
        className="w-full px-3 py-2 border border-mck-border rounded-lg text-sm focus:outline-none focus:border-mck-blue resize-none"
      />
    </div>
    
    <div>
      <label className="block text-xs font-medium text-mck-navy/70 mb-1">议案具体内容</label>
      <textarea
        value={data.content}
        onChange={(e) => onChange({ ...data, content: e.target.value })}
        placeholder="请填写议案具体内容"
        rows={2}
        className="w-full px-3 py-2 border border-mck-border rounded-lg text-sm focus:outline-none focus:border-mck-blue resize-none"
      />
    </div>
    
    <div>
      <label className="block text-xs font-medium text-mck-navy/70 mb-1">议案说明</label>
      <textarea
        value={data.description}
        onChange={(e) => onChange({ ...data, description: e.target.value })}
        placeholder="请填写议案说明"
        rows={2}
        className="w-full px-3 py-2 border border-mck-border rounded-lg text-sm focus:outline-none focus:border-mck-blue resize-none"
      />
    </div>
    
    <div className="border-t border-mck-border pt-4">
      <label className="text-xs font-bold text-mck-navy/60 uppercase tracking-wider mb-3 block">涉及数据</label>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="营业收入（万元）" value={data.revenue} onChange={(v) => onChange({ ...data, revenue: v })} placeholder="请输入" />
        <FormInput label="净利润（万元）" value={data.netProfit} onChange={(v) => onChange({ ...data, netProfit: v })} placeholder="请输入" />
        <FormInput label="资产总额（万元）" value={data.totalAssets} onChange={(v) => onChange({ ...data, totalAssets: v })} placeholder="请输入" />
        <FormInput label="负债总额（万元）" value={data.totalLiabilities} onChange={(v) => onChange({ ...data, totalLiabilities: v })} placeholder="请输入" />
        <FormInput label="增长率（%）" value={data.growthRate} onChange={(v) => onChange({ ...data, growthRate: v })} placeholder="请输入" />
        <FormInput label="每股收益（元）" value={data.eps} onChange={(v) => onChange({ ...data, eps: v })} placeholder="请输入" />
        <FormInput label="董事会会议次数" value={data.boardMeetings} onChange={(v) => onChange({ ...data, boardMeetings: v })} placeholder="请输入" />
        <FormInput label="审议议案数（项）" value={data.proposalCount} onChange={(v) => onChange({ ...data, proposalCount: v })} placeholder="请输入" />
        <FormInput label="监事会监督意见（条）" value={data.supervisionOpinions} onChange={(v) => onChange({ ...data, supervisionOpinions: v })} placeholder="请输入" />
        <FormInput label="预算目标数值" value={data.budgetTarget} onChange={(v) => onChange({ ...data, budgetTarget: v })} placeholder="请输入" />
        <FormInput label="审计机构名称" value={data.auditorName} onChange={(v) => onChange({ ...data, auditorName: v })} placeholder="请输入" />
      </div>
    </div>
    
    <div className="border-t border-mck-border pt-4">
      <label className="text-xs font-bold text-mck-navy/60 uppercase tracking-wider mb-3 block">公司信息（议案五）</label>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="公司名称" value={data.companyName} onChange={(v) => onChange({ ...data, companyName: v })} placeholder="请输入" />
        <FormInput label="成立日期" value={data.establishedDate} onChange={(v) => onChange({ ...data, establishedDate: v })} type="date" />
        <FormInput label="注册资本" value={data.registeredCapital} onChange={(v) => onChange({ ...data, registeredCapital: v })} placeholder="请输入" />
        <FormInput label="法定代表人" value={data.legalRepresentative} onChange={(v) => onChange({ ...data, legalRepresentative: v })} placeholder="请输入" />
      </div>
      <div className="mt-3">
        <label className="block text-xs font-medium text-mck-navy/70 mb-1">经营范围</label>
        <textarea
          value={data.businessScope}
          onChange={(e) => onChange({ ...data, businessScope: e.target.value })}
          placeholder="请填写经营范围"
          rows={2}
          className="w-full px-3 py-2 border border-mck-border rounded-lg text-sm focus:outline-none focus:border-mck-blue resize-none"
        />
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-3">
      <FormInput label="提案人" value={data.proposer} onChange={(v) => onChange({ ...data, proposer: v })} placeholder="请输入" />
      <FormInput label="提案日期" value={data.proposalDate} onChange={(v) => onChange({ ...data, proposalDate: v })} type="date" />
    </div>
  </div>
);

// 董事会议案表单
const BoardProposalForm: React.FC<{
  data: BoardProposalFormData;
  onChange: (data: BoardProposalFormData) => void;
}> = ({ data, onChange }) => (
  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="公司名称"
        value={data.companyName}
        onChange={(v) => onChange({ ...data, companyName: v })}
        placeholder="如：某某股份有限公司"
      />
      <FormInput
        label="战略规划期"
        value={data.planningPeriod}
        onChange={(v) => onChange({ ...data, planningPeriod: v })}
        placeholder="如：2024-2026年"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="规划年限"
        value={data.planningYears}
        onChange={(v) => onChange({ ...data, planningYears: v })}
        placeholder="如：未来三年"
      />
      <FormInput
        label="发文日期"
        value={data.proposalDate}
        onChange={(v) => onChange({ ...data, proposalDate: v })}
        type="date"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-mck-navy/70 mb-1">核心发展方向</label>
      <textarea
        value={data.coreDirection}
        onChange={(e) => onChange({ ...data, coreDirection: e.target.value })}
        placeholder="请填写核心发展方向"
        rows={3}
        className="w-full px-3 py-2 border border-mck-border rounded-lg text-sm focus:outline-none focus:border-mck-blue resize-none"
      />
    </div>
  </div>
);

// 董事会表决票表单
const BoardVotingForm: React.FC<{
  data: BoardVotingFormData;
  onChange: (data: BoardVotingFormData) => void;
}> = ({ data, onChange }) => (
  <div className="grid grid-cols-2 gap-4">
    <FormInput
      label="公司名称"
      value={data.companyName}
      onChange={(v) => onChange({ ...data, companyName: v })}
      placeholder="如：某某股份有限公司"
    />
    <FormInput
      label="会议届次"
      value={data.meetingNumber}
      onChange={(v) => onChange({ ...data, meetingNumber: v })}
      placeholder="如：第一"
    />
    <FormInput
      label="表决日期"
      value={data.votingDate}
      onChange={(v) => onChange({ ...data, votingDate: v })}
      type="date"
    />
  </div>
);

// 董事会会议记录表单
const BoardMinutesForm: React.FC<{
  data: BoardMinutesFormData;
  onChange: (data: BoardMinutesFormData) => void;
}> = ({ data, onChange }) => (
  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="公司名称"
        value={data.companyName}
        onChange={(v) => onChange({ ...data, companyName: v })}
        placeholder="如：某某股份有限公司"
      />
      <FormInput
        label="会议届次"
        value={data.meetingNumber}
        onChange={(v) => onChange({ ...data, meetingNumber: v })}
        placeholder="如：第一"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="会议日期"
        value={data.meetingDate}
        onChange={(v) => onChange({ ...data, meetingDate: v })}
        type="date"
      />
      <FormInput
        label="会议时间"
        value={data.meetingTime}
        onChange={(v) => onChange({ ...data, meetingTime: v })}
        placeholder="如：09:00"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="列席人员"
        value={data.attendeeNames}
        onChange={(v) => onChange({ ...data, attendeeNames: v })}
        placeholder="请输入列席人员姓名"
      />
      <FormInput
        label="召集人"
        value={data.convenerName}
        onChange={(v) => onChange({ ...data, convenerName: v })}
        placeholder="请输入召集人姓名"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="主持人"
        value={data.hostName}
        onChange={(v) => onChange({ ...data, hostName: v })}
        placeholder="请输入主持人姓名"
      />
      <FormInput
        label="记录人"
        value={data.recorderName}
        onChange={(v) => onChange({ ...data, recorderName: v })}
        placeholder="请输入记录人姓名"
      />
    </div>
    <FormInput
      label="应到董事人数"
      value={data.expectedDirectors}
      onChange={(v) => onChange({ ...data, expectedDirectors: v })}
      placeholder="请输入应到董事人数"
    />
  </div>
);

// 董事会决议表单
const BoardResolutionForm: React.FC<{
  data: BoardResolutionFormData;
  onChange: (data: BoardResolutionFormData) => void;
}> = ({ data, onChange }) => (
  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="公司名称"
        value={data.companyName}
        onChange={(v) => onChange({ ...data, companyName: v })}
        placeholder="如：某某股份有限公司"
      />
      <FormInput
        label="会议届次"
        value={data.meetingNumber}
        onChange={(v) => onChange({ ...data, meetingNumber: v })}
        placeholder="如：第一"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="会议日期"
        value={data.meetingDate}
        onChange={(v) => onChange({ ...data, meetingDate: v })}
        type="date"
      />
      <FormInput
        label="会议时间"
        value={data.meetingTime}
        onChange={(v) => onChange({ ...data, meetingTime: v })}
        placeholder="如：09:00"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="召集人/主持人"
        value={data.convenerHostName}
        onChange={(v) => onChange({ ...data, convenerHostName: v })}
        placeholder="请输入召集人/主持人姓名"
      />
      <FormInput
        label="应到董事人数"
        value={data.expectedDirectors}
        onChange={(v) => onChange({ ...data, expectedDirectors: v })}
        placeholder="请输入应到董事人数"
      />
    </div>
    <FormInput
      label="决议日期"
      value={data.resolutionDate}
      onChange={(v) => onChange({ ...data, resolutionDate: v })}
      type="date"
    />
  </div>
);

// 董事会签到表表单
const BoardSigninForm: React.FC<{
  data: BoardSigninFormData;
  onChange: (data: BoardSigninFormData) => void;
}> = ({ data, onChange }) => {
  const addDirector = () => {
    onChange({ ...data, directors: [...data.directors, { name: '', position: '董事' }] });
  };
  const removeDirector = (index: number) => {
    onChange({ ...data, directors: data.directors.filter((_, i) => i !== index) });
  };
  const updateDirector = (index: number, field: 'name' | 'position', value: string) => {
    const newDirectors = [...data.directors];
    newDirectors[index] = { ...newDirectors[index], [field]: value };
    onChange({ ...data, directors: newDirectors });
  };

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="公司名称"
          value={data.companyName}
          onChange={(v) => onChange({ ...data, companyName: v })}
          placeholder="如：某某股份有限公司"
        />
        <FormInput
          label="会议届次"
          value={data.meetingNumber}
          onChange={(v) => onChange({ ...data, meetingNumber: v })}
          placeholder="如：第一"
        />
      </div>
      <FormInput
        label="会议日期"
        value={data.meetingDate}
        onChange={(v) => onChange({ ...data, meetingDate: v })}
        type="date"
      />
      <div className="border-t border-mck-border pt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-mck-navy/70">董事列表</label>
          <button
            onClick={addDirector}
            className="text-xs px-2 py-1 bg-mck-blue/10 text-mck-blue rounded"
          >
            添加董事
          </button>
        </div>
        {data.directors.map((director, index) => (
          <div key={index} className="flex items-center gap-2 mb-2 bg-mck-bg/30 p-2 rounded">
            <input
              value={director.name}
              onChange={(e) => updateDirector(index, 'name', e.target.value)}
              placeholder="姓名"
              className="flex-1 px-2 py-1 text-xs border border-mck-border rounded"
            />
            <input
              value={director.position}
              onChange={(e) => updateDirector(index, 'position', e.target.value)}
              placeholder="职务"
              className="w-20 px-2 py-1 text-xs border border-mck-border rounded"
            />
            <button
              onClick={() => removeDirector(index)}
              className="p-1 text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// 董事会会议通知表单
const BoardNoticeForm: React.FC<{
  data: BoardNoticeFormData;
  onChange: (data: BoardNoticeFormData) => void;
}> = ({ data, onChange }) => (
  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="公司名称"
        value={data.companyName}
        onChange={(v) => onChange({ ...data, companyName: v })}
        placeholder="如：某某股份有限公司"
      />
      <FormInput
        label="会议届次"
        value={data.meetingNumber}
        onChange={(v) => onChange({ ...data, meetingNumber: v })}
        placeholder="如：第一"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="会议日期"
        value={data.meetingDate}
        onChange={(v) => onChange({ ...data, meetingDate: v })}
        type="date"
      />
      <FormInput
        label="会议时间"
        value={data.meetingTime}
        onChange={(v) => onChange({ ...data, meetingTime: v })}
        placeholder="如：09:00"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        label="联系人"
        value={data.contactName}
        onChange={(v) => onChange({ ...data, contactName: v })}
        placeholder="请输入联系人姓名"
      />
      <FormInput
        label="联系电话"
        value={data.contactPhone}
        onChange={(v) => onChange({ ...data, contactPhone: v })}
        placeholder="请输入联系电话"
      />
    </div>
    <FormInput
      label="审议的议案名称"
      value={data.proposalName}
      onChange={(v) => onChange({ ...data, proposalName: v })}
      placeholder="如：《关于公司中长期发展战略规划的议案》"
    />
    <FormInput
      label="通知落款日期"
      value={data.noticeDate}
      onChange={(v) => onChange({ ...data, noticeDate: v })}
      type="date"
    />
  </div>
);

// 文书表单弹窗
const DocumentFormModal: React.FC<{
  template: DocumentTemplate;
  meetingTitle: string;
  meetingId?: string;
  onClose: () => void;
  onGenerate: (content: string, formData: any) => void | Promise<void>;
  onBatchGenerate: (items: VotingFormData[]) => void | Promise<void>;
}> = ({ template, meetingTitle, meetingId, onClose, onGenerate, onBatchGenerate }) => {
  const [formData, setFormData] = useState<FormData>(() => {
    const today = new Date().toISOString().split('T')[0];
    switch (template.id) {
      case 'voting':
        return {
          meetingDate: today,
          meetingId: meetingId || '',
          meetingTitle,
          shareholderId: '',
          shareholderName: '',
          shares: '',
          shareholding: '',
          votingRights: '',
          proposalId: '',
          proposalNumber: '',
          proposalTitle: '',
        } as VotingFormData;
      case 'voting_stats':
        return { meetingDate: today, meetingTime: '', meetingLocation: '公司会议室', attendeeCount: '', totalShareholders: '', shareholderRatio: '', representedShares: '', votingRatio: '' } as VotingStatsFormData;
      case 'agenda':
        return { meetingDate: today, meetingTime: '' } as AgendaFormData;
      case 'minutes':
        return { meetingDate: today, meetingTime: '', hostName: '', recorderName: '', attendeeCount: '', totalShareholders: '', shareholderRatio: '', representedShares: '', votingRatio: '' } as MinutesFormData;
      case 'notice':
        return { meetingDate: today, meetingTime: '', contactName: '', contactPhone: '', contactEmail: '', attendees: [] } as NoticeFormData;
      case 'resolution':
        return { meetingDate: today, meetingTime: '', attendeeCount: '', totalShareholders: '', shareholderRatio: '', representedShares: '', votingRatio: '', resolutionContent: '' } as ResolutionFormData;
      case 'signin':
        return { meetingDate: today } as SigninFormData;
      case 'proxy':
        return { principalName: '', principalId: '', agentName: '', agentId: '', proxyDate: today } as ProxyFormData;
      case 'proposal':
        return { proposalId: '', proposalName: '', revenue: '', netProfit: '', totalAssets: '', totalLiabilities: '', growthRate: '', eps: '', boardMeetings: '', proposalCount: '', supervisionOpinions: '', budgetTarget: '', auditorName: '', companyName: '', establishedDate: '', registeredCapital: '', legalRepresentative: '', businessScope: '', background: '', content: '', description: '', proposer: '', proposalDate: today } as ProposalFormData;
      case 'board_proposal':
        return { companyName: '', planningPeriod: '', planningYears: '', coreDirection: '', proposalDate: today } as BoardProposalFormData;
      case 'board_voting':
        return { votingDate: today, companyName: '', meetingNumber: '' } as BoardVotingFormData;
      case 'board_minutes':
        return { meetingDate: today, meetingTime: '', companyName: '', meetingNumber: '', attendeeNames: '', convenerName: '', hostName: '', recorderName: '', expectedDirectors: '' } as BoardMinutesFormData;
      case 'board_resolution':
        return { meetingDate: today, meetingTime: '', companyName: '', meetingNumber: '', convenerHostName: '', expectedDirectors: '', resolutionDate: today } as BoardResolutionFormData;
      case 'board_signin':
        return { meetingDate: today, companyName: '', meetingNumber: '', directors: [{ name: '', position: '董事' }] } as BoardSigninFormData;
      case 'board_notice':
        return { meetingDate: today, meetingTime: '', companyName: '', meetingNumber: '', contactName: '', contactPhone: '', proposalName: '', noticeDate: today } as BoardNoticeFormData;
      default:
        return {} as FormData;
    }
  });

  const availableAttendees = getAttendees();
  const [votingContext, setVotingContext] = useState<VotingContext | null>(null);
  const [availableMeetings, setAvailableMeetings] = useState<ApiMeeting[]>([]);
  const [activeMeetingId, setActiveMeetingId] = useState(meetingId || '');
  const [meetingsLoading, setMeetingsLoading] = useState(template.id === 'voting' && !meetingId);
  const [contextLoading, setContextLoading] = useState(template.id === 'voting');
  const [actionLoading, setActionLoading] = useState<'single' | 'batch' | 'vote' | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedOpinion, setSelectedOpinion] = useState<"同意" | "反对" | "弃权" | ''>('');

  useEffect(() => {
    if (template.id !== 'voting') return;
    let active = true;
    setMeetingsLoading(true);
    listMeetingsFromFeishu()
      .then(({ meetings }) => {
        if (active) setAvailableMeetings(meetings);
      })
      .catch((error) => {
        if (active) setActionError(error instanceof Error ? error.message : '飞书会议列表读取失败');
      })
      .finally(() => {
        if (active) setMeetingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [template.id]);

  useEffect(() => {
    if (template.id !== 'voting') return;
    if (!activeMeetingId) {
      setContextLoading(false);
      setVotingContext(null);
      return;
    }
    let active = true;
    setContextLoading(true);
    setActionError('');
    getVotingContext(activeMeetingId)
      .then(({ context }) => {
        if (!active) return;
        setVotingContext(context);
        setFormData((current) => ({
          ...(current as VotingFormData),
          meetingId: activeMeetingId,
          meetingTitle: context.meeting.title || (current as VotingFormData).meetingTitle,
          meetingDate: context.meeting.date || (current as VotingFormData).meetingDate,
          shareholderId: '',
          shareholderName: '',
          shares: '',
          shareholding: '',
          votingRights: '',
          proposalId: '',
          proposalNumber: '',
          proposalTitle: '',
        }));
      })
      .catch((error) => {
        if (active) setActionError(error instanceof Error ? error.message : '飞书数据读取失败');
      })
      .finally(() => {
        if (active) setContextLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeMeetingId, template.id]);

  const handleGenerate = async () => {
    const votingData = formData as VotingFormData;
    if (template.id === 'voting' && (!votingData.shareholderId || !votingData.proposalId)) {
      setActionError('请先选择股东和关联议案。');
      return;
    }
    setActionError('');
    setActionMessage('');
    setActionLoading('single');
    const contentMeetingTitle = template.id === 'voting'
      ? votingData.meetingTitle || votingContext?.meeting.title || meetingTitle
      : meetingTitle;
    const content = generateDocumentContent(contentMeetingTitle, template.id, template.name, formData);
    try {
      await onGenerate(content, formData);
      if (template.id === 'voting') {
        setActionMessage('空白表决票已生成，并已在飞书“文书表”创建记录。');
      } else {
        onClose();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '文书生成失败');
    } finally {
      setActionLoading(null);
    }
  };

  const selectShareholder = (shareholderId: string) => {
    const shareholder = votingContext?.shareholders.find((item) => item.id === shareholderId);
    setFormData((current) => ({
      ...(current as VotingFormData),
      shareholderId,
      shareholderName: shareholder?.name || '',
      shares: shareholder?.shares || '',
      shareholding: shareholder?.shareholding || '',
      votingRights: shareholder?.votingRights || shareholder?.shares || '',
    }));
  };

  const selectProposal = (proposalId: string) => {
    const proposal = votingContext?.proposals.find((item) => item.id === proposalId);
    setFormData((current) => ({
      ...(current as VotingFormData),
      proposalId,
      proposalNumber: proposal?.number || '',
      proposalTitle: proposal?.title || '',
    }));
  };

  const handleBatchGenerate = async () => {
    if (!votingContext?.shareholders.length) {
      setActionError('飞书“股东表”中没有可用股东。');
      return;
    }
    const current = formData as VotingFormData;
    const proposals = current.proposalId
      ? votingContext.proposals.filter((item) => item.id === current.proposalId)
      : votingContext.proposals;
    if (!proposals.length) {
      setActionError('当前会议没有关联议案，请先在飞书“议案表”添加关联会议。');
      return;
    }
    const items = votingContext.shareholders.flatMap((shareholder) =>
      proposals.map((proposal) => ({
        ...current,
        meetingId: activeMeetingId,
        meetingTitle: votingContext.meeting.title || current.meetingTitle,
        shareholderId: shareholder.id,
        shareholderName: shareholder.name,
        shares: shareholder.shares,
        shareholding: shareholder.shareholding,
        votingRights: shareholder.votingRights || shareholder.shares,
        proposalId: proposal.id,
        proposalNumber: proposal.number,
        proposalTitle: proposal.title,
      })),
    );
    setActionError('');
    setActionMessage('');
    setActionLoading('batch');
    try {
      await onBatchGenerate(items);
      setActionMessage(`已生成 ${items.length} 份空白表决票，并写入飞书“文书表”；没有写入任何表决意见。`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '批量生成失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitVote = async () => {
    const current = formData as VotingFormData;
    if (!current.meetingId || !current.shareholderId || !current.proposalId || !selectedOpinion) {
      setActionError('请先选择股东、议案和真实表决意见。');
      return;
    }
    setActionError('');
    setActionMessage('');
    setActionLoading('vote');
    try {
      const result = await submitVotingOpinion({
        meetingId: current.meetingId,
        shareholderId: current.shareholderId,
        proposalId: current.proposalId,
        opinion: selectedOpinion,
        votingRights: current.votingRights,
      });
      setActionMessage(
        result.vote.action === 'created'
          ? `真实表决“${selectedOpinion}”已写入飞书“表决表”。`
          : `飞书“表决表”中的原表决记录已更新为“${selectedOpinion}”。`,
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '真实表决提交失败');
    } finally {
      setActionLoading(null);
    }
  };

  const renderForm = () => {
    switch (template.id) {
      case 'voting':
        {
          const current = formData as VotingFormData;
          const batchCount = (votingContext?.shareholders.length || 0) *
            (current.proposalId ? 1 : (votingContext?.proposals.length || 0));
          return (
            <div className="space-y-5">
              <div className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-cyan-800">飞书实时数据</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {contextLoading
                        ? '正在读取会议、股东和议案…'
                        : !activeMeetingId
                          ? `已从飞书读取 ${availableMeetings.length} 场会议，请选择一场`
                          : `已读取 ${votingContext?.shareholders.length || 0} 名股东、${votingContext?.proposals.length || 0} 项议案`}
                    </p>
                  </div>
                  {contextLoading ? <Loader2 className="animate-spin text-cyan-700" size={20} /> : <ShieldCheck className="text-emerald-600" size={22} />}
                </div>
                {!!votingContext?.pendingFields.length && (
                  <p className="mt-2 text-xs text-amber-700">
                    飞书仍缺少字段：{votingContext.pendingFields.join('、')}。页面会继续工作，但对应内容可能为空。
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">会议（飞书会议表）</label>
                  <select
                    value={activeMeetingId}
                    onChange={(event) => setActiveMeetingId(event.target.value)}
                    disabled={meetingsLoading}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-600 disabled:bg-slate-50"
                  >
                    <option value="">{meetingsLoading ? '正在读取飞书会议…' : '请选择会议'}</option>
                    {availableMeetings.map((meeting) => (
                      <option key={meeting.id} value={meeting.id}>
                        {meeting.date ? `${meeting.date} · ` : ''}{meeting.title}
                      </option>
                    ))}
                  </select>
                  {!activeMeetingId && !meetingsLoading && (
                    <p className="mt-1.5 text-xs text-amber-700">请在这里选择会议，不需要返回会议列表。</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">会议日期（自动读取）</label>
                  <input value={current.meetingDate} readOnly className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">股东名称（飞书股东表）</label>
                  <select value={current.shareholderId} onChange={(event) => selectShareholder(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-600">
                    <option value="">请选择股东</option>
                    {votingContext?.shareholders.map((shareholder) => <option key={shareholder.id} value={shareholder.id}>{shareholder.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">持股数量（自动带出）</label>
                  <input value={current.shares || (current.shareholding ? `持股比例 ${current.shareholding}` : '')} readOnly placeholder="飞书股东表尚未填写持股数量" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">会议关联议案（自动筛选）</label>
                  <select value={current.proposalId} onChange={(event) => selectProposal(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-600">
                    <option value="">请选择议案</option>
                    {votingContext?.proposals.map((proposal) => <option key={proposal.id} value={proposal.id}>{proposal.number ? `${proposal.number} · ` : ''}{proposal.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900">第一步：生成空白表决票</h4>
                    <p className="mt-1 text-xs text-slate-500">只在“文书表”建记录，不会写入同意、反对或弃权。</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">文书 ≠ 投票</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={handleGenerate} disabled={!!actionLoading || contextLoading} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 disabled:opacity-50">
                    {actionLoading === 'single' ? '正在生成…' : '生成当前股东空白票'}
                  </button>
                  <button onClick={handleBatchGenerate} disabled={!!actionLoading || contextLoading || !batchCount} className="rounded-xl border border-cyan-200 bg-cyan-50 px-5 py-2.5 text-sm font-bold text-cyan-800 transition hover:bg-cyan-100 disabled:opacity-50">
                    {actionLoading === 'batch' ? '正在批量生成…' : `为全部股东批量生成（${batchCount}份）`}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  已选择议案时：每名股东生成 1 份；未选择议案时：为每名股东的每项议案各生成 1 份。
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={20} />
                  <div>
                    <h4 className="font-bold text-slate-900">第二步：收到真实意见后再登记</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-600">只有收到股东真实表决意见后，才在这里选择并确认。确认后才会写入飞书“表决表”。</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {(['同意', '反对', '弃权'] as const).map((opinion) => (
                    <button key={opinion} onClick={() => setSelectedOpinion(opinion)} className={cn("rounded-xl border px-3 py-2.5 text-sm font-bold transition", selectedOpinion === opinion ? "border-amber-500 bg-amber-500 text-white shadow-md" : "border-amber-200 bg-white text-slate-700 hover:border-amber-400")}>{opinion}</button>
                  ))}
                </div>
                <button onClick={handleSubmitVote} disabled={!!actionLoading || !selectedOpinion || !current.shareholderId || !current.proposalId} className="mt-3 w-full rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40">
                  {actionLoading === 'vote' ? '正在写入飞书…' : '确认这是实际投票，并写入表决表'}
                </button>
              </div>
            </div>
          );
        }
      case 'voting_stats':
        return <VotingStatsForm data={formData as VotingStatsFormData} onChange={(d) => setFormData(d)} />;
      case 'agenda':
        return <AgendaForm data={formData as AgendaFormData} onChange={(d) => setFormData(d)} />;
      case 'minutes':
        return <MinutesForm data={formData as MinutesFormData} onChange={(d) => setFormData(d)} />;
      case 'notice':
        return <NoticeForm data={formData as NoticeFormData} onChange={(d) => setFormData(d)} availableAttendees={availableAttendees} />;
      case 'resolution':
        return <ResolutionForm data={formData as ResolutionFormData} onChange={(d) => setFormData(d)} />;
      case 'signin':
        return <SigninForm data={formData as SigninFormData} onChange={(d) => setFormData(d)} />;
      case 'proxy':
        return <ProxyForm data={formData as ProxyFormData} onChange={(d) => setFormData(d)} />;
      case 'proposal':
        return <ProposalForm data={formData as ProposalFormData} onChange={(d) => setFormData(d)} />;
      case 'board_proposal':
        return <BoardProposalForm data={formData as BoardProposalFormData} onChange={(d) => setFormData(d)} />;
      case 'board_voting':
        return <BoardVotingForm data={formData as BoardVotingFormData} onChange={(d) => setFormData(d)} />;
      case 'board_minutes':
        return <BoardMinutesForm data={formData as BoardMinutesFormData} onChange={(d) => setFormData(d)} />;
      case 'board_resolution':
        return <BoardResolutionForm data={formData as BoardResolutionFormData} onChange={(d) => setFormData(d)} />;
      case 'board_signin':
        return <BoardSigninForm data={formData as BoardSigninFormData} onChange={(d) => setFormData(d)} />;
      case 'board_notice':
        return <BoardNoticeForm data={formData as BoardNoticeFormData} onChange={(d) => setFormData(d)} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
      <div className={cn("flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-[0_35px_100px_-20px_rgba(2,16,40,0.55)]", template.id === 'voting' ? "max-w-4xl" : "max-w-2xl")}>
        <div className="relative flex items-center justify-between overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 px-7 py-5">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner">
              <FileText size={21} className="text-cyan-300" />
            </div>
            <div>
              <h3 className="font-bold text-white">{template.name}</h3>
              <p className="mt-0.5 text-[11px] text-slate-300">{template.id === 'voting' ? '飞书数据联动 · 空白文书与真实表决分开处理' : '填写文书信息并生成标准文件'}</p>
            </div>
          </div>
          <button onClick={onClose} className="relative rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-50/70 p-6 md:p-7">
          {actionError && <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 shrink-0" size={17} />{actionError}</div>}
          {actionMessage && <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><Check className="mt-0.5 shrink-0" size={17} />{actionMessage}</div>}
          {renderForm()}
        </div>
        {template.id !== 'voting' && <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            取消
          </button>
          <button
            onClick={handleGenerate}
            disabled={!!actionLoading}
            className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:opacity-50"
          >
            {actionLoading === 'single' ? '生成中…' : '生成文书'}
          </button>
        </div>}
      </div>
    </div>
  );
};

export const DocumentCenter: React.FC<DocumentCenterProps> = ({ meetingId, editEmailFor, onEmailSaved, onEmailClosed, onComplianceReview, onNavigateToKnowledge }) => {
  const [showGenerator, setShowGenerator] = useState(false);
  const [showImporter, setShowImporter] = useState(false); // 文书导入弹窗
  // 文书生成：一级分类（会议/制度）
  const [level1Category, setLevel1Category] = useState<DocumentLevel1Category | null>(null);
  // 二级分类：会议文件(shareholder/board/supervisor) 或 制度文件(governance/strategy/finance/disclosure/risk/management)
  const [level2Category, setLevel2Category] = useState<MeetingCategory | RegulationCategory | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [documentMeetings, setDocumentMeetings] = useState<ApiMeeting[]>([]);
  const [selectedDocumentMeetingId, setSelectedDocumentMeetingId] = useState(meetingId || '');
  const [documentMeetingsLoading, setDocumentMeetingsLoading] = useState(false);
  const [meetingSyncHint, setMeetingSyncHint] = useState('');
  const [meetingHistory, setMeetingHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedTemplates, setExpandedTemplates] = useState(false);
  // 制度文件标题（用于制度文件生成）
  const [regulationTitle, setRegulationTitle] = useState('');
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>(() => {
    const saved = localStorage.getItem("corporate_generated_docs");
    return saved ? JSON.parse(saved) : [];
  });
  const [emails, setEmails] = useState<EmailDocument[]>(() => {
    const saved = localStorage.getItem("corporate_generated_emails");
    return saved ? JSON.parse(saved) : [];
  });
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);
  const [formTemplate, setFormTemplate] = useState<DocumentTemplate | null>(null);
  const [packageBusyKey, setPackageBusyKey] = useState<string | null>(null);
  // 制度文件编辑弹窗状态
  const [showRegulationEditor, setShowRegulationEditor] = useState(false);
  const [regulationEditContent, setRegulationEditContent] = useState('');
  const [regulationEditDoc, setRegulationEditDoc] = useState<GeneratedDocument | null>(null);
  // 合规审查结果状态
  const [complianceResults, setComplianceResults] = useState<Record<string, ComplianceResult>>(() => {
    const saved = localStorage.getItem("corporate_doc_compliance_results");
    return saved ? JSON.parse(saved) : {};
  });
  // 导入规则文件库弹窗状态
  const [showImportRuleLibrary, setShowImportRuleLibrary] = useState(false);
  const [ruleLibraryDocToImport, setRuleLibraryDocToImport] = useState<GeneratedDocument | null>(null);
  // 导入成功/更新结果弹窗状态
  const [showImportResult, setShowImportResult] = useState(false);
  const [importResultType, setImportResultType] = useState<'imported' | 'updated'>('imported');
  // 已导入规则文件库的制度文件列表（包含内容hash用于检测更新）
  const [importedRuleDocs, setImportedRuleDocs] = useState<GeneratedDocument[]>(() => {
    const saved = localStorage.getItem("corporate_imported_rule_docs");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    let active = true;
    if (!meetingId?.startsWith("rec")) {
      setMeetingSyncHint("");
      return () => {
        active = false;
      };
    }

    setMeetingSyncHint("正在读取飞书会议");
    getMeetingFromFeishu(meetingId)
      .then(({ meeting }) => {
        if (!active) return;
        setMeetingTitle(meeting.title);
        setMeetingSyncHint(`已载入飞书会议：${meeting.title}`);
      })
      .catch((error) => {
        if (!active) return;
        setMeetingSyncHint(error instanceof Error ? error.message : "飞书会议读取失败");
      });

    return () => {
      active = false;
    };
  }, [meetingId]);

  useEffect(() => {
    if (!showGenerator || level1Category !== 'meeting') return;
    let active = true;
    setDocumentMeetingsLoading(true);
    listMeetingsFromFeishu()
      .then(({ meetings }) => {
        if (active) setDocumentMeetings(meetings);
      })
      .catch(() => {
        if (active) setDocumentMeetings([]);
      })
      .finally(() => {
        if (active) setDocumentMeetingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showGenerator, level1Category]);

  const selectDocumentMeeting = (recordId: string) => {
    setSelectedDocumentMeetingId(recordId);
    const selected = documentMeetings.find((item) => item.id === recordId);
    setMeetingTitle(selected?.title || '');
  };

  const meetingsForCategory = (category: MeetingCategory) => documentMeetings.filter((item) => {
    if (category === 'shareholder') return item.type.includes('股东');
    if (category === 'board') return item.type.includes('董事');
    if (category === 'supervisor') return item.type.includes('监事');
    return true;
  });

  // 监听合规审查完成事件，更新审查结果
  useEffect(() => {
    const handleComplianceReviewComplete = (event: CustomEvent<{ docId: string; score: number; reviewRecordId: string }>) => {
      const { docId, score, reviewRecordId } = event.detail;
      const result: ComplianceResult = { docId, score, reviewRecordId };
      setComplianceResults(prev => ({ ...prev, [docId]: result }));
    };

    window.addEventListener('compliance-review-complete', handleComplianceReviewComplete as EventListener);
    return () => {
      window.removeEventListener('compliance-review-complete', handleComplianceReviewComplete as EventListener);
    };
  }, []);

  // 监听会议纪要导入事件
  useEffect(() => {
    const handleMinutesImported = (event: Event) => {
      const customEvent = event as CustomEvent<ImportedMinutesRecord>;
      const importedRecord = customEvent.detail;

      if (!importedRecord || !importedRecord.title || !importedRecord.sourceRecordId) return;

      // 防重复检查：检查是否已存在相同的 sourceRecordId
      const existingCheck = localStorage.getItem("corporate_generated_docs");
      if (existingCheck) {
        const existingDocs: GeneratedDocument[] = JSON.parse(existingCheck);
        if (existingDocs.some(doc => doc.sourceRecordId === importedRecord.sourceRecordId)) {
          return; // 已存在，跳过
        }
      }

      // 创建导入的文书记录
      const newDoc: GeneratedDocument = {
        id: `minutes-imported-${importedRecord.id || Date.now()}`,
        name: importedRecord.title,
        type: 'minutes',
        typeName: '会议纪要',
        meetingTitle: importedRecord.title,
        meetingType: 'shareholder',
        level1Category: 'meeting',
        level2Category: 'shareholder',
        date: importedRecord.date,
        content: importedRecord.content,
        isImportedMinutes: true,
        sourceRecordId: importedRecord.sourceRecordId,
      };

      // 添加到文书列表并保存到 localStorage
      setGeneratedDocs(prev => {
        const updated = [newDoc, ...prev];
        localStorage.setItem("corporate_generated_docs", JSON.stringify(updated));
        return updated;
      });
    };

    window.addEventListener('minutes-imported', handleMinutesImported);
    return () => {
      window.removeEventListener('minutes-imported', handleMinutesImported);
    };
  }, []);

  // 监听会议纪要从RecordingWorkspace的更新
  useEffect(() => {
    const handleMinutesUpdate = (event: CustomEvent<{ recordId: string; content: string; title: string }>) => {
      const { recordId, content, title } = event.detail;
      setGeneratedDocs(prev => {
        const updated = prev.map(doc => {
          if (doc.sourceRecordId === recordId && doc.isImportedMinutes) {
            return { ...doc, content, name: title, meetingTitle: title };
          }
          return doc;
        });
        localStorage.setItem("corporate_generated_docs", JSON.stringify(updated));
        return updated;
      });
    };

    window.addEventListener('minutes-record-updated', handleMinutesUpdate as EventListener);
    return () => {
      window.removeEventListener('minutes-record-updated', handleMinutesUpdate as EventListener);
    };
  }, []);

  // 会议纪要编辑弹窗状态
  const [showMinutesEditor, setShowMinutesEditor] = useState(false);
  const [editingMinutes, setEditingMinutes] = useState<GeneratedDocument | null>(null);
  const [minutesEditContent, setMinutesEditContent] = useState("");
  const [minutesEditTitle, setMinutesEditTitle] = useState("");

  // 打开会议纪要编辑器
  const openMinutesEditor = (doc: GeneratedDocument) => {
    setEditingMinutes(doc);
    setMinutesEditContent(doc.content || "");
    setMinutesEditTitle(doc.name || doc.meetingTitle);
    setShowMinutesEditor(true);
  };

  // 保存会议纪要编辑
  const saveMinutesEdit = () => {
    if (!editingMinutes) return;

    // 更新文书列表
    setGeneratedDocs(prev => {
      const updated = prev.map(doc => {
        if (doc.id === editingMinutes.id) {
          return {
            ...doc,
            content: minutesEditContent,
            name: minutesEditTitle,
            meetingTitle: minutesEditTitle,
          };
        }
        return doc;
      });
      localStorage.setItem("corporate_generated_docs", JSON.stringify(updated));
      return updated;
    });

    // 同步更新RecordingWorkspace中的记录
    if (editingMinutes.sourceRecordId) {
      window.dispatchEvent(new CustomEvent('minutes-document-center-update', {
        detail: {
          recordId: editingMinutes.sourceRecordId,
          content: minutesEditContent,
          title: minutesEditTitle,
        }
      }));

      // 同时更新导入会议纪要存储
      const minutesStorageKey = "corporate_meeting_minutes_imported";
      const saved = localStorage.getItem(minutesStorageKey);
      if (saved) {
        const existingMinutes: ImportedMinutesRecord[] = JSON.parse(saved);
        const updatedMinutes = existingMinutes.map(m => {
          if (m.sourceRecordId === editingMinutes.sourceRecordId) {
            return { ...m, content: minutesEditContent, title: minutesEditTitle, lastModified: new Date().toISOString() };
          }
          return m;
        });
        localStorage.setItem(minutesStorageKey, JSON.stringify(updatedMinutes));
      }
    }

    setShowMinutesEditor(false);
    setEditingMinutes(null);
  };

  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [editingEmail, setEditingEmail] = useState<EmailDocument | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // 监听邮件编辑请求
  useEffect(() => {
    if (editEmailFor) {
      // 创建新邮件
      const newEmail: EmailDocument = {
        id: `email-${Date.now()}`,
        recipientName: editEmailFor.recipientName,
        recipientEmail: editEmailFor.recipientEmail,
        senderName: editEmailFor.senderName,
        meetingTitle: editEmailFor.meetingTitle,
        meetingDate: editEmailFor.meetingDate,
        meetingTime: editEmailFor.meetingTime,
        meetingLocation: editEmailFor.meetingLocation,
        subject: `关于召开${editEmailFor.meetingTitle}的通知`,
        body: editEmailFor.recipientName === '股东您好' 
          ? `尊敬的股东您好！

现通知您，我司将于${editEmailFor.meetingDate || '____年__月__日'}${editEmailFor.meetingTime ? ' '+editEmailFor.meetingTime : ''}召开${editEmailFor.meetingTitle}，会议地点：${editEmailFor.meetingLocation || '公司会议室'}。

请您准时出席。如有疑问，请与会务联系人联系。

此致
敬礼

${editEmailFor.senderName}
${new Date().toLocaleDateString('zh-CN')}`
          : `${editEmailFor.recipientName}您好！

现通知您，我司将于${editEmailFor.meetingDate || '____年__月__日'}${editEmailFor.meetingTime ? ' '+editEmailFor.meetingTime : ''}召开${editEmailFor.meetingTitle}，会议地点：${editEmailFor.meetingLocation || '公司会议室'}。

请您准时出席。如有疑问，请与会务联系人联系。

此致
敬礼

${editEmailFor.senderName}
${new Date().toLocaleDateString('zh-CN')}`,
        status: 'draft',
        createdAt: new Date().toISOString()
      };
      setEditingEmail(newEmail);
      setShowEmailEditor(true);
    }
  }, [editEmailFor]);

  // 保存邮件到本地存储
  useEffect(() => {
    localStorage.setItem("corporate_generated_emails", JSON.stringify(emails));
  }, [emails]);

  useEffect(() => {
    setMeetingHistory(getMeetingHistory());
  }, []);

  useEffect(() => {
    localStorage.setItem("corporate_generated_docs", JSON.stringify(generatedDocs));
  }, [generatedDocs]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 处理一级分类选择（会议文件/制度文件）
  const handleLevel1CategorySelect = (category: DocumentLevel1Category) => {
    setLevel1Category(category);
    setLevel2Category(null);
    setSelectedTemplate(null);
  };

  // 处理二级分类选择（会议文件分支）
  const handleMeetingCategorySelect = (category: MeetingCategory) => {
    setLevel2Category(category);
    setSelectedTemplate(null);
  };

  // 处理制度文件生成点击 - 弹出编辑框
  const handleRegulationGenerateClick = async (template: DocumentTemplate) => {
    if (!regulationTitle.trim()) {
      alert('请先输入公司名称');
      return;
    }

    // 显示加载提示
    const loadingToast = document.createElement('div');
    loadingToast.className = 'fixed top-4 right-4 bg-mck-blue text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
    loadingToast.innerHTML = '<span class="animate-spin">⟳</span> 正在生成制度文件...';
    document.body.appendChild(loadingToast);

    try {
      // 获取XML文件并解析为可编辑文本
      const xmlFileName = (await import('@/utils/documentGenerator')).regulationXmlFiles[template.id];
      const xmlPath = `/文书xml/制度类/${xmlFileName}`;
      const response = await fetch(xmlPath);
      
      if (!response.ok) {
        throw new Error('制度文件XML不存在');
      }
      
      const xmlContent = await response.text();
      
      // 解析XML为格式化的可编辑文本
      const paragraphs = parseRegulationXmlForEdit(xmlContent, regulationTitle);
      const content = paragraphs.join('\n\n');

      // 创建临时文档记录（未保存状态）
      const tempDoc: GeneratedDocument = {
        id: `temp-${Date.now()}-${template.id}`,
        name: `${regulationTitle}${template.name}`,
        type: template.id,
        typeName: template.name,
        meetingTitle: regulationTitle,
        level1Category: 'regulation',
        level2Category: template.id as RegulationCategory,
        date: new Date().toLocaleDateString('zh-CN'),
        content: content,
        formData: { companyName: regulationTitle }
      };

      // 打开编辑弹窗
      setRegulationEditDoc(tempDoc);
      setRegulationEditContent(content);
      setShowRegulationEditor(true);

      // 移除加载提示
      loadingToast.remove();

    } catch (error) {
      console.error('生成制度文件失败:', error);
      loadingToast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      loadingToast.textContent = '✗ 生成失败，请重试';
      setTimeout(() => loadingToast.remove(), 2000);
    }
  };

  // 解析制度文件XML为可编辑文本（用于编辑弹窗）
  const parseRegulationXmlForEdit = (xml: string, companyName: string): string[] => {
    const paragraphs: string[] = [];
    
    // 移除XML声明
    let content = xml.replace(/<\?xml[^>]*\?>/g, '');
    
    // 替换公司名称
    content = content.replace(/某股份有限公司/g, companyName);
    
    // 解析标题
    const titleMatch = content.match(/<Title>(.*?)<\/Title>/);
    if (titleMatch) {
      paragraphs.push(`【${titleMatch[1]}】`);
    }
    
    // 解析章节和条款
    const chapterRegex = /<Chapter id="(\d+)" name="([^"]+)">([\s\S]*?)<\/Chapter>/g;
    let chapterMatch;
    while ((chapterMatch = chapterRegex.exec(content)) !== null) {
      const chapterName = chapterMatch[2];
      const chapterContent = chapterMatch[3];
      
      // 添加章节标题
      paragraphs.push(`【${chapterName}】`);
      
      // 解析条款
      const articleRegex = /<Article id="(\d+)">(.*?)<\/Article>/gs;
      let articleMatch;
      while ((articleMatch = articleRegex.exec(chapterContent)) !== null) {
        let articleText = articleMatch[2];
        // 解析子条款
        articleText = articleText.replace(/<Clause>/g, '\n    ');
        articleText = articleText.replace(/<\/Clause>/g, '');
        // 移除多余标签
        articleText = articleText.replace(/<[^>]+>/g, '');
        // 清理多余空白
        articleText = articleText.replace(/\s+/g, ' ').trim();
        
        if (articleText) {
          paragraphs.push(`第${articleMatch[1]}条 ${articleText}`);
        }
      }
    }
    
    // 解析底部信息
    const issuerMatch = content.match(/<Issuer>(.*?)<\/Issuer>/);
    const dateMatch = content.match(/<Date>(.*?)<\/Date>/);
    if (issuerMatch && dateMatch) {
      paragraphs.push(`\n${issuerMatch[1]}`);
      paragraphs.push(`${dateMatch[1]}`);
    }
    
    return paragraphs.filter(p => p.trim());
  };

  // 保存制度文件
  const handleRegulationSave = () => {
    if (!regulationEditDoc) return;
    
    // 直接更新原文档，保留原ID
    const updatedDoc: GeneratedDocument = {
      ...regulationEditDoc,
      content: regulationEditContent,
      date: new Date().toLocaleDateString('zh-CN')
    };
    
    // 更新文书列表中的对应文档
    setGeneratedDocs(prev => prev.map(d => d.id === regulationEditDoc.id ? updatedDoc : d));
    setShowRegulationEditor(false);
    setRegulationEditDoc(null);
    setRegulationEditContent('');
    
    // 显示"已保存"提示
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
    toast.innerHTML = '<span>✓</span> 已保存';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  // 导出制度文件为Word
  const handleRegulationExport = async () => {
    if (!regulationEditDoc) return;
    
    try {
      const blob = await generateRegulationWord(
        regulationEditDoc.type, 
        regulationEditDoc.meetingTitle, 
        regulationEditDoc.typeName
      );
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${regulationEditDoc.name}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  // 生成内容hash用于检测更新
  const generateContentHash = (content: string): string => {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  };

  // 检查制度文件是否已导入
  const checkRegulationImported = (doc: GeneratedDocument): { imported: boolean; contentChanged: boolean; existingDoc?: GeneratedDocument } => {
    const existingDoc = importedRuleDocs.find(d => d.name === doc.name);
    if (!existingDoc) {
      return { imported: false, contentChanged: false };
    }
    // 比较内容hash
    const existingHash = generateContentHash(existingDoc.content || '');
    const newHash = generateContentHash(doc.content || '');
    return {
      imported: true,
      contentChanged: existingHash !== newHash,
      existingDoc
    };
  };

  // 打开导入规则文件库确认弹窗
  const handleOpenImportRuleLibrary = (doc: GeneratedDocument) => {
    setRuleLibraryDocToImport(doc);
    setShowImportRuleLibrary(true);
  };

  // 确认导入规则文件库
  const handleConfirmImportRuleLibrary = () => {
    if (!ruleLibraryDocToImport) return;
    
    const checkResult = checkRegulationImported(ruleLibraryDocToImport);
    const isUpdate = checkResult.imported && checkResult.contentChanged;
    
    // 创建新的规则文档
    const newRuleDoc: GeneratedDocument = {
      ...ruleLibraryDocToImport,
      id: `rule-${Date.now()}`,
      content: ruleLibraryDocToImport.content
    };
    
    let updatedRuleDocs: GeneratedDocument[];
    if (isUpdate) {
      // 更新已存在的文档
      updatedRuleDocs = importedRuleDocs.map(d => 
        d.name === ruleLibraryDocToImport.name ? { ...newRuleDoc, id: d.id } : d
      );
    } else {
      // 添加新文档（去除已存在的同名文档）
      updatedRuleDocs = [newRuleDoc, ...importedRuleDocs.filter(d => d.name !== ruleLibraryDocToImport.name)];
    }
    
    setImportedRuleDocs(updatedRuleDocs);
    localStorage.setItem("corporate_imported_rule_docs", JSON.stringify(updatedRuleDocs));
    
    // 关闭确认弹窗
    setShowImportRuleLibrary(false);
    setRuleLibraryDocToImport(null);
    
    // 显示导入/更新结果弹窗
    setImportResultType(isUpdate ? 'updated' : 'imported');
    setShowImportResult(true);
  };

  // 关闭导入结果弹窗
  const handleCloseImportResult = () => {
    setShowImportResult(false);
  };

  // 查看导入结果，跳转到规则文件库
  const handleViewImportResult = () => {
    setShowImportResult(false);
    onNavigateToKnowledge?.();
  };

  // 取消导入规则文件库
  const handleCancelImportRuleLibrary = () => {
    setShowImportRuleLibrary(false);
    setRuleLibraryDocToImport(null);
  };

  const handleGenerateClick = (template: DocumentTemplate) => {
    if (!meetingTitle.trim() && template.id !== 'voting') {
      alert('请先输入会议标题');
      return;
    }
    setFormTemplate(template);
  };

  const handleGenerateDocument = async (content: string, formData?: any) => {
    if (!formTemplate) return;

    // 根据文书模板id判断会议类型
    const isRegulationTemplate = regulationTemplates.some(t => t.id === formTemplate.id);

    if (isRegulationTemplate) {
      // 制度文件生成
      const newDoc: GeneratedDocument = {
        id: `doc-${Date.now()}-${formTemplate.id}`,
        name: `${regulationTitle}${formTemplate.name}`,
        type: formTemplate.id,
        typeName: formTemplate.name,
        meetingTitle: regulationTitle,
        level1Category: 'regulation',
        level2Category: formTemplate.id as RegulationCategory,
        date: new Date().toLocaleDateString('zh-CN'),
        content: content,
        formData: formData
      };
      setGeneratedDocs(prev => [newDoc, ...prev]);
      setFormTemplate(null);
      setRegulationTitle('');
    } else {
      // 会议文件生成
      const meetingType = documentTypeMeetingType[formTemplate.id] || 'shareholder';
      const votingData = formTemplate.id === 'voting' ? formData as VotingFormData : null;
      const effectiveMeetingTitle = votingData?.meetingTitle || meetingTitle;
      if (!effectiveMeetingTitle.trim()) return;
      const documentName = votingData
        ? `${effectiveMeetingTitle}-${votingData.shareholderName}-${votingData.proposalTitle || '表决事项'}表决票`
        : `${effectiveMeetingTitle}${formTemplate.name}`;

      const newDoc: GeneratedDocument = {
        id: `doc-${Date.now()}-${formTemplate.id}`,
        name: documentName,
        type: formTemplate.id,
        typeName: formTemplate.name,
        meetingTitle: effectiveMeetingTitle,
        meetingType: meetingType,
        level1Category: 'meeting',
        level2Category: meetingType,
        date: new Date().toLocaleDateString('zh-CN'),
        content: content,
        formData: formData,
        syncStatus: votingData ? 'local' : undefined,
      };

      if (votingData) {
        const result = await createVotingDocument({
          meetingId: votingData.meetingId,
          shareholderId: votingData.shareholderId,
          shareholderName: votingData.shareholderName,
          proposalId: votingData.proposalId,
          proposalTitle: votingData.proposalTitle,
          title: documentName,
          content,
        });
        newDoc.feishuRecordId = result.document.recordId;
        newDoc.syncStatus = 'synced';
      }

      saveMeetingTitle(effectiveMeetingTitle);
      setMeetingHistory(getMeetingHistory());

      setGeneratedDocs(prev => [newDoc, ...prev]);
      if (!votingData) setFormTemplate(null);
    }
  };

  const handleBatchGenerateVotingDocuments = async (items: VotingFormData[]) => {
    if (!formTemplate || formTemplate.id !== 'voting' || !items.length) return;
    const createdDocs: GeneratedDocument[] = [];

    // 分小批写入，避免一次性请求过多触发飞书接口限流。
    for (let index = 0; index < items.length; index += 5) {
      const group = items.slice(index, index + 5);
      const groupDocs = await Promise.all(group.map(async (item, offset) => {
        const effectiveMeetingTitle = item.meetingTitle || meetingTitle;
        const content = generateDocumentContent(effectiveMeetingTitle, 'voting', '表决票', item);
        const name = `${effectiveMeetingTitle}-${item.shareholderName}-${item.proposalTitle || '表决事项'}表决票`;
        const result = await createVotingDocument({
          meetingId: item.meetingId,
          shareholderId: item.shareholderId,
          shareholderName: item.shareholderName,
          proposalId: item.proposalId,
          proposalTitle: item.proposalTitle,
          title: name,
          content,
        });
        return {
          id: `doc-${Date.now()}-${index + offset}-voting`,
          name,
          type: 'voting',
          typeName: '表决票',
          meetingTitle: effectiveMeetingTitle,
          meetingType: 'shareholder' as const,
          level1Category: 'meeting' as const,
          level2Category: 'shareholder' as const,
          date: new Date().toLocaleDateString('zh-CN'),
          content,
          formData: item,
          feishuRecordId: result.document.recordId,
          syncStatus: 'synced' as const,
        };
      }));
      createdDocs.push(...groupDocs);
    }

    const selectedMeetingTitle = items[0]?.meetingTitle || meetingTitle;
    saveMeetingTitle(selectedMeetingTitle);
    setMeetingHistory(getMeetingHistory());
    setGeneratedDocs((previous) => [...createdDocs, ...previous]);
  };

  const handleSelectHistory = (title: string) => {
    setMeetingTitle(title);
    setShowHistory(false);
  };

  const collectMeetingPackageValues = (docs: GeneratedDocument[]) => {
    const formItems = docs.map(doc => doc.formData || {});
    const firstValue = (...keys: string[]) => {
      for (const data of formItems) {
        for (const key of keys) {
          const value = data[key];
          if (value !== undefined && value !== null && String(value).trim()) return value;
        }
      }
      return undefined;
    };
    const attendees = formItems
      .flatMap(data => Array.isArray(data.attendees) ? data.attendees : [])
      .map(attendee => attendee?.name)
      .filter(Boolean)
      .join('、');

    return {
      '公司主体表.公司名称': firstValue('companyName'),
      '会议表.时间|日期': firstValue('meetingDate'),
      '会议表.时间|时间': firstValue('meetingTime'),
      '会议表.会议地点': firstValue('meetingLocation', 'location'),
      '会议表.主持人': firstValue('hostName', 'chairmanName'),
      '会议表.记录人': firstValue('recorderName'),
      '会议表.会务联系人': firstValue('contactName'),
      '会议表.会务联系电话': firstValue('contactPhone'),
      '会议表.会务邮箱': firstValue('contactEmail'),
      '会议表.参会人员': attendees || undefined,
      '人员汇总.应到人数': firstValue('expectedAttendeeCount', 'requiredCount'),
      '人员汇总.实到人数': firstValue('attendeeCount', 'actualCount'),
      '股东汇总.股东总数': firstValue('totalShareholders'),
      '股东汇总.出席股份比例': firstValue('shareholderRatio', 'votingRatio'),
      '股东汇总.出席表决权股份数': firstValue('representedShares'),
      '议案表.议案标题': firstValue('proposalTitle'),
      '议案表.议案正文': firstValue('proposalContent', 'resolutionContent'),
    };
  };

  const handleDownloadFullPackage = async (
    title: string,
    meetingType: MeetingPackageType,
    docs: GeneratedDocument[] = [],
  ) => {
    if (!title.trim()) {
      alert('请先输入会议标题');
      return;
    }

    const busyKey = `${meetingType}:${title}`;
    setPackageBusyKey(busyKey);
    try {
      const result = await requestMeetingPackage({
        meetingId: selectedDocumentMeetingId || meetingId || undefined,
        meetingTitle: title.trim(),
        meetingType,
        values: collectMeetingPackageValues(docs),
      });
      saveMeetingTitle(title.trim());
      setMeetingHistory(getMeetingHistory());
      downloadMeetingPackage(result.downloadUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : '生成会议档案失败');
    } finally {
      setPackageBusyKey(null);
    }
  };

  const handleDownload = async (doc: GeneratedDocument) => {
    // 使用Word文档生成器
    try {
      let blob: Blob;
      
      // 判断是否为制度文件
      if (doc.level1Category === 'regulation') {
        // 制度文件：使用 generateRegulationWord
        blob = await generateRegulationWord(doc.type, doc.meetingTitle, doc.typeName);
      } else {
        // 会议文件：使用 generateWordDocument
        blob = await generateWordDocument(doc.type, doc.meetingTitle, doc.formData);
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      // 如果Word生成失败，使用文本下载
      console.log('Word generation failed, using text fallback');
      downloadDocument(doc);
    }
  };

  const handleDelete = (docId: string) => {
    setGeneratedDocs(prev => prev.filter(d => d.id !== docId));
  };

  const handleDeleteGroup = (type: string) => {
    const docs = groupedDocs[type] || [];
    if (docs.length > 0) {
      setGeneratedDocs(prev => prev.filter(d => d.type !== type));
    }
  };

  // 删除指定会议的所有文书
  const handleDeleteMeeting = (meetingTitle: string) => {
    setGeneratedDocs(prev => prev.filter(d => d.meetingTitle !== meetingTitle));
  };

  // 跳转到合规审查
  const handleComplianceReview = (doc: GeneratedDocument) => {
    onComplianceReview?.(doc.id);
  };

  // 保存合规审查结果
  const saveComplianceResult = (docId: string, score: number, reviewRecordId?: string) => {
    const result: ComplianceResult = { docId, score, reviewRecordId };
    setComplianceResults(prev => {
      const updated = { ...prev, [docId]: result };
      localStorage.setItem("corporate_doc_compliance_results", JSON.stringify(updated));
      return updated;
    });
  };

  // 按文书类型分组
  const groupedDocs = useMemo(() => {
    const groups: Record<string, GeneratedDocument[]> = {
      notice: [],
      agenda: [],
      voting: [],
      voting_stats: [],
      resolution: [],
      minutes: [],
      signin: [],
      proxy: [],
      proposal: [],
    };

    generatedDocs.forEach(doc => {
      if (groups[doc.type]) {
        groups[doc.type].push(doc);
      }
    });

    return groups;
  }, [generatedDocs]);

  // 按会议分组
  const groupedByMeeting = useMemo(() => {
    const groups: Record<string, { docs: GeneratedDocument[], emails: EmailDocument[] }> = {};
    
    // 只处理会议文件，排除制度文件
    generatedDocs.forEach(doc => {
      if (doc.level1Category === 'regulation') return; // 跳过制度文件
      
      const key = doc.meetingTitle;
      if (!groups[key]) {
        groups[key] = { docs: [], emails: [] };
      }
      groups[key].docs.push(doc);
    });

    // 合并邮件
    emails.forEach(email => {
      const key = email.meetingTitle;
      if (!groups[key]) {
        groups[key] = { docs: [], emails: [] };
      }
      groups[key].emails.push(email);
    });

    return groups;
  }, [generatedDocs, emails]);

  // 文书导入弹窗状态
  const [importFile, setImportFile] = useState<File | null>(null);
  // 文书导入：一级分类
  const [importLevel1Category, setImportLevel1Category] = useState<DocumentLevel1Category>('meeting');
  const [importMeetingCategory, setImportMeetingCategory] = useState<MeetingCategory>('shareholder');
  const [importRegulationCategory, setImportRegulationCategory] = useState<RegulationCategory | ''>('');
  const [importDocType, setImportDocType] = useState<string>('agenda');
  const [importDocName, setImportDocName] = useState('');
  const [importMeetingTitle, setImportMeetingTitle] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showMeetingDropdown, setShowMeetingDropdown] = useState(false);
  const [showRegulationDropdown, setShowRegulationDropdown] = useState(false);
  const meetingDropdownRef = useRef<HTMLDivElement>(null);
  const regulationDropdownRef = useRef<HTMLDivElement>(null);

  // 一级分类选项
  const level1CategoryOptions = [
    { id: 'meeting', name: '会议文件' },
    { id: 'regulation', name: '制度文件' },
  ];

  // 会议类型选项
  const meetingCategoryOptions = [
    { id: 'shareholder', name: '股东会' },
    { id: 'board', name: '董事会' },
    { id: 'supervisor', name: '监事会' },
    { id: 'other', name: '其他' },
  ];

  // 各会议类型的文书类型选项
  const getDocTypesByCategory = (category: string) => {
    if (category === 'shareholder') {
      return [
        { id: 'voting', name: '表决票' },
        { id: 'voting_stats', name: '表决统计表' },
        { id: 'agenda', name: '大会议程' },
        { id: 'minutes', name: '会议记录' },
        { id: 'notice', name: '会议通知' },
        { id: 'resolution', name: '决议' },
        { id: 'signin', name: '签到表' },
        { id: 'proxy', name: '委托书' },
        { id: 'proposal', name: '议案' },
      ];
    }
    if (category === 'board') {
      return [
        { id: 'board_proposal', name: '议案' },
        { id: 'board_voting', name: '表决票' },
        { id: 'board_minutes', name: '会议记录' },
        { id: 'board_resolution', name: '决议' },
        { id: 'board_signin', name: '签到表' },
        { id: 'board_notice', name: '会议通知' },
      ];
    }
    if (category === 'supervisor') {
      return [
        { id: 'supervisor_notice', name: '会议通知及回执' },
        { id: 'supervisor_signin', name: '签到表' },
        { id: 'supervisor_voting', name: '表决票' },
        { id: 'supervisor_resolution', name: '会议决议' },
        { id: 'supervisor_minutes', name: '会议记录' },
        { id: 'supervisor_proposal', name: '议案' },
      ];
    }
    return [];
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      // 自动填充文件名（去掉扩展名）
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      if (!importDocName) {
        setImportDocName(fileName);
      }
    }
  };

  // 处理会议类型变更
  const handleMeetingCategoryChange = (category: MeetingCategory) => {
    setImportMeetingCategory(category);
    if (category === 'shareholder') {
      setImportDocType('agenda'); // 股东会默认选择大会议程
    } else if (category === 'board') {
      setImportDocType('board_notice'); // 董事会默认选择会议通知
    } else if (category === 'supervisor') {
      setImportDocType('supervisor_notice');
    } else {
      setImportDocType(''); // 其他会议类型清空文书类型
    }
  };

  // 处理导入
  const handleImport = async () => {
    if (!importFile || !importDocName) return;
    if (importLevel1Category === 'meeting' && (!importMeetingTitle || !importDocType)) return;
    if (importLevel1Category === 'regulation' && !importRegulationCategory) return;

    setIsImporting(true);

    try {
      // 读取文件内容
      const content = await importFile.text();

      if (importLevel1Category === 'regulation') {
        // 制度文件导入
        const regulationTemplate = regulationTemplates.find(t => t.id === importRegulationCategory);
        const newDoc: GeneratedDocument = {
          id: `imported-${Date.now()}`,
          name: importDocName,
          type: importRegulationCategory as string,
          typeName: regulationTemplate?.name || importDocName,
          meetingTitle: importDocName,
          level1Category: 'regulation',
          level2Category: importRegulationCategory as RegulationCategory,
          date: new Date().toISOString().split('T')[0],
          content: content,
        };
        setGeneratedDocs(prev => {
          const updated = [newDoc, ...prev];
          localStorage.setItem("corporate_generated_docs", JSON.stringify(updated));
          return updated;
        });
      } else {
        // 会议文件导入
        const newDoc: GeneratedDocument = {
          id: `imported-${Date.now()}`,
          name: importDocName,
          type: importDocType,
          typeName: getDocTypesByCategory(importMeetingCategory).find(d => d.id === importDocType)?.name || importDocType,
          meetingTitle: importMeetingTitle,
          meetingType: importMeetingCategory,
          level1Category: 'meeting',
          level2Category: importMeetingCategory,
          date: new Date().toISOString().split('T')[0],
          content: content,
        };

        // 添加到文档列表
        setGeneratedDocs(prev => {
          const updated = [newDoc, ...prev];
          localStorage.setItem("corporate_generated_docs", JSON.stringify(updated));
          return updated;
        });

        // 保存到会议历史
        if (!meetingHistory.includes(importMeetingTitle)) {
          const newHistory = [importMeetingTitle, ...meetingHistory].slice(0, 20);
          setMeetingHistory(newHistory);
          localStorage.setItem("corporate_meeting_history", JSON.stringify(newHistory));
        }
      } // 🚨🚨🚨 就是这里！之前你的代码漏掉了这个用来关闭 else 的大括号！

      // 关闭弹窗并重置
      setShowImporter(false);
      setImportFile(null);
      setImportDocName('');
      setImportMeetingTitle('');
      setImportDocType('agenda');
      setImportLevel1Category('meeting');
      setImportMeetingCategory('shareholder');
      setImportRegulationCategory('');
    } catch (error) {
      console.error('导入失败:', error);
    } finally {
      setIsImporting(false);
    }
  };

  // 关闭导入弹窗
  const closeImporter = () => {
    setShowImporter(false);
    setImportFile(null);
    setImportDocName('');
    setImportMeetingTitle('');
    setImportDocType('agenda');
    setImportLevel1Category('meeting');
    setImportMeetingCategory('shareholder');
    setImportRegulationCategory('');
    setShowMeetingDropdown(false);
    setShowRegulationDropdown(false);
  };

  // 处理一级分类变更
  const handleImportLevel1Change = (category: DocumentLevel1Category) => {
    setImportLevel1Category(category);
    setImportMeetingCategory('shareholder');
    setImportRegulationCategory('');
    setImportDocType('');
    setShowMeetingDropdown(false);
    setShowRegulationDropdown(false);
  };

  // 点击外部关闭会议类型下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (meetingDropdownRef.current && !meetingDropdownRef.current.contains(e.target as Node)) {
        setShowMeetingDropdown(false);
      }
      if (regulationDropdownRef.current && !regulationDropdownRef.current.contains(e.target as Node)) {
        setShowRegulationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 文书类型显示名称映射
  const docTypeNames: Record<string, string> = {
    voting: '表决票',
    voting_stats: '表决统计表',
    agenda: '大会议程',
    minutes: '会议记录',
    notice: '会议通知',
    resolution: '决议',
    signin: '签到表',
    proxy: '委托书',
    proposal: '议案',
  };

  // 支持合规审查的文书类型
  const complianceReviewableTypes = ['agenda', 'notice', 'resolution', 'proxy', 'board_resolution'];

  // 邮件编辑弹窗组件
  const EmailEditorModal: React.FC<{
    email: EmailDocument;
    onClose: () => void;
    onSave: (email: EmailDocument) => void;
    onExport: (email: EmailDocument) => void;
  }> = ({ email, onClose, onSave, onExport }) => {
    const [editingContent, setEditingContent] = useState(email.body);
    const [isEditing, setIsEditing] = useState(false);

    // 保存编辑内容
    const handleSave = () => {
      const updatedEmail = { ...email, body: editingContent };
      onSave(updatedEmail);
      setIsEditing(false);
    };

    // 邮件状态
    const isSent = email.status === 'sent' || email.status === 'recalled';

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-3xl h-[85vh] rounded-xl shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-mck-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-mck-blue/10 flex items-center justify-center">
                <Mail size={20} className="text-mck-blue" />
              </div>
              <div>
                <h3 className="font-medium text-mck-navy">邮件编辑</h3>
                <p className="text-[10px] text-mck-navy/40">
                  {isSent ? '已发送' : email.status === 'recalled' ? '已撤回' : '草稿'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {email.status === 'draft' && !isEditing && !isSent && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-mck-navy/60 hover:text-mck-blue border border-mck-border/50 hover:border-mck-blue/50 rounded transition-colors"
                >
                  <Edit3 size={12} />
                  编辑
                </button>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-mck-blue hover:bg-mck-navy rounded transition-colors"
                  >
                    <Save size={12} />
                    保存
                  </button>
                  <button
                    onClick={() => { setEditingContent(email.body); setIsEditing(false); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-mck-navy/60 hover:text-mck-navy border border-mck-border/50 hover:border-mck-border rounded transition-colors"
                  >
                    <Undo2 size={12} />
                    撤销
                  </button>
                </>
              )}
              {!isEditing && email.status !== 'draft' && (
                <span className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 bg-gray-100 rounded">
                  <Check size={12} />
                  {email.status === 'sent' ? '已发送' : '已撤回'}
                </span>
              )}
              {!isEditing && email.status === 'draft' && (
                <button
                  onClick={() => onExport(email)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-mck-navy/60 hover:text-mck-blue border border-mck-border/50 hover:border-mck-blue/50 rounded transition-colors"
                >
                  <Download size={12} />
                  导出
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 hover:bg-mck-bg rounded-full ml-2"
              >
                <X size={20} className="text-mck-navy/60" />
              </button>
            </div>
          </div>
          
          {/* 邮件信息头部 */}
          <div className="px-6 py-3 bg-mck-bg/30 border-b border-mck-border">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-mck-navy/40 mr-2">发件人：</span>
                <span className="text-mck-navy">{email.senderName}</span>
              </div>
              <div>
                <span className="text-mck-navy/40 mr-2">收件人：</span>
                <span className="text-mck-navy">{email.recipientName}</span>
                {email.recipientEmail && <span className="text-mck-navy/40 text-xs ml-1">&lt;{email.recipientEmail}&gt;</span>}
              </div>
              <div>
                <span className="text-mck-navy/40 mr-2">会议：</span>
                <span className="text-mck-navy">{email.meetingTitle}</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-mck-navy/40 mr-2">主题：</span>
              <span className="text-mck-navy">{email.subject}</span>
            </div>
          </div>
          
          {/* 邮件正文 */}
          <div className="flex-1 overflow-auto p-6 bg-mck-bg/30">
            {isEditing ? (
              <textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="w-full h-full min-h-[300px] p-4 border border-mck-border rounded-lg text-sm font-serif leading-loose resize-none focus:outline-none focus:border-mck-blue"
              />
            ) : (
              <pre className="whitespace-pre-wrap font-serif text-base leading-loose text-mck-navy/80 bg-white p-6 rounded-lg border border-mck-border">
                {editingContent}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 邮件操作处理函数
  const handleEmailSave = (email: EmailDocument) => {
    setEmails(prev => {
      const existing = prev.find(e => e.id === email.id);
      if (existing) {
        return prev.map(e => e.id === email.id ? email : e);
      }
      return [email, ...prev];
    });
    onEmailSaved?.(email);
  };

  const handleEmailExport = (email: EmailDocument) => {
    const content = `发件人：${email.senderName}
收件人：${email.recipientName}${email.recipientEmail ? ' <' + email.recipientEmail + '>' : ''}
主题：${email.subject}
日期：${email.createdAt.split('T')[0]}

${email.body}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `会议通知_${email.recipientName}_${email.createdAt.split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 获取同一会议的邮件
  const meetingEmails = useMemo(() => {
    if (!meetingTitle) return [];
    return emails.filter(e => e.meetingTitle === meetingTitle);
  }, [emails, meetingTitle]);

  return (
    <div className="space-y-6">
      {/* 文书导入弹窗 */}
      {showImporter && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-mck-border shrink-0">
              <div className="flex items-center gap-2">
                <Upload size={16} className="text-green-600" />
                <h3 className="font-bold text-sm text-mck-navy">文书导入</h3>
              </div>
              <button onClick={closeImporter} className="p-1 hover:bg-mck-bg rounded">
                <X size={18} className="text-mck-navy/50" />
              </button>
            </div>

            {/* 内容区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* 一级分类选择 - 会议文件/制度文件 */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/60 mb-1 block">
                  文书分类
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {level1CategoryOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleImportLevel1Change(opt.id as DocumentLevel1Category)}
                      className={cn(
                        "px-3 py-2 text-xs border rounded-lg transition-all font-medium",
                        importLevel1Category === opt.id
                          ? opt.id === 'regulation' 
                            ? "border-green-500 bg-green-50 text-green-700 font-bold"
                            : "border-mck-blue bg-mck-blue/10 text-mck-blue font-bold"
                          : "border-mck-border bg-white text-mck-navy/70 hover:border-mck-blue/50"
                      )}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 会议文件 - 会议类型选择 */}
              {importLevel1Category === 'meeting' ? (
                <div ref={meetingDropdownRef}>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/60 mb-1 block">
                    会议类型
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowMeetingDropdown(!showMeetingDropdown)}
                      className="w-full border border-mck-border px-3 py-2 text-xs text-left bg-white rounded-lg flex items-center justify-between focus:outline-none focus:border-mck-blue"
                    >
                      <span className={importMeetingCategory === 'shareholder' ? 'text-mck-navy' : 'text-mck-navy/60'}>
                        {meetingCategoryOptions.find(o => o.id === importMeetingCategory)?.name || '请选择'}
                      </span>
                      <ChevronDown size={14} className={cn(
                        "text-mck-navy/40 transition-transform",
                        showMeetingDropdown ? "rotate-180" : ""
                      )} />
                    </button>
                    
                    {/* 下拉列表 */}
                    {showMeetingDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-mck-border rounded-lg shadow-lg z-10 overflow-hidden">
                        {meetingCategoryOptions.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setImportMeetingCategory(opt.id as MeetingCategory);
                              setShowMeetingDropdown(false);
                              if (opt.id !== 'shareholder') {
                                setImportDocType('');
                              } else {
                                setImportDocType('agenda');
                              }
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-xs text-left transition-colors",
                              importMeetingCategory === opt.id
                                ? "bg-mck-blue/10 text-mck-blue"
                                : "text-mck-navy/70 hover:bg-mck-bg/50"
                            )}
                          >
                            {opt.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* 制度文件 - 制度类型选择 */
                <div ref={regulationDropdownRef}>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/60 mb-1 block">
                    制度类型
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowRegulationDropdown(!showRegulationDropdown)}
                      className="w-full border border-mck-border px-3 py-2 text-xs text-left bg-white rounded-lg flex items-center justify-between focus:outline-none focus:border-green-500"
                    >
                      <span className={importRegulationCategory ? 'text-mck-navy' : 'text-mck-navy/60'}>
                        {regulationTemplates.find(o => o.id === importRegulationCategory)?.name || '请选择'}
                      </span>
                      <ChevronDown size={14} className={cn(
                        "text-mck-navy/40 transition-transform",
                        showRegulationDropdown ? "rotate-180" : ""
                      )} />
                    </button>
                    
                    {/* 下拉列表 */}
                    {showRegulationDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-mck-border rounded-lg shadow-lg z-10 overflow-hidden max-h-48 overflow-y-auto">
                        {regulationTemplates.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setImportRegulationCategory(opt.id as RegulationCategory);
                              setImportDocType(opt.id);
                              setShowRegulationDropdown(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-xs text-left transition-colors",
                              importRegulationCategory === opt.id
                                ? "bg-green-50 text-green-700"
                                : "text-mck-navy/70 hover:bg-mck-bg/50"
                            )}
                          >
                            {opt.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 文书类型 - 会议文件 */}
              {importLevel1Category === 'meeting' && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/60 mb-1 block">
                    文书类型
                  </label>
                  {importMeetingCategory === 'shareholder' || importMeetingCategory === 'board' ? (
                    <div className="grid grid-cols-3 gap-1">
                      {getDocTypesByCategory(importMeetingCategory).map(docType => (
                        <button
                          key={docType.id}
                          onClick={() => setImportDocType(docType.id)}
                          className={cn(
                            "px-1 py-1.5 text-[10px] border rounded transition-all",
                            importDocType === docType.id
                              ? "border-mck-blue bg-mck-blue/10 text-mck-blue font-bold"
                              : "border-mck-border/50 bg-white text-mck-navy/60 hover:border-mck-blue/30"
                          )}
                        >
                          {docType.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-mck-border rounded-lg p-3 text-center bg-mck-bg/30">
                      <Clock size={16} className="mx-auto text-orange-400 mb-1" />
                      <p className="text-[10px] text-mck-navy/50">筹建中……</p>
                    </div>
                  )}
                </div>
              )}

              {/* 制度文件名称 - 制度文件 */}
              {importLevel1Category === 'regulation' && importRegulationCategory && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/60 mb-1 block">
                    文件名称
                  </label>
                  <input
                    type="text"
                    value={importDocName}
                    onChange={(e) => setImportDocName(e.target.value)}
                    placeholder="输入制度文件完整名称"
                    className="w-full border border-mck-border px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
              )}

              {/* 上传文件 */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/60 mb-1 block">
                  上传文件
                </label>
                <div className="border-2 border-dashed border-mck-border rounded-lg p-3 text-center hover:border-mck-blue/50 transition-colors">
                  <input
                    type="file"
                    id="import-file-input"
                    onChange={handleFileSelect}
                    accept=".txt,.doc,.docx,.md,.html"
                    className="hidden"
                  />
                  <label htmlFor="import-file-input" className="cursor-pointer block">
                    {importFile ? (
                      <div className="flex items-center justify-center gap-2 text-mck-blue">
                        <File size={16} />
                        <span className="text-xs font-medium">{importFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={18} className="mx-auto text-mck-navy/30 mb-1" />
                        <p className="text-xs text-mck-navy/60">点击选择文件</p>
                        <p className="text-[9px] text-mck-navy/40 mt-0.5">.txt .doc .docx .md .html</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* 会议名称 */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/60 mb-1 block">
                  会议名称
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={importMeetingTitle}
                    onChange={(e) => setImportMeetingTitle(e.target.value)}
                    placeholder="输入或选择"
                    className="w-full border border-mck-border px-3 py-2 text-xs focus:outline-none focus:border-mck-blue rounded-lg pr-16"
                  />
                  {meetingHistory.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => setImportMeetingTitle(e.target.value)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-mck-navy/40 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      <option value="" disabled>历史</option>
                      {meetingHistory.slice(0, 3).map((title, idx) => (
                        <option key={idx} value={title}>{title}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* 文件名 */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/60 mb-1 block">
                  文件名
                </label>
                <input
                  type="text"
                  value={importDocName}
                  onChange={(e) => setImportDocName(e.target.value)}
                  placeholder="输入文件名"
                  className="w-full border border-mck-border px-3 py-2 text-xs focus:outline-none focus:border-mck-blue rounded-lg"
                />
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex gap-2 px-4 py-3 border-t border-mck-border shrink-0">
              <button
                onClick={closeImporter}
                className="flex-1 px-3 py-2 text-xs font-bold text-mck-navy/60 hover:text-mck-navy border border-mck-border hover:bg-mck-bg transition-colors rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || !importDocName || !importMeetingTitle || !importDocType || isImporting}
                className="flex-1 px-3 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 rounded-lg"
              >
                {isImporting ? (
                  <>
                    <Loader2 size={11} className="animate-spin" />
                    导入中
                  </>
                ) : (
                  <>
                    <Upload size={11} />
                    确认导入
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {formTemplate && (
        <DocumentFormModal
          template={formTemplate}
          meetingTitle={meetingTitle}
          meetingId={meetingId || undefined}
          onClose={() => setFormTemplate(null)}
          onGenerate={handleGenerateDocument}
          onBatchGenerate={handleBatchGenerateVotingDocuments}
        />
      )}

      {/* 会议纪要编辑弹窗 */}
      {showMinutesEditor && editingMinutes && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-mck-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 flex items-center justify-center">
                  <FileText size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-mck-navy">编辑会议纪要</h3>
                  <p className="text-[10px] text-mck-navy/40">文书中心 / 会议纪要</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveMinutesEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-mck-blue text-white text-xs font-bold hover:bg-mck-navy transition-all"
                >
                  <Save size={14} />
                  保存
                </button>
                <button
                  onClick={() => setShowMinutesEditor(false)}
                  className="p-2 hover:bg-mck-bg rounded-full"
                >
                  <X size={20} className="text-mck-navy/60" />
                </button>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-mck-border bg-mck-bg/30">
              <input
                type="text"
                value={minutesEditTitle}
                onChange={(e) => setMinutesEditTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold text-mck-navy bg-white border border-mck-border rounded-lg focus:outline-none focus:border-mck-blue"
                placeholder="输入会议纪要标题..."
              />
            </div>
            <div className="flex-1 overflow-auto p-6 bg-mck-bg/30">
              <textarea
                value={minutesEditContent}
                onChange={(e) => setMinutesEditContent(e.target.value)}
                className="w-full h-full min-h-[400px] p-4 text-sm leading-relaxed text-mck-navy/80 bg-white border border-mck-border rounded-lg resize-none focus:outline-none focus:border-mck-blue font-sans"
                placeholder="在此编辑会议纪要内容..."
              />
            </div>
          </div>
        </div>
      )}

      {showEmailEditor && editingEmail && (
        <EmailEditorModal
          email={editingEmail}
          onClose={() => {
            setShowEmailEditor(false);
            setEditingEmail(null);
            onEmailClosed?.();
          }}
          onSave={handleEmailSave}
          onExport={handleEmailExport}
        />
      )}

      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-mck-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-mck-blue/10 flex items-center justify-center">
                  <FileText size={20} className="text-mck-blue" />
                </div>
                <div>
                  <h3 className="font-medium text-mck-navy">{previewDoc.name}</h3>
                  <p className="text-[10px] text-mck-navy/40">生成日期：{previewDoc.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="flex items-center gap-2 px-4 py-2 bg-mck-blue text-white text-xs font-bold hover:bg-mck-navy transition-all"
                >
                  <FileDown size={14} />
                  下载Word
                </button>
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 hover:bg-mck-bg rounded-full"
                >
                  <X size={20} className="text-mck-navy/60" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-mck-bg/30">
              {previewDoc.type === 'voting' ? (() => {
                const data = previewDoc.formData as VotingFormData;
                return (
                  <div className="mx-auto max-w-[780px] rounded-lg border border-slate-200 bg-white px-12 py-10 font-serif text-slate-800 shadow-sm">
                    <h2 className="text-center text-2xl font-bold text-slate-900">{previewDoc.meetingTitle}</h2>
                    <h3 className="mt-2 text-center text-xl font-bold tracking-[0.35em] text-cyan-800">表 决 票</h3>
                    <table className="mt-8 w-full border-collapse text-sm">
                      <tbody>
                        <tr>
                          <th className="border border-slate-300 bg-cyan-50 p-3">会议日期</th>
                          <td className="border border-slate-300 p-3">{data.meetingDate}</td>
                          <th className="border border-slate-300 bg-cyan-50 p-3">股东名称</th>
                          <td className="border border-slate-300 p-3">{data.shareholderName}</td>
                        </tr>
                        <tr>
                          <th className="border border-slate-300 bg-cyan-50 p-3">持股数量</th>
                          <td className="border border-slate-300 p-3">{data.shares || '________'}</td>
                          <th className="border border-slate-300 bg-cyan-50 p-3">持股比例</th>
                          <td className="border border-slate-300 p-3">{data.shareholding || '________'}</td>
                        </tr>
                      </tbody>
                    </table>
                    <h4 className="mb-2 mt-8 font-bold">表决事项</h4>
                    <p className="mb-3 text-xs text-slate-500">请在对应意见栏内打“√”。多选、不选或无法识别的，按公司章程及会议规则处理。</p>
                    <table className="w-full border-collapse text-sm">
                      <thead><tr className="bg-cyan-800 text-white"><th className="border border-cyan-900 p-3">序号</th><th className="border border-cyan-900 p-3">表决事项</th><th className="border border-cyan-900 p-3">同意</th><th className="border border-cyan-900 p-3">反对</th><th className="border border-cyan-900 p-3">弃权</th></tr></thead>
                      <tbody><tr><td className="border border-slate-300 p-4 text-center">1</td><td className="border border-slate-300 p-4">{data.proposalNumber ? `${data.proposalNumber} ` : ''}{data.proposalTitle}</td><td className="border border-slate-300 p-4 text-center text-xl">□</td><td className="border border-slate-300 p-4 text-center text-xl">□</td><td className="border border-slate-300 p-4 text-center text-xl">□</td></tr></tbody>
                    </table>
                    <p className="mt-6 text-xs font-bold text-amber-700">重要提示：本文件生成时为空白表决票，不代表股东已经作出表决。</p>
                    <p className="mt-10 text-right">股东或股东代表（签字/盖章）：________________</p>
                    <p className="mt-4 text-right">日期：{data.meetingDate}</p>
                  </div>
                );
              })() : (
                <pre className="whitespace-pre-wrap font-serif text-base leading-loose text-mck-navy/80 bg-white p-6 rounded-lg border border-mck-border">
                  {previewDoc.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 制度文件编辑弹窗 */}
      {showRegulationEditor && regulationEditDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col">
            {/* 标题栏 - 绿色主题 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-green-200 bg-green-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 flex items-center justify-center">
                  <FileText size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-green-800">{regulationEditDoc.name}</h3>
                  <p className="text-[10px] text-green-600/60">制度文件编辑</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* 撤回按钮 */}
                <button
                  onClick={() => {
                    setShowRegulationEditor(false);
                    setRegulationEditDoc(null);
                    setRegulationEditContent('');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-all"
                >
                  <Undo2 size={14} />
                  撤回
                </button>
                {/* 保存按钮 */}
                <button
                  onClick={handleRegulationSave}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-all"
                >
                  <Save size={14} />
                  保存
                </button>
                {/* 导出按钮 */}
                <button
                  onClick={handleRegulationExport}
                  className="flex items-center gap-2 px-4 py-2 bg-mck-blue text-white text-xs font-bold hover:bg-mck-navy transition-all"
                >
                  <FileDown size={14} />
                  导出Word
                </button>
                <button 
                  onClick={() => {
                    setShowRegulationEditor(false);
                    setRegulationEditDoc(null);
                    setRegulationEditContent('');
                  }}
                  className="p-2 hover:bg-green-100 rounded-full"
                >
                  <X size={20} className="text-green-600" />
                </button>
              </div>
            </div>
            {/* 编辑区域 */}
            <div className="flex-1 overflow-auto p-6 bg-mck-bg/30">
              <textarea
                value={regulationEditContent}
                onChange={(e) => setRegulationEditContent(e.target.value)}
                className="w-full h-full min-h-[500px] p-4 text-sm leading-relaxed text-mck-navy/80 bg-white border border-green-200 rounded-lg resize-none focus:outline-none focus:border-green-500 font-sans"
                placeholder="在此编辑制度文件内容..."
              />
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-mck-navy">文书中心</h2>
          {meetingSyncHint && (
            <p className={cn(
              "mt-2 text-[10px] font-bold tracking-wider",
              meetingSyncHint.includes("失败") || meetingSyncHint.includes("尚未部署")
                ? "text-mck-red"
                : "text-green-600",
            )}>
              {meetingSyncHint}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowImporter(true)}
            className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
          >
            <Upload size={14} />
            文书导入
          </button>
          <button 
            onClick={() => setShowGenerator(!showGenerator)}
            className={cn(
              "px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              showGenerator 
                ? "bg-mck-navy text-white hover:bg-mck-navy/80" 
                : "bg-mck-blue text-white hover:bg-mck-navy"
            )}
          >
            <Sparkles size={14} />
            {showGenerator ? '关闭生成器' : '文书生成'}
          </button>
        </div>
      </header>

      {showGenerator && (
        <div className="mck-card animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-mck-border">
            <div className="w-10 h-10 bg-mck-blue/10 flex items-center justify-center">
              <Sparkles size={20} className="text-mck-blue" />
            </div>
            <div>
              <h3 className="font-bold text-mck-navy">文书生成器</h3>
            </div>
          </div>

          {/* 一级分类选择：会议文件 / 制度文件 */}
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-3">选择文书类别</h4>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <button
                onClick={() => handleLevel1CategorySelect('meeting')}
                className={cn(
                  "p-4 border-2 rounded-xl transition-all text-left",
                  level1Category === 'meeting' 
                    ? "border-mck-blue bg-mck-blue/5" 
                    : "border-mck-border hover:border-mck-blue/50"
                )}
              >
                <div className="font-bold text-mck-navy mb-1">会议文件</div>
                <div className="text-[10px] text-mck-navy/50">股东会、董事会、监事会</div>
              </button>

              <button
                onClick={() => handleLevel1CategorySelect('regulation')}
                className={cn(
                  "p-4 border-2 rounded-xl transition-all text-left",
                  level1Category === 'regulation' 
                    ? "border-green-500 bg-green-50" 
                    : "border-mck-border hover:border-green-300"
                )}
              >
                <div className="font-bold text-mck-navy mb-1">制度文件</div>
                <div className="text-[10px] text-mck-navy/50">公司各类管理制度</div>
              </button>
            </div>
          </div>

          {/* 会议文件二级分类 */}
          {level1Category === 'meeting' && !level2Category && (
            <div className="animate-in fade-in duration-300">
              <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-3">选择会议类型</h4>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleMeetingCategorySelect('shareholder')}
                  className="p-4 border-2 border-mck-border rounded-xl transition-all text-left hover:border-mck-blue/50"
                >
                  <div className="font-bold text-mck-navy">股东会文件</div>
                </button>

                <button
                  onClick={() => handleMeetingCategorySelect('board')}
                  className="p-4 border-2 border-mck-border rounded-xl transition-all text-left hover:border-mck-blue/50"
                >
                  <div className="font-bold text-mck-navy">董事会文件</div>
                </button>

                <button
                  onClick={() => handleMeetingCategorySelect('supervisor')}
                  className="p-4 border-2 border-mck-border rounded-xl transition-all text-left hover:border-mck-blue/50"
                >
                  <div className="font-bold text-mck-navy">监事会文件</div>
                </button>
              </div>
            </div>
          )}

          {/* 会议文件详情 */}
          {level1Category === 'meeting' && level2Category === 'shareholder' && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-3">
                  会议标题
                </h4>
                <div className="relative">
                  <select
                    value={selectedDocumentMeetingId}
                    onChange={(e) => selectDocumentMeeting(e.target.value)}
                    disabled={documentMeetingsLoading}
                    className="w-full px-4 pr-10 py-3 border border-mck-border rounded-lg bg-white focus:outline-none focus:border-mck-blue text-sm"
                  >
                    <option value="">{documentMeetingsLoading ? '正在读取飞书会议…' : '请选择飞书股东会'}</option>
                    {meetingsForCategory('shareholder').map((meeting) => (
                      <option key={meeting.id} value={meeting.id}>{meeting.date ? `${meeting.date} · ` : ''}{meeting.title}</option>
                    ))}
                  </select>
                  {meetingHistory.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-mck-bg rounded"
                        title="历史记录"
                      >
                        <History size={16} className="text-mck-navy/40" />
                      </button>
                      
                      {showHistory && (
                        <div 
                          ref={historyRef}
                          className="absolute top-full left-0 right-0 mt-1 bg-white border border-mck-border rounded-lg shadow-lg z-20 max-h-40 overflow-auto"
                        >
                          <div className="px-3 py-2 text-[10px] text-mck-navy/40 border-b border-mck-border">
                            历史记录（点击选择）
                          </div>
                          {meetingHistory.map((title, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectHistory(title)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-mck-bg/50 flex items-center gap-2"
                            >
                              <Clock size={12} className="text-mck-navy/30" />
                              <span className="truncate">{title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-3">
                  选择要生成的文书
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {shareholderTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleGenerateClick(template)}
                      disabled={!meetingTitle.trim()}
                      className={cn(
                        "p-4 border rounded-lg transition-all text-center",
                        meetingTitle.trim()
                          ? "border-mck-border hover:border-mck-blue hover:bg-mck-blue/5 cursor-pointer"
                          : "border-mck-border/50 bg-mck-bg/30 cursor-not-allowed opacity-50"
                      )}
                    >
                      <span className="text-sm font-medium text-mck-navy">{template.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleDownloadFullPackage(
                    meetingTitle,
                    'shareholder',
                    generatedDocs.filter(doc => doc.meetingTitle === meetingTitle),
                  )}
                  disabled={!meetingTitle.trim() || packageBusyKey !== null}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-mck-navy px-4 py-3 text-sm font-bold text-white transition hover:bg-mck-blue disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {packageBusyKey === `shareholder:${meetingTitle}` ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  一键生成并下载全套 9 份 Word
                </button>
                {!meetingTitle.trim() && (
                  <p className="text-xs text-mck-navy/40 mt-3 text-center">
                    请先输入会议标题后再生成文书
                  </p>
                )}
              </div>
            </div>
          )}

          {level1Category === 'meeting' && level2Category === 'board' && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-3">
                  会议标题
                </h4>
                <div className="relative">
                  <select
                    value={selectedDocumentMeetingId}
                    onChange={(e) => selectDocumentMeeting(e.target.value)}
                    disabled={documentMeetingsLoading}
                    className="w-full px-4 pr-10 py-3 border border-mck-border rounded-lg bg-white focus:outline-none focus:border-mck-blue text-sm"
                  >
                    <option value="">{documentMeetingsLoading ? '正在读取飞书会议…' : '请选择飞书董事会'}</option>
                    {meetingsForCategory('board').map((meeting) => (
                      <option key={meeting.id} value={meeting.id}>{meeting.date ? `${meeting.date} · ` : ''}{meeting.title}</option>
                    ))}
                  </select>
                  {meetingHistory.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-mck-bg rounded"
                        title="历史记录"
                      >
                        <History size={16} className="text-mck-navy/40" />
                      </button>
                      
                      {showHistory && (
                        <div 
                          ref={historyRef}
                          className="absolute top-full left-0 right-0 mt-1 bg-white border border-mck-border rounded-lg shadow-lg z-20 max-h-40 overflow-auto"
                        >
                          <div className="px-3 py-2 text-[10px] text-mck-navy/40 border-b border-mck-border">
                            历史记录（点击选择）
                          </div>
                          {meetingHistory.map((title, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectHistory(title)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-mck-bg/50 flex items-center gap-2"
                            >
                              <Clock size={12} className="text-mck-navy/30" />
                              <span className="truncate">{title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-3">
                  选择要生成的文书
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {boardTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleGenerateClick(template)}
                      disabled={!meetingTitle.trim()}
                      className={cn(
                        "p-4 border rounded-lg transition-all text-center",
                        meetingTitle.trim()
                          ? "border-mck-border hover:border-mck-blue hover:bg-mck-blue/5 cursor-pointer"
                          : "border-mck-border/50 bg-mck-bg/30 cursor-not-allowed opacity-50"
                      )}
                    >
                      <span className="text-sm font-medium text-mck-navy">{template.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleDownloadFullPackage(
                    meetingTitle,
                    'board',
                    generatedDocs.filter(doc => doc.meetingTitle === meetingTitle),
                  )}
                  disabled={!meetingTitle.trim() || packageBusyKey !== null}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-mck-navy px-4 py-3 text-sm font-bold text-white transition hover:bg-mck-blue disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {packageBusyKey === `board:${meetingTitle}` ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  一键生成并下载全套 6 份 Word
                </button>
                {!meetingTitle.trim() && (
                  <p className="text-xs text-mck-navy/40 mt-3 text-center">
                    请先输入会议标题后再生成文书
                  </p>
                )}
              </div>
            </div>
          )}

          {level1Category === 'meeting' && level2Category === 'supervisor' && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-3">
                  会议标题
                </h4>
                <select
                  value={selectedDocumentMeetingId}
                  onChange={(e) => selectDocumentMeeting(e.target.value)}
                  disabled={documentMeetingsLoading}
                  className="w-full px-4 py-3 border border-mck-border rounded-lg bg-white focus:outline-none focus:border-mck-blue text-sm"
                >
                  <option value="">{documentMeetingsLoading ? '正在读取飞书会议…' : '请选择飞书监事会'}</option>
                  {meetingsForCategory('supervisor').map((meeting) => (
                    <option key={meeting.id} value={meeting.id}>{meeting.date ? `${meeting.date} · ` : ''}{meeting.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-3">
                  全套文书
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {supervisorTemplates.map(template => (
                    <div
                      key={template.id}
                      className="p-4 border border-mck-border rounded-lg text-center bg-mck-bg/20"
                    >
                      <span className="text-sm font-medium text-mck-navy">{template.name}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleDownloadFullPackage(
                    meetingTitle,
                    'supervisor',
                    generatedDocs.filter(doc => doc.meetingTitle === meetingTitle),
                  )}
                  disabled={!meetingTitle.trim() || packageBusyKey !== null}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-mck-navy px-4 py-3 text-sm font-bold text-white transition hover:bg-mck-blue disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {packageBusyKey === `supervisor:${meetingTitle}` ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  一键生成并下载全套 6 份 Word
                </button>
                {!meetingTitle.trim() && (
                  <p className="text-xs text-mck-navy/40 mt-3 text-center">
                    请先输入会议标题后再生成文书
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 制度文件生成 */}
          {level1Category === 'regulation' && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-3">
                  制度文件
                </h4>
                <input
                  type="text"
                  value={regulationTitle}
                  onChange={(e) => setRegulationTitle(e.target.value)}
                  placeholder="请输入公司全称，如：XX股份有限公司"
                  className="w-full px-4 py-3 border border-mck-border rounded-lg focus:outline-none focus:border-mck-blue text-sm"
                />
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy/60 mb-3">
                  选择要生成的制度文件
                </h4>
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {regulationTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleRegulationGenerateClick(template)}
                      disabled={!regulationTitle.trim()}
                      className={cn(
                        "p-4 border rounded-lg transition-all text-left",
                        regulationTitle.trim()
                          ? "border-mck-border hover:border-mck-blue hover:bg-mck-blue/5 cursor-pointer"
                          : "border-mck-border/50 bg-mck-bg/30 cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <FileText size={14} className="text-mck-navy/60 shrink-0 mt-0.5" />
                        <span className="text-sm font-medium text-mck-navy">{template.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {!regulationTitle.trim() && (
                  <p className="text-xs text-mck-navy/40 mt-3 text-center">
                    请先输入公司名称后再生成
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 在线文件夹 - 滚动锚点 */}
      <div id="document-folder-anchor" className="h-0 w-full" />
      
      {/* 在线文件夹 - 紧凑表格布局 */}
      {(generatedDocs.length > 0 || emails.length > 0) && (
        <div className="mck-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-mck-border">
            <div className="flex items-center gap-2">
              <FolderOpen size={16} className="text-green-600" />
              <span className="font-bold text-mck-navy text-sm">在线文件夹</span>
              <span className="text-[10px] text-mck-navy/40">共{generatedDocs.length}份文书 / {importedRuleDocs.length}份制度 / {emails.length}封邮件</span>
            </div>
          </div>

          {/* 按会议分组显示 */}
          <div className="space-y-2">
            {Object.entries(groupedByMeeting).map(([meetingTitle, { docs, emails: meetingEmails }]) => {
              const totalItems = docs.length + meetingEmails.length;
              if (totalItems === 0) return null;
              const packageMeetingType: MeetingPackageType =
                docs.find(doc => doc.meetingType)?.meetingType ||
                documentTypeMeetingType[docs[0]?.type] ||
                'shareholder';
              
              return (
                <div key={meetingTitle} className="border border-mck-border rounded">
                  {/* 会议标题行 - 深蓝绿色背景（与文书生成一致） */}
                  <div className="flex items-center justify-between px-3 py-2 bg-mck-navy text-white rounded-t">
                    <div className="flex items-center gap-2">
                      <FolderOpen size={12} />
                      <span className="text-xs font-bold">{meetingTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] opacity-80">
                      <span>{docs.length}份文书</span>
                      <span>|</span>
                      <span>{meetingEmails.length}封邮件</span>
                      {docs.length > 0 && meetingTitle !== 'undefined' && (
                        <button
                          onClick={() => handleDownloadFullPackage(meetingTitle, packageMeetingType, docs)}
                          disabled={packageBusyKey !== null}
                          className="ml-2 flex items-center gap-1 rounded bg-white/15 px-2 py-1 font-bold text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                          title="生成该会议的全套 Word 并下载 ZIP"
                        >
                          {packageBusyKey === `${packageMeetingType}:${meetingTitle}` ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Download size={11} />
                          )}
                          下载全套
                        </button>
                      )}
                      {meetingTitle === 'undefined' && (
                        <button
                          onClick={() => handleDeleteMeeting(meetingTitle)}
                          className="ml-2 px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded text-[10px] font-bold"
                        >
                          删除此文件夹
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* 表格内容 */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-mck-bg/50 text-mck-navy/60">
                        <th className="px-3 py-1.5 text-left font-medium w-24">文书类型</th>
                        <th className="px-3 py-1.5 text-left font-medium">文件名</th>
                        <th className="px-3 py-1.5 text-left font-medium w-20">日期</th>
                        <th className="px-3 py-1.5 text-center font-medium w-20">合规审查</th>
                        <th className="px-3 py-1.5 text-center font-medium w-36">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mck-border/30">
                      {/* 文书行 */}
                      {docs.map(doc => (
                        <tr key={doc.id} className={cn("hover:bg-mck-bg/30", doc.isImportedMinutes && "bg-purple-50/30")}>
                          <td className="px-3 py-1.5">
                            <span className="text-mck-navy/60">
                              {docTypeNames[doc.type] || doc.typeName}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-mck-navy">{doc.name}</td>
                          <td className="px-3 py-1.5 text-mck-navy/40">{doc.date}</td>
                          {complianceReviewableTypes.includes(doc.type) ? (
                            <td className="px-3 py-1.5 text-center">
                              {complianceResults[doc.id] ? (
                                <button
                                  onClick={() => onComplianceReview?.(doc.id)}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold",
                                    complianceResults[doc.id].score >= 90 ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                    complianceResults[doc.id].score >= 70 ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" :
                                    "bg-red-100 text-red-700 hover:bg-red-200"
                                  )}
                                >
                                  {complianceResults[doc.id].score}%
                                </button>
                              ) : (
                                <span className="text-mck-navy/30 text-[10px]">-</span>
                              )}
                            </td>
                          ) : (
                            <td className="px-3 py-1.5 text-center">
                              <span className="text-gray-400 text-xs font-bold">/</span>
                            </td>
                          )}
                          <td className="px-3 py-1.5">
                            <div className="flex items-center justify-center gap-1">
                              {doc.isImportedMinutes ? (
                                <>
                                  <button onClick={() => openMinutesEditor(doc)} className="p-1 hover:bg-purple-50 rounded" title="编辑">
                                    <Edit3 size={12} className="text-purple-600" />
                                  </button>
                                  <button onClick={() => setPreviewDoc(doc)} className="p-1 hover:bg-mck-blue/10 rounded" title="预览">
                                    <Eye size={12} className="text-mck-navy/60" />
                                  </button>
                                  <button onClick={() => handleDelete(doc.id)} className="p-1 hover:bg-red-50 rounded" title="删除">
                                    <Trash2 size={12} className="text-red-400" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => {
                                    setRegulationEditDoc(doc);
                                    setRegulationEditContent(doc.content || '');
                                    setShowRegulationEditor(true);
                                  }} className="p-1 hover:bg-mck-blue/10 rounded" title="编辑">
                                    <Edit3 size={12} className="text-mck-navy/60" />
                                  </button>
                                  <button onClick={() => setPreviewDoc(doc)} className="p-1 hover:bg-mck-blue/10 rounded" title="预览">
                                    <Eye size={12} className="text-mck-navy/60" />
                                  </button>
                                  <button onClick={() => handleDownload(doc)} className="p-1 hover:bg-mck-blue/10 rounded" title="下载">
                                    <FileDown size={12} className="text-mck-blue" />
                                  </button>
                                  {complianceReviewableTypes.includes(doc.type) && (
                                    <button onClick={() => handleComplianceReview(doc)} className="p-1 hover:bg-green-50 rounded" title="合规审查">
                                      <ShieldCheck size={12} className="text-green-600" />
                                    </button>
                                  )}
                                  <button onClick={() => handleDelete(doc.id)} className="p-1 hover:bg-red-50 rounded" title="删除">
                                    <Trash2 size={12} className="text-red-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* 邮件行 */}
                      {meetingEmails.map(email => (
                        <tr key={email.id} className="hover:bg-mck-bg/30">
                          <td className="px-3 py-1.5 text-mck-blue">
                            <div className="flex items-center gap-1">
                              <Mail size={12} />
                              <span>通知邮件</span>
                            </div>
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="text-mck-navy">{email.recipientName}</span>
                            <span className="ml-2 text-[10px]">
                              {email.status === 'sent' ? '✓已发' : email.status === 'recalled' ? '↩已撤回' : '草稿'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-mck-navy/40">{email.createdAt.split('T')[0]}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className="text-gray-400 text-xs font-bold">/</span>
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => { setEditingEmail(email); setShowEmailEditor(true); }} 
                                className="p-1 hover:bg-mck-blue/10 rounded" 
                                title="编辑"
                              >
                                <Edit3 size={12} className="text-mck-navy/60" />
                              </button>
                              <button 
                                onClick={() => { setEditingEmail(email); setShowEmailEditor(true); }} 
                                className="p-1 hover:bg-mck-blue/10 rounded" 
                                title="预览"
                              >
                                <Eye size={12} className="text-mck-navy/60" />
                              </button>
                              <button onClick={() => handleEmailExport(email)} className="p-1 hover:bg-mck-blue/10 rounded" title="下载">
                                <FileDown size={12} className="text-mck-blue" />
                              </button>
                              <button 
                                onClick={() => setEmails(prev => prev.filter(e => e.id !== email.id))} 
                                className="p-1 hover:bg-red-50 rounded" 
                                title="删除"
                              >
                                <Trash2 size={12} className="text-red-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* 制度文件分组 - 绿色表头 */}
          {(() => {
            const regulationDocs = generatedDocs.filter(doc => doc.level1Category === 'regulation');
            if (regulationDocs.length === 0) return null;
            
            return (
              <div className="border border-mck-border rounded mt-4">
                {/* 制度文件标题行 - 绿色背景 */}
                <div className="flex items-center justify-between px-3 py-2 bg-green-600 text-white rounded-t">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={12} />
                    <span className="text-xs font-bold">制度文件</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] opacity-80">
                    <span>{regulationDocs.length}份制度文件</span>
                  </div>
                </div>
                
                {/* 表格内容 - 与会议文件样式一致 */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-mck-bg/50 text-mck-navy/60">
                      <th className="px-3 py-1.5 text-left font-medium w-24">制度类型</th>
                      <th className="px-3 py-1.5 text-left font-medium">文件名</th>
                      <th className="px-3 py-1.5 text-left font-medium w-20">日期</th>
                      <th className="px-3 py-1.5 text-center font-medium w-20">合规审查</th>
                      <th className="px-3 py-1.5 text-center font-medium w-36">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mck-border/30">
                    {regulationDocs.map(doc => (
                      <tr key={doc.id} className="hover:bg-mck-bg/30">
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1">
                            <FileText size={12} className="text-mck-navy/60" />
                            <span className="text-mck-navy/60">
                              {doc.typeName}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-mck-navy">{doc.name}</td>
                        <td className="px-3 py-1.5 text-mck-navy/40">{doc.date}</td>
                        <td className="px-3 py-1.5 text-center">
                          <span className="text-gray-400 text-xs font-bold">/</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => {
                              setRegulationEditDoc(doc);
                              setRegulationEditContent(doc.content || '');
                              setShowRegulationEditor(true);
                            }} className="p-1 hover:bg-mck-blue/10 rounded" title="编辑">
                              <Edit3 size={12} className="text-mck-navy/60" />
                            </button>
                            <button onClick={() => setPreviewDoc(doc)} className="p-1 hover:bg-mck-blue/10 rounded" title="预览">
                              <Eye size={12} className="text-mck-navy/60" />
                            </button>
                            <button onClick={() => handleDownload(doc)} className="p-1 hover:bg-mck-blue/10 rounded" title="下载">
                              <FileDown size={12} className="text-mck-blue" />
                            </button>
                            {((): React.ReactNode => {
                              const check = checkRegulationImported(doc);
                              if (check.imported && !check.contentChanged) {
                                // 已导入且内容相同，按钮禁用
                                return (
                                  <button disabled className="p-1 rounded opacity-40 cursor-not-allowed" title="已导入（内容无更新）">
                                    <Upload size={12} className="text-gray-400" />
                                  </button>
                                );
                              }
                              return (
                                <button onClick={() => handleOpenImportRuleLibrary(doc)} className="p-1 hover:bg-green-50 rounded" title={check.imported ? "内容有更新，点击更新版本" : "导入规则文件库"}>
                                  <Upload size={12} className={check.imported ? "text-orange-500" : "text-green-600"} />
                                </button>
                              );
                            })()}
                            <button onClick={() => handleDelete(doc.id)} className="p-1 hover:bg-red-50 rounded" title="删除">
                              <Trash2 size={12} className="text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* 导入规则文件库确认弹窗 */}
      {showImportRuleLibrary && ruleLibraryDocToImport && ((): React.ReactNode => {
        const check = checkRegulationImported(ruleLibraryDocToImport);
        const isUpdate = check.imported && check.contentChanged;
        
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative">
              {/* 右上角删除按钮 */}
              <button
                onClick={handleCancelImportRuleLibrary}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-mck-navy mb-2">
                  {isUpdate ? "确定更新版本" : "确认导入规则文件库"}
                </h3>
                <p className="text-sm text-mck-navy/60 mb-6">
                  {isUpdate 
                    ? `「${ruleLibraryDocToImport.name}」的内容已更新，确定要更新规则文件库中的版本吗？`
                    : `确定要将「${ruleLibraryDocToImport.name}」导入到规则文件库中的「公司章程制度」板块吗？`
                  }
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleCancelImportRuleLibrary}
                    className="px-6 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmImportRuleLibrary}
                    className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {isUpdate ? "更新版本" : "确定"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 导入/更新成功结果弹窗 */}
      {showImportResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative">
            {/* 右上角删除按钮 */}
            <button
              onClick={handleCloseImportResult}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-mck-navy mb-6">
                {importResultType === 'updated' ? '已更新' : '已导入'}
              </h3>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleCloseImportResult}
                  className="px-6 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={handleViewImportResult}
                  className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors"
                >
                  查看
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {generatedDocs.length === 0 && !showGenerator && (
        <div className="mck-card py-16 text-center">
          <div className="w-20 h-20 bg-mck-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={40} className="text-mck-navy/20" />
          </div>
          <h3 className="text-lg font-bold text-mck-navy/60 mb-2">暂无生成文书</h3>
          <p className="text-sm text-mck-navy/40 mb-6">点击上方「文书生成」开始创建会议文书</p>
          <button
            onClick={() => setShowGenerator(true)}
            className="px-6 py-2.5 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all"
          >
            开始生成文书
          </button>
        </div>
      )}
    </div>
  );
};
