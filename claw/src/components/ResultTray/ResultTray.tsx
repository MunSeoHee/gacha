import { AnimatePresence, motion } from 'motion/react';
import { useState, type CSSProperties } from 'react';
import { useGameStore, type ScoopedItem } from '../../store/gameStore';
import { GRADE_THEME } from '../../config/grades';
import { ObjectShape } from '../ObjectShape/ObjectShape';
import styles from './ResultTray.module.css';

/**
 * 상품 이미지. imageUrl 이 있고 로드에 성공하면 이미지를, 실패(파일 없음 등)하면
 * 플레이스홀더(선물 아이콘)를 표시한다 → 에셋 파일만 넣으면 자동 반영.
 */
function PrizeImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        className={styles.prizeImage}
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className={styles.prizePlaceholder}>🎁</span>;
}

function ScoopCard({ item }: { item: ScoopedItem }) {
  const revealItem = useGameStore((s) => s.revealItem);
  const theme = GRADE_THEME[item.result.grade];

  return (
    <button
      className={styles.card}
      onClick={() => !item.revealed && revealItem(item.id)}
      disabled={item.revealed}
    >
      <AnimatePresence initial={false}>
        {!item.revealed ? (
          <motion.div
            key="closed"
            className={styles.closed}
            initial={{ rotateY: 0 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <ObjectShape
              kind={item.object.kind}
              color={item.object.color}
              size={52}
              imageUrl={item.object.imageUrl}
            />
            <span className={styles.q}>?</span>
          </motion.div>
        ) : (
          <motion.div
            key="open"
            className={styles.open}
            style={
              {
                '--from': theme.from,
                '--to': theme.to,
                '--accent': theme.accent,
              } as CSSProperties
            }
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <span className={styles.grade}>{theme.label}</span>
            {theme.sparkle >= 0.5 && (
              <motion.span
                className={styles.shine}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.6, opacity: [0, 0.9, 0] }}
                transition={{ duration: 0.9 }}
              />
            )}
            <div className={styles.prizeImageWrap}>
              <PrizeImage src={item.result.imageUrl} alt={item.result.prizeName} />
            </div>
            <span className={styles.prizeName}>{item.result.prizeName}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

export function ResultTray() {
  const phase = useGameStore((s) => s.phase);
  const scooped = useGameStore((s) => s.scooped);
  const revealAll = useGameStore((s) => s.revealAll);
  const nextRound = useGameStore((s) => s.nextRound);

  const allRevealed = scooped.length > 0 && scooped.every((s) => s.revealed);

  return (
    <AnimatePresence>
      {phase === 'revealing' && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={styles.sheet}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
          >
            <h2 className={styles.title}>
              {allRevealed ? '획득 완료!' : '카드를 눌러 확인하세요'}
            </h2>
            <div className={styles.grid}>
              {scooped.map((item) => (
                <ScoopCard key={item.id} item={item} />
              ))}
            </div>
            <div className={styles.actions}>
              {!allRevealed && (
                <button className={styles.secondary} onClick={revealAll}>
                  모두 열기
                </button>
              )}
              <button
                className={styles.primary}
                onClick={nextRound}
                disabled={!allRevealed}
              >
                다시 뽑기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
