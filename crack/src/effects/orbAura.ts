import * as PIXI from 'pixi.js';
import type { Grade } from '../domain/types';
import { GRADE_EFFECTS } from './gradeEffects';

/**
 * 오브 전용 파티클 연출.
 *
 * - 방출 오라(emission): 구체 표면에서 소용돌이치며 바깥으로 뿜어져 나오는 빛 입자 (상시)
 * - 스파크(spark): 클릭 시 구체 표면에서 바깥으로 튀어나오는 반짝임 (등급↑ → 별 모양·글리터)
 *
 * 기존 particleEngine.ts(바깥 방사형)와 독립적으로 동작한다.
 */

/** 등급별 강도 티어 (0=Normal ~ 3=Primeval) */
const GRADE_TIER: Record<Grade, number> = {
  Normal: 0,
  Rare: 1,
  Epic: 2,
  Primeval: 3,
};

/** 구체 반경 (orbCore 160px → 반경 80) */
const ORB_RADIUS = 80;

interface EmissionParticle {
  sprite: PIXI.Graphics;
  angle: number;        // 현재 각도
  angularSpeed: number; // rad/s (소용돌이)
  r0: number;           // 방출 시작 반경 (구체 표면 근처)
  radialSpeed: number;  // 바깥으로 뻗는 속도 px/s
  age: number;          // ms
  life: number;         // ms
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface SparkParticle {
  sprite: PIXI.Graphics;
  vx: number;
  vy: number;
  gravity: number;
  remainingLife: number;
  maxLife: number;
  spin: number;
}

interface RingParticle {
  sprite: PIXI.Graphics;
  maxRadius: number;
  lineWidth: number;
  remainingLife: number;
  maxLife: number;
}

interface ConvergeParticle {
  sprite: PIXI.Graphics;
  angle: number;
  angVel: number; // 나선(소용돌이) 각속도
  startR: number;
  age: number;
  life: number;
}

interface PulseGlow {
  sprite: PIXI.Graphics;
  age: number;
  life: number;
  maxScale: number;
}

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export class OrbAura {
  private stage: PIXI.Container;
  private container: PIXI.Container;
  private cx: number;
  private cy: number;
  private color: number;
  private tier: number;

  private emission: EmissionParticle[] = [];
  private sparks: SparkParticle[] = [];
  private rings: RingParticle[] = [];
  private converging: ConvergeParticle[] = [];
  private pulses: PulseGlow[] = [];
  private ringInterval = 0; // ms, 0이면 파문 링 비활성 (Normal)
  private ringTimer = 0;
  private ambientHidden = false; // 업그레이드 페이드아웃 동안 오라/링 숨김
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;

  constructor(app: PIXI.Application, color: number, tier: number) {
    this.stage = app.stage;
    this.container = new PIXI.Container();
    this.stage.addChild(this.container);
    this.cx = app.screen.width / 2;
    this.cy = app.screen.height / 2;
    this.color = color;
    this.tier = tier;
  }

  /** 파문 링 주기(ms): Normal 없음, 등급↑ 시 자주 */
  private computeRingInterval(): number {
    return this.tier === 0 ? 0 : 1400 - (this.tier - 1) * 450; // 1400 / 950 / 500
  }

  /** 방출 오라 시작 */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.ringInterval = this.computeRingInterval();
    this.ringTimer = 0;
    this.spawnEmission();
    this.lastTime = null;
    this.loop();
  }

  /** 등급 변경 시 색/강도 갱신 후 오라 재구성 */
  setGrade(color: number, tier: number): void {
    this.color = color;
    this.tier = tier;
    this.ringInterval = this.computeRingInterval();
    for (const p of this.emission) {
      this.container.removeChild(p.sprite);
      p.sprite.destroy();
    }
    this.emission = [];
    if (this.running) this.spawnEmission();
  }

