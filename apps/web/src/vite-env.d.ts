/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_TENANT_ID?: string;
  readonly VITE_DEMO_USER_ID?: string;
  readonly VITE_DEMO_USER_NAME?: string;
  readonly VITE_DEMO_USER_INITIALS?: string;
  readonly VITE_DEMO_USER_PHOTO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
