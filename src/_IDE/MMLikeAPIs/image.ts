
function toImageMap(nativeImg: HTMLImageElement): HashMap {
  const map = new HashMap();
  map.set("_handle", nativeImg);
  map.set("width", nativeImg.width);
  map.set("height", nativeImg.height);
  return map;
}

function getNativeImg(map: HashMap): HTMLImageElement | null {
  const img = map.get("_handle");
  if (img instanceof HTMLImageElement) {
    return img;
  } else {
    return null;
  }
}
