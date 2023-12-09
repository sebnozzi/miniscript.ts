
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
    function(path: string): Promise<HashMap | null> {
      const fullPath = outerThis.resolveFullUrl(path);
      if (path === null || path === "") {
        return new Promise((resolve) => {
          resolve(null);
        });
      }
      return outerThis.loadImage(fullPath);
    });

    vm.addMapIntrinsic(fileMap, 'loadSound(path="")',
    function(path: string): Promise<HashMap | null> {
      const fullPath = outerThis.resolveFullUrl(path);
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

  loadImage(url: string): Promise<HashMap | null> {
    const img = document.createElement("img") as HTMLImageElement;
    const promise = new Promise<HashMap | null>((resolve) => {
      img.onload = () => {
        const map = toImageMap(this.vm, img);
        resolve(map);
      };
      img.onerror = () => {
        console.error(`Could not load image ${url}`);
        resolve(null);
      }
    });
    img.src = url;  
    return promise;
  }

  resolveFullUrl(path: string): string {
    if (path.indexOf("/") === 0) {
      return this.resolveAbsolutePathUrl(path);
    } else {
      return this.resolveRelativePathUrl(path);
    }
  }

  resolveRelativePathUrl(path: string): string {
    return `${this.remotePath}${path}`;
  }

  resolveAbsolutePathUrl(path: string): string {
    return path;
  }

}