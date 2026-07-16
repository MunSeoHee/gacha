import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateBoard, lineSum, prizeIdForSum, type StockMap } from '../domain/board';
import { LINES, type Board, type DrawResult, type LineKey } from '../domain/types';
import { TICKET_BY_ID, TICKETS } from '../config/tickets';

export type Phase = 'select' | 'reveal' | 'pickLine' | 'result';

/** 최대 추가 공개 칸 수 (처음 1칸 자동 공개 + 최대 3칸) */
export const MAX_EXTRA_REVEALS = 3;

/** 모든 복권의 상품 초기 재고를 합쳐 초기 재고 맵 생성 */
function initialStock(): StockMap {
  const stock: StockMap = {};
  for (const ticket of TICKETS) {
    for (const prize of ticket.prizes) {
      stock[`${ticket.id}:${prize.id}`] = prize.initialStock;
    }
  }
  return stock;
}

/** ticketId 로 스코프된 재고 맵을 뽑아낸다 (board 유틸은 prize id 단위로 동작). */
function scopedStock(stock: StockMap, ticketId: string): StockMap {
  const out: StockMap = {};
  const prefix = `${ticketId}:`;
  for (const [key, qty] of Object.entries(stock)) {
    if (key.startsWith(prefix)) out[key.slice(prefix.length)] = qty;
  }
  return out;
}

interface GameState {
  phase: Phase;
  /** prize 전역 재고. key = `${ticketId}:${prizeId}` (localStorage 영속) */
  stock: StockMap;
  ticketId: string | null;
  board: Board | null;
  /** 플레이어가 추가로 연 칸 수 (0~MAX_EXTRA_REVEALS) */
  extraReveals: number;
  selectedLine: LineKey | null;
  result: DrawResult | null;
  /** 복권 매진 등으로 진행 불가할 때의 안내 */
  error: string | null;

  selectTicket: (ticketId: string) => void;
  revealCell: (index: number) => void;
  proceedToPickLine: () => void;
  selectLine: (line: LineKey) => void;
  confirmLine: () => void;
  restart: () => void;
  resetStock: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      phase: 'select',
      stock: initialStock(),
      ticketId: null,
      board: null,
      extraReveals: 0,
      selectedLine: null,
      result: null,
      error: null,

      selectTicket: (ticketId) => {
        const ticket = TICKET_BY_ID[ticketId];
        if (!ticket) return;
        const board = generateBoard(ticket, scopedStock(get().stock, ticketId));
        if (!board) {
          set({ error: '이 복권은 재고가 소진되어 더 이상 뽑을 수 없어요.' });
          return;
        }
        set({
          phase: 'reveal',
          ticketId,
          board,
          extraReveals: 0,
          selectedLine: null,
          result: null,
          error: null,
        });
      },

      revealCell: (index) => {
        const { phase, board, extraReveals } = get();
        if (phase !== 'reveal' || !board) return;
        if (board[index].revealed || extraReveals >= MAX_EXTRA_REVEALS) return;

        const next = board.map((cell, i) =>
          i === index ? { ...cell, revealed: true } : cell
        );
        const revealed = extraReveals + 1;
        set({
          board: next,
          extraReveals: revealed,
          // 3칸을 다 열면 자동으로 라인 선택 단계로
          phase: revealed >= MAX_EXTRA_REVEALS ? 'pickLine' : 'reveal',
        });
      },

      proceedToPickLine: () => {
        if (get().phase === 'reveal') set({ phase: 'pickLine' });
      },

      selectLine: (line) => {
        if (get().phase === 'pickLine') set({ selectedLine: line });
      },

      confirmLine: () => {
        const { phase, board, ticketId, selectedLine, stock } = get();
        if (phase !== 'pickLine' || !board || !ticketId || !selectedLine) return;
        const ticket = TICKET_BY_ID[ticketId];
        if (!ticket) return;

        const values = board.map((c) => c.value);
        const sum = lineSum(values, selectedLine);
        const prizeId = prizeIdForSum(ticket.rewardTable, sum);
        const prize = ticket.prizes.find((p) => p.id === prizeId);
        // 보드 생성 시 모든 라인이 재고 있는 상품으로 보장되므로 정상 흐름에서는 항상 존재.
        if (!prize) return;

        const [i0, i1, i2] = LINES[selectedLine];
        // 결과 확정 시 가려졌던 칸을 전부 공개
        const revealedBoard = board.map((cell) => ({ ...cell, revealed: true }));
        const stockKey = `${ticketId}:${prize.id}`;
        const result: DrawResult = {
          ticketId,
          line: selectedLine,
          numbers: [values[i0], values[i1], values[i2]],
          sum,
          prizeId: prize.id,
          prizeName: prize.name,
          grade: prize.grade,
          imageUrl: prize.imageUrl,
        };

        set({
          phase: 'result',
          board: revealedBoard,
          result,
          stock: { ...stock, [stockKey]: Math.max(0, (stock[stockKey] ?? 0) - 1) },
        });
      },

      restart: () =>
        set({
          phase: 'select',
          ticketId: null,
          board: null,
          extraReveals: 0,
          selectedLine: null,
          result: null,
          error: null,
        }),

      resetStock: () => set({ stock: initialStock() }),
    }),
    {
      name: 'lotto-gacha',
      // 재고만 영속화 (진행 중 게임 상태는 저장하지 않음)
      partialize: (state) => ({ stock: state.stock }),
      merge: (persisted, current) => {
        const base = { ...current };
        const saved = (persisted as { stock?: StockMap } | undefined)?.stock;
        // 기본 재고에 저장된 값을 덮어써 신규 복권/상품도 기본값을 갖도록 병합
        if (saved) base.stock = { ...current.stock, ...saved };
        return base;
      },
    }
  )
);
