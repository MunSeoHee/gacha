/**
 * 일일 복권(FF14 미니 갹토팟 스타일) 경품 추첨 게임 핵심 타입.
 *
 * 3×3 칸에 1~9 숫자가 각 1회씩 랜덤 배치된다. 처음 1칸이 공개된 채로 시작하고,
 * 플레이어는 최대 3칸을 추가로 열어본 뒤 직선 한 줄(가로3·세로3·대각선2 = 8줄 중 하나)을
 * 고른다. 그 줄에 놓인 세 숫자의 합계(6~24)가 복권별 보상표에 따라 상품으로 확정된다.
 *
 * 각 복권은 자체 상품 목록·재고·보상표를 가진다("복권별로 보상이 다르다").
 * 보드는 8개 라인이 모두 재고가 남은 상품으로 매핑되도록 생성되므로,
 * 플레이어가 어떤 줄을 고르든 품절 상품은 절대 당첨되지 않는다.
 */

/** 상품 등급. S가 가장 희귀, 아래로 갈수록 흔하다(꽝 없음). */
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

/** 희귀도 내림차순 */
export const GRADE_ORDER: Grade[] = ['S', 'A', 'B', 'C', 'D'];

/**
 * 라인 식별자.
 * R0~R2: 가로(위→아래), C0~C2: 세로(좌→우), D0: 좌상-우하 대각, D1: 우상-좌하 대각.
 */
export type LineKey = 'R0' | 'R1' | 'R2' | 'C0' | 'C1' | 'C2' | 'D0' | 'D1';

/** 각 라인이 덮는 셀 인덱스(0~8, row-major). */
export const LINES: Record<LineKey, [number, number, number]> = {
  R0: [0, 1, 2],
  R1: [3, 4, 5],
  R2: [6, 7, 8],
  C0: [0, 3, 6],
  C1: [1, 4, 7],
  C2: [2, 5, 8],
  D0: [0, 4, 8],
  D1: [2, 4, 6],
};

export const LINE_KEYS = Object.keys(LINES) as LineKey[];

/** 3숫자 합계의 이론적 범위: 1+2+3 ~ 7+8+9 */
export const MIN_SUM = 6;
export const MAX_SUM = 24;

/** 보드 한 칸 */
export interface Cell {
  /** 1~9 (각 값은 보드에 1회만 등장) */
  value: number;
  /** 공개 여부 */
  revealed: boolean;
}

/** 3×3 보드 (길이 9, row-major) */
export type Board = Cell[];

/** 복권에 속한 상품 1종 */
export interface Prize {
  /** 복권 내 고유 식별자 */
  id: string;
  /** 상품 이름 (예: "A상 · 한정 피규어") */
  name: string;
  /** 등급 (표시 테마 결정) */
  grade: Grade;
  /** 초기 재고 수량 */
  initialStock: number;
  /** 상품 이미지 URL (없으면 플레이스홀더) */
  imageUrl?: string;
}

/**
 * 합계 → 상품 매핑. 키는 6~24의 합계, 값은 해당 복권 prize id.
 * 모든 합계(6~24)에 대해 매핑이 존재해야 한다.
 */
export type RewardTable = Record<number, string>;

/** 복권 1종 (뒷면 디자인 · 상품 · 보상표를 자체 보유). */
export interface Ticket {
  /** 복권 고유 식별자 */
  id: string;
  /** 복권 이름 */
  name: string;
  /** 뒷면 카드 배경 그라데이션 (from → to) */
  backFrom: string;
  backTo: string;
  /** 뒷면 카드에 찍히는 이모지/문양 */
  emblem: string;
  /** 상품 목록 */
  prizes: Prize[];
  /** 합계(6~24) → prize id */
  rewardTable: RewardTable;
}

/** 확정된 당첨 결과 */
export interface DrawResult {
  ticketId: string;
  line: LineKey;
  /** 라인에 놓였던 세 숫자 */
  numbers: [number, number, number];
  sum: number;
  prizeId: string;
  prizeName: string;
  grade: Grade;
  imageUrl?: string;
}
