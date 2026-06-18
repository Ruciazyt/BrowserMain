import { type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import styles from './Glass.module.css';

interface GlassProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  className?: string;
  direction?: 'row' | 'column';
  children: ReactNode;
  style?: CSSProperties;
}

export default function Glass({
  as: Tag = 'div',
  className,
  direction = 'column',
  children,
  style,
  ...rest
}: GlassProps) {
  const contentClass =
    direction === 'row' ? styles.contentRow : styles.contentColumn;

  return (
    <Tag
      className={[styles.wrapper, className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      <div className={styles.effect} aria-hidden="true" />
      <div className={styles.tint} aria-hidden="true" />
      <div className={styles.shine} aria-hidden="true" />
      <div className={`${styles.content} ${contentClass}`}>{children}</div>
    </Tag>
  );
}
