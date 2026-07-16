# 뽑기 오브젝트 이미지 에셋

기계 안에 쌓이는 오브젝트(캡슐/인형/상자 등 익명 껍데기) 이미지를 여기에 넣습니다.
오브젝트는 **상품과 무관한** 껍데기이므로 종류/개수를 자유롭게 정하면 됩니다.

## 넣는 방법

1. 이 폴더(`public/images/objects/`)에 이미지 파일을 넣습니다.
   - 권장: 정사각형에 가까운 투명 배경 PNG (예: 128×128)
2. `src/config/objects.ts` 의 `OBJECT_IMAGES` 배열에 경로를 추가합니다.

```ts
export const OBJECT_IMAGES: string[] = [
  '/images/objects/capsule-red.png',
  '/images/objects/doll-bear.png',
  '/images/objects/box-pink.png',
  // ... 원하는 만큼
];
```

- 목록에 등록된 이미지들이 더미에 **랜덤하게** 배치됩니다 (다양할수록 자연스러움).
- 목록이 비어 있거나 파일 로드에 실패하면 기본 **CSS 도형**(캡슐/인형/상자)으로 표시됩니다.
- 더미 오브젝트 개수는 `src/store/gameStore.ts` 의 `PILE_SIZE` 로 조절합니다.
