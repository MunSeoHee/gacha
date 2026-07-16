import { AnimatePresence, motion } from 'motion/react';
import { useState, type CSSProperties } from 'react';
import { useGameStore, type ScoopedItem } from '../../store/gameStore';
import { gradeAtLeast } from '../../domain/types';
import { FLASH_MS } from '../../game/geometry';
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
  const [flashing, setFlashing] = useState(false);

  // A·B·C 등급은 바로 열지 않고 등급 색으로 한 번 빛난 뒤 오픈한다.
  const handleClick = () => {
    if (item.revealed || flashing) return;
    if (gradeAtLeast(item.result.grade, 'C')) {
      setFlashing(true);
      window.setTimeout(() => {
        revealItem(item.id);
        setFlashing(false);
      }, FLASH_MS);
    } else {
      revealItem(item.id);
    }
  };

  return (
    <button
      className={styles.card}
      onClick={handleClick}
      disabled={item.revealed}
      style={
        {
          '--from': theme.from,
          '--to': theme.to,
          '--accent': theme.accent,
        } as CSSProperties
      }
    >
      {flashing && (
        <motion.span
          className={styles.flash}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: FLASH_MS / 1000, times: [0, 0.35, 1] }}
        />
      )}
      <motion.div
        className={styles.flipper}
        initial={false}
        animate={{ rotateY: item.revealed ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
      >
        {/* 앞면 (미개봉) */}
        <div className={styles.faceFront}>
          <ObjectShape
            kind={item.object.kind}
            color={item.object.color}
            size={52}
            imageUrl={item.object.imageUrl}
          />
          <span className={styles.q}>?</span>
        </div>
        {/* 뒷면 (상품) */}
        <div className={styles.faceBack}>
          <span className={styles.grade}>{theme.label}</span>
          <div className={styles.prizeImageWrap}>
            <PrizeImage src={item.result.imageUrl} alt={item.result.prizeName} />
          </div>
          <span className={styles.prizeName}>{item.result.prizeName}</span>
        </div>
      </motion.div>
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
            transition={{ type: 'spring', stiffness: 170, damping: 24 }}
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
