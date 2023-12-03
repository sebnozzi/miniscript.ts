
class SpriteDisplay extends Display {
  
  private spriteType: HashMap;

  constructor(dspMgr: MMLikeDisplayManager) {
    super(dspMgr);
    this.spriteType = new HashMap();
  }

  getModeNr(): DisplayMode {
    return DisplayMode.sprite;
  }

  addDisplayAPI(): void {
    const outerThis = this;
    const vm = this.dspMgr.vm;
    const spriteType = this.spriteType;

    const dsp = this.dsp;

    dsp.set("sprites", new Array());

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

  update() {
    const vm = this.dspMgr.vm;
    const mapGet = (map: HashMap, key:any) => { return vm.mapAccessOpt(map, key) };
    const dsp = this.dsp;
    const shouldBeSprites = [];

    const sprites = dsp.get("sprites");
    if (sprites instanceof Array) {
      for (let sprite of sprites) {
        if (sprite instanceof HashMap) {
          const x = toIntegerValue(mapGet(sprite, "x"));
          const y = toIntegerValue(mapGet(sprite, "y"));
          const rotation = toIntegerValue(mapGet(sprite, "rotation"));
          let tint = mapGet(sprite, "tint");
          let alpha = 1
          // #000000
          if (typeof tint === "string" && tint.length >= 6) {
            if (tint[0] === '#') {
              const alphaHex = tint.slice(7);
              const alphaValue = parseInt(alphaHex, 16);
              if (Number.isInteger(alphaValue)) {
                alpha = alphaValue / 255;
              }
              tint = tint.slice(0,7)
            }
          } else {
            tint = "#FFFFFF";
          }

          let scale = mapGet(sprite, "scale");
          let scaleX = 1.0;
          let scaleY = 1.0;
          if (typeof scale === "number") {
            scaleX = toNumberValue(scale);
            scaleY = toNumberValue(scale);
          } else if (scale instanceof Array && scale.length == 2) {
            scaleX = toNumberValue(scale[0]);
            scaleY = toNumberValue(scale[1]);
          }

          let handle = sprite.get("_handle");

          // If no handle, create and assign one
          if (handle === undefined) {
            const img = mapGet(sprite, "image");
            if (img instanceof HTMLImageElement) {
              handle = PIXI.Sprite.from(img);
              handle.anchor.set(0.5);
              sprite.set("_handle", handle);
            }
          }

          if (handle instanceof PIXI.Sprite) {
            handle.x = x;
            handle.y = this.toTop(y);
            handle.angle = -rotation;
            handle.scale.set(scaleX, scaleY);
            handle.tint = tint;
            handle.alpha = alpha;
            shouldBeSprites.push(handle);
            // If not currently attached, attach
            if (this.pixiContainer.children.indexOf(handle) === -1) {
              this.pixiContainer.addChild(handle);
            }
          }
        }
      }
    }
    
    // Iterate over current sprites, see if they are in the should-be list.
    // If not, remove.
    const existingSprites = this.pixiContainer.children;
    for (let existing of existingSprites) {
      if (shouldBeSprites.indexOf(existing) === -1) {
        this.pixiContainer.remove(existing);
      }
    }
  }

}