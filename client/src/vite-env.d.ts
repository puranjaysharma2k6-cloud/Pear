/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cloudflare Worker WebSocket URL — required for signaling */
  readonly VITE_CF_WORKER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
