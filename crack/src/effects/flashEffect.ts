import * as PIXI from 'pixi.js';
import type { Grade } from '../domain/types';
import { GRADE_EFFECTS } from './gradeEffects';

/**
 * 전체 화면 빛 번쩍 이펙트를 재생한다.
 *
 * 요구사항 7.2: 0.3초 이내에 시작되어야 한다.
 *
 * 동작:
 * 1. 등급에 맞는 색상의 오버레이 사각형을 생성한다.
 * 2. 알파 값이 0 → 1 → 0 으로 변화하는 페이드 애니메이션을 수행한다.
 * 3. 애니메이션 완료 후 Promise를 resolve한다.
 *
 * Validates: Requirements 7.2
 *
 * @param app - PixiJS Application
 * @param grade - 등급 (색상 결정)
 * @returns 이펙트 완료 시점을 나타내는 Promise<void>
 */
export async function playFlashEffect(
  app: PIXI.Application,
  grade: Grade
): Promise<void> {
  const config = GRADE_EFFECTS[grade];

  // 전체 화면 오버레이 사각형 생성
  const overlay = new PIXI.Graphics();
  overlay.rect(0, 0, app.screen.width, app.screen.height);
  overlay.fill(config.orbGlowColor);
  overlay.alpha = 0; // 초기 알파값

  app.stage.addChild(overlay);

  return new Promise(resolve => {
    const startTime = Date.now();
    const duration = 300; // 전체 애니메이션 300ms (페이드 인 150ms + 유지 0ms + 페이드 아웃 150ms)
    const fadeInDuration = 80; // 페이드 인 80ms
    const fadeOutDuration = 80; // 페이드 아웃 80ms

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 페이드 인 → 유지 → 페이드 아웃
      if (progress < fadeInDuration / duration) {
        // 페이드 인 (0 → 1)
        overlay.alpha = progress / (fadeInDuration / duration);
      } else if (progress < (fadeInDuration + 150) / duration) {
        // 유지 (1)
        overlay.alpha = 1;
      } else {
        // 페이드 아웃 (1 → 0)
        const fadeOutProgress = (progress - (fadeInDuration + 150) / duration) / (fadeOutDuration / duration);
        overlay.alpha = Math.max(0, 1 - fadeOutProgress);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        app.stage.removeChild(overlay);
        overlay.destroy();
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
}
