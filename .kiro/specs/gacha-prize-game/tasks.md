# 구현 계획: 가챠 경품 추첨 게임

## 개요

도메인 순수 함수 → Zustand 스토어 → React 컴포넌트 → 이펙트/오디오 순서로 Bottom-Up 방식으로 구현한다.
각 단계마다 테스트가 통과하는 상태를 유지하며 점진적으로 기능을 쌓아간다.

---

## 태스크

- [x] 1. 프로젝트 구조 및 핵심 타입 설정
  - Vite + React 18 + TypeScript 프로젝트 초기화 (`npm create vite@latest`)
  - 의존성 설치: `pixijs@8`, `motion`, `zustand`, `howler`, `@types/howler`
  - 개발 의존성 설치: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `fast-check`, `jsdom`, `@vitest/coverage-v8`
  - `src/` 하위 디렉터리 구조 생성 (`config`, `domain`, `store`, `components`, `effects`, `audio`, `hooks`)
  - `vitest.config.ts` 설정 (jsdom 환경, coverage 설정)
  - _요구사항: 1.12, 1.13, 2.6_

  - [x] 1.1 핵심 타입 정의 (`src/domain/types.ts`)
    - `Grade`, `GRADE_ORDER`, `gradeIndex`, `isHigherGrade` 정의
    - `DrawSession`, `DrawSessionStatus`, `PrizeResult`, `PrizeRecord` 정의
    - `InventoryState`, `InventoryOperations`, `InventoryError`, `Result<T,E>` 타입 정의
    - `PrizeConfig`, `ProbabilityTable`, `SessionConfig`, `GradeEffectConfig` 정의
    - _요구사항: 1.1, 2.1, 3.1_

  - [x] 1.2 정적 설정값 파일 생성
    - `src/config/prizes.ts`: 등급별 샘플 상품 목록 (각 등급 1개 이상)
    - `src/config/probability.ts`: `DEFAULT_PROBABILITY_TABLE` (Normal 0.60 / Rare 0.30 / Epic 0.08 / Primeval 0.02)
    - `src/config/session.ts`: `clickThreshold: 10`, `drawCountOptions: [1, 5, 10]`, `autoCloseSeconds: 30`
    - `src/effects/gradeEffects.ts`: `GRADE_EFFECTS` 등급별 이펙트 설정 (Primeval burstDuration ≥ Epic×2)
    - _요구사항: 1.12, 2.3, 5.1, 7.4_

