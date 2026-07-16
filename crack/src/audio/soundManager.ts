import { Howl } from 'howler';

/**
 * 사운드 관리자 싱글톤 클래스
 *
 * Howler.js 기반 사운드 로드 및 재생 관리.
 * 로드 실패 시 콘솔 경고를 기록하고 계속 동작한다.
 *
 * Validates: Requirements 7.3, 7.5, 7.6, 7.7
 */
export class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, Howl> = new Map();
  private enabled: boolean = true;

  private constructor() {}

  /**
   * SoundManager 싱글톤 인스턴스를 반환한다.
   */
  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * 사운드를 로드한다.
   *
   * 로드 실패 시 콘솔 경고를 기록하고 계속 동작한다.
   *
   * @param key - 사운드 고유 식별자
   * @param url - 사운드 파일 URL
   */
  load(key: string, url: string): void {
    if (this.sounds.has(key)) {
      return; // 이미 로드된 사운드
    }

    const howl = new Howl({
      src: [url],
      autoplay: false,
      preload: true,
    });

    howl.on('loaderror', () => {
      console.warn(`[SoundManager] 사운드 로드 실패: ${key} (${url})`);
    });

    this.sounds.set(key, howl);
  }

  /**
   * 사운드를 재생한다.
   *
   * - 활성화 상태가 아니면 무시한다.
   * - 해당 사운드가 로드되지 않았으면 무시한다.
   *
   * @param key - 사운드 고유 식별자
   */
  play(key: string): void {
    if (!this.enabled) {
      return;
    }

    const sound = this.sounds.get(key);
    if (!sound) {
      console.warn(`[SoundManager] 재생할 사운드를 찾을 수 없습니다: ${key}`);
      return;
    }

    sound.play();
  }

  /**
   * 사운드 재생 활성화/비활성화를 설정한다.
   *
   * @param enabled - true일 때 사운드 재생, false일 때 무시
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 현재 사운드 활성화 상태를 반환한다.
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
