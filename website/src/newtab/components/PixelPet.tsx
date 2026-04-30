import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../i18n';
import styles from '../styles/components/PixelPet.module.css';

type PetState = 'idle' | 'blink' | 'happy' | 'sleep' | 'eating';
type Species = 'british' | 'golden' | 'husky' | 'blue';

interface PetData {
  species: Species;
  happiness: number;   // 0-100
  hunger: number;      // 0-100 (100 = full)
}

const STORAGE_KEY = 'pixelPet';

const SLEEP_TIMEOUT = 20000;
const BLINK_MIN = 3000;
const BLINK_MAX = 6000;
const BLINK_DUR = 200;

const HUNGER_DECAY = 2;    // per 10s
const HAPPY_DECAY = 1;     // per 10s
const FEED_AMOUNT = 25;
const PET_AMOUNT = 15;

const speciesList: { id: Species; emoji: string }[] = [
  { id: 'blue',    emoji: '🐱' },
  { id: 'british', emoji: '😺' },
  { id: 'golden',  emoji: '🐕' },
  { id: 'husky',   emoji: '🐺' },
];

const foodBySpecies: Record<Species, string> = {
  british: '🐟',
  golden:  '🦴',
  husky:   '🥩',
  blue:    '🥛',
};

function loadPet(): PetData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...{ species: 'blue' as Species, happiness: 80, hunger: 80 }, ...JSON.parse(raw) };
  } catch {}
  return { species: 'blue', happiness: 80, hunger: 80 };
}

function savePet(data: PetData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export default function PixelPet() {
  const { t } = useI18n();
  const [pet, setPet] = useState<PetData>(loadPet);
  const [state, setState] = useState<PetState>('idle');
  const [showFood, setShowFood] = useState(false);

  const sleepRef = useRef<ReturnType<typeof setTimeout>>();
  const blinkRef = useRef<ReturnType<typeof setTimeout>>();
  const blinkOffRef = useRef<ReturnType<typeof setTimeout>>();

  // Persist
  useEffect(() => { savePet(pet); }, [pet]);

  // Decay hunger & happiness over time
  useEffect(() => {
    const iv = setInterval(() => {
      setPet((p) => ({
        ...p,
        hunger: Math.max(0, p.hunger - HUNGER_DECAY),
        happiness: Math.max(0, p.happiness - HAPPY_DECAY),
      }));
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  // Sleep timer
  const resetSleep = useCallback(() => {
    if (sleepRef.current) clearTimeout(sleepRef.current);
    sleepRef.current = setTimeout(() => setState('sleep'), SLEEP_TIMEOUT);
  }, []);

  // Blink loop
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

  // Interactions
  const wake = useCallback(() => {
    if (state === 'sleep') setState('idle');
    resetSleep();
  }, [state, resetSleep]);

  const handlePet = useCallback(() => {
    wake();
    setState('happy');
    setPet((p) => ({ ...p, happiness: Math.min(100, p.happiness + PET_AMOUNT) }));
    setTimeout(() => setState((prev) => (prev === 'happy' ? 'idle' : prev)), 800);
  }, [wake]);

  const handleFeed = useCallback(() => {
    wake();
    setState('eating');
    setShowFood(true);
    setPet((p) => ({ ...p, hunger: Math.min(100, p.hunger + FEED_AMOUNT) }));
    setTimeout(() => {
      setShowFood(false);
      setState((prev) => (prev === 'eating' ? 'idle' : prev));
    }, 700);
  }, [wake]);

  const handleSpecies = useCallback((s: Species) => {
    setPet((p) => ({ ...p, species: s }));
    setState('happy');
    resetSleep();
    setTimeout(() => setState((prev) => (prev === 'happy' ? 'idle' : prev)), 600);
  }, [resetSleep]);

  const { species, happiness, hunger } = pet;
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
    species === 'british' ? styles.pixelBritish :
    species === 'golden'  ? styles.pixelGolden :
    species === 'husky'   ? styles.pixelHusky :
    styles.pixelBlue;

  const blinkClass =
    species === 'british' ? styles.blinkBritish :
    species === 'golden'  ? styles.blinkGolden :
    species === 'husky'   ? styles.blinkHusky :
    styles.blinkBlue;

  const tailClass =
    species === 'british' ? styles.tailBritish :
    species === 'golden'  ? styles.tailGolden :
    species === 'husky'   ? styles.tailHusky :
    styles.tailBlue;

  return (
    <div className={`${styles.container} ${stateClass}`}>
      {/* Species selector */}
      <div className={styles.selector}>
        {speciesList.map((s) => (
          <button
            key={s.id}
            className={`${styles.speciesBtn} ${species === s.id ? styles.active : ''}`}
            onClick={() => handleSpecies(s.id)}
            title={t(`petSpecies_${s.id}`)}
          >
            {s.emoji}
          </button>
        ))}
      </div>

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
