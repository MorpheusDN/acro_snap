import { useEffect, useState } from 'react';
import { Eye, Save, X } from 'lucide-react';
import type { AcronymEntry } from '../types';
import { MarkdownView } from './MarkdownView';

type Props = {
  entry: AcronymEntry;
  onCancel: () => void;
  onSave: (notes: string) => void;
};

export function NoteEditor({ entry, onCancel, onSave }: Props) {
  const [notes, setNotes] = useState(entry.notes || '');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setNotes(entry.notes || '');
    setPreview(false);
  }, [entry]);

  return (
    <div className="note-modal-backdrop" role="presentation" onClick={onCancel}>
      <section className="note-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="note-modal-head">
          <div>
            <p className="eyebrow">Markdown Note</p>
            <h2>{entry.acronym} 笔记</h2>
            <span>{entry.fullName}</span>
          </div>
          <button className="icon-button" onClick={onCancel} title="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="note-modal-toolbar">
          <button className={preview ? 'button secondary' : 'button primary'} onClick={() => setPreview(false)}>
            编辑
          </button>
          <button className={preview ? 'button primary' : 'button secondary'} onClick={() => setPreview(true)}>
            <Eye size={16} />
            预览
          </button>
        </div>

        {preview ? (
          <div className="note-preview">
            {notes.trim() ? <MarkdownView content={notes} /> : <span>暂无笔记内容</span>}
          </div>
        ) : (
          <textarea
            className="note-textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="写下你的理解、例子、交易/论文/项目中的用法。支持 Markdown 和 LaTeX。"
          />
        )}

        <footer className="note-modal-actions">
          <button className="button secondary" onClick={onCancel}>
            取消
          </button>
          <button className="button primary" onClick={() => onSave(notes)}>
            <Save size={16} />
            保存笔记
          </button>
        </footer>
      </section>
    </div>
  );
}
