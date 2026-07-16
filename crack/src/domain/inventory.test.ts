/**
 * 재고 관리 로직 단위 테스트
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect } from 'vitest';
import type { Grade, InventoryState, PrizeConfig } from './types';
import {
  initInventoryState,
  deductStock,
  isGradeExhausted,
  getAvailableGrades,
  getTotalStock,
  resolveFallbackGrade,
} from './inventory';

// ---------------------------------------------------------------------------
// 테스트 픽스처
// ---------------------------------------------------------------------------

const SAMPLE_PRIZES: PrizeConfig[] = [
  { id: 'normal-001', name: '스티커', grade: 'Normal', imageUrl: '', initialStock: 5 },
  { id: 'normal-002', name: '포토카드', grade: 'Normal', imageUrl: '', initialStock: 3 },
  { id: 'rare-001', name: '아크릴', grade: 'Rare', imageUrl: '', initialStock: 2 },
  { id: 'epic-001', name: '굿즈박스', grade: 'Epic', imageUrl: '', initialStock: 1 },
  { id: 'primeval-001', name: '태초 아이템', grade: 'Primeval', imageUrl: '', initialStock: 1 },
];

/** 특정 등급만 소진된 상태를 만드는 헬퍼 */
function makeStateWithExhausted(
  prizes: PrizeConfig[],
  exhaustedGrades: Grade[]
): InventoryState {
  const state = initInventoryState(prizes);
  return {
    ...state,
    exhaustedGrades: new Set(exhaustedGrades),
  };
}

/** 특정 prizeId의 재고를 원하는 값으로 덮어쓰는 헬퍼 */
function overrideStock(state: InventoryState, prizeId: string, qty: number): InventoryState {
  return {
    ...state,
    stocks: { ...state.stocks, [prizeId]: qty },
  };
}

// ---------------------------------------------------------------------------
// initInventoryState
// ---------------------------------------------------------------------------

