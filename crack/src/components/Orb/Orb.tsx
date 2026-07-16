import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'motion/react';
import type { Grade } from '../../domain/types';
import { GRADE_EFFECTS } from '../../effects/gradeEffects';
import styles from './Orb.module.css';

/** 구체 이벤트 연출 상태 */
export type OrbEvent = 'idle' | 'upgrade' | 'burst';

/**
 * 등급별 구체 이미지 에셋 경로 (public/images/orbs/).
 * 파일이 없으면(로드 실패) 자동으로 CSS 구체로 폴백한다.
 */
const ORB_IMAGES: Record<Grade, string> = {
  Normal: '/images/orbs/normal.png',
  Rare: '/images/orbs/rare.png',
  Epic: '/images/orbs/epic.png',
  Primeval: '/images/orbs/primeval.png',
};

export interface OrbProps {
  grade: Grade;
  intensity: number;
  isLocked: boolean;
  onClick: () => void;
  /** 승급/버스트 연출 트리거 */
  event?: OrbEvent;
}

/**
 * 균열 선. t = 이 금이 나타나기 시작하는 클릭 진행도(0~1).
 * 클릭할수록(intensity 증가) 금이 하나씩 늘어나 점점 쩍쩍 갈라진다.
 */
const CRACK_LINES: { p: string; t: number }[] = [
  { p: '50,50 58,30 55,12', t: 0.25 },
  { p: '50,50 70,45 88,38', t: 0.35 },
  { p: '50,50 66,66 80,86', t: 0.45 },
  { p: '50,50 40,70 30,90', t: 0.55 },
  { p: '50,50 30,58 10,54', t: 0.65 },
  { p: '50,50 38,34 22,20', t: 0.72 },
  { p: '58,30 64,26', t: 0.8 },
  { p: '70,45 74,53', t: 0.86 },
  { p: '40,70 34,74', t: 0.92 },
];

/** 등급별 발광 강도 티어 (숫자가 클수록 화려) */
const GLOW_TIER: Record<Grade, number> = {
  Normal: 0,
  Rare: 1,
  Epic: 2,
  Primeval: 3,
};

