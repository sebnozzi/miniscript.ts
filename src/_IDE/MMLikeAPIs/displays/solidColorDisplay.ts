import * as PIXI from "pixi.js";
import { HashMap } from "../../../vm/hashmap";
import { MMLikeDisplayManager } from "../mmLikeDisplayManager";
import { Display } from "./display";
import { DisplayMode } from "./modes";

export class SolidColorDisplay extends Display {

  private color: string | null;
  private solidSurface: any = null;
  
  constructor(dspMgr: MMLikeDisplayManager) {
    super(dspMgr);
    this.color = null;

    this.initGraphics();
  }

  private initGraphics() {
    this.solidSurface = new PIXI.Graphics();

    // Fill with solid white
    // It will be tinted later
    this.solidSurface.beginFill("white");
    this.solidSurface.drawRect(0, 0, 960, 640);
    this.solidSurface.endFill();

    this.pixiContainer.addChild(this.solidSurface);
  }

  getModeNr(): DisplayMode {
    return DisplayMode.solidColor;
  }

  addDisplayAPI(_: HashMap): void {
    // Nothing
  }

  update() {
    const mapColor = this.getColorFromMap();
    if (mapColor != this.color) {
      this.color = mapColor;
      this.setColor(mapColor);
    }
  }
  
  getColorFromMap(): string {
    const colorValue = this.vm.mapAccessOpt(this.dsp, "color");
    if (colorValue !== undefined) {
      return colorValue;
    } else {
      // Transparent
      return "#00000000";
    }
  }

  setColor(color: string) {
    const [tint, alpha] = this.getTintAndAlpha(color);
    this.solidSurface.tint = tint;
    this.solidSurface.alpha = alpha;
  }

}