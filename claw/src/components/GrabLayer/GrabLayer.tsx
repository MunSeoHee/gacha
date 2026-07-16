import { motion } from 'motion/react';
import { useGameStore } from '../../store/gameStore';
import { GRIP_BOTTOM, GRAB_MS, GRAB_TIMES } from '../../game/geometry';
import { ObjectShape } from '../ObjectShape/ObjectShape';
import styles from './GrabLayer.module.css';

/**
 * 잡기 단계에서 뽑힌 오브젝트를 더미 위치 → 집게 그립 → 위로 이동시킨다.
 * (제자리에서 사라지는 대신 집게에 딸려 올라오는 "집어오는" 연출)
 */
export function GrabLayer() {
  const phase = useGameStore((s) => s.phase);
  const clawX = useGameStore((s) => s.clawX);
  const scooped = useGameStore((s) => s.scooped);

  if (phase !== 'grabbing' || scooped.length === 0) return null;

  const n = scooped.length;

  return (
    <div className={styles.layer}>
      {scooped.map((it, i) => {
        const obj = it.object;
        // 집게 아래에서 좌우로 살짝 부챗살처럼 퍼지게
        const offX = (i - (n - 1) / 2) * 3.4;
        const gripX = clawX + offX;
        const size = obj.size * 0.72;
        return (
          <motion.div
            key={it.id}
            className={styles.item}
            style={{ width: size, height: size }}
            initial={{ left: `${obj.x}%`, bottom: `${obj.y}%`, rotate: obj.rotation }}
            animate={{
              left: [`${obj.x}%`, `${gripX}%`, `${gripX}%`],
              bottom: [`${obj.y}%`, `${GRIP_BOTTOM.down}%`, `${GRIP_BOTTOM.up}%`],
              rotate: [obj.rotation, 0, 0],
            }}
            transition={{
              duration: GRAB_MS / 1000,
              times: GRAB_TIMES,
              ease: 'easeInOut',
            }}
          >
            <ObjectShape
              kind={obj.kind}
              color={obj.color}
              size={size}
              imageUrl={obj.imageUrl}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
