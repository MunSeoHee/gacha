/**
 * multiDraw.ts 단위 테스트
 *
 * 커버 범위:
 * - resolveMaxGrade: GRADE_ORDER 기준 최고 등급 반환
 * - resolveMultiDrawGrades: DrawCount만큼 등급 배열 확정, 재고 시뮬레이션, 폴백 적용
 *
 * 요구사항: 5.2, 5.3, 5.8
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveMaxGrade, resolveMultiDrawGrades } from './multiDraw';
import {
  type Grade,
  type InventoryState,
  type PrizeConfig,
  type ProbabilityTable,
  GRADE_ORDER,
} from './types';

// ---------------------------------------------------------------------------
// 테스트 헬퍼
// ---------------------------------------------------------------------------

/** 모든 등급에 상품이 충분히 있는 기본 InventoryState를 생성한다. */
function makeState(
  overrides: Partial<Record<string, number>> = {}
): { state: InventoryState; prizes: PrizeConfig[] } {
  const prizes: PrizeConfig[] = [
    { id: 'normal-1', name: '일반 상품 1', grade: 'Normal', imageUrl: '', initialStock: 10 },
    { id: 'rare-1', name: '희귀 상품 1', grade: 'Rare', imageUrl: '', initialStock: 5 },
    { id: 'epic-1', name: '전설 상품 1', grade: 'Epic', imageUrl: '', initialStock: 3 },
    { id: 'primeval-1', name: '태초 상품 1', grade: 'Primeval', imageUrl: '', initialStock: 2 },
  ];

  const stocks: Record<string, number> = {
    'normal-1': 10,
    'rare-1': 5,
    'epic-1': 3,
    'primeval-1': 2,
    ...overrides,
  };

  const exhaustedGrades = new Set<Grade>(
    GRADE_ORDER.filter((grade) => {
      const gradeIds = prizes.filter((p) => p.grade === grade).map((p) => p.id);
      return gradeIds.every((id) => (stocks[id] ?? 0) === 0);
    })
  );

  const gradeMap: Record<string, Grade> = {};
  for (const prize of prizes) {
    gradeMap[prize.id] = prize.grade;
  }

  return {
    state: { stocks, exhaustedGrades, gradeMap },
    prizes,
  };
}

/** 표준 확률표 */
const DEFAULT_TABLE: ProbabilityTable = {
  Normal: 0.60,
  Rare: 0.30,
  Epic: 0.08,
  Primeval: 0.02,
};

// ---------------------------------------------------------------------------
// resolveMaxGrade 테스트
// ---------------------------------------------------------------------------

describe('resolveMaxGrade', () => {
  it('단일 등급 배열에서는 해당 등급을 반환한다', () => {
    expect(resolveMaxGrade(['Normal'])).toBe('Normal');
    expect(resolveMaxGrade(['Rare'])).toBe('Rare');
    expect(resolveMaxGrade(['Epic'])).toBe('Epic');
    expect(resolveMaxGrade(['Primeval'])).toBe('Primeval');
  });

  it('Normal과 Rare 중 Rare를 반환한다', () => {
    expect(resolveMaxGrade(['Normal', 'Rare'])).toBe('Rare');
    expect(resolveMaxGrade(['Rare', 'Normal'])).toBe('Rare');
  });

  it('여러 등급이 혼재할 때 가장 높은 등급을 반환한다', () => {
    expect(resolveMaxGrade(['Normal', 'Rare', 'Epic', 'Primeval'])).toBe('Primeval');
    expect(resolveMaxGrade(['Normal', 'Epic', 'Normal', 'Rare'])).toBe('Epic');
  });

  it('모두 같은 등급이면 해당 등급을 반환한다', () => {
    expect(resolveMaxGrade(['Normal', 'Normal', 'Normal'])).toBe('Normal');
    expect(resolveMaxGrade(['Epic', 'Epic'])).toBe('Epic');
  });

  it('빈 배열이면 에러를 던진다', () => {
    expect(() => resolveMaxGrade([])).toThrow();
  });

  it('Primeval이 하나라도 있으면 Primeval을 반환한다', () => {
    expect(resolveMaxGrade(['Normal', 'Normal', 'Primeval', 'Normal'])).toBe('Primeval');
  });

  it('GRADE_ORDER 역순으로 배열되어도 올바른 최고 등급을 반환한다', () => {
    expect(resolveMaxGrade(['Primeval', 'Epic', 'Rare', 'Normal'])).toBe('Primeval');
  });
});

