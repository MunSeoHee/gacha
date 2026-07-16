import type { Grade, GradeEffectConfig } from '../domain/types';

/**
 * 등급별 이펙트 설정.
 *
 * 요구사항 7.4: Primeval 의 burstDuration 은
 * Normal/Rare/Epic 중 최댓값(3000ms) × 2 = 6000ms 이상이어야 한다.
 * 여기서는 7000ms 로 설정한다.
 *
 * Validates: Requirements 7.1, 7.4
 */
export const GRADE_EFFECTS: Record<Grade, GradeEffectConfig> = {
  Normal: {
    grade: 'Normal',
    orbColor: '#a8d8a8',          // 연두색
    orbGlowColor: '#6fcf6f',
    particleColor: '#a8d8a8',
    particleCount: 40,
    burstDuration: 500,           // ms
    burstSoundKey: 'burst_normal',
    upgradeSoundKey: 'upgrade_normal',
  },

  Rare: {
    grade: 'Rare',
    orbColor: '#7eb8f7',          // 파란색
    orbGlowColor: '#3a8ee6',
    particleColor: '#7eb8f7',
    particleCount: 80,
    burstDuration: 700,           // ms
    burstSoundKey: 'burst_rare',
    upgradeSoundKey: 'upgrade_rare',
  },

  Epic: {
    grade: 'Epic',
    orbColor: '#d48cff',          // 보라색
    orbGlowColor: '#a020f0',
    particleColor: '#d48cff',
    particleCount: 150,
    burstDuration: 1000,          // ms — 非-Primeval 최댓값
    burstSoundKey: 'burst_epic',
    upgradeSoundKey: 'upgrade_epic',
  },

  Primeval: {
    grade: 'Primeval',
    orbColor: '#ffd700',          // 금색
    orbGlowColor: '#ff8c00',
    particleColor: '#ffd700',
    particleCount: 300,
    burstDuration: 2000,          // ms — Epic(1000) × 2 보장 (요구사항 7.4)
    burstSoundKey: 'burst_primeval',
    upgradeSoundKey: 'upgrade_primeval',
  },
} as const;
