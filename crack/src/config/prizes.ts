import type { PrizeConfig } from '../domain/types';

/**
 * 등급별 샘플 상품 목록.
 * 각 등급에 최소 1개 이상의 상품이 정의되어 있어야 한다 (validateConfig 검증 대상).
 *
 * Validates: Requirements 1.12, 2.3
 */
export const PRIZES: PrizeConfig[] = [
  // ── Normal ──────────────────────────────────────────────────────────────
  {
    id: 'normal-001',
    name: '기념 스티커 세트',
    grade: 'Normal',
    imageUrl: '/images/prizes/prize-normal-1.png',
    initialStock: 50,
  },
  {
    id: 'normal-002',
    name: '홀로그램 포토카드',
    grade: 'Normal',
    imageUrl: '/images/prizes/prize-normal-2.png',
    initialStock: 50,
  },

  // ── Rare ────────────────────────────────────────────────────────────────
  {
    id: 'rare-001',
    name: '아크릴 스탠드',
    grade: 'Rare',
    imageUrl: '/images/prizes/prize-rare-1.png',
    initialStock: 30,
  },
  {
    id: 'rare-002',
    name: '패브릭 포스터',
    grade: 'Rare',
    imageUrl: '/images/prizes/prize-rare-2.png',
    initialStock: 30,
  },

  // ── Epic ────────────────────────────────────────────────────────────────
  {
    id: 'epic-001',
    name: '한정판 굿즈 박스',
    grade: 'Epic',
    imageUrl: '/images/prizes/prize-epic-1.png',
    initialStock: 10,
  },
  {
    id: 'epic-002',
    name: '사인 포토북',
    grade: 'Epic',
    imageUrl: '/images/prizes/prize-epic-2.png',
    initialStock: 10,
  },

  // ── Primeval ────────────────────────────────────────────────────────────
  {
    id: 'primeval-001',
    name: '태초의 아이템 (최고급 한정 상품)',
    grade: 'Primeval',
    imageUrl: '/images/prizes/prize-primeval-1.png',
    initialStock: 3,
  },
];