const Orb: React.FC<OrbProps> = ({ grade, intensity, isLocked, onClick, event = 'idle' }) => {
  const config = GRADE_EFFECTS[grade];
  const controls = useAnimationControls();
  const eventControls = useAnimationControls();
  const flashControls = useAnimationControls();
  const targetClicksRef = useRef<number | null>(null);
  const clickCountRef = useRef(0);
  // 업그레이드 연출 시점의 등급(=깨지는 등급)을 참조하기 위한 ref
  const gradeRef = useRef(grade);
  gradeRef.current = grade;

  // 등급별 이미지 에셋 프리로드 (성공한 등급만 이미지 사용, 실패 시 CSS 구체 유지)
  const attemptedRef = useRef<Set<Grade>>(new Set());
  const [imgReady, setImgReady] = useState<Partial<Record<Grade, boolean>>>({});
  useEffect(() => {
    const url = ORB_IMAGES[grade];
    if (!url || attemptedRef.current.has(grade)) return;
    attemptedRef.current.add(grade);
    const img = new Image();
    img.onload = () => setImgReady(prev => ({ ...prev, [grade]: true }));
    img.onerror = () => setImgReady(prev => ({ ...prev, [grade]: false }));
    img.src = url;
  }, [grade]);

  // 게임(등급) 시작 시 목표 클릭 수를 15~20 사이 랜덤으로 설정
  useEffect(() => {
    if (intensity < 0.1) {
      targetClicksRef.current = Math.floor(Math.random() * (20 - 15 + 1)) + 15;
      clickCountRef.current = 0;
    }
  }, [intensity]);

  // 승급/버스트 연출
  useEffect(() => {
    if (event === 'upgrade') {
      // 빠직 → 깨져 사라짐 → ~1초 정적(암전) → 빛 응축 → 새 등급 구체 '짠' 재질(환생)
      const total = 2150;
      const tBump = 150 / total;      // 빠직 순간
      const tGone = 350 / total;      // 완전히 깨져 사라짐(투명)
      const tAppear = 1700 / total;   // 1초 정적 + 응축 완료 → 등장 시작
      const tPop = tAppear + (1 - tAppear) * 0.55; // 등장 팝 정점
      eventControls.start({
        scale: [1, 1.12, 0.15, 0.15, 1.25, 1],
        opacity: [1, 1, 0, 0, 1, 1],
        x: [0, -3, 3, 0, 0, 0],
        transition: {
          duration: total / 1000,
          times: [0, tBump, tGone, tAppear, tPop, 1],
          ease: 'easeOut',
        },
      });
    } else if (event === 'burst') {
      // 균열(정적, hit-stop) → 산산조각으로 붕괴
      eventControls.start({
        scale: [1, 1.12, 1.12, 0.12],
        opacity: [1, 1, 1, 0],
        x: [0, -3, 3, 0],
        transition: { duration: 0.75, times: [0, 0.15, 0.32, 1], ease: 'easeIn' },
      });
      flashControls.start({
        opacity: [0, 0, 1, 0],
        transition: { duration: 0.5, times: [0, 0.3, 0.44, 1], ease: 'easeOut' },
      });
    }
    // idle 로 돌아올 때는 강제 리셋하지 않는다 (애니메이션은 명령형이라 끝까지 재생됨)
  }, [event, eventControls, flashControls]);

  const handleClick = useCallback(() => {
    if (isLocked) return;

    clickCountRef.current++;
    const target = targetClicksRef.current ?? 20;
    const progress = Math.min(clickCountRef.current / target, 1);

    // 쉐이크는 가볍게, 클릭수 늘어도 과하지 않게 (진폭 축소 + 완만한 램프)
    // 타격감은 터져나오는 파티클이 담당
    const scale = 0.6 + progress * 0.6; // 0.6배 → 1.2배
    const ampX = 9 * scale;
    const ampY = 6 * scale;

    // 안정적인 요소에 명령형으로 흔들림 애니메이션 트리거
    controls.start({
      x: [0, -ampX, ampX, -ampX * 0.6, ampX * 0.4, 0],
      y: [0, ampY, -ampY, ampY * 0.6, -ampY * 0.4, 0],
      transition: { duration: 0.4, ease: 'easeOut' },
    });

    onClick();
  }, [isLocked, onClick, controls]);

  if (!config) {
    return null;
  }

  // 구체에서 새어나오는 빛: 등급별 차등을 크게 (Normal 은은 → Primeval 강렬)
  const tier = GLOW_TIER[grade];
  const glowOpacityMin = 0.15 + tier * 0.07;  // 0.15 → 0.36
  const glowOpacityMax = 0.4 + tier * 0.19;   // 0.40 → 0.97
  const glowScaleMax = 1.05 + tier * 0.13;    // 1.05 → 1.44
  const glowDuration = 2.9 - tier * 0.5;      // 2.9s → 1.4s (등급↑ 빠르게)
  const glowBlur = 11 + tier * 10;            // 11 → 41px (새어나오는 번짐)
  const glowSize = 180 + tier * 55;           // 180 → 345px

  // 안쪽 강한 빛 코어 (Epic 이상): 뜨겁게 타오르는 느낌
  const innerGlow = tier >= 2;
  const innerGlowSize = 150 + tier * 22;
  const innerGlowOpacity = 0.45 + (tier - 2) * 0.25; // Epic 0.45 → Primeval 0.70

  // 구체 코어 자체의 화려함 (등급↑ 시 더 선명·밝게, 회전은 없음)
  const coreFilter = `brightness(${1 + tier * 0.1}) saturate(${1 + tier * 0.25})`;

  // 에셋이 성공적으로 로드된 등급만 이미지 사용 (아니면 CSS 구체)
  const useImage = imgReady[grade] === true;

  return (
    <div
      className={styles.orbContainer}
      style={{
        ['--orbColor' as any]: config.orbColor,
        ['--orbGlowColor' as any]: config.orbGlowColor,
      }}
    >
      {/* 공중에 둥둥 떠있는 느낌 (위아래 부유) */}
      <motion.div
        className={styles.orbFloat}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* 승급/버스트 연출 (응축·펑 / 붕괴) */}
        <motion.div className={styles.orbEvent} animate={eventControls}>
          {/* 때릴 때 흔들림 */}
          <motion.div
            className={`${styles.orb} ${isLocked ? styles.locked : ''}`}
            onClick={handleClick}
            initial={{ x: 0, y: 0 }}
            animate={controls}
            style={{
              cursor: isLocked ? 'not-allowed' : 'pointer',
              opacity: isLocked ? 0.6 : 1,
            }}
          >
            {/* 구체에서 새어나오는 빛 (우웅우웅) */}
            <motion.div
              className={styles.orbGlow}
              style={{
                width: glowSize,
                height: glowSize,
                filter: `blur(${glowBlur}px)`,
              }}
              initial={{ opacity: glowOpacityMin, scale: 1 }}
              animate={{
                opacity: [glowOpacityMin, glowOpacityMax, glowOpacityMin],
                scale: [1, glowScaleMax, 1],
              }}
              transition={{ duration: glowDuration, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* 안쪽 뜨거운 빛 코어 (Epic 이상) */}
            {innerGlow && (
              <motion.div
                className={styles.orbGlow}
                style={{
                  width: innerGlowSize,
                  height: innerGlowSize,
                  filter: `blur(${8 + tier * 3}px)`,
                }}
                initial={{ opacity: innerGlowOpacity * 0.5, scale: 1 }}
                animate={{
                  opacity: [innerGlowOpacity * 0.5, innerGlowOpacity, innerGlowOpacity * 0.5],
                  scale: [1, 1.12, 1],
                }}
                transition={{
                  duration: glowDuration * 0.7,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
            {/* 코어: 에셋 있으면 이미지, 없으면 CSS 구체 */}
            {useImage ? (
              <img
                className={styles.orbImage}
                src={ORB_IMAGES[grade]}
                alt=""
                draggable={false}
              />
            ) : (
              <div className={styles.orbCore} style={{ filter: coreFilter }} />
            )}
            {/* 균열: 클릭 %에 따라 점점 금이 감. 버스트/업그레이드 땐 전부 표시 */}
            <svg className={styles.orbCrack} viewBox="0 0 100 100">
              <g fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth={1.6} strokeLinecap="round">
                {CRACK_LINES.map((l, i) => (
                  <polyline
                    key={i}
                    points={l.p}
                    style={{
                      opacity:
                        event === 'burst' || event === 'upgrade' || intensity >= l.t ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                    }}
                  />
                ))}
              </g>
            </svg>
            {/* 화이트 플래시 (버스트·업그레이드 전환을 덮어 자연스럽게, 명령형) */}
            <motion.div
              className={styles.orbFlash}
              initial={{ opacity: 0 }}
              animate={flashControls}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Orb;
