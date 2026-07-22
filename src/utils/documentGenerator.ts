import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { fallbackCompanyName } from '@/utils/companyName';

// 读取XML文件
const xmlFiles: Record<string, string> = {
  voting: '/文书xml/会议类/表决票.xml',
  voting_stats: '/文书xml/会议类/表决统计表.xml',
  agenda: '/文书xml/会议类/大会议程.xml',
  minutes: '/文书xml/会议类/会议记录.xml',
  notice: '/文书xml/会议类/会议通知.xml',
  resolution: '/文书xml/会议类/决议.xml',
  signin: '/文书xml/会议类/签到表.xml',
  proxy: '/文书xml/会议类/委托书.xml',
  proposal: '/文书xml/会议类/议案.xml',
};

// 制度文件XML映射：模板id -> XML文件名
export const regulationXmlFiles: Record<string, string> = {
  internal_audit: '某股份有限公司内部审计制度.xml',
  fund_management: '某股份有限公司募集资金管理制度.xml',
  hedging_risk: '某股份有限公司套期保值业务内部控制及风险管理制度.xml',
  info_reporting: '某股份有限公司对外信息报送和使用管理制度.xml',
  investment: '某股份有限公司对外投资管理制度.xml',
  donation: '某股份有限公司对外捐赠管理制度.xml',
  market_cap: '某股份有限公司市值管理制度.xml',
  error_accountability: '某股份有限公司年报信息披露重大差错责任追究制度.xml',
  investor_relations: '某股份有限公司投资者关系管理制度.xml',
  independent_director: '某股份有限公司独立董事工作制度(草案).xml',
  shares_management: '某股份有限公司董事、监事、高级管理人员所持公司股份及其变动管理制度(草案).xml',
  monetary_funds: '某股份有限公司货币资金管理制度.xml',
  controlling_shareholder: '某股份有限公司防范控股股东及其关联方资金占用制度.xml',
  insider_registration: '某股份有限公司内幕信息知情人登记管理制度.xml',
};

// 解析制度文件XML为格式化文本
const parseRegulationXml = (xml: string, companyName: string): string[] => {
  companyName = fallbackCompanyName(companyName);
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
    
    // 添加章节标题（加粗标记）
    paragraphs.push(`\n【${chapterName}】`);
    
    // 解析条款
    const articleRegex = /<Article id="(\d+)">(.*?)<\/Article>/gs;
    let articleMatch;
    while ((articleMatch = articleRegex.exec(chapterContent)) !== null) {
      let articleText = articleMatch[2];
      // 解析子条款
      const clauseRegex = /\(（[一二三四五六七八九十]+）\)/g;
      articleText = articleText.replace(/\(（[一二三四五六七八九十零百千万]+）\)/g, (match) => {
        return match.replace(/（/g, '（').replace(/）/g, '）');
      });
      // 移除Clause标签但保留格式
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

// 生成制度文件Word文档
export const generateRegulationWord = async (
  templateId: string,
  companyName: string,
  templateName: string
): Promise<Blob> => {
  const xmlFileName = regulationXmlFiles[templateId];
  if (!xmlFileName) {
    throw new Error(`未找到模板ID: ${templateId}`);
  }
  
  const xmlPath = `/文书xml/制度类/${xmlFileName}`;
  
  try {
    // 获取XML文件
    const response = await fetch(xmlPath);
    if (!response.ok) {
      throw new Error('制度文件XML不存在');
    }
    const xmlContent = await response.text();
    
    // 解析XML
    const paragraphs = parseRegulationXml(xmlContent, companyName);
    
    // 生成Word文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs.map((text, index) => {
          // 判断是否为章节标题
          const isChapterTitle = text.includes('【') && text.includes('】') && !text.includes('第');
          // 判断是否为文件标题
          const isDocTitle = index === 0 && text.includes('【');
          
          if (isDocTitle) {
            return new Paragraph({
              children: [new TextRun({ text: text.replace(/【|】/g, ''), bold: true, size: 36 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            });
          } else if (isChapterTitle) {
            return new Paragraph({
              children: [new TextRun({ text: text.replace(/【|】/g, ''), bold: true, size: 28 })],
              spacing: { before: 400, after: 200 },
            });
          } else if (text.includes('第') && text.includes('条')) {
            return new Paragraph({
              children: [new TextRun({ text: text, size: 24 })],
              spacing: { after: 200 },
              indent: { left: 360 },
            });
          } else {
            return new Paragraph({
              children: [new TextRun({ text: text, size: 24 })],
              spacing: { after: 200 },
            });
          }
        }),
      }],
    });
    
    return await Packer.toBlob(doc);
  } catch (error) {
    // 如果XML文件不存在，使用备用格式生成
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: `${companyName}${templateName}`, bold: true, size: 36 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '（制度文件内容）', size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
        ],
      }],
    });
    
    return await Packer.toBlob(doc);
  }
};

