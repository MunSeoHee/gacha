import { create } from 'zustand';
import type { PrizeRecord, PrizeResult } from '../domain/types';

/**
 * 이력 기록 스토어 상태 인터페이스
 *
 * Validates: Requirements 4.4, 4.5
 */
interface HistoryStoreState {
  /** 당일 발행된 모든 PrizeRecord 목록 (시간순 정렬) */
  records: PrizeRecord[];
  /** 다음 sequenceNumber (1부터 시작) */
  nextSequenceNumber: number;
}

/**
 * 이력 기록 스토어 액션 인터페이스
 */
interface HistoryStoreActions {
  /**
   * 새로운 PrizeRecord를 이력에 추가한다.
   * sequenceNumber는 자동 증가하고, issuedAt은 현재 시각으로 기록된다.
   * 최대 50건 유지.
   */
  addPrizeRecord(result: PrizeResult): void;

  /**
   * 당일 00:00 이후 기록만 조회한다.
   * 시간 역순(최신순)으로 정렬되며 최대 50건을 반환한다.
   */
  getTodayRecords(): PrizeRecord[];

  /**
   * 이력을 초기화한다.
   */
  clearHistory(): void;
}

type HistoryStore = HistoryStoreState & HistoryStoreActions;

/**
 * 오늘 자정(00:00)을 계산하는 헬퍼 함수
 */
function getTodayMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Zustand 기반 이력 기록 스토어
 *
 * - addPrizeRecord: 새 기록 추가 (sequenceNumber 자동 증가, issuedAt 기록)
 * - getTodayRecords: 당일 기록 조회 (시간 역순, 최대 50건)
 * - clearHistory: 이력 초기화
 */
export const useHistoryStore = create<HistoryStore>((set, get) => ({
  records: [],
  nextSequenceNumber: 1,

  addPrizeRecord(result: PrizeResult) {
    set(state => {
      const currentNumber = state.nextSequenceNumber;
      const newRecord: PrizeRecord = {
        prizeResult: result,
        issuedAt: new Date(),
        sequenceNumber: currentNumber,
      };

      const updated = [...state.records, newRecord];
      // 최대 50건 유지: 오래된 기록부터 제거
      if (updated.length > 50) {
        updated.shift();
      }

      return {
        records: updated,
        nextSequenceNumber: currentNumber + 1,
      };
    });
  },

  getTodayRecords(): PrizeRecord[] {
    const { records } = get();
    const todayMidnight = getTodayMidnight();

    // 당일 00:00 이후 기록만 필터링
    const todayRecords = records.filter(record => record.issuedAt >= todayMidnight);

    // 시간 역순(최신순)으로 정렬
    return [...todayRecords].sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  },

  clearHistory() {
    set({
      records: [],
      nextSequenceNumber: 1,
    });
  },
}));
