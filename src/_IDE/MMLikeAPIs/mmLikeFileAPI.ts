import { HashMap } from "../../vm/hashmap";
import { Processor } from "../../vm/processor";
import { toImageMap } from "./image";
import { SoundManager } from "./MMLikeSound";

export class MMLikeFileAPI {

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
      if (path === null || path === "") {
        return new Promise((resolve) => {
          resolve(null);
        });
      }
      const fullPath = outerThis.resolveFullUrl(path);
      return outerThis.loadImage(fullPath);
    });

    vm.addMapIntrinsic(fileMap, 'loadSound(path="")',
    function(path: string): Promise<HashMap | null> {
      if (path === null || path === "") {
        return new Promise((resolve) => {
          resolve(null);
        });
      }
      const fullPath = outerThis.resolveFullUrl(path);
      return outerThis.loadSound(fullPath);
    });

    vm.addMapIntrinsic(fileMap, 'exists(path)',
    function(path: string): Promise<number> {
      if (path === null || path === "") {
        return new Promise((resolve) => {
          resolve(0);
        });
      }
      const fullPath = outerThis.resolveFullUrl(path);
      return outerThis.fileExists(fullPath);
    });

    vm.addMapIntrinsic(fileMap, 'readLines(path)',
    function(path: string): Promise<Array<string> | null> {
      if (path === null || path === "") {
        return new Promise((resolve) => {
          resolve(null);
        });
      }
      const fullPath = outerThis.resolveFullUrl(path);
      return outerThis.readLines(fullPath);
    });

    return fileMap;
  }

  private readLines(url: string): Promise<string[] | null> {
    const responsePromise = fetch(url);
    const textPromise = responsePromise.then((response) => {
      return response.text();
    });
    const linesPromise = textPromise.then((text) => {
      return text.split(/[\n\r]+/);
    });
    return linesPromise;
  }

  private fileExists(url: string): Promise<number> {
    const responsePromise = fetch(url, {method: "HEAD"});
    const resultPromise = responsePromise.then((response) => {
      if (response.status === 200) {
        return 1;
      } else {
        return 0;
      }
    });
    return resultPromise;
  }

  private loadImage(url: string): Promise<HashMap | null> {
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

  private loadSound(url: string): Promise<HashMap | null> {
    const sound = document.createElement("audio");
    const promise = new Promise<HashMap | null>((resolve) => {
      sound.addEventListener("canplaythrough", () => {
        const soundMap = this.soundApi.toSoundMap(sound);
        resolve(soundMap);
      });
      sound.addEventListener("error", (_) => {
        resolve(null);
      });
    });
    sound.src = url;
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