// 简单解析XML文本
const parseSimpleXml = (xml: string): { text: string; tables: any[] } => {
  const tables: any[] = [];
  let text = xml;
  
  // 移除XML声明
  text = text.replace(/<\?xml[^>]*\?>/g, '');
  
  // 提取表格数据
  const tableRegex = /<VoteTable>|<\/VoteTable>|<ResultTable>|<\/ResultTable>|<SignTable>|<\/SignTable>|<SignTable>|<\/SignTable>|<VotingInstructions>[\s\S]*?<\/VotingInstructions>/g;
  const voteTableMatch = xml.match(/<VoteTable>([\s\S]*?)<\/VoteTable>/);
  const resultTableMatch = xml.match(/<ResultTable>([\s\S]*?)<\/ResultTable>/);
  const signTableMatch = xml.match(/<SignTable>([\s\S]*?)<\/SignTable>/);
  const votingInstructionsMatch = xml.match(/<VotingInstructions>([\s\S]*?)<\/VotingInstructions>/);
  
  if (voteTableMatch) {
    const rows: string[][] = [];
    const headerMatch = voteTableMatch[1].match(/<HeaderRow>([\s\S]*?)<\/HeaderRow>/);
    if (headerMatch) {
      const cols = headerMatch[1].match(/<Column>([\s\S]*?)<\/Column>/g) || [];
      rows.push(cols.map(c => c.replace(/<\/?Column>/g, '')));
    }
    const rowMatches = voteTableMatch[1].matchAll(/<Row>([\s\S]*?)<\/Row>/g);
    for (const match of rowMatches) {
      const cells = match[1].match(/<Data>([\s\S]*?)<\/Data>/g) || [];
      rows.push(cells.map(c => c.replace(/<\/?Data>/g, '')));
    }
    tables.push(rows);
  }
  
  if (resultTableMatch) {
    const rows: string[][] = [];
    const headerMatch = resultTableMatch[1].match(/<HeaderRow>([\s\S]*?)<\/HeaderRow>/);
    if (headerMatch) {
      const cols = headerMatch[1].match(/<Column>([\s\S]*?)<\/Column>/g) || [];
      rows.push(cols.map(c => c.replace(/<\/?Column>/g, '')));
    }
    const rowMatches = resultTableMatch[1].matchAll(/<Row>([\s\S]*?)<\/Row>/g);
    for (const match of rowMatches) {
      const cells = match[1].match(/<Data>([\s\S]*?)<\/Data>/g) || [];
      rows.push(cells.map(c => c.replace(/<\/?Data>/g, '')));
    }
    tables.push(rows);
  }
  
  if (signTableMatch) {
    const rows: string[][] = [];
    const rowMatches = signTableMatch[1].matchAll(/<Row>([\s\S]*?)<\/Row>/g);
    for (const match of rowMatches) {
      const cells = match[1].match(/<Data>([\s\S]*?)<\/Data>/g) || [];
      rows.push(cells.map(c => c.replace(/<\/?Data>/g, '')));
    }
    tables.push(rows);
  }
  
  if (votingInstructionsMatch) {
    const rows: string[][] = [];
    const headerMatch = votingInstructionsMatch[1].match(/<HeaderRow>([\s\S]*?)<\/HeaderRow>/);
    if (headerMatch) {
      const cols = headerMatch[1].match(/<Column>([\s\S]*?)<\/Column>/g) || [];
      rows.push(cols.map(c => c.replace(/<\/?Column>/g, '')));
    }
    const rowMatches = votingInstructionsMatch[1].matchAll(/<Row>([\s\S]*?)<\/Row>/g);
    for (const match of rowMatches) {
      const cells = match[1].match(/<Data>([\s\S]*?)<\/Data>/g) || [];
      rows.push(cells.map(c => c.replace(/<\/?Data>/g, '')));
    }
    tables.push(rows);
  }
  
  // 简化文本：移除XML标签
  text = text.replace(/<[^>]+>/g, (match) => {
    if (match.startsWith('</')) return '\n';
    if (match.startsWith('<') && !match.includes(' ')) return '\n';
    return '';
  });
  
  // 清理多余空白
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  
  return { text, tables };
};

