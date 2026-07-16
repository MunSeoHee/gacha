import { useState } from 'react';
import { motion } from 'motion/react';
import { LINES, type LineKey } from '../../domain/types';
import { MAX_EXTRA_REVEALS, useGameStore } from '../../store/gameStore';
import { ResultBanner } from '../ResultBanner/ResultBanner';
import styles from './GameBoard.module.css';

/** 라인 선택 화살표 정의 (그리드 위 배치 좌표 + 방향 문자) */
const ARROWS: { line: LineKey; glyph: string; className: string }[] = [
  { line: 'C0', glyph: '↓', className: 'colA' },
  { line: 'C1', glyph: '↓', className: 'colB' },
  { line: 'C2', glyph: '↓', className: 'colC' },
  { line: 'R0', glyph: '→', className: 'rowA' },
  { line: 'R1', glyph: '→', className: 'rowB' },
  { line: 'R2', glyph: '→', className: 'rowC' },
  { line: 'D0', glyph: '↘', className: 'diagTL' },
  { line: 'D1', glyph: '↙', className: 'diagTR' },
];

export function GameBoard() {
  const phase = useGameStore((s) => s.phase);
  const board = useGameStore((s) => s.board);
  const extraReveals = useGameStore((s) => s.extraReveals);
  const selectedLine = useGameStore((s) => s.selectedLine);
  const revealCell = useGameStore((s) => s.revealCell);
  const proceedToPickLine = useGameStore((s) => s.proceedToPickLine);
  const selectLine = useGameStore((s) => s.selectLine);
  const confirmLine = useGameStore((s) => s.confirmLine);

  const [hovered, setHovered] = useState<LineKey | null>(null);

  if (!board) return null;

  const picking = phase === 'pickLine';
  const revealing = phase === 'reveal';
  const activeLine = selectedLine ?? hovered;
  const litCells: readonly number[] = activeLine ? LINES[activeLine] : [];
  const remaining = MAX_EXTRA_REVEALS - extraReveals;

  return (
    <div className={styles.panel}>
      <div className={styles.hint}>
        {revealing && (
          <>
            <strong>{remaining}칸</strong> 더 열어볼 수 있어요
          </>
        )}
        {picking && <>당첨될 <strong>한 줄</strong>을 고르세요</>}
        {phase === 'result' && <>결과가 확정되었어요</>}
      </div>

      <div className={styles.grid}>
        {ARROWS.map(({ line, glyph, className }) => {
          const isSel = selectedLine === line;
          return (
            <button
              key={line}
              className={`${styles.arrow} ${styles[className]} ${isSel ? styles.arrowSel : ''}`}
              disabled={!picking}
              onClick={() => selectLine(line)}
              onMouseEnter={() => setHovered(line)}
              onMouseLeave={() => setHovered(null)}
              aria-label={`${line} 라인 선택`}
            >
              {glyph}
            </button>
          );
        })}

        {board.map((cell, i) => {
          const lit = litCells.includes(i);
          const canReveal = revealing && !cell.revealed && remaining > 0;
          return (
            <button
              key={i}
              className={`${styles.cell} ${styles[`cell${i}`]} ${lit ? styles.cellLit : ''} ${
                canReveal ? styles.cellReveal : ''
              }`}
              disabled={!canReveal}
              onClick={() => canReveal && revealCell(i)}
              aria-label={cell.revealed ? `숫자 ${cell.value}` : '가려진 칸'}
            >
              {cell.revealed ? (
                <motion.span
                  className={styles.num}
                  initial={{ scale: 0, rotateY: 90 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                >
                  {cell.value}
                </motion.span>
              ) : (
                <span className={styles.cover}>?</span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.actions}>
        {revealing && (
          <button className={styles.primary} onClick={proceedToPickLine}>
            줄 고르러 가기 →
          </button>
        )}
        {picking && (
          <button
            className={styles.primary}
            disabled={!selectedLine}
            onClick={confirmLine}
          >
            {selectedLine ? '이 줄로 결정!' : '줄을 선택하세요'}
          </button>
        )}
        {phase === 'result' && <ResultBanner />}
      </div>
    </div>
  );
}
