import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as PIXI from 'pixi.js';
import { playBurstEffect } from '../../effects/burstEffect';
import { createParticleEmitter } from '../../effects/particleEngine';
import { OrbAura, createOrbAura, GRADE_TIER, hexToNumber } from '../../effects/orbAura';
import type { Grade } from '../../domain/types';
import { GRADE_EFFECTS } from '../../effects/gradeEffects';

/**
 * EffectLayer 외부 핸들 인터페이스
 *
 * useImperativeHandle을 통해 노출되며, 부모 컴포넌트에서
 * 각 이펙트를 동기화되게 재생할 수 있다.
 */
export interface EffectLayerHandle {
  /**
   * 업그레이드 이펙트를 재생한다 (빛 번쩍 + 파티클).
   * Promise 완료 시 이펙트가 끝난다.
   */
  playUpgradeEffect(grade: Grade): Promise<void>;

  /**
   * 버스트 이펙트를 재생한다 (대량 파티클 폭발).
   * Promise 완료 시 이펙트가 끝난다.
   */
  playBurstEffect(grade: Grade): Promise<void>;

  /**
   * 클릭 이펙트를 재생한다 (소형 파티클).
   * Promise 완료 시 이펙트가 끝난다.
   */
  playClickEffect(x: number, y: number, grade: Grade, strength?: number): Promise<void>;

  /**
   * 유휴(Idle) 이펙트를 재생한다 (배경 분위기).
   * 취소 가능한 Promise를 반환한다.
   */
  playIdleEffect(): Promise<void>;

  /** 오브 공전 오라를 시작한다 (등급별 강도). */
  startOrbAura(grade: Grade): void;

  /** 오브 공전 오라를 정지한다. */
  stopOrbAura(): void;

  /** 오브 오라의 등급(색·강도)을 갱신한다. */
  setOrbGrade(grade: Grade): void;

  /** 오브 앰비언트(공전 파티클·파문 링) 표시/숨김. */
  setOrbAmbient(visible: boolean): void;

  /** 오브 산산조각 (파편 + 충격파). 현재 오라 색으로 깨진다. */
  orbShatter(): void;

  /** 업그레이드 등장 순간: 새 등급 색으로 바깥 반짝 + 충격파 링 (등급 비례). */
  playUpgradeMaterialize(grade: Grade): void;
}

/**
 * EffectLayer 컴포넌트 props
 */
export interface EffectLayerProps {
  /** 컨테이너 너비 (픽셀) */
  width?: number;
  /** 컨테이너 높이 (픽셀) */
  height?: number;
  /** CSS 클래스명 */
  className?: string;
}

/**
 * PixiJS Application을 React에서 관리하는 래퍼 컴포넌트
 *
 * 요구사항: 1.2, 1.8, 1.9, 6.4, 7.1, 7.2
 *
 * - WebGL을 시도하고 미지원 시 Canvas 2D로 자동 폴백
 * - useImperativeHandle로 EffectLayerHandle 인터페이스 노출
 * - playUpgradeEffect, playBurstEffect, playClickEffect, playIdleEffect 구현
 */
