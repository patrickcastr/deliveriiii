/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_WS: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
