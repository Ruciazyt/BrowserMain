import { useState, useEffect } from 'react';
import styles from '../styles/components/OnboardingGuide.module.css';

const STORAGE_KEY = 'onboardingComplete';

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  hint?: string;
}

const steps: Step[] = [
  {
    title: 'Welcome to BrowserMain',
    description: 'Your new tab, reimagined. A retro-futuristic LED clock, glowing amber accents, and your shortcuts — all in one place.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="2"/>
        <rect x="10" y="10" width="28" height="28" rx="4" fill="currentColor" opacity="0.15"/>
        <text x="24" y="30" textAnchor="middle" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill="currentColor">12:00</text>
        <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3"/>
      </svg>
    ),
    hint: 'Amber glow. JetBrains Mono. Every second counts.',
  },
  {
    title: '🔍 Quick Search',
    description: 'Press Ctrl+K to jump straight to the search bar. Pick your engine, type your query, hit Enter — search in a flash.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="14" width="40" height="20" rx="6" stroke="currentColor" strokeWidth="2"/>
        <rect x="8" y="18" width="14" height="12" rx="3" fill="currentColor" opacity="0.2"/>
        <circle cx="14" cy="24" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="16" y1="26" x2="19" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="26" y="20" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="29" y1="24" x2="37" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    hint: 'Ctrl + K',
  },
  {
    title: '⚡ Add Shortcuts',
    description: 'Hit the + button to add any website as a shortcut. Drag to reorder, hover to edit, click to launch.',
    icon: (
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
    ),
    hint: 'Click + to add your favorites',
  },
  {
    title: '⚙️ Customize',
    description: 'Click the ⚙️ gear icon to open settings. Change backgrounds, switch search engines, and tune the display to your taste.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2"/>
        <path d="M24 4v5M24 39v5M44 24h-5M9 24H4M38.5 9.5l-3.5 3.5M13 35l-3.5 3.5M38.5 38.5l-3.5-3.5M13 13l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    hint: 'Background • Engine • Display',
  },
];

export default function OnboardingGuide() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (result[STORAGE_KEY] !== true) {
        setVisible(true);
      }
    });
  }, []);

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
          <span className={styles.stepLabel}>
            {currentStep + 1} / {steps.length}
          </span>
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
                ← Back
              </button>
            )}
          </div>

          <button className={styles.skipBtn} onClick={handleSkip}>
            Skip tour
          </button>

          <div className={styles.right}>
            {isLastStep ? (
              <button className={styles.getStartedBtn} onClick={handleComplete}>
                Get Started →
              </button>
            ) : (
              <button
                className={styles.nextBtn}
                onClick={() => setCurrentStep((s) => s + 1)}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
