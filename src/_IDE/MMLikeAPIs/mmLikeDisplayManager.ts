
class DisplaySlot {

  private attachedDisplay: HashMap;
  private attachedNativeDisplay: Display;
  private allDisplaysTypes: Map<DisplayMode, HashMap>;

  constructor(private dspMgr: MMLikeDisplayManager, public readonly slotNr: number) {
    
    const offDisplay = this.dspMgr.newOffDisplay();

    this.allDisplaysTypes = new Map();
    this.allDisplaysTypes.set(DisplayMode.off, offDisplay);

    this.attachedDisplay = offDisplay;
    const nativeOffDisplay = offDisplay.get("_handle") as Display;
    this.attachedNativeDisplay = nativeOffDisplay;

    // Set as "attached"
    this.attachedNativeDisplay.attach(slotNr);
    offDisplay.set("index", slotNr);
  }

  updateDisplay() {
    this.attachedNativeDisplay.update();
  }

  getAttachedDisplay(): HashMap {
    return this.attachedDisplay;
  }

  installDisplay(dsp: HashMap, nativeDisplay: Display) {
    if (!nativeDisplay) {
      return;
    }
    const displayMode = nativeDisplay.getModeNr();
    const existingDsp = this.allDisplaysTypes.get(displayMode);

    if (existingDsp === dsp) {
      // Already part of the slot displays, just switch mode
      this.switchDisplayMode(displayMode);
    } else if (existingDsp) {
      // Not part of the display-set, replace the one with the same mode
      const existingNativeDisplay = this.dspMgr.getNativeDisplay(existingDsp);
      if (existingNativeDisplay) {
        // Detach existing
        this.detachDisplay(existingDsp, existingNativeDisplay);
        // Replace with new
        this.allDisplaysTypes.set(displayMode, dsp);
        // Switch mode
        this.switchDisplayMode(displayMode);
      }
    }
  }

  switchDisplayMode(modeNr: DisplayMode) {
    if (modeNr === this.attachedNativeDisplay.getModeNr()) {
      return;
    }

    let otherModeDisplay = this.allDisplaysTypes.get(modeNr);

    // Create display on-demand
    if (otherModeDisplay === undefined) {
      const newDisplay = this.newDisplayForModeNr(modeNr);
      this.allDisplaysTypes.set(modeNr, newDisplay);
      otherModeDisplay = newDisplay;
    }

    this.switchToDisplay(otherModeDisplay);
  }

  private switchToDisplay(otherDisplay: HashMap) {
    this.detachCurrentDisplay();
    this.attachDisplay(otherDisplay);
  }

  private detachCurrentDisplay() {
    const slotContainer = this.getSlotContainer();
    // Empty slot-container
    slotContainer.removeChildren();
    // Detach display
    const currentDsp = this.attachedDisplay;
    const nativeDsp = this.attachedNativeDisplay;
    this.detachDisplay(currentDsp, nativeDsp);
  }

  private detachDisplay(dsp: HashMap, nativeDsp: Display) {
    nativeDsp.detach();
    dsp.delete("index");
  }

  private attachDisplay(dsp: HashMap) {
    const slotNr = this.slotNr;

    const nativeDsp = this.dspMgr.getNativeDisplay(dsp);

    if (nativeDsp instanceof Display) {
      this.attachedNativeDisplay = nativeDsp;
      this.attachedDisplay = dsp;

      nativeDsp.attach(slotNr);
      // Set index property
      dsp.set("index", slotNr);

      // Add new display container
      const slotContainer = this.getSlotContainer();
      const pixiContainer = nativeDsp.getPixiContainer();
      slotContainer.addChild(pixiContainer);
    }
  }

  private getSlotContainer(): any {
    const pixiApp = this.dspMgr.getPixiApplication();
    // Note the inverted insertion order
    const pixiContainerIdx = 7 - this.slotNr;
    // Get container
    const slotContainer = pixiApp.stage.getChildAt(pixiContainerIdx);
    return slotContainer;
  }

  private newDisplayForModeNr(modeNr: number): HashMap {
    if (modeNr == DisplayMode.off) {
      return this.dspMgr.newOffDisplay();
    } else if (modeNr == DisplayMode.solidColor) {
      return this.dspMgr.newSolidColorDisplay();
    } else if (modeNr == DisplayMode.text) {
      return this.dspMgr.newTextDisplay();
    } else if (modeNr == DisplayMode.pixel) {
      return this.dspMgr.newPixelDisplay();
    } else if (modeNr == DisplayMode.tile) {
      return this.dspMgr.newTileDisplay();
    } else if (modeNr == DisplayMode.sprite) {
      return this.dspMgr.newSpriteDisplay();
    } else {
      throw new Error("Invalid mode nr");
    }
  }

}

class MMLikeDisplayManager {

  private slots: Array<DisplaySlot>;
  private pixiApp: any;
  displayType: HashMap;
  canvasHeight: number = 640;
  displayCanvas: HTMLCanvasElement;

  constructor(public vm: Processor) {
    this.displayType = new HashMap();
    this.displayCanvas = document.getElementById("displayCanvas") as HTMLCanvasElement;
    this.canvasHeight = this.displayCanvas.width;
    // Add slots
    this.slots = new Array();
    for (let slotNr = 0; slotNr < 8; slotNr++) {
      const newSlot = new DisplaySlot(this, slotNr);
      this.slots.push(newSlot);
    }
  }

  getPixiApplication(): any {
    return this.pixiApp;
  }

