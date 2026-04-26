const AI_KEY_STORAGE = 'browsermain_ai_key';

export async function getAIKey(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(AI_KEY_STORAGE, (result: Record<string, string>) => {
      resolve(result[AI_KEY_STORAGE] || '');
    });
  });
}

export async function saveAIKey(key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [AI_KEY_STORAGE]: key }, resolve);
  });
}

export async function clearAIKey(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(AI_KEY_STORAGE, resolve);
  });
}
