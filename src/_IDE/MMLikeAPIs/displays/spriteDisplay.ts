
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
    const vm = this.vm;
    const dsp = this.dsp;

    dsp.set("sprites", new Array());

    vm.addMapIntrinsic(dsp, "clear", 
    function() {
      outerThis.clear();
    });

    this.addSpriteType();
  }

  update() {
    const vm = this.vm;
    const mapGet = (map: HashMap, key:any) => { return vm.mapAccessOpt(map, key) };
    const dsp = this.dsp;
    const shouldBeSprites = [];

    const sprites = mapGet(dsp, "sprites") || [];
    if (sprites instanceof Array) {
      for (let sprite of sprites) {
        if (sprite instanceof HashMap) {
          const x = toNumberValue(mapGet(sprite, "x"));
          const y = toNumberValue(mapGet(sprite, "y"));
          const rotation = toNumberValue(mapGet(sprite, "rotation"));
          const tintValue = mapGet(sprite, "tint");
          const [tint, alpha] = this.getTintAndAlpha(tintValue);
          const [scaleX, scaleY] = this.getSpriteScale(sprite);

          let handle = mapGet(sprite, "_handle");

          // If no handle, create and assign one
          if (handle === undefined) {
            const img = mapGet(sprite, "image");
            const nativeTexture = getNativeTexture(this.vm, img);
            if (nativeTexture) {
              handle = PIXI.Sprite.from(nativeTexture);
              handle.anchor.set(0.5);
              sprite.set("_handle", handle);
            } else {
              console.log("Not setting a non-native texture when creating handle", nativeTexture);
            }
          }

          if (handle instanceof PIXI.Sprite) {
            const img = mapGet(sprite, "image");
            const nativeTexture = getNativeTexture(this.vm, img);
            if (nativeTexture && handle.texture !== nativeTexture) {
              handle.texture = nativeTexture;
              handle.texture.update();
            }

            handle.x = x;
            handle.y = Display.toTop(y);
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
  
    super.update();
  }

  private getSpriteScale(sprite: HashMap): [number, number] {
    const vm = this.vm;
    let scale = vm.mapAccessOpt(sprite, "scale");
    let scaleX = 1.0;
    let scaleY = 1.0;
    if (typeof scale === "number") {
      scaleX = toNumberValue(scale);
      scaleY = toNumberValue(scale);
    } else if (scale instanceof Array && scale.length == 2) {
      scaleX = toNumberValue(scale[0]);
      scaleY = toNumberValue(scale[1]);
    }
    return [scaleX, scaleY];
  }

  // Remove all sprites from screen and display list
  private clear() {
    this.dsp.set("sprites", new Array());
    this.pixiContainer.removeChildren();
  }

  private addSpriteType() {
    const outerThis = this;
    const spriteType = this.spriteType;
    const vm = this.vm;
  
    // Sprite "type"
    vm.addIntrinsic("Sprite", 
    function() {
      return spriteType;
    });
  
    // These properties should be overridden
    // at an instance / subclass level
    spriteType.set("x", 0);
    spriteType.set("y", 0);
    spriteType.set("image", null);
  
    // These _can_ be overridden, if needed
    spriteType.set("scale", 1);
    spriteType.set("rotation", 0);
    spriteType.set("tint", "#FFFFFF");
    spriteType.set("localBounds", null);
  
    // Methods
  
    vm.addMapIntrinsic(spriteType, "worldBounds(self)",
    function(spriteMap: HashMap): HashMap | null {
      const worldBounds = outerThis.getWorldBounds(spriteMap);
      if (worldBounds) {
        return worldBounds.toMap();        
      } else {
        return null;
      }
    });
  
    vm.addMapIntrinsic(spriteType, "contains(self,x=0,y=0)",
    function(spriteMap: HashMap, x: any, y: any): number {
      return outerThis.contains(spriteMap, x, y);
    });
  
    vm.addMapIntrinsic(spriteType, "overlaps(self,other)",
    function(spriteMap: HashMap, other: any): number {
      return outerThis.overlaps(spriteMap, other);
    });
  
  }

  getWorldBounds(spriteMap: HashMap): Bounds | null {
    const vm = this.vm;
    // Get localBounds
    const localBoundsMap = vm.mapAccessOpt(spriteMap, "localBounds");
    const localBounds = Bounds.fromMap(vm, localBoundsMap);
    if (localBounds) {
      // Calculate world bounds (localBounds on the screen)
      const x = toNumberValue(vm.mapAccessOpt(spriteMap, "x"));
      const y = toNumberValue(vm.mapAccessOpt(spriteMap, "y"));
      const [scaleX, scaleY] = this.getSpriteScale(spriteMap);
      const worldWidth = localBounds.width * scaleX;
      const worldHeight = localBounds.height * scaleY;
      const worldBounds = new Bounds(x, y, worldWidth, worldHeight);
      return worldBounds;
    } else {
      return null;
    }
  }

  contains(spriteMap: HashMap, x: any, y: any): number {
    const worldBounds = this.getWorldBounds(spriteMap);
    if (worldBounds) {
      const point = Point.fromParams(this.vm, x, y);
      if (point) {
        const result = worldBounds.contains(point);
        return result ? 1 : 0;
      }
    }
    return 0;
  }

  overlaps(spriteMap: HashMap, other: any): number {
    const worldBounds = this.getWorldBounds(spriteMap);
    if (worldBounds) {
      const otherBounds = this.getWorldBounds(other);
      if (otherBounds) {
        const result = worldBounds.overlaps(otherBounds);
        return result ? 1 : 0;
      }
    }
    return 0;
  }

}