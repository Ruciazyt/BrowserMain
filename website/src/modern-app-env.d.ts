/// <reference types='@modern-js/app-tools/types' />

// Chrome extension API
declare const chrome: typeof globalThis & {
  runtime: {
    onMessage: {
      addListener: (listener: (...args: any[]) => void) => void;
      removeListener: (listener: (...args: any[]) => void) => void;
    };
    sendMessage: (message: any, responseCallback?: (response: any) => void) => void;
    getURL: (path: string) => string;
    id: string;
  };
  bookmarks: {
    getTree: (callback: (results: any[]) => void) => void;
  };
  storage: {
    local: {
      get: (keys: string | string[] | object, callback: (result: any) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
    };
    sync: {
      get: (keys: string | string[] | object, callback: (result: any) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
    };
  };
  tabs: {
    query: (queryInfo: any, callback: (tabs: any[]) => void) => void;
    create: (createProperties: any, callback?: (tab?: any) => void) => void;
    update: (tabId: number | null, updateProperties: any, callback?: (tab?: any) => void) => void;
  };
};
