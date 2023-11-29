
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
  {mmName: "space", "keyName": "Space"},
  {mmName: "left", "keyName": "ArrowLeft"},
  {mmName: "right", "keyName": "ArrowRight"},
  {mmName: "up", "keyName": "ArrowUp"},
  {mmName: "down", "keyName": "ArrowDown"},
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
  keysBuffer = new Array<KeyInfo>();
  keyUp: KeyInfo | null = null;
  keyDown: KeyInfo | null = null;
  mouseButtonsDown: boolean[] = [];
  mouseX: number = -1;
  mouseY: number = -1;
  eventListeners: { [eventName: string]: (e: any ) => void };
  eventLayer: HTMLElement;
  canvasWidth: number = 0;
  canvasHeight: number = 0;
  lastKeyBufferAdditionTs: number = 0;

  constructor(private vm: Processor) {

    this.eventLayer = document.getElementById("userEventLayer") as HTMLElement;
    const outerThis = this;
    
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;

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
    const mouseMap = new HashMap();
    const outerThis = this;

    vm.addIntrinsic("mouse", function() {
      return mouseMap;
    });

    vm.addMapIntrinsic(mouseMap, 'x',
    function(): number {
      return outerThis.mouseX;
    });

    vm.addMapIntrinsic(mouseMap, 'y',
    function(): number {
      const domY = outerThis.mouseY;
      const y = outerThis.canvasHeight - domY;
      return y;
    });

    vm.addMapIntrinsic(mouseMap, 'button(which=0)',
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

    vm.addMapIntrinsic(keyMap, 'get',
    function(): Promise<string> {
      const promise = new Promise<string>((resolve) => {
        const action = () => {
          const optKey = outerThis.popKeyFromBuffer();
          if (optKey) {
            resolve(optKey.key);
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

  popKeyFromBuffer(): KeyInfo | null {
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
    const deltaTs = now - this.lastKeyBufferAdditionTs;
    let shouldAdd = false;
    if (this.keysBuffer.length === 0) {
      shouldAdd = true;
    } else if (deltaTs > 200) {
      shouldAdd = true;
    } else {
      const lastElement = this.keysBuffer[0];
      if (lastElement.key !== k.key) {
        shouldAdd = true;
      }
    }
    if (shouldAdd) {
      this.keysBuffer.unshift(k);
      this.lastKeyBufferAdditionTs = performance.now();
    }
  }
  
  private handleKeyDown(e: KeyboardEvent) {
    const keyInfo = this.toKeyInfo(e);
    this.keyDown = keyInfo;
    this.keysPressed.add(keyInfo);
    this.addKeyToBuffer(keyInfo);
    if (e.code === "Space") {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const keyInfo = this.toKeyInfo(e);
    this.keyUp = keyInfo;
    this.keysPressed.delete(keyInfo);
    this.lastKeyBufferAdditionTs = 0;
    if (e.code === "Space") {
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

    this.mouseX = domX
    this.mouseY = domY
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
