/**
 * Preferences service - public API
 */
export type { KeyValueStorePort } from "./KeyValueStorePort.ts";
export { LocalStorageAdapter } from "./LocalStorageAdapter.ts";
export type { BrowserStorage } from "./LocalStorageAdapter.ts";
export type { PreferencesPort } from "./PreferencesPort.ts";
export {
  PreferencesService,
  type PreferencesServiceDeps,
} from "./PreferencesService.ts";
