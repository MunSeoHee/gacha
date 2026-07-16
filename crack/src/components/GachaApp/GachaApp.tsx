import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useHistoryStore } from '../../store/historyStore';
import { validateConfig } from '../../config/validateConfig';
import { PRIZES } from '../../config/prizes';
import { DEFAULT_PROBABILITY_TABLE } from '../../config/probability';
import { DEFAULT_SESSION_CONFIG } from '../../config/session';
import EffectLayer, { type EffectLayerHandle } from '../EffectLayer/EffectLayer';
import Orb, { type OrbEvent } from '../Orb/Orb';
import DrawSelector from '../DrawSelector/DrawSelector';
import ResultScreen from '../ResultScreen/ResultScreen';
import SessionEnd from '../SessionEnd/SessionEnd';
import { useOrbInteraction } from '../../hooks/useOrbInteraction';
import { useEffectSequencer } from '../../hooks/useEffectSequencer';
import { useOrientation } from '../../hooks/useOrientation';
import { GRADE_ORDER } from '../../domain/types';
import styles from './GachaApp.module.css';

/**
 * GachaApp 루트 컴포넌트
 *
 * 요구사항: 1.1, 4.3, 4.6, 6.1, 6.3
 *
 * - GamePhase에 따른 화면 전환
 * - ErrorBoundary 최상위 배치 (try-catch로 구현)
 * - validateConfig 앱 부트스트랩 시 실행
 * - EffectLayer + Orb 오버레이 레이아웃
 */
