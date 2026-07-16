import type { Grade } from '../domain/types';

/** 등급별 표시 테마. 보상표·결과 카드·라인 하이라이트에 사용. */
export interface GradeTheme {
  label: string;
  /** 그라데이션 시작/끝 */
  from: string;
  to: string;
  /** 강조색(글로우·테두리) */
  accent: string;
  /** 결과 연출 화려함 (0~1) */
  sparkle: number;
}

export const GRADE_THEME: Record<Grade, GradeTheme> = {
  S: { label: 'S상', from: '#fff7cc', to: '#ffb020', accent: '#ff8f00', sparkle: 1 },
  A: { label: 'A상', from: '#e9d9ff', to: '#9b5cff', accent: '#7c3aed', sparkle: 0.75 },
  B: { label: 'B상', from: '#cfeaff', to: '#4aa3ff', accent: '#2b7fff', sparkle: 0.5 },
  C: { label: 'C상', from: '#d2ffe6', to: '#39d98a', accent: '#12b76a', sparkle: 0.3 },
  D: { label: 'D상', from: '#eef1f5', to: '#c3cbd6', accent: '#8b95a3', sparkle: 0.12 },
};