// 创建表格
const createTable = (rows: string[][]) => {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(row => 
      new TableRow({
        children: row.map(cell => 
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: cell || ' ', size: 24 })],
              alignment: AlignmentType.CENTER,
            })],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          })
        ),
      })
    ),
  });
};

// 根据表单数据替换文本中的占位符
const replacePlaceholders = (text: string, formData: any, type: string): string => {
  let result = text;
  
  // 通用替换
  result = result.replace(/\*\*\*/g, formData.meetingTitle || '公司');
  
  // 根据类型进行特定替换
  switch (type) {
    case 'voting':
      if (formData.meetingDate) {
        result = result.replace(/【 \】年【 \】月【 \】日/, formatDate(formData.meetingDate));
      }
      break;
    case 'voting_stats':
      if (formData.meetingDate) {
        result = result.replace(/\*\*\*\*年\*\*月\*\*日/, formatDateFull(formData.meetingDate));
      }
      if (formData.meetingTime) {
        result = result.replace(/\*\*时/, formData.meetingTime + '时');
      }
      if (formData.meetingLocation) {
        result = result.replace(/公司会议室/g, formData.meetingLocation);
      }
      if (formData.attendeeCount) {
        result = result.replace(/名/g, formData.attendeeCount + '名');
      }
      if (formData.totalShareholders) {
        result = result.replace(/股东总数的\*\*\*%/g, `股东总数的${formData.shareholderRatio || '***'}%`);
      }
      if (formData.representedShares) {
        result = result.replace(/代表股份\*\*\*股/g, `代表股份${formData.representedShares}股`);
      }
      break;
    case 'agenda':
      if (formData.meetingDate) {
        result = result.replace(/\*\*\*\*年\*\*月\*\*日/g, formatDateFull(formData.meetingDate));
      }
      if (formData.meetingTime) {
        result = result.replace(/ \*\*时/g, ' ' + formData.meetingTime + '时');
      }
      break;
    case 'minutes':
      if (formData.meetingDate) {
        result = result.replace(/\*\*\*\*年\*\*月\*\*日/g, formatDateFull(formData.meetingDate));
      }
      if (formData.meetingTime) {
        result = result.replace(/ \*\*时/g, ' ' + formData.meetingTime + '时');
      }
      if (formData.hostName) {
        result = result.replace(/大会主持人：\*\*\*/g, '大会主持人：' + formData.hostName);
      }
      if (formData.recorderName) {
        result = result.replace(/大会记录人：\*\*\*/g, '大会记录人：' + formData.recorderName);
      }
      break;
    case 'notice':
      if (formData.meetingDate) {
        result = result.replace(/\*\*\*\*年\*\*月\*\*日/g, formatDateFull(formData.meetingDate));
      }
      if (formData.meetingTime) {
        result = result.replace(/ \*\*时/g, ' ' + formData.meetingTime + '时');
      }
      if (formData.contactName) {
        result = result.replace(/会务联系人：\*\*\*/g, '会务联系人：' + formData.contactName);
      }
      if (formData.contactPhone) {
        result = result.replace(/电话：13\* \*\*\*\* \*\*\*\*/g, '电话：' + formData.contactPhone);
      }
      if (formData.contactEmail) {
        result = result.replace(/邮箱：\*\*\*@\*\*\*\.com/g, '邮箱：' + formData.contactEmail);
      }
      break;
    case 'resolution':
      if (formData.meetingDate) {
        result = result.replace(/\*\*\*\*年\*\*月\*\*日/g, formatDateFull(formData.meetingDate));
      }
      if (formData.meetingTime) {
        result = result.replace(/ \*\*时/g, ' ' + formData.meetingTime + '时');
      }
      if (formData.attendeeCount) {
        result = result.replace(/共计\*名/g, '共计' + formData.attendeeCount + '名');
      }
      if (formData.totalShareholders) {
        result = result.replace(/股东总数的\*\*\*%/g, `股东总数的${formData.shareholderRatio || '***'}%`);
      }
      if (formData.representedShares) {
        result = result.replace(/代表股份\*\*\*股/g, `代表股份${formData.representedShares}股`);
      }
      break;
    case 'signin':
      if (formData.meetingDate) {
        result = result.replace(/\*\*\*\*年\*\*月\*\*日/g, formatDateFull(formData.meetingDate));
      }
      break;
    case 'proxy':
      if (formData.proxyDate) {
        result = result.replace(/____年____月____日/, formatDateFull(formData.proxyDate));
      }
      break;
    case 'proposal':
      // 替换议案中的具体数据
      if (formData.revenue) result = result.replace(/XX万元/g, (match, offset) => offset < result.indexOf('营业收入') + 20 ? formData.revenue + '万元' : match);
      if (formData.netProfit) result = result.replace(/XX万元/g, (match, offset) => offset < result.indexOf('净利润') + 20 ? formData.netProfit + '万元' : match);
      if (formData.totalAssets) result = result.replace(/XX万元/g, (match, offset) => offset < result.indexOf('资产总额') + 20 ? formData.totalAssets + '万元' : match);
      if (formData.totalLiabilities) result = result.replace(/XX万元/g, (match, offset) => offset < result.indexOf('负债总额') + 20 ? formData.totalLiabilities + '万元' : match);
      if (formData.eps) result = result.replace(/XX元/g, formData.eps + '元');
      if (formData.boardMeetings) result = result.replace(/董事会X次/g, '董事会' + formData.boardMeetings + '次');
      if (formData.supervisionOpinions) result = result.replace(/监督意见X条/g, '监督意见' + formData.supervisionOpinions + '条');
      if (formData.auditorName) result = result.replace(/XX审计机构/g, formData.auditorName);
      if (formData.companyName) result = result.replace(/XX公司/g, formData.companyName);
      if (formData.establishedDate) result = result.replace(/XXXX年XX月XX日/g, formatDateFull(formData.establishedDate));
      if (formData.registeredCapital) result = result.replace(/注册资本XX万元/g, '注册资本' + formData.registeredCapital + '万元');
      if (formData.legalRepresentative) result = result.replace(/法定代表人XX/g, '法定代表人' + formData.legalRepresentative);
      break;
  }
  
  return result;
};

