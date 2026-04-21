/**
 * 腾讯元器智能体 API 调用封装
 * 
 * 使用说明：
 * 1. 在 yuanqi.tencent.com 创建智能体并发布
 * 2. 进入「我的创建」→「调用API」获取 API KEY 和 API ID
 * 3. 在系统设置中填入这两个凭证
 * 
 * 凭证获取方式：
 * - API KEY: 智能体详情页 → 调用API → API Key
 * - API ID: 智能体详情页 URL 中获取（如 .../agent/agent_xxx 中的 agent_xxx）
 */

export interface YuanqiConfig {
  apiKey: string;  // API KEY
  botId: string;    // API ID
}

export interface YuanqiMessage {
  role: 'user' | 'assistant';
  content: Array<{ type: 'text'; text: string }>;
}

export interface YuanqiRequestPayload {
  assistant_id: string;
  user_id: string;
  stream: boolean;
  messages: YuanqiMessage[];
}

export interface YuanqiResponse {
  id?: string;
  choices?: Array<{
    message?: { role: string; content: string };
    delta?: { content?: string };
  }>;
  error?: {
    message?: string;
    code?: string;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 腾讯元器 API 端点（开发环境使用本地代理，生产环境需部署服务端代理）
const YUANQI_API_URL = '/api/yuanqi/openapi/v1/agent/chat/completions';

// 合规审查提示词模板
const COMPLIANCE_REVIEW_PROMPT = `你是一位专业的企业合规审查助手，专门审查上市公司的会议通知、会议记录、决议公告等法律文书。

请对以下法律文书进行全面的合规审查，重点检查：
1. 程序合规性：通知期限、召集程序、表决方式等是否符合法定要求
2. 实质合规性：决议内容是否符合法律法规、公司章程
3. 信息披露：是否完整、准确、及时披露必要信息

请按以下格式输出：
## 问题识别
（列出发现的具体问题）

## 风险等级
🔴 高风险 / ⚠️ 中风险 / ✅ 低风险

## 修正建议
（给出具体可操作的修正方案）

## 相关法规条款
（引用相关法律法规的具体条款）

文书内容：
{content}`;

/**
 * 发送合规审查请求到腾讯元器智能体
 */
export async function sendComplianceReview(
  config: YuanqiConfig,
  documentContent: string,
  options?: {
    onStream?: (text: string) => void;
    signal?: AbortSignal;
  }
): Promise<string> {
  const { apiKey, botId } = config;

  if (!apiKey || !botId) {
    throw new Error('请在系统设置中配置腾讯元器 API KEY 和 API ID');
  }

  // 调试日志
  console.log('[Yuanqi API] ===== 开始发送审查请求 =====');
  console.log('[Yuanqi API] 目标 URL:', YUANQI_API_URL);
  console.log('[Yuanqi API] Bot ID:', botId);
  console.log('[Yuanqi API] API Key 存在:', !!apiKey);
  console.log('[Yuanqi API] 内容长度:', documentContent.length, '字符');
  console.log('[Yuanqi API] 是否流式:', !!options?.onStream);

  // 构建提示词
  const prompt = COMPLIANCE_REVIEW_PROMPT.replace('{content}', documentContent);

  const payload: YuanqiRequestPayload = {
    assistant_id: botId,
    user_id: `user_${Date.now()}`,
    stream: !!options?.onStream,
    messages: [
      {
        role: 'user',
        content: [{
          type: 'text',
          text: prompt
        }]
      }
    ]
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  let response: Response;
  try {
    console.log('[Yuanqi API] 正在发起 fetch 请求...');
    response = await fetch(YUANQI_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: options?.signal
    });
    console.log('[Yuanqi API] fetch 响应状态:', response.status, response.statusText);
  } catch (error: any) {
    console.error('[Yuanqi API] fetch 请求失败:', error.message);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接或智能体状态');
    }
    throw new Error(`网络请求失败: ${error.message}`);
  }

  if (!response.ok) {
    console.error('[Yuanqi API] HTTP 错误状态:', response.status);
    let errorMessage = `API 请求失败 (HTTP ${response.status})`;
    try {
      const errorData: YuanqiResponse = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.error?.code) {
        errorMessage = `API 错误 (${errorData.error.code}): ${errorData.error.message || '未知错误'}`;
      }
    } catch {
      try {
        const text = await response.text();
        if (text && text.length < 200) {
          errorMessage = text;
        }
      } catch {
        // 忽略解析错误
      }
    }

    // 提供更友好的错误提示
    if (response.status === 401) {
      throw new Error('API KEY 无效，请检查系统设置中的 KEY 是否正确');
    } else if (response.status === 403) {
      throw new Error('无访问权限，请确认智能体已发布且 KEY 有效');
    } else if (response.status === 404) {
      throw new Error('API ID 无效，请检查系统设置中的 ID 是否正确');
    } else if (response.status === 429) {
      throw new Error('请求过于频繁，请稍后再试');
    }
    
    throw new Error(errorMessage);
  }

