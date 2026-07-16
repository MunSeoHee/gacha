/**
 * 확률 기반 DestinedGrade 결정 로직
 *
 * 요구사항: 2.1, 2.4
 */

import { type Grade, type ProbabilityTable, GRADE_ORDER } from './types';

/**
 * 확률표와 사용 가능한 등급 목록을 기반으로 DestinedGrade를 결정한다.
 *
 * 1. 확률표에 따라 랜덤 등급을 뽑는다.
 * 2. 뽑힌 등급이 availableGrades 안에 없으면 폴백이 필요하므로
 *    호출자(multiDraw 등)에서 resolveFallbackGrade를 적용한다.
 *
 * @param table - 등급별 확률표 (합계 = 1.0)
 * @param availableGrades - 재고가 있는 등급 목록
 * @returns 확정된 Grade
 */
export function resolveDestinedGrade(
  table: ProbabilityTable,
  availableGrades: Grade[]
): Grade {
  if (availableGrades.length === 0) {
    throw new Error('No available grades to resolve from');
  }

  // availableGrades에 포함된 등급만 고려하여 확률을 재정규화한다.
  const filtered = GRADE_ORDER.filter((g) => availableGrades.includes(g));
  const weights = filtered.map((g) => table[g]);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const rand = Math.random() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < filtered.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      return filtered[i];
    }
  }

  // 부동소수점 오차 방어: 마지막 항목 반환
  return filtered[filtered.length - 1];
}
