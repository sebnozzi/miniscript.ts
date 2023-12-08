class TileDisplayConfig {
  
  static fromMap(vm: Processor, dsp: HashMap): TileDisplayConfig {
    const params = new TileDisplayConfig();

    params.tileSet = vm.mapAccessOpt(dsp, "tileSet");
    params.tileSetTileSize = toTwoNumbers(vm.mapAccessOpt(dsp, "tileSetTileSize"));
    params.extent = toTwoNumbers(vm.mapAccessOpt(dsp, "extent"));

    return params;
  }

  tileSet: any = null;
  tileSetTileSize: [number, number] = [64, 64]
  extent: [number, number] = [12, 7];

  isEqualTo(other: TileDisplayConfig): boolean {
    const result = (
      this.tileSet === other.tileSet
      && (equals(this.extent, other.extent) == 1)
      && (equals(this.tileSetTileSize, other.tileSetTileSize) == 1)
    );
    return result;
  }

}

class TileDisplayVisuals {
  
  static fromMap(vm: Processor, dsp: HashMap): TileDisplayVisuals {
    const params = new TileDisplayVisuals();

    params.cellSize = toTwoNumbers(vm.mapAccessOpt(dsp, "cellSize"));
    params.overlap = toTwoNumbers(vm.mapAccessOpt(dsp, "overlap"));
    params.scrollX = vm.mapAccessOpt(dsp, "scrollX");
    params.scrollY = vm.mapAccessOpt(dsp, "scrollY");

    return params;
  }

  cellSize: [number, number] = [64, 64];
  overlap: [number, number] = [0, 0]
  scrollX: number = 0;
  scrollY: number = 0;

  isEqualTo(other: TileDisplayVisuals): boolean {
    const result = (
      (equals(this.cellSize, other.cellSize) == 1)
      && (equals(this.overlap, other.overlap) == 1)
      && this.scrollX === other.scrollX
      && this.scrollY === other.scrollY
    );
    return result;
  }

}

class TileDisplay extends Display  {

  private config: TileDisplayConfig;
  private visuals: TileDisplayVisuals;
  private indexes: HashMap;
  private cellSprites: HashMap;
  private cellTints: HashMap;
  private configChanged: boolean;
  private visualsChanged: boolean;
  private indexesChanged: boolean;
  private textureDict: {[tileId: string]: any};

  constructor(dspMgr: MMLikeDisplayManager) {
    super(dspMgr);

    this.config = new TileDisplayConfig();
    this.visuals = new TileDisplayVisuals();

    this.configChanged = false;
    this.visualsChanged = false;
    this.indexesChanged = false;

    this.indexes = new HashMap();
    this.cellSprites = new HashMap();
    this.cellTints = new HashMap();
    this.textureDict = {};
  }

  getModeNr(): DisplayMode {
    return DisplayMode.tile;
  }

  update() {
    const dsp = this.dsp;

    const potentiallyChangedConfig = TileDisplayConfig.fromMap(this.vm, dsp);
    if (!this.config.isEqualTo(potentiallyChangedConfig)) {
      this.config = potentiallyChangedConfig;
      this.configChanged = true;
    }

    const potentiallyChangedVisuals = TileDisplayVisuals.fromMap(this.vm, dsp);
    if (!this.visuals.isEqualTo(potentiallyChangedVisuals)) {
      this.visuals = potentiallyChangedVisuals;
      this.visualsChanged = true;
    }

    if (this.configChanged) {
      this.rebuildContainer();
    }

    if (this.visualsChanged) {
      this.updateVisuals();
    } 

    if (this.indexesChanged) {
      this.updateContents();
    }
  
  }

  rebuildContainer() {
    const params = this.config;

    if (params.tileSet === null) {
      // Rebuild cells without any visual / content aspects
      this.rebuildCells();
    } else {
      const sheetImg = getNativeImage(this.vm, params.tileSet);
      if (sheetImg) {
        const [tileWidth, tileHeight] = params.tileSetTileSize;
        const promise = this.makeSpriteSheetMap(sheetImg, tileWidth, tileHeight);
        promise.then((textureMap) => {
          this.textureDict = textureMap;
          this.rebuildCells();
          this.updateVisuals();
          this.updateContents();
        });
      }    
    }

    this.configChanged = false;
    this.visualsChanged = false;
    this.indexesChanged = false;
  }

  // Promise of a ready-to-use texture-map
  makeSpriteSheetMap(sheetImg: HTMLImageElement, tileWidth: number, tileHeight: number): Promise<any> {
     
      // Size of sheet
      const sheetWidth = sheetImg.width;
      const sheetHeight = sheetImg.height;

      // Amount of cols / rols in tileSheet
      const sheetColumns = Math.floor(sheetWidth / tileWidth);
      const sheetRows = Math.floor(sheetHeight / tileHeight);

      // Build frames
      const frames: {[key:string]:Object} = {};
      let idx: number = 0;
      for (let rowNr = 0; rowNr < sheetRows; rowNr++) {
        for (let colNr = 0; colNr < sheetColumns; colNr++) {
          const x = colNr * tileWidth;
          const y = rowNr * tileHeight;
          frames[`tile_${idx}.png`] = {
            "frame": {"x":x, "y":y, "w":tileWidth, "h":tileHeight},
            "spriteSourceSize": {"x":0,"y":0,"w":tileWidth,"h":tileHeight},
            "sourceSize": {"w":tileWidth,"h":tileHeight},
            "anchor": {"x":0,"y":0}
          };
          idx++;
        }
      }

      const spritesheetData = {
        "frames": frames,
        "meta": {
          "size": {"w": sheetImg.width, "h": sheetImg.height},
        },
      };

      const tileSheetTexture = PIXI.Texture.from(sheetImg);
      const sheet = new PIXI.Spritesheet(tileSheetTexture, spritesheetData);
      return sheet.parse();
  }

