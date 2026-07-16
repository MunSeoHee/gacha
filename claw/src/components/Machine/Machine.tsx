import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '../../store/gameStore';
import { ObjectShape } from '../ObjectShape/ObjectShape';
import { Claw } from '../Claw/Claw';
import { GrabLayer } from '../GrabLayer/GrabLayer';
import styles from './Machine.module.css';

export function Machine() {
  const objects = useGameStore((s) => s.objects);

  return (
    <div className={styles.machine}>
      <div className={styles.rail} />
      <div className={styles.tank}>
        <div className={styles.glass} />
        <div className={styles.pile}>
          <AnimatePresence>
            {objects.map((o) => (
              <motion.div
                key={o.id}
                className={styles.obj}
                style={{ left: `${o.x}%`, bottom: `${o.y}%` }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  rotate: o.rotation,
                }}
                exit={{ opacity: 0, transition: { duration: 0 } }}
                transition={{ type: 'spring', stiffness: 170, damping: 22 }}
              >
                <ObjectShape
                  kind={o.kind}
                  color={o.color}
                  size={o.size}
                  imageUrl={o.imageUrl}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <GrabLayer />
        <Claw />
      </div>
      <div className={styles.tray} />
    </div>
  );
}
