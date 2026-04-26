import { useMemo } from 'react';
import { useI18n } from '../i18n';
import styles from '../styles/components/DailyQuote.module.css';

const QUOTES_ZH = [
  { text: '生活不是等待暴风雨过去，而是学会在风雨中跳舞。', author: '未知' },
  { text: '成功不是终点，失败也不是终结，唯有继续前行的勇气才是关键。', author: '丘吉尔' },
  { text: '千里之行，始于足下。', author: '老子' },
  { text: '学而不思则罔，思而不学则殆。', author: '孔子' },
  { text: '世上无难事，只怕有心人。', author: '谚语' },
  { text: '天行健，君子以自强不息。', author: '《周易》' },
  { text: '路漫漫其修远兮，吾将上下而求索。', author: '屈原' },
  { text: '不积跬步，无以至千里；不积小流，无以成江海。', author: '荀子' },
  { text: '知之者不如好之者，好之者不如乐之者。', author: '孔子' },
  { text: '三人行，必有我师焉。', author: '孔子' },
  { text: '己所不欲，勿施于人。', author: '孔子' },
  { text: '温故而知新，可以为师矣。', author: '孔子' },
];

const QUOTES_EN = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Be yourself; everyone else is already taken.', author: 'Oscar Wilde' },
  { text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
  { text: 'What we think, we become.', author: 'Buddha' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'Everything you\'ve ever wanted is on the other side of fear.', author: 'George Addair' },
  { text: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt' },
];

export default function DailyQuote() {
  const { isZh, t } = useI18n();

  const quote = useMemo(() => {
    const quotes = isZh ? QUOTES_ZH : QUOTES_EN;
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    return quotes[dayOfYear % quotes.length];
  }, [isZh]);

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>{t('dailyQuoteTitle')}</h3>
      <blockquote className={styles.quote}>
        <p className={styles.text}>"{quote.text}"</p>
        <footer className={styles.author}>— {quote.author}</footer>
      </blockquote>
    </section>
  );
}
