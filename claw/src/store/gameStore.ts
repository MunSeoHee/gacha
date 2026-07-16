import { create } from 'zustand';
import type { Grade, PrizeConfig, PrizeResult, Tool } from '../domain/types';
import { TOOL_BY_COUNT, gradeAtLeast, highestGrade } from '../domain/types';
import { buildPool, drawFromPool, reshufflePool, type PrizePool } from '../domain/pool';
import { generatePile, type PileObject } from '../game/objects';
import { DROP_MS, GRAB_MS, FLASH_MS } from '../game/geometry';

/**
 * 게임 진행 단계.
 * idle → aiming → dropping → (flashing: C↑일 때만) → grabbing → revealing → idle
 */
export type Phase =
  | 'idle'
  | 'aiming'
  | 'dropping'
  | 'flashing'
  | 'grabbing'
  | 'revealing';

/** 이 등급 이상이면 집기 전 번쩍임 이펙트를 준다 */
const FLASH_THRESHOLD: Grade = 'C';

/** 조준 단계 제한 시간(초). 이 시간 안에 안 내리면 자동 하강. */
export const AIM_SECONDS = 10;

/** 기계 안 초기 오브젝트 수 */
const PILE_SIZE = 60;

/** 뽑혀 트레이에 나열되는 항목 */
export interface ScoopedItem {
  id: string;
  /** 뽑힌 오브젝트(껍데기) 모양 */
  object: PileObject;
  /** 확정된 상품 */
  result: PrizeResult;
  /** 개봉(공개) 여부 */
  revealed: boolean;
}

interface GameState {
  phase: Phase;
  pool: PrizePool;
  objects: PileObject[];
  /** 이번 라운드 뽑기 횟수 (0 = 미선택) */
  drawCount: number;
  tool: Tool | null;
  /** 집게 가로 위치 (탱크 폭 기준 %, 0~100) */
  clawX: number;
  /** 남은 조준 시간(초) */
  timer: number;
  scooped: ScoopedItem[];
  /** 남은 총 재고 */
  remainingStock: number;

  /** 초기 상품 설정 (리필 시 재사용) */
  prizes: readonly PrizeConfig[];

  // actions
  init: (prizes: readonly PrizeConfig[]) => void;
  /** 상품 풀과 기계 내부 오브젝트를 초기 상태로 다시 채운다 (최초 로드용) */
  resetGame: () => void;
  /** 섞기: 남은 풀을 다시 섞고 기계 안 오브젝트를 새로 배치한다 (재고는 유지) */
  shufflePile: () => void;
  selectDraw: (count: number) => void;
  nudgeClaw: (delta: number) => void;
  tick: () => void;
  drop: () => void;
  /** 하강 완료: 결과 확정 + (C↑면) 번쩍임 후 집기 시작 */
  afterDescend: () => void;
  /** 실제 집기 시작(오브젝트를 더미에서 떼어 집게로) */
  commitGrab: () => void;
  finishGrab: () => void;
  revealItem: (id: string) => void;
  revealAll: () => void;
  nextRound: () => void;
}

