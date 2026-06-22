import type { MessageKey } from '../i18n';
import type { BackgroundConfig } from './storage';
import forestMistImg from '../assets/backgrounds/forest-mist.webp';
import sunsetGlowImg from '../assets/backgrounds/sunset-glow.webp';
import oceanCalmImg from '../assets/backgrounds/ocean-calm.webp';
import mountainCloudsImg from '../assets/backgrounds/mountain-clouds.webp';
import lakeMistImg from '../assets/backgrounds/lake-mist.webp';
import softBokehImg from '../assets/backgrounds/soft-bokeh.webp';

export interface BuiltinBackground {
  id: string;
  labelKey: MessageKey;
  path: string;
}

/** Unsplash photos — free to use under the Unsplash License. */
export const BUILTIN_BACKGROUNDS: BuiltinBackground[] = [
  { id: 'forest-mist', labelKey: 'backgroundForestMist', path: forestMistImg },
  { id: 'sunset-glow', labelKey: 'backgroundSunsetGlow', path: sunsetGlowImg },
  { id: 'ocean-calm', labelKey: 'backgroundOceanCalm', path: oceanCalmImg },
  { id: 'mountain-clouds', labelKey: 'backgroundMountainClouds', path: mountainCloudsImg },
  { id: 'lake-mist', labelKey: 'backgroundLakeMist', path: lakeMistImg },
  { id: 'soft-bokeh', labelKey: 'backgroundSoftBokeh', path: softBokehImg },
];

export function resolveBackgroundImageUrl(bg: BackgroundConfig): string | undefined {
  if (bg.type !== 'image') return undefined;
  if (bg.imageUrl) return bg.imageUrl;
  if (bg.imagePreset) {
    return BUILTIN_BACKGROUNDS.find((item) => item.id === bg.imagePreset)?.path;
  }
  return undefined;
}
