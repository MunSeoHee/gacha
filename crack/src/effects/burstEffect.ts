import * as PIXI from 'pixi.js';
import type { Grade } from '../domain/types';
import { GRADE_EFFECTS } from './gradeEffects';
import { createParticleEmitter } from './particleEngine';

/**
 * 등급별 전용 폭발(Burst) 이펙트를 재생한다.
 *
 * GRADE_EFFECTS에서 다음 설정을 읽어 사용한다:
 * - burstDuration: 이펙트 지속 시간 (Primeval >= 다른 등급 최대값 × 2)
 * - particleColor: 파티클 색상
 * - particleCount: 파티클 수량
 *
 * 요구사항 7.4: Primeval의 burstDuration은 다른 등급(Normal/Rare/Epic)
 * 중 최댓값(3000ms) × 2 = 6000ms 이상이어야 한다.
 *
 * Validates: Requirements 7.1, 7.4
 *
 * @param app - PixiJS Application
 * @param grade - 등급
 * @returns 이펙트 완료 시점을 나타내는 Promise<void>
 */
export async function playBurstEffect(
  app: PIXI.Application,
  grade: Grade
): Promise<void> {
  const config = GRADE_EFFECTS[grade];

  // 화면 중앙 좌표
  const centerX = app.screen.width / 2;
  const centerY = app.screen.height / 2;

  // 파티클 이미터 생성 및 발행
  const emitter = createParticleEmitter(app, {
    radius: 4,
    color: parseInt(config.particleColor.slice(1), 16), // CSS color → 16진수로 변환
    count: config.particleCount,
    lifetime: config.burstDuration,
    speedRange: [50, 250], // 픽셀/초
  });

  emitter.emit(centerX, centerY);

  return new Promise(resolve => {
    setTimeout(() => {
      emitter.destroy();
      resolve();
    }, config.burstDuration);
  });
}
