/// <reference path="../interpreter/interpreter.ts"/>

type KeyInfo = {
  // as printed
  key: string,
  // usually ASCII code
  asciiCode: number,
  // as on a keyboard
  keyName: string,
  // as understood by MiniMicro
  mmName: string,
}

function toMMKeyName(e: KeyboardEvent): string {
  if (e.key === " ") {
    return "space";
  } else {
    return e.key.toLowerCase();
  }
}

class KeyInfoSet {
  
  elements: Map<string, KeyInfo>

  constructor() {
    this.elements = new Map();
  }
  
  add(k: KeyInfo) {
    this.elements.set(k.mmName, k);
  }

  hasMMName(mmName: string):boolean {
    return this.elements.has(mmName);
  }

  delete(k: KeyInfo) {
    this.elements.delete(k.mmName);
  }
}

class EventHandler {
  
  keysPressed = new KeyInfoSet();
  keyUp: KeyInfo | null = null;
  keyDown: KeyInfo | null = null;
  mouseButtonsDown: boolean[] = [];
  mouseX: number = -1;
  mouseY: number = -1;
  eventListeners: { [eventName: string]: (e: any ) => void };
  canvas: HTMLCanvasElement;

  constructor(canvasId: string) {

    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    const outerThis = this;

    this.eventListeners = {
      "keydown": (e: KeyboardEvent) => { outerThis.handleKeyDown(e); },
      "keyup": (e: KeyboardEvent) => { outerThis.handleKeyUp(e); },
      "mousemove": (e: MouseEvent) => { outerThis.handleMouseMove(e); },
      "mousedown": (e: MouseEvent) => { outerThis.handleMouseDown(e); },
      "mouseup": (e: MouseEvent) => { outerThis.handleMouseUp(e); },
      "mouseenter": (e: MouseEvent) => { outerThis.handleMouseEnter(e); },
      "mouseleave": (e: MouseEvent) => { outerThis.handleMouseLeave(e); },
    };

    this.addEventListeners();
  }

  reset() {
    this.keyDown = null;
    this.keyUp = null;
  }

  isKeyPressed(mmName: string): boolean {
    const result = this.keysPressed.hasMMName(mmName);
    return result;
  }

  isMouseDown(buttonNr: number): boolean {
    return this.mouseButtonsDown[buttonNr];
  }

  addEventListeners() {
    for (let [eventName, callback] of Object.entries(this.eventListeners)) {
      this.canvas.addEventListener(eventName, callback as any);
    }
  }

  removeEventListeners() {
    for (let [eventName, callback] of Object.entries(this.eventListeners)) {
      this.canvas.removeEventListener(eventName, callback as any);
    }
  }
  
  private handleKeyDown(e: KeyboardEvent) {
    const keyInfo = this.toKeyInfo(e);
    this.keyDown = keyInfo;
    this.keysPressed.add(keyInfo);
    e.stopPropagation();
    e.preventDefault();
  }

  private handleKeyUp(e: KeyboardEvent) {
    const keyInfo = this.toKeyInfo(e);
    this.keyUp = keyInfo;
    this.keysPressed.delete(keyInfo);
    e.stopPropagation();
    e.preventDefault();
  }

  private handleMouseMove(e: MouseEvent) {
    const canvas = this.canvas;
    const rect = canvas.getBoundingClientRect()

    const elementRelativeX = e.clientX - rect.left;
    const elementRelativeY = e.clientY - rect.top;
    const canvasRelativeX = elementRelativeX * canvas.width / rect.width;
    const canvasRelativeY = elementRelativeY * canvas.height / rect.height;

    this.mouseX = Math.floor(canvasRelativeX);
    this.mouseY = Math.floor(canvasRelativeY);
  }

  private handleMouseDown(e: MouseEvent) {
    this.mouseButtonsDown[e.button] = true;
  }

  private handleMouseUp(e: MouseEvent) {
    this.mouseButtonsDown[e.button] = false;
  }

  private handleMouseEnter(e: MouseEvent) {
    // Reset the mouse button flags
    this.mouseButtonsDown = [];
  }

  private handleMouseLeave(e: MouseEvent) {
    // Reset the mouse button flags
    this.mouseButtonsDown = [];
  }

  private toKeyInfo(e: KeyboardEvent): KeyInfo {
    const keyInfo: KeyInfo = {
      key: e.key,
      asciiCode: e.keyCode,
      keyName: e.code,
      mmName: toMMKeyName(e)
    };
    return keyInfo;
  }

}

