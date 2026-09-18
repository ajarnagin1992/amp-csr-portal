/// <reference types="vite/client" />

// Vite's own ImportMetaEnv has an `[key: string]: any` index signature, which
// makes every env read `any`. Declaring the vars we use narrows them back.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
