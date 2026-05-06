import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Loader2, Search, Sparkles, X } from 'lucide-react';
import type { AcronymEntry } from '../types';
import { EntryCard } from '../components/EntryCard';
import { explainAcronym } from '../services/ai';
import { saveEntry, searchEntries } from '../services/lexicon';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [aiEntry, setAiEntry] = useState<AcronymEntry | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchEntries(query), [query]);
  const hasResults = query.trim() && results.length > 0;

  useEffect(() => {
    inputRef.current?.focus();
    const reset = () => {
      setQuery('');
      setSelected(0);
      setAiEntry(null);
      setSaved(false);
      setTimeout(() => inputRef.current?.focus(), 20);
    };
    window.addEventListener('focus', reset);
    return () => window.removeEventListener('focus', reset);
  }, []);

  async function triggerAi() {
    if (!query.trim()) return;
    setLoading(true);
    setAiEntry(null);
    setSaved(false);
    const entry = await explainAcronym(query.trim());
    setAiEntry(entry);
    setLoading(false);
  }

  async function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      await window.acroSnap?.hideSearch();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected((value) => Math.min(value + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected((value) => Math.max(value - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (hasResults) setAiEntry(results[selected]);
      else await triggerAi();
    }
  }

  async function saveCurrent(entry: AcronymEntry) {
    await saveEntry(entry);
    setSaved(true);
  }

  return (
    <main className="search-window">
      <section className="search-panel">
        <div className="search-box">
          <Search size={22} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
              setAiEntry(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="输入 CS / AI 缩写，Enter 查询"
          />
          <button className="icon-button" onClick={() => window.acroSnap?.hideSearch()} title="关闭">
            <X size={18} />
          </button>
        </div>

        {!aiEntry && !loading && (
          <div className="result-list">
            {hasResults ? (
              results.map((entry, index) => (
                <button
                  className={selected === index ? 'result-item active' : 'result-item'}
                  key={entry.id}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => setAiEntry(entry)}
                >
                  <span>{entry.acronym}</span>
                  <strong>{entry.fullName}</strong>
                  <em>{entry.chinese}</em>
                </button>
              ))
            ) : query.trim() ? (
              <button className="result-item ai-fallback" onClick={triggerAi}>
                <Sparkles size={18} />
                <strong>未找到，按回车让 AI 解释</strong>
                <em>{query}</em>
              </button>
            ) : (
              <div className="empty-search">
                <CornerDownLeft size={18} />
                本地缓存会实时模糊匹配，未命中时自动进入 AI 兜底
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="skeleton-card">
            <Loader2 className="spin" size={24} />
            <div><span /></div>
            <div><span /></div>
            <div><span /></div>
          </div>
        )}

        {aiEntry && (
          <EntryCard
            entry={aiEntry}
            saved={saved}
            onSave={() => saveCurrent(aiEntry)}
            onAsk={() => window.acroSnap?.openChat({ entry: aiEntry, query })}
          />
        )}
      </section>
    </main>
  );
}
