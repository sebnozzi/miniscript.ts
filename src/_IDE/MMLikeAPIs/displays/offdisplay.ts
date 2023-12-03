
class OffDisplay extends Display {

  protected pixiContainer: any;

  constructor(dspMgr: MMLikeDisplayManager) {
    super(dspMgr);
  }

  getModeNr(): DisplayMode {
    return DisplayMode.off;
  }

  addDisplayAPI(dsp: HashMap): void {

  }

}