describe('initInventoryState', () => {
  it('각 prizeId의 초기 재고가 initialStock과 동일하다', () => {
    const state = initInventoryState(SAMPLE_PRIZES);
    expect(state.stocks['normal-001']).toBe(5);
    expect(state.stocks['normal-002']).toBe(3);
    expect(state.stocks['rare-001']).toBe(2);
    expect(state.stocks['epic-001']).toBe(1);
    expect(state.stocks['primeval-001']).toBe(1);
  });

  it('초기 exhaustedGrades는 비어 있다', () => {
    const state = initInventoryState(SAMPLE_PRIZES);
    expect(state.exhaustedGrades.size).toBe(0);
  });

  it('상품이 없으면 stocks가 비어 있다', () => {
    const state = initInventoryState([]);
    expect(Object.keys(state.stocks)).toHaveLength(0);
    expect(state.exhaustedGrades.size).toBe(0);
  });

  it('동일 prizeId가 여러 번 등장하면 마지막 값으로 덮어써진다', () => {
    const duplicatePrizes: PrizeConfig[] = [
      { id: 'dup-001', name: 'A', grade: 'Normal', imageUrl: '', initialStock: 3 },
      { id: 'dup-001', name: 'A', grade: 'Normal', imageUrl: '', initialStock: 7 },
    ];
    const state = initInventoryState(duplicatePrizes);
    expect(state.stocks['dup-001']).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// deductStock
// ---------------------------------------------------------------------------

describe('deductStock', () => {
  it('재고가 1 이상이면 ok: true와 차감된 상태를 반환한다', () => {
    const state = initInventoryState(SAMPLE_PRIZES);
    const result = deductStock(state, 'normal-001');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.stocks['normal-001']).toBe(4);
    }
  });

  it('차감 후 나머지 상품 재고는 변경되지 않는다', () => {
    const state = initInventoryState(SAMPLE_PRIZES);
    const result = deductStock(state, 'rare-001');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.stocks['normal-001']).toBe(5);
      expect(result.value.stocks['epic-001']).toBe(1);
    }
  });

  it('재고가 1인 상품을 차감하면 해당 상품이 0이 된다', () => {
    const state = initInventoryState(SAMPLE_PRIZES);
    const result = deductStock(state, 'epic-001');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.stocks['epic-001']).toBe(0);
    }
  });

  it('재고가 0인 상품에 차감 시 STOCK_ALREADY_ZERO 에러를 반환한다', () => {
    const state = overrideStock(initInventoryState(SAMPLE_PRIZES), 'epic-001', 0);
    const result = deductStock(state, 'epic-001');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('STOCK_ALREADY_ZERO');
      expect(result.error.prizeId).toBe('epic-001');
    }
  });

  it('존재하지 않는 prizeId에 차감 시 PRIZE_NOT_FOUND 에러를 반환한다', () => {
    const state = initInventoryState(SAMPLE_PRIZES);
    const result = deductStock(state, 'non-existent-id');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('PRIZE_NOT_FOUND');
      expect(result.error.prizeId).toBe('non-existent-id');
    }
  });

  it('에러 반환 시 원본 상태가 변경되지 않는다 (불변성)', () => {
    const state = overrideStock(initInventoryState(SAMPLE_PRIZES), 'epic-001', 0);
    const originalStocks = { ...state.stocks };
    deductStock(state, 'epic-001');
    expect(state.stocks).toEqual(originalStocks);
  });

  it('성공 시 원본 상태가 변경되지 않는다 (불변성)', () => {
    const state = initInventoryState(SAMPLE_PRIZES);
    const originalQty = state.stocks['normal-001'];
    deductStock(state, 'normal-001');
    expect(state.stocks['normal-001']).toBe(originalQty);
  });

  it('재고가 0인 상태에서 반복 차감 시도는 항상 에러를 반환한다', () => {
    let state = initInventoryState(SAMPLE_PRIZES);
    // 재고 2인 rare-001을 모두 소진
    const r1 = deductStock(state, 'rare-001');
    expect(r1.ok).toBe(true);
    if (r1.ok) state = r1.value;
    const r2 = deductStock(state, 'rare-001');
    expect(r2.ok).toBe(true);
    if (r2.ok) state = r2.value;
    // 이제 0이 됨
    const r3 = deductStock(state, 'rare-001');
    expect(r3.ok).toBe(false);
    if (!r3.ok) {
      expect(r3.error.type).toBe('STOCK_ALREADY_ZERO');
    }
  });

  it('차감으로 재고 총합이 정확히 1 감소한다', () => {
    const state = initInventoryState(SAMPLE_PRIZES);
    const before = getTotalStock(state);
    const result = deductStock(state, 'normal-001');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getTotalStock(result.value)).toBe(before - 1);
    }
  });
});

// ---------------------------------------------------------------------------
// isGradeExhausted
// ---------------------------------------------------------------------------

