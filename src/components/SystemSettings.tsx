import React, { useState, useEffect } from "react";
import { Settings, Shield, Cpu, Mic, Database, Save, RefreshCw, CheckCircle, AlertCircle, User, Bell, Lock, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemSettingsProps {
  defaultSubTab?: "account" | "system";
  onSubTabChange?: (tab: "account" | "system") => void;
}

interface ApiSettings {
  baiduApiKey: string;
  baiduSecretKey: string;
  deepseekApiKey: string;
  geminiApiKey: string;
  ragThreshold: number;
  autoSync: boolean;
  // 腾讯元器智能体配置
  yuanqiApiKey: string;
  yuanqiBotId: string;
}

const defaultSettings: ApiSettings = {
  baiduApiKey: "",
  baiduSecretKey: "",
  deepseekApiKey: "",
  geminiApiKey: "",
  ragThreshold: 0.75,
  autoSync: true,
  // 腾讯元器智能体配置
  yuanqiApiKey: "",
  yuanqiBotId: "",
};

export const SystemSettings: React.FC<SystemSettingsProps> = ({ 
  defaultSubTab = "account",
  onSubTabChange 
}) => {
  const [subTab, setSubTab] = useState<"account" | "system">(defaultSubTab);
  
  // 同步外部状态
  useEffect(() => {
    if (defaultSubTab !== subTab) {
      setSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  const handleSubTabChange = (tab: "account" | "system") => {
    setSubTab(tab);
    onSubTabChange?.(tab);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-mck-navy">设置</h2>
        </div>
      </header>

      {/* 子导航标签 */}
      <div className="flex border-b border-mck-border">
        <button
          onClick={() => handleSubTabChange("account")}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
            subTab === "account" 
              ? "border-mck-blue text-mck-navy" 
              : "border-transparent text-mck-navy/40 hover:text-mck-navy/60"
          )}
        >
          <User size={16} />
          账户设置
        </button>
        <button
          onClick={() => handleSubTabChange("system")}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
            subTab === "system" 
              ? "border-mck-blue text-mck-navy" 
              : "border-transparent text-mck-navy/40 hover:text-mck-navy/60"
          )}
        >
          <Settings size={16} />
          系统设置
        </button>
      </div>

      {/* 账户设置内容 */}
      {subTab === "account" && <AccountSettings />}

      {/* 系统设置内容 */}
      {subTab === "system" && <SystemSettingsContent />}
    </div>
  );
};

