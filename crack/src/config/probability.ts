import type { ProbabilityTable } from '../domain/types';

/**
 * 기본 등급별 확률표.
 * 모든 등급 확률의 합은 정확히 1.0 이어야 한다 (validateConfig 검증 대상).
 *
 * Normal:   60%
 * Rare:     30%
 * Epic:      8%
 * Primeval:  2%
 *
 * Validates: Requirements 1.13, 2.3, 2.6
 */
export const DEFAULT_PROBABILITY_TABLE: ProbabilityTable = {
  Normal: 0.60,
  Rare: 0.30,
  Epic: 0.08,
  Primeval: 0.02,
} as const;
