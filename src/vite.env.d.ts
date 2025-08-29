/// <reference types="vite/client" />
/// <reference types="vite-plugin-pages/client-solid" />
/// <reference types="@atcute/bluesky" />
/// <reference types="@atcute/atproto" />

interface ImportMetaEnv {
  readonly VITE_DEV_SERVER_PORT?: string;
  readonly VITE_CLIENT_URI: string;
  readonly VITE_OAUTH_CLIENT_ID: string;
  readonly VITE_OAUTH_REDIRECT_URL: string;
  readonly VITE_OAUTH_SCOPE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
