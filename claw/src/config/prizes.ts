import type { PrizeConfig } from '../domain/types';

/**
 * 등급별 상품 및 초기 재고.
 * A(가장 희귀) → F(가장 흔함). 꽝 없음.
 *
 * 총 재고 = 5 + 10 + 30 + 80 + 200 + 500 = 825
 */
// 상품 이미지는 public/images/prizes/ 에 파일을 넣으면 자동으로 표시된다.
// 파일이 없으면 결과 카드는 플레이스홀더로 대체된다.
export const PRIZES: PrizeConfig[] = [
  { id: 'A', name: 'A상 · 특대 피규어', grade: 'A', initialStock: 5, imageUrl: '/images/prizes/A.png' },
  { id: 'B', name: 'B상 · 한정 인형', grade: 'B', initialStock: 10, imageUrl: '/images/prizes/B.png' },
  { id: 'C', name: 'C상 · 아크릴 스탠드', grade: 'C', initialStock: 30, imageUrl: '/images/prizes/C.png' },
  { id: 'D', name: 'D상 · 미니 피규어', grade: 'D', initialStock: 80, imageUrl: '/images/prizes/D.png' },
  { id: 'E', name: 'E상 · 홀로 포토카드', grade: 'E', initialStock: 200, imageUrl: '/images/prizes/E.png' },
  { id: 'F', name: 'F상 · 기념 스티커', grade: 'F', initialStock: 500, imageUrl: '/images/prizes/F.png' },
];