- [x] 2. 도메인 레이어 구현
  - [x] 2.1 확률 결정 로직 구현 (`src/domain/probability.ts`)
    - `resolveDestinedGrade(table: ProbabilityTable, availableGrades: Grade[]): Grade` 구현
    - 가중 랜덤 샘플링 로직 (재고 있는 등급만 후보로 사용)
    - _요구사항: 2.1, 2.4, 3.4_

  - [ ]* 2.2 Property 1 속성 테스트: 확률표 유효성 불변식
    - **Property 1: 확률표 유효성 불변식**
    - **검증: 요구사항 1.13, 2.6**
    - `validProbabilityTableArbitrary()` 생성기 작성 후 확률 합산이 1.0 ± 0.001인지 검증 (numRuns: 200)

  - [ ]* 2.3 Property 2 속성 테스트: DestinedGrade는 항상 재고가 있는 등급
    - **Property 2: DestinedGrade는 항상 재고가 있는 유효한 등급**
    - **검증: 요구사항 2.1, 2.4, 3.4**
    - 임의의 확률표 + 재고 상태 조합에서 `resolveDestinedGrade()` 결과가 재고 1 이상인 등급임을 검증

  - [x] 2.4 재고 관리 로직 구현 (`src/domain/inventory.ts`)
    - `deductStock(state, prizeId)`: 재고 1 차감, 0 이하면 `InventoryError` 반환
    - `isGradeExhausted(state, grade)`: 등급 소진 여부 확인
    - `getAvailableGrades(state)`: 재고 1 이상인 등급 목록 반환
    - `getTotalStock(state)`: 전체 잔여 재고 합계
    - `resolveFallbackGrade(state, targetGrade)`: 대상 등급 소진 시 상위→하위 순 폴백 등급 결정
    - _요구사항: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.5 Property 3 속성 테스트: 재고 차감 정확성 및 음수 불가
    - **Property 3: 재고 차감 정확성 및 음수 불가**
    - **검증: 요구사항 3.1, 3.2, 3.3**
    - 임의 재고 상태 + 유효 차감 시퀀스에서 총 차감 횟수만큼 감소하며 음수 불가, 재고 0 차감 시 에러 반환 검증

  - [ ]* 2.6 Property 9 속성 테스트: 재고 폴백은 항상 재고 양수인 등급
    - **Property 9: 재고 폴백은 항상 재고 양수인 등급**
    - **검증: 요구사항 2.4, 3.5**
    - 임의 재고 상태에서 `resolveFallbackGrade()` 반환값이 null이 아닌 경우 해당 등급 재고 ≥ 1 검증

  - [x] 2.7 멀티 드로우 관리 로직 구현 (`src/domain/multiDraw.ts`)
    - `resolveMultiDrawGrades(count, table, state)`: DrawCount만큼 DestinedGrade 배열 확정
    - `resolveMaxGrade(grades: Grade[])`: destinedGrades 배열에서 GRADE_ORDER 기준 최고 등급 반환
    - 각 DestinedGrade 확정 시 재고 가용 여부 확인 및 폴백 규칙 적용
    - _요구사항: 5.2, 5.3, 5.8_

  - [ ]* 2.8 Property 7 속성 테스트: 멀티 드로우 MaxGrade는 배열의 최댓값
    - **Property 7: 멀티 드로우 MaxGrade는 destinedGrades 배열의 최댓값**
    - **검증: 요구사항 5.3**
    - 임의 Grade 배열에서 `resolveMaxGrade()` 결과가 GRADE_ORDER 기준 최댓값과 동일함을 검증

  - [ ]* 2.9 Property 8 속성 테스트: 멀티 드로우 결과 목록 항목 수는 DrawCount와 동일
    - **Property 8: 멀티 드로우 결과 목록 항목 수는 DrawCount와 동일**
    - **검증: 요구사항 5.6**
    - 임의 DrawCount와 재고 상태에서 `resolveMultiDrawGrades()` 반환 배열 길이가 DrawCount와 동일함을 검증

- [x] 3. DrawSession 상태 전환 로직 구현
  - [x] 3.1 DrawSession 상태 전환 순수 함수 구현 (`src/domain/session.ts`)
    - `createDrawSession(destinedGrade, clickThreshold)`: 초기 DrawSession 생성
    - `registerClick(session)`: 클릭 등록 → clickCount +1 또는 RevealEvent 결정
    - `applyUpgradeEvent(session)`: UpgradeEvent 적용 (clickCount 초기화, currentGrade 승급, 상태 전환)
    - `applyBurstEvent(session)`: BurstEvent 적용 (status: COMPLETED)
    - `lockSession(session)`, `unlockSession(session)`: 잠금/해제 상태 전환
    - _요구사항: 1.2, 1.5, 1.6, 1.7, 1.8, 1.10, 2.2_

  - [ ]* 3.2 Property 4 속성 테스트: Orb 클릭 카운트 단조 증가 및 RevealEvent 정확성
    - **Property 4: Orb 클릭 카운트 단조 증가 및 RevealEvent 정확성**
    - **검증: 요구사항 1.2, 1.5, 1.6, 1.7**
    - WAITING_CLICK 상태에서 클릭 시 clickCount +1 또는 RevealEvent 발생, 감소/2이상 증가 없음을 검증

  - [ ]* 3.3 Property 5 속성 테스트: DrawSession 중 DestinedGrade 불변성
    - **Property 5: DrawSession 중 DestinedGrade 불변성**
    - **검증: 요구사항 2.2**
    - WAITING_CLICK/UPGRADE_IN_PROGRESS 상태에서 임의 클릭·업그레이드 이벤트 적용 후 destinedGrade 불변 검증

  - [ ]* 3.4 Property 6 속성 테스트: 잠금 상태에서 클릭 입력 무시
    - **Property 6: 잠금 상태에서 클릭 입력 무시**
    - **검증: 요구사항 1.10**
    - isLocked=true 상태에서 클릭 시 모든 게임 상태(clickCount, currentGrade, destinedGrade)가 불변임을 검증

