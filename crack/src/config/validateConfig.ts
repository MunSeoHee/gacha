import { GRADE_ORDER, type Grade, type PrizeConfig, type ProbabilityTable, type SessionConfig } from '../domain/types';

/**
 * 애플리케이션 부트스트랩 시 호출되는 설정 검증 함수
 *
 * Validates:
 * - 확률 합계가 1.0 ± 0.001 범위인지 확인 (Requirements 1.13, 2.6)
 * - clickThreshold가 5 이상 20 이하 정수인지 확인 (Requirements 1.12)
 * - 모든 등급에 최소 1개 이상의 상품이 정의되어 있는지 확인 (Requirements 1.12)
 */
export function validateConfig(
  config: SessionConfig,
  probTable: ProbabilityTable,
  prizes: PrizeConfig[]
): void {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. 확률표 검증
  // ──────────────────────────────────────────────────────────────────────────
  const probSum = Object.values(probTable).reduce((sum, prob) => sum + prob, 0);
  const probTolerance = 0.001;
  if (Math.abs(probSum - 1.0) > probTolerance) {
    throw new Error(
      `확률표의 합이 1.0이 아닙니다. (현재: ${probSum.toFixed(4)}, 범위: 0.999 ~ 1.001)`
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. clickThreshold 범위 검증
  // ──────────────────────────────────────────────────────────────────────────
  if (!Number.isInteger(config.clickThreshold) || config.clickThreshold < 5 || config.clickThreshold > 20) {
    throw new Error(
      `clickThreshold는 5 이상 20 이하 정수여야 합니다. (현재: ${config.clickThreshold})`
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. 등급별 상품 최소 1개 검증
  // ──────────────────────────────────────────────────────────────────────────
  const gradeToCount: Record<Grade, number> = {
    Normal: 0,
    Rare: 0,
    Epic: 0,
    Primeval: 0,
  };

  for (const prize of prizes) {
    gradeToCount[prize.grade]++;
  }

  for (const grade of GRADE_ORDER) {
    if (gradeToCount[grade] === 0) {
      throw new Error(`${grade} 등급에 정의된 상품이 없습니다.`);
    }
  }
}
