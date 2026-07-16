import type { SessionConfig } from '../domain/types';

/**
 * 기본 세션 설정값.
 *
 * - clickThreshold : Orb 판정에 필요한 최소 클릭 수 (5~20 범위 정수).
 * - drawCountOptions: 멀티 드로우 횟수 선택지.
 * - autoCloseSeconds: ResultScreen 자동 전환 대기 시간(초).
 * - soundEnabled    : 사운드 기본 활성화 여부.
 *
 * Validates: Requirements 1.12, 5.1, 4.6
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  clickThreshold: 10,
  drawCountOptions: [1, 5, 10],
  autoCloseSeconds: 30,
  soundEnabled: true,
} as const;
