import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import Glass from './ui/Glass/Glass';
import styles from './widgets/WeatherWidget/WeatherWidget.module.css';

interface WeatherData {
  temperature: number;
  location: string;
  description: string;
  aqi: number;
  aqiLevel: string;
  weatherCode: number;
}

const AQI_LEVELS = [
  { max: 50, label: '优' },
  { max: 100, label: '良' },
  { max: 150, label: '轻度' },
  { max: 200, label: '中度' },
  { max: 300, label: '重度' },
  { max: 500, label: '严重' },
];

function getAqiLevel(aqi: number): string {
  for (const level of AQI_LEVELS) {
    if (aqi <= level.max) return level.label;
  }
  return '严重';
}

const WEATHER_EMOJI: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️',
};

const CACHE_KEY = 'browsermain_weather_cache';
const CACHE_DURATION = 30 * 60 * 1000;

const WEATHER_DESCRIPTIONS_ZH: Record<number, string> = {
  0: '晴', 1: '晴', 2: '多云', 3: '阴',
  45: '雾', 48: '雾', 51: '小雨', 53: '小雨', 55: '中雨',
  61: '小雨', 63: '中雨', 65: '大雨', 71: '小雪', 73: '中雪',
  75: '大雪', 80: '阵雨', 81: '阵雨', 82: '暴雨', 95: '雷阵雨',
};

const WEATHER_DESCRIPTIONS_EN: Record<number, string> = {
  0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow',
  75: 'Heavy snow', 80: 'Rain showers', 81: 'Heavy showers', 82: 'Violent showers', 95: 'Thunderstorm',
};

async function fetchWeather(isZh: boolean): Promise<WeatherData> {
  const fallback: WeatherData = {
    temperature: 22,
    location: '--',
    description: '--',
    aqi: 0,
    aqiLevel: '--',
    weatherCode: 2,
  };
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        maximumAge: CACHE_DURATION,
      });
    });

    const { latitude, longitude } = position.coords;
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: 'temperature_2m,weather_code',
      timezone: 'auto',
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) return fallback;

    const data = await res.json();
    const current = data.current;
    if (!current) return fallback;

    const code = current.weather_code ?? 2;
    const descriptions = isZh ? WEATHER_DESCRIPTIONS_ZH : WEATHER_DESCRIPTIONS_EN;

    return {
      temperature: Math.round(current.temperature_2m),
      location: '--',
      description: descriptions[code] || (isZh ? '未知' : 'Unknown'),
      aqi: 0,
      aqiLevel: '--',
      weatherCode: code,
    };
  } catch {
    return fallback;
  }
}

interface CachedWeather {
  data: WeatherData;
  timestamp: number;
}

async function getCachedWeather(): Promise<WeatherData | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(CACHE_KEY, (result: Record<string, CachedWeather | undefined>) => {
      const cached = result[CACHE_KEY];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        resolve(cached.data);
      } else {
        resolve(null);
      }
    });
  });
}

function setCachedWeather(data: WeatherData): void {
  const payload: CachedWeather = { data, timestamp: Date.now() };
  chrome.storage.local.set({ [CACHE_KEY]: payload });
}

export default function WeatherWidget() {
  const { isZh } = useI18n();
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedWeather();
      if (cancelled) return;
      if (cached) {
        setWeather(cached);
        return;
      }
      const data = await fetchWeather(isZh);
      if (cancelled) return;
      setWeather(data);
      setCachedWeather(data);
    })();
    return () => { cancelled = true; };
  }, [isZh]);

  const data = weather || {
    temperature: 0,
    location: '--',
    description: '--',
    aqi: 0,
    aqiLevel: '--',
    weatherCode: 2,
  };
  const emoji = WEATHER_EMOJI[data.weatherCode] || '🌤️';

  return (
    <Glass direction="row" className={styles.container}>
      <div className={styles.inner}>
        <span className={styles.emoji}>{emoji}</span>
        <span className={styles.temperature}>{data.temperature}°C</span>
        <span className={styles.description}>{data.description}</span>
        <span className={styles.divider}>·</span>
        <span className={styles.location}>{data.location}</span>
        {data.aqi > 0 && (
          <>
            <span className={styles.divider}>·</span>
            <span className={styles.aqi}>
              {isZh ? '空气质量' : 'AQI'} <span className={styles.aqiValue}>{data.aqi} {data.aqiLevel}</span>
              <span className={styles.aqiArrow}>▾</span>
            </span>
          </>
        )}
      </div>
    </Glass>
  );
}