const EffectLayer = forwardRef<EffectLayerHandle, EffectLayerProps>(
  ({ className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const idleEmitterRef = useRef<any>(null);
    const idleAnimationRef = useRef<number | null>(null);
    const orbAuraRef = useRef<OrbAura | null>(null);

    useEffect(() => {
      // 화면(뷰포트) 크기와 1:1로 맞춰 파티클 좌표가 확대/왜곡되지 않게 한다.
      const handleResize = () => {
        const app = appRef.current;
        if (!app) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        app.renderer.resize(w, h);
        orbAuraRef.current?.setCenter(w / 2, h / 2);
      };

      const initApp = async () => {
        if (!canvasRef.current) return;

        try {
          // PixiJS v8+ 새로운 API 사용
          const app = new PIXI.Application();
          await app.init({
            canvas: canvasRef.current,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x000000,
            antialias: true,
            failIfMajorPerformanceCaveat: false,
          });

          appRef.current = app;
        } catch (error) {
          console.error('[EffectLayer] PixiJS 초기화 실패:', error);
          // 폴백: canvas 요소만 유지하고 계속 진행
        }
      };

      // 초기화 시작
      initApp().catch(err => console.error('[EffectLayer] initApp 에러:', err));
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);

        // 애니메이션 정리
        if (idleAnimationRef.current !== null) {
          cancelAnimationFrame(idleAnimationRef.current);
          idleAnimationRef.current = null;
        }

        // Idle 이미터 정리
        if (idleEmitterRef.current) {
          idleEmitterRef.current.destroy();
          idleEmitterRef.current = null;
        }

        // 오브 오라 정리
        if (orbAuraRef.current) {
          orbAuraRef.current.destroy();
          orbAuraRef.current = null;
        }

        // PixiJS 애플리케이션 정리
        if (appRef.current) {
          appRef.current.destroy(true);
          appRef.current = null;
        }
      };
    }, []);

    useImperativeHandle(ref, () => ({
      async playUpgradeEffect(grade: Grade) {
        if (!appRef.current) return;

        // 새 등급 색 빛이 소용돌이치며 중심으로 모여듦
        orbAuraRef.current?.converge(
          hexToNumber(GRADE_EFFECTS[grade].particleColor),
          GRADE_TIER[grade]
        );
      },

      async playBurstEffect(grade: Grade) {
        if (!appRef.current) return;
        // hit-stop: 균열 직후 짧은 정적 → 타격감
        await new Promise(resolve => setTimeout(resolve, 180));
        // 구체 산산조각 (파편 + 충격파)
        orbAuraRef.current?.shatter();
        await playBurstEffect(appRef.current, grade);
      },

      async playClickEffect(_x: number, _y: number, _grade: Grade, strength: number = 0.5) {
        if (!appRef.current) return;

        // 구체에서 터져나오는 스파크 파티클 (등급 + 클릭 강도에 따라 강해짐 → 타격감)
        orbAuraRef.current?.burst(strength);
      },

      async playIdleEffect() {
        if (!appRef.current) return;

        // 배경 분위기 이펙트: 천천한 파티클
        if (idleEmitterRef.current) {
          idleEmitterRef.current.destroy();
        }

        const emitter = createParticleEmitter(appRef.current, {
          radius: 1,
          color: 0x7eb8f7, // 파란색
          count: 10,
          lifetime: 2000,
          speedRange: [10, 30],
        });

        idleEmitterRef.current = emitter;

        return new Promise<void>(() => {
          const animate = () => {
            emitter.emit(
              Math.random() * appRef.current!.screen.width,
              -10
            );
            idleAnimationRef.current = setTimeout(() => {
              animate();
            }, 500);
          };

          animate();

          // Promise는 수동으로 취소될 때까지 계속 실행됨
          // cleanup 함수에서 취소됨
        });
      },

      startOrbAura(grade: Grade) {
        if (!appRef.current) return;
        if (orbAuraRef.current) {
          orbAuraRef.current.destroy();
          orbAuraRef.current = null;
        }
        const aura = createOrbAura(appRef.current, grade);
        aura.start();
        orbAuraRef.current = aura;
      },

      stopOrbAura() {
        orbAuraRef.current?.stop();
      },

      setOrbGrade(grade: Grade) {
        const config = GRADE_EFFECTS[grade];
        orbAuraRef.current?.setGrade(
          hexToNumber(config.particleColor),
          GRADE_TIER[grade]
        );
      },

      setOrbAmbient(visible: boolean) {
        orbAuraRef.current?.setAmbientVisible(visible);
      },

      orbShatter() {
        orbAuraRef.current?.shatter();
      },

      playUpgradeMaterialize(grade: Grade) {
        orbAuraRef.current?.materializeBurst(
          hexToNumber(GRADE_EFFECTS[grade].particleColor),
          GRADE_TIER[grade]
        );
      },
    }), []);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    );
  }
);

EffectLayer.displayName = 'EffectLayer';

export default EffectLayer;
