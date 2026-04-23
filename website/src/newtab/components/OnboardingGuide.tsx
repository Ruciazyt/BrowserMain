import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import styles from '../styles/components/OnboardingGuide.module.css';

const STORAGE_KEY = 'onboardingComplete';

interface OnboardingGuideProps {
  restartSignal?: number;
}

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  hint?: string;
}

const StepIcon = (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="2"/>
    <rect x="10" y="10" width="28" height="28" rx="4" fill="currentColor" opacity="0.15"/>
    <text x="24" y="30" textAnchor="middle" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill="currentColor">12:00</text>
    <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3"/>
  </svg>
);

const SearchIcon = (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="14" width="40" height="20" rx="6" stroke="currentColor" strokeWidth="2"/>
    <rect x="8" y="18" width="14" height="12" rx="3" fill="currentColor" opacity="0.2"/>
    <circle cx="14" cy="24" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="16" y1="26" x2="19" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="26" y="20" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="29" y1="24" x2="37" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ShortcutIcon = (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="12" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/>
    <rect x="8" y="16" width="10" height="10" rx="2" fill="currentColor" opacity="0.2"/>
    <circle cx="13" cy="21" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="26" y="12" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/>
    <rect x="30" y="16" width="10" height="10" rx="2" fill="currentColor" opacity="0.2"/>
    <circle cx="35" cy="21" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="38" cy="38" r="8" fill="currentColor"/>
    <line x1="38" y1="34" x2="38" y2="42" stroke="var(--bg-primary)" strokeWidth="2" strokeLinecap="round"/>
    <line x1="34" y1="38" x2="42" y2="38" stroke="var(--bg-primary)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const SettingsIcon = (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2"/>
    <path d="M24 4v5M24 39v5M44 24h-5M9 24H4M38.5 9.5l-3.5 3.5M13 35l-3.5 3.5M38.5 38.5l-3.5-3.5M13 13l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const stepsEn: Step[] = [
  {
    title: 'Welcome to BrowserMain',
    description: 'Your new tab, reimagined. A retro-futuristic LED clock, glowing amber accents, and your shortcuts — all in one place.',
    icon: StepIcon,
    hint: 'Amber glow. JetBrains Mono. Every second counts.',
  },
  {
    title: 'Quick Search',
    description: 'Press Ctrl+K to jump straight to the search bar. Pick your engine, type your query, hit Enter — search in a flash.',
    icon: SearchIcon,
    hint: 'Ctrl + K',
  },
  {
    title: 'Add Shortcuts',
    description: 'Hit the + button to add any website as a shortcut. Drag to reorder, hover to edit, click to launch.',
    icon: ShortcutIcon,
    hint: 'Click + to add your favorites',
  },
  {
    title: 'Customize',
    description: 'Click the ⚙️ gear icon to open settings. Change backgrounds, switch search engines, and tune the display to your taste.',
    icon: SettingsIcon,
    hint: 'Background • Engine • Display',
  },
];

const stepsZh: Step[] = [
  {
    title: '欢迎使用 BrowserMain',
    description: '您的新标签页，重塑想象。复古未来主义的 LED 时钟、琥珀色辉光，还有您的快捷方式 —— 全部汇聚于此。',
    icon: StepIcon,
    hint: '琥珀辉光 · JetBrains Mono · 每一秒都在计数',
  },
  {
    title: '快速搜索',
    description: '按 Ctrl+K 直接跳到搜索栏。选择搜索引擎，输入查询，回车搜索 —— 闪电般快速。',
    icon: SearchIcon,
    hint: 'Ctrl + K',
  },
  {
    title: '添加快捷方式',
    description: '点击 + 按钮添加任意网站为快捷方式。拖动排序，悬停编辑，点击启动。',
    icon: ShortcutIcon,
    hint: '点击 + 添加您的收藏',
  },
  {
    title: '自定义设置',
    description: '点击 ⚙️ 齿轮图标打开设置。更换背景、切换搜索引擎、调出显示效果，全部按您的喜好。',
    icon: SettingsIcon,
    hint: '背景 · 搜索引擎 · 显示',
  },
];

export default function OnboardingGuide({ restartSignal }: OnboardingGuideProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { isZh, t } = useI18n();

  const steps = isZh ? stepsZh : stepsEn;

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (result[STORAGE_KEY] !== true) {
        setVisible(true);
      }
    });
  }, []);

  // Restart signal: when it changes, force the onboarding to show again
  useEffect(() => {
    if (restartSignal && restartSignal > 0) {
      chrome.storage.local.set({ [STORAGE_KEY]: false }, () => {
        setVisible(true);
        setCurrentStep(0);
      });
    }
  }, [restartSignal]);

  const handleComplete = () => {
    chrome.storage.local.set({ [STORAGE_KEY]: true }, () => {
      setVisible(false);
    });
  };

  const handleSkip = () => {
    chrome.storage.local.set({ [STORAGE_KEY]: true }, () => {
      setVisible(false);
    });
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const stepLabel = t('stepCount', { current: currentStep + 1, total: steps.length });

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* LED Header */}
        <div className={styles.header}>
          <div className={styles.ledDots}>
            {steps.map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''} ${i < currentStep ? styles.dotDone : ''}`}
              />
            ))}
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.stepLabel}>{stepLabel}</span>
        </div>

        {/* Icon */}
        <div className={styles.iconWrapper}>
          <div className={styles.iconRing} />
          <div className={styles.icon}>{step.icon}</div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <h2 className={styles.title}>{step.title}</h2>
          <p className={styles.description}>{step.description}</p>
          {step.hint && (
            <div className={styles.hint}>{step.hint}</div>
          )}
        </div>

        {/* Navigation */}
        <div className={styles.actions}>
          <div className={styles.left}>
            {currentStep > 0 && (
              <button
                className={styles.prevBtn}
                onClick={() => setCurrentStep((s) => s - 1)}
              >
                {t('prev')}
              </button>
            )}
          </div>

          <button className={styles.skipBtn} onClick={handleSkip}>
            {t('skipTour')}
          </button>

          <div className={styles.right}>
            {isLastStep ? (
              <button className={styles.getStartedBtn} onClick={handleComplete}>
                {t('getStarted')}
              </button>
            ) : (
              <button
                className={styles.nextBtn}
                onClick={() => setCurrentStep((s) => s + 1)}
              >
                {t('next')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
