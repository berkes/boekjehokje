interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_CALENDAR_API_BASE?: string;
  readonly VITE_GOOGLE_PEOPLE_API_BASE?: string;
  BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
