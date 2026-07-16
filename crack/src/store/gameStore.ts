import { create } from 'zustand';
import type { DrawSession, PrizeResult, ProbabilityTable, PrizeConfig, SessionConfig } from '../domain/types';
import {
  createDrawSession,
  createMultiDrawSession,
  registerClick,
  applyUpgradeEvent,
  applyBurstEvent,
} from '../domain/session';
import { resolveDestinedGrade } from '../domain/probability';
import { resolveMultiDrawGrades, resolveMaxGrade } from '../domain/multiDraw';

/**
 * 게임의 전체 진행 단계
 * - IDLE: 시작 전 또는 세션 종료 후
 * - WAITING_SELECTION: DrawCount 선택 대기 중
 * - PLAYING: Orb 클릭 중 (DrawSession 진행 중)
 * - RESULT_SHOWING: ResultScreen 표시 중
 * - SESSION_END: 전체 재고 소진으로 게임 종료
 */
export type GamePhase = 'IDLE' | 'WAITING_SELECTION' | 'PLAYING' | 'RESULT_SHOWING' | 'SESSION_END';

/**
 * 게임 스토어 상태 인터페이스
 *
 * Validates: Requirements 1.1, 1.5, 1.6, 1.8, 1.9, 5.2, 5.3, 5.4
 */
interface GameStoreState {
  /** 현재 게임 진행 단계 */
  phase: GamePhase;
  /** DrawCount 선택값 (startSession 전까지 임시) */
  selectedDrawCount: number;
  /** 현재 DrawSession (PLAYING 중) */
  session: DrawSession | null;
  /** 마지막 뽑기 결과 (RESULT_SHOWING 중에 사용) */
  lastResult: PrizeResult | null;
  /** 멀티 드로우 결과 목록 */
  multiDrawResults: PrizeResult[];
}

/**
 * 게임 스토어 액션 인터페이스
 */
interface GameStoreActions {
  /**
   * 게임을 초기화하고 WAITING_SELECTION 상태로 전환한다.
   * (DrawCount 선택 UI가 나타남)
   */
  startGame(): void;

  /**
   * DrawCount 선택값을 설정한다.
   */
  setDrawCount(count: number): void;

  /**
   * DrawCount에 따라 DrawSession을 시작한다.
   * - 단일 드로우(drawCount=1): createDrawSession
   * - 멀티 드로우(drawCount>1): createMultiDrawSession + 모든 destinedGrades 확정
   * PLAYING 상태로 전환한다.
   */
  startSession(
    probTable: ProbabilityTable,
    invState: any,
    prizes: PrizeConfig[],
    config: SessionConfig
  ): void;

  /**
   * Orb 클릭을 처리한다.
   * registerClick()을 호출하여 clickCount를 증가시키고,
   * 필요시 상태를 UPGRADE_IN_PROGRESS 또는 BURST_IN_PROGRESS로 전환한다.
   */
  handleOrbClick(): void;

  /**
   * UpgradeEvent 연출이 완료되었을 때 호출된다.
   * applyUpgradeEvent()를 적용하여 등급 승급 및 상태 전환한다.
   */
  applyUpgrade(): void;

  /**
   * BurstEvent 연출이 완료되었을 때 호출된다.
   * applyBurstEvent()를 적용하여 세션을 완료한다.
   * RESULT_SHOWING 상태로 전환한다.
   */
  applyBurst(result: PrizeResult | PrizeResult[]): void;

  /**
   * ResultScreen 표시가 끝나면 호출된다.
   * 다음 세션으로 진행하거나 게임을 종료한다.
   * - totalStock > 0: WAITING_SELECTION (다음 드로우)
   * - totalStock == 0: SESSION_END (재고 소진)
   */
  continueOrEnd(totalStock: number): void;

  /**
   * 게임을 리셋하여 IDLE 상태로 전환한다.
   */
  resetGame(): void;
}

type GameStore = GameStoreState & GameStoreActions;

/**
 * Zustand 기반 메인 게임 스토어
 *
 * GamePhase 상태 전환 및 DrawSession 관리를 담당한다.
 */
export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'IDLE',
  selectedDrawCount: 1,
  session: null,
  lastResult: null,
  multiDrawResults: [],

  startGame() {
    set({ phase: 'WAITING_SELECTION' });
  },

  setDrawCount(count: number) {
    set({ selectedDrawCount: count });
  },

  startSession(
    probTable: ProbabilityTable,
    invState: any,
    prizes: PrizeConfig[],
    _config: SessionConfig
  ) {
    const { selectedDrawCount } = get();

    let newSession: DrawSession;

    // 등급당 필요 클릭 수: 15~20 랜덤 (config.clickThreshold 대신)
    const threshold = Math.floor(Math.random() * (20 - 15 + 1)) + 15;

    if (selectedDrawCount === 1) {
      // 단일 드로우
      const destinedGrade = resolveDestinedGrade(probTable, Object.keys(invState.stocks || {}).length > 0 ? ['Normal', 'Rare', 'Epic', 'Primeval'] : ['Normal']);
      newSession = createDrawSession(destinedGrade, threshold);
    } else {
      // 멀티 드로우: 모든 등급을 한 번에 확정
      const destinedGrades = resolveMultiDrawGrades(
        selectedDrawCount,
        probTable,
        invState,
        prizes
      );
      const maxGrade = resolveMaxGrade(destinedGrades);
      newSession = createMultiDrawSession(destinedGrades, maxGrade, threshold);
    }

    set({
      session: newSession,
      phase: 'PLAYING',
      multiDrawResults: [],
    });
  },

  handleOrbClick() {
    set(state => {
      if (!state.session) return state;
      const updated = registerClick(state.session);
      return { session: updated };
    });
  },

  applyUpgrade() {
    set(state => {
      if (!state.session) return state;
      const updated = applyUpgradeEvent(state.session);
      // 등급이 오를 때마다 다음 등급의 필요 클릭 수를 15~20 랜덤으로 재설정
      const threshold = Math.floor(Math.random() * (20 - 15 + 1)) + 15;
      return { session: { ...updated, clickThreshold: threshold } };
    });
  },

  applyBurst(result: PrizeResult | PrizeResult[]) {
    set(state => {
      if (!state.session) return state;
      const updated = applyBurstEvent(state.session);

      if (Array.isArray(result)) {
        // 멀티 드로우
        return {
          session: updated,
          lastResult: result[0],
          multiDrawResults: result,
          phase: 'RESULT_SHOWING',
        };
      } else {
        // 단일 드로우
        return {
          session: updated,
          lastResult: result,
          multiDrawResults: [result],
          phase: 'RESULT_SHOWING',
        };
      }
    });
  },

  continueOrEnd(totalStock: number) {
    if (totalStock > 0) {
      set({ phase: 'WAITING_SELECTION' });
    } else {
      set({ phase: 'SESSION_END' });
    }
  },

  resetGame() {
    set({
      phase: 'IDLE',
      selectedDrawCount: 1,
      session: null,
      lastResult: null,
      multiDrawResults: [],
    });
  },
}));
