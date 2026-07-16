/**
 * 기계 안에 쌓인 익명 오브젝트(캡슐/인형/상자) 더미 생성.
 *
 * 오브젝트는 상품과 무관한 껍데기다 — 어떤 오브젝트가 어떤 상품인지 알 수 없다.
 * 잡을 때 뽑기 결과가 오브젝트에 매핑된다.
 */

import { OBJECT_IMAGES } from '../config/objects';

export type ObjectKind = 'capsule' | 'doll' | 'box';

export interface PileObject {
  id: string;
  kind: ObjectKind;
  /** CSS 색상 (이미지 에셋이 없을 때의 폴백 도형 색) */
  color: string;
  /** 오브젝트 이미지 URL. 있으면 도형 대신 이미지로 렌더 */
  imageUrl?: string;
  /** 탱크 폭 기준 가로 위치(%) — 중심 좌표 */
  x: number;
  /** 탱크 바닥 기준 세로 위치(%) */
  y: number;
  /** 회전(deg) */
  rotation: number;
  /** 크기(px) */
  size: number;
}

const KINDS: ObjectKind[] = ['capsule', 'doll', 'box'];

const PALETTE = [
  '#ff8fa3', '#ffd166', '#8ecae6', '#a0e8af', '#cdb4db',
  '#ffb4a2', '#bde0fe', '#ffc8dd', '#b8f2e6', '#ffd6a5',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jitter(range: number): number {
  return (Math.random() - 0.5) * 2 * range;
}

/**
 * 바닥에 쌓인 더미(heap) 형태로 오브젝트를 배치한다.
 * 아래 행은 넓게, 위 행은 좁게 쌓아 피라미드형 더미를 만든다.
 * 서로 겹치도록 배치해 꽉 찬 인형뽑기 느낌을 낸다.
 *
 * @param count 총 오브젝트 수 (행 구성상 근사치로 배치)
 */
export function generatePile(count: number): PileObject[] {
  const objects: PileObject[] = [];
  const size = 62;

  // 아래에서 위로 갈수록 좁아지는 행 구성. 합이 count에 가깝도록.
  const rows = [12, 11, 9, 7, 5, 3, 2];
  let placed = 0;

  for (let row = 0; row < rows.length && placed < count; row++) {
    const perRow = Math.min(rows[row], count - placed);
    const spread = 88 - row * 9; // 이 행의 가로 폭(%)
    const rowY = 5 + row * 6.5; // 바닥 기준 세로(%)
    const left = 50 - spread / 2;
    const gap = perRow > 1 ? spread / (perRow - 1) : 0;

    for (let i = 0; i < perRow; i++) {
      const baseX = perRow > 1 ? left + gap * i : 50;
      objects.push({
        id: `obj-${placed}`,
        kind: pick(KINDS),
        color: pick(PALETTE),
        imageUrl: OBJECT_IMAGES.length > 0 ? pick(OBJECT_IMAGES) : undefined,
        x: baseX + jitter(gap * 0.3),
        y: rowY + jitter(3),
        rotation: jitter(22),
        size: size + jitter(6),
      });
      placed++;
    }
  }

  return objects;
}
