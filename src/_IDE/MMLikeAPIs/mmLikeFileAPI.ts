
class MMLikeFileAPI {

  private remotePath: string = "";

  constructor(
    private vm: Processor, 
    private soundApi: SoundManager) {
  }

  setRemotePath(path: string) {
    this.remotePath = path;
  }

  addFileAPI() {
    const vm = this.vm;
    const fileMap = new HashMap();
    const outerThis = this;

    vm.addIntrinsic("file", function() {
      return fileMap;
    })

    vm.addMapIntrinsic(fileMap, 'loadImage(path="")',
    function(path: string): Promise<HTMLImageElement | null> {
      const fullPath = `${outerThis.remotePath}${path}`;
      if (path === null || path === "") {
        return new Promise((resolve) => {
          resolve(null);
        });
      }
      const gfPrim = new GfxPrimitives("gfx");
      return gfPrim.loadImage(fullPath);
    });

    vm.addMapIntrinsic(fileMap, 'loadSound(path="")',
    function(path: string): Promise<HashMap | null> {
      const fullPath = `${outerThis.remotePath}${path}`;
      const sound = document.createElement("audio");
      const promise = new Promise<HashMap | null>((resolve) => {
        sound.addEventListener("canplaythrough", () => {
          const soundMap = outerThis.soundApi.toSoundMap(sound);
          resolve(soundMap);
        });
        sound.addEventListener("error", (event) => {
          resolve(null);
        });
      });
      sound.src = fullPath;
      return promise;
    });

    return fileMap;
  }


}