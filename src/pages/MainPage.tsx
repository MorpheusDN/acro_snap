import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Database,
  FileText,
  KeyRound,
  Maximize2,
  MessageSquare,
  Minus,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
  X,
  Zap
} from 'lucide-react';
import type { AcronymEntry, AppSettings } from '../types';
import { EntryCard } from '../components/EntryCard';
import { EntryDetail } from '../components/EntryDetail';
import { NoteEditor } from '../components/NoteEditor';
import { extractEntriesFromLongText } from '../services/ai';
import { filterEntries, loadLocalEntries, saveEntry } from '../services/lexicon';
import { extractEntriesFromPaste } from '../services/pasteExtractor';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings';
import { useThemeMode } from '../services/theme';

type Tab = 'lexicon' | 'settings' | 'sync';

export function MainPage() {
  const [tab, setTab] = useState<Tab>('lexicon');
  const [entries, setEntries] = useState<AcronymEntry[]>(() => loadLocalEntries());
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<AppSettings>(() => loadSettings());
  const [saved, setSaved] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AcronymEntry | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteSaved, setPasteSaved] = useState(false);
  const [extractedEntries, setExtractedEntries] = useState<AcronymEntry[]>([]);
  const [selectedExtractIds, setSelectedExtractIds] = useState<Set<string>>(() => new Set());
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [lastExtractedText, setLastExtractedText] = useState('');
  const [noteEntry, setNoteEntry] = useState<AcronymEntry | null>(null);
  const { theme, toggle } = useThemeMode();

  useEffect(() => {
    const refresh = () => setEntries(loadLocalEntries());
    window.addEventListener('acro-entries-updated', refresh);
    return () => window.removeEventListener('acro-entries-updated', refresh);
  }, []);

  useEffect(() => {
    if (tab === 'settings') {
      setDraft(loadSettings());
      setSaved(false);
    }
  }, [tab]);

  useEffect(() => {
    const text = pasteText.trim();
    if (!pasteOpen || !text || text === lastExtractedText || extracting) return;

    const timer = window.setTimeout(() => {
      void handleSmartExtract(text);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [pasteOpen, pasteText, lastExtractedText, extracting]);

  const filtered = useMemo(() => (query.trim() ? filterEntries(query) : entries), [entries, query]);
  const activeEntry = useMemo(() => {
    if (!selectedEntry) return null;
    return entries.find((entry) => entry.id === selectedEntry.id || entry.acronym === selectedEntry.acronym) || selectedEntry;
  }, [entries, selectedEntry]);

  function updateDraft(next: Partial<AppSettings>) {
    setDraft((current) => ({ ...current, ...next }));
    setSaved(false);
  }

  function handleSaveSettings() {
    saveSettings(draft);
    setSaved(true);
  }

  async function handleSaveEntry(entry: AcronymEntry) {
    await saveEntry(entry);
  }

  async function handleSaveNote(notes: string) {
    if (!noteEntry) return;
    const next = {
      ...noteEntry,
      notes,
      updatedAt: new Date().toISOString()
    };
    await saveEntry(next);
    setEntries(loadLocalEntries());
    setSelectedEntry((current) => current && current.id === noteEntry.id ? next : current);
    setNoteEntry(null);
  }

  async function handleSaveExtracted() {
    const selectedEntries = extractedEntries.filter((entry) => selectedExtractIds.has(entry.id));
    for (const entry of selectedEntries) {
      await saveEntry(entry);
    }
    setPasteSaved(true);
    setEntries(loadLocalEntries());
  }

  function resetPasteExtraction(nextText = '') {
    setPasteText(nextText);
    setPasteSaved(false);
    setExtractedEntries([]);
    setSelectedExtractIds(new Set());
    setExtractError('');
    if (!nextText.trim()) setLastExtractedText('');
  }

  function setExtractedCandidates(entries: AcronymEntry[]) {
    setExtractedEntries(entries);
    setSelectedExtractIds(new Set(entries.map((entry) => entry.id)));
  }

  function toggleExtractSelection(id: string) {
    setPasteSaved(false);
    setSelectedExtractIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getNotesPreview(entry: AcronymEntry) {
    return entry.notes
      ?.replace(/[`*_>#-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  }

  async function handleSmartExtract(sourceText = pasteText) {
    const text = sourceText.trim();
    if (!text || extracting) return;

    setExtracting(true);
    setPasteSaved(false);
    setExtractError('');
    setLastExtractedText(text);
    try {
      const aiEntries = await extractEntriesFromLongText(text);
      const fallbackEntries = aiEntries.length ? [] : extractEntriesFromPaste(text);
      const nextEntries = aiEntries.length ? aiEntries : fallbackEntries;
      setExtractedCandidates(nextEntries);
      if (!nextEntries.length) setExtractError('没有识别到可入库的缩写条目。');
    } catch (error) {
      const fallbackEntries = extractEntriesFromPaste(text);
      setExtractedCandidates(fallbackEntries);
      setExtractError(
        fallbackEntries.length
          ? `AI 智能提取失败，已使用本地规则提取：${error instanceof Error ? error.message : '未知错误'}`
          : `AI 智能提取失败：${error instanceof Error ? error.message : '未知错误'}`
      );
    } finally {
      setExtracting(false);
    }
  }

  return (
    <main className={sidebarHidden ? 'app-shell main-window sidebar-collapsed' : 'app-shell main-window'}>
      <div className="main-titlebar draggable">
        <div className="titlebar-brand">
          <button
            className="titlebar-sidebar-toggle"
            onClick={() => setSidebarHidden((value) => !value)}
            title={sidebarHidden ? '显示侧栏' : '隐藏侧栏'}
          >
            {sidebarHidden ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <span className="titlebar-dot" />
          <strong>AcroSnap</strong>
          <span>Windows Desktop</span>
        </div>
        <div className="window-controls">
          <button className="window-control" onClick={toggle} title={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="window-control" onClick={() => window.acroSnap?.minimizeWindow()} title="最小化">
            <Minus size={15} />
          </button>
          <button className="window-control" onClick={() => window.acroSnap?.toggleMaximizeWindow()} title="最大化">
            <Maximize2 size={14} />
          </button>
          <button className="window-control close" onClick={() => window.acroSnap?.closeWindow()} title="关闭">
            <X size={15} />
          </button>
        </div>
      </div>

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AS</div>
          <div>
            <strong>AcroSnap</strong>
            <span>Research Lexicon</span>
          </div>
        </div>
        <nav>
          <button className={tab === 'lexicon' ? 'nav-link active' : 'nav-link'} onClick={() => setTab('lexicon')}>
            <Database size={18} /> 词库
          </button>
          <button className={tab === 'settings' ? 'nav-link active' : 'nav-link'} onClick={() => setTab('settings')}>
            <KeyRound size={18} /> 服务配置
          </button>
          <button className={tab === 'sync' ? 'nav-link active' : 'nav-link'} onClick={() => setTab('sync')}>
            <Settings size={18} /> 同步状态
          </button>
        </nav>
        <div className="shortcut-panel">
          <div><Zap size={16} /> Alt+1 极速查询</div>
          <div><MessageSquare size={16} /> Alt+2 深度对话</div>
        </div>
      </aside>

      <section className="content-area">
        {noteEntry && (
          <NoteEditor
            entry={noteEntry}
            onCancel={() => setNoteEntry(null)}
            onSave={handleSaveNote}
          />
        )}

        {tab === 'lexicon' && activeEntry && (
          <EntryDetail
            entry={activeEntry}
            entries={entries}
            onBack={() => setSelectedEntry(null)}
            onAsk={() => window.acroSnap?.openChat({ entry: activeEntry, query })}
            onSave={() => handleSaveEntry(activeEntry)}
            onEditNote={() => setNoteEntry(activeEntry)}
            onOpenEntry={(entry) => setSelectedEntry(entry)}
          />
        )}

        {tab === 'lexicon' && !activeEntry && (
          <>
            <header className="main-header">
              <div>
                <p className="eyebrow">Windows Multi-Window</p>
                <h1>多领域缩写知识库</h1>
              </div>
              <div className="main-header-actions">
                <button className="button secondary" onClick={() => setPasteOpen((value) => !value)}>
                  <FileText size={16} />
                  粘贴提取
                </button>
                <button className="button primary" onClick={() => window.acroSnap?.showSearch()}>
                  <Search size={16} />
                  打开极速查询
                </button>
              </div>
            </header>

            {pasteOpen && (
              <section className="paste-panel">
                <div className="paste-panel-head">
                  <div>
                    <p className="eyebrow">Bulk Extract</p>
                    <h2>粘贴一段说明，自动识别缩写并入库</h2>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => {
                      resetPasteExtraction();
                    }}
                  >
                    清空
                  </button>
                </div>
                <textarea
                  value={pasteText}
                  onChange={(event) => {
                    resetPasteExtraction(event.target.value);
                  }}
                  placeholder="粘贴 Markdown、笔记、AI 回答或网页段落。例如：CPO = Co-Packaged Optics，光电共封装..."
                />
                <div className="paste-result-head">
                  <span>
                    {extracting
                      ? '大模型正在识别缩写、含义和拓展知识...'
                      : extractedEntries.length
                        ? `识别到 ${extractedEntries.length} 个候选条目，已选择 ${selectedExtractIds.size} 个入库`
                        : pasteText.trim()
                          ? '粘贴后会自动智能识别，也可以手动触发'
                          : '等待粘贴内容'}
                  </span>
                  <div className="paste-result-actions">
                    <button
                      className="button secondary"
                      onClick={() => handleSmartExtract()}
                      disabled={!pasteText.trim() || extracting}
                    >
                      <Zap size={16} />
                      {extracting ? '识别中' : extractedEntries.length ? '重新识别' : '智能识别'}
                    </button>
                    <button className="button primary" onClick={handleSaveExtracted} disabled={!selectedExtractIds.size || extracting}>
                      {pasteSaved ? <Check size={16} /> : <Database size={16} />}
                      {pasteSaved ? '已入库' : '一键入库'}
                    </button>
                  </div>
                </div>
                {extractError && <p className="paste-extract-message">{extractError}</p>}
                {extractedEntries.length > 0 && (
                  <div className="paste-select-tools">
                    <button className="button secondary" onClick={() => setSelectedExtractIds(new Set(extractedEntries.map((entry) => entry.id)))}>
                      全选
                    </button>
                    <button className="button secondary" onClick={() => setSelectedExtractIds(new Set())}>
                      全不选
                    </button>
                  </div>
                )}
                {extractedEntries.length > 0 && (
                  <div className="paste-preview-grid">
                    {extractedEntries.map((entry) => {
                      const notesPreview = getNotesPreview(entry);
                      return (
                        <div key={entry.id} className={selectedExtractIds.has(entry.id) ? 'paste-preview-card selected' : 'paste-preview-card'}>
                          <label className="paste-select-row">
                            <input
                              type="checkbox"
                              checked={selectedExtractIds.has(entry.id)}
                              onChange={() => toggleExtractSelection(entry.id)}
                            />
                            <span>入库</span>
                          </label>
                          <button type="button" onClick={() => setSelectedEntry(entry)}>
                            <strong>{entry.acronym}</strong>
                            <span>{entry.fullName}</span>
                            <em>{entry.chinese}</em>
                            <small>{entry.domain}</small>
                            {notesPreview && <p>{notesPreview}</p>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            <section className="lexicon-toolbar">
              <div>
                <strong>{entries.length}</strong>
                <span>条词条已缓存</span>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="过滤词库：LLM / PE / ROI / Co-Packaged..."
              />
            </section>

            <section className="entry-grid">
              {filtered.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  compact
                  onOpen={() => setSelectedEntry(entry)}
                />
              ))}
            </section>
          </>
        )}

        {tab === 'settings' && (
          <>
            <header className="main-header">
              <div>
                <p className="eyebrow">Service Configuration</p>
                <h1>服务配置</h1>
              </div>
            </header>

            <section className="settings-grid">
              <label>
                <span>AI Endpoint</span>
                <input
                  value={draft.aiEndpoint}
                  onChange={(event) => updateDraft({ aiEndpoint: event.target.value })}
                  placeholder="https://ark.cn-beijing.volces.com/api/v3"
                />
              </label>
              <label>
                <span>AI API Key</span>
                <input
                  type="password"
                  value={draft.aiApiKey}
                  onChange={(event) => updateDraft({ aiApiKey: event.target.value })}
                  placeholder="留空时会尝试读取环境变量 ARK_API_KEY"
                />
              </label>
              <label>
                <span>Model</span>
                <input
                  value={draft.aiModel || defaultSettings.aiModel}
                  onChange={(event) => updateDraft({ aiModel: event.target.value })}
                  placeholder="doubao-seed-2-0-mini-260428"
                />
              </label>
              <label>
                <span>Supabase URL</span>
                <input
                  value={draft.supabaseUrl}
                  onChange={(event) => updateDraft({ supabaseUrl: event.target.value })}
                  placeholder="https://xxxx.supabase.co"
                />
              </label>
              <label className="wide">
                <span>Supabase Publishable Key</span>
                <input
                  type="password"
                  value={draft.supabasePublishableKey}
                  onChange={(event) => updateDraft({ supabasePublishableKey: event.target.value })}
                  placeholder="sb_publishable_xxxxxxxxxxxxxxxx"
                />
              </label>
            </section>

            <div className="settings-actions">
              <button className="button primary" onClick={handleSaveSettings}>
                {saved ? <Check size={16} /> : <KeyRound size={16} />}
                {saved ? '已保存' : '保存配置'}
              </button>
              {saved && <span className="settings-saved-hint">配置已写入本地，立即生效</span>}
            </div>
          </>
        )}

        {tab === 'sync' && (
          <>
            <header className="main-header">
              <div>
                <p className="eyebrow">Cross Device Sync</p>
                <h1>同步状态</h1>
              </div>
            </header>
            <section className="sync-panel">
              <h2>Windows 桌面端优先，后续可复用同一套云端词库</h2>
              <p>
                当前保存会写入本地缓存；配置 Supabase 后，新词条会同步到云端 `acronyms` 表。
                后续移动端可以复用同一套字段结构和 Supabase 项目，实现多设备同步。
              </p>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
