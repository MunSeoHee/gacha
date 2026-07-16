import { useState, type CSSProperties } from 'react';
import type { ObjectKind } from '../../game/objects';
import styles from './ObjectShape.module.css';

interface Props {
  kind: ObjectKind;
  color: string;
  size: number;
  /** 있으면 이미지로 렌더, 로드 실패 시 CSS 도형으로 폴백 */
  imageUrl?: string;
}

/**
 * 기계 안 익명 오브젝트(껍데기)를 그린다.
 * imageUrl 이 있고 로드에 성공하면 이미지를, 아니면 캡슐/인형/상자 CSS 도형을 표시한다.
 */
export function ObjectShape({ kind, color, size, imageUrl }: Props) {
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <img
        className={styles.image}
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        draggable={false}
        onError={() => setFailed(true)}
      />
    );
  }

  const style = { '--obj-color': color, width: size, height: size } as CSSProperties;

  if (kind === 'capsule') {
    return (
      <div className={styles.capsule} style={style}>
        <span className={styles.capsuleTop} />
        <span className={styles.capsuleBottom} />
      </div>
    );
  }

  if (kind === 'box') {
    return (
      <div className={styles.box} style={style}>
        <span className={styles.ribbonV} />
        <span className={styles.ribbonH} />
      </div>
    );
  }

  // doll
  return (
    <div className={styles.doll} style={style}>
      <span className={styles.dollFace}>
        <span className={styles.eye} />
        <span className={styles.eye} />
      </span>
    </div>
  );
}
