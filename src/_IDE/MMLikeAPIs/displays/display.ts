abstract class Display {

  protected attachedSlotNr: number | null;
  protected pixiContainer: any;
  protected dsp: HashMap;
  protected vm: Processor;
  protected upToDate: boolean;

  constructor(protected dspMgr: MMLikeDisplayManager) {
    this.pixiContainer = new PIXI.Container();
    this.dsp = new HashMap();
    this.attachedSlotNr = null;
    this.vm = dspMgr.vm;
    this.upToDate = false;
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
    this.markUpdated();
  }

  isDirty(): boolean {
    return !this.upToDate;
  }

  protected markUpdated() {
    this.upToDate = true;
  }

  protected markDirty() {
    this.upToDate = false;
  }

  public static toTop(bottom: number, height: number = 0): number {
    const y = 640 - bottom - height;
    return y;
  }

  protected getTintAndAlpha(tintValue: any): [string, number] {
    let alpha = 1;
    let tint = tintValue;
    if (typeof tint === "string" && tint.length >= 6) {
      if (tint[0] === '#') {
        const alphaHex = tintValue.slice(7);
        const alphaValue = parseInt(alphaHex, 16);
        if (Number.isInteger(alphaValue)) {
          alpha = alphaValue / 255;
        }
        tint = tintValue.slice(0,7)
      }
    } else {
      tint = "#FFFFFF";
    }
    return [tint, alpha];
  }

  public static isTransparentColor(color: string) {
    // #123456FF
    if (color[0] === "#" && color.length === 9) {
      return true;
    } else {
      return false;
    }
  }

}