- [-] 4. 체크포인트 - 도메인 레이어 테스트 통과 확인
  - 모든 도메인 단위 테스트 및 속성 테스트가 통과하는지 확인한다. 문제가 있으면 사용자에게 질문한다.

- [ ] 5. 설정 검증 및 Zustand 스토어 구현
  - [~] 5.1 설정 검증 함수 구현 (`src/config/validateConfig.ts`)
    - `validateConfig(config, probTable, prizes)`: 확률 합계, clickThreshold 범위, 등급별 상품 최소 1개 assertion
    - _요구사항: 1.12, 1.13, 2.6_

  - [~] 5.2 이력 기록 스토어 구현 (`src/store/historyStore.ts`)
    - `addPrizeRecord(result)`: PrizeRecord 추가 (sequenceNumber 자동 증가, issuedAt 기록)
    - `getTodayRecords()`: 당일 00:00 이후 기록만 조회, 시간 역순 정렬, 최대 50건 반환
    - `clearHistory()`: 이력 초기화
    - _요구사항: 4.4, 4.5_

  - [ ]* 5.3 Property 10 속성 테스트: 이력 기록 지급 순서 단조 증가 및 중복 없음
    - **Property 10: 이력 기록 지급 순서 단조 증가 및 중복 없음**
    - **검증: 요구사항 4.4**
    - 임의의 PrizeRecord 추가 시퀀스에서 sequenceNumber 단조 증가·중복 없음, 최대 50건 제한 검증

  - [~] 5.4 재고 스토어 구현 (`src/store/inventoryStore.ts`)
    - `initInventory(prizes)`: PrizeConfig 배열로 초기 재고 설정
    - `deductStock(prizeId)`, `getAvailableGrades()`, `getTotalStock()` 액션
    - domain 함수를 호출하여 상태 변이
    - _요구사항: 3.1, 3.2, 3.3, 3.6_

  - [~] 5.5 메인 게임 스토어 구현 (`src/store/gameStore.ts`)
    - `GamePhase` 상태 전환 액션 구현 (`startSession`, `registerClick`, `applyUpgrade`, `applyBurst`, `resetSession`)
    - `DrawSelector` 연동: `setDrawCount`, `startMultiDraw`
    - 도메인 함수(`createDrawSession`, `registerClick` 등) 호출
    - _요구사항: 1.1, 1.5, 1.6, 1.8, 1.9, 5.2, 5.3, 5.4_

- [ ] 6. 오디오 및 이펙트 시스템 구현
  - [~] 6.1 사운드 매니저 구현 (`src/audio/soundManager.ts`)
    - Howler.js 기반 `SoundManager` 클래스 (싱글톤)
    - `load(key, url)`, `play(key)`, `setEnabled(enabled)` 메서드
    - 로드 실패 시 콘솔 경고만 기록하고 계속 동작
    - _요구사항: 7.3, 7.5, 7.6, 7.7_

  - [~] 6.2 PixiJS 파티클 엔진 구현 (`src/effects/particleEngine.ts`)
    - `createParticleEmitter(app, config)`: 파티클 이미터 생성
    - 클릭 파티클(소형), 버스트 파티클(대형) 2종 지원
    - _요구사항: 7.1_

  - [~] 6.3 PixiJS 빛 번쩍 이펙트 구현 (`src/effects/flashEffect.ts`)
    - `playFlashEffect(app, grade)`: 전체 화면 오버레이 빛 번쩍 (0.3초 이내 시작)
    - `Promise<void>` 반환으로 완료 시점 제어
    - _요구사항: 7.2_

  - [~] 6.4 PixiJS 버스트 이펙트 구현 (`src/effects/burstEffect.ts`)
    - `playBurstEffect(app, grade)`: 등급별 전용 폭발 이펙트
    - `GRADE_EFFECTS` 설정에서 `burstDuration`, `particleColor`, `particleCount` 읽기
    - Primeval은 다른 등급 중 최대 burstDuration × 2 이상 보장
    - `Promise<void>` 반환
    - _요구사항: 7.1, 7.4_