// 格式化日期为 YYYY年MM月DD日
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '    年    月    日';
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
};

// 格式化日期为 YYYY年MM月DD日
const formatDateFull = (dateStr: string): string => {
  if (!dateStr) return '    年    月    日';
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
};

const FORM_INK = '1F2937';
const FORM_ACCENT = '0B6477';
const FORM_FILL = 'EAF4F6';
const FORM_BORDER = '94A3B8';
const FORM_WIDTH = 9360;

const formRun = (text: string, options: { bold?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({
    text,
    bold: options.bold,
    size: options.size || 24,
    color: options.color || FORM_INK,
    font: {
      ascii: 'Hiragino Sans GB',
      hAnsi: 'Hiragino Sans GB',
      eastAsia: 'Hiragino Sans GB',
      cs: 'Hiragino Sans GB',
    },
  });

const formCell = (
  text: string,
  width: number,
  options: { bold?: boolean; fill?: string; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {},
) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 140, bottom: 140, left: 150, right: 150 },
  shading: options.fill ? { type: ShadingType.CLEAR, fill: options.fill } : undefined,
  borders: {
    top: { style: BorderStyle.SINGLE, size: 6, color: FORM_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: FORM_BORDER },
    left: { style: BorderStyle.SINGLE, size: 6, color: FORM_BORDER },
    right: { style: BorderStyle.SINGLE, size: 6, color: FORM_BORDER },
  },
  children: [new Paragraph({
    alignment: options.align || AlignmentType.CENTER,
    spacing: { before: 0, after: 0, line: 300 },
    children: [formRun(text || ' ', { bold: options.bold, color: options.color })],
  })],
});

