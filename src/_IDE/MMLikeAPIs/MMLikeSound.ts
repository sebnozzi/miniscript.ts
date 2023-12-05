
class SoundManager {

  private soundMap = new HashMap();

  playingSounds: Map<HTMLAudioElement, Array<HTMLAudioElement>>;

  constructor(private vm: Processor) {
    this.playingSounds = new Map();
  }

  toSoundMap(nativeSound: HTMLAudioElement): HashMap {
    const instance = new HashMap();
    instance.set("__isa", this.soundMap);
    instance.set("_handle", nativeSound);
    return instance;
  }

  addSoundAPI() {
    const vm = this.vm;
    const outerThis = this;

    vm.addIntrinsic('Sound', 
    function(): HashMap {
      return outerThis.soundMap;
    });

    vm.addMapIntrinsic(this.soundMap, "stopAll",
    function() {
      outerThis.stopAll();
    });

    vm.addMapIntrinsic(this.soundMap, "play(self,volume=1)",
    function(self: any, volume: number) {
      outerThis.play(self, volume);
    });

    vm.addMapIntrinsic(this.soundMap, "stop(self)",
    function(self: any) {
      outerThis.stop(self);
    });

    vm.addMapIntrinsic(this.soundMap, "isPlaying(self)",
    function(self: any): number {
      return outerThis.isPlaying(self);
    });

  }

  play(self: any, volume: number) {
    const outerThis = this;
    const optSnd = this.getNativeSound(self);
    if (optSnd) {
      const soundClone = optSnd.cloneNode() as HTMLAudioElement;
      soundClone.volume = volume;
      const playPromise = soundClone.play();
      playPromise.then(() => {
        outerThis.addPlayingClone(optSnd, soundClone);
        optSnd.addEventListener("ended", () => {
          outerThis.stop(optSnd);
        });
      });
    }
  }

  private addPlayingClone(original: HTMLAudioElement, clone: HTMLAudioElement) {
    let playingClones = this.playingSounds.get(original);
    if (playingClones === undefined) {
      playingClones = new Array();
      this.playingSounds.set(original, playingClones);
    }
    playingClones.unshift(clone);
  }

  private getNativeSound(self: any): HTMLAudioElement | null {
    const vm = this.vm;
    if (self instanceof HashMap) {
      if (isaEquals(vm, self, this.soundMap)) {
        return vm.mapAccessOpt(self, "_handle");
      }
    }
    return null;
  }

  isPlaying(self: any): number {
    const optSnd = this.getNativeSound(self);
    if (optSnd) {
      return this.playingSounds.has(optSnd) ? 1 : 0;
    }
    return 0;
  }

  stop(self: any) {
    const optSnd = this.getNativeSound(self);
    if (optSnd) {
      this.stopNative(optSnd);
    }
  }

  stopAll() {
    const originalSounds = Array.from(this.playingSounds.keys());
    for (let snd of originalSounds) {
      while (this.playingSounds.has(snd)) {
        this.stopNative(snd);
      }
    }
  }

  private stopNative(originalSnd: HTMLAudioElement) {
    const playingClones = this.playingSounds.get(originalSnd);
    if (playingClones && playingClones.length > 0) {
      const oldestClone = playingClones.pop();
      oldestClone?.pause();
      if (playingClones.length === 0) {
        this.playingSounds.delete(originalSnd);
      }
    }
  }

}
