import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Loader2, Pin, PinOff, Search, Sparkles, X } from 'lucide-react';
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
  const [pinned, setPinned] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (query.trim() ? searchEntries(query) : []), [query]);
  const hasResults = query.trim().length > 0 && results.length > 0;

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

  async function togglePinned() {
    const next = !pinned;
    setPinned(next);
    await window.acroSnap?.setWindowPinned(next);
  }

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
        <div className="subwindow-toolbar draggable">
          <span>极速查询</span>
          <div className="subwindow-actions">
            <button className={pinned ? 'icon-button active' : 'icon-button'} onClick={togglePinned} title={pinned ? '取消固定' : '固定窗口'}>
              {pinned ? <Pin size={17} /> : <PinOff size={17} />}
            </button>
            <button className="icon-button" onClick={() => window.acroSnap?.hideSearch()} title="关闭">
              <X size={18} />
            </button>
          </div>
        </div>

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
                  <em>{entry.chinese}</em>
                  <strong>{entry.fullName}</strong>
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
                输入后展示缩写匹配；未命中时可直接进入 AI 兜底
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
