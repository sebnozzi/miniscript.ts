

class SolidColorDisplay extends Display {
  
  constructor(dspMgr: MMLikeDisplayManager) {
    super(dspMgr);
  }

  getModeNr(): DisplayMode {
    return DisplayMode.solidColor;
  }

  addDisplayAPI(dsp: HashMap): void {

  }

}