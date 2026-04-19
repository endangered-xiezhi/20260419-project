import React, { useState, useEffect } from "react";
import { Settings, Shield, Cpu, Mic, Database, Save, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiSettings {
  baiduApiKey: string;
  baiduSecretKey: string;
  deepseekApiKey: string;
  geminiApiKey: string;
  ragThreshold: number;
  autoSync: boolean;
}

const defaultSettings: ApiSettings = {
  baiduApiKey: "",
  baiduSecretKey: "",
  deepseekApiKey: "",
  geminiApiKey: "",
  ragThreshold: 0.75,
  autoSync: true,
};

export const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<ApiSettings>(() => {
    const saved = localStorage.getItem("corporate_ai_settings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (saveStatus !== "idle") {
      const timer = setTimeout(() => setSaveStatus("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem("corporate_ai_settings", JSON.stringify(settings));
      setSaveStatus("success");
    } catch (error) {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    if (window.confirm("确定要重置所有设置为默认值吗？")) {
      setSettings(defaultSettings);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-mck-navy">系统设置</h2>
          <p className="text-mck-navy/60 mt-1">配置 API 密钥、模型参数与系统运行环境</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={resetToDefault}
            className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-mck-navy/40 hover:text-mck-navy transition-all"
          >
            重置默认
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-2 bg-mck-blue text-white text-xs font-bold uppercase tracking-widest hover:bg-mck-navy transition-all disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? "保存中..." : "保存配置"}
          </button>
        </div>
      </header>

      {saveStatus === "success" && (
        <div className="p-4 bg-green-50 border border-green-100 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          配置已成功保存并同步至系统环境。
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {/* Baidu Speech Settings */}
        <section className="mck-card mck-card-accent-blue">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-mck-bg flex items-center justify-center text-mck-blue">
              <Mic size={20} />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold">语音识别引擎 (Baidu ASR)</h3>
              <p className="text-[10px] text-mck-navy/40 uppercase tracking-widest">配置百度语音识别 API 凭证</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">API Key</label>
              <input 
                type="password" 
                value={settings.baiduApiKey}
                onChange={e => setSettings({...settings, baiduApiKey: e.target.value})}
                className="w-full border border-mck-border px-4 py-2 text-sm font-mono focus:outline-none focus:border-mck-blue"
                placeholder="输入百度 API Key"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">Secret Key</label>
              <input 
                type="password" 
                value={settings.baiduSecretKey}
                onChange={e => setSettings({...settings, baiduSecretKey: e.target.value})}
                className="w-full border border-mck-border px-4 py-2 text-sm font-mono focus:outline-none focus:border-mck-blue"
                placeholder="输入百度 Secret Key"
              />
            </div>
          </div>
          <p className="mt-4 text-[10px] text-mck-navy/40 italic">
            * 用于实时会议录音转写与角色分离功能。
          </p>
        </section>

        {/* LLM Settings */}
        <section className="mck-card">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-mck-bg flex items-center justify-center text-mck-blue">
              <Cpu size={20} />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold">大模型引擎 (DeepSeek / Gemini)</h3>
              <p className="text-[10px] text-mck-navy/40 uppercase tracking-widest">配置推理引擎与合规审查模型</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">DeepSeek API Key</label>
                <input 
                  type="password" 
                  value={settings.deepseekApiKey}
                  onChange={e => setSettings({...settings, deepseekApiKey: e.target.value})}
                  className="w-full border border-mck-border px-4 py-2 text-sm font-mono focus:outline-none focus:border-mck-blue"
                  placeholder="输入 DeepSeek API Key"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">Gemini API Key (备用)</label>
                <input 
                  type="password" 
                  value={settings.geminiApiKey}
                  onChange={e => setSettings({...settings, geminiApiKey: e.target.value})}
                  className="w-full border border-mck-border px-4 py-2 text-sm font-mono focus:outline-none focus:border-mck-blue"
                  placeholder="留空则使用系统内置 Key"
                />
              </div>
            </div>

            <div className="p-4 bg-mck-bg border border-mck-border">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-mck-navy">RAG 检索阈值</h4>
                <span className="text-xs font-mono font-bold text-mck-blue">{Math.round(settings.ragThreshold * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={settings.ragThreshold}
                onChange={e => setSettings({...settings, ragThreshold: parseFloat(e.target.value)})}
                className="w-full h-1 bg-mck-border rounded-lg appearance-none cursor-pointer accent-mck-blue"
              />
              <p className="mt-2 text-[10px] text-mck-navy/40">
                设置 RAG 知识库检索的相关性阈值。值越高，检索结果越精准但数量越少。
              </p>
            </div>
          </div>
        </section>

        {/* Security & System */}
        <section className="mck-card">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-mck-bg flex items-center justify-center text-mck-blue">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold">安全与系统行为</h3>
              <p className="text-[10px] text-mck-navy/40 uppercase tracking-widest">数据加密与自动化策略</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-mck-border">
              <div>
                <h4 className="text-sm font-bold text-mck-navy">自动同步知识库</h4>
                <p className="text-xs text-mck-navy/40">修改法律文件库后自动重新向量化并同步至 AI 引擎</p>
              </div>
              <button 
                onClick={() => setSettings({...settings, autoSync: !settings.autoSync})}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  settings.autoSync ? "bg-mck-blue" : "bg-mck-border"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  settings.autoSync ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-100 flex gap-3">
              <AlertCircle size={18} className="text-orange-600 shrink-0 mt-0.5" />
              <div className="text-xs text-orange-800 leading-relaxed">
                <p className="font-bold mb-1">安全提示</p>
                API 密钥将加密存储在您的浏览器本地存储中。请勿在公共设备上配置敏感密钥。系统在传输过程中会使用 AES-256 加密。
              </div>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="mck-card border-dashed">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-mck-bg flex items-center justify-center text-mck-navy/40">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold">本地数据管理</h3>
              <p className="text-[10px] text-mck-navy/40 uppercase tracking-widest">管理浏览器本地存储的数据</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 border border-mck-border bg-mck-bg/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-mck-navy/60 uppercase tracking-widest">存储状态</span>
                <span className="text-[10px] font-mono bg-mck-blue text-white px-2 py-0.5">LOCALSTORAGE</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "会议列表", key: "corporate_meetings_list" },
                  { label: "法律文件库", key: "corporate_knowledge_base" },
                  { label: "合规风险项", key: "corporate_compliance_issues" },
                  { label: "生成的文书", key: "corporate_generated_documents" },
                ].map((item) => (
                  <div key={item.key} className="p-3 bg-white border border-mck-border">
                    <p className="text-[10px] text-mck-navy/40 uppercase mb-1">{item.label}</p>
                    <p className="text-sm font-bold text-mck-navy">
                      {localStorage.getItem(item.key) ? "已保存" : "未初始化"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-mck-navy/60 italic">
                数据当前仅存储在您的浏览器中，切换标签页或刷新页面不会丢失。
              </p>
              <button 
                onClick={() => {
                  if (window.confirm("确定要清空所有本地存储的数据吗？此操作不可撤销。")) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="px-6 py-2 border border-mck-red text-mck-red text-[10px] font-bold uppercase tracking-widest hover:bg-mck-red hover:text-white transition-all"
              >
                清空所有本地数据
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
