/**
 * 가챠 경품 추첨 게임 핵심 타입 정의
 *
 * 요구사항: 1.1, 2.1, 3.1
 */

// ---------------------------------------------------------------------------
// Grade (등급)
// ---------------------------------------------------------------------------

/**
 * 등급 타입. 순서가 중요하며 비교 연산에 사용된다.
 * Normal → Rare → Epic → Primeval 순으로 높아진다.
 */
export type Grade = 'Normal' | 'Rare' | 'Epic' | 'Primeval';

/**
 * 등급 순서 배열. 인덱스가 낮을수록 낮은 등급이다.
 */
export const GRADE_ORDER: Grade[] = ['Normal', 'Rare', 'Epic', 'Primeval'];

/**
 * 등급의 정렬 인덱스를 반환한다. (Normal=0, Rare=1, Epic=2, Primeval=3)
 */
export function gradeIndex(g: Grade): number {
  return GRADE_ORDER.indexOf(g);
}

/**
 * a 등급이 b 등급보다 높은지 여부를 반환한다.
 */
export function isHigherGrade(a: Grade, b: Grade): boolean {
  return gradeIndex(a) > gradeIndex(b);
}

// ---------------------------------------------------------------------------
// DrawSession
// ---------------------------------------------------------------------------

/**
 * DrawSession의 진행 상태
 * - WAITING_CLICK: 클릭 대기 중
 * - UPGRADE_IN_PROGRESS: 업그레이드 이벤트 연출 중
 * - BURST_IN_PROGRESS: 버스트 이벤트 연출 중
 * - COMPLETED: 세션 완료
 */
export type DrawSessionStatus =
  | 'WAITING_CLICK'
  | 'UPGRADE_IN_PROGRESS'
  | 'BURST_IN_PROGRESS'
  | 'COMPLETED';

/**
 * 한 참가자의 단일(또는 멀티) 뽑기 시도의 런타임 상태.
 * DrawSession 시작부터 BurstEvent 발생까지를 하나의 단위로 정의한다.
 */
export interface DrawSession {
  /** 세션 고유 식별자 */
  id: string;
  /** 세션 시작 시 확률표에 따라 확정된 최종 등급 (BurstEvent 전까지 노출 불가) */
  destinedGrade: Grade;
  /** 현재 Orb에 표시되는 등급 */
  currentGrade: Grade;
  /** 현재 ClickThreshold 구간의 누적 클릭 수 */
  clickCount: number;
  /** RevealEvent 발생까지 필요한 클릭 수 */
  clickThreshold: number;
  /** 연속 뽑기(멀티 드로우) 여부 */
  isMultiDraw: boolean;
  /** 멀티 드로우 시 전체 뽑기 횟수 (단일 드로우의 경우 1) */
  drawCount: number;
  /** 멀티 드로우 시 DrawCount개의 확정된 등급 목록 */
  destinedGrades: Grade[];
  /** 멀티 드로우 시 destinedGrades 중 가장 높은 등급 */
  maxGrade: Grade;
  /** 세션의 현재 진행 상태 */
  status: DrawSessionStatus;
}

// ---------------------------------------------------------------------------
// PrizeResult / PrizeRecord
// ---------------------------------------------------------------------------

/**
 * 한 회차 뽑기의 최종 확정 보상 정보
 */
export interface PrizeResult {
  /** 상품 고유 식별자 */
  prizeId: string;
  /** 상품 이름 */
  prizeName: string;
  /** 확정된 등급 */
  grade: Grade;
  /** 상품 이미지 URL */
  imageUrl: string;
}

/**
 * ResultScreen 하단 이력 목록의 단일 기록
 */
export interface PrizeRecord {
  /** 확정된 보상 정보 */
  prizeResult: PrizeResult;
  /** 지급 시각 */
  issuedAt: Date;
  /** 당일 지급 순서 (단조 증가, 중복 없음) */
  sequenceNumber: number;
}

// ---------------------------------------------------------------------------
// InventoryState / InventoryOperations / InventoryError
// ---------------------------------------------------------------------------

/**
 * 재고 상태 스냅샷
 */
