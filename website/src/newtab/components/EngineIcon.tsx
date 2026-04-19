import type { CSSProperties, FC } from 'react';
import { FaMicrosoft } from 'react-icons/fa6';
import type { IconBaseProps } from 'react-icons';
import { SiBaidu, SiDuckduckgo, SiGoogle } from 'react-icons/si';

const ICON_MAP = {
  google: SiGoogle,
  // Simple Icons 已无 Bing 矢量，用 Microsoft 表示必应
  bing: FaMicrosoft,
  baidu: SiBaidu,
  duckduckgo: SiDuckduckgo,
} as const;

export type EngineIconId = keyof typeof ICON_MAP;

interface EngineIconProps {
  engineId: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** 在深色菜单里用浅色描边，略提亮 */
  variant?: 'default' | 'onDark';
}

export default function EngineIcon({ engineId, size = 18, className, style, variant = 'default' }: EngineIconProps) {
  const Icon = ICON_MAP[engineId as EngineIconId];
  if (!Icon) return null;
  const IconEl = Icon as FC<IconBaseProps>;
  const darkStyle: CSSProperties =
    variant === 'onDark'
      ? {
          filter: 'saturate(1.15) brightness(1.08)',
          flexShrink: 0,
        }
      : { flexShrink: 0 };
  return <IconEl size={size} className={className} style={{ ...darkStyle, ...style }} aria-hidden />;
}
