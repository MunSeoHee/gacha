import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { PrizeResult } from '../../domain/types';
import { useHistoryStore } from '../../store/historyStore';
import { GRADE_EFFECTS } from '../../effects/gradeEffects';
import styles from './ResultScreen.module.css';

/**
 * ResultScreen 컴포넌트 props
 */
export interface ResultScreenProps {
  /** 뽑기 결과 목록 (멀티 드로우 시 여러 개) */
  results: PrizeResult[];
  /** 30초 자동 전환 콜백 */
  onAutoClose?: () => void;
  /** 새로하기 버튼 콜백 */
  onRestart?: () => void;
}

/**
 * ResultScreen 컴포넌트
 *
 * 요구사항: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 5.6
 *
 * - 상품 이미지, 이름, 등급 표시
 * - Motion stagger로 순차 등장
 * - 이미지 로드 실패 시 색상 + 텍스트 폴백
 * - 당일 이력 목록 (시간 역순, 최대 50건)
 * - 30초 자동 전환 타이머
 * - 멀티 드로우: 여러 결과 목록 표시
 */
const ResultScreen: React.FC<ResultScreenProps> = ({ results, onAutoClose, onRestart }) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(30);
  const records = useHistoryStore(state => state.records);

  // 당일 기록 필터링 (00:00 이후, 시간 역순)
  const todayRecords = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = records.filter(r => r.issuedAt >= today);
    return [...filtered].sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  }, [records]);

  // 30초 타이머
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onAutoClose?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onAutoClose]);

  const handleImageError = (prizeId: string) => {
    setImageErrors(prev => ({ ...prev, [prizeId]: true }));
  };

  return (
    <div className={styles.resultScreen}>
      {/* 결과 영역 */}
      <div className={styles.resultArea}>
        <h2 className={styles.title}>축하합니다!</h2>

        {/* 결과 카드들 (Motion stagger) */}
        <motion.div
          className={styles.resultCards}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {results.map((result, index) => {
            const config = GRADE_EFFECTS[result.grade];
            const hasImageError = imageErrors[result.prizeId];

            return (
              <motion.div
                key={`${result.prizeId}-${index}`}
                className={styles.card}
                style={{
                  borderColor: config.orbGlowColor,
                  boxShadow: `0 0 24px ${config.orbGlowColor}66`,
                }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.4,
                  type: 'spring',
                  stiffness: 100,
                }}
              >
                <div
                  className={`${styles.cardImage} ${hasImageError ? styles.fallback : ''}`}
                  style={{
                    background: `linear-gradient(135deg, ${config.orbColor}, ${config.orbGlowColor})`,
                  }}
                >
                  {!hasImageError && (
                    <img
                      src={result.imageUrl}
                      alt={result.prizeName}
                      onError={() => handleImageError(result.prizeId)}
                    />
                  )}
                  {hasImageError && (
                    <div className={styles.fallbackText}>{result.prizeName}</div>
                  )}
                </div>

                <div className={styles.cardInfo}>
                  <p className={styles.prizeName}>{result.prizeName}</p>
                  <span
                    className={styles.grade}
                    style={{
                      backgroundColor: config.orbColor,
                      color: '#1a1a2e',
                      boxShadow: `0 0 10px ${config.orbGlowColor}`,
                    }}
                  >
                    {result.grade}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* 이력 목록 */}
      <div className={styles.historyArea}>
        <h3 className={styles.historyTitle}>오늘의 기록</h3>
        <div className={styles.historyList}>
          {todayRecords.length === 0 ? (
            <p className={styles.empty}>기록이 없습니다</p>
          ) : (
            todayRecords.map(record => {
              const config = GRADE_EFFECTS[record.prizeResult.grade];
              return (
                <motion.div
                  key={record.sequenceNumber}
                  className={styles.historyItem}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={styles.badge}
                    style={{
                      backgroundColor: config.orbColor,
                    }}
                  >
                    {record.prizeResult.grade[0]}
                  </div>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{record.prizeResult.prizeName}</p>
                    <p className={styles.itemTime}>
                      {record.issuedAt.toLocaleTimeString('ko-KR')}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* 타이머 */}
      <div className={styles.timer}>
        <p>자동 종료: {timeLeft}초</p>
        <div className={styles.timerBar}>
          <div
            className={styles.timerFill}
            style={{
              width: `${(timeLeft / 30) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* 새로하기 버튼 */}
      <button
        className={styles.restartButton}
        onClick={onRestart}
        aria-label="새로하기"
      >
        새로하기
      </button>
    </div>
  );
};

export default ResultScreen;
