/**
 * MultiDrawManager 로직
 *
 * 요구사항: 5.2, 5.3, 5.8
 */

import {
  type Grade,
  type ProbabilityTable,
  type InventoryState,
  type PrizeConfig,
  GRADE_ORDER,
} from './types';
import { resolveDestinedGrade } from './probability';
import { getAvailableGrades, resolveFallbackGrade } from './inventory';

// ---------------------------------------------------------------------------
// resolveMaxGrade
// ---------------------------------------------------------------------------

/**
 * Grade 배열에서 GRADE_ORDER 기준 가장 높은 등급을 반환한다.
 *
 * 요구사항: 5.3 — MaxGrade는 destinedGrades 배열의 모든 등급 중
 * GRADE_ORDER 기준 가장 높은 등급과 동일해야 한다.
 *
 * @param grades - 1개 이상의 Grade 배열
 * @returns 가장 높은 등급
 * @throws grades가 비어 있으면 에러
 */
export function resolveMaxGrade(grades: Grade[]): Grade {
  if (grades.length === 0) {
    throw new Error('grades 배열은 비어 있을 수 없습니다');
  }

  return grades.reduce((max, grade) =>
    GRADE_ORDER.indexOf(grade) > GRADE_ORDER.indexOf(max) ? grade : max
  );
}

// ---------------------------------------------------------------------------
// resolveMultiDrawGrades
// ---------------------------------------------------------------------------

/**
 * DrawCount만큼 DestinedGrade 배열을 한 번에 확정한다.
 *
 * 각 등급 결정 흐름:
 * 1. 현재 시뮬레이션 재고 상태에서 가용 등급(availableGrades)을 조회한다.
 * 2. `resolveDestinedGrade`로 확률에 따라 등급을 뽑는다.
 * 3. 뽑힌 등급의 재고가 없으면 `resolveFallbackGrade`로 대체 등급을 결정한다.
 * 4. 확정된 등급을 시뮬레이션 재고에서 차감하고 결과 배열에 추가한다.
 *
 * 참고: 실제 재고 차감(deductStock)은 BurstEvent 시점에 store 레이어에서 수행한다.
 * 이 함수는 순수하게 등급 배열 결정만 담당한다.
 *
 * 요구사항: 5.2 — DrawCount 수만큼 DestinedGrade를 한 번에 모두 확정한다.
 * 요구사항: 5.8 — 각 등급의 재고 가용 여부를 확인하고, 재고가 없는 등급에 대해서는
 *                 요구사항 2.4의 자동 대체 규칙(상위 → 하위 폴백)을 적용한다.
 *
 * @param count - 뽑기 횟수 (DrawCount, 1 이상의 정수)
 * @param table - 등급별 확률표
 * @param state - 현재 재고 상태 스냅샷
 * @param prizes - 상품 설정 목록 (등급-prizeId 매핑에 사용)
 * @returns 확정된 Grade 배열 (길이 = count)
 * @throws 전체 재고가 소진되어 count개를 확정할 수 없으면 에러
 */
export function resolveMultiDrawGrades(
  count: number,
  table: ProbabilityTable,
  state: InventoryState,
  prizes: PrizeConfig[]
): Grade[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`count는 1 이상의 정수여야 합니다: ${count}`);
  }

  // 시뮬레이션용 재고 복사본을 만든다.
  // 각 draw마다 해당 등급에서 임의의 상품 1개를 차감하여 가용 여부를 재계산한다.
  let simulatedStocks: Record<string, number> = { ...state.stocks };

  const result: Grade[] = [];

  for (let i = 0; i < count; i++) {
    // 현재 시뮬레이션 재고 기준으로 InventoryState 재계산
    const simState = buildSimulatedInventoryState(simulatedStocks, prizes);
    const available = getAvailableGrades(simState);

    if (available.length === 0) {
      throw new Error(
        `전체 재고가 소진되어 ${count}개의 등급을 확정할 수 없습니다. ` +
          `(${i}개까지만 확정 가능)`
      );
    }

    // 확률표에 따라 등급을 결정한다 (가용 등급 내에서 재정규화됨).
    let resolvedGrade = resolveDestinedGrade(table, available);

    // 방어 코드: 결정된 등급이 가용 등급에 없으면 폴백을 적용한다.
    // (resolveDestinedGrade가 available 기반이므로 정상적으로는 발생하지 않는다.)
    if (!available.includes(resolvedGrade)) {
      const fallback = resolveFallbackGrade(simState, resolvedGrade);
      if (fallback === null) {
        throw new Error('폴백 등급을 결정할 수 없습니다: 전체 재고 소진 상태');
      }
      resolvedGrade = fallback;
    }

    // 시뮬레이션 재고에서 해당 등급의 상품 1개를 차감한다.
    simulatedStocks = deductOneFromGrade(simulatedStocks, resolvedGrade, prizes);

    result.push(resolvedGrade);
  }

  return result;
}

// ---------------------------------------------------------------------------
// 내부 헬퍼
// ---------------------------------------------------------------------------

/**
 * stocks 맵과 prizes 설정으로부터 InventoryState를 재계산한다.
 * exhaustedGrades는 등급 내 모든 상품의 재고 합이 0일 때 소진 상태로 판단한다.
 */
function buildSimulatedInventoryState(
  stocks: Record<string, number>,
  prizes: PrizeConfig[]
): InventoryState {
  const exhaustedGrades = new Set<Grade>();
  const gradeMap: Record<string, Grade> = {};

  // gradeMap 구성
  for (const prize of prizes) {
    gradeMap[prize.id] = prize.grade;
  }

  for (const grade of GRADE_ORDER) {
    const gradeIds = prizes
      .filter((p) => p.grade === grade)
      .map((p) => p.id);
    const totalStock = gradeIds.reduce((sum, id) => sum + (stocks[id] ?? 0), 0);
    if (gradeIds.length > 0 && totalStock === 0) {
      exhaustedGrades.add(grade);
    }
  }

  return { stocks: { ...stocks }, exhaustedGrades, gradeMap };
}

/**
 * 시뮬레이션 재고에서 특정 등급의 상품 1개를 차감한다.
 * 재고가 있는 첫 번째 상품에서 차감한다.
 */
function deductOneFromGrade(
  stocks: Record<string, number>,
  grade: Grade,
  prizes: PrizeConfig[]
): Record<string, number> {
  const gradeIds = prizes
    .filter((p) => p.grade === grade)
    .map((p) => p.id);

  for (const prizeId of gradeIds) {
    if ((stocks[prizeId] ?? 0) > 0) {
      return { ...stocks, [prizeId]: stocks[prizeId] - 1 };
    }
  }

  // 재고가 없는 등급에 차감을 시도하는 경우 (정상적으로 발생하면 안 됨)
  return stocks;
}
