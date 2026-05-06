import type { AcronymEntry } from '../types';
import { sampleEntries } from './sampleData';
import { loadSettings } from './settings';

const storageKey = 'acro-snap:entries';

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function mergeEntries(entries: AcronymEntry[]) {
  const map = new Map<string, AcronymEntry>();
  [...sampleEntries, ...entries].forEach((entry) => map.set(normalize(entry.acronym), entry));
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
  if (!q) return loadLocalEntries().slice(0, 6);
  return loadLocalEntries()
    .filter((entry) => {
      const haystack = `${entry.acronym} ${entry.fullName} ${entry.chinese} ${entry.tags.join(' ')}`.toLowerCase();
      return haystack.includes(q) || fuzzyMatch(entry.acronym.toLowerCase(), q);
    })
    .slice(0, 8);
}

function fuzzyMatch(value: string, query: string) {
  let index = 0;
  for (const char of value) {
    if (char === query[index]) index += 1;
  }
  return index === query.length;
}

export async function saveEntry(entry: AcronymEntry) {
  const existing = loadLocalEntries().filter((item) => normalize(item.acronym) !== normalize(entry.acronym));
  const next = [{ ...entry, source: entry.source === 'ai' ? 'local' : entry.source, updatedAt: new Date().toISOString() }, ...existing];
  localStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('acro-entries-updated'));
  await syncToSupabase(entry);
}

async function syncToSupabase(entry: AcronymEntry) {
  const settings = loadSettings();
  if (!settings.supabaseUrl || !settings.supabaseAnonKey) return;

  const endpoint = `${settings.supabaseUrl.replace(/\/$/, '')}/rest/v1/acronyms`;
  await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: settings.supabaseAnonKey,
      Authorization: `Bearer ${settings.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      id: entry.id,
      acronym: entry.acronym,
      full_name: entry.fullName,
      chinese: entry.chinese,
      domain: entry.domain,
      summary: entry.summary,
      formula: entry.formula,
      tags: entry.tags,
      updated_at: entry.updatedAt
    })
  }).catch(() => undefined);
}
