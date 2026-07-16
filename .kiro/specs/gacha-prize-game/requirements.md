# 요구사항 문서

## 소개

던전앤파이터의 "태초 소환" 방식에서 영감을 받은 오프라인 이벤트용 경품 추첨 가챠 게임이다.
태블릿에서 동작하며, 팬 사인회·페스티벌 등 현장 행사에서 직원이 참가자에게 기기를 건네면 참가자가 직접 뽑기를 진행하고, 결과 확인 후 즉시 실물 상품을 수령하는 방식으로 운영된다.

MVP 범위는 유저가 직접 조작하는 게임 화면이며, 관리자 설정값(등급별 상품 목록, 확률, 연속 뽑기 옵션 등)은 사전에 주입된 정적 데이터로 가정한다.

---

## 용어 사전

- **GachaGame**: 경품 추첨 가챠 게임 전체 시스템
- **Orb**: 화면에 등장하는 클릭 대상 구체(또는 상자). 클릭에 반응하여 이펙트가 누적됨
- **Grade**: 등급. 일반(Normal) → 희귀(Rare) → 전설(Epic) → 태초(Primeval) 4단계
- **ClickThreshold**: 판정이 발생하기 위한 최소 클릭 수
- **RevealEvent**: ClickThreshold 도달 후 발생하는 등급 판정 이벤트
- **UpgradeEvent**: RevealEvent에서 현재 등급이 다음 등급으로 상승하는 이벤트
- **BurstEvent**: RevealEvent에서 현재 등급 보상이 최종 확정되는 이벤트
- **PrizePool**: 관리자가 사전에 등록한 상품 재고 풀
- **PrizeResult**: 한 회차 뽑기의 최종 확정 보상
- **EffectLayer**: 이펙트(빛, 균열, 진동, 슬로우모션 등)를 렌더링하는 UI 레이어
- **ResultScreen**: 뽑기 결과를 보여주는 화면
- **DestinedGrade**: DrawSession 시작 시 확률표에 따라 미리 확정된 최종 등급
- **DrawSession**: 한 참가자의 단일 뽑기 시도. DrawSession 시작부터 BurstEvent 발생까지를 하나의 단위로 정의
- **SessionManager**: 한 행사 세션(전체 재고 소진 또는 관리자 리셋까지)의 상태를 관리하는 컴포넌트
- **MultiDrawManager**: 5연뽑기·10연뽑기 등 연속 뽑기를 처리하는 컴포넌트
- **InventoryTracker**: PrizePool의 재고 차감 및 잔여 수량을 추적하는 컴포넌트

---

## 요구사항

### 요구사항 1: Orb 클릭 인터랙션 및 등급 연출

**사용자 스토리:** 참가자로서, 화면의 구체를 여러 번 클릭하면서 등급이 올라가는 연출을 즐기고 싶다. 클릭할수록 이펙트와 흔들림이 강해지며 기대감이 고조되는 경험을 원한다.

#### 인수 기준

