import { describe, it, expect } from 'vitest';
import {
  GRADE_ORDER,
  gradeIndex,
  isHigherGrade,
  type Grade,
} from './types';

describe('GRADE_ORDER', () => {
  it('4개 등급을 올바른 순서로 정의한다', () => {
    expect(GRADE_ORDER).toEqual(['Normal', 'Rare', 'Epic', 'Primeval']);
  });

  it('길이가 정확히 4이다', () => {
    expect(GRADE_ORDER).toHaveLength(4);
  });
});

describe('gradeIndex', () => {
  it('Normal의 인덱스는 0이다', () => {
    expect(gradeIndex('Normal')).toBe(0);
  });

  it('Rare의 인덱스는 1이다', () => {
    expect(gradeIndex('Rare')).toBe(1);
  });

  it('Epic의 인덱스는 2이다', () => {
    expect(gradeIndex('Epic')).toBe(2);
  });

  it('Primeval의 인덱스는 3이다', () => {
    expect(gradeIndex('Primeval')).toBe(3);
  });

  it('GRADE_ORDER 배열과 인덱스가 일치한다', () => {
    GRADE_ORDER.forEach((grade, idx) => {
      expect(gradeIndex(grade)).toBe(idx);
    });
  });
});

describe('isHigherGrade', () => {
  it('Rare는 Normal보다 높다', () => {
    expect(isHigherGrade('Rare', 'Normal')).toBe(true);
  });

  it('Epic은 Rare보다 높다', () => {
    expect(isHigherGrade('Epic', 'Rare')).toBe(true);
  });

  it('Primeval은 Epic보다 높다', () => {
    expect(isHigherGrade('Primeval', 'Epic')).toBe(true);
  });

  it('Primeval은 Normal보다 높다', () => {
    expect(isHigherGrade('Primeval', 'Normal')).toBe(true);
  });

  it('같은 등급끼리는 높지 않다', () => {
    const grades: Grade[] = ['Normal', 'Rare', 'Epic', 'Primeval'];
    for (const grade of grades) {
      expect(isHigherGrade(grade, grade)).toBe(false);
    }
  });

  it('Normal은 Rare보다 높지 않다', () => {
    expect(isHigherGrade('Normal', 'Rare')).toBe(false);
  });

  it('Rare는 Epic보다 높지 않다', () => {
    expect(isHigherGrade('Rare', 'Epic')).toBe(false);
  });

  it('등급 순서는 전이적(transitive)이다', () => {
    // Normal < Rare < Epic < Primeval
    expect(isHigherGrade('Rare', 'Normal')).toBe(true);
    expect(isHigherGrade('Epic', 'Normal')).toBe(true);
    expect(isHigherGrade('Primeval', 'Normal')).toBe(true);
    expect(isHigherGrade('Epic', 'Rare')).toBe(true);
    expect(isHigherGrade('Primeval', 'Rare')).toBe(true);
    expect(isHigherGrade('Primeval', 'Epic')).toBe(true);
  });
});
