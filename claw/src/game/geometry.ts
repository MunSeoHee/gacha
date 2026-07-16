/**
 * 집게 하강/상승과 잡힌 오브젝트의 위치·타이밍 공용 상수.
 * Claw(헤드)와 GrabLayer(잡힌 오브젝트)가 같은 값을 공유해 서로 붙어 움직이게 한다.
 */

/** 팔(케이블) 길이 — 재생 영역 높이 대비 %. 내렸을 때 / 올렸을 때 */
export const ARM_DEPTH = { down: 68, up: 15 } as const;

/**
 * 잡힌 오브젝트의 세로 위치 — 탱크 바닥 기준 %.
 * 집게 그립이 내려간 지점(down) / 올라온 지점(up)에 대응.
 */
export const GRIP_BOTTOM = { down: 24, up: 74 } as const;

/** 하강 애니메이션 시간(ms) */
export const DROP_MS = 750;
/** 잡기(정지 후 상승) 애니메이션 시간(ms) */
export const GRAB_MS = 1250;

/** 잡힌 오브젝트 이동 키프레임 진행 비율: 더미→그립(down)→그립(up) */
export const GRAB_TIMES = [0, 0.34, 1];

/** 집게가 바닥에 머문 뒤 상승을 시작하는 지연(초) — GRAB_TIMES와 맞춤 */
export const CLAW_RISE_DELAY = (GRAB_MS / 1000) * GRAB_TIMES[1];
/** 집게 상승 시간(초) */
export const CLAW_RISE_DURATION = GRAB_MS / 1000 - CLAW_RISE_DELAY;