export const generateVotingWordDocument = async (meetingTitle: string, formData: any): Promise<Blob> => {
  const meetingDate = formatDateFull(formData?.meetingDate);
  const shareholderName = formData?.shareholderName || '________________';
  const shares = formData?.shares || '________________';
  const shareholding = formData?.shareholding
    ? `${formData.shareholding}${String(formData.shareholding).includes('%') ? '' : '%'}`
    : '________________';
  const proposalTitle = formData?.proposalTitle || '________________';
  const proposalNumber = formData?.proposalNumber ? `${formData.proposalNumber}  ` : '';

  const infoTable = new Table({
    width: { size: FORM_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [1500, 3180, 1500, 3180],
    rows: [
      new TableRow({
        children: [
          formCell('会议日期', 1500, { bold: true, fill: FORM_FILL }),
          formCell(meetingDate, 3180, { align: AlignmentType.LEFT }),
          formCell('股东名称', 1500, { bold: true, fill: FORM_FILL }),
          formCell(shareholderName, 3180, { align: AlignmentType.LEFT }),
        ],
      }),
      new TableRow({
        children: [
          formCell('持股数量', 1500, { bold: true, fill: FORM_FILL }),
          formCell(shares, 3180, { align: AlignmentType.LEFT }),
          formCell('持股比例', 1500, { bold: true, fill: FORM_FILL }),
          formCell(shareholding, 3180, { align: AlignmentType.LEFT }),
        ],
      }),
    ],
  });

  const voteTable = new Table({
    width: { size: FORM_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [720, 6120, 840, 840, 840],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          formCell('序号', 720, { bold: true, fill: FORM_ACCENT, color: 'FFFFFF' }),
          formCell('表决事项', 6120, { bold: true, fill: FORM_ACCENT, color: 'FFFFFF' }),
          formCell('同意', 840, { bold: true, fill: FORM_ACCENT, color: 'FFFFFF' }),
          formCell('反对', 840, { bold: true, fill: FORM_ACCENT, color: 'FFFFFF' }),
          formCell('弃权', 840, { bold: true, fill: FORM_ACCENT, color: 'FFFFFF' }),
        ],
      }),
      new TableRow({
        children: [
          formCell('1', 720),
          formCell(`${proposalNumber}${proposalTitle}`, 6120, { align: AlignmentType.LEFT }),
          formCell('□', 840),
          formCell('□', 840),
          formCell('□', 840),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: {
              ascii: 'Hiragino Sans GB',
              hAnsi: 'Hiragino Sans GB',
              eastAsia: 'Hiragino Sans GB',
              cs: 'Hiragino Sans GB',
            },
            size: 24,
            color: FORM_INK,
          },
          paragraph: { spacing: { after: 120, line: 360 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1276, bottom: 1134, left: 1276 },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 140 },
          children: [formRun(meetingTitle, { bold: true, size: 36, color: '0F2742' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 420 },
          children: [formRun('表 决 票', { bold: true, size: 32, color: FORM_ACCENT })],
        }),
        infoTable,
        new Paragraph({
          spacing: { before: 320, after: 160 },
          children: [formRun('表决事项', { bold: true, size: 26, color: '0F2742' })],
        }),
        new Paragraph({
          spacing: { after: 180, line: 300 },
          children: [formRun('填写说明：请在对应意见栏内打“√”。多选、不选或无法识别的，按公司章程及会议规则处理。', { size: 21, color: '64748B' })],
        }),
        voteTable,
        new Paragraph({
          spacing: { before: 360, after: 160 },
          children: [formRun('重要提示：本文件生成时为空白表决票，不代表股东已经作出表决。', { bold: true, size: 21, color: '9A6700' })],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 520, after: 260 },
          children: [formRun('股东或股东代表（签字/盖章）：________________________')],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [formRun(`日期：${meetingDate}`)],
        }),
      ],
    }],
  });
  return Packer.toBlob(doc);
};

// 生成Word文档
export const generateWordDocument = async (
  type: string,
  meetingTitle: string,
  formData: any
): Promise<Blob> => {
  const companyName = fallbackCompanyName(formData?.companyName);
  if (type === 'voting') {
    return generateVotingWordDocument(meetingTitle, formData);
  }
  // 构建XML路径
  const xmlPath = `${process.env.PUBLIC_URL || ''}/文书xml/会议类/${getXmlFileName(type)}`;
  
  try {
    // 尝试获取XML文件
    const response = await fetch(xmlPath);
    if (!response.ok) {
      throw new Error('XML file not found');
    }
    const xmlContent = await response.text();
    const { text, tables } = parseSimpleXml(xmlContent);
    
    // 替换占位符
    const replacedText = replacePlaceholders(text, { ...formData, meetingTitle }, type);
    
    // 创建文档段落
    const paragraphs: Paragraph[] = replacedText.split('\n').filter(line => line.trim()).map(line => 
      new Paragraph({
        children: [new TextRun({ text: line, size: 24 })],
        spacing: { after: 200 },
      })
    );
    
    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({
          children: [new TextRun({ text: meetingTitle + ' - ' + getTypeName(type), size: 24 })],
        })],
      }],
    });
    
    return await Packer.toBlob(doc);
  } catch (error) {
    // 如果XML文件不存在，使用简化格式生成
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: meetingTitle, bold: true, size: 36 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: getTypeName(type), bold: true, size: 32 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          ...generateFormContentParagraphs(type, formData),
        ],
      }],
    });
    
    return await Packer.toBlob(doc);
  }
};