1. WHEN DrawSession이 시작되면, THE GachaGame SHALL 확률표에 따라 DestinedGrade를 1회 결정하고, Orb를 Normal 등급 외형으로 초기화한다.
2. WHEN 참가자가 Orb를 탭/클릭하면, THE Orb SHALL 누적 클릭 수 대비 ClickThreshold 비율(0~100%)에 비례하여 빛 강도와 균열 이펙트 밀도를 EffectLayer에 표시한다.
3. WHEN 참가자가 Orb를 탭/클릭하면, THE Orb SHALL 클릭 직후 셰이크 애니메이션을 1회 재생하되, 셰이크의 진폭과 빈도는 누적 클릭 수에 비례하여 증가한다.
4. WHILE 누적 클릭 수가 ClickThreshold의 80% 이상인 동안, THE Orb SHALL 개별 클릭에 의한 셰이크 애니메이션 종료 후에도 지속적인 셰이크 상태를 유지하며, 누적 클릭 수가 ClickThreshold에 가까워질수록 진폭과 빈도가 단계적으로 증가한다.
5. WHEN 누적 클릭 수가 ClickThreshold에 도달하고 DestinedGrade가 현재 Grade보다 높은 경우, THE GachaGame SHALL UpgradeEvent를 발생시킨다.
6. WHEN 누적 클릭 수가 ClickThreshold에 도달하고 DestinedGrade가 현재 Grade와 동일한 경우, THE GachaGame SHALL BurstEvent를 발생시킨다.
7. IF Grade가 Primeval이면, THEN THE GachaGame SHALL 누적 클릭 수가 ClickThreshold에 도달할 때 반드시 BurstEvent를 발생시킨다.
8. WHEN UpgradeEvent가 발생하면, THE EffectLayer SHALL 최소 1프레임 이상 지속되는 전체 화면 빛 번쩍 효과, 기기 진동, 슬로우모션 연출을 순서대로 재생하고, THE Orb SHALL 0.5초 이상 3.0초 이하의 변신 애니메이션을 재생한 후 다음 Grade 외형으로 전환되며, THE GachaGame SHALL 누적 클릭 수를 0으로 초기화하고 다음 ClickThreshold 대기 상태로 전환한다.
9. WHEN BurstEvent가 발생하면, THE EffectLayer SHALL 현재 Grade에 맞는 등급별 전용 폭발 이펙트와 사운드를 재생하고, 연출이 완료되면 THE GachaGame SHALL ResultScreen을 표시한다.
10. IF UpgradeEvent 또는 BurstEvent 연출이 재생 중이면, THEN THE GachaGame SHALL 추가 클릭 입력을 무시하며 누적 클릭 수를 변경하지 않는다.
11. IF 참가자가 Orb 영역 외부를 탭/클릭하면, THEN THE GachaGame SHALL 해당 입력을 무시하고 누적 클릭 수를 변경하지 않는다.
12. THE GachaGame SHALL ClickThreshold를 5 이상 20 이하의 정수로 설정한다.
13. THE GachaGame SHALL 확률표의 모든 Grade 확률 합이 100%가 되도록 보장한다.

---

### 요구사항 2: DrawSession 시작 및 확률 확정

**사용자 스토리:** 행사 운영자로서, 뽑기 확률을 단순하게 설정하고 싶다. 각 참가자의 등급이 게임 시작 시 명확하게 결정되는 구조를 원한다.

#### 인수 기준

1. WHEN DrawSession이 시작되면, THE GachaGame SHALL 확률표에 따라 DestinedGrade를 1회 결정한다.
2. WHILE DrawSession이 진행 중인 동안, THE GachaGame SHALL DestinedGrade를 변경하지 않고 BurstEvent가 발생할 때까지 유지한다.
3. THE GachaGame SHALL 확률표를 사전 설정값으로 주입하며, 런타임에 확률표를 변경할 수 없도록 보장한다.
4. IF DestinedGrade 결정 시 해당 Grade의 PrizePool 재고가 0이면, THEN THE GachaGame SHALL 재고가 있는 가장 가까운 상위 Grade로 DestinedGrade를 자동 대체하고, 상위 Grade도 모두 소진된 경우 재고가 있는 가장 가까운 하위 Grade로 대체한다.
5. THE GachaGame SHALL 결정된 DestinedGrade를 BurstEvent 연출 전까지 참가자에게 노출하지 않는다.
6. THE GachaGame SHALL 각 Grade의 확률이 0% 초과 100% 미만의 실수이며 모든 Grade 확률의 합이 100%가 되도록 보장한다.

---

### 요구사항 3: 상품 재고 관리

**사용자 스토리:** 행사 운영자로서, 상품이 실제 재고보다 더 많이 지급되는 일이 없어야 한다. 참가자로서, 이미 뽑힌 상품과 남은 상품을 명확히 구별하고 싶다.

#### 인수 기준

1. THE InventoryTracker SHALL 각 Grade별 상품의 잔여 수량을 추적하며, 잔여 수량이 0이 되면 해당 Grade를 소진 상태로 전환한다.
2. WHEN BurstEvent로 PrizeResult가 확정되면, THE InventoryTracker SHALL 해당 상품의 재고를 1 차감하고, 차감 후 잔여 수량이 0이 되면 해당 Grade를 소진 상태로 전환한다.
3. IF InventoryTracker가 특정 상품의 잔여 수량이 0인 상태에서 해당 상품에 대한 재고 차감 요청을 받으면, THEN THE InventoryTracker SHALL 차감을 수행하지 않고 오류 상태를 기록한다.
4. IF 특정 Grade의 상품 재고가 0(소진 상태)이면, THEN THE GachaGame SHALL 해당 Grade를 후보 등급 목록에서 제외한다.
5. IF 뽑기 판정 시 대상 Grade의 재고가 0이고 모든 상위 Grade도 소진된 경우, THEN THE GachaGame SHALL 잔여 수량이 1 이상인 Grade 중 가장 높은 Grade의 상품으로 자동 대체하여 지급한다.
6. WHEN 모든 Grade의 잔여 수량이 0이 되면, THE SessionManager SHALL 추가 뽑기를 비활성화하고 세션 종료 안내를 표시한다.
7. THE GachaGame SHALL 결과 화면 또는 별도 UI 영역에서 지급 완료 상태의 상품과 잔여 상태의 상품을 시각적으로 구별하여 표시한다.

