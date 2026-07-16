import { useState, useEffect } from 'react';

export type Orientation = 'portrait' | 'landscape';

/**
 * 화면 방향을 감지하는 훅
 *
 * 요구사항: 6.7
 *
 * - window.matchMedia로 화면 방향 감지 (주 방식)
 * - ResizeObserver로 fallback
 * - 방향 전환 1초 이내 레이아웃 재구성
 *
 * @returns orientation: 현재 방향, isTransitioning: 전환 중 여부
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // 초기 방향 설정
    const updateOrientation = () => {
      const isPortrait = window.innerHeight >= window.innerWidth;
      setOrientation(isPortrait ? 'portrait' : 'landscape');
    };

    updateOrientation();

    // window.matchMedia를 사용한 방향 감지
    const mediaQuery = window.matchMedia('(orientation: portrait)');
    const handleOrientationChange = (e: MediaQueryListEvent) => {
      setIsTransitioning(true);
      setOrientation(e.matches ? 'portrait' : 'landscape');

      // 1초 후 전환 완료 표시
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
      }, 1000);

      return () => clearTimeout(timeout);
    };

    // 최신 브라우저와 구형 브라우저 모두 지원
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleOrientationChange);
    } else {
      mediaQuery.addListener(handleOrientationChange);
    }

    // Fallback: ResizeObserver를 사용한 감지
    const resizeObserver = new ResizeObserver(() => {
      updateOrientation();
    });

    resizeObserver.observe(document.documentElement);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleOrientationChange);
      } else {
        mediaQuery.removeListener(handleOrientationChange);
      }
      resizeObserver.disconnect();
    };
  }, []);

  return {
    orientation,
    isTransitioning,
  };
}
