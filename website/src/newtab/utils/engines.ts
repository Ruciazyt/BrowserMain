// Search engine configuration
export interface SearchEngine {
  id: string;
  name: string;
  searchUrl: string;
  suggestUrl?: string;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'google',
    name: 'Google',
    searchUrl: 'https://www.google.com/search?q=',
  },
  {
    id: 'bing',
    name: 'Bing',
    searchUrl: 'https://cn.bing.com/search?q=',
  },
  {
    id: 'baidu',
    name: 'Baidu',
    searchUrl: 'https://www.baidu.com/s?wd=',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    searchUrl: 'https://duckduckgo.com/?q=',
  },
];

export function buildSearchUrl(engine: SearchEngine, query: string): string {
  return `${engine.searchUrl}${encodeURIComponent(query)}`;
}

export function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
