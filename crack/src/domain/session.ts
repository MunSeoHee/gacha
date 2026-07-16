/**
 * DrawSession 상태 전환 순수 함수
 *
 * 요구사항: 1.2, 1.5, 1.6, 1.7, 1.8, 1.10, 2.2
 */

import {
  type Grade,
  type DrawSession,
  type DrawSessionStatus,
  GRADE_ORDER,
} from './types';

// ---------------------------------------------------------------------------
// 내부 헬퍼
// ---------------------------------------------------------------------------

/**
 * DrawSession의 잠금 여부를 반환한다.
 * UPGRADE_IN_PROGRESS 또는 BURST_IN_PROGRESS 상태이면 잠금 상태다.
 *
 * 요구사항: 1.10
 */
export function isSessionLocked(session: DrawSession): boolean {
  return (
    session.status === 'UPGRADE_IN_PROGRESS' ||
    session.status === 'BURST_IN_PROGRESS'
  );
}

/**
 * 현재 등급보다 한 단계 높은 등급을 반환한다.
 * Primeval이 입력되면 Primeval 그대로 반환한다 (최고 등급이므로).
 */
function nextGrade(grade: Grade): Grade {
  const idx = GRADE_ORDER.indexOf(grade);
  if (idx < 0 || idx >= GRADE_ORDER.length - 1) {
    return grade;
  }
  return GRADE_ORDER[idx + 1];
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

/**
 * 초기 DrawSession을 생성한다.
 *
 * - currentGrade는 항상 Normal로 시작한다 (요구사항 1.1).
 * - status는 WAITING_CLICK으로 시작한다.
 * - 단일 드로우(isMultiDraw=false)로 초기화한다.
 * - destinedGrades는 [destinedGrade]로 초기화한다.
 * - maxGrade는 destinedGrade와 동일하게 초기화한다.
 *
 * 요구사항: 2.2 — destinedGrade는 세션 내내 변경되지 않는다.
 *
 * @param destinedGrade - 사전 확정된 최종 등급
 * @param clickThreshold - RevealEvent 발생까지 필요한 클릭 수 (5~20)
 * @param id - 세션 고유 식별자 (기본값: crypto.randomUUID())
 */
export function createDrawSession(
  destinedGrade: Grade,
  clickThreshold: number,
  id: string = crypto.randomUUID()
): DrawSession {
  return {
    id,
    destinedGrade,
    currentGrade: 'Normal',
    clickCount: 0,
    clickThreshold,
    isMultiDraw: false,
    drawCount: 1,
    destinedGrades: [destinedGrade],
    maxGrade: destinedGrade,
    status: 'WAITING_CLICK',
  };
}

/**
 * 멀티 드로우용 초기 DrawSession을 생성한다.
 *
 * @param destinedGrades - DrawCount개의 확정된 등급 배열
 * @param maxGrade - destinedGrades 중 최고 등급
 * @param clickThreshold - RevealEvent 발생까지 필요한 클릭 수
 * @param id - 세션 고유 식별자
 */
export function createMultiDrawSession(
  destinedGrades: Grade[],
  maxGrade: Grade,
  clickThreshold: number,
  id: string = crypto.randomUUID()
): DrawSession {
  return {
    id,
    destinedGrade: maxGrade,
    currentGrade: 'Normal',
    clickCount: 0,
    clickThreshold,
    isMultiDraw: true,
    drawCount: destinedGrades.length,
    destinedGrades,
    maxGrade,
    status: 'WAITING_CLICK',
  };
}

/**
 * 클릭을 등록한다.
 *
 * 동작:
 * 1. 세션이 잠금 상태(UPGRADE_IN_PROGRESS / BURST_IN_PROGRESS)이면 세션을 그대로 반환한다.
 * 2. clickCount를 1 증가시킨다.
 * 3. clickCount가 clickThreshold에 도달하면 RevealEvent를 결정한다.
 *    - currentGrade < destinedGrade → UpgradeEvent: status = UPGRADE_IN_PROGRESS
 *    - currentGrade == destinedGrade 또는 currentGrade == 'Primeval' → BurstEvent: status = BURST_IN_PROGRESS
 * 4. 임계값 미도달 시 clickCount만 증가시킨 세션을 반환한다.
 *
 * 요구사항: 1.2, 1.5, 1.6, 1.7, 1.10
 *
 * @param session - 현재 DrawSession (원본은 변경되지 않음)
 * @returns 새로운 DrawSession 상태
 */
export function registerClick(session: DrawSession): DrawSession {
  // 요구사항 1.10: 잠금 상태이면 입력 무시
  if (isSessionLocked(session)) {
    return session;
  }

  const newClickCount = session.clickCount + 1;

  // 임계값 미도달: clickCount만 증가
  if (newClickCount < session.clickThreshold) {
    return { ...session, clickCount: newClickCount };
  }

  // 임계값 도달: RevealEvent 결정
  // 요구사항 1.7: Primeval이면 항상 BurstEvent
  const isPrimeval = session.currentGrade === 'Primeval';
  const isAtDestinedGrade = session.currentGrade === session.destinedGrade;

  const revealStatus: DrawSessionStatus =
    isPrimeval || isAtDestinedGrade
      ? 'BURST_IN_PROGRESS'   // 요구사항 1.6, 1.7
      : 'UPGRADE_IN_PROGRESS'; // 요구사항 1.5

  return {
    ...session,
    clickCount: newClickCount,
    status: revealStatus,
  };
}

/**
 * UpgradeEvent를 적용한다.
 *
 * 동작:
 * - currentGrade를 다음 등급으로 승급한다.
 * - clickCount를 0으로 초기화한다.
 * - status를 WAITING_CLICK으로 전환한다.
 *
 * 요구사항: 1.8
 *
 * @param session - UPGRADE_IN_PROGRESS 상태의 DrawSession
 * @returns 업그레이드가 적용된 새로운 DrawSession
 */
export function applyUpgradeEvent(session: DrawSession): DrawSession {
  return {
    ...session,
    currentGrade: nextGrade(session.currentGrade),
    clickCount: 0,
    status: 'WAITING_CLICK',
  };
}

/**
 * BurstEvent를 적용한다.
 *
 * 동작:
 * - status를 COMPLETED로 전환한다.
 *
 * 요구사항: 1.9 (ResultScreen 전환은 상위 레이어에서 처리)
 *
 * @param session - BURST_IN_PROGRESS 상태의 DrawSession
 * @returns 완료 상태의 새로운 DrawSession
 */
export function applyBurstEvent(session: DrawSession): DrawSession {
  return {
    ...session,
    status: 'COMPLETED',
  };
}

/**
 * 세션을 잠금 상태로 전환한다.
 *
 * WAITING_CLICK 상태에서만 유효하며, UPGRADE_IN_PROGRESS로 전환한다.
 * 이미 잠금 상태이거나 COMPLETED 상태이면 그대로 반환한다.
 *
 * 요구사항: 1.10
 *
 * @param session - 현재 DrawSession
 * @returns 잠금 상태의 새로운 DrawSession
 */
export function lockSession(session: DrawSession): DrawSession {
  if (session.status !== 'WAITING_CLICK') {
    return session;
  }
  return { ...session, status: 'UPGRADE_IN_PROGRESS' };
}

/**
 * 세션의 잠금을 해제한다.
 *
 * UPGRADE_IN_PROGRESS 또는 BURST_IN_PROGRESS 상태에서만 유효하며,
 * WAITING_CLICK으로 전환한다.
 * 그 외 상태이면 그대로 반환한다.
 *
 * 요구사항: 1.10
 *
 * @param session - 현재 DrawSession
 * @returns 잠금 해제된 새로운 DrawSession
 */
export function unlockSession(session: DrawSession): DrawSession {
  if (!isSessionLocked(session)) {
    return session;
  }
  return { ...session, status: 'WAITING_CLICK' };
}