- [ ] 7. React 컴포넌트 구현
  - [~] 7.1 `EffectLayer` 컴포넌트 구현 (`src/components/EffectLayer/`)
    - PixiJS Application을 React에서 관리하는 래퍼 컴포넌트
    - `useImperativeHandle`로 `EffectLayerHandle` 인터페이스 노출
    - `playUpgradeEffect`, `playBurstEffect`, `playClickEffect`, `playIdleEffect` 구현
    - WebGL 미지원 시 Canvas 2D 자동 폴백
    - _요구사항: 1.2, 1.8, 1.9, 6.4, 7.1, 7.2_

  - [~] 7.2 `Orb` 컴포넌트 구현 (`src/components/Orb/`)
    - `motion.div` 기반, `useAnimate()`로 클릭 셰이크 구현
    - CSS Custom Properties로 등급별 색상·광원 동적 적용
    - intensity(0~1) 기반 셰이크 진폭/빈도 비례 증가
    - 80% 이상 구간: `useEffect` + `animate()` repeat:Infinity 지속 진동
    - `isLocked=true` 시 클릭 입력 차단
    - _요구사항: 1.2, 1.3, 1.4, 1.10, 1.11_

  - [~] 7.3 `useOrbInteraction` 훅 구현 (`src/hooks/useOrbInteraction.ts`)
    - 클릭 이벤트 → gameStore 액션 → EffectLayer 트리거 조율
    - `clickCount`, `currentGrade`, `isLocked`, `handleOrbClick` 반환
    - _요구사항: 1.2, 1.3, 1.5, 1.6, 1.10_

  - [~] 7.4 `useEffectSequencer` 훅 구현 (`src/hooks/useEffectSequencer.ts`)
    - `playUpgradeSequence(from, to)`: 빛 번쩍 → Orb 변신 → 상태 전환 Promise 체인
    - `playBurstSequence(grade)`: 버스트 이펙트 → ResultScreen 전환 Promise 체인
    - 사운드와 시각 이펙트 100ms 이내 동기화
    - _요구사항: 1.8, 1.9, 7.3_

  - [~] 7.5 `DrawSelector` 컴포넌트 구현 (`src/components/DrawSelector/`)
    - 사전 설정값의 DrawCountOption 목록 표시
    - 잔여 재고 < DrawCount 옵션은 비활성화
    - 연출 중 모든 UI 조작 비활성화
    - 최소 터치 대상 48dp × 48dp 보장
    - _요구사항: 5.1, 5.7, 5.9, 6.2_

  - [~] 7.6 `ResultScreen` 컴포넌트 구현 (`src/components/ResultScreen/`)
    - 상품 이미지, 이름(최대 폰트), 등급 표시
    - Motion stagger로 항목 순차 등장
    - 이미지 로드 실패 시 등급 색상 + 이름 텍스트 폴백
    - 당일 지급 이력 목록 (시간 역순, 최대 50건)
    - 30초 자동 전환 타이머
    - 멀티 드로우 시 DrawCount개 결과 목록 표시
    - _요구사항: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 5.6_

  - [~] 7.7 `SessionEnd` 컴포넌트 구현 (`src/components/SessionEnd/`)
    - 전체 재고 소진 시 세션 종료 안내 화면 표시
    - _요구사항: 3.6_

  - [~] 7.8 `useOrientation` 훅 구현 (`src/hooks/useOrientation.ts`)
    - `ResizeObserver` 또는 `window.matchMedia`로 화면 방향 감지
    - `orientation`, `isTransitioning` 반환
    - 방향 전환 1초 이내 레이아웃 재구성
    - _요구사항: 6.7_

