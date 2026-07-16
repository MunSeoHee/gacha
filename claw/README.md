# 인형뽑기 경품 추첨 (claw)

쿠지 방식 경품 뽑기 웹 게임 MVP. 프론트엔드 전용.
React + Vite + TypeScript + [motion.dev](https://motion.dev/) + zustand.

## 실행

```bash
npm install   # 최초 1회 (node_modules가 이미 복사돼 있으면 생략 가능)
npm run dev   # http://localhost:5173
```

## 게임 흐름

`idle` → (1/5/10회 선택) → `aiming` → (내리기·10초 자동) → `dropping` → `grabbing` → `revealing` → `idle`

- **1회 = 집게 / 5회 = 자석 / 10회 = 포크레인 바가지** (선택 시 헤드 교체)
- 조준 단계에서 좌우 이동 + 내리기. 10초 내 안 내리면 현 위치 자동 하강.
- 결과는 게임 시작 시 재고 풀을 셔플해 확정(비복원 추첨), 꽝 없음.
- 뽑은 오브젝트가 트레이에 나열 → 클릭해 등급 공개.

## 상품/재고 설정

- `src/config/prizes.ts` — 등급별 상품명·재고 (A상 5 … F상 500). 재고가 곧 확률.
- `src/config/grades.ts` — 등급별 표시 테마(라벨/색상/반짝임).

## 에셋 교체 가이드 (현재는 CSS 도형 플레이스홀더)

실제 이미지로 바꿀 때 손대는 곳:

| 대상 | 위치 | 현재 상태 |
|---|---|---|
| 기계 안 오브젝트 (캡슐/인형/상자) | `public/images/objects/` + `config/objects.ts` | 파일 넣고 `OBJECT_IMAGES`에 등록하면 렌더(없으면 CSS 도형 폴백) |
| 집게 3종 (집게/자석/포크레인) 헤드 | `components/Claw/` (`ToolHead`) | CSS 도형 → 스프라이트, 열림/닫힘 상태 필요 |
| 기계 프레임·유리·레일 | `components/Machine/Machine.module.css` | CSS |
| 상품 공개 이미지 | `public/images/prizes/{A~F}.png` | 결과 카드에 렌더(파일 없으면 🎁 폴백). 경로는 `prizes.ts`의 `imageUrl` |
| 사운드 (선택) | 미구현 | 모터/하강/잡기/성공음 |

## 구조

```
src/
  domain/      추첨 로직 (types, pool: 셔플·비복원 추첨)
  config/      prizes, grades
  game/        objects (더미 배치 생성)
  store/       gameStore (zustand 상태 머신, 단계 전환은 타이머 기반)
  components/  App, Machine, Claw, ObjectShape, Controls, ResultTray
```

> 단계 전환은 애니메이션 완료 콜백이 아니라 **타이머**로 진행한다.
> 탭 비활성 시 rAF가 멈춰도 게임이 멈추지 않도록 하기 위함(모바일 백그라운드 대응).