  addDisplayApi() {
    const vm = this.vm;
    const outerThis = this;

    // Add display(n)
    
    vm.addIntrinsic("display(n)",
    function(slotNr: any) {
      slotNr = toIntegerValue(slotNr);
      if (slotNr >= 0 && slotNr <= 7) {
        return outerThis.getAttachedDisplayAtSlotNr(slotNr);
      } else {
        return null;
      }
    });

    // Set up "displayMode" map

    const displayModeMap = new HashMap();

    for (let map of displayModeNamesAndValues) {
      displayModeMap.set(map.name, map.value)
    }

    vm.addMapIntrinsic(displayModeMap, "str(mode)", 
    function(mode: any): string {
      for (let map of displayModeNamesAndValues) {
        if (mode === map.value) {
          return map.name;
        }
      }
      return "?"
    });

    vm.addIntrinsic("displayMode",
    function() {
      return displayModeMap;
    });

    // Populate base type "Display"
    const dsp = this.displayType;
    dsp.set("mode", 0);
    vm.addMapIntrinsic(dsp, "install(self,index=0)",
    function(dsp: any, idx: any) {
      outerThis.installDisplay(dsp, idx);
    });

    // Add display classes as instrinsic functions
    vm.addIntrinsic("OffDisplay", function() {
      return outerThis.newOffDisplay();
    });
    vm.addIntrinsic("SolidColorDisplay", function() {
      return outerThis.newSolidColorDisplay();
    });
    vm.addIntrinsic("TextDisplay", function() {
      return outerThis.newTextDisplay();
    });
    vm.addIntrinsic("PixelDisplay", function() {
      return outerThis.newPixelDisplay();
    });
    vm.addIntrinsic("TileDisplay", function() {
      return outerThis.newTileDisplay();
    });
    vm.addIntrinsic("SpriteDisplay", function() {
      return outerThis.newSpriteDisplay();
    });
  }

  initDisplays() {

    PIXI.BitmapFont.from('TextFontNormal', {
      fontFamily: 'monospace',
      fontSize: 20,
      fill: 'white',
      stroke: 0,
      strokeThickness: 0,
    }, {
      chars: PIXI.BitmapFont.ASCII,
      scaleMode: 0
    });
    
    this.pixiApp = new PIXI.Application({ 
      width: 960, 
      height: 640,
      hello: true,
      antialias: false,
      view: this.displayCanvas,
     });

     // Create containers for display slots
     for (let slotNr = 0; slotNr < 8; slotNr++) {
      const container = new PIXI.Container();
      this.pixiApp.stage.addChild(container);
     }

    this.setDefaultDisplayModes();
  }

  // Called on each update cycle
  update() {
    const vm = this.vm;
    for (let slot of this.slots) {
      slot.updateDisplay();
    }
  }

  private setDefaultDisplayModes() {
    for(let slotNr = 0; slotNr < 8; slotNr++) {
      if (slotNr == 7 || (slotNr >= 3 && slotNr <= 5)) {
        continue;
      }
      this.setSlotDisplayMode(slotNr, DisplayMode.off);
    }
    this.setSlotDisplayMode(3, DisplayMode.text);
    this.setSlotDisplayMode(4, DisplayMode.sprite);
    this.setSlotDisplayMode(5, DisplayMode.pixel);
    this.setSlotDisplayMode(7, DisplayMode.solidColor);
  }
  
  private setSlotDisplayMode(slotNr: number, mode: DisplayMode) {
    const slot = this.slots[slotNr];
    slot.switchDisplayMode(mode);
  }

  newOffDisplay(): HashMap {
    const nativeDsp = new OffDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  newSolidColorDisplay(): HashMap {
    const nativeDsp = new SolidColorDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  newTextDisplay(): HashMap {
    const nativeDsp = new TextDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  newPixelDisplay(): HashMap {
    const nativeDsp = new PixelDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  newTileDisplay(): HashMap {
    const nativeDsp = new TileDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  newSpriteDisplay(): HashMap {
    const nativeDsp = new SpriteDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  private getAttachedDisplayAtSlotNr(slotNr: number):HashMap {
    const slot = this.slots[slotNr];
    return slot.getAttachedDisplay();
  }

  // Attempt to change display mode via API `display(n).mode = xxx`.
  requestDisplayModeChange(dsp: HashMap, requestedMode: any) {
    requestedMode = toIntegerValue(requestedMode);
    if (requestedMode < 0 || requestedMode > 7) {
      return;
    }
    const nativeDsp = this.getNativeDisplay(dsp);
    if (!nativeDsp) {
      return;
    }
    if (!nativeDsp.isAttached()) {
      return;
    }
    const slotNr = nativeDsp.getSlotNr();
    const slot = this.slots[slotNr];
    slot.switchDisplayMode(requestedMode);
  }

  private installDisplay(dsp: HashMap, slotNr: number) {
    slotNr = toIntegerValue(slotNr);
    if (slotNr < 0 || slotNr > 7) {
      return;
    }
    const slot = this.slots[slotNr];
    const nativeDisplay = this.getNativeDisplay(dsp);
    if (nativeDisplay) {
      slot.installDisplay(dsp, nativeDisplay);
    }
  }

  getNativeDisplay(dsp: HashMap): Display | null {
    const vm = this.vm;
    const value = vm.mapAccessOpt(dsp, "_handle");
    if (value instanceof Display) {
      return value;
    } else {
      return null;
    }
  }

}