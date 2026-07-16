import { motion } from 'motion/react';
import type { Tool } from '../../domain/types';
import { useGameStore } from '../../store/gameStore';
import {
  ARM_DEPTH,
  DROP_MS,
  FLASH_MS,
  CLAW_RISE_DELAY,
  CLAW_RISE_DURATION,
} from '../../game/geometry';
import styles from './Claw.module.css';

function ToolHead({ tool, closed }: { tool: Tool; closed: boolean }) {
  const cls = `${styles.head} ${styles[tool]} ${closed ? styles.closed : ''}`;
  if (tool === 'magnet') {
    return (
      <div className={cls}>
        <span className={styles.magnetLeft} />
        <span className={styles.magnetRight} />
      </div>
    );
  }
  if (tool === 'scoop') {
    return (
      <div className={cls}>
        <span className={styles.scoopLeft} />
        <span className={styles.scoopRight} />
      </div>
    );
  }
  // claw (집게)
  return (
    <div className={cls}>
      <span className={styles.prong} />
      <span className={styles.prongMid} />
      <span className={styles.prong} />
    </div>
  );
}

export function Claw() {
  const phase = useGameStore((s) => s.phase);
  const tool = useGameStore((s) => s.tool);
  const clawX = useGameStore((s) => s.clawX);

  const activeTool: Tool = tool ?? 'claw';
  const closed = phase === 'grabbing' || phase === 'revealing';
  const isDown = phase === 'dropping' || phase === 'flashing';
  const armHeight = `${isDown ? ARM_DEPTH.down : ARM_DEPTH.up}%`;

  return (
    <div className={styles.carriage} style={{ left: `${clawX}%` }}>
      <span className={styles.mount} />
      <motion.div
        className={styles.arm}
        initial={false}
        animate={{ height: armHeight }}
        transition={
          phase === 'grabbing'
            ? {
                // 바닥에서 잠깐 멈춰 집은 뒤(=오브젝트가 그립으로 모이는 시간) 상승
                duration: CLAW_RISE_DURATION,
                ease: 'easeInOut',
                delay: CLAW_RISE_DELAY,
              }
            : { duration: DROP_MS / 1000, ease: 'easeInOut' }
        }
      >
        <span className={styles.cable} />
        <div className={styles.headWrap}>
          <ToolHead tool={activeTool} closed={closed} />
          {phase === 'flashing' && (
            <motion.span
              className={styles.flash}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 1.9] }}
              transition={{ duration: FLASH_MS / 1000, times: [0, 0.3, 1], ease: 'easeOut' }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
