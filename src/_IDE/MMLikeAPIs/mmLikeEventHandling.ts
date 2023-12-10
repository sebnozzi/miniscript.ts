
type KeyInfo = {
  // as printed
  key: string,
  // usually ASCII code
  asciiCode: number,
  // as on a keyboard, prefer this when possible
  keyName: string,
  // as understood by MiniMicro
  mmName: string,
}

const mmKeyNames = [
  {mmName: "space", "keyName": "Space", "code": 32},
  {mmName: "left", "keyName": "ArrowLeft", "code": 17},
  {mmName: "right", "keyName": "ArrowRight", "code": 18},
  {mmName: "up", "keyName": "ArrowUp", "code": 19},
  {mmName: "down", "keyName": "ArrowDown", "code": 20},
];

function toMMKeyName(e: KeyboardEvent): string {
  for (let entry of mmKeyNames) {
    if (entry.keyName === e.code) {
      return entry.mmName;
    }
  }
  return e.key.toLowerCase();
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
  keysBuffer = new Array<string>();
  keyUp: KeyInfo | null = null;
  keyDown: KeyInfo | null = null;
  mouseButtonsDown: boolean[] = [];
  mouseType: HashMap;
  eventListeners: { [eventName: string]: (e: any ) => void };
  eventLayer: HTMLElement;
  canvasWidth: number = 0;
  canvasHeight: number = 0;
  sameKeyWaitTs: number = 0;
  sameKeyWaitCoolDownMs: number = 200;

  constructor(private vm: Processor) {

    this.eventLayer = document.getElementById("userEventLayer") as HTMLElement;
    const outerThis = this;
    
    const canvas = document.getElementById("displayCanvas") as HTMLCanvasElement;
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;

    this.mouseType = new HashMap();

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

  addMouseAPI() {
    const vm = this.vm;
    const outerThis = this;
    const mouseType = this.mouseType;

    vm.addIntrinsic("mouse", function() {
      return outerThis.mouseType;
    });

    mouseType.set("x", -1);
    mouseType.set("y", -1);

    vm.addMapIntrinsic(mouseType, 'button(which=0)',
    function(which: number): number {
      return outerThis.isMouseDown(which) ? 1 : 0;
    });

  }

  addKeyAPI() {
    const vm = this.vm;
    const keyMap = new HashMap();
    const outerThis = this;

    vm.addIntrinsic("key", function() {
      return keyMap;
    });

    vm.addMapIntrinsic(keyMap, 'pressed(keyName="space")',
    function(keyName: string): number {
      const result = outerThis.isKeyPressed(keyName) ? 1 : 0;
      return result;
    });

    vm.addMapIntrinsic(keyMap, 'available',
    function(): number {
      const result = outerThis.isBufferKeyAvailable() ? 1 : 0;
      return result;
    });

    vm.addMapIntrinsic(keyMap, 'clear',
    function() {
      outerThis.clearBuffer()
    });

    vm.addMapIntrinsic(keyMap, 'get',
    function(): Promise<string> {
      const promise = new Promise<string>((resolve) => {
        const action = () => {
          const optKey = outerThis.popKeyFromBuffer();
          if (optKey) {
            resolve(optKey);
          } else {
            // Retry
            setTimeout(() => {
              action();
            }, 10);
          }
        };
        action();
      });
      return promise;
    });

  }

  reset() {
    this.keyDown = null;
    this.keyUp = null;
  }

  isKeyPressed(mmName: string): boolean {
    const result = this.keysPressed.hasMMName(mmName);
    return result;
  }

  isBufferKeyAvailable(): boolean {
    return this.keysBuffer.length > 0;
  }

  clearBuffer() {
    this.keysBuffer = [];
  }

  popKeyFromBuffer(): string | null {
    return this.keysBuffer.pop() || null;
  }

  isMouseDown(buttonNr: number): boolean {
    return this.mouseButtonsDown[buttonNr];
  }

  addEventListeners() {
    for (let [eventName, callback] of Object.entries(this.eventListeners)) {
      this.eventLayer.addEventListener(eventName, callback as any);
    }
  }

  removeEventListeners() {
    for (let [eventName, callback] of Object.entries(this.eventListeners)) {
      this.eventLayer.removeEventListener(eventName, callback as any);
    }
  }

  private addKeyToBuffer(k: KeyInfo) {
    const now = performance.now();
    let shouldAdd = false;
    const bufferKey = this.toBufferKey(k);
    if (this.keysBuffer.length === 0) {
      shouldAdd = true;
    } else {
      const lastElement = this.keysBuffer[0];
      if (lastElement !== bufferKey) {
        shouldAdd = true;
      } else {
        // Only allow same key if enough time passed
        if (now >= this.sameKeyWaitTs) {
          shouldAdd = true;
        }
      }
    }
    if (shouldAdd) {
      this.keysBuffer.unshift(bufferKey);
      this.sameKeyWaitTs = now + this.sameKeyWaitCoolDownMs;
    }
  }
  
  private handleKeyDown(e: KeyboardEvent) {
    const keyInfo = this.toKeyInfo(e);
    this.keyDown = keyInfo;
    this.keysPressed.add(keyInfo);
    this.addKeyToBuffer(keyInfo);
    this.preventDefault(e, keyInfo);
  }

  private handleKeyUp(e: KeyboardEvent) {
    const keyInfo = this.toKeyInfo(e);
    this.keyUp = keyInfo;
    this.keysPressed.delete(keyInfo);
    // Allow further insertion on buffer on key up
    this.sameKeyWaitTs = 0;
    this.preventDefault(e, keyInfo);
  }

  preventDefault(e: KeyboardEvent, keyInfo: KeyInfo) {
    // Prevent propagation of any event that could 
    // result in scrolling the window.
    if (keyInfo.mmName === "space" 
    || keyInfo.mmName === "up" 
    || keyInfo.mmName === "down" 
    || keyInfo.mmName === "left" 
    || keyInfo.mmName === "right" 
    ) {
      e.stopPropagation();
      e.preventDefault();
    }  
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.eventLayer.getBoundingClientRect()

    const elementRelativeX = e.clientX - rect.left;
    const elementRelativeY = e.clientY - rect.top;
    const canvasRelativeX = elementRelativeX * this.canvasWidth / rect.width;
    const canvasRelativeY = elementRelativeY * this.canvasHeight / rect.height;

    // Real DOM coordinates, not translated to MM
    const domX = Math.floor(canvasRelativeX);
    const domY = Math.floor(canvasRelativeY);

    // Translate to MM coordinates (only needed for Y)
    const mmY = this.canvasHeight - domY;

    this.mouseType.set("x", domX);
    this.mouseType.set("y", mmY);
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

  // `key.get` returns a char. For special keys we need to
  // return a string with the expected (ascii?) "code".
  // In order to do this, we need to "fake" some results. 
  private toBufferKey(k: KeyInfo): string {
    let asciiCode = -1;
    // Try the list of special MM keys
    for (let entry of mmKeyNames) {
      if (entry.mmName === k.mmName) {
        asciiCode = entry.code;
        break;
      }
    }
    // Take the ASCII code if no match found
    if (asciiCode < 0) {
      asciiCode = k.asciiCode
    }
    // Build string of one character
    const char = String.fromCharCode(asciiCode);
    return char;
  }

}