- [~] 8. 체크포인트 - 컴포넌트 단위 테스트 확인
  - Orb 비활성화 상태 클릭 무시, ResultScreen 이미지 폴백, DrawSelector 버튼 비활성화, 30초 타이머 등 컴포넌트 테스트가 통과하는지 확인한다. 문제가 있으면 사용자에게 질문한다.

- [ ] 9. `GachaApp` 루트 컴포넌트 및 전체 연결
  - [~] 9.1 `GachaApp` 컴포넌트 구현 (`src/components/GachaApp/`)
    - `GamePhase`에 따른 화면 전환 라우터 역할
    - `AnimatePresence`로 화면 마운트/언마운트 진입·퇴장 애니메이션
    - `ErrorBoundary` 최상위 배치
    - `validateConfig()` 앱 부트스트랩 시 실행
    - `EffectLayer` + `Orb` 오버레이 레이아웃
    - _요구사항: 1.1, 4.3, 4.6, 6.1, 6.3_

  - [~] 9.2 CSS 레이아웃 및 태블릿 반응형 스타일 구현
    - CSS Modules + CSS Custom Properties로 등급별 테마 색상
    - 가로/세로 모드 태블릿 해상도(768px×1024px ~ 1600px×2560px) 대응 레이아웃
    - 터치 대상 최소 48dp × 48dp, 인접 요소 간격 8dp 이상
    - _요구사항: 6.1, 6.2_

  - [~] 9.3 `src/main.tsx` 엔트리포인트 구현
    - React 18 `createRoot` 마운트
    - `validateConfig` 호출 후 앱 초기화
    - 정적 설정값(prizes, probability, session) 주입
    - _요구사항: 2.3_

- [ ] 10. 통합 테스트 구현
  - [ ]* 10.1 단일 드로우 전체 흐름 통합 테스트
    - DrawSession 시작 → Orb 클릭 × ClickThreshold → RevealEvent → ResultScreen 전환
    - _요구사항: 1.1~1.9, 2.1, 2.2, 4.1_

  - [ ]* 10.2 멀티 드로우 전체 흐름 통합 테스트
    - DrawCount 선택 → MaxGrade 연출 → 목록 ResultScreen 표시
    - _요구사항: 5.1~5.6_

  - [ ]* 10.3 재고 소진 후 SessionEnd 전환 통합 테스트
    - 전체 재고 소진 시 `SESSION_END` 상태 전환 및 SessionEnd 컴포넌트 렌더링
    - _요구사항: 3.6_

  - [ ]* 10.4 화면 방향 전환 후 게임 상태 유지 통합 테스트
    - 방향 전환 전후 clickCount, currentGrade 동일 유지 검증
    - _요구사항: 6.7_

- [~] 11. 최종 체크포인트 - 전체 테스트 통과 확인
  - 모든 단위 테스트, 속성 테스트, 통합 테스트가 통과하는지 확인한다. 문제가 있으면 사용자에게 질문한다.

---

## 노트

- `*` 표시된 태스크는 선택 사항으로 MVP 속도를 위해 건너뛸 수 있다.
- 각 태스크는 특정 요구사항을 참조하여 추적성을 확보한다.
- 체크포인트는 점진적 검증을 보장한다.
- 속성 테스트(PBT)는 보편적 정확성 속성을, 단위 테스트는 구체적 예시와 엣지 케이스를 검증한다.
- 도메인 레이어는 React/PixiJS 의존 없이 단독 테스트 가능하다.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.4", "2.7"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "2.6", "2.8", "2.9", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "5.1", "5.2", "5.4"] },
    { "id": 4, "tasks": ["5.3", "5.5"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.5", "7.6", "7.7", "7.8"] },
    { "id": 7, "tasks": ["7.3", "7.4"] },
    { "id": 8, "tasks": ["9.1", "9.2", "9.3"] },
    { "id": 9, "tasks": ["10.1", "10.2", "10.3", "10.4"] }
  ]
}
```
