import { motion } from 'motion/react';
import { GRADE_THEME } from '../../config/grades';
import { canPlay } from '../../domain/board';
import { TICKET_BY_ID } from '../../config/tickets';
import { useGameStore } from '../../store/gameStore';
import styles from './ResultBanner.module.css';

/** 결과를 현재 화면(보드 아래)에 인라인으로 표시하는 배너. */
export function ResultBanner() {
  const result = useGameStore((s) => s.result);
  const stock = useGameStore((s) => s.stock);
  const restart = useGameStore((s) => s.restart);
  const selectTicket = useGameStore((s) => s.selectTicket);
  if (!result) return null;

  const theme = GRADE_THEME[result.grade];
  const ticket = TICKET_BY_ID[result.ticketId];
  const scoped = Object.fromEntries(
    Object.entries(stock)
      .filter(([k]) => k.startsWith(`${result.ticketId}:`))
      .map(([k, v]) => [k.slice(result.ticketId.length + 1), v])
  );
  const canReplay = canPlay(ticket, scoped);

  return (
    <motion.div
      className={styles.banner}
      style={{ borderColor: theme.accent }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.35 }}
    >
      <div className={styles.top}>
        <span
          className={styles.badge}
          style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
        >
          {theme.label}
        </span>
        <div className={styles.info}>
          <span className={styles.congrats}>축하합니다!</span>
          <span className={styles.prizeName}>{result.prizeName}</span>
        </div>
        <span className={styles.formula}>
          {result.numbers.join(' + ')} = <strong>{result.sum}</strong>
        </span>
      </div>

      <div className={styles.buttons}>
        <button
          className={styles.replay}
          disabled={!canReplay}
          onClick={() => selectTicket(result.ticketId)}
        >
          {canReplay ? '한 번 더' : '이 복권 매진'}
        </button>
        <button className={styles.again} onClick={restart}>
          복권 다시 고르기
        </button>
      </div>
    </motion.div>
  );
}
