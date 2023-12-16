
export enum DisplayMode {
  off = 0,
  solidColor = 1,
  text = 2,
  pixel = 3,
  tile = 4,
  sprite = 5
};

export const displayModeNamesAndValues = [
  {name: "off", value: DisplayMode.off},
  {name: "solidColor", value: DisplayMode.solidColor},
  {name: "pixel", value: DisplayMode.pixel},
  {name: "text", value: DisplayMode.text},
  {name: "tile", value: DisplayMode.tile},
  {name: "sprite", value: DisplayMode.sprite}
];