export interface InventoryState {
  /** prizeId → 잔여 수량 맵 */
  stocks: Record<string, number>;
  /** 재고가 모두 소진된 등급 집합 */
  exhaustedGrades: Set<Grade>;
  /** prizeId → 등급 매핑 (deductStock 내부에서 등급 소진 여부 계산에 사용) */
  gradeMap: Record<string, Grade>;
}

/**
 * Result 타입: 에러를 타입으로 표현하는 Either 패턴
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * 재고 차감 관련 에러 유형
 */
export type InventoryError =
  | { type: 'STOCK_ALREADY_ZERO'; prizeId: string }
  | { type: 'PRIZE_NOT_FOUND'; prizeId: string };

/**
 * InventoryTracker 순수 함수 인터페이스.
 * 구현은 domain/inventory.ts에서 제공한다.
 */
export interface InventoryOperations {
  /**
   * 특정 상품의 재고를 1 차감한다.
   * 재고가 0이거나 상품이 없으면 에러 Result를 반환한다.
   */
  deductStock(state: InventoryState, prizeId: string): Result<InventoryState, InventoryError>;

  /**
   * 특정 등급의 재고가 모두 소진되었는지 확인한다.
   */
  isGradeExhausted(state: InventoryState, grade: Grade): boolean;

  /**
   * 재고가 1 이상 남아 있는 등급 목록을 반환한다.
   */
  getAvailableGrades(state: InventoryState): Grade[];

  /**
   * 전체 잔여 재고 수량 합계를 반환한다.
   */
  getTotalStock(state: InventoryState): number;

  /**
   * 목표 등급의 재고가 없을 때 폴백 등급을 결정한다.
   * 재고가 있는 가장 가까운 상위 등급을 우선하고,
   * 상위가 모두 소진되면 가장 가까운 하위 등급을 반환한다.
   * 전체 소진 시 null을 반환한다.
   */
  resolveFallbackGrade(state: InventoryState, targetGrade: Grade): Grade | null;
}

// ---------------------------------------------------------------------------
// 설정값 타입 (정적 주입)
// ---------------------------------------------------------------------------

/**
 * 상품 설정 (정적 주입)
 */
export interface PrizeConfig {
  /** 상품 고유 식별자 */
  id: string;
  /** 상품 이름 */
  name: string;
  /** 상품 등급 */
  grade: Grade;
  /** 상품 이미지 URL */
  imageUrl: string;
  /** 초기 재고 수량 */
  initialStock: number;
}

/**
 * 등급별 뽑기 확률표 (정적 주입).
 * 모든 등급의 확률 합은 반드시 1.0이어야 한다 (±0.001 오차 허용).
 */
export interface ProbabilityTable {
  Normal: number;   // 예: 0.60
  Rare: number;     // 예: 0.30
  Epic: number;     // 예: 0.08
  Primeval: number; // 예: 0.02
}

/**
 * 세션 설정값 (정적 주입)
 */
export interface SessionConfig {
  /** RevealEvent 발생까지 필요한 클릭 수 (5 이상 20 이하 정수) */
  clickThreshold: number;
  /** 연속 뽑기 선택 옵션 목록. 예: [1, 5, 10] */
  drawCountOptions: number[];
  /** 결과 화면 자동 전환까지 대기 시간(초). 기본 30 */
  autoCloseSeconds: number;
  /** 사운드 재생 활성화 여부 */
  soundEnabled: boolean;
}

/**
 * 등급별 이펙트 설정
 */
export interface GradeEffectConfig {
  /** 적용 대상 등급 */
  grade: Grade;
  /** Orb 기본 색상 (CSS color) */
  orbColor: string;
  /** Orb 발광 색상 (CSS color) */
  orbGlowColor: string;
  /** 파티클 색상 (CSS color) */
  particleColor: string;
  /** 파티클 수량 */
  particleCount: number;
  /** BurstEvent 연출 지속 시간(ms). Primeval은 다른 등급 최대값의 2배 이상 */
  burstDuration: number;
  /** BurstEvent 사운드 키 */
  burstSoundKey: string;
  /** UpgradeEvent 사운드 키 */
  upgradeSoundKey: string;
}
