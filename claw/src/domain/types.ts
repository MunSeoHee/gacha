/**
 * 인형뽑기(쿠지) 경품 추첨 게임 핵심 타입.
 *
 * 결과는 게임 시작 시 재고 풀을 셔플해 확정되며, 뽑기는 비복원 추출이다.
 * 꽝은 없다 — 풀의 모든 티켓은 상품이다.
 */

/**
 * 상품 등급. A가 가장 희귀하고 F가 가장 흔하다.
 * 배열 순서는 희귀도 내림차순(A→F)이다.
 */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export const GRADE_ORDER: Grade[] = ['A', 'B', 'C', 'D', 'E', 'F'];

/** 뽑기 도구 종류. 선택한 뽑기 횟수에 따라 결정된다. */
export type Tool = 'claw' | 'magnet' | 'scoop';

/** 뽑기 횟수 → 도구 매핑 */
export const TOOL_BY_COUNT: Record<number, Tool> = {
  1: 'claw',
  5: 'magnet',
  10: 'scoop',
};

/** 상품 설정 (정적 주입). 등급별 1개 대표 상품. */
export interface PrizeConfig {
  /** 상품 고유 식별자 */
  id: string;
  /** 상품 이름 */
  name: string;
  /** 상품 등급 */
  grade: Grade;
  /** 상품 이미지 URL (없으면 플레이스홀더 렌더) */
  imageUrl?: string;
  /** 초기 재고 수량 */
  initialStock: number;
}

/** 한 번 뽑은 결과(확정된 상품) */
export interface PrizeResult {
  prizeId: string;
  prizeName: string;
  grade: Grade;
  imageUrl?: string;
}
