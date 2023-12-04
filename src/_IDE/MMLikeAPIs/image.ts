
function toImageMap(htmlImg: HTMLImageElement): HashMap {
  const map = new HashMap();
  const nativeTexture = PIXI.Texture.from(htmlImg);
  map.set("_handle", nativeTexture);
  map.set("width", htmlImg.width);
  map.set("height", htmlImg.height);
  return map;
}

function getNativeTexture(map: HashMap): any | null {
  const nativeTexture = map.get("_handle");
  if (nativeTexture instanceof PIXI.Texture) {
    return nativeTexture;
  } else {
    return null;
  }
}

function getNativeImage(map: HashMap): HTMLImageElement | null {
  const nativeTexture = map.get("_handle");
  if (nativeTexture instanceof PIXI.Texture) {
    const baseTexture = nativeTexture.castToBaseTexture();
    const nativeImg: HTMLImageElement = baseTexture.resource.source;
    return nativeImg;
  } else {
    return null;
  }
}
