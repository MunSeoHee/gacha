import { useGameStore } from '../../store/gameStore';
import { TicketSelect } from '../TicketSelect/TicketSelect';
import { GameBoard } from '../GameBoard/GameBoard';
import { RewardTable } from '../RewardTable/RewardTable';
import styles from './App.module.css';

export function App() {
  const phase = useGameStore((s) => s.phase);
  const error = useGameStore((s) => s.error);
  const restart = useGameStore((s) => s.restart);
  const resetStock = useGameStore((s) => s.resetStock);

  const inGame = phase !== 'select';

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        {inGame ? (
          <button className={styles.back} onClick={restart}>
            ← 복권 목록
          </button>
        ) : (
          <span />
        )}
        <span className={styles.brand}>🎰 일일 복권</span>
        <button
          className={styles.reset}
          onClick={() => {
            if (confirm('모든 복권의 재고를 초기값으로 되돌릴까요?')) resetStock();
          }}
          title="재고 초기화 (운영용)"
        >
          재고 초기화
        </button>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <main className={styles.main}>
        {phase === 'select' ? (
          <TicketSelect />
        ) : (
          <div className={styles.gameLayout}>
            <GameBoard />
            <RewardTable />
          </div>
        )}
      </main>
    </div>
  );
}
