import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../i18n';
import styles from '../styles/components/PixelPet.module.css';

type PetState = 'idle' | 'blink' | 'happy' | 'sleep' | 'eating';
type Species = 'brown' | 'orange' | 'white' | 'gray';

interface PixelPetProps {
  species?: Species;
}

const SLEEP_TIMEOUT = 20000;
const BLINK_MIN = 3000;
const BLINK_MAX = 6000;
const BLINK_DUR = 200;
const HUNGER_DECAY = 2;
const HAPPY_DECAY = 1;
const FEED_AMOUNT = 25;
const PET_AMOUNT = 15;

const foodBySpecies: Record<Species, string> = {
  brown:  '🦴',
  orange: '🐟',
  white:  '🥛',
  gray:   '🐟',
};

export default function PixelPet({ species = 'brown' }: PixelPetProps) {
  const { t } = useI18n();
  const [happiness, setHappiness] = useState(80);
  const [hunger, setHunger] = useState(80);
  const [state, setState] = useState<PetState>('idle');
  const [showFood, setShowFood] = useState(false);

  const sleepRef = useRef<ReturnType<typeof setTimeout>>();
  const blinkRef = useRef<ReturnType<typeof setTimeout>>();
  const blinkOffRef = useRef<ReturnType<typeof setTimeout>>();

  // Decay stats
  useEffect(() => {
    const iv = setInterval(() => {
      setHunger((h) => Math.max(0, h - HUNGER_DECAY));
      setHappiness((h) => Math.max(0, h - HAPPY_DECAY));
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  const resetSleep = useCallback(() => {
    if (sleepRef.current) clearTimeout(sleepRef.current);
    sleepRef.current = setTimeout(() => setState('sleep'), SLEEP_TIMEOUT);
  }, []);

  const scheduleBlink = useCallback(() => {
    if (blinkRef.current) clearTimeout(blinkRef.current);
    const delay = BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN);
    blinkRef.current = setTimeout(() => {
      setState('blink');
      blinkOffRef.current = setTimeout(() => {
        setState((prev) => (prev === 'blink' ? 'idle' : prev));
      }, BLINK_DUR);
    }, delay);
  }, []);

  useEffect(() => {
    if (state === 'idle') scheduleBlink();
    return () => {
      if (blinkRef.current) clearTimeout(blinkRef.current);
      if (blinkOffRef.current) clearTimeout(blinkOffRef.current);
    };
  }, [state, scheduleBlink]);

  useEffect(() => {
    resetSleep();
    return () => { if (sleepRef.current) clearTimeout(sleepRef.current); };
  }, [resetSleep]);

  const wake = useCallback(() => {
    if (state === 'sleep') setState('idle');
    resetSleep();
  }, [state, resetSleep]);

  const handlePet = useCallback(() => {
    wake();
    setState('happy');
    setHappiness((h) => Math.min(100, h + PET_AMOUNT));
    setTimeout(() => setState((prev) => (prev === 'happy' ? 'idle' : prev)), 800);
  }, [wake]);

  const handleFeed = useCallback(() => {
    wake();
    setState('eating');
    setShowFood(true);
    setHunger((h) => Math.min(100, h + FEED_AMOUNT));
    setTimeout(() => {
      setShowFood(false);
      setState((prev) => (prev === 'eating' ? 'idle' : prev));
    }, 700);
  }, [wake]);

  const mood = Math.round((happiness + hunger) / 2);

  const stateClass =
    state === 'sleep'   ? styles.sleep :
    state === 'happy'   ? styles.happy :
    state === 'eating'  ? styles.eating :
    state === 'blink'   ? styles.blink : '';

  const moodClass = mood >= 60 ? styles.moodHigh : mood >= 30 ? styles.moodMedium : styles.moodLow;

  const statusText =
    state === 'sleep'  ? t('petSleeping') :
    state === 'happy'  ? t('petHappy') :
    state === 'eating' ? t('petEating') :
    hunger < 20        ? t('petHungry') :
    happiness < 20     ? t('petLonely') :
    mood >= 80         ? t('petGreat') :
    '';

  const pixelClass =
    species === 'brown'  ? styles.pixelBrown :
    species === 'orange' ? styles.pixelOrange :
    species === 'white'  ? styles.pixelWhite :
    styles.pixelGray;

  const blinkClass =
    species === 'brown'  ? styles.blinkBrown :
    species === 'orange' ? styles.blinkOrange :
    species === 'white'  ? styles.blinkWhite :
    styles.blinkGray;

  const tailClass =
    species === 'brown'  ? styles.tailBrown :
    species === 'orange' ? styles.tailOrange :
    species === 'white'  ? styles.tailWhite :
    styles.tailGray;

  return (
    <div className={`${styles.container} ${stateClass}`}>
      {/* Pet canvas */}
      <div className={styles.canvasWrap} onClick={handlePet} title={t('pixelPetTooltip')}>
        <div className={styles.canvas}>
          <div className={pixelClass} />
          <div className={blinkClass} />
          <div className={`${styles.tail} ${tailClass}`} />
          {state === 'happy' && (
            <div className={styles.particles}>
              {['💙', '✨', '💫', '⭐'].map((h, i) => (
                <span key={i} className={styles.particle}>{h}</span>
              ))}
            </div>
          )}
          {showFood && <span className={styles.foodEmoji}>{foodBySpecies[species]}</span>}
          {state === 'sleep' && <span className={styles.zzz}>Zzz</span>}
        </div>
      </div>

      {/* Mood bar */}
      <div className={styles.moodBar}>
        <div className={`${styles.moodFill} ${moodClass}`} style={{ width: `${mood}%` }} />
      </div>

      {/* Status */}
      <div className={styles.status}>{statusText}</div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={handlePet} title={t('petPet')}>🤚</button>
        <button className={styles.actionBtn} onClick={handleFeed} title={t('petFeed')}>🍖</button>
      </div>
    </div>
  );
}