  rebuildCells() {
    const container = this.pixiContainer;
    const config = this.config;

    // Remove all cells
    container.removeChildren();
    this.cellSprites = new HashMap();
    this.cellTints = new HashMap();

    const [columns, rows] = config.extent;

    // Create new cells (sprites)
    for (let rowNr = 0; rowNr < rows; rowNr++) {
      for (let colNr = 0; colNr < columns; colNr++) {
        const cellSprite = new PIXI.Sprite();
        container.addChild(cellSprite);
        this.cellSprites.set([colNr,rowNr], cellSprite);
      }
    }
  }

  updateVisuals() {
    const [columns, rows] = this.config.extent;

    const visuals = this.visuals;
    const scrollX = visuals.scrollX;
    const scrollY = visuals.scrollY;
    const [cellWidth, cellHeight] = visuals.cellSize;
    const [overlapX, overlapY] = visuals.overlap;

    const cellAreaHeight = rows * cellHeight - (overlapY * (rows - 1));
    const contentsTop = this.toTop(0, cellAreaHeight);

    // Change visuals, like size, position / scolling
    for (let rowNr = 0; rowNr < rows; rowNr++) {

      const mmRowNr = (rows - 1) - rowNr;
      let y = contentsTop + mmRowNr * cellHeight + scrollY;
      if (mmRowNr > 0) {
        y -= (overlapY * mmRowNr);
      }

      for (let colNr = 0; colNr < columns; colNr++) {
        const cellSprite = this.cellSprites.get([colNr, rowNr]);
        if (cellSprite) {

          let x = (-scrollX) + colNr * cellWidth;
          if (colNr > 0) {
            x -= overlapX * colNr;
          }

          cellSprite.x = x;
          cellSprite.y = y;
          cellSprite.width = cellWidth;
          cellSprite.height = cellHeight;
        }
      }
    }

    this.visualsChanged = false;
  }

  updateContents() {
    const [columns, rows] = this.config.extent;
    const textureDict = this.textureDict;

    // Set contents
    for (let rowNr = 0; rowNr < rows; rowNr++) {
      for (let colNr = 0; colNr < columns; colNr++) {
        const cellSprite = this.cellSprites.get([colNr, rowNr]);
        const cellTint = this.cellTints.get([colNr, rowNr]);
        if (cellSprite) {
          const idx = this.cell(colNr, rowNr);
          const frameId = `tile_${idx}.png`;
          const texture = textureDict[frameId];
          cellSprite.texture = texture;
          if (cellTint) {
            const [tint, alpha] = this.getTintAndAlpha(cellTint);
            cellSprite.tint = tint;
            cellSprite.alpha = alpha;
          }
          cellSprite.texture.update();
        }
      }
    }

    this.indexesChanged = false;
  }

  protected addDisplayAPI(dsp: HashMap): void {
    const vm = this.vm;
    const outerThis = this;

    // Default values
    dsp.set("extent", [12, 7]);
    dsp.set("tileSet", null);
    dsp.set("cellSize", [64, 64]);
    dsp.set("tileSetTileSize", [64, 64]);
    dsp.set("overlap", [0, 0]);
    dsp.set("scrollX", 0);
    dsp.set("scrollY", 0);

    vm.addMapIntrinsic(dsp, "clear(self,toIndex=null)",
    function(dsp: HashMap, index: any) {
      outerThis.clear(dsp, index);
    });

    vm.addMapIntrinsic(dsp, "cell(self,x,y)",
    function(dsp: HashMap, x: any, y: any) {
      return outerThis.cell(x, y);
    });

    vm.addMapIntrinsic(dsp, "setCell(self,x,y,index)",
    function(dsp: HashMap, x: any, y: any, index: any) {
      outerThis.setCell(x, y, index);
    });

    vm.addMapIntrinsic(dsp, 'setCellTint(self,x=0,y=0,tint="#FFFFFF")',
    function(dsp: HashMap, x: any, y: any, color: any) {
      outerThis.setCellTint(x, y, color);
    });

    vm.addMapIntrinsic(dsp, 'cellTint(self,x,y)',
    function(dsp: HashMap, x: any, y: any) {
      return outerThis.cellTint(x, y);
    });

  }

  clear(dsp: HashMap, index: any) {
    const config = TileDisplayConfig.fromMap(this.vm, dsp);
    const [cols, rows] = config.extent;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.setCell(col, row, index);
        this.indexesChanged = true;
      }
    }
  }

  setCell(colNr: any, rowNr: any, tileSetIndex: any) {
    this.indexes.set([colNr, rowNr], tileSetIndex);
    this.indexesChanged = true;
  }

  cell(colNr: any, rowNr: any): number | null {
    const idx = this.indexes.get([colNr, rowNr]);
    return Number.isInteger(idx) ? idx : null;
  }

  setCellTint(colNr: any, rowNr: any, color: any) {
    this.cellTints.set([colNr, rowNr], color);
    this.indexesChanged = true;
  }

  cellTint(colNr: any, rowNr: any): string | null {
    const tint = this.cellTints.get([colNr, rowNr]) ;
    if (tint === undefined) {
      return "#FFFFFFFF";
    } else {
      return tint;
    }
  }

}