class SoundManager {

  playingSounds: Set<HTMLAudioElement>;

  constructor(private vm: Processor, private soundMap: HashMap) {
    this.playingSounds = new Set();
  }

  play(self: any) {
    const outerThis = this;
    const optSnd = this.getNativeSound(self);
    if (optSnd) {
      const playPromise = optSnd.play();
      playPromise.then(() => {
        outerThis.playingSounds.add(optSnd);
        optSnd.addEventListener("ended", () => {
          outerThis.playingSounds.delete(optSnd);
        })
      })
    }
  }

  private getNativeSound(self: any): HTMLAudioElement | null {
    if (self instanceof HashMap) {
      if (isaEquals(this.vm, self, this.soundMap)) {
        return self.get("__nativeSnd");
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
      optSnd.pause();
      this.playingSounds.delete(optSnd);
    }
  }

  stopAll() {
    for (let snd of this.playingSounds) {
      snd.pause();
      this.playingSounds.delete(snd);
    }
  }

}

class MMLikeInterpreter extends Interpreter {

  private remotePath: string = "";
  private eventHandler: EventHandler;
  private soundMap = new HashMap();
  private soundMgr: SoundManager;

  constructor(stdoutCallback: TxtCallback, stderrCallback: TxtCallback) {
      super(stdoutCallback,stderrCallback);

      addCanvasIntrinsics(this.vm);

      this.addGfxAPI();
      this.defineHex2();
      this.addColorAPI();
      this.addFileAPI();
      this.addUserInteractionAPI();
      this.addKeyAPI();
      this.addMouseAPI();
      this.addSoundAPI();

      this.eventHandler = new EventHandler("gfx");
      this.soundMgr = new SoundManager(this.vm, this.soundMap);

      this.vm.onBeforeCycles = () => { this.callbackBeforeCycles() };
  }

  protected processOnFinished(): void {
    if (this.soundMgr) {
      this.soundMgr.stopAll();
    }
    if (this.eventHandler) {
      this.eventHandler.removeEventListeners();
    }

    super.processOnFinished();
  }

  setScriptUrl(scriptUrl: string) {
    const regex = /(?<path>(?:.*\/)?)(?<fileName>\w+\.ms$)/gm;
    const matches = regex.exec(scriptUrl,);
    if (matches && matches.groups) {
      const path = matches.groups["path"];
      this.remotePath = path;
    }
  }

  private callbackBeforeCycles() {
    this.eventHandler.reset();
  }

  private addSoundAPI() {
    const vm = this.vm;
    const outerThis = this;

    vm.addIntrinsic('Sound', 
    function(): HashMap {
      return outerThis.soundMap;
    });

    vm.addMapIntrinsic(this.soundMap, "stopAll",
    function() {
      outerThis.soundMgr.stopAll();
    });

    vm.addMapIntrinsic(this.soundMap, "play(self)",
    function(self: any) {
      outerThis.soundMgr.play(self);
    });

    vm.addMapIntrinsic(this.soundMap, "stop(self)",
    function(self: any) {
      outerThis.soundMgr.stop(self);
    });

    vm.addMapIntrinsic(this.soundMap, "isPlaying(self)",
    function(self: any): number {
      return outerThis.soundMgr.isPlaying(self);
    });

  }

  private addUserInteractionAPI() {
    const vm = this.vm;
    const mouseMap = new HashMap();
    const outerThis = this;

    vm.addIntrinsic('input(prompt="")', 
    function(message: string | undefined): Promise<string | null> {
      if (message === null || message === "") {
        message = undefined;
      }
      return new Promise((resolved)=>{
        const result = prompt(message);
        resolved(result);
      });
    });
  }

  private addMouseAPI() {
    const vm = this.vm;
    const mouseMap = new HashMap();
    const outerThis = this;

    vm.addIntrinsic("mouse", function() {
      return mouseMap;
    });

    vm.addMapIntrinsic(mouseMap, 'x',
    function(): number {
      return outerThis.eventHandler.mouseX;
    });

    vm.addMapIntrinsic(mouseMap, 'y',
    function(): number {
      return outerThis.eventHandler.mouseY;
    });

    vm.addMapIntrinsic(mouseMap, 'button(which=0)',
    function(which: number): number {
      return outerThis.eventHandler.isMouseDown(which) ? 1 : 0;
    });

  }

