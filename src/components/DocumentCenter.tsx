import React, { useState, useMemo, useEffect, useRef } from "react";
import { FileText, Download, Printer, Check, Edit3, Save, X, FileCheck, Plus, ChevronDown, ChevronRight, FolderOpen, Eye, Clock, History, Sparkles, File, Loader2, AlertCircle, Trash2, Users, Calendar, FileDown, Mail, Send, Undo2, ShieldCheck, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateWordDocument, generateRegulationWord } from "@/utils/documentGenerator";

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
  shareholderName: string;
  shares: string;
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
      return `${meetingTitle}表决票\n\n会议日期：${data?.meetingDate || '____年__月__日'}\n股东名称：${data?.shareholderName || '______________'}\n持股数量：${data?.shares || '______________'}\n\n表决事项：\n□ 同意  □ 反对  □ 弃权\n\n股东签名：______________`;
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

// 筹备中弹窗组件
const ComingSoonModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-pulse">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={32} className="text-orange-500" />
        </div>
        <h3 className="text-xl font-bold text-mck-navy mb-2">正在筹备中</h3>
        <p className="text-sm text-mck-navy/60">敬请期待更多功能上线</p>
        <p className="text-xs text-mck-navy/40 mt-4">即将自动关闭...</p>
      </div>
    </div>
  );
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
  onClose: () => void;
  onGenerate: (content: string, formData: any) => void;
}> = ({ template, meetingTitle, onClose, onGenerate }) => {
  const [formData, setFormData] = useState<FormData>(() => {
    const today = new Date().toISOString().split('T')[0];
    switch (template.id) {
      case 'voting':
        return { meetingDate: today, shareholderName: '', shares: '' } as VotingFormData;
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
        return {};
    }
  });

  const availableAttendees = getAttendees();

  const handleGenerate = () => {
    const content = generateDocumentContent(meetingTitle, template.id, template.name, formData);
    onGenerate(content, formData);
    onClose();
  };

  const renderForm = () => {
    switch (template.id) {
      case 'voting':
        return <VotingForm data={formData as VotingFormData} onChange={(d) => setFormData(d)} />;
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-mck-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mck-blue/10 flex items-center justify-center">
              <FileText size={20} className="text-mck-blue" />
            </div>
            <div>
              <h3 className="font-medium text-mck-navy">{template.name}</h3>
              <p className="text-[10px] text-mck-navy/40">请填写文书信息（选填）</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-mck-bg rounded-full">
            <X size={20} className="text-mck-navy/60" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {renderForm()}
        </div>
        <div className="px-6 py-4 border-t border-mck-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-mck-navy/60 hover:bg-mck-bg rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-2 bg-mck-blue text-white text-sm font-bold rounded-lg hover:bg-mck-navy transition-all"
          >
            生成文书
          </button>
        </div>
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
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [formTemplate, setFormTemplate] = useState<DocumentTemplate | null>(null);
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

      // 添加到文书列表
      setGeneratedDocs(prev => {
        const updated = [newDoc, ...prev];
        // 保存到 localStorage
        localStorage.setItem("corporate_generated_docs", JSON.stringify(updated));
        return updated;
      });

      // 同时保存到导入会议纪要存储
      const minutesStorageKey = "corporate_meeting_minutes_imported";
      const saved = localStorage.getItem(minutesStorageKey);
      const existingMinutes: ImportedMinutesRecord[] = saved ? JSON.parse(saved) : [];
      // 防重复检查
      if (existingMinutes.some(m => m.sourceRecordId === importedRecord.sourceRecordId)) {
        return;
      }
      const updatedMinutes = [importedRecord, ...existingMinutes];
      localStorage.setItem(minutesStorageKey, JSON.stringify(updatedMinutes));
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
    if (category === 'supervisor') {
      setShowComingSoon(true);
      return;
    }
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
    if (!meetingTitle.trim()) {
      alert('请先输入会议标题');
      return;
    }
    setFormTemplate(template);
  };

  const handleGenerateDocument = (content: string, formData?: any) => {
    if (!formTemplate) return;

    // 根据文书模板id判断会议类型
    const isBoardTemplate = formTemplate.id.startsWith('board_');
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
      if (!meetingTitle.trim()) return;
      const meetingType: 'shareholder' | 'board' | 'supervisor' = isBoardTemplate ? 'board' : 'shareholder';

      const newDoc: GeneratedDocument = {
        id: `doc-${Date.now()}-${formTemplate.id}`,
        name: `${meetingTitle}${formTemplate.name}`,
        type: formTemplate.id,
        typeName: formTemplate.name,
        meetingTitle: meetingTitle,
        meetingType: meetingType,
        level1Category: 'meeting',
        level2Category: meetingType,
        date: new Date().toLocaleDateString('zh-CN'),
        content: content,
        formData: formData
      };

      saveMeetingTitle(meetingTitle);
      setMeetingHistory(getMeetingHistory());

      setGeneratedDocs(prev => [newDoc, ...prev]);
      setFormTemplate(null);
    }
  };

  const handleSelectHistory = (title: string) => {
    setMeetingTitle(title);
    setShowHistory(false);
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

  // 文书类型选项

  // 会议类型映射
  const docTypeToMeetingType: Record<string, 'shareholder' | 'board' | 'supervisor'> = {
    voting: 'shareholder',
    voting_stats: 'shareholder',
    agenda: 'shareholder',
    minutes: 'shareholder',
    notice: 'shareholder',
    resolution: 'shareholder',
    signin: 'shareholder',
    proxy: 'shareholder',
    proposal: 'shareholder',
  };

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
      }

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
      {showComingSoon && <ComingSoonModal onClose={() => setShowComingSoon(false)} />}

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
          onClose={() => setFormTemplate(null)}
          onGenerate={handleGenerateDocument}
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
              <pre className="whitespace-pre-wrap font-serif text-base leading-loose text-mck-navy/80 bg-white p-6 rounded-lg border border-mck-border">
                {previewDoc.content}
              </pre>
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
                  <input
                    type="text"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="XX公司第一届股东会会议"
                    className="w-full px-4 pr-10 py-3 border border-mck-border rounded-lg focus:outline-none focus:border-mck-blue text-sm"
                  />
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
                  <input
                    type="text"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="XX公司第一届董事会第X次会议"
                    className="w-full px-4 pr-10 py-3 border border-mck-border rounded-lg focus:outline-none focus:border-mck-blue text-sm"
                  />
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
