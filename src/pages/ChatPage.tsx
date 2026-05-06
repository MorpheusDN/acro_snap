import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, DatabaseZap, Loader2, Send, Sparkles, User } from 'lucide-react';
import type { ChatContextPayload, ChatMessage } from '../types';
import { MarkdownView } from '../components/MarkdownView';
import { chatReply, extractEntryFromText } from '../services/ai';
import { saveEntry } from '../services/lexicon';

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() };
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', '选择一个缩写或直接提问。我会按定义、数学形式、实现细节和研究脉络组织回答。')
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const latestAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === 'assistant'), [messages]);

  useEffect(() => {
    return window.acroSnap?.onChatContext((payload: ChatContextPayload) => {
      const entry = payload.entry;
      if (!entry) return;
      const prompt = `请深入解释 ${entry.acronym} (${entry.fullName})，包含直观定义、核心公式、典型论文/系统中的用法，以及容易混淆的相近概念。`;
      setMessages((current) => [
        ...current,
        createMessage('user', prompt),
        createMessage('assistant', `已接收来自极速查询的上下文：**${entry.acronym}**，${entry.chinese}。\n\n${entry.summary}\n\n${entry.formula || ''}`)
      ]);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || loading) return;
    const userMessage = createMessage('user', input.trim());
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    const reply = await chatReply(nextMessages);
    setMessages((current) => [...current, createMessage('assistant', reply)]);
    setLoading(false);
  }

  async function extract() {
    if (!latestAssistant || saving) return;
    setSaving(true);
    const entry = await extractEntryFromText(latestAssistant.content);
    await saveEntry(entry);
    setSaving(false);
  }

  return (
    <main className="chat-window">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Immersive Chat</p>
          <h1>AcroSnap 深度探索</h1>
        </div>
        <button className="button secondary" onClick={extract} disabled={saving}>
          {saving ? <Loader2 className="spin" size={16} /> : <DatabaseZap size={16} />}
          提取并入库
        </button>
      </header>

      <section className="message-list" ref={scrollRef}>
        {messages.map((message) => (
          <article className={`message ${message.role}`} key={message.id}>
            <div className="avatar">{message.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}</div>
            <div className="bubble">
              <MarkdownView content={message.content} />
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
        <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="继续追问：例如它和 MoE / LoRA / RAG 的关系..." />
        <button className="button primary" type="submit" disabled={!input.trim() || loading}>
          <Send size={16} />
          发送
        </button>
      </form>
    </main>
  );
}