const GachaApp: React.FC = () => {
  const effectLayerRef = useRef<EffectLayerHandle>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  // 상태 관리
  const phase = useGameStore(state => state.phase);
  const session = useGameStore(state => state.session);
  const multiDrawResults = useGameStore(state => state.multiDrawResults);
  const selectedDrawCount = useGameStore(state => state.selectedDrawCount);
  const startGame = useGameStore(state => state.startGame);
  const setDrawCount = useGameStore(state => state.setDrawCount);
  const startSession = useGameStore(state => state.startSession);
  const applyUpgrade = useGameStore(state => state.applyUpgrade);
  const applyBurst = useGameStore(state => state.applyBurst);
  const continueOrEnd = useGameStore(state => state.continueOrEnd);
  const resetGame = useGameStore(state => state.resetGame);

  // 재고 관리
  const initInventory = useInventoryStore(state => state.initInventory);
  const getTotalStock = useInventoryStore(state => state.getTotalStock);
  const deductStock = useInventoryStore(state => state.deductStock);
  const inventoryState = useInventoryStore(state => state.state);

  // 이력 기록
  const addPrizeRecord = useHistoryStore(state => state.addPrizeRecord);

  // 이펙트 시퀀서
  const { playUpgradeSequence, playBurstSequence } = useEffectSequencer(effectLayerRef);

  // 화면 방향
  const { orientation, isTransitioning } = useOrientation();

  // 앱 초기화
  useEffect(() => {
    try {
      validateConfig(DEFAULT_SESSION_CONFIG, DEFAULT_PROBABILITY_TABLE, PRIZES);
      initInventory(PRIZES);
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('초기화 실패'));
    }
  }, [initInventory]);

  // 클릭 인터랙션
  const { clickCount, currentGrade, isLocked, handleClick } = useOrbInteraction(
    (x, y, strength) => {
      effectLayerRef.current?.playClickEffect(x, y, currentGrade, strength);
    }
  );

  // 클릭 강도 계산 (0~1)
  const intensity = session?.clickThreshold ? clickCount / session.clickThreshold : 0;

  // 구체 연출 상태 (승급/버스트)
  const orbEvent: OrbEvent =
    session?.status === 'UPGRADE_IN_PROGRESS'
      ? 'upgrade'
      : session?.status === 'BURST_IN_PROGRESS'
        ? 'burst'
        : 'idle';

  // 게임 상태 전환 로직
  useEffect(() => {
    if (!session) return;

    const isUpgradeReady = session.status === 'UPGRADE_IN_PROGRESS';
    const isBurstReady = session.status === 'BURST_IN_PROGRESS';

    if (isUpgradeReady) {
      // 다음(업그레이드될) 등급 계산 → 모이는 빛/등장 색에 사용
      const idx = GRADE_ORDER.indexOf(session.currentGrade);
      const nextGrade =
        idx >= 0 && idx < GRADE_ORDER.length - 1
          ? GRADE_ORDER[idx + 1]
          : session.currentGrade;

      // 깨지는 동안 공전 파티클·파문 링을 숨겨 구체가 완전히 사라져 보이게
      effectLayerRef.current?.setOrbAmbient(false);

      // 깨짐 순간에 가벼운 화면 흔들림
      setTimeout(() => {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 380);
      }, 150);

      // UpgradeEvent 연출 시작 (페이드아웃 → 빛 응축 → 등장)
      playUpgradeSequence(
        session.currentGrade,
        nextGrade,
        applyUpgrade
      )
        .catch(console.error)
        .finally(() => {
          // 등장 후 앰비언트 복원
          effectLayerRef.current?.setOrbAmbient(true);
        });
    }

    if (isBurstReady) {
      // 화면 흔들림 (hit-stop 이후 산산조각 타이밍에 맞춤)
      setTimeout(() => {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 480);
      }, 180);

      // BurstEvent 연출 시작
      // 결과 생성: 목표 등급의 상품 선택
      const createPrizeResult = () => {
        const targetGrade = session.isMultiDraw ? session.maxGrade : session.destinedGrade;
        const prizesOfGrade = PRIZES.filter(p => p.grade === targetGrade);

        if (prizesOfGrade.length === 0) {
          console.error(`No prizes found for grade: ${targetGrade}`);
          return null;
        }

        // 첫 번째 상품 선택 (재고 있는 것 중)
        const prizeToGive = prizesOfGrade[0];
        return {
          prizeId: prizeToGive.id,
          prizeName: prizeToGive.name,
          grade: targetGrade,
          imageUrl: prizeToGive.imageUrl,
        };
      };

      const prizeResult = createPrizeResult();

      playBurstSequence(session.destinedGrade, () => {
        if (prizeResult) {
          // 멀티드로우의 경우 전체 결과 생성
          const results = session.isMultiDraw
            ? session.destinedGrades.map(grade => {
                const prizeOfGrade = PRIZES.find(p => p.grade === grade);
                return prizeOfGrade
                  ? {
                      prizeId: prizeOfGrade.id,
                      prizeName: prizeOfGrade.name,
                      grade: grade,
                      imageUrl: prizeOfGrade.imageUrl,
                    }
                  : null;
              }).filter(Boolean) as any[]
            : [prizeResult];

          // 결과 저장 및 재고 차감
          results.forEach(result => {
            addPrizeRecord(result);
            deductStock(result.prizeId);
          });

          // 게임 상태 업데이트 (ResultScreen 표시)
          applyBurst(results.length > 1 ? results : results[0]);
        }
      }).catch(console.error);
    }
  }, [
    session,
    playUpgradeSequence,
    playBurstSequence,
    applyUpgrade,
    applyBurst,
    addPrizeRecord,
    deductStock,
  ]);

  // 오브 공전 오라: PLAYING 동안만 실행 (인스턴스 유지 → 업그레이드 수렴 파티클 보존)
  useEffect(() => {
    if (phase === 'PLAYING') {
      effectLayerRef.current?.startOrbAura(currentGrade);
      return () => {
        effectLayerRef.current?.stopOrbAura();
      };
    }
  }, [phase]);

  // 등급 변경 시 오라 색만 갱신 (재시작하지 않아 진행 중인 연출이 유지됨)
  useEffect(() => {
    if (phase === 'PLAYING') {
      effectLayerRef.current?.setOrbGrade(currentGrade);
    }
  }, [currentGrade, phase]);

  // ResultScreen 자동 종료 처리
  useEffect(() => {
    if (phase === 'RESULT_SHOWING') {
      const timer = setTimeout(() => {
        const remaining = getTotalStock();
        continueOrEnd(remaining);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [phase, getTotalStock, continueOrEnd]);

  if (error) {
    return (
      <div className={styles.error}>
        <h1>오류 발생</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className={styles.loading}>
        <p>게임 초기화 중...</p>
      </div>
    );
  }

  const totalStock = getTotalStock();

  return (
    <div
      className={`${styles.gachaApp} ${styles[orientation]} ${
        isTransitioning ? styles.transitioning : ''
      } ${screenShake ? styles.screenShake : ''}`}
    >
      {/* EffectLayer (최상단) */}
      <div className={styles.effectLayerContainer}>
        <EffectLayer ref={effectLayerRef} />
      </div>

      {/* 게임 컨텐츠 */}
      <div className={styles.contentArea}>
        {phase === 'IDLE' && (
          <div className={styles.screen}>
            <button
              className={styles.startButton}
              onClick={startGame}
            >
              게임 시작
            </button>
          </div>
        )}

        {phase === 'WAITING_SELECTION' && (
          <div className={styles.screen}>
            <DrawSelector
              options={DEFAULT_SESSION_CONFIG.drawCountOptions}
              selectedCount={selectedDrawCount}
              totalStock={totalStock}
              isAnimating={false}
              onSelectCount={setDrawCount}
              onStart={() => {
                startSession(
                  DEFAULT_PROBABILITY_TABLE,
                  inventoryState,
                  PRIZES,
                  DEFAULT_SESSION_CONFIG
                );
              }}
            />
          </div>
        )}

        {phase === 'PLAYING' && session && (
          <div className={styles.playingArea}>
            <div className={styles.orbWrapper}>
              <Orb
                grade={currentGrade}
                intensity={intensity}
                isLocked={isLocked}
                onClick={handleClick}
                event={orbEvent}
              />
            </div>
          </div>
        )}

        {phase === 'RESULT_SHOWING' && (
          <div className={styles.screen}>
            <ResultScreen
              results={multiDrawResults}
              onAutoClose={() => {
                continueOrEnd(getTotalStock());
              }}
              onRestart={() => {
                resetGame();
                startGame();
              }}
            />
          </div>
        )}

        {phase === 'SESSION_END' && (
          <div className={styles.screen}>
            <SessionEnd
              onRestart={() => {
                resetGame();
                initInventory(PRIZES);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GachaApp;