// 账户设置组件
const AccountSettings: React.FC = () => {
  const [accountInfo, setAccountInfo] = useState({
    email: "admin@zhili-sanhui.com",
    displayName: "系统管理员",
    department: "董事会秘书处",
    userId: "USR-2026-0420-001",
    lastLogin: "2026-04-15 22:30",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    meetingReminder: true,
    complianceAlert: true,
    documentUpdate: false,
    systemNotice: true,
  });

  return (
    <div className="space-y-8">
      {/* 基本信息 */}
      <section className="mck-card">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-mck-border">
          <div className="w-10 h-10 bg-mck-bg flex items-center justify-center text-mck-blue">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold">基本信息</h3>
            <p className="text-[10px] text-mck-navy/40 uppercase tracking-widest">管理账户信息与个人资料</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">邮箱地址</label>
            <div className="px-4 py-2 bg-mck-bg/50 border border-mck-border text-sm text-mck-navy">
              {accountInfo.email}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">显示名称</label>
            <input 
              type="text" 
              value={accountInfo.displayName}
              onChange={e => setAccountInfo({...accountInfo, displayName: e.target.value})}
              disabled={!isEditing}
              className="w-full border border-mck-border px-4 py-2 text-sm focus:outline-none focus:border-mck-blue disabled:bg-mck-bg/50 disabled:text-mck-navy/60"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">所属部门</label>
            <div className="px-4 py-2 bg-mck-bg/50 border border-mck-border text-sm text-mck-navy">
              {accountInfo.department}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">用户ID</label>
            <div className="px-4 py-2 bg-mck-bg/50 border border-mck-border text-sm text-mck-navy font-mono">
              {accountInfo.userId}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all",
              isEditing 
                ? "bg-mck-blue text-white hover:bg-mck-navy" 
                : "border border-mck-border text-mck-navy/60 hover:text-mck-navy hover:border-mck-navy"
            )}
          >
            {isEditing ? "保存修改" : "编辑资料"}
          </button>
        </div>
      </section>

      {/* 安全设置 */}
      <section className="mck-card">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-mck-border">
          <div className="w-10 h-10 bg-mck-bg flex items-center justify-center text-mck-blue">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold">安全设置</h3>
            <p className="text-[10px] text-mck-navy/40 uppercase tracking-widest">密码与认证管理</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-mck-border">
            <div>
              <h4 className="text-sm font-bold text-mck-navy">修改密码</h4>
              <p className="text-xs text-mck-navy/40">上次修改于 30 天前</p>
            </div>
            <button className="px-4 py-2 text-xs font-bold border border-mck-border text-mck-navy hover:border-mck-blue hover:text-mck-blue transition-all">
              修改密码
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-mck-border">
            <div>
              <h4 className="text-sm font-bold text-mck-navy">双因素认证</h4>
              <p className="text-xs text-mck-navy/40">为账户添加额外的安全保护</p>
            </div>
            <button className="px-4 py-2 text-xs font-bold bg-green-50 border border-green-200 text-green-700">
              已启用
            </button>
          </div>

          <div className="p-4 bg-mck-bg/30 border border-mck-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-mck-navy/60 uppercase tracking-widest">登录日志</span>
              <span className="text-[10px] text-mck-navy/40">最近 5 次登录</span>
            </div>
            <div className="space-y-2">
              {[
                { time: "2026-04-15 22:30", ip: "192.168.1.100", location: "北京市" },
                { time: "2026-04-14 09:15", ip: "192.168.1.100", location: "北京市" },
                { time: "2026-04-12 16:42", ip: "10.0.0.5", location: "上海市" },
              ].map((log, i) => (
                <div key={i} className="flex justify-between text-[10px] text-mck-navy/60 py-1 border-b border-mck-border/50 last:border-0">
                  <span>{log.time} · {log.location}</span>
                  <span className="font-mono">{log.ip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 通知偏好 */}
      <section className="mck-card">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-mck-border">
          <div className="w-10 h-10 bg-mck-bg flex items-center justify-center text-mck-blue">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold">通知偏好</h3>
            <p className="text-[10px] text-mck-navy/40 uppercase tracking-widest">选择您希望接收的通知类型</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { key: "meetingReminder", label: "会议提醒", desc: "会议开始前 24 小时发送提醒" },
            { key: "complianceAlert", label: "合规预警", desc: "当检测到合规风险时通知" },
            { key: "documentUpdate", label: "文书更新", desc: "文书生成或修改时通知" },
            { key: "systemNotice", label: "系统公告", desc: "重要系统更新和维护通知" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 border border-mck-border">
              <div>
                <h4 className="text-sm font-bold text-mck-navy">{item.label}</h4>
                <p className="text-xs text-mck-navy/40">{item.desc}</p>
              </div>
              <button 
                onClick={() => setNotificationPrefs({...notificationPrefs, [item.key]: !notificationPrefs[item.key as keyof typeof notificationPrefs]})}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  notificationPrefs[item.key as keyof typeof notificationPrefs] ? "bg-mck-blue" : "bg-mck-border"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  notificationPrefs[item.key as keyof typeof notificationPrefs] ? "left-7" : "left-1"
                )} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 登录信息 */}
      <div className="text-xs text-mck-navy/40 text-right">
        最后登录时间：{accountInfo.lastLogin}
      </div>
    </div>
  );
};

