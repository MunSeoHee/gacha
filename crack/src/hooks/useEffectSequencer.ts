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

      // 1. 빠직(균열) 순간까지 대기
      await new Promise(resolve => setTimeout(resolve, 150));

      // 2. 산산조각 (파편 + 충격파) — 아직 등급 전환 전이라 현재(이전) 색으로 깨짐
      effectLayer.orbShatter();
      soundManagerRef.current.play(toConfig.upgradeSoundKey);

      // 3. 깨져 사라진 뒤 ~1초 정적(암전) — 잠시 멈췄다가
      await new Promise(resolve => setTimeout(resolve, 1000));
      onStateChange();

      // 4. 새 등급 색 빛이 중심으로 모여듦(응축)
      effectLayer.playUpgradeEffect(toGrade);
      await new Promise(resolve => setTimeout(resolve, 550));

      // 5. 응축 → 등장 순간: 오라 복귀 + 바깥 반짝·충격파 + 구체 재질(환생)
      effectLayer.setOrbAmbient(true);
      effectLayer.playUpgradeMaterialize(toGrade);
      await new Promise(resolve => setTimeout(resolve, 450));
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
