import React from 'react';
import styles from './DrawSelector.module.css';

/**
 * DrawSelector 컴포넌트 props
 */
export interface DrawSelectorProps {
  /** 드로우 횟수 선택 옵션 */
  options: number[];
  /** 현재 선택된 횟수 */
  selectedCount: number;
  /** 잔여 재고 */
  totalStock: number;
  /** 연출 중 여부 (true면 모든 버튼 비활성화) */
  isAnimating: boolean;
  /** 선택 핸들러 */
  onSelectCount: (count: number) => void;
  /** 시작 핸들러 */
  onStart: () => void;
}

/**
 * DrawSelector 컴포넌트
 *
 * 요구사항: 5.1, 5.7, 5.9, 6.2
 *
 * - DrawCountOption 목록을 버튼으로 표시
 * - 잔여 재고 < 선택 옵션은 비활성화
 * - 연출 중(isAnimating=true) 모든 UI 조작 비활성화
 * - 최소 터치 대상 48px × 48px 보장 (1dp=1px 기준)
 */
const DrawSelector: React.FC<DrawSelectorProps> = ({
  options,
  selectedCount,
  totalStock,
  isAnimating,
  onSelectCount,
  onStart,
}) => {
  const isStartDisabled = isAnimating;

  return (
    <div className={`${styles.drawSelector} ${isAnimating ? styles.animating : ''}`}>
      <h2 className={styles.title}>드로우 횟수 선택</h2>
      <p className={styles.stock}>남은 재고: {totalStock}</p>

      <div className={styles.buttonGroup}>
        {options.map(count => {
          const isDisabled = totalStock < count || isAnimating;
          return (
            <button
              key={count}
              className={`${styles.countButton} ${selectedCount === count ? styles.selected : ''}`}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelectCount(count)}
              aria-label={`${count}회 드로우 선택`}
            >
              {count}회
            </button>
          );
        })}
      </div>

      <button
        className={styles.startButton}
        disabled={isStartDisabled}
        onClick={onStart}
        aria-label="드로우 시작"
      >
        시작
      </button>
    </div>
  );
};

export default DrawSelector;
