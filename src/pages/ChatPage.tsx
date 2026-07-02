import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  DatabaseZap,
  Loader2,
  Moon,
  Pin,
  PinOff,
  Send,
  Sparkles,
  Sun,
  User,
  X
} from 'lucide-react';
import type { ChatContextPayload, ChatMessage } from '../types';
import { MarkdownView } from '../components/MarkdownView';
import { chatReply, extractEntryFromText } from '../services/ai';
import { saveEntry } from '../services/lexicon';
import { useThemeMode } from '../services/theme';

type AmbiguityOption = {
  domain: string;
  meaning: string;
  hint: string;
};

type AmbiguityPrompt = {
  acronym: string;
  originalText: string;
  options: AmbiguityOption[];
};

const ambiguousAcronyms: Record<string, AmbiguityOption[]> = {
  AI: [
    { domain: 'AI / Computer Science', meaning: 'Artificial Intelligence', hint: '人工智能、机器学习、模型与算法' },
    { domain: 'Design / Software', meaning: 'Adobe Illustrator', hint: '矢量设计软件与文件工作流' }
  ],
  CNN: [
    { domain: 'AI / Vision', meaning: 'Convolutional Neural Network', hint: '卷积神经网络、图像识别' },
    { domain: 'Media', meaning: 'Cable News Network', hint: '新闻媒体与传播' }
  ],
  EPS: [
    { domain: 'Finance / Stock Trading', meaning: 'Earnings Per Share', hint: '每股收益、财报、估值' },
    { domain: 'Graphics / Publishing', meaning: 'Encapsulated PostScript', hint: '图形文件格式' }
  ],
  PE: [
    { domain: 'Finance / Valuation', meaning: 'Price-to-Earnings Ratio', hint: '市盈率、股票估值' },
    { domain: 'Finance / Investing', meaning: 'Private Equity', hint: '私募股权、一级市场' },
    { domain: 'Education / Health', meaning: 'Physical Education', hint: '体育教育' }
  ],
  RAG: [
    { domain: 'AI / Knowledge Systems', meaning: 'Retrieval-Augmented Generation', hint: '检索增强生成、知识库问答' },
    { domain: 'Management', meaning: 'Red Amber Green Status', hint: '项目状态、风险灯号' }
  ],
  ROI: [
    { domain: 'Finance / Business', meaning: 'Return on Investment', hint: '投资回报率、收益评估' },
    { domain: 'Computer Vision', meaning: 'Region of Interest', hint: '图像中的感兴趣区域' }
  ],
  SMA: [
    { domain: 'Finance / Technical Analysis', meaning: 'Simple Moving Average', hint: '均线、技术指标' },
    { domain: 'Medicine', meaning: 'Spinal Muscular Atrophy', hint: '脊髓性肌萎缩症' }
  ],
  SVM: [
    { domain: 'Machine Learning', meaning: 'Support Vector Machine', hint: '支持向量机、分类算法' },
    { domain: 'Finance / Risk', meaning: 'Stochastic Volatility Model', hint: '随机波动率模型' }
  ],
  VaR: [
    { domain: 'Finance / Risk', meaning: 'Value at Risk', hint: '风险价值、组合风险管理' },
    { domain: 'Statistics', meaning: 'Vector Autoregression', hint: '向量自回归、时间序列' }
  ]
};

const domainKeywords = [
  'ai', '人工智能', '机器学习', '深度学习', '算法', '模型', '神经网络',
  '股票', '交易', '金融', '投资', '估值', '财报', '量化', '技术指标',
  '医学', '医疗', '新闻', '媒体', '设计', '软件', '图像', '视觉', '管理'
];

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() };
}

function buildErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '未知错误';
  return [
    '这次回答没有加载成功。',
    '',
    `原因：${message}`,
    '',
    '请检查服务配置里的 AI Endpoint、API Key 和 Model。'
  ].join('\n');
}

function extractAcronym(text: string) {
  const matches = text.match(/\b[A-Za-z][A-Za-z0-9]{1,7}\b/g) || [];
  return matches.map((item) => item.toUpperCase()).find((item) => ambiguousAcronyms[item]);
}

