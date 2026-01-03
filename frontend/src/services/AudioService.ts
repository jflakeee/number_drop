import { useSettingsStore } from '@store/settingsStore';

type SoundType = 'merge' | 'drop' | 'combo' | 'gameOver' | 'button';

class AudioServiceClass {
  private bgm: HTMLAudioElement | null = null;
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // TODO: Load audio files
    // this.bgm = new Audio('/assets/sounds/bgm.mp3');
    // this.bgm.loop = true;
    // this.sounds.set('merge', new Audio('/assets/sounds/merge.mp3'));
    // this.sounds.set('drop', new Audio('/assets/sounds/drop.mp3'));

    this.isInitialized = true;
    console.log('AudioService initialized');
  }

  playBGM(): void {
    const { musicEnabled, musicVolume } = useSettingsStore.getState();
    if (!musicEnabled || !this.bgm) return;

    this.bgm.volume = musicVolume;
    this.bgm.play().catch(() => {
      // Autoplay blocked
    });
  }

  stopBGM(): void {
    if (!this.bgm) return;
    this.bgm.pause();
    this.bgm.currentTime = 0;
  }

  playSound(type: SoundType): void {
    const { soundEnabled, soundVolume } = useSettingsStore.getState();
    if (!soundEnabled) return;

    const sound = this.sounds.get(type);
    if (!sound) return;

    sound.volume = soundVolume;
    sound.currentTime = 0;
    sound.play().catch(() => {
      // Play failed
    });
  }

  setMusicVolume(volume: number): void {
    if (this.bgm) {
      this.bgm.volume = volume;
    }
  }

  setSoundVolume(volume: number): void {
    this.sounds.forEach((sound) => {
      sound.volume = volume;
    });
  }
}

export const AudioService = new AudioServiceClass();
