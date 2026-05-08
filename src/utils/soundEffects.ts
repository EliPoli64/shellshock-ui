import { Howl } from 'howler';

// Sound effect URLs from public CDNs
const SOUNDS = {
  shotLive: 'https://assets.mixkit.co/active_storage/sfx/1693/1693-preview.mp3', // Shotgun blast DONE
  shotBlank: 'https://assets.mixkit.co/active_storage/sfx/1659/1659-preview.mp3', // Metallic click DONE
  itemUse: 'https://assets.mixkit.co/active_storage/sfx/1659/1659-preview.mp3', // Generic click/shuffle DONE
  reload: 'https://assets.mixkit.co/active_storage/sfx/1666/1666-preview.mp3', // Racking/Reloading DONE
  turnStart: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Subtle pop DONE
  win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Victory chime
  loss: 'https://assets.mixkit.co/active_storage/sfx/253/253-preview.mp3', // Low hit/fail
  uiClick: 'https://assets.mixkit.co/active_storage/sfx/2568/2571-preview.mp3', // Soft UI click
  keyPress: 'https://assets.mixkit.co/active_storage/sfx/2568/2571-preview.mp3', // Keyboard typing sound (reusing soft click for now)
};

class SoundManager {
  private sounds: Map<string, Howl> = new Map();
  private isMuted: boolean = false;

  constructor() {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      this.sounds.set(key, new Howl({
        src: [url],
        volume: 0.5,
        preload: true
      }));
    });
  }

  play(soundName: keyof typeof SOUNDS) {
    if (this.isMuted) return;
    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.play();
    }
  }

  setVolume(volume: number) {
    Object.values(this.sounds).forEach(sound => sound.volume(volume));
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
  }
}

export const soundManager = new SoundManager();
