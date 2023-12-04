
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

    vm.addMapIntrinsic(dsp, "clear", 
    function() {
      outerThis.clear();
    });

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
          const tintValue = mapGet(sprite, "tint");
          const [tint, alpha] = this.getTintAndAlpha(tintValue);
          
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
            const nativeImg = getNativeImg(img);
            if (nativeImg) {
              handle = PIXI.Sprite.from(nativeImg);
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
        this.pixiContainer.removeChild(existing);
      }
    }
  }

  // Remove all sprites from screen and display list
  private clear() {
    this.dsp.set("sprites", new Array());
    this.pixiContainer.removeChildren();
  }

}