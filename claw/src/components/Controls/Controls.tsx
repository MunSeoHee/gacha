import { useRef } from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '../../store/gameStore';
import { TOOL_BY_COUNT } from '../../domain/types';
import styles from './Controls.module.css';

const DRAW_OPTIONS = [1, 5, 10];
const TOOL_LABEL: Record<string, string> = {
  claw: '집게',
  magnet: '자석',
  scoop: '포크레인',
};

export function Controls() {
  const phase = useGameStore((s) => s.phase);
  const timer = useGameStore((s) => s.timer);
  const tool = useGameStore((s) => s.tool);
  const drawCount = useGameStore((s) => s.drawCount);
  const remainingStock = useGameStore((s) => s.remainingStock);
  const selectDraw = useGameStore((s) => s.selectDraw);
  const shufflePile = useGameStore((s) => s.shufflePile);
  const nudgeClaw = useGameStore((s) => s.nudgeClaw);
  const drop = useGameStore((s) => s.drop);

  const holdRef = useRef<number | null>(null);

  const startHold = (dir: number) => {
    nudgeClaw(dir * 2.5);
    stopHold();
    holdRef.current = window.setInterval(() => nudgeClaw(dir * 2), 40);
  };
  const stopHold = () => {
    if (holdRef.current !== null) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };

  // 조준 단계: 이동/내리기 컨트롤
  if (phase === 'aiming') {
    const danger = timer <= 3;
    return (
      <div className={styles.panel}>
        <div className={styles.timerRow}>
          <span className={`${styles.timer} ${danger ? styles.danger : ''}`}>
            ⏱ {timer}s
          </span>
          <span className={styles.hint}>
            {tool && TOOL_LABEL[tool]} · {drawCount}회 · 좌우로 조준 후 내리기
          </span>
        </div>
        <div className={styles.aimBar}>
          <button
            className={`${styles.round} ${styles.blue}`}
            onPointerDown={() => startHold(-1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            aria-label="왼쪽"
          >
            ◀
          </button>
          <button
            className={`${styles.round} ${styles.red}`}
            onClick={drop}
            aria-label="내리기"
          >
            ▼
          </button>
          <button
            className={`${styles.round} ${styles.blue}`}
            onPointerDown={() => startHold(1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            aria-label="오른쪽"
          >
            ▶
          </button>
        </div>
      </div>
    );
  }

  // idle: 뽑기 횟수 선택. 그 외(dropping/grabbing/revealing)엔 비활성 표시.
  const disabled = phase !== 'idle';
  return (
    <div className={styles.panel}>
      <div className={styles.stockRow}>
        <span>남은 경품 {remainingStock}개</span>
        <button
          className={styles.reset}
          disabled={disabled}
          onClick={shufflePile}
        >
          🔀 섞기
        </button>
      </div>
      <div className={styles.drawRow}>
        {DRAW_OPTIONS.map((n) => (
          <motion.button
            key={n}
            className={styles.drawBtn}
            disabled={disabled || remainingStock <= 0}
            onClick={() => selectDraw(n)}
            whileTap={{ scale: 0.94 }}
          >
            <span className={styles.drawCount}>{n}회</span>
            <span className={styles.drawTool}>{TOOL_LABEL[TOOL_BY_COUNT[n]]}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