const CLAW_MIN = 8;
const CLAW_MAX = 92;
const clamp = (v: number) => Math.min(CLAW_MAX, Math.max(CLAW_MIN, v));

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'idle',
  pool: [],
  objects: [],
  drawCount: 0,
  tool: null,
  clawX: 50,
  timer: AIM_SECONDS,
  scooped: [],
  remainingStock: 0,
  prizes: [],

  init: (prizes) => {
    set({ prizes });
    get().resetGame();
  },

  resetGame: () => {
    const pool = buildPool(get().prizes);
    set({
      pool,
      objects: generatePile(PILE_SIZE),
      remainingStock: pool.length,
      phase: 'idle',
      drawCount: 0,
      tool: null,
      clawX: 50,
      timer: AIM_SECONDS,
      scooped: [],
    });
  },

  shufflePile: () => {
    if (get().phase !== 'idle') return;
    set({
      pool: reshufflePool(get().pool),
      objects: generatePile(PILE_SIZE),
    });
  },

  selectDraw: (count) => {
    if (get().phase !== 'idle') return;
    set({
      drawCount: count,
      tool: TOOL_BY_COUNT[count] ?? 'claw',
      phase: 'aiming',
      clawX: 50,
      timer: AIM_SECONDS,
    });
  },

  nudgeClaw: (delta) => {
    if (get().phase !== 'aiming') return;
    set((s) => ({ clawX: clamp(s.clawX + delta) }));
  },

  tick: () => {
    if (get().phase !== 'aiming') return;
    const next = get().timer - 1;
    if (next <= 0) {
      set({ timer: 0 });
      get().drop();
    } else {
      set({ timer: next });
    }
  },

  drop: () => {
    if (get().phase !== 'aiming') return;
    set({ phase: 'dropping' });
    // 애니메이션 완료 콜백에만 의존하면 탭 비활성 시 rAF가 멈춰 멈춰버리므로
    // 타이머로 단계를 확정 진행한다. (Claw의 시각 애니메이션과 시간을 맞춤)
    window.setTimeout(() => get().afterDescend(), DROP_MS);
  },

  /** 하강 완료 후: 결과 확정 + 잡을 오브젝트 선정. C↑면 번쩍임 후 집기. */
  afterDescend: () => {
    const { phase, pool, drawCount, objects, clawX } = get();
    if (phase !== 'dropping') return;

    const { results, rest } = drawFromPool(pool, drawCount);

    // 집게 위치에서 가까운 순으로, 뽑은 개수만큼 오브젝트를 선정한다.
    const nearest = [...objects]
      .sort((a, b) => Math.abs(a.x - clawX) - Math.abs(b.x - clawX))
      .slice(0, results.length);

    const scooped: ScoopedItem[] = results.map((result, i) => ({
      id: `scoop-${Date.now()}-${i}`,
      // 더미가 뽑기 개수보다 적게 남은 경우 임시 오브젝트로 채워 안전하게 처리
      object: nearest[i] ?? generatePile(1)[0],
      result,
      revealed: false,
    }));

    // 아직 더미에서 떼지 않고(scooped만 확정) 재고만 반영한다.
    set({ pool: rest, remainingStock: rest.length, scooped });

    // 결과 중 C 이상이 있으면 집기 전 그 등급 색으로 번쩍임.
    const top = highestGrade(results.map((r) => r.grade));
    if (top && gradeAtLeast(top, FLASH_THRESHOLD)) {
      set({ phase: 'flashing' });
      window.setTimeout(() => get().commitGrab(), FLASH_MS);
    } else {
      get().commitGrab();
    }
  },

  /** 실제 집기 시작: 선정된 오브젝트를 더미에서 떼어 집게로 이동 */
  commitGrab: () => {
    const { phase, objects, scooped } = get();
    if (phase !== 'dropping' && phase !== 'flashing') return;

    const grabbedIds = new Set(scooped.map((s) => s.object.id));
    set({
      phase: 'grabbing',
      objects: objects.filter((o) => !grabbedIds.has(o.id)),
    });
    window.setTimeout(() => get().finishGrab(), GRAB_MS);
  },

  /** 집게 상승 완료 후 결과 공개 */
  finishGrab: () => {
    if (get().phase !== 'grabbing') return;
    set({ phase: 'revealing' });
  },

  revealItem: (id) =>
    set((s) => ({
      scooped: s.scooped.map((it) =>
        it.id === id ? { ...it, revealed: true } : it
      ),
    })),

  revealAll: () =>
    set((s) => ({
      scooped: s.scooped.map((it) => ({ ...it, revealed: true })),
    })),

  nextRound: () =>
    set({
      phase: 'idle',
      drawCount: 0,
      tool: null,
      clawX: 50,
      timer: AIM_SECONDS,
      scooped: [],
      // 매 라운드 기계 안 오브젝트를 새로 채운다 (이전 판 잔여를 유지하지 않음)
      objects: generatePile(PILE_SIZE),
    }),
}));