---

### 요구사항 4: 결과 화면 및 상품 전달 안내

**사용자 스토리:** 참가자로서, 뽑기 결과를 명확하게 확인하고 싶다. 현장 직원으로서, 어떤 상품을 전달해야 하는지 즉시 파악하고 싶다.

#### 인수 기준

1. WHEN BurstEvent 연출이 완료되면, THE ResultScreen SHALL 확정된 PrizeResult의 상품 이미지, 이름, 등급을 표시한다.
2. THE ResultScreen SHALL 상품 이름을 화면 내 다른 모든 텍스트보다 큰 폰트 크기로 표시한다.
3. WHEN 참가자 또는 직원이 결과 확인 버튼을 누르면, THE GachaGame SHALL 3초 이내에 초기 Orb 화면으로 전환한다.
4. THE ResultScreen SHALL 당일 00:00 이후 지급된 상품 목록을 시간 역순으로 최대 50건까지, 상품 이름·등급·지급 순서를 포함하여 별도 영역에 표시한다.
5. WHEN 결과 화면에서 다음 참가자 전환이 이루어지면, THE SessionManager SHALL 이전 PrizeResult 기록을 유지한 상태로 신규 Orb 세션 상태를 준비한다.
6. WHEN BurstEvent 연출이 완료된 후 30초 이내에 결과 확인 버튼이 눌리지 않으면, THE GachaGame SHALL 자동으로 초기 Orb 화면으로 전환한다.
7. IF ResultScreen에서 상품 이미지 로드에 실패하면, THEN THE ResultScreen SHALL 이미지 영역에 등급 색상 및 상품 이름 텍스트를 대체 표시한다.

---

### 요구사항 5: 연속 뽑기(멀티 드로우)

**사용자 스토리 1:** 참가자로서, 여러 개를 한 번에 뽑고 싶다. 가장 높은 등급까지 올라가는 연출을 보고 싶다.

**사용자 스토리 2:** 행사 운영자로서, 뽑기 시작 전에 몇 개를 뽑을지 선택할 수 있어야 한다.

#### 인수 기준

1. WHEN 멀티 드로우 시작 전, THE GachaGame SHALL 참가자 또는 운영자가 사전 설정값으로 정의된 범위 내에서 뽑기 횟수(DrawCount)를 선택할 수 있도록 한다.
2. WHEN 멀티 드로우가 시작되면, THE MultiDrawManager SHALL DrawCount 수만큼 DestinedGrade를 한 번에 모두 확정한다.
3. WHEN DrawCount개의 DestinedGrade가 확정되면, THE MultiDrawManager SHALL 확정된 DestinedGrade 중 가장 높은 등급을 MaxGrade로 설정한다.
4. WHEN MaxGrade가 결정되면, THE GachaGame SHALL Orb 연출을 단 1회 진행하되, Normal에서 시작하여 MaxGrade까지 UpgradeEvent를 순서대로 진행하고 MaxGrade에서 BurstEvent를 발생시킨다.
5. IF MaxGrade가 Normal이면, THEN THE GachaGame SHALL UpgradeEvent 없이 바로 Normal BurstEvent를 발생시킨다.
6. WHEN BurstEvent 연출이 완료되면, THE ResultScreen SHALL DrawCount개의 DestinedGrade 전체를 목록으로 표시한다.
7. IF 멀티 드로우 시작 시점에 PrizePool의 잔여 재고가 DrawCount에 미치지 못하면, THEN THE MultiDrawManager SHALL 뽑기를 시작하지 않고 잔여 재고 수량과 함께 안내 메시지를 표시한다.
8. WHEN DestinedGrade를 확정할 때, THE MultiDrawManager SHALL 각 등급의 재고 가용 여부를 확인하고, 재고가 없는 등급에 대해서는 요구사항 2의 인수 기준 4번의 자동 대체 규칙을 적용한다.
9. WHILE Orb 연출이 진행 중인 동안, THE GachaGame SHALL 뽑기 시작 버튼, 횟수 선택 등 모든 UI 조작을 비활성화한다.

