import { useState, useEffect } from 'react';
import styles from '../styles/components/WeatherWidget.module.css';

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

const FALLBACK: WeatherData = {
  temperature: 22,
  location: '--',
  description: '--',
  aqi: 0,
  aqiLevel: '--',
  weatherCode: 2,
};

const CACHE_KEY = 'browsermain_weather_cache';
const CACHE_DURATION = 30 * 60 * 1000;

async function fetchWeather(): Promise<WeatherData> {
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        maximumAge: CACHE_DURATION,
      });
    });

    const { latitude, longitude } = position.coords;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) return FALLBACK;

    const data = await res.json();
    const current = data.current;
    if (!current) return FALLBACK;

    const weatherDescriptions: Record<number, string> = {
      0: '晴', 1: '晴', 2: '多云', 3: '阴',
      45: '雾', 48: '雾', 51: '小雨', 53: '小雨', 55: '中雨',
      61: '小雨', 63: '中雨', 65: '大雨', 71: '小雪', 73: '中雪',
      75: '大雪', 80: '阵雨', 81: '阵雨', 82: '暴雨', 95: '雷阵雨',
    };

    const code = current.weather_code ?? 2;

    return {
      temperature: Math.round(current.temperature_2m),
      location: '当前位置',
      description: weatherDescriptions[code] || '未知',
      aqi: 0,
      aqiLevel: '--',
      weatherCode: code,
    };
  } catch {
    return FALLBACK;
  }
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const loadWeather = async () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_DURATION) {
            setWeather(parsed.data);
            return;
          }
        } catch { /* ignore */ }
      }

      const data = await fetchWeather();
      setWeather(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    };

    loadWeather();
  }, []);

  const data = weather || FALLBACK;
  const emoji = WEATHER_EMOJI[data.weatherCode] || '🌤️';

  return (
    <div className={styles.container}>
      <span className={styles.emoji}>{emoji}</span>
      <span className={styles.temperature}>{data.temperature}°C</span>
      <span className={styles.description}>{data.description}</span>
      <span className={styles.divider}>·</span>
      <span className={styles.location}>{data.location}</span>
      {data.aqi > 0 && (
        <>
          <span className={styles.divider}>·</span>
          <span className={styles.aqi}>
            空气质量 <span className={styles.aqiValue}>{data.aqi} {data.aqiLevel}</span>
            <span className={styles.aqiArrow}>▾</span>
          </span>
        </>
      )}
    </div>
  );
}
