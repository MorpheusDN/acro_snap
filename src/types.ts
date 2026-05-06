export type AcronymEntry = {
  id: string;
  acronym: string;
  fullName: string;
  chinese: string;
  domain: string;
  summary: string;
  formula?: string;
  tags: string[];
  source: 'local' | 'ai' | 'supabase';
  updatedAt: string;
};

export type AppSettings = {
  aiEndpoint: string;
  aiApiKey: string;
  aiModel: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
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
      onChatContext: (callback: (payload: ChatContextPayload) => void) => () => void;
    };
  }
}
