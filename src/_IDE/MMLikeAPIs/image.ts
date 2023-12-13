
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
    const nativeTexture = getNativeTexture(vm, map);
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

  vm.addMapIntrinsic(map, "setPixel(x,y,clr)",
  function(x: number, y: number, color: string) {
    const baseImg = getBaseImageFromMap(vm, map);
    if (baseImg instanceof HTMLImageElement) {
      const [canvas, ctx] = canvasAndCtxWithImage(baseImg);
      y = baseImg.height - y;
      setPixel(ctx, x, y, color);
      // Re-set the texture as Canvas
      const newCanvasTexture = PIXI.Texture.from(canvas);
      map.set("_handle", newCanvasTexture);
    } else if(baseImg instanceof HTMLCanvasElement) {
      const ctx = baseImg.getContext('2d') as CanvasRenderingContext2D;
      y = baseImg.height - y;
      setPixel(ctx, x, y, color);
    } else {
      console.error("Setting pixel on non-canvas element", baseImg);
    }
  });

  vm.addMapIntrinsic(map, "pixel(x,y)",
  function(x: number, y: number): string {
    const img = getBaseImageFromMap(vm, map);
    if (img instanceof HTMLImageElement) {
      // Convert base image to canvas
      // Future pixel-accesses should be faster
      const [canvas, ctx] = canvasAndCtxWithImage(img);
      const newCanvasTexture = PIXI.Texture.from(canvas);
      map.set("_handle", newCanvasTexture);
      y = img.height - y;
      const pixelData = ctx.getImageData(x, y, 1, 1).data;
      const color = new PIXI.Color(pixelData);
      const colorStr = color.toHexa().toUpperCase();
      return colorStr;
    } else if (img instanceof HTMLCanvasElement) {
      const ctx = img.getContext("2d") as CanvasRenderingContext2D;
      y = img.height - y;
      const pixelData = ctx.getImageData(x, y, 1, 1).data;
      const color = new PIXI.Color(pixelData);
      const colorStr = color.toHexa().toUpperCase();
      return colorStr;
    } else {
      return "#FFFFFF00";
    }
  });

  return map;
}

function canvasAndCtxWithImage(img: HTMLImageElement): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(img, 0, 0);
  return [canvas, ctx];
}

function setPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  
  if (Display.isTransparentColor(color)) {
    ctx.save();
    ctx.fillStyle = "white";
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect( x, y, 1, 1 );
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect( x, y, 1, 1 );
  ctx.restore();
}

function getBaseImageFromMap(vm: Processor, map: HashMap): any | null {
  const nativeTexture = getNativeTexture(vm, map);
  const img = getBaseImage(nativeTexture);
  return img;
}

function getNativeTexture(vm: Processor, map: HashMap): any | null {
  const nativeTexture = vm.mapAccessOpt(map, "_handle");
  if (nativeTexture instanceof PIXI.Texture) {
    return nativeTexture;
  } else {
    return null;
  }
}

function getBaseImage(nativeTexture: any): HTMLImageElement | HTMLCanvasElement | null {
  if (nativeTexture instanceof PIXI.Texture) {
    const baseTexture = nativeTexture.castToBaseTexture();
    const nativeImg = baseTexture.resource.source;
    return nativeImg;
  } else {
    return null;
  }
}