function hasDomainHint(text: string) {
  const normalized = text.toLowerCase();
  return domainKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function findAmbiguity(text: string): AmbiguityPrompt | null {
  if (hasDomainHint(text)) return null;
  const acronym = extractAcronym(text);
  if (!acronym) return null;
  return { acronym, originalText: text, options: ambiguousAcronyms[acronym] };
}

function buildDisambiguationText(ambiguity: AmbiguityPrompt) {
  const options = ambiguity.options
    .map((option, index) => `${index + 1}. **${option.domain}**：${option.meaning}，${option.hint}`)
    .join('\n');
  return [`**${ambiguity.acronym}** 在不同领域里有多种含义。你指的是哪一个？`, '', options].join('\n');
}

function refinePrompt(ambiguity: AmbiguityPrompt, option: AmbiguityOption) {
  return [
    `我指的是 ${option.domain} 领域里的 ${ambiguity.acronym}：${option.meaning}。`,
    `原问题：${ambiguity.originalText}`,
    '',
    '请基于这个领域和含义回答。若包含公式，请使用 LaTeX，并用 $$...$$ 或 \\[...\\] 包裹独立公式。'
  ].join('\n');
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', '选择一个缩写或直接提问。我会按定义、数学形式、实现细节和研究脉络组织回答。遇到多义缩写时，我会先问你指的是哪个领域。')
  ]);
  const [ambiguities, setAmbiguities] = useState<Record<string, AmbiguityPrompt>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinned, setPinned] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useThemeMode();

  const latestAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === 'assistant'), [messages]);

  async function requestAssistant(nextMessages: ChatMessage[]) {
    setLoading(true);
    try {
      const reply = await chatReply(nextMessages);
      setMessages((current) => [...current, createMessage('assistant', reply)]);
    } catch (error) {
      setMessages((current) => [...current, createMessage('assistant', buildErrorMessage(error))]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return window.acroSnap?.onChatContext((payload: ChatContextPayload) => {
      const entry = payload.entry;
      if (!entry || loading) return;

      const context = createMessage(
        'assistant',
        `已接收当前词条上下文：**${entry.acronym}**，${entry.chinese}。\n\n${entry.summary}\n\n${entry.formula || ''}`
      );
      const prompt = createMessage(
        'user',
        `请深入解释 ${entry.acronym} (${entry.fullName})。领域是 ${entry.domain}。请包含直观定义、核心公式、典型论文或系统中的用法，以及容易混淆的相近概念。`
      );
      const nextMessages = [context, prompt];
      setMessages((current) => [...current, ...nextMessages]);
      requestAssistant(nextMessages);
    });
  }, [loading]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function togglePinned() {
    const next = !pinned;
    setPinned(next);
    await window.acroSnap?.setWindowPinned(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await sendCurrentInput();
  }

  async function sendCurrentInput() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = createMessage('user', text);
    const ambiguity = findAmbiguity(text);
    setInput('');

    if (ambiguity) {
      const assistantMessage = createMessage('assistant', buildDisambiguationText(ambiguity));
      setMessages((current) => [...current, userMessage, assistantMessage]);
      setAmbiguities((current) => ({ ...current, [assistantMessage.id]: ambiguity }));
      return;
    }

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    await requestAssistant(nextMessages);
  }

  function chooseAmbiguity(messageId: string, option: AmbiguityOption) {
    const ambiguity = ambiguities[messageId];
    if (!ambiguity || loading) return;

    const userMessage = createMessage('user', refinePrompt(ambiguity, option));
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setAmbiguities((current) => {
      const next = { ...current };
      delete next[messageId];
      return next;
    });
    requestAssistant(nextMessages);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter') return;
    if (event.ctrlKey) return;
    event.preventDefault();
    sendCurrentInput();
  }

  async function extract() {
    if (!latestAssistant || saving) return;
    setSaving(true);
    try {
      const entry = await extractEntryFromText(latestAssistant.content);
      await saveEntry(entry);
      setMessages((current) => [
        ...current,
        createMessage('assistant', `已提取并入库：**${entry.acronym}** - ${entry.fullName}\n\n可以回到主词库搜索查看。`)
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        createMessage('assistant', `提取并入库失败：${error instanceof Error ? error.message : '未知错误'}`)
      ]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="chat-window">
      <header className="chat-header draggable">
        <div>
          <p className="eyebrow">Immersive Chat</p>
          <h1>AcroSnap 深度探索</h1>
        </div>
        <div className="chat-header-actions">
          <button className="button secondary" onClick={extract} disabled={saving} title="提取并入库">
            {saving ? <Loader2 className="spin" size={16} /> : <DatabaseZap size={16} />}
            提取并入库
          </button>
          <button className="icon-button" onClick={toggle} title={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className={pinned ? 'icon-button active' : 'icon-button'} onClick={togglePinned} title={pinned ? '取消固定' : '固定窗口'}>
            {pinned ? <Pin size={17} /> : <PinOff size={17} />}
          </button>
          <button className="icon-button" onClick={() => window.acroSnap?.hideChat()} title="关闭">
            <X size={18} />
          </button>
        </div>
      </header>

      <section className="message-list" ref={scrollRef}>
        {messages.map((message) => (
          <article className={`message ${message.role}`} key={message.id}>
            <div className="avatar">{message.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}</div>
            <div className="bubble">
              <MarkdownView content={message.content} />
              {message.content.startsWith('已提取并入库') && <CheckCircle2 className="save-check" size={18} />}
              {ambiguities[message.id] && (
                <div className="ambiguity-actions">
                  {ambiguities[message.id].options.map((option) => (
                    <button key={`${option.domain}-${option.meaning}`} onClick={() => chooseAmbiguity(message.id, option)}>
                      <strong>{option.domain}</strong>
                      <span>{option.meaning}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
        {loading && (
          <article className="message assistant">
            <div className="avatar"><Sparkles size={18} /></div>
            <div className="bubble thinking"><Loader2 className="spin" size={18} /> 正在组织公式、定义和上下文...</div>
          </article>
        )}
      </section>

      <form className="composer" onSubmit={submit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder="继续追问：例如 PE、ROI、CNN、RAG 分别在不同领域是什么意思..."
        />
        <button className="button primary" type="submit" disabled={!input.trim() || loading}>
          <Send size={16} />
          发送
        </button>
      </form>
    </main>
  );
}
