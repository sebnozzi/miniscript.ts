
class OffDisplay extends Display {

  constructor(dspMgr: MMLikeDisplayManager) {
    super(dspMgr);
  }

  getModeNr(): DisplayMode {
    return DisplayMode.off;
  }

  addDisplayAPI(_: HashMap): void {
    // Nothing
   }

}