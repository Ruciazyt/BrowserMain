import type { MessageKey } from '../i18n';
import type { BackgroundConfig } from './storage';

export interface BuiltinBackground {
  id: string;
  labelKey: MessageKey;
  path: string;
}

const forestMistSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#dce8dc"/><stop offset="50%" stop-color="#b8d4b8"/><stop offset="100%" stop-color="#8fb08f"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;

export const BUILTIN_BACKGROUNDS: BuiltinBackground[] = [
  {
    id: 'forest-mist',
    labelKey: 'backgroundForestMist',
    path: `data:image/svg+xml,${encodeURIComponent(forestMistSvg)}`,
  },
];

export function resolveBackgroundImageUrl(bg: BackgroundConfig): string | undefined {
  if (bg.type !== 'image') return undefined;
  if (bg.imageUrl) return bg.imageUrl;
  if (bg.imagePreset) {
    return BUILTIN_BACKGROUNDS.find((item) => item.id === bg.imagePreset)?.path;
  }
  return undefined;
}
