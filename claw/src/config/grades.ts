import type { Grade } from '../domain/types';

/** 등급별 표시 테마 (라벨/색상). 상품 공개 카드와 뱃지에 사용. */
export interface GradeTheme {
  label: string;
  /** 카드 그라데이션 시작/끝 */
  from: string;
  to: string;
  /** 뱃지/글로우 강조색 */
  accent: string;
  /** 공개 시 반짝임 강도 (0~1). 희귀할수록 화려하게. */
  sparkle: number;
}

export const GRADE_THEME: Record<Grade, GradeTheme> = {
  A: { label: 'A상', from: '#fff1b8', to: '#ffb020', accent: '#ff8f00', sparkle: 1 },
  B: { label: 'B상', from: '#e6d4ff', to: '#9b5cff', accent: '#7c3aed', sparkle: 0.8 },
  C: { label: 'C상', from: '#c9e7ff', to: '#4aa3ff', accent: '#2b7fff', sparkle: 0.55 },
  D: { label: 'D상', from: '#c9ffe0', to: '#39d98a', accent: '#12b76a', sparkle: 0.35 },
  E: { label: 'E상', from: '#ffe0ec', to: '#ff8fb3', accent: '#f4568a', sparkle: 0.2 },
  F: { label: 'F상', from: '#eef1f5', to: '#c3cbd6', accent: '#8b95a3', sparkle: 0.1 },
};
