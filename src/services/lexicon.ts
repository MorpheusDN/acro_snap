import { createClient } from '@supabase/supabase-js';
import type { AcronymEntry, Tag } from '../types';
import { sampleEntries } from './sampleData';
import { loadSettings } from './settings';

const storageKey = 'acro-snap:entries';

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function entryKey(entry: Pick<AcronymEntry, 'acronym' | 'domain' | 'fullName'>) {
  return [entry.acronym, entry.domain, entry.fullName].map(normalize).join('|');
}

function normalizeTag(tag: unknown): Tag {
  if (typeof tag === 'string') return { en: tag, zh: tag };
  if (tag && typeof tag === 'object') {
    const value = tag as Partial<Tag>;
    return {
      en: value.en || value.zh || '',
      zh: value.zh || value.en || ''
    };
  }
  return { en: String(tag), zh: String(tag) };
}

function normalizeTags(tags: unknown): Tag[] {
  if (!Array.isArray(tags)) return [];
  return tags.map(normalizeTag).filter((tag) => tag.en || tag.zh);
}

function normalizeEntry(entry: AcronymEntry): AcronymEntry {
  return {
    ...entry,
    tags: normalizeTags(entry.tags)
  };
}

function mergeEntries(entries: AcronymEntry[]) {
  const map = new Map<string, AcronymEntry>();
  [...sampleEntries, ...entries].forEach((entry) => {
    const normalized = normalizeEntry(entry);
    map.set(entryKey(normalized), normalized);
  });
  return [...map.values()].sort((a, b) => a.acronym.localeCompare(b.acronym));
}

export function loadLocalEntries(): AcronymEntry[] {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return sampleEntries;
  try {
    return mergeEntries(JSON.parse(raw));
  } catch {
    return sampleEntries;
  }
}

export function searchEntries(query: string): AcronymEntry[] {
  const q = normalize(query);
  if (!q) return [];

  return loadLocalEntries()
    .filter((entry) => {
      const acronym = normalize(entry.acronym);
      return acronym.includes(q) || fuzzyMatch(acronym, q);
    })
    .slice(0, 8);
}

export function filterEntries(query: string): AcronymEntry[] {
  const q = normalize(query);
  if (!q) return loadLocalEntries();

  return loadLocalEntries().filter((entry) => {
    const tagText = entry.tags.map((tag) => `${tag.en} ${tag.zh}`).join(' ');
    const searchable = [
      entry.acronym,
      entry.fullName,
      entry.chinese,
      entry.domain,
      entry.summary,
      entry.formulaExplanation || '',
      tagText
    ].join(' ');
    return normalize(searchable).includes(q);
  });
}

function fuzzyMatch(value: string, query: string) {
  if (query.length < 2) return false;
  let index = 0;
  for (const char of value) {
    if (char === query[index]) index += 1;
  }
  return index === query.length;
}

export async function saveEntry(entry: AcronymEntry) {
  const normalizedEntry = normalizeEntry(entry);
  const existing = loadLocalEntries().filter((item) => entryKey(item) !== entryKey(normalizedEntry));
  const next = [
    {
      ...normalizedEntry,
      source: normalizedEntry.source === 'ai' ? 'local' : normalizedEntry.source,
      updatedAt: new Date().toISOString()
    },
    ...existing
  ];
  localStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('acro-entries-updated'));
  await syncToSupabase(normalizedEntry);
}

async function syncToSupabase(entry: AcronymEntry) {
  const settings = loadSettings();
  if (!settings.supabaseUrl || !settings.supabasePublishableKey) return;

  const supabase = createClient(settings.supabaseUrl, settings.supabasePublishableKey);
  try {
    await supabase
      .from('acronyms')
      .upsert({
        id: entry.id,
        acronym: entry.acronym,
        full_name: entry.fullName,
        chinese: entry.chinese,
        domain: entry.domain,
        summary: entry.summary,
        formula: entry.formula,
        formula_explanation: entry.formulaExplanation,
        notes: entry.notes,
        tags: entry.tags,
        updated_at: entry.updatedAt
      })
      .throwOnError();
  } catch {
    // Offline or RLS failures should not block local save.
  }
}