describe('isGradeExhausted', () => {
  it('소진되지 않은 등급은 false를 반환한다', () => {
    const state = initInventoryState(SAMPLE_PRIZES);
    expect(isGradeExhausted(state, 'Normal')).toBe(false);
    expect(isGradeExhausted(state, 'Rare')).toBe(false);
    expect(isGradeExhausted(state, 'Epic')).toBe(false);
    expect(isGradeExhausted(state, 'Primeval')).toBe(false);
  });

  it('exhaustedGrades에 포함된 등급은 true를 반환한다', () => {
    const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Epic', 'Primeval']);
    expect(isGradeExhausted(state, 'Epic')).toBe(true);
    expect(isGradeExhausted(state, 'Primeval')).toBe(true);
    expect(isGradeExhausted(state, 'Normal')).toBe(false);
    expect(isGradeExhausted(state, 'Rare')).toBe(false);
  });

  it('모든 등급이 소진된 상태에서 모두 true를 반환한다', () => {
    const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Normal', 'Rare', 'Epic', 'Primeval']);
    const grades: Grade[] = ['Normal', 'Rare', 'Epic', 'Primeval'];
    for (const grade of grades) {
      expect(isGradeExhausted(state, grade)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getAvailableGrades
// ---------------------------------------------------------------------------

describe('getAvailableGrades', () => {
  it('초기 상태에서 모든 등급을 반환한다', () => {
    const state = initInventoryState(SAMPLE_PRIZES);
    expect(getAvailableGrades(state)).toEqual(['Normal', 'Rare', 'Epic', 'Primeval']);
  });

  it('소진된 등급은 결과에서 제외된다', () => {
    const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Rare', 'Primeval']);
    expect(getAvailableGrades(state)).toEqual(['Normal', 'Epic']);
  });

  it('모든 등급이 소진되면 빈 배열을 반환한다', () => {
    const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Normal', 'Rare', 'Epic', 'Primeval']);
    expect(getAvailableGrades(state)).toEqual([]);
  });

  it('반환 순서는 GRADE_ORDER(Normal→Rare→Epic→Primeval)를 따른다', () => {
    const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Rare']);
    const grades = getAvailableGrades(state);
    expect(grades).toEqual(['Normal', 'Epic', 'Primeval']);
    // 순서 확인
    expect(grades.indexOf('Normal')).toBeLessThan(grades.indexOf('Epic'));
    expect(grades.indexOf('Epic')).toBeLessThan(grades.indexOf('Primeval'));
  });

  it('단일 등급만 남은 경우 해당 등급만 반환한다', () => {
    const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Normal', 'Rare', 'Epic']);
    expect(getAvailableGrades(state)).toEqual(['Primeval']);
  });
});

// ---------------------------------------------------------------------------
// getTotalStock
// ---------------------------------------------------------------------------

describe('getTotalStock', () => {
  it('초기 상태에서 전체 재고 합계를 정확히 반환한다', () => {
    // normal-001: 5, normal-002: 3, rare-001: 2, epic-001: 1, primeval-001: 1 → 합계 12
    const state = initInventoryState(SAMPLE_PRIZES);
    expect(getTotalStock(state)).toBe(12);
  });

  it('상품이 없으면 0을 반환한다', () => {
    const state = initInventoryState([]);
    expect(getTotalStock(state)).toBe(0);
  });

  it('차감 이후 재고 합계가 1 감소한다', () => {
    const state = initInventoryState(SAMPLE_PRIZES);
    const result = deductStock(state, 'normal-001');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getTotalStock(result.value)).toBe(11);
    }
  });

  it('모든 재고가 0이면 0을 반환한다', () => {
    const prizes: PrizeConfig[] = [
      { id: 'a', name: 'A', grade: 'Normal', imageUrl: '', initialStock: 0 },
    ];
    const state = initInventoryState(prizes);
    expect(getTotalStock(state)).toBe(0);
  });

  it('단일 상품 재고를 여러 번 차감해도 합계가 정확히 감소한다', () => {
    const prizes: PrizeConfig[] = [
      { id: 'x', name: 'X', grade: 'Normal', imageUrl: '', initialStock: 10 },
    ];
    let state = initInventoryState(prizes);
    for (let i = 0; i < 5; i++) {
      const r = deductStock(state, 'x');
      expect(r.ok).toBe(true);
      if (r.ok) state = r.value;
    }
    expect(getTotalStock(state)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// resolveFallbackGrade
// ---------------------------------------------------------------------------

describe('resolveFallbackGrade', () => {
  describe('목표 등급이 소진되지 않은 경우 (폴백 불필요)', () => {
    // resolveFallbackGrade는 targetGrade 자체의 소진 여부와 무관하게
    // 항상 상위→하위 순으로 탐색한다. targetGrade 자체를 반환하지는 않는다.
    it('Normal이 목표이고 Rare가 사용 가능하면 Rare를 반환한다', () => {
      const state = initInventoryState(SAMPLE_PRIZES);
      expect(resolveFallbackGrade(state, 'Normal')).toBe('Rare');
    });

    it('Rare가 목표이고 Epic이 사용 가능하면 Epic을 반환한다', () => {
      const state = initInventoryState(SAMPLE_PRIZES);
      expect(resolveFallbackGrade(state, 'Rare')).toBe('Epic');
    });

    it('Epic이 목표이고 Primeval이 사용 가능하면 Primeval을 반환한다', () => {
      const state = initInventoryState(SAMPLE_PRIZES);
      expect(resolveFallbackGrade(state, 'Epic')).toBe('Primeval');
    });
  });

  describe('상위 등급 우선 탐색', () => {
    it('Rare가 목표이고 Epic이 소진, Primeval이 남으면 Primeval을 반환한다', () => {
      const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Epic']);
      expect(resolveFallbackGrade(state, 'Rare')).toBe('Primeval');
    });

    it('Normal이 목표이고 Rare·Epic이 소진, Primeval이 남으면 Primeval을 반환한다', () => {
      const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Rare', 'Epic']);
      expect(resolveFallbackGrade(state, 'Normal')).toBe('Primeval');
    });
  });

  describe('상위 소진 후 하위 등급 탐색', () => {
    it('Rare가 목표이고 Epic·Primeval이 소진이면 Normal을 반환한다', () => {
      const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Epic', 'Primeval']);
      expect(resolveFallbackGrade(state, 'Rare')).toBe('Normal');
    });

    it('Epic이 목표이고 Primeval이 소진이면 하위 Rare를 반환한다', () => {
      const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Primeval']);
      expect(resolveFallbackGrade(state, 'Epic')).toBe('Rare');
    });

    it('Epic이 목표이고 Primeval·Rare가 소진이면 Normal을 반환한다', () => {
      const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Primeval', 'Rare']);
      expect(resolveFallbackGrade(state, 'Epic')).toBe('Normal');
    });

    it('Primeval이 목표이고 상위 없으므로 바로 하위 Epic을 반환한다', () => {
      const state = makeStateWithExhausted(SAMPLE_PRIZES, []);
      expect(resolveFallbackGrade(state, 'Primeval')).toBe('Epic');
    });

    it('Primeval이 목표이고 Epic 소진이면 Rare를 반환한다', () => {
      const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Epic']);
      expect(resolveFallbackGrade(state, 'Primeval')).toBe('Rare');
    });

    it('Primeval이 목표이고 Epic·Rare 소진이면 Normal을 반환한다', () => {
      const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Epic', 'Rare']);
      expect(resolveFallbackGrade(state, 'Primeval')).toBe('Normal');
    });
  });

  describe('전체 소진 시 null 반환', () => {
    it('모든 등급이 소진되면 null을 반환한다', () => {
      const state = makeStateWithExhausted(SAMPLE_PRIZES, ['Normal', 'Rare', 'Epic', 'Primeval']);
      const grades: Grade[] = ['Normal', 'Rare', 'Epic', 'Primeval'];
      for (const grade of grades) {
        expect(resolveFallbackGrade(state, grade)).toBeNull();
      }
    });
  });

  describe('반환된 등급은 항상 사용 가능하다 (Property 9)', () => {
    const testCases: Array<{ exhausted: Grade[]; target: Grade }> = [
      { exhausted: [], target: 'Normal' },
      { exhausted: ['Rare'], target: 'Normal' },
      { exhausted: ['Epic', 'Primeval'], target: 'Rare' },
      { exhausted: ['Primeval'], target: 'Epic' },
      { exhausted: ['Epic', 'Rare'], target: 'Primeval' },
    ];

    for (const { exhausted, target } of testCases) {
      it(`목표 ${target}, 소진 [${exhausted.join(', ')}] → 반환값은 소진되지 않은 등급이다`, () => {
        const state = makeStateWithExhausted(SAMPLE_PRIZES, exhausted);
        const result = resolveFallbackGrade(state, target);
        if (result !== null) {
          expect(isGradeExhausted(state, result)).toBe(false);
        }
      });
    }
  });

  describe('상위 등급 우선 원칙 검증', () => {
    it('Normal이 목표이고 Rare·Epic·Primeval 모두 사용 가능하면 가장 가까운 상위 Rare를 반환한다', () => {
      const state = initInventoryState(SAMPLE_PRIZES);
      expect(resolveFallbackGrade(state, 'Normal')).toBe('Rare');
    });

    it('Rare가 목표이고 Epic·Primeval 모두 사용 가능하면 가장 가까운 상위 Epic을 반환한다', () => {
      const state = initInventoryState(SAMPLE_PRIZES);
      expect(resolveFallbackGrade(state, 'Rare')).toBe('Epic');
    });
  });
});
