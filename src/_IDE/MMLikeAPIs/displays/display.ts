abstract class Display {

  protected attachedSlotNr: number | null;
  protected pixiContainer: any;
  protected dsp: HashMap;

  constructor(protected dspMgr: MMLikeDisplayManager) {
    this.pixiContainer = new PIXI.Container();
    this.dsp = new HashMap();
    this.attachedSlotNr = null;
  }

  getDisplayMap(): HashMap {
    return this.dsp;
  }

  attach(slotNr: number) {
    this.attachedSlotNr = slotNr;
  }

  detach() {
    this.attachedSlotNr = null;
  }

  isAttached(): boolean {
    return this.attachedSlotNr !== null;
  }

  getSlotNr(): number {
    return this.attachedSlotNr || -1;
  }
  
  addProperties() {
    const dsp = this.dsp;
    const outerThis = this;
    
    dsp.set("__isa", this.dspMgr.displayType);
    dsp.set("mode", this.getModeNr());
    // Will be set to the subclass instance, not this "Display" one
    dsp.set("_handle", this);
    // Attempt to change display mode via API `display(n).mode = xxx`.
    dsp.onAfterValueSet("mode", (modeNr: any) => {
      outerThis.dspMgr.requestDisplayModeChange(dsp, modeNr);
    });
    this.addDisplayAPI(dsp);
  }

  abstract getModeNr(): DisplayMode;

  protected abstract addDisplayAPI(dsp: HashMap): void;

  getPixiContainer(): any {
    return this.pixiContainer;
  }

  // Called on each update cycle.
  // Override in subclass
  update() {
    // Default: do nothing
  }

  protected toTop(bottom: number, height: number = 0): number {
    const y = 640 - bottom - height;
    return y;
  }

}
