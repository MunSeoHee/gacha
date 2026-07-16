import type { Grade, Prize, RewardTable, Ticket } from '../domain/types';

/**
 * 합계(6~24) → 등급 밴드.
 * 중앙값 15에서 멀어질수록 희귀. 15는 가장 흔한 D(마방진으로 항상 만들 수 있어
 * 재고가 D만 남아도 보드 생성이 보장된다).
 *
 *  거리 |sum-15|:  9 → S,  7~8 → A,  5~6 → B,  3~4 → C,  0~2 → D
 */
function gradeForSum(sum: number): Grade {
  const d = Math.abs(sum - 15);
  if (d === 9) return 'S';
  if (d >= 7) return 'A';
  if (d >= 5) return 'B';
  if (d >= 3) return 'C';
  return 'D';
}

/** 등급→prizeId 매핑으로 전체 보상표(6~24)를 생성 */
function bandRewardTable(prizeIdByGrade: Record<Grade, string>): RewardTable {
  const table: RewardTable = {};
  for (let sum = 6; sum <= 24; sum++) {
    table[sum] = prizeIdByGrade[gradeForSum(sum)];
  }
  return table;
}

/** 등급별 상품 1종씩(S~D)을 받아 prizes + rewardTable을 구성 */
function buildPrizeSet(
  defs: Record<Grade, { name: string; initialStock: number; imageUrl?: string }>
): { prizes: Prize[]; rewardTable: RewardTable } {
  const grades: Grade[] = ['S', 'A', 'B', 'C', 'D'];
  const prizes: Prize[] = grades.map((grade) => ({
    id: grade,
    grade,
    name: defs[grade].name,
    initialStock: defs[grade].initialStock,
    imageUrl: defs[grade].imageUrl,
  }));
  const rewardTable = bandRewardTable({ S: 'S', A: 'A', B: 'B', C: 'C', D: 'D' });
  return { prizes, rewardTable };
}

/**
 * 선택 화면에 원통(ring)으로 늘어놓을 카드 장수.
 * 카드는 전부 동일한 뒷면이며, 아무 장이나 고르면 같은 추첨이 시작된다
 * (어떤 카드를 고르는지는 "느낌"일 뿐 결과에 영향 없음).
 */
export const CARD_COUNT = 16;

/**
 * 단일 복권 설정. 모든 카드가 이 하나의 상품 구성·재고를 공유한다.
 * 상품 이미지는 public/images/prizes/<grade>.png 에 넣으면 표시되고,
 * 없으면 등급 색상 플레이스홀더로 렌더된다.
 */
export const TICKET: Ticket = {
  id: 'lotto',
  name: '복권',
  // 뒷면은 CSS 홀로그램 디자인을 쓰므로 아래 색/이모지는 참고값
  backFrom: '#6a3df0',
  backTo: '#f050b0',
  emblem: '🎟️',
  ...buildPrizeSet({
    S: { name: 'S상 · 순금 골드바 10g', initialStock: 1 },
    A: { name: 'A상 · 백화점 상품권 10만원', initialStock: 3 },
    B: { name: 'B상 · 스타벅스 기프티콘', initialStock: 10 },
    C: { name: 'C상 · 편의점 3천원권', initialStock: 30 },
    D: { name: 'D상 · 기념 스티커', initialStock: 200 },
  }),
};

export const TICKETS: Ticket[] = [TICKET];

export const TICKET_BY_ID: Record<string, Ticket> = Object.fromEntries(
  TICKETS.map((t) => [t.id, t])
);