// ---------------------------------------------------------------------------
// resolveMultiDrawGrades 테스트
// ---------------------------------------------------------------------------

describe('resolveMultiDrawGrades', () => {
  describe('결과 배열 길이 = DrawCount', () => {
    it('count=1이면 길이 1의 배열을 반환한다', () => {
      const { state, prizes } = makeState();
      const result = resolveMultiDrawGrades(1, DEFAULT_TABLE, state, prizes);
      expect(result).toHaveLength(1);
    });

    it('count=5이면 길이 5의 배열을 반환한다', () => {
      const { state, prizes } = makeState();
      const result = resolveMultiDrawGrades(5, DEFAULT_TABLE, state, prizes);
      expect(result).toHaveLength(5);
    });

    it('count=10이면 길이 10의 배열을 반환한다', () => {
      const { state, prizes } = makeState();
      const result = resolveMultiDrawGrades(10, DEFAULT_TABLE, state, prizes);
      expect(result).toHaveLength(10);
    });
  });

  describe('반환되는 등급의 유효성', () => {
    it('반환된 모든 등급은 GRADE_ORDER 안에 있어야 한다', () => {
      const { state, prizes } = makeState();
      const result = resolveMultiDrawGrades(10, DEFAULT_TABLE, state, prizes);
      for (const grade of result) {
        expect(GRADE_ORDER).toContain(grade);
      }
    });
  });

  describe('재고 시뮬레이션 및 폴백 (요구사항 5.8)', () => {
    it('Normal 재고가 0이면 Normal 등급이 결과에 포함되지 않는다', () => {
      // Normal 재고 0으로 설정
      const { state, prizes } = makeState({ 'normal-1': 0 });
      const result = resolveMultiDrawGrades(5, DEFAULT_TABLE, state, prizes);
      // Normal이 소진되었으므로 Normal이 나와서는 안 된다
      for (const grade of result) {
        expect(grade).not.toBe('Normal');
      }
    });

    it('Normal과 Rare가 모두 소진되면 Epic 이상만 반환된다', () => {
      const { state, prizes } = makeState({
        'normal-1': 0,
        'rare-1': 0,
      });
      const result = resolveMultiDrawGrades(5, DEFAULT_TABLE, state, prizes);
      for (const grade of result) {
        expect(['Epic', 'Primeval']).toContain(grade);
      }
    });

    it('재고가 충분하지 않을 때 에러를 던진다', () => {
      // 총 재고 = 2개인데 5개 요청
      const { state, prizes } = makeState({
        'normal-1': 0,
        'rare-1': 0,
        'epic-1': 0,
        'primeval-1': 2,
      });
      expect(() =>
        resolveMultiDrawGrades(5, DEFAULT_TABLE, state, prizes)
      ).toThrow();
    });

    it('단일 등급 재고만 남아 있을 때 해당 등급만 반환한다', () => {
      // Primeval 1개만 남음
      const { state, prizes } = makeState({
        'normal-1': 0,
        'rare-1': 0,
        'epic-1': 0,
        'primeval-1': 1,
      });
      const result = resolveMultiDrawGrades(1, DEFAULT_TABLE, state, prizes);
      expect(result).toEqual(['Primeval']);
    });

    it('동일 등급 재고가 count개 정확히 있을 때 모두 소진하여 확정한다', () => {
      const { state, prizes } = makeState({
        'normal-1': 0,
        'rare-1': 0,
        'epic-1': 0,
        'primeval-1': 3,
      });
      const result = resolveMultiDrawGrades(3, DEFAULT_TABLE, state, prizes);
      expect(result).toHaveLength(3);
      expect(result.every((g) => g === 'Primeval')).toBe(true);
    });
  });

  describe('입력 유효성 검사', () => {
    it('count=0이면 에러를 던진다', () => {
      const { state, prizes } = makeState();
      expect(() =>
        resolveMultiDrawGrades(0, DEFAULT_TABLE, state, prizes)
      ).toThrow();
    });

    it('count가 음수이면 에러를 던진다', () => {
      const { state, prizes } = makeState();
      expect(() =>
        resolveMultiDrawGrades(-1, DEFAULT_TABLE, state, prizes)
      ).toThrow();
    });

    it('count가 소수이면 에러를 던진다', () => {
      const { state, prizes } = makeState();
      expect(() =>
        resolveMultiDrawGrades(1.5, DEFAULT_TABLE, state, prizes)
      ).toThrow();
    });
  });

  describe('원본 상태 불변성', () => {
    it('resolveMultiDrawGrades 호출 후 원본 InventoryState가 변경되지 않는다', () => {
      const { state, prizes } = makeState();
      const originalStocks = { ...state.stocks };
      const originalExhausted = new Set(state.exhaustedGrades);

      resolveMultiDrawGrades(5, DEFAULT_TABLE, state, prizes);

      // 원본 state 불변 확인
      expect(state.stocks).toEqual(originalStocks);
      expect(state.exhaustedGrades).toEqual(originalExhausted);
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

/**
 * Property 7: 멀티 드로우 MaxGrade는 destinedGrades 배열의 최댓값
 *
 * Validates: Requirements 5.3
 */
describe('Property 7: resolveMaxGrade는 항상 GRADE_ORDER 기준 최댓값', () => {
  it('임의의 Grade 배열에 대해 resolveMaxGrade는 배열의 최고 등급을 반환한다', () => {
    const gradeArbitrary = fc.constantFrom<Grade>('Normal', 'Rare', 'Epic', 'Primeval');
    const gradesArrayArb = fc.array(gradeArbitrary, { minLength: 1, maxLength: 20 });

    fc.assert(
      fc.property(gradesArrayArb, (grades) => {
        const maxGrade = resolveMaxGrade(grades);

        // maxGrade가 배열에 포함되어야 한다
        if (!grades.includes(maxGrade)) return false;

        // maxGrade는 배열의 다른 모든 등급보다 높거나 같아야 한다
        return grades.every(
          (g) => GRADE_ORDER.indexOf(g) <= GRADE_ORDER.indexOf(maxGrade)
        );
      }),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 8: 멀티 드로우 결과 목록 항목 수는 DrawCount와 동일
 *
 * Validates: Requirements 5.2, 5.6
 */
describe('Property 8: resolveMultiDrawGrades 결과 길이는 항상 DrawCount와 동일', () => {
  it('임의의 유효한 count에 대해 결과 배열 길이 = count', () => {
    fc.assert(
      fc.property(
        // count: 1~10 사이 정수 (재고 범위 내)
        fc.integer({ min: 1, max: 10 }),
        (count) => {
          const { state, prizes } = makeState({
            'normal-1': 50,
            'rare-1': 50,
            'epic-1': 50,
            'primeval-1': 50,
          });

          const result = resolveMultiDrawGrades(count, DEFAULT_TABLE, state, prizes);
          return result.length === count;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property: resolveMultiDrawGrades가 반환하는 모든 등급은 GRADE_ORDER 안에 있어야 한다
 *
 * Validates: Requirements 5.2
 */
describe('Property: resolveMultiDrawGrades 반환 등급은 항상 유효한 Grade', () => {
  it('임의의 count에 대해 반환된 모든 등급은 GRADE_ORDER 안에 있어야 한다', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (count) => {
          const { state, prizes } = makeState({
            'normal-1': 20,
            'rare-1': 20,
            'epic-1': 20,
            'primeval-1': 20,
          });
          const result = resolveMultiDrawGrades(count, DEFAULT_TABLE, state, prizes);
          return result.every((g) => GRADE_ORDER.includes(g));
        }
      ),
      { numRuns: 100 }
    );
  });
});
