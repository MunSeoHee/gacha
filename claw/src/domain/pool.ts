/**
 * 쿠지 방식 추첨 풀.
 *
 * 게임 시작 시 각 상품의 재고만큼 티켓을 만들어 셔플한다.
 * 뽑기는 셔플된 풀의 앞에서부터 비복원으로 꺼낸다 (재고가 곧 분포).
 */

import type { PrizeConfig, PrizeResult } from './types';

/** 셔플된 상품 티켓 풀 */
export type PrizePool = PrizeResult[];

/**
 * Fisher-Yates 셔플. 원본을 변형하지 않고 새 배열을 반환한다.
 */
function shuffle<T>(items: readonly T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 상품 설정으로부터 셔플된 티켓 풀을 생성한다.
 * initialStock 개수만큼 티켓을 복제해 넣는다.
 */
export function buildPool(prizes: readonly PrizeConfig[]): PrizePool {
  const tickets: PrizePool = [];
  for (const prize of prizes) {
    for (let i = 0; i < prize.initialStock; i++) {
      tickets.push({
        prizeId: prize.id,
        prizeName: prize.name,
        grade: prize.grade,
        imageUrl: prize.imageUrl,
      });
    }
  }
  return shuffle(tickets);
}

/**
 * 풀에서 count개를 비복원으로 뽑는다.
 * 남은 수량이 부족하면 남은 만큼만 반환한다.
 *
 * @returns 뽑힌 결과와 갱신된 풀
 */
export function drawFromPool(
  pool: PrizePool,
  count: number
): { results: PrizeResult[]; rest: PrizePool } {
  const n = Math.min(count, pool.length);
  return {
    results: pool.slice(0, n),
    rest: pool.slice(n),
  };
}
