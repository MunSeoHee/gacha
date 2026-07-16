/**
 * 확률 결정 로직 단위 테스트
 *
 * 요구사항: 2.1, 2.4, 3.4
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { resolveDestinedGrade } from './probability';
import { type Grade, type ProbabilityTable, GRADE_ORDER } from './types';

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

const DEFAULT_TABLE: ProbabilityTable = {
  Normal: 0.60,
  Rare: 0.30,
  Epic: 0.08,
  Primeval: 0.02,
};

const ALL_GRADES: Grade[] = ['Normal', 'Rare', 'Epic', 'Primeval'];

// ---------------------------------------------------------------------------
// 기본 동작 테스트
// ---------------------------------------------------------------------------

describe('resolveDestinedGrade - 기본 동작', () => {
  it('availableGrades가 1개일 때 항상 그 등급을 반환한다 (Normal)', () => {
    for (let i = 0; i < 20; i++) {
      expect(resolveDestinedGrade(DEFAULT_TABLE, ['Normal'])).toBe('Normal');
    }
  });

  it('availableGrades가 1개일 때 항상 그 등급을 반환한다 (Primeval)', () => {
    for (let i = 0; i < 20; i++) {
      expect(resolveDestinedGrade(DEFAULT_TABLE, ['Primeval'])).toBe('Primeval');
    }
  });

  it('반환값은 항상 availableGrades 안에 포함된다 (전체 등급)', () => {
    for (let i = 0; i < 100; i++) {
      const result = resolveDestinedGrade(DEFAULT_TABLE, ALL_GRADES);
      expect(ALL_GRADES).toContain(result);
    }
  });

  it('반환값은 항상 availableGrades 안에 포함된다 (부분 등급)', () => {
    const available: Grade[] = ['Rare', 'Epic'];
    for (let i = 0; i < 100; i++) {
      const result = resolveDestinedGrade(DEFAULT_TABLE, available);
      expect(available).toContain(result);
    }
  });

  it('availableGrades가 비어있으면 에러를 던진다', () => {
    expect(() => resolveDestinedGrade(DEFAULT_TABLE, [])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 정규화 동작 테스트
// ---------------------------------------------------------------------------

describe('resolveDestinedGrade - 정규화(재고 없는 등급 제외)', () => {
  it('Normal이 소진된 경우 Normal을 반환하지 않는다', () => {
    const available: Grade[] = ['Rare', 'Epic', 'Primeval'];
    for (let i = 0; i < 100; i++) {
      const result = resolveDestinedGrade(DEFAULT_TABLE, available);
      expect(result).not.toBe('Normal');
    }
  });

  it('Primeval만 남아있을 때 항상 Primeval을 반환한다', () => {
    for (let i = 0; i < 50; i++) {
      expect(resolveDestinedGrade(DEFAULT_TABLE, ['Primeval'])).toBe('Primeval');
    }
  });

  it('Normal과 Rare만 남아있을 때 Epic·Primeval을 반환하지 않는다', () => {
    const available: Grade[] = ['Normal', 'Rare'];
    for (let i = 0; i < 100; i++) {
      const result = resolveDestinedGrade(DEFAULT_TABLE, available);
      expect(['Normal', 'Rare']).toContain(result);
    }
  });
});

// ---------------------------------------------------------------------------
// 가중 샘플링 편향 검증 (통계적 분포)
// ---------------------------------------------------------------------------

describe('resolveDestinedGrade - 가중치 분포 검증', () => {
  /**
   * Math.random을 고정하여 결정적 동작을 검증하는 것은
   * 구현 세부 사항에 의존적이므로, 대신 대량 샘플링으로 분포를 검증한다.
   */
  it('모든 등급이 있을 때 Normal이 가장 많이 나와야 한다 (60%)', () => {
    const counts: Record<Grade, number> = { Normal: 0, Rare: 0, Epic: 0, Primeval: 0 };
    const runs = 10000;
    for (let i = 0; i < runs; i++) {
      counts[resolveDestinedGrade(DEFAULT_TABLE, ALL_GRADES)]++;
    }
    // Normal(60%)이 절반 이상
    expect(counts.Normal / runs).toBeGreaterThan(0.5);
    // Primeval(2%)이 10% 미만
    expect(counts.Primeval / runs).toBeLessThan(0.10);
  });

  it('Normal이 제외되면 Rare가 가장 많이 나와야 한다', () => {
    const available: Grade[] = ['Rare', 'Epic', 'Primeval'];
    const counts: Record<Grade, number> = { Normal: 0, Rare: 0, Epic: 0, Primeval: 0 };
    const runs = 5000;
    for (let i = 0; i < runs; i++) {
      counts[resolveDestinedGrade(DEFAULT_TABLE, available)]++;
    }
    // Rare(30/40 = 75%)가 가장 많아야 한다
    expect(counts.Rare).toBeGreaterThan(counts.Epic);
    expect(counts.Rare).toBeGreaterThan(counts.Primeval);
    expect(counts.Normal).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 엣지 케이스: Math.random 모킹으로 경계값 검증
// ---------------------------------------------------------------------------

describe('resolveDestinedGrade - 경계값 결정론적 테스트', () => {
  it('roll=0.0이면 GRADE_ORDER 첫 available 등급(Normal)이 선택된다', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      expect(resolveDestinedGrade(DEFAULT_TABLE, ALL_GRADES)).toBe('Normal');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('roll이 Normal+Rare 구간 내부(0.65)이면 Rare가 선택된다', () => {
    // totalWeight=1.0, Normal=0.60, Rare=0.30
    // cumulative after Normal = 0.60, after Rare = 0.90
    // roll=0.65 → 0.65 < 0.60 is false (Normal skipped), 0.65 < 0.90 is true → Rare
    vi.spyOn(Math, 'random').mockReturnValue(0.65);
    try {
      expect(resolveDestinedGrade(DEFAULT_TABLE, ALL_GRADES)).toBe('Rare');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('Normal이 소진되었을 때 roll=0이면 Rare가 선택된다', () => {
    // availableGrades=['Rare','Epic','Primeval'], totalWeight=0.40
    // roll=0 → Rare 구간(0~0.30) 첫 번째로 걸림
    vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      expect(resolveDestinedGrade(DEFAULT_TABLE, ['Rare', 'Epic', 'Primeval'])).toBe('Rare');
    } finally {
      vi.restoreAllMocks();
    }
  });
});

// ---------------------------------------------------------------------------
// Property-Based Test: Property 2 - DestinedGrade는 항상 재고가 있는 유효한 등급
//
// **Validates: Requirements 2.1, 2.4, 3.4**
// ---------------------------------------------------------------------------

describe('Property 2: DestinedGrade는 항상 재고가 있는 유효한 등급', () => {
  /**
   * 어떤 확률표와 availableGrades 조합에 대해서도,
   * resolveDestinedGrade()는 항상 availableGrades 중 하나를 반환해야 한다.
   *
   * **Validates: Requirements 2.1, 2.4, 3.4**
   */
  it('availableGrades 중 하나를 항상 반환한다', () => {
    // 유효한 확률표 생성: 4개 양수 값, 합이 1.0
    // fc.float requires 32-bit float values for min/max, so use Math.fround
    const validTableArbitrary = fc
      .tuple(
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.97), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.97), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.97), noNaN: true }),
      )
      .map(([a, b, c]) => {
        // d = 1 - a - b - c, 단 양수 보장
        const sum3 = a + b + c;
        if (sum3 >= 1.0) {
          // 비율 조정하여 합 < 1.0 보장
          const scale = 0.97 / sum3;
          const na = a * scale;
          const nb = b * scale;
          const nc = c * scale;
          const nd = 1.0 - na - nb - nc;
          return { Normal: na, Rare: nb, Epic: nc, Primeval: nd } as ProbabilityTable;
        }
        return { Normal: a, Rare: b, Epic: c, Primeval: 1.0 - sum3 } as ProbabilityTable;
      });

    // 1개 이상 4개 이하의 등급 부분집합
    const availableGradesArbitrary = fc
      .subarray(GRADE_ORDER as Grade[], { minLength: 1 })
      .filter((arr) => arr.length > 0);

    fc.assert(
      fc.property(validTableArbitrary, availableGradesArbitrary, (table, available) => {
        const result = resolveDestinedGrade(table, available);
        return available.includes(result);
      }),
      { numRuns: 200 }
    );
  });

  it('availableGrades가 비어있지 않으면 결과는 유효한 Grade 타입이다', () => {
    const validGradeSubset = fc
      .subarray(GRADE_ORDER as Grade[], { minLength: 1 });

    fc.assert(
      fc.property(validGradeSubset, (available) => {
        const result = resolveDestinedGrade(DEFAULT_TABLE, available);
        return (GRADE_ORDER as Grade[]).includes(result);
      }),
      { numRuns: 200 }
    );
  });
});
