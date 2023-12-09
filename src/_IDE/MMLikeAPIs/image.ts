
function toImageMap(vm: Processor, htmlImg: HTMLImageElement): HashMap {
  const nativeTexture = PIXI.Texture.from(htmlImg);
  const map = toImageMapFromTexture(vm, nativeTexture);
  return map;
}

function toImageMapFromTexture(vm: Processor, nativeTexture: any): HashMap {
  const map = new HashMap();

  map.set("_handle", nativeTexture);
  map.set("width", nativeTexture.width);
  map.set("height", nativeTexture.height);

  vm.addMapIntrinsic(map, "getImage(left=0,bottom=0,width,height)",
  function(x:any, y:any, width: any, height: any): HashMap {
    const originalFrame = nativeTexture.frame;
    y = originalFrame.height - y - height;
    const subFrame = new PIXI.Rectangle(originalFrame.x + x,originalFrame.y + y,width,height);
    const newTexture = new PIXI.Texture(nativeTexture.baseTexture, subFrame);
    const newImageMap = toImageMapFromTexture(vm, newTexture);
    return newImageMap;
  });

  vm.addMapIntrinsic(map, "flip(self)", 
  function(imgMap: HashMap) {
    const texture = getNativeTexture(vm, imgMap);
    if (texture) {
      // Toggle texture mirroring on the horizontal axis
      if (texture.rotate === PIXI.groupD8.MIRROR_HORIZONTAL) {
        texture.rotate = PIXI.groupD8.E;
      } else {
        texture.rotate = PIXI.groupD8.MIRROR_HORIZONTAL;
      }
    }
  });

  return map;
}

function getNativeTexture(vm: Processor, map: HashMap): any | null {
  const nativeTexture = vm.mapAccessOpt(map, "_handle");
  if (nativeTexture instanceof PIXI.Texture) {
    return nativeTexture;
  } else {
    return null;
  }
}

function getBaseImage(nativeTexture: any): HTMLImageElement | null {
  if (nativeTexture instanceof PIXI.Texture) {
    const baseTexture = nativeTexture.castToBaseTexture();
    const nativeImg: HTMLImageElement = baseTexture.resource.source;
    return nativeImg;
  } else {
    return null;
  }
}
