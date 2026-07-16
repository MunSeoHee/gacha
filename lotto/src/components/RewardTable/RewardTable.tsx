import { GRADE_THEME } from '../../config/grades';
import { TICKET_BY_ID } from '../../config/tickets';
import { GRADE_ORDER, MAX_SUM, MIN_SUM } from '../../domain/types';
import { useGameStore } from '../../store/gameStore';
import styles from './RewardTable.module.css';

export function RewardTable() {
  const ticketId = useGameStore((s) => s.ticketId);
  const stock = useGameStore((s) => s.stock);
  const result = useGameStore((s) => s.result);
  if (!ticketId) return null;
  const ticket = TICKET_BY_ID[ticketId];

  // 가능한 모든 합계(6~24)를 두 칸으로 나눠 표시
  const mid = Math.ceil((MIN_SUM + MAX_SUM) / 2); // 15
  const leftSums: number[] = [];
  const rightSums: number[] = [];
  for (let s = MIN_SUM; s <= MAX_SUM; s++) (s <= mid ? leftSums : rightSums).push(s);

  const rowFor = (sum: number) => {
    const prizeId = ticket.rewardTable[sum];
    const prize = ticket.prizes.find((p) => p.id === prizeId)!;
    const theme = GRADE_THEME[prize.grade];
    const soldOut = (stock[`${ticketId}:${prize.id}`] ?? 0) <= 0;
    const isWin = result?.sum === sum;
    return (
      <tr
        key={sum}
        className={`${styles.sumRow} ${isWin ? styles.win : ''} ${soldOut ? styles.sold : ''}`}
      >
        <td className={styles.sum}>{sum}</td>
        <td className={styles.grade} style={{ color: theme.accent }}>
          {theme.label}
        </td>
      </tr>
    );
  };

  const columnTable = (colSums: number[]) => (
    <table className={styles.sumTable}>
      <thead>
        <tr className={styles.sumHead}>
          <th className={styles.sum}>합계</th>
          <th className={styles.grade}>보상</th>
        </tr>
      </thead>
      <tbody>{colSums.map(rowFor)}</tbody>
    </table>
  );

  // 등급별 상품명 + 남은 재고 범례
  const legend = [...ticket.prizes]
    .sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade))
    .map((prize) => ({
      prize,
      theme: GRADE_THEME[prize.grade],
      left: stock[`${ticketId}:${prize.id}`] ?? 0,
    }));

  return (
    <aside className={styles.panel}>
      <h2 className={styles.title}>보상 목록</h2>
      <p className={styles.caption}>고른 줄 세 숫자의 합계로 상품이 정해져요</p>

      <div className={styles.sumGrid}>
        {columnTable(leftSums)}
        {columnTable(rightSums)}
      </div>

      <ul className={styles.legend}>
        {legend.map(({ prize, theme, left }) => (
          <li key={prize.id} className={`${styles.legendRow} ${left <= 0 ? styles.sold : ''}`}>
            <span
              className={styles.badge}
              style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
            >
              {theme.label}
            </span>
            <span className={styles.legendName}>{prize.name}</span>
            <span className={styles.stock}>{left <= 0 ? '품절' : `${left}개`}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
