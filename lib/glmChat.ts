/**
 * 智谱 GLM OpenAPI（chat/completions）轻量封装，不引入额外依赖。
 * 文档：https://open.bigmodel.cn/dev/api#glm-4
 */

const ZHIPU_CHAT_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GlmChatOptions = {
  apiKey: string;
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
};

export type GlmChatResult = {
  content: string;
  raw: unknown;
};

export async function glmChatCompletion(options: GlmChatOptions): Promise<GlmChatResult> {
  const { apiKey, model = "glm-4-flash", messages, temperature = 0.6 } = options;
  if (!apiKey.trim()) {
    throw new Error("未配置智谱 API Key（环境变量 ZHIPU_API_KEY）");
  }

  const res = await fetch(ZHIPU_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  const raw = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const msg =
      typeof raw.error === "object" && raw.error !== null && "message" in raw.error
        ? String((raw.error as { message?: string }).message)
        : JSON.stringify(raw);
    throw new Error(`智谱 API 错误 (${res.status}): ${msg}`);
  }

  const choices = raw.choices as Array<{ message?: { content?: string } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    throw new Error("智谱 API 返回格式异常：无 choices[0].message.content");
  }

  return { content, raw };
}
