import type { RendererApi } from "./api";

declare global {
  interface Window {
    api: RendererApi;
  }
}

export {};
