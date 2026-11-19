/**
 * Local Vite environment typings for the Member 3 feature module.
 * These declarations avoid requiring edits to the repository root.
 */
interface ImportMetaEnv {
  readonly VITE_CARELOOP_BROWSER_DEMO?: string;
  readonly VITE_CARELOOP_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CARELOOP_USE_DEMO_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
