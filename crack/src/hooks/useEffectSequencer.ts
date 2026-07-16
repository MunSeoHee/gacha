import { useCallback, useRef } from 'react';
import { SoundManager } from '../audio/soundManager';
import { GRADE_EFFECTS } from '../effects/gradeEffects';
import type { Grade } from '../domain/types';

/**
 * 이펙트 시퀀서 훅
 *
 * 요구사항: 1.8, 1.9, 7.3
 *
 * 역할:
 * - UpgradeEvent 연출 시퀀스: 빛 번쩍 + 사운드 → Orb 변신 → 상태 전환
 * - BurstEvent 연출 시퀀스: 버스트 이펙트 + 사운드 → ResultScreen 전환
 * - 사운드와 시각 이펙트 100ms 이내 동기화
 */
export function useEffectSequencer(
  effectLayerRef: React.RefObject<any>
) {
  const soundManagerRef = useRef(SoundManager.getInstance());

  /**
   * UpgradeEvent 연출을 재생한다.
   *
   * 순서:
   * 1. 빛 번쩍 이펙트 시작 (즉시)
   * 2. 업그레이드 사운드 재생 (0ms 동기화)
   * 3. 빛 번쩍 완료 대기
   * 4. Orb 변신 애니메이션 (병렬 진행)
   * 5. 상태 전환 콜백 호출
   *
   * @param fromGrade - 현재 등급
   * @param toGrade - 업그레이드될 등급
   * @param onStateChange - 상태 전환 콜백
   * @returns 연출 완료 시점의 Promise
   */
  const playUpgradeSequence = useCallback(
    async (
      _fromGrade: Grade,
      toGrade: Grade,
      onStateChange: () => void
    ): Promise<void> => {
      const effectLayer = effectLayerRef.current;
      if (!effectLayer) return;

      const toConfig = GRADE_EFFECTS[toGrade];

      // 1. 빛 번쩍 이펙트 시작
      const flashPromise = effectLayer.playUpgradeEffect(toGrade);

      // 2. 사운드 재생 (100ms 이내 동기화)
      soundManagerRef.current.play(toConfig.upgradeSoundKey);

      // 3. 빛 번쩍 완료 대기
      await flashPromise;

      // 4. Orb 변신 (빛 번쩍 이후 시작)
      // 상태 전환은 다음 렌더링에서 수행
      onStateChange();

      // 추가 변신 애니메이션을 위한 대기 (100ms)
      await new Promise(resolve => setTimeout(resolve, 100));
    },
    [effectLayerRef]
  );

  /**
   * BurstEvent 연출을 재생한다.
   *
   * 순서:
   * 1. 버스트 이펙트 시작 (즉시)
   * 2. 버스트 사운드 재생 (0ms 동기화)
   * 3. 버스트 이펙트 완료 대기
   * 4. ResultScreen 전환 콜백 호출
   *
   * @param grade - 최종 등급
   * @param onShowResult - ResultScreen 표시 콜백
   * @returns 연출 완료 시점의 Promise
   */
  const playBurstSequence = useCallback(
    async (
      grade: Grade,
      onShowResult: () => void
    ): Promise<void> => {
      const effectLayer = effectLayerRef.current;
      if (!effectLayer) return;

      const config = GRADE_EFFECTS[grade];

      // 1. 버스트 이펙트 시작
      const burstPromise = effectLayer.playBurstEffect(grade);

      // 2. 사운드 재생 (100ms 이내 동기화)
      soundManagerRef.current.play(config.burstSoundKey);

      // 3. 버스트 이펙트 완료 대기
      await burstPromise;

      // 4. ResultScreen 전환
      onShowResult();
    },
    [effectLayerRef]
  );

  return {
    playUpgradeSequence,
    playBurstSequence,
  };
}
