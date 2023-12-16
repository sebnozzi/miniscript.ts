import { HashMap } from "../../../vm/hashmap";
import { MMLikeDisplayManager } from "../mmLikeDisplayManager";
import { Display } from "./display";
import { DisplayMode } from "./modes";

export class OffDisplay extends Display {

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