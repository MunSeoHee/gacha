import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { isSessionLocked } from '../domain/session';

/**
 * Orb 클릭 인터랙션을 관리하는 훅
 *
 * 요구사항: 1.2, 1.3, 1.5, 1.6, 1.10
 *
 * 역할:
 * - 현재 게임 상태 (clickCount, currentGrade, isLocked)를 반환
 * - 클릭 핸들러 제공 (gameStore 액션 호출)
 * - EffectLayer 트리거를 위한 이펙트 콜백 제공
 */
export function useOrbInteraction(
  onClickEffect?: (x: number, y: number, strength: number) => void
) {
  const session = useGameStore(state => state.session);
  const handleOrbClick = useGameStore(state => state.handleOrbClick);

  const clickCount = session?.clickCount ?? 0;
  const currentGrade = session?.currentGrade ?? 'Normal';
  const isLocked = session ? isSessionLocked(session) : false;

  const handleClick = useMemo(
    () => () => {
      // 클릭 이펙트 재생 (등급 진행도를 강도로 전달 → 파티클이 점점 강해짐)
      if (onClickEffect) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const strength =
          session && session.clickThreshold > 0
            ? Math.min((session.clickCount + 1) / session.clickThreshold, 1)
            : 0.5;
        onClickEffect(centerX, centerY, strength);
      }

      // 게임 상태 업데이트
      handleOrbClick();
    },
    [handleOrbClick, onClickEffect, session]
  );

  return {
    clickCount,
    currentGrade,
    isLocked,
    handleClick,
  };
}
