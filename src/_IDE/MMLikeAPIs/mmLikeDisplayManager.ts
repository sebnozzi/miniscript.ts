
class MMLikeDisplayManager {

  private slots: Array<HashMap>;
  private pixiApp: any;
  displayType: HashMap;
  canvasHeight: number = 640;
  displayCanvas: HTMLCanvasElement;

  constructor(public vm: Processor) {
    this.displayType = new HashMap();
    this.slots = [];
    this.displayCanvas = document.getElementById("displayCanvas") as HTMLCanvasElement;
    this.canvasHeight = this.displayCanvas.width;
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
        return outerThis.getDisplayAtSlotNr(slotNr);
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
      idx = toIntegerValue(idx);
      if (idx < 0 || idx > 7) {
        return;
      }
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

    this.addDefaultDisplays();
  }

  // Called on each update cycle
  update() {
    const vm = this.vm;
    for (let dspMap of this.slots) {
      const nativeDsp = vm.mapAccessOpt(dspMap, "_handle");
      if (nativeDsp instanceof Display) {
        nativeDsp.update();
      }
    }
  }

  private addDefaultDisplays() {
    for(let slotNr = 0; slotNr < 8; slotNr++) {
      if (slotNr == 7 || (slotNr >= 3 && slotNr <= 5)) {
        continue;
      }
      this.installDisplay(this.newOffDisplay(), slotNr);
    }
    // Add text display at 3
    this.installDisplay(this.newTextDisplay(), 3);
    // Add sprite display at 4
    this.installDisplay(this.newSpriteDisplay(), 4);
    // Add pixel display at 5
    this.installDisplay(this.newPixelDisplay(), 5);
    // Add pixel display at 7
    this.installDisplay(this.newSolidColorDisplay(), 7);
  }

  private getDisplayAtSlotNr(slotNr: number):HashMap {
    const dsp = this.slots[slotNr];
    return dsp;
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
    const currentMode = nativeDsp.getModeNr();
    if (currentMode === requestedMode) {
      // Same mode, no need to change
      return;
    }
    const slotNr = nativeDsp.getSlotNr();
    this.changeSlotDisplayMode(slotNr, requestedMode);
  }

  private newOffDisplay(): HashMap {
    const nativeDsp = new OffDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  private newSolidColorDisplay(): HashMap {
    const nativeDsp = new SolidColorDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  private newTextDisplay(): HashMap {
    const nativeDsp = new TextDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  private newPixelDisplay(): HashMap {
    const nativeDsp = new PixelDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  private newTileDisplay(): HashMap {
    const nativeDsp = new TileDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  private newSpriteDisplay(): HashMap {
    const nativeDsp = new SpriteDisplay(this);
    nativeDsp.addProperties();
    return nativeDsp.getDisplayMap();
  }

  private findAttachedDisplaySlotNr(dsp: HashMap): number | null {
    for (let slotNr = 0; slotNr < 8; slotNr++) {
      if (this.slots[slotNr] === dsp) {
        return slotNr;
      }
    }
    return null;
  }

  private changeSlotDisplayMode(slotNr: number, modeNr: number) {
    const dsp = this.newDisplayForModeNr(modeNr);
    this.installDisplay(dsp, slotNr);
  }

  private installDisplay(dsp: HashMap, slotNr: number) {
    if (slotNr < 0 || slotNr > 7) {
      return;
    }
    const nativeDsp = this.getNativeDisplay(dsp);
    if (nativeDsp instanceof Display) {
      this.detachDisplay(slotNr);
      this.attachDisplay(slotNr, nativeDsp, dsp);
    }
  }

  private detachDisplay(slotNr: number) {
    const currentDsp = this.getDisplayAtSlotNr(slotNr);
    if (!currentDsp) {
      return;
    }
    const nativeDsp = this.getNativeDisplay(currentDsp);
    if (nativeDsp) {
      nativeDsp.detach();
      const slotContainer = this.getSlotContainer(slotNr);
      // Remove display on it
      slotContainer.removeChildren();
      // Remove "index" property
      currentDsp.delete("index");
    }
  }
  
  private getSlotContainer(slotNr: number): any {
    // Note the inverted insertion order
    const pixiContainerIdx = 7 - slotNr;
    // Get container
    const slotContainer = this.pixiApp.stage.getChildAt(pixiContainerIdx);
    return slotContainer;
  }

  private attachDisplay(slotNr: number, nativeDsp: Display, dsp: HashMap) {
    nativeDsp.attach(slotNr);
    this.slots[slotNr] = dsp;
    const slotContainer = this.getSlotContainer(slotNr);
    // Set index property
    dsp.set("index", slotNr);
    // Add new display
    const pixiContainer = nativeDsp.getPixiContainer();
    slotContainer.addChild(pixiContainer);
  }

  private getNativeDisplay(dsp: HashMap): Display | null {
    const vm = this.vm;
    const value = vm.mapAccessOpt(dsp, "_handle");
    if (value instanceof Display) {
      return value;
    } else {
      return null;
    }
  }

  private newDisplayForModeNr(modeNr: number): HashMap {
    if (modeNr == DisplayMode.off) {
      return this.newOffDisplay();
    } else if (modeNr == DisplayMode.solidColor) {
      return this.newSolidColorDisplay();
    } else if (modeNr == DisplayMode.text) {
      return this.newTextDisplay();
    } else if (modeNr == DisplayMode.pixel) {
      return this.newPixelDisplay();
    } else if (modeNr == DisplayMode.tile) {
      return this.newTileDisplay();
    } else if (modeNr == DisplayMode.sprite) {
      return this.newSpriteDisplay();
    } else {
      throw new Error("Invalid mode nr");
    }
  }

}