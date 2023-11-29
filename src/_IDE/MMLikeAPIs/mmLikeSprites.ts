
type SpriteData = {
  x: number,
  y: number,
  image: HTMLImageElement
}

class MMLikeSpritesMgr {

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sprdMap: HashMap;
  private spriteType: HashMap;
  private gfxPrim: GfxPrimitives;

  constructor(private vm: Processor) {
    this.canvas = document.getElementById("sprd") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.gfxPrim = new GfxPrimitives("sprd");
    this.sprdMap = new HashMap();
    this.spriteType = new HashMap();
  }

  addSpriteAPI() {
    const vm = this.vm;
    const spriteType = this.spriteType;
    const outerThis = this;

    // The "sprite display" object
    vm.addIntrinsic("sprd", 
    function() {
      return outerThis.sprdMap;
    });

    this.sprdMap.set("sprites", new Array());

    // Sprite "type"
    vm.addIntrinsic("Sprite", 
    function() {
      return outerThis.spriteType;
    });

    // All these should be set at runtime
    spriteType.set("x", 0);
    spriteType.set("y", 0);
    spriteType.set("image", null);
  }

  updateDisplay() {
    // Clear display
    this.gfxPrim.clear(null);
    // Draw each sprite
    const sprites = this.sprdMap.get("sprites");
    if (sprites instanceof Array) {
      for (let s of sprites) {
        const sprite = this.toSprite(s);
        if (sprite) {
          this.drawSprite(sprite)
        }
      }
    }
  }

  private toSprite(obj: any): SpriteData | null {
    if (obj instanceof HashMap) {
      const x = this.vm.mapAccessOpt(obj, "x");
      const y = this.vm.mapAccessOpt(obj, "y");
      const img = this.vm.mapAccessOpt(obj, "image");
      if (typeof x === "number" 
          && typeof y === "number" 
          && img instanceof HTMLImageElement) { 
            return {
              x: x,
              y: y,
              image: img
            };
      }
    }
    return null;
  }

  private drawSprite(s: SpriteData) {
    const imgWidth = s.image.width;
    const imgHeight = s.image.height;
    let dx = s.x - imgWidth / 2;
    let dy = s.y - imgHeight / 2;
    dy = this.gfxPrim.toTop(dy, imgHeight);
    this.ctx.drawImage(s.image, dx, dy);
  }
}