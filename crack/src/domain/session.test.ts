/**
 * DrawSession 상태 전환 순수 함수 테스트
 *
 * 요구사항: 1.2, 1.5, 1.6, 1.7, 1.8, 1.10, 2.2
 */

import { describe, it, expect } from 'vitest';
import {
  createDrawSession,
  createMultiDrawSession,
  registerClick,
  applyUpgradeEvent,
  applyBurstEvent,
  lockSession,
  unlockSession,
  isSessionLocked,
} from './session';
import type { DrawSession, Grade } from './types';

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<DrawSession> = {}): DrawSession {
  return {
    id: 'test-id',
    destinedGrade: 'Epic',
    currentGrade: 'Normal',
    clickCount: 0,
    clickThreshold: 5,
    isMultiDraw: false,
    drawCount: 1,
    destinedGrades: ['Epic'],
    maxGrade: 'Epic',
    status: 'WAITING_CLICK',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createDrawSession
// ---------------------------------------------------------------------------

describe('createDrawSession', () => {
  it('currentGrade는 항상 Normal로 초기화된다', () => {
    const session = createDrawSession('Rare', 10);
    expect(session.currentGrade).toBe('Normal');
  });

  it('status는 WAITING_CLICK으로 초기화된다', () => {
    const session = createDrawSession('Epic', 10);
    expect(session.status).toBe('WAITING_CLICK');
  });

  it('clickCount는 0으로 초기화된다', () => {
    const session = createDrawSession('Primeval', 10);
    expect(session.clickCount).toBe(0);
  });

  it('destinedGrade가 정확히 설정된다', () => {
    const grades: Grade[] = ['Normal', 'Rare', 'Epic', 'Primeval'];
    for (const grade of grades) {
      const session = createDrawSession(grade, 10);
      expect(session.destinedGrade).toBe(grade);
    }
  });

  it('clickThreshold가 정확히 설정된다', () => {
    const session = createDrawSession('Normal', 7);
    expect(session.clickThreshold).toBe(7);
  });

  it('isMultiDraw는 false로 초기화된다', () => {
    const session = createDrawSession('Rare', 10);
    expect(session.isMultiDraw).toBe(false);
  });

  it('drawCount는 1로 초기화된다', () => {
    const session = createDrawSession('Rare', 10);
    expect(session.drawCount).toBe(1);
  });

  it('destinedGrades는 [destinedGrade]로 초기화된다', () => {
    const session = createDrawSession('Epic', 10);
    expect(session.destinedGrades).toEqual(['Epic']);
  });

  it('maxGrade는 destinedGrade와 같다', () => {
    const session = createDrawSession('Primeval', 10);
    expect(session.maxGrade).toBe('Primeval');
  });

  it('제공된 id가 사용된다', () => {
    const session = createDrawSession('Normal', 10, 'custom-id');
    expect(session.id).toBe('custom-id');
  });

  it('id를 제공하지 않으면 유효한 UUID가 자동 생성된다', () => {
    const session = createDrawSession('Normal', 10);
    expect(session.id).toBeTruthy();
    expect(typeof session.id).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// createMultiDrawSession
// ---------------------------------------------------------------------------

describe('createMultiDrawSession', () => {
  it('isMultiDraw는 true로 초기화된다', () => {
    const session = createMultiDrawSession(['Normal', 'Rare', 'Epic'], 'Epic', 10);
    expect(session.isMultiDraw).toBe(true);
  });

  it('drawCount는 destinedGrades 배열 길이와 같다', () => {
    const grades: Grade[] = ['Normal', 'Rare', 'Epic', 'Normal', 'Rare'];
    const session = createMultiDrawSession(grades, 'Epic', 10);
    expect(session.drawCount).toBe(5);
  });

  it('destinedGrade는 maxGrade와 동일하게 설정된다', () => {
    const session = createMultiDrawSession(['Normal', 'Epic'], 'Epic', 10);
    expect(session.destinedGrade).toBe('Epic');
    expect(session.maxGrade).toBe('Epic');
  });

  it('currentGrade는 Normal로 초기화된다', () => {
    const session = createMultiDrawSession(['Primeval'], 'Primeval', 10);
    expect(session.currentGrade).toBe('Normal');
  });
});

// ---------------------------------------------------------------------------
// isSessionLocked
// ---------------------------------------------------------------------------

describe('isSessionLocked', () => {
  it('WAITING_CLICK 상태는 잠금이 아니다', () => {
    expect(isSessionLocked(makeSession({ status: 'WAITING_CLICK' }))).toBe(false);
  });

  it('UPGRADE_IN_PROGRESS 상태는 잠금이다', () => {
    expect(isSessionLocked(makeSession({ status: 'UPGRADE_IN_PROGRESS' }))).toBe(true);
  });

  it('BURST_IN_PROGRESS 상태는 잠금이다', () => {
    expect(isSessionLocked(makeSession({ status: 'BURST_IN_PROGRESS' }))).toBe(true);
  });

  it('COMPLETED 상태는 잠금이 아니다', () => {
    expect(isSessionLocked(makeSession({ status: 'COMPLETED' }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// registerClick
// ---------------------------------------------------------------------------

describe('registerClick', () => {
  describe('잠금 상태에서 클릭 무시 (요구사항 1.10)', () => {
    it('UPGRADE_IN_PROGRESS 상태에서 클릭해도 세션이 변경되지 않는다', () => {
      const session = makeSession({ status: 'UPGRADE_IN_PROGRESS', clickCount: 2 });
      const result = registerClick(session);
      expect(result).toBe(session); // 동일한 참조를 반환
    });

    it('BURST_IN_PROGRESS 상태에서 클릭해도 세션이 변경되지 않는다', () => {
      const session = makeSession({ status: 'BURST_IN_PROGRESS', clickCount: 5 });
      const result = registerClick(session);
      expect(result).toBe(session);
    });

    it('잠금 상태에서 clickCount가 변경되지 않는다', () => {
      const session = makeSession({ status: 'UPGRADE_IN_PROGRESS', clickCount: 3 });
      const result = registerClick(session);
      expect(result.clickCount).toBe(3);
    });

    it('잠금 상태에서 destinedGrade가 변경되지 않는다', () => {
      const session = makeSession({ status: 'BURST_IN_PROGRESS', destinedGrade: 'Epic' });
      const result = registerClick(session);
      expect(result.destinedGrade).toBe('Epic');
    });

    it('잠금 상태에서 currentGrade가 변경되지 않는다', () => {
      const session = makeSession({ status: 'UPGRADE_IN_PROGRESS', currentGrade: 'Rare' });
      const result = registerClick(session);
      expect(result.currentGrade).toBe('Rare');
    });
  });

  describe('임계값 미도달 시 clickCount 증가 (요구사항 1.2)', () => {
    it('클릭 시 clickCount가 정확히 1 증가한다', () => {
      const session = makeSession({ clickCount: 0, clickThreshold: 5 });
      const result = registerClick(session);
      expect(result.clickCount).toBe(1);
    });

    it('연속 클릭 시 clickCount가 누적된다', () => {
      let session = makeSession({ clickCount: 0, clickThreshold: 5 });
      session = registerClick(session);
      session = registerClick(session);
      session = registerClick(session);
      expect(session.clickCount).toBe(3);
    });

    it('임계값 미도달 시 status는 WAITING_CLICK을 유지한다', () => {
      const session = makeSession({ clickCount: 0, clickThreshold: 5 });
      const result = registerClick(session);
      expect(result.status).toBe('WAITING_CLICK');
    });

    it('clickCount는 2 이상 증가하지 않는다', () => {
      const session = makeSession({ clickCount: 1, clickThreshold: 5 });
      const result = registerClick(session);
      expect(result.clickCount - session.clickCount).toBe(1);
    });

    it('clickCount는 감소하지 않는다', () => {
      const session = makeSession({ clickCount: 2, clickThreshold: 5 });
      const result = registerClick(session);
      expect(result.clickCount).toBeGreaterThanOrEqual(session.clickCount);
    });
  });

  describe('임계값 도달 시 UpgradeEvent (요구사항 1.5)', () => {
    it('currentGrade < destinedGrade에서 임계값 도달 시 UPGRADE_IN_PROGRESS 상태가 된다', () => {
      // currentGrade=Normal, destinedGrade=Epic → Normal < Epic → UpgradeEvent
      const session = makeSession({
        currentGrade: 'Normal',
        destinedGrade: 'Epic',
        clickCount: 4,
        clickThreshold: 5,
      });
      const result = registerClick(session);
      expect(result.status).toBe('UPGRADE_IN_PROGRESS');
    });

    it('Normal → Rare 업그레이드 시나리오', () => {
      const session = makeSession({
        currentGrade: 'Normal',
        destinedGrade: 'Rare',
        clickCount: 4,
        clickThreshold: 5,
      });
      const result = registerClick(session);
      expect(result.status).toBe('UPGRADE_IN_PROGRESS');
    });

    it('Rare → Epic 업그레이드 시나리오', () => {
      const session = makeSession({
        currentGrade: 'Rare',
        destinedGrade: 'Epic',
        clickCount: 9,
        clickThreshold: 10,
      });
      const result = registerClick(session);
      expect(result.status).toBe('UPGRADE_IN_PROGRESS');
    });
  });

  describe('임계값 도달 시 BurstEvent (요구사항 1.6)', () => {
    it('currentGrade == destinedGrade에서 임계값 도달 시 BURST_IN_PROGRESS 상태가 된다', () => {
      const session = makeSession({
        currentGrade: 'Epic',
        destinedGrade: 'Epic',
        clickCount: 4,
        clickThreshold: 5,
      });
      const result = registerClick(session);
      expect(result.status).toBe('BURST_IN_PROGRESS');
    });

    it('Normal destined Normal에서 임계값 도달 시 BURST_IN_PROGRESS', () => {
      const session = makeSession({
        currentGrade: 'Normal',
        destinedGrade: 'Normal',
        clickCount: 4,
        clickThreshold: 5,
      });
      const result = registerClick(session);
      expect(result.status).toBe('BURST_IN_PROGRESS');
    });
  });

  describe('Primeval 등급 항상 BurstEvent (요구사항 1.7)', () => {
    it('currentGrade가 Primeval이면 임계값 도달 시 항상 BURST_IN_PROGRESS', () => {
      const session = makeSession({
        currentGrade: 'Primeval',
        destinedGrade: 'Primeval',
        clickCount: 4,
        clickThreshold: 5,
      });
      const result = registerClick(session);
      expect(result.status).toBe('BURST_IN_PROGRESS');
    });
  });

  describe('원본 불변성', () => {
    it('registerClick은 원본 세션을 변경하지 않는다', () => {
      const session = makeSession({ clickCount: 2, clickThreshold: 5 });
      const original = { ...session };
      registerClick(session);
      expect(session.clickCount).toBe(original.clickCount);
      expect(session.status).toBe(original.status);
    });
  });
});

// ---------------------------------------------------------------------------
// applyUpgradeEvent
// ---------------------------------------------------------------------------

describe('applyUpgradeEvent', () => {
  it('Normal → Rare로 등급이 승급된다', () => {
    const session = makeSession({ currentGrade: 'Normal', status: 'UPGRADE_IN_PROGRESS' });
    const result = applyUpgradeEvent(session);
    expect(result.currentGrade).toBe('Rare');
  });

  it('Rare → Epic으로 등급이 승급된다', () => {
    const session = makeSession({ currentGrade: 'Rare', status: 'UPGRADE_IN_PROGRESS' });
    const result = applyUpgradeEvent(session);
    expect(result.currentGrade).toBe('Epic');
  });

  it('Epic → Primeval으로 등급이 승급된다', () => {
    const session = makeSession({ currentGrade: 'Epic', status: 'UPGRADE_IN_PROGRESS' });
    const result = applyUpgradeEvent(session);
    expect(result.currentGrade).toBe('Primeval');
  });

  it('clickCount가 0으로 초기화된다 (요구사항 1.8)', () => {
    const session = makeSession({ clickCount: 5, status: 'UPGRADE_IN_PROGRESS' });
    const result = applyUpgradeEvent(session);
    expect(result.clickCount).toBe(0);
  });

  it('status가 WAITING_CLICK으로 전환된다 (요구사항 1.8)', () => {
    const session = makeSession({ status: 'UPGRADE_IN_PROGRESS' });
    const result = applyUpgradeEvent(session);
    expect(result.status).toBe('WAITING_CLICK');
  });

  it('destinedGrade가 변경되지 않는다 (요구사항 2.2)', () => {
    const session = makeSession({ destinedGrade: 'Primeval', status: 'UPGRADE_IN_PROGRESS' });
    const result = applyUpgradeEvent(session);
    expect(result.destinedGrade).toBe('Primeval');
  });

  it('원본 세션을 변경하지 않는다', () => {
    const session = makeSession({ currentGrade: 'Normal', status: 'UPGRADE_IN_PROGRESS' });
    applyUpgradeEvent(session);
    expect(session.currentGrade).toBe('Normal');
  });
});

// ---------------------------------------------------------------------------
// applyBurstEvent
// ---------------------------------------------------------------------------

describe('applyBurstEvent', () => {
  it('status가 COMPLETED로 전환된다', () => {
    const session = makeSession({ status: 'BURST_IN_PROGRESS' });
    const result = applyBurstEvent(session);
    expect(result.status).toBe('COMPLETED');
  });

  it('currentGrade가 변경되지 않는다', () => {
    const session = makeSession({ currentGrade: 'Epic', status: 'BURST_IN_PROGRESS' });
    const result = applyBurstEvent(session);
    expect(result.currentGrade).toBe('Epic');
  });

  it('destinedGrade가 변경되지 않는다 (요구사항 2.2)', () => {
    const session = makeSession({ destinedGrade: 'Epic', status: 'BURST_IN_PROGRESS' });
    const result = applyBurstEvent(session);
    expect(result.destinedGrade).toBe('Epic');
  });

  it('clickCount가 변경되지 않는다', () => {
    const session = makeSession({ clickCount: 5, status: 'BURST_IN_PROGRESS' });
    const result = applyBurstEvent(session);
    expect(result.clickCount).toBe(5);
  });

  it('원본 세션을 변경하지 않는다', () => {
    const session = makeSession({ status: 'BURST_IN_PROGRESS' });
    applyBurstEvent(session);
    expect(session.status).toBe('BURST_IN_PROGRESS');
  });
});

// ---------------------------------------------------------------------------
// lockSession / unlockSession
// ---------------------------------------------------------------------------

describe('lockSession', () => {
  it('WAITING_CLICK → UPGRADE_IN_PROGRESS로 전환된다', () => {
    const session = makeSession({ status: 'WAITING_CLICK' });
    const result = lockSession(session);
    expect(result.status).toBe('UPGRADE_IN_PROGRESS');
  });

  it('이미 잠금 상태이면 그대로 반환된다', () => {
    const session = makeSession({ status: 'UPGRADE_IN_PROGRESS' });
    const result = lockSession(session);
    expect(result).toBe(session);
  });

  it('BURST_IN_PROGRESS 상태이면 그대로 반환된다', () => {
    const session = makeSession({ status: 'BURST_IN_PROGRESS' });
    const result = lockSession(session);
    expect(result).toBe(session);
  });

  it('COMPLETED 상태이면 그대로 반환된다', () => {
    const session = makeSession({ status: 'COMPLETED' });
    const result = lockSession(session);
    expect(result).toBe(session);
  });
});

describe('unlockSession', () => {
  it('UPGRADE_IN_PROGRESS → WAITING_CLICK으로 전환된다', () => {
    const session = makeSession({ status: 'UPGRADE_IN_PROGRESS' });
    const result = unlockSession(session);
    expect(result.status).toBe('WAITING_CLICK');
  });

  it('BURST_IN_PROGRESS → WAITING_CLICK으로 전환된다', () => {
    const session = makeSession({ status: 'BURST_IN_PROGRESS' });
    const result = unlockSession(session);
    expect(result.status).toBe('WAITING_CLICK');
  });

  it('이미 WAITING_CLICK 상태이면 그대로 반환된다', () => {
    const session = makeSession({ status: 'WAITING_CLICK' });
    const result = unlockSession(session);
    expect(result).toBe(session);
  });

  it('COMPLETED 상태이면 그대로 반환된다', () => {
    const session = makeSession({ status: 'COMPLETED' });
    const result = unlockSession(session);
    expect(result).toBe(session);
  });
});

// ---------------------------------------------------------------------------
// 전체 DrawSession 흐름 시나리오 테스트
// ---------------------------------------------------------------------------

describe('DrawSession 전체 흐름', () => {
  it('Normal → Rare → Epic 업그레이드 후 Burst까지 완전한 흐름', () => {
    const clickThreshold = 3;
    let session = createDrawSession('Epic', clickThreshold, 'flow-test');

    // === 1단계: Normal → Rare 업그레이드 ===
    expect(session.currentGrade).toBe('Normal');
    expect(session.status).toBe('WAITING_CLICK');

    session = registerClick(session); // 1
    session = registerClick(session); // 2
    expect(session.status).toBe('WAITING_CLICK');
    session = registerClick(session); // 3 → threshold 도달, currentGrade=Normal < destinedGrade=Epic → Upgrade
    expect(session.status).toBe('UPGRADE_IN_PROGRESS');

    // UpgradeEvent 적용
    session = applyUpgradeEvent(session);
    expect(session.currentGrade).toBe('Rare');
    expect(session.clickCount).toBe(0);
    expect(session.status).toBe('WAITING_CLICK');

    // === 2단계: Rare → Epic 업그레이드 ===
    session = registerClick(session); // 1
    session = registerClick(session); // 2
    session = registerClick(session); // 3 → threshold 도달, currentGrade=Rare < destinedGrade=Epic → Upgrade
    expect(session.status).toBe('UPGRADE_IN_PROGRESS');

    session = applyUpgradeEvent(session);
    expect(session.currentGrade).toBe('Epic');
    expect(session.clickCount).toBe(0);
    expect(session.status).toBe('WAITING_CLICK');

    // === 3단계: Epic BurstEvent ===
    session = registerClick(session); // 1
    session = registerClick(session); // 2
    session = registerClick(session); // 3 → threshold 도달, currentGrade=Epic == destinedGrade=Epic → Burst
    expect(session.status).toBe('BURST_IN_PROGRESS');

    // BurstEvent 적용
    session = applyBurstEvent(session);
    expect(session.status).toBe('COMPLETED');
    expect(session.currentGrade).toBe('Epic');
    expect(session.destinedGrade).toBe('Epic'); // 요구사항 2.2: 불변
  });

  it('destinedGrade=Normal이면 첫 임계값 도달 시 바로 Burst', () => {
    const session = createDrawSession('Normal', 5, 'normal-test');
    let s = session;
    // 4번 클릭
    for (let i = 0; i < 4; i++) {
      s = registerClick(s);
      expect(s.status).toBe('WAITING_CLICK');
    }
    // 5번째 클릭 → threshold 도달, Normal == Normal → Burst
    s = registerClick(s);
    expect(s.status).toBe('BURST_IN_PROGRESS');
  });

  it('잠금 상태 중 클릭해도 상태가 변하지 않는다 (요구사항 1.10)', () => {
    let session = makeSession({ status: 'UPGRADE_IN_PROGRESS', clickCount: 2 });
    for (let i = 0; i < 10; i++) {
      session = registerClick(session);
    }
    expect(session.clickCount).toBe(2);
    expect(session.status).toBe('UPGRADE_IN_PROGRESS');
  });

  it('destinedGrade는 업그레이드·버스트 이벤트를 거쳐도 변경되지 않는다 (요구사항 2.2)', () => {
    const initialDestined: Grade = 'Primeval';
    let session = createDrawSession(initialDestined, 2, 'destined-test');

    // Normal → Rare
    session = registerClick(session);
    session = registerClick(session);
    session = applyUpgradeEvent(session);
    expect(session.destinedGrade).toBe(initialDestined);

    // Rare → Epic
    session = registerClick(session);
    session = registerClick(session);
    session = applyUpgradeEvent(session);
    expect(session.destinedGrade).toBe(initialDestined);

    // Epic → Primeval
    session = registerClick(session);
    session = registerClick(session);
    session = applyUpgradeEvent(session);
    expect(session.destinedGrade).toBe(initialDestined);

    // Primeval Burst
    session = registerClick(session);
    session = registerClick(session);
    expect(session.status).toBe('BURST_IN_PROGRESS');
    session = applyBurstEvent(session);
    expect(session.destinedGrade).toBe(initialDestined);
  });
});
