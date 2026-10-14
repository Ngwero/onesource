/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_STORAGE_BUCKET?: string;
  /** "true" only after Supabase Storage image transformations are enabled. */
  readonly VITE_SUPABASE_IMAGE_TRANSFORMS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
