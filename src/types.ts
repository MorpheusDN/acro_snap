export type Tag = {
  en: string;
  zh: string;
};

export type AcronymEntry = {
  id: string;
  acronym: string;
  fullName: string;
  chinese: string;
  domain: string;
  summary: string;
  formula?: string;
  formulaExplanation?: string;
  tags: Tag[];
  source: 'local' | 'ai' | 'supabase';
  updatedAt: string;
  wikiTitle?: string;
  wikiUrl?: string;
  wikiSummary?: string;
  wikiThumbnailUrl?: string;
  wikiLanguage?: 'en' | 'zh';
  aliases?: string[];
  examples?: string[];
  relatedIds?: string[];
  notes?: string;
};

export type WikiSummary = {
  title: string;
  extract: string;
  url: string;
  thumbnailUrl?: string;
  language: 'en' | 'zh';
};

export type AppSettings = {
  aiEndpoint: string;
  aiApiKey: string;
  aiModel: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseAnonKey?: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type ChatContextPayload = {
  entry?: AcronymEntry;
  query?: string;
};

declare global {
  interface Window {
    acroSnap?: {
      hideSearch: () => Promise<void>;
      showSearch: () => Promise<void>;
      openChat: (payload?: ChatContextPayload) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      chatCompletion: (request: {
        endpoint: string;
        apiKey: string;
        model: string;
        messages: Array<{ role: 'system' | ChatMessage['role']; content: string }>;
        mode?: 'chat' | 'responses';
        instructions?: string;
        temperature?: number;
      }) => Promise<{ ok: boolean; status: number; text: string; endpoint?: string }>;
      hideChat: () => Promise<void>;
      setWindowPinned: (pinned: boolean) => Promise<void>;
      minimizeWindow: () => Promise<void>;
      toggleMaximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      onChatContext: (callback: (payload: ChatContextPayload) => void) => () => void;
    };
  }
}
