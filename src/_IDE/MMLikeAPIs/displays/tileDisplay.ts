
class TileDisplay // extends Display 
{
  
  constructor(dspMgr: MMLikeDisplayManager) {
    //super(dspMgr);
  }

  protected getModeNr(): DisplayMode {
    return DisplayMode.tile;
  }

}