---

### 요구사항 6: 태블릿 최적화 UI/UX

**사용자 스토리:** 현장 직원으로서, 태블릿 화면에서 별도 설정 없이 즉시 사용할 수 있는 UI가 필요하다. 참가자로서, 태블릿에서 손가락으로 편하게 조작하고 싶다.

#### 인수 기준

1. THE GachaGame SHALL 가로 모드(landscape) 및 세로 모드(portrait) 태블릿 해상도(최소 768px × 1024px, 최대 1600px × 2560px) 범위에서 모든 UI 요소가 화면 경계를 벗어나거나 서로 겹치지 않고 표시된다.
2. THE GachaGame SHALL 모든 탭/터치 대상 요소의 크기를 최소 48dp × 48dp 이상으로, 인접 터치 대상 간 최소 간격을 8dp 이상으로 설정한다.
3. THE GachaGame SHALL 가챠 실행, 결과 확인, 화면 종료 전체 흐름을 외부 입력 장치(키보드, 마우스) 없이 터치만으로 완료할 수 있도록 설계된다.
4. WHILE EffectLayer가 전체 화면 이펙트를 재생하는 동안, THE GachaGame SHALL 프레임 간격이 16.7ms를 초과하지 않는 60fps 이상의 렌더링 성능을 유지한다.
5. IF 기기가 진동 기능을 지원하지 않으면, THEN THE GachaGame SHALL 진동 없이 시각 및 음향 이펙트만 정상 재생한다.
6. IF 참가자가 터치 이벤트를 처리하지 않는 비대상 영역을 탭하면, THEN THE GachaGame SHALL 해당 입력을 무시하고 현재 게임 상태를 유지한다.
7. WHEN 화면 방향 전환이 발생하면, THE GachaGame SHALL 1초 이내에 레이아웃을 재구성하고 전환 직전의 게임 상태(누적 클릭 수, 현재 Grade 등)를 유지한다.

---

### 요구사항 7: 이펙트 및 사운드 시스템

**사용자 스토리:** 참가자로서, 등급에 따라 차별화된 화려한 시각·청각 연출을 경험하고 싶다. 도파민이 터지는 경험이 MVP의 핵심이다.

#### 인수 기준

1. THE EffectLayer SHALL 등급(Normal, Rare, Epic, Primeval)별로 파티클 색상, 파티클 수량, 화면 흔들림 여부, 연출 지속 시간 중 하나 이상의 속성에서 다른 등급과 명확히 구별되는 이펙트 세트를 보유한다.
2. WHEN UpgradeEvent 연출이 시작되면, THE EffectLayer SHALL 화면 전체를 덮는 빛 번쩍 이펙트를 0.3초 이내에 시작한다.
3. THE GachaGame SHALL 이펙트 재생 중 사운드와 시각 이펙트의 동기화 오차를 100ms 이내로 유지한다.
4. WHEN Primeval BurstEvent가 발생하면, THE EffectLayer SHALL Normal·Rare·Epic BurstEvent 중 가장 긴 연출 시간의 2배 이상인 전용 연출을 재생한다.
5. WHERE 사운드 재생이 활성화된 경우, THE GachaGame SHALL Normal·Rare·Epic·Primeval 각 등급의 BurstEvent 및 UpgradeEvent에 대해 고유한 사운드를 재생한다.
6. IF 사운드 재생이 비활성화된 경우, THEN THE GachaGame SHALL 사운드 없이 시각 이펙트만 정상 재생한다.
7. IF 사운드 파일 로드에 실패하면, THEN THE GachaGame SHALL 사운드 없이 시각 이펙트 재생을 정상적으로 지속하며 사운드 오류를 기록한다.
8. IF Primeval BurstEvent 연출 재생 중 사용자 인터럽트(화면 탭 등)가 발생하면, THEN THE GachaGame SHALL 해당 인터럽트를 무시하고 연출이 완료된 후 ResultScreen으로 전환한다.
