import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../i18n';
import styles from '../styles/components/MarketIndices.module.css';

const SECIDS = '100.NDX,100.DJIA,100.SPX,1.000001,100.HSI,100.N225,100.FTSE,100.GDAXI';
const API_URL = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f4,f12,f14&secids=${SECIDS}`;
const CACHE_TTL = 5 * 60 * 1000;

interface IndexData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  change: number;
}

interface CachedIndices {
  data: IndexData[];
  updatedAt: number;
}

let memoryCache: CachedIndices | null = null;

async function fetchIndices(): Promise<IndexData[]> {
  if (memoryCache && Date.now() - memoryCache.updatedAt < CACHE_TTL) {
    return memoryCache.data;
  }

  const response: { success: boolean; text?: string; error?: string } = await chrome.runtime.sendMessage({
    type: 'FETCH_URL',
    url: API_URL,
  });

  if (!response.success || !response.text) {
    throw new Error(response.error || 'Failed to fetch market data');
  }

  const json = JSON.parse(response.text);
  const diff = json?.data?.diff;
  if (!Array.isArray(diff)) throw new Error('Invalid response');

  const data: IndexData[] = diff
    .filter((item: Record<string, unknown>) => typeof item.f2 === 'number' && (item.f2 as number) > 0)
    .map((item: Record<string, unknown>) => ({
      symbol: String(item.f12 ?? ''),
      name: String(item.f14 ?? ''),
      price: item.f2 as number,
      changePercent: item.f3 as number,
      change: item.f4 as number,
    }));

  memoryCache = { data, updatedAt: Date.now() };
  return data;
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(val: number): string {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}`;
}

function formatPercent(val: number): string {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

export default function MarketIndices() {
  const { t } = useI18n();
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const timerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchIndices();
      setIndices(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = window.setInterval(load, CACHE_TTL);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [load]);

  if ((error && indices.length === 0) || (!loading && indices.length === 0)) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.strip}>
        {loading && indices.length === 0
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.card}>
                <div className={styles.skeletonName} />
                <div className={styles.skeletonPrice} />
                <div className={styles.skeletonChange} />
              </div>
            ))
          : indices.map((idx) => (
              <div key={idx.symbol} className={styles.card}>
                <div className={styles.name}>{idx.name}</div>
                <div className={styles.price}>{formatPrice(idx.price)}</div>
                <div className={`${styles.change} ${idx.changePercent >= 0 ? styles.up : styles.down}`}>
                  {formatChange(idx.change)} ({formatPercent(idx.changePercent)})
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