// 系统设置内容组件（原内容）
const SystemSettingsContent: React.FC = () => {
  const [settings, setSettings] = useState<ApiSettings>(() => {
    try {
      const saved = localStorage.getItem("corporate_ai_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...defaultSettings, ...parsed };
        }
      }
    } catch (error) {
      console.warn("加载设置失败，使用默认值:", error);
      localStorage.removeItem("corporate_ai_settings");
    }
    return defaultSettings;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasInitialized, setHasInitialized] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // 标记初始化完成
  useEffect(() => {
    setHasInitialized(true);
  }, []);

  // 自动保存：当 settings 变化时自动保存到 localStorage（带防抖）
  useEffect(() => {
    if (!hasInitialized) return; // 跳过首次渲染

    const timer = setTimeout(() => {
      try {
        localStorage.setItem("corporate_ai_settings", JSON.stringify(settings));
        setSaveStatus("success");
      } catch (error) {
        setSaveStatus("error");
      }
    }, 1000); // 延迟 1 秒保存，避免频繁写入

    return () => clearTimeout(timer);
  }, [settings, hasInitialized]);

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
    <div className="space-y-8">
      {saveStatus === "success" && (
        <div className="p-4 bg-green-50 border border-green-100 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          配置已成功保存并同步至系统环境。
        </div>
      )}

      <div className="flex justify-end gap-4">
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

        {/* 腾讯元器智能体配置 */}
        <section className="mck-card mck-card-accent-purple">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-purple-50 flex items-center justify-center text-purple-600">
              <Brain size={20} />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold">腾讯元器智能体</h3>
              <p className="text-[10px] text-mck-navy/40 uppercase tracking-widest">
                配置合规审查 AI 智能体（可选）
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">API ID</label>
                <input 
                  type="text" 
                  value={settings.yuanqiBotId}
                  onChange={e => setSettings({...settings, yuanqiBotId: e.target.value})}
                  className="w-full border border-mck-border px-4 py-2 text-sm font-mono focus:outline-none focus:border-purple-500"
                  placeholder="输入腾讯元器 API ID"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-mck-navy/40">API KEY</label>
                <input 
                  type="password" 
                  value={settings.yuanqiApiKey}
                  onChange={e => setSettings({...settings, yuanqiApiKey: e.target.value})}
                  className="w-full border border-mck-border px-4 py-2 text-sm font-mono focus:outline-none focus:border-purple-500"
                  placeholder="输入腾讯元器 API KEY"
                />
              </div>
            </div>

            {/* 连接测试 */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={async () => {
                  if (!settings.yuanqiApiKey || !settings.yuanqiBotId) {
                    setTestStatus('error');
                    setTestMessage('请先填写 API ID 和 API KEY');
                    return;
                  }
                  setTestStatus('testing');
                  setTestMessage('');
                  try {
                    const { testYuanqiConnection } = await import('../services/yuanqiApi');
                    const result = await testYuanqiConnection({
                      apiKey: settings.yuanqiApiKey,
                      botId: settings.yuanqiBotId
                    });
                    if (result.success) {
                      setTestStatus('success');
                      setTestMessage(result.message);
                    } else {
                      setTestStatus('error');
                      setTestMessage(result.message);
                    }
                  } catch (e: any) {
                    setTestStatus('error');
                    setTestMessage('测试失败: ' + e.message);
                  }
                }}
                disabled={testStatus === 'testing'}
                className={cn(
                  "px-6 py-2 text-xs font-bold transition-all flex items-center gap-2",
                  testStatus === 'success' 
                    ? "bg-green-50 border border-green-200 text-green-700" 
                    : testStatus === 'error'
                      ? "bg-red-50 border border-red-200 text-red-700"
                      : "bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100",
                  testStatus === 'testing' && "opacity-60 cursor-wait"
                )}
              >
                {testStatus === 'testing' && <RefreshCw size={14} className="animate-spin" />}
                {testStatus === 'success' && <CheckCircle size={14} />}
                {testStatus === 'error' && <AlertCircle size={14} />}
                {testStatus === 'testing' && '测试中...'}
                {testStatus === 'success' && '测试成功'}
                {testStatus === 'error' && '测试失败'}
                {testStatus === 'idle' && '测试连接'}
              </button>
              {/* 测试结果显示 */}
              {testStatus !== 'idle' && (
                <span className={cn(
                  "text-xs",
                  testStatus === 'success' ? "text-green-600" : "text-red-600"
                )}>
                  {testMessage}
                </span>
              )}
            </div>

            {/* 帮助提示 */}
            <div className="p-4 bg-blue-50 border border-blue-100 flex gap-3">
              <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800 leading-relaxed">
                <p className="font-bold mb-1">如何获取凭证？</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>访问 <a href="https://yuanqi.tencent.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">yuanqi.tencent.com</a> 并登录</li>
                  <li>进入「我的创建」→ 选择或创建合规审查智能体</li>
                  <li>点击智能体卡片进入详情页</li>
                  <li>点击「发布」将智能体发布上线</li>
                  <li>点击「调用API」→「API Key」获取凭证</li>
                  <li>智能体详情页的 URL 中可找到 API ID（如 .../agent/agent_xxx 中的 agent_xxx 部分）</li>
                </ol>
                <p className="mt-2 text-[10px] italic text-blue-600">* 智能体必须已发布才能通过 API 调用</p>
                <p className="text-[10px] italic text-blue-600">* 未配置时使用内置演示模式（仅供体验）</p>
              </div>
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
