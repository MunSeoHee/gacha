import React from 'react';
import { motion } from 'motion/react';
import styles from './SessionEnd.module.css';

/**
 * SessionEnd 컴포넌트 props
 */
export interface SessionEndProps {
  /** 다시 시작 콜백 */
  onRestart: () => void;
}

/**
 * SessionEnd 컴포넌트
 *
 * 요구사항: 3.6
 *
 * - 전체 재고가 소진되었을 때 표시
 * - 게임 종료 안내 및 재시작 옵션 제공
 */
const SessionEnd: React.FC<SessionEndProps> = ({ onRestart }) => {
  return (
    <div className={styles.sessionEnd}>
      <motion.div
        className={styles.content}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
      >
        <div className={styles.icon}>🎊</div>

        <h1 className={styles.title}>게임 종료</h1>

        <p className={styles.message}>
          모든 상품이 소진되었습니다.
          <br />
          게임을 종료합니다.
        </p>

        <div className={styles.stats}>
          <p className={styles.stat}>
            <span className={styles.label}>상품 소진</span>
            <span className={styles.value}>100%</span>
          </p>
          <p className={styles.stat}>
            <span className={styles.label}>게임 상태</span>
            <span className={styles.value}>종료</span>
          </p>
        </div>

        <button
          className={styles.restartButton}
          onClick={onRestart}
          aria-label="게임 재시작"
        >
          처음부터 시작
        </button>
      </motion.div>
    </div>
  );
};

export default SessionEnd;
