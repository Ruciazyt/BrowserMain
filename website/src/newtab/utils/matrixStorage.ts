const MATRIX_KEY_STORAGE = 'browsermain_matrix_access_token';
const MATRIX_BOT_TOKEN_STORAGE = 'browsermain_matrix_bot_token';

export async function getMatrixAccessToken(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(MATRIX_KEY_STORAGE, (result: Record<string, string>) => {
      resolve(result[MATRIX_KEY_STORAGE] || '');
    });
  });
}

export async function saveMatrixAccessToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [MATRIX_KEY_STORAGE]: token }, resolve);
  });
}

export async function clearMatrixAccessToken(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(MATRIX_KEY_STORAGE, resolve);
  });
}

export async function getMatrixBotToken(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(MATRIX_BOT_TOKEN_STORAGE, (result: Record<string, string>) => {
      resolve(result[MATRIX_BOT_TOKEN_STORAGE] || '');
    });
  });
}

export async function saveMatrixBotToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [MATRIX_BOT_TOKEN_STORAGE]: token }, resolve);
  });
}
