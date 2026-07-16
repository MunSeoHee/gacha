import * as PIXI from 'pixi.js';

/**
 * 파티클 이미터 설정
 */
export interface ParticleEmitterConfig {
  /** 파티클 반지름 (px) */
  radius: number;
  /** 파티클 색상 (16진수) */
  color: number;
  /** 발행 수량 */
  count: number;
  /** 생명 시간 (ms) */
  lifetime: number;
  /** 초기 속도 범위 (min, max) */
  speedRange: [number, number];
}

/**
 * 활성 파티클 상태
 */
interface Particle {
  /** PixiJS Graphics 객체 */
  sprite: PIXI.Graphics;
  /** 남은 생명 시간 (ms) */
  remainingLife: number;
  /** 초기 생명 시간 (ms) */
  maxLife: number;
  /** 속도 (x, y) */
  velocity: { x: number; y: number };
}

/**
 * PixiJS 파티클 이미터
 *
 * Validates: Requirements 7.1
 */
export class ParticleEmitter {
  private particles: Particle[] = [];
  private container: PIXI.Container;
  private config: ParticleEmitterConfig;
  private animationFrameId: number | null = null;

  constructor(container: PIXI.Container, config: ParticleEmitterConfig) {
    this.container = container;
    this.config = config;
  }

  /**
   * 파티클을 발행한다.
   */
  emit(x: number, y: number): void {
    for (let i = 0; i < this.config.count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = Math.random() *
        (this.config.speedRange[1] - this.config.speedRange[0]) +
        this.config.speedRange[0];

      const sprite = new PIXI.Graphics();
      sprite.circle(0, 0, this.config.radius);
      sprite.fill(this.config.color);
      sprite.position.set(x, y);

      this.container.addChild(sprite);

      const particle: Particle = {
        sprite,
        remainingLife: this.config.lifetime,
        maxLife: this.config.lifetime,
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
      };

      this.particles.push(particle);
    }

    // 애니메이션 루프 시작
    if (this.animationFrameId === null) {
      this.startAnimation();
    }
  }

  /**
   * 애니메이션 루프를 시작한다.
   */
  private startAnimation(): void {
    const animate = (deltaTime: number) => {
      const dt = deltaTime / 1000; // 초 단위로 변환
      const deadIndices: number[] = [];

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i];

        // 생명 시간 감소
        particle.remainingLife -= deltaTime;

        if (particle.remainingLife <= 0) {
          // 죽은 파티클 제거
          this.container.removeChild(particle.sprite);
          particle.sprite.destroy();
          deadIndices.push(i);
        } else {
          // 위치 업데이트
          particle.sprite.position.x += particle.velocity.x * dt;
          particle.sprite.position.y += particle.velocity.y * dt;

          // 알파 페이드 아웃
          const alpha = particle.remainingLife / particle.maxLife;
          particle.sprite.alpha = alpha;
        }
      }

      // 죽은 파티클 제거
      for (const idx of deadIndices) {
        this.particles.splice(idx, 1);
      }

      // 모든 파티클이 죽으면 애니메이션 종료
      if (this.particles.length === 0) {
        this.animationFrameId = null;
        return;
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * 모든 파티클을 정리한다.
   */
  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    for (const particle of this.particles) {
      this.container.removeChild(particle.sprite);
      particle.sprite.destroy();
    }

    this.particles = [];
  }
}

/**
 * 파티클 이미터를 생성한다.
 *
 * 클릭 파티클(소형)과 버스트 파티클(대형) 2종을 지원한다.
 *
 * @param app - PixiJS Application
 * @param config - 파티클 이미터 설정
 * @returns ParticleEmitter 인스턴스
 */
export function createParticleEmitter(
  app: PIXI.Application,
  config: ParticleEmitterConfig
): ParticleEmitter {
  const emitter = new ParticleEmitter(app.stage, config);
  return emitter;
}