  // 流式处理
  if (options?.onStream && response.body) {
    console.log('[Yuanqi API] 开启流式响应处理');
    return handleStreamResponse(response, options.onStream);
  }

  // 非流式处理
  const data: YuanqiResponse = await response.json();
  
  // 检查 API 返回的错误
  if (data.error) {
    console.error('[Yuanqi API] AI 返回错误:', data.error);
    throw new Error(data.error.message || 'AI 处理失败');
  }

  const content = data.choices?.[0]?.message?.content || '';
  
  if (!content || content.trim() === '') {
    throw new Error('AI 返回内容为空，请检查智能体配置是否正确');
  }
  
  console.log('[Yuanqi API] 请求成功，返回内容长度:', content.length);
  console.log('[Yuanqi API] ===== 请求完成 =====');
  
  return content;
}

/**
 * 处理 SSE 流式响应
 */
async function handleStreamResponse(
  response: Response,
  onChunk: (text: string) => void
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === '[DONE]') continue;
        
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6);
          try {
            const parsed: YuanqiResponse = JSON.parse(dataStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content || '';
            if (deltaContent) {
              fullText += deltaContent;
              onChunk(fullText);
            }
          } catch {
            // 解析失败则跳过当前行
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!fullText.trim()) {
    throw new Error('AI 返回内容为空');
  }

  return fullText;
}

/**
 * 测试 API 连接是否有效
 */
export async function testYuanqiConnection(
  config: YuanqiConfig
): Promise<{ success: boolean; message: string }> {
  if (!config.apiKey || !config.botId) {
    return { success: false, message: '请先填写 API ID 和 API KEY' };
  }

  try {
    const result = await sendComplianceReview(config, '你好，请回复"连接成功"', {
      signal: AbortSignal.timeout(60000)
    });
    
    // 检查返回内容是否合理
    if (result && result.length > 0) {
      return { 
        success: true, 
        message: result.includes('成功') || result.includes('OK') || result.includes('你好')
          ? '连接成功！智能体已就绪。' 
          : `连接成功，AI 已响应 (${result.length} 字符)` 
      };
    } else {
      return { success: false, message: '连接成功但 AI 返回内容为空' };
    }
  } catch (error: any) {
    let errorMsg = error.message || '连接失败';
    
    // 根据错误类型提供更友好的提示
    if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('KEY 无效')) {
      errorMsg = 'API KEY 无效，请检查 KEY 是否正确';
    } else if (errorMsg.includes('404') || errorMsg.includes('Not Found') || errorMsg.includes('ID 无效')) {
      errorMsg = 'API ID 无效，请检查 ID 是否正确';
    } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout') || errorMsg.includes('超时')) {
      errorMsg = '连接超时，请检查网络或智能体状态';
    } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
      errorMsg = '无访问权限，请确认智能体已发布';
    }
    
    return { success: false, message: errorMsg };
  }
}