  private spawnEmission(): void {
    // 등급별 차등을 크게: Normal 성기게 → Primeval 빽빽하게
    const count = 10 + this.tier * 18; // 10 / 28 / 46 / 64
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      const size = 1.2 + Math.random() * 1.3 + this.tier * 0.7; // 등급↑ 뚜렷하게 큼
      g.circle(0, 0, size).fill({ color: this.color, alpha: 1 });
      this.container.addChild(g);

      const p: EmissionParticle = {
        sprite: g,
        angle: 0,
        angularSpeed: 0,
        r0: 0,
        radialSpeed: 0,
        age: 0,
        life: 0,
        baseAlpha: 0,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.5 + Math.random() * 2,
      };
      this.initEmission(p, true);
      this.emission.push(p);
    }
  }

  /** 방출 입자를 (재)초기화한다. 표면 근처에서 태어나 바깥으로 뻗어나간다. */
  private initEmission(p: EmissionParticle, randomizeAge: boolean): void {
    p.angle = Math.random() * Math.PI * 2;
    // 등급↑ 시 회전이 확연히 빨라짐
    p.angularSpeed = (0.5 + Math.random() * 0.7) * (1 + this.tier * 0.6) *
      (Math.random() < 0.5 ? 1 : -1);
    // 구체(DOM)가 캔버스 앞에 있어 반경 안쪽은 가려지므로 표면 '바깥'에서 방출
    p.r0 = ORB_RADIUS + 2 + Math.random() * 14; // 82~98
    // 등급↑ 시 더 멀리 뿜어져 나감
    p.radialSpeed = 10 + Math.random() * 10 + this.tier * 14;
    p.life = 800 + Math.random() * 600;
    p.baseAlpha = 0.55 + Math.random() * 0.4 + this.tier * 0.05;
    // 최초 생성 시엔 수명을 흩뿌려서 한꺼번에 사라지지 않게
    p.age = randomizeAge ? Math.random() * p.life : 0;
  }

  /**
   * 클릭 시 스파크 발생 (구체 표면에서 바깥으로 튀어나옴).
   * @param strength 클릭 강도 0~1 (등급 진행도). 클수록 파티클이 강해진다.
   */
  burst(strength: number = 0.5): void {
    this.spawnSparks(Math.max(0, Math.min(1, strength)));
    if (this.running && this.rafId === null) {
      this.lastTime = null;
      this.loop();
    }
  }

  private spawnSparks(strength: number): void {
    // 등급(tier) + 클릭 강도(strength)에 따라 개수·크기·속도가 함께 강해진다 → 타격감
    // 등급별 차등을 크게: Normal 8 → Primeval 38 (강도 1.0 기준)
    const baseCount = 8 + this.tier * 10;
    const count = Math.max(6, Math.round(baseCount * (0.6 + strength))); // 0.6x → 1.6x
    const useStar = this.tier >= 2;   // Epic 이상은 별 모양
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      const size = (1.6 + Math.random() * 1.8 + this.tier * 0.9) * (0.85 + strength * 0.5);
      if (useStar) {
        g.star(0, 0, this.tier >= 3 ? 4 : 5, size * 1.6, size * 0.7)
          .fill({ color: this.color, alpha: 1 });
      } else {
        g.circle(0, 0, size).fill({ color: this.color, alpha: 1 });
      }

      // 구체 표면 바깥에서 태어나 그 방향으로 튀어나감 (가림 방지 + 즉각적 타격감)
      const angle = Math.random() * Math.PI * 2;
      const spawnR = ORB_RADIUS + 2;
      g.position.set(
        this.cx + Math.cos(angle) * spawnR,
        this.cy + Math.sin(angle) * spawnR
      );
      this.container.addChild(g);

      const speed = (130 + Math.random() * 100 + this.tier * 95) * (0.8 + strength * 0.7);
      const jitter = (Math.random() - 0.5) * 0.4;
      const life = 420 + Math.random() * (300 + this.tier * 160);
      this.sparks.push({
        sprite: g,
        vx: Math.cos(angle + jitter) * speed,
        vy: Math.sin(angle + jitter) * speed,
        gravity: 180, // 살짝 아래로, 대부분은 튀어나가는 느낌
        remainingLife: life,
        maxLife: life,
        spin: (Math.random() - 0.5) * 8,
      });
    }
  }

  /**
   * 버스트: 구체가 산산조각 나는 연출 (파편 조각 + 충격파 링, 등급 비례).
   */
  shatter(): void {
    // 굵은 충격파 링 여러 겹 (등급↑ 시 더 많이·크게)
    const ringCount = 2 + this.tier;
    for (let i = 0; i < ringCount; i++) {
      const g = new PIXI.Graphics();
      g.position.set(this.cx, this.cy);
      this.container.addChild(g);
      const life = 480 + i * 130;
      this.rings.push({
        sprite: g,
        maxRadius: ORB_RADIUS + 120 + this.tier * 60 + i * 45,
        lineWidth: 3 + this.tier * 1.6,
        remainingLife: life,
        maxLife: life,
      });
    }

    // 파편 조각(삼각형)이 사방으로 튀며 낙하
    const shardCount = 8 + this.tier * 5;
    for (let i = 0; i < shardCount; i++) {
      const g = new PIXI.Graphics();
      const s = 5 + Math.random() * (6 + this.tier * 2);
      g.poly([-s, -s * 0.6, s, -s * 0.3, 0, s]).fill({ color: this.color, alpha: 1 });
      const angle = Math.random() * Math.PI * 2;
      const spawnR = ORB_RADIUS - 10;
      g.position.set(
        this.cx + Math.cos(angle) * spawnR,
        this.cy + Math.sin(angle) * spawnR
      );
      g.rotation = Math.random() * Math.PI * 2;
      this.container.addChild(g);
      const speed = 180 + Math.random() * 160 + this.tier * 70;
      const life = 600 + Math.random() * 300;
      this.sparks.push({
        sprite: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 340,
        remainingLife: life,
        maxLife: life,
        spin: (Math.random() - 0.5) * 12,
      });
    }

    if (this.rafId === null) {
      this.lastTime = null;
      this.loop();
    }
  }

  /**
   * 업그레이드: 새 등급 색 빛 입자가 바깥에서 중심으로 모여 응축된다 (등급↑ 시 더 많이·빠르게).
   * @param color 모이는 빛 색 (새 등급 색)
   * @param tier 새 등급 티어 (개수 스케일)
   */
  /**
   * 빛 응축 — 새 등급 색 빛 입자가 소용돌이치며 중심으로 모여든다 (등급별 차등).
   */
  converge(color: number, tier: number): void {
    const count = 16 + tier * 12; // 16 / 28 / 40 / 52
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      const size = 2 + Math.random() * (2 + tier * 1.4);
      g.circle(0, 0, size).fill({ color, alpha: 1 });
      const angle = Math.random() * Math.PI * 2;
      const startR = 120 + Math.random() * 110;
      g.position.set(this.cx + Math.cos(angle) * startR, this.cy + Math.sin(angle) * startR);
      this.container.addChild(g);
      this.converging.push({
        sprite: g,
        angle,
        angVel: (0.6 + tier * 0.7) * (Math.random() < 0.5 ? 1 : -1),
        startR,
        age: 0,
        life: 480 + Math.random() * 220,
      });
    }

    if (this.rafId === null) {
      this.lastTime = null;
      this.loop();
    }
  }

  /**
   * 업그레이드 등장 순간: 응축된 빛이 터지듯 바깥으로 반짝 + 충격파 링 (등급 비례).
   * @param color 새 등급 색
   * @param tier 새 등급 티어
   */
  materializeBurst(color: number, tier: number): void {
    // 바깥으로 튀는 반짝 (등급↑ 시 더 많이·별 모양)
    const sparkCount = 8 + tier * 8;
    const useStar = tier >= 2;
    for (let i = 0; i < sparkCount; i++) {
      const g = new PIXI.Graphics();
      const size = 1.8 + Math.random() * (2 + tier);
      if (useStar) {
        g.star(0, 0, tier >= 3 ? 4 : 5, size * 1.6, size * 0.7).fill({ color, alpha: 1 });
      } else {
        g.circle(0, 0, size).fill({ color, alpha: 1 });
      }
      const angle = Math.random() * Math.PI * 2;
      const spawnR = ORB_RADIUS - 10;
      g.position.set(this.cx + Math.cos(angle) * spawnR, this.cy + Math.sin(angle) * spawnR);
      this.container.addChild(g);
      const speed = 120 + Math.random() * 120 + tier * 70;
      const life = 450 + Math.random() * (250 + tier * 160);
      this.sparks.push({
        sprite: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 120,
        remainingLife: life,
        maxLife: life,
        spin: (Math.random() - 0.5) * 8,
      });
    }
    // 충격파 링 (등급↑ 시 더 많이·굵게)
    const ringCount = 1 + tier;
    for (let i = 0; i < ringCount; i++) {
      const g = new PIXI.Graphics();
      g.position.set(this.cx, this.cy);
      this.container.addChild(g);
      const life = 420 + i * 120;
      this.rings.push({
        sprite: g,
        maxRadius: ORB_RADIUS + 80 + tier * 45 + i * 40,
        lineWidth: 2 + tier * 1.2,
        remainingLife: life,
        maxLife: life,
      });
    }
    if (this.rafId === null) {
      this.lastTime = null;
      this.loop();
    }
  }

  /** 구체에서 퍼져나가는 빛 파문 링을 하나 생성한다 (등급↑ 시 더 굵고 멀리). */
  private spawnRing(): void {
    const g = new PIXI.Graphics();
    g.position.set(this.cx, this.cy);
    this.container.addChild(g);
    const life = 850 + this.tier * 120;
    this.rings.push({
      sprite: g,
      maxRadius: ORB_RADIUS + 70 + this.tier * 45, // 등급↑ 더 멀리
      lineWidth: 1.5 + this.tier * 1.3,            // 등급↑ 더 굵게
      remainingLife: life,
      maxLife: life,
    });
  }

  /** 화면 크기 변경 시 중심 좌표를 갱신한다. */
  setCenter(cx: number, cy: number): void {
    this.cx = cx;
    this.cy = cy;
  }

  /** 앰비언트(공전 파티클 + 파문 링) 표시/숨김. 업그레이드 페이드아웃 동안 숨긴다. */
  setAmbientVisible(visible: boolean): void {
    this.ambientHidden = !visible;
  }

  private loop = (): void => {
    this.rafId = requestAnimationFrame((now) => {
      const dt = this.lastTime === null ? 0.016 : Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;

      // 방출 오라 업데이트
      for (const p of this.emission) {
        p.age += dt * 1000;
        if (p.age >= p.life) {
          this.initEmission(p, false); // 재방출
        }
        p.angle += p.angularSpeed * dt;
        p.twinklePhase += dt * p.twinkleSpeed;
        const radius = p.r0 + p.radialSpeed * (p.age / 1000);
        p.sprite.position.set(
          this.cx + Math.cos(p.angle) * radius,
          this.cy + Math.sin(p.angle) * radius
        );
        // 표면에서 밝게 → 멀어질수록 페이드 (앰비언트 숨김 시 완전 투명)
        const fade = 1 - p.age / p.life;
        p.sprite.alpha = this.ambientHidden
          ? 0
          : p.baseAlpha * fade * (0.6 + 0.4 * Math.sin(p.twinklePhase));
      }

      // 파문 링 생성 (등급↑ 시 자주, 숨김 중엔 생성 안 함)
      if (this.running && this.ringInterval > 0 && !this.ambientHidden) {
        this.ringTimer += dt * 1000;
        if (this.ringTimer >= this.ringInterval) {
          this.ringTimer -= this.ringInterval;
          this.spawnRing();
        }
      }

      // 파문 링 업데이트 (구체에서 퍼지며 페이드)
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.remainingLife -= dt * 1000;
        const progress = 1 - r.remainingLife / r.maxLife;
        const radius = ORB_RADIUS + (r.maxRadius - ORB_RADIUS) * progress;
        const alpha = this.ambientHidden ? 0 : Math.max(0, 1 - progress) * 0.6;
        r.sprite.clear();
        r.sprite.circle(0, 0, radius).stroke({ width: r.lineWidth, color: this.color, alpha });
        r.sprite.position.set(this.cx, this.cy);
        if (r.remainingLife <= 0) {
          this.container.removeChild(r.sprite);
          r.sprite.destroy();
          this.rings.splice(i, 1);
        }
      }

      // 중심 태동(웅~) 맥동 업데이트 — 부풀었다 조여듦
      for (let i = this.pulses.length - 1; i >= 0; i--) {
        const pu = this.pulses[i];
        pu.age += dt * 1000;
        const t = Math.min(pu.age / pu.life, 1);
        const wave = Math.sin(Math.PI * t); // 0 → 1 → 0 (부풀었다 조여듦)
        pu.sprite.scale.set(0.01 + pu.maxScale * wave);
        pu.sprite.alpha = 0.55 * wave;
        if (t >= 1) {
          this.container.removeChild(pu.sprite);
          pu.sprite.destroy();
          this.pulses.splice(i, 1);
        }
      }

      // 수렴(응축) 입자 업데이트 — 바깥에서 중심으로 모임
      for (let i = this.converging.length - 1; i >= 0; i--) {
        const c = this.converging[i];
        c.age += dt * 1000;
        c.angle += c.angVel * dt; // 소용돌이치며 빨려듦
        const p = Math.min(c.age / c.life, 1);
        const radius = c.startR * (1 - p);
        c.sprite.position.set(
          this.cx + Math.cos(c.angle) * radius,
          this.cy + Math.sin(c.angle) * radius
        );
        c.sprite.scale.set(Math.max(0.2, 1 - p * 0.6));
        c.sprite.alpha = p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.15) / 0.85);
        if (p >= 1) {
          this.container.removeChild(c.sprite);
          c.sprite.destroy();
          this.converging.splice(i, 1);
        }
      }

      // 스파크 업데이트
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.remainingLife -= dt * 1000;
        s.vy += s.gravity * dt;
        s.sprite.position.x += s.vx * dt;
        s.sprite.position.y += s.vy * dt;
        s.sprite.rotation += s.spin * dt;
        s.sprite.alpha = Math.max(0, s.remainingLife / s.maxLife);
        if (s.remainingLife <= 0) {
          this.container.removeChild(s.sprite);
          s.sprite.destroy();
          this.sparks.splice(i, 1);
        }
      }

      if (
        this.running ||
        this.sparks.length > 0 ||
        this.rings.length > 0 ||
        this.converging.length > 0 ||
        this.pulses.length > 0
      ) {
        this.loop();
      } else {
        this.rafId = null;
      }
    });
  };

  /** 방출 정지 (스파크는 자연 소멸까지 유지) */
  stop(): void {
    this.running = false;
    for (const p of this.emission) {
      this.container.removeChild(p.sprite);
      p.sprite.destroy();
    }
    this.emission = [];
  }

  /** 완전 정리 */
  destroy(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const p of this.emission) {
      p.sprite.destroy();
    }
    for (const s of this.sparks) {
      s.sprite.destroy();
    }
    for (const r of this.rings) {
      r.sprite.destroy();
    }
    for (const c of this.converging) {
      c.sprite.destroy();
    }
    for (const pu of this.pulses) {
      pu.sprite.destroy();
    }
    this.emission = [];
    this.sparks = [];
    this.rings = [];
    this.converging = [];
    this.pulses = [];
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}

export function createOrbAura(app: PIXI.Application, grade: Grade): OrbAura {
  const color = hexToNumber(GRADE_EFFECTS[grade].particleColor);
  return new OrbAura(app, color, GRADE_TIER[grade]);
}

export { GRADE_TIER, hexToNumber };