// 获取XML文件名
const getXmlFileName = (type: string): string => {
  const names: Record<string, string> = {
    voting: '表决票.xml',
    voting_stats: '表决统计表.xml',
    agenda: '大会议程.xml',
    minutes: '会议记录.xml',
    notice: '会议通知.xml',
    resolution: '决议.xml',
    signin: '签到表.xml',
    proxy: '委托书.xml',
    proposal: '议案.xml',
  };
  return names[type] || '表决票.xml';
};

// 获取类型名称
const getTypeName = (type: string): string => {
  const names: Record<string, string> = {
    voting: '表决票',
    voting_stats: '表决统计票',
    agenda: '大会议程',
    minutes: '会议记录',
    notice: '会议通知',
    resolution: '决议',
    signin: '签到表',
    proxy: '委托书',
    proposal: '议案',
  };
  return names[type] || '文书';
};

// 生成表单内容段落
const generateFormContentParagraphs = (type: string, formData: any): Paragraph[] => {
  const paragraphs: Paragraph[] = [];
  
  const addLine = (label: string, value: string) => {
    if (value) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({ text: label + '：', bold: true, size: 24 }),
          new TextRun({ text: value, size: 24 }),
        ],
        spacing: { after: 200 },
      }));
    }
  };
  
  const addSection = (title: string) => {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 24 })],
      spacing: { before: 300, after: 200 },
    }));
  };
  
  switch (type) {
    case 'voting':
      addLine('会议日期', formatDate(formData.meetingDate));
      addLine('股东名称', formData.shareholderName || '________________');
      addLine('持股数量', formData.shares || '________________');
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: '表决事项：', bold: true, size: 24 })],
        spacing: { before: 300, after: 100 },
      }));
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: '□ 同意    □ 反对    □ 弃权', size: 24 })],
        spacing: { after: 300 },
      }));
      addLine('股东签名', '________________');
      break;
      
    case 'voting_stats':
      addLine('会议日期', formatDateFull(formData.meetingDate) + ' ' + (formData.meetingTime || '__时'));
      addLine('会议地点', formData.meetingLocation || '公司会议室');
      addLine('出席人数', formData.attendeeCount ? formData.attendeeCount + '名' : '____名');
      addLine('股东总数', formData.totalShareholders ? formData.totalShareholders + '名' : '____名');
      addLine('占比', formData.shareholderRatio ? formData.shareholderRatio + '%' : '___%');
      addLine('代表股份数', formData.representedShares ? formData.representedShares + '股' : '____________股');
      addLine('占有表决权比例', formData.votingRatio ? formData.votingRatio + '%' : '___%');
      addLine('计票人', '________________');
      addLine('监票人', '________________');
      break;
      
    case 'agenda':
      addLine('会议时间', formatDateFull(formData.meetingDate) + ' ' + (formData.meetingTime || '__时'));
      addSection('议程安排');
      const steps = [
        '第一项：会议主持人宣布会议开始',
        '第二项：会议主持人统计并介绍参加本次会议的人员',
        '第三项：会议主持人宣读有关议案',
        '第四项：推举计票人和监票人',
        '第五项：股东及与会人员审议、讨论议案',
        '第六项：股东以记名投票方式对议案逐项进行表决',
        '第七项：计票人计票，监票人监票并宣读表决结果',
        '第八项：会议主持人宣读会议决议',
        '第九项：各位董事签署会议决议、会议记录',
        '第十项：会议主持人宣布会议结束',
      ];
      steps.forEach((step, i) => {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: step, size: 24 })],
          spacing: { after: 150 },
          indent: { left: 360 },
        }));
      });
      break;
      
    case 'minutes':
      addLine('会议时间', formatDateFull(formData.meetingDate) + ' ' + (formData.meetingTime || '__时'));
      addLine('会议地点', '公司会议室');
      addLine('大会主持人', formData.hostName || '______________');
      addLine('大会记录人', formData.recorderName || '______________');
      addLine('出席人数', formData.attendeeCount || '____名');
      addLine('股东总数', formData.totalShareholders || '____名');
      addLine('占比', formData.shareholderRatio || '___%');
      addLine('代表股份数', formData.representedShares || '____________股');
      addLine('占有表决权比例', formData.votingRatio || '___%');
      break;
      
    case 'notice':
      addLine('会议时间', formatDateFull(formData.meetingDate) + ' ' + (formData.meetingTime || '__时'));
      if (formData.contactName) addLine('会务联系人', formData.contactName);
      if (formData.contactPhone) addLine('电话', formData.contactPhone);
      if (formData.contactEmail) addLine('邮箱', formData.contactEmail);
      if (formData.attendees && formData.attendees.length > 0) {
        addSection('与会人员');
        formData.attendees.forEach((a: any, i: number) => {
          addLine(`${i + 1}. ${a.name || '姓名'}`, [a.phone, a.email].filter(Boolean).join(' '));
        });
      }
      break;
      
    case 'resolution':
      addLine('会议时间', formatDateFull(formData.meetingDate) + ' ' + (formData.meetingTime || '__时'));
      addLine('出席人数', formData.attendeeCount || '____名');
      addLine('股东总数', formData.totalShareholders || '____名');
      addLine('占比', formData.shareholderRatio || '___%');
      addLine('代表股份数', formData.representedShares || '____________股');
      addLine('占有表决权比例', formData.votingRatio || '___%');
      if (formData.resolutionContent) {
        addSection('决议内容');
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: formData.resolutionContent, size: 24 })],
          spacing: { after: 200 },
        }));
      }
      break;
      
    case 'signin':
      addLine('会议日期', formatDate(formData.meetingDate));
      addSection('签到表');
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: '| 序号 | 股东名称 | 签名 | 备注 |', size: 24 })],
        spacing: { after: 100 },
      }));
      for (let i = 1; i <= 6; i++) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: `| ${i}    |          |      |      |`, size: 24 })],
          spacing: { after: 100 },
        }));
      }
      break;
      
    case 'proxy':
      addLine('委托人', formData.principalName || '______________');
      addLine('委托人证件号码', formData.principalId || '______________');
      addLine('受托人', formData.agentName || '______________');
      addLine('受托人身份证号码', formData.agentId || '______________');
      addLine('委托日期', formatDate(formData.proxyDate));
      break;
      
    case 'proposal':
      addLine('议案编号', formData.proposalId || '______________');
      addLine('议案名称', formData.proposalName || '______________');
      if (formData.background) {
        addSection('一、议案提出背景');
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: formData.background, size: 24 })],
          spacing: { after: 200 },
        }));
      }
      if (formData.content) {
        addSection('二、议案具体内容');
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: formData.content, size: 24 })],
          spacing: { after: 200 },
        }));
      }
      if (formData.description) {
        addSection('三、议案说明');
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: formData.description, size: 24 })],
          spacing: { after: 200 },
        }));
      }
      addSection('四、涉及数据');
      const dataFields = [
        ['营业收入', formData.revenue, '万元'],
        ['净利润', formData.netProfit, '万元'],
        ['资产总额', formData.totalAssets, '万元'],
        ['负债总额', formData.totalLiabilities, '万元'],
        ['增长率', formData.growthRate, '%'],
        ['每股收益', formData.eps, '元'],
        ['董事会会议次数', formData.boardMeetings, '次'],
        ['审议议案数', formData.proposalCount, '项'],
        ['监事会监督意见', formData.supervisionOpinions, '条'],
        ['预算目标数值', formData.budgetTarget, ''],
        ['审计机构', formData.auditorName, ''],
      ];
      dataFields.forEach(([label, value]) => {
        if (value) addLine(label as string, value as string);
      });
      addLine('提案人', formData.proposer || '______________');
      addLine('提案日期', formatDate(formData.proposalDate));
      break;
  }
  
  return paragraphs;
};

// 下载Word文档
export const downloadWordDocument = async (
  type: string,
  meetingTitle: string,
  formData: any,
  fileName: string
) => {
  const blob = await generateWordDocument(type, meetingTitle, formData);
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
