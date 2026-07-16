import {
  LINE_KEYS,
  LINES,
  MAX_SUM,
  MIN_SUM,
  type Board,
  type LineKey,
  type RewardTable,
  type Ticket,
} from './types';

/** 재고 맵: prize id → 남은 수량 */
export type StockMap = Record<string, number>;

/** Fisher-Yates 셔플 (원본 불변, 새 배열 반환) */
function shuffled<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 1~9 랜덤 순열 (row-major 9칸 값) */
function randomValues(): number[] {
  return shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
}

/** 특정 라인의 세 숫자 합계 */
export function lineSum(values: number[], line: LineKey): number {
  const [a, b, c] = LINES[line];
  return values[a] + values[b] + values[c];
}

/** 합계(6~24) → prize id. 표에 없으면 undefined. */
export function prizeIdForSum(table: RewardTable, sum: number): string | undefined {
  return table[sum];
}

/** 해당 합계의 상품이 아직 재고가 있는가 */
function sumInStock(table: RewardTable, stock: StockMap, sum: number): boolean {
  const id = table[sum];
  return id != null && (stock[id] ?? 0) > 0;
}

/** 8개 라인이 모두 재고 있는 상품으로 매핑되는 배치인가 */
function allLinesInStock(values: number[], table: RewardTable, stock: StockMap): boolean {
  return LINE_KEYS.every((line) => sumInStock(table, stock, lineSum(values, line)));
}

/**
 * 재고 상태를 반영한 보드 생성.
 * 8개 라인 전부 재고 있는 상품으로 매핑되는 숫자 배치를 reject-sampling으로 찾고,
 * 랜덤 1칸을 공개한 채로 반환한다. 재고가 바닥나 유효 배치를 못 찾으면 null.
 */
export function generateBoard(ticket: Ticket, stock: StockMap, maxTries = 4000): Board | null {
  let values: number[] | null = null;
  for (let i = 0; i < maxTries; i++) {
    const cand = randomValues();
    if (allLinesInStock(cand, ticket.rewardTable, stock)) {
      values = cand;
      break;
    }
  }
  if (!values) return null;

  const board: Board = values.map((value) => ({ value, revealed: false }));
  // 처음 1칸 랜덤 공개
  board[Math.floor(Math.random() * board.length)].revealed = true;
  return board;
}

/** 이 복권을 아직 플레이할 수 있는가(유효 보드가 존재하는가). 선택 화면 활성/비활성 판단용. */
export function canPlay(ticket: Ticket, stock: StockMap): boolean {
  return generateBoard(ticket, stock, 1500) !== null;
}

/** 전체 합계 범위(6~24)를 순회하는 헬퍼 (보상표 검증·렌더용) */
export function allSums(): number[] {
  const out: number[] = [];
  for (let s = MIN_SUM; s <= MAX_SUM; s++) out.push(s);
  return out;
}