  private addKeyAPI() {
    const vm = this.vm;
    const keyMap = new HashMap();
    const outerThis = this;

    vm.addIntrinsic("key", function() {
      return keyMap;
    });

    vm.addMapIntrinsic(keyMap, 'pressed(keyName="space")',
    function(keyName: string): number {
      const result = outerThis.eventHandler.isKeyPressed(keyName) ? 1 : 0;
      return result;
    });

  }

  private addFileAPI() {
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
      const gfPrim = new GfxPrimitives();
      return gfPrim.loadImage(fullPath);
    });

    vm.addMapIntrinsic(fileMap, 'loadSound(path="")',
    function(path: string): Promise<HashMap | null> {
      const fullPath = `${outerThis.remotePath}${path}`;
      const sound = document.createElement("audio");
      const promise = new Promise<HashMap | null>((resolve) => {
        sound.addEventListener("canplaythrough", () => {
          const soundMap = outerThis.toSoundMap(sound);
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

  private defineHex2() {
    const code = `
    hex2 = function(val)
	    result = 0
	    digits = "0123456789ABCDEF"
	    val = floor(val)
	    if val < 0 then return "00"
	    if val >= 255 then return "FF"
	    return digits[val / 16] + digits[val % 16]
    end function`;
    this.runSrcCode(code);
  }

  private addColorAPI() {
    const code = `
    color = {}
    color.clear   = "#00000000"
    color.black 	= "#000000"
    color.white		= "#FFFFFF"
    color.gray		= "#808080"
    color.silver	= "#C0C0C0"
    color.maroon	= "#800000"
    color.red		  = "#FF0000"
    color.olive		= "#808000"
    color.yellow	= "#FFFF00"
    color.orange	= "#FF8000"
    color.green		= "#008000"
    color.lime		= "#00FF00"
    color.teal		= "#008080"
    color.aqua		= "#00FFFF"
    color.navy		= "#000080"
    color.blue		= "#0000FF"
    color.purple	= "#800080"
    color.fuchsia	= "#FF00FF"
    color.brown		= "#996633"
    color.pink		= "#FF8080"
    color.rgb = function(r, g, b)
      return "#" + hex2(r) + hex2(g) + hex2(b)
    end function
    color.rgba = function(r, g, b, a)
      return "#" + hex2(r) + hex2(g) + hex2(b) + hex2(a)
    end function`;
    this.runSrcCode(code);
  }

  private toSoundMap(nativeSound: HTMLAudioElement): HashMap {
    const instance = new HashMap();
    instance.set("__isa", this.soundMap);
    instance.set("__nativeSnd", nativeSound);
    return instance;
  }

  private addGfxAPI() {
    const gfPrim = new GfxPrimitives();
    const vm = this.vm;
    const gfxMap = new HashMap();

    vm.addIntrinsic("gfx", 
    function() {
      return gfxMap;
    });

    vm.addMapIntrinsic(gfxMap, "clear(color=null)", gfPrim.clear);
    
    vm.addMapIntrinsic(gfxMap, "drawImage(img,left,bottom)", 
    function(img:HTMLImageElement, x:number, bottom:number) {
      let y = gfPrim.toTop(bottom, img.height);
      gfPrim.drawImage(img, x, y);
    });

    vm.addMapIntrinsic(gfxMap, "fillRect(left,bottom,width,height,color)", 
    function(x:number, bottom:number, width:number, height:number, color:string) {
      let y = gfPrim.toTop(bottom, height);
      gfPrim.fillRect(x, y, width, height, color);
    });

    vm.addMapIntrinsic(gfxMap, "fillEllipse(left,bottom,width,height,color)", 
    function(x:number, bottom:number, width:number, height:number, color:string) {
      let y = gfPrim.toTop(bottom, height);
      //y -= height * 2;
      x += width;
      gfPrim.fillEllipse(x, y, width, height, color);
    });

    vm.addMapIntrinsic(gfxMap, 'print(str="",x=0,y=0,color=null,fontName="normal")', 
    function(str: string, x: number, bottom: number, color:string, fontName: string) {
      let fontSize;
      if (fontName === "normal") {
        fontSize = 20;
      } else if (fontName === "large") {
        fontSize = 32;
      } else if (fontName === "medium") {
        fontSize = 24;
      } else if (fontName === "small") {
        fontSize = 16;
      } else {
        fontSize = 16;
      }
      let y = gfPrim.toTop(bottom, fontSize);
      gfPrim.drawText(str, x, y, color, fontSize);
    });

  }

}
