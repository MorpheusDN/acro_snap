import { useEffect, useMemo, useState } from 'react';
import { Database, KeyRound, MessageSquare, Search, Settings, Zap } from 'lucide-react';
import type { AppSettings, AcronymEntry } from '../types';
import { EntryCard } from '../components/EntryCard';
import { loadLocalEntries, searchEntries } from '../services/lexicon';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings';

export function MainPage() {
  const [entries, setEntries] = useState<AcronymEntry[]>(() => loadLocalEntries());
  const [query, setQuery] = useState('');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    const refresh = () => setEntries(loadLocalEntries());
    window.addEventListener('acro-entries-updated', refresh);
    return () => window.removeEventListener('acro-entries-updated', refresh);
  }, []);

  const filtered = useMemo(() => (query ? searchEntries(query) : entries), [entries, query]);

  function updateSettings(next: Partial<AppSettings>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    saveSettings(merged);
  }

  return (
    <main className="app-shell main-window">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AS</div>
          <div>
            <strong>AcroSnap</strong>
            <span>Research Lexicon</span>
          </div>
        </div>
        <nav>
          <a className="active"><Database size={18} /> 词库</a>
          <a><KeyRound size={18} /> 服务配置</a>
          <a><Settings size={18} /> 同步状态</a>
        </nav>
        <div className="shortcut-panel">
          <div><Zap size={16} /> Alt+1 极速查询</div>
          <div><MessageSquare size={16} /> Alt+2 深度对话</div>
        </div>
      </aside>

      <section className="content-area">
        <header className="main-header">
          <div>
            <p className="eyebrow">Windows Multi-Window</p>
            <h1>CS / AI 缩写知识库</h1>
          </div>
          <button className="button primary" onClick={() => window.acroSnap?.showSearch()}>
            <Search size={16} />
            打开极速查询
          </button>
        </header>

        <section className="settings-grid">
          <label>
            <span>AI Endpoint</span>
            <input value={settings.aiEndpoint} onChange={(event) => updateSettings({ aiEndpoint: event.target.value })} placeholder="OpenAI-compatible /v1/chat/completions" />
          </label>
          <label>
            <span>AI API Key</span>
            <input type="password" value={settings.aiApiKey} onChange={(event) => updateSettings({ aiApiKey: event.target.value })} placeholder="未填写时使用模拟 AI" />
          </label>
          <label>
            <span>Model</span>
            <input value={settings.aiModel || defaultSettings.aiModel} onChange={(event) => updateSettings({ aiModel: event.target.value })} />
          </label>
          <label>
            <span>Supabase URL</span>
            <input value={settings.supabaseUrl} onChange={(event) => updateSettings({ supabaseUrl: event.target.value })} placeholder="未填写时仅本地保存" />
          </label>
          <label className="wide">
            <span>Supabase Anon Key</span>
            <input type="password" value={settings.supabaseAnonKey} onChange={(event) => updateSettings({ supabaseAnonKey: event.target.value })} />
          </label>
        </section>

        <section className="lexicon-toolbar">
          <div>
            <strong>{entries.length}</strong>
            <span>条词条已缓存</span>
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="过滤词库：LLM / RAG / Convolution..." />
        </section>

        <section className="entry-grid">
          {filtered.map((entry) => (
            <EntryCard key={entry.id} entry={entry} compact />
          ))}
        </section>
      </section>
    </main>
  );
}
