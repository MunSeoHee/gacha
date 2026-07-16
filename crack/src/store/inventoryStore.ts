import { create } from 'zustand';
import type { Grade, InventoryState, PrizeConfig } from '../domain/types';
import {
  initInventoryState,
  deductStock,
  getAvailableGrades,
  getTotalStock,
} from '../domain/inventory';

/**
 * 재고 관리 스토어 상태 인터페이스
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.6
 */
interface InventoryStoreState {
  /** 현재 재고 상태 스냅샷 */
  state: InventoryState | null;
}

/**
 * 재고 관리 스토어 액션 인터페이스
 */
interface InventoryStoreActions {
  /**
   * PrizeConfig 배열로부터 초기 재고를 설정한다.
   */
  initInventory(prizes: PrizeConfig[]): void;

  /**
   * 특정 상품의 재고를 1 차감한다.
   * 성공 시 true, 실패(재고 부족 등)시 false를 반환한다.
   */
  deductStock(prizeId: string): boolean;

  /**
   * 현재 재고가 있는 등급 목록을 반환한다.
   */
  getAvailableGrades(): Grade[];

  /**
   * 현재 남은 전체 재고 합계를 반환한다.
   */
  getTotalStock(): number;
}

type InventoryStore = InventoryStoreState & InventoryStoreActions;

/**
 * Zustand 기반 재고 관리 스토어
 *
 * - initInventory: 초기 재고 설정
 * - deductStock: 재고 차감 (성공/실패 boolean 반환)
 * - getAvailableGrades: 재고 있는 등급 목록
 * - getTotalStock: 전체 재고 합계
 */
export const useInventoryStore = create<InventoryStore>((set, get) => ({
  state: null,

  initInventory(prizes: PrizeConfig[]) {
    const newState = initInventoryState(prizes);
    set({ state: newState });
  },

  deductStock(prizeId: string): boolean {
    const { state } = get();
    if (!state) return false;

    const result = deductStock(state, prizeId);
    if (result.ok) {
      set({ state: result.value });
      return true;
    }
    return false;
  },

  getAvailableGrades(): Grade[] {
    const { state } = get();
    if (!state) return [];
    return getAvailableGrades(state);
  },

  getTotalStock(): number {
    const { state } = get();
    if (!state) return 0;
    return getTotalStock(state);
  },
}));
