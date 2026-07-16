/**
 * InventoryTracker 순수 함수 구현
 *
 * 요구사항: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import {
  type Grade,
  type InventoryState,
  type InventoryError,
  type Result,
  type PrizeConfig,
  GRADE_ORDER,
} from './types';

// ---------------------------------------------------------------------------
// 초기화 헬퍼
// ---------------------------------------------------------------------------

/**
 * PrizeConfig 목록으로부터 초기 InventoryState를 생성한다.
 *
 * - stocks: 각 prizeId의 initialStock으로 초기화
 * - gradeMap: 각 prizeId → 등급 매핑 저장
 * - exhaustedGrades: 초기 재고가 0인 등급을 소진 상태로 표시
 */
export function initInventoryState(prizes: PrizeConfig[]): InventoryState {
  const stocks: Record<string, number> = {};
  const gradeMap: Record<string, Grade> = {};

  for (const prize of prizes) {
    stocks[prize.id] = prize.initialStock;
    gradeMap[prize.id] = prize.grade;
  }

  return buildInventoryState(stocks, gradeMap);
}

/**
 * stocks와 gradeMap을 기반으로 exhaustedGrades를 계산하여 InventoryState를 반환한다.
 * 불변 상태 생성 헬퍼.
 */
function buildInventoryState(
  stocks: Record<string, number>,
  gradeMap: Record<string, Grade>
): InventoryState {
  const exhaustedGrades = new Set<Grade>();

  for (const grade of GRADE_ORDER) {
    const gradeIds = Object.entries(gradeMap)
      .filter(([, g]) => g === grade)
      .map(([id]) => id);

    // 해당 등급에 속하는 상품이 하나라도 있고 모두 재고가 0인 경우 소진 처리
    if (gradeIds.length > 0) {
      const totalStock = gradeIds.reduce((sum, id) => sum + (stocks[id] ?? 0), 0);
      if (totalStock === 0) {
        exhaustedGrades.add(grade);
      }
    }
  }

  return { stocks: { ...stocks }, gradeMap: { ...gradeMap }, exhaustedGrades };
}

// ---------------------------------------------------------------------------
// InventoryOperations 구현
// ---------------------------------------------------------------------------

/**
 * 특정 상품의 재고를 1 차감한다.
 *
 * - 상품이 stocks에 없으면 PRIZE_NOT_FOUND 에러 반환
 * - 재고가 0 이하면 STOCK_ALREADY_ZERO 에러 반환
 * - 성공 시 차감된 새 상태를 반환 (원본 불변)
 * - 차감 후 해당 등급 총 재고가 0이 되면 exhaustedGrades에 추가
 *
 * 요구사항: 3.1, 3.2, 3.3
 */
export function deductStock(
  state: InventoryState,
  prizeId: string
): Result<InventoryState, InventoryError> {
  if (!(prizeId in state.stocks)) {
    return { ok: false, error: { type: 'PRIZE_NOT_FOUND', prizeId } };
  }
  if (state.stocks[prizeId] <= 0) {
    return { ok: false, error: { type: 'STOCK_ALREADY_ZERO', prizeId } };
  }

  const newStocks = { ...state.stocks, [prizeId]: state.stocks[prizeId] - 1 };
  return { ok: true, value: buildInventoryState(newStocks, state.gradeMap) };
}

/**
 * 특정 등급의 재고가 모두 소진되었는지 확인한다.
 *
 * 요구사항: 3.1, 3.4
 */
export function isGradeExhausted(state: InventoryState, grade: Grade): boolean {
  return state.exhaustedGrades.has(grade);
}

/**
 * 재고가 1 이상 남아 있는 등급 목록을 GRADE_ORDER 순서로 반환한다.
 *
 * 요구사항: 3.4
 */
export function getAvailableGrades(state: InventoryState): Grade[] {
  return GRADE_ORDER.filter((g) => !state.exhaustedGrades.has(g));
}

/**
 * 전체 잔여 재고 수량 합계를 반환한다.
 *
 * 요구사항: 3.1
 */
export function getTotalStock(state: InventoryState): number {
  return Object.values(state.stocks).reduce((sum, v) => sum + v, 0);
}

/**
 * 목표 등급의 폴백 등급을 결정한다.
 *
 * 탐색 순서:
 * 1. 목표 등급보다 높은 등급 중 가장 가까운 것(상위 우선)
 * 2. 목표 등급보다 낮은 등급 중 가장 가까운 것(하위 차선)
 * 3. 전체 소진 시 null 반환
 *
 * 참고: targetGrade 자체는 반환하지 않고 항상 다른 등급을 탐색한다.
 *
 * 요구사항: 2.4, 3.5
 */
export function resolveFallbackGrade(
  state: InventoryState,
  targetGrade: Grade
): Grade | null {
  const available = getAvailableGrades(state);
  if (available.length === 0) return null;

  const targetIdx = GRADE_ORDER.indexOf(targetGrade);

  // 1단계: 상위 등급 중 가장 가까운 것 탐색 (targetIdx+1 ~ 끝)
  for (let i = targetIdx + 1; i < GRADE_ORDER.length; i++) {
    if (available.includes(GRADE_ORDER[i])) {
      return GRADE_ORDER[i];
    }
  }

  // 2단계: 하위 등급 중 가장 가까운 것 탐색 (targetIdx-1 ~ 0)
  for (let i = targetIdx - 1; i >= 0; i--) {
    if (available.includes(GRADE_ORDER[i])) {
      return GRADE_ORDER[i];
    }
  }

  return null;
}
