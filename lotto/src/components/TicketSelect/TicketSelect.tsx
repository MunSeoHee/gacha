import { useState } from 'react';
import { motion } from 'motion/react';
import { CARD_COUNT, TICKET } from '../../config/tickets';
import { canPlay } from '../../domain/board';
import { useGameStore } from '../../store/gameStore';
import styles from './TicketSelect.module.css';

const STEP = 360 / CARD_COUNT; // 카드 간 각도
const RADIUS = 480; // 원통 반지름(px) — 키울수록 카드 사이 간격이 벌어짐

export function TicketSelect() {
  const stock = useGameStore((s) => s.stock);
  const selectTicket = useGameStore((s) => s.selectTicket);
  // active 는 누적 회전량(정수). 실제 앞면 카드는 active mod CARD_COUNT.
  const [active, setActive] = useState(0);

  const scoped = Object.fromEntries(
    Object.entries(stock)
      .filter(([k]) => k.startsWith(`${TICKET.id}:`))
      .map(([k, v]) => [k.slice(TICKET.id.length + 1), v])
  );
  const playable = canPlay(TICKET, scoped);

  // i번 카드를 앞으로 가져오는 최단 회전
  const bringToFront = (i: number) => {
    const cur = ((active % CARD_COUNT) + CARD_COUNT) % CARD_COUNT;
    let delta = i - cur;
    if (delta > CARD_COUNT / 2) delta -= CARD_COUNT;
    if (delta < -CARD_COUNT / 2) delta += CARD_COUNT;
    setActive(active + delta);
  };

  const rotate = (dir: 1 | -1) => setActive((a) => a + dir);

  return (
    <div className={styles.wrap}>
      <div className={styles.headings}>
        <h1 className={styles.title}>복권 뽑기</h1>
        <p className={styles.subtitle}>마음에 드는 한 장을 고르세요</p>
      </div>

      <div className={styles.stage}>
        <button
          className={`${styles.nav} ${styles.navLeft}`}
          onClick={() => rotate(-1)}
          aria-label="왼쪽으로 돌리기"
        >
          ‹
        </button>

        <div className={styles.viewport}>
          <motion.div
            className={styles.cylinder}
            animate={{ rotateY: -active * STEP }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          >
            {Array.from({ length: CARD_COUNT }).map((_, i) => {
              // 앞면(0도)에서 이 카드가 떨어진 각도
              let a = ((i - active) * STEP) % 360;
              if (a > 180) a -= 360;
              if (a < -180) a += 360;
              const absA = Math.abs(a);
              const isFront = absA < STEP / 2;
              const hidden = absA > 95; // 뒤쪽 반원은 숨김
              return (
                <button
                  key={i}
                  className={`${styles.card} ${isFront ? styles.cardFront : ''}`}
                  style={{
                    transform: `rotateY(${i * STEP}deg) translateZ(${RADIUS}px)`,
                    opacity: hidden ? 0 : 1 - (absA / 95) * 0.65,
                    pointerEvents: hidden ? 'none' : 'auto',
                  }}
                  onClick={() => (isFront ? selectTicket(TICKET.id) : bringToFront(i))}
                  aria-label={isFront ? '이 복권 뽑기' : '이 카드로 돌리기'}
                >
                  <span className={styles.foil} />
                  <span className={styles.shine} />
                  <span className={styles.emblem}>🎟️</span>
                  <span className={styles.pattern}>✦</span>
                </button>
              );
            })}
          </motion.div>
        </div>

        <button
          className={`${styles.nav} ${styles.navRight}`}
          onClick={() => rotate(1)}
          aria-label="오른쪽으로 돌리기"
        >
          ›
        </button>
      </div>

      <button
        className={styles.start}
        disabled={!playable}
        onClick={() => selectTicket(TICKET.id)}
      >
        {playable ? '이 복권 뽑기' : '복권이 모두 소진됐어요'}
      </button>
    </div>
  );
}
