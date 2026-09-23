import { DEFAULT_SETTINGS, type Settings } from './types'

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS)
  return { ...DEFAULT_SETTINGS, ...stored } as Settings
}

export function saveSettings(patch: Partial<Settings>): Promise<void> {
  return chrome.storage.local.set(patch)
}
