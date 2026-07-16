import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PRIZES } from '../../config/prizes';
import { Machine } from '../Machine/Machine';
import { Controls } from '../Controls/Controls';
import { ResultTray } from '../ResultTray/ResultTray';
import styles from './App.module.css';

export function App() {
  const init = useGameStore((s) => s.init);
  const phase = useGameStore((s) => s.phase);
  const tick = useGameStore((s) => s.tick);
  const nudgeClaw = useGameStore((s) => s.nudgeClaw);
  const drop = useGameStore((s) => s.drop);

  // 초기화 (1회)
  useEffect(() => {
    init(PRIZES);
  }, [init]);

  // 조준 단계 10초 카운트다운
  useEffect(() => {
    if (phase !== 'aiming') return;
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, tick]);

  // 키보드 조작
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') nudgeClaw(-4);
      else if (e.key === 'ArrowRight') nudgeClaw(4);
      else if (e.key === 'ArrowDown' || e.key === ' ') drop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudgeClaw, drop]);

  return (
    <div className={styles.app}>
      <Machine />
      <Controls />
      <ResultTray />
    </div>
  );
}
