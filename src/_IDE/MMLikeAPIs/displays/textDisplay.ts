type TxtDspCell = {
  char: string,
  fgColor: string,
  bgColor: string,
}

class TextDisplay extends Display {

  private rowCells: TxtDspCell[][];

  private defaultFgColor = "#C0C0C0FF";
  private defaultBgColor = "#00000000"
  private defaultDelimiter = "\n";

  private charContainers: Array<any>;

  
  constructor(dspMgr: MMLikeDisplayManager) {
    super(dspMgr);

    this.rowCells = this.makeCellRows();

    this.charContainers = new Array();

    this.initGraphics();
  }

  getModeNr(): DisplayMode {
    return DisplayMode.text;
  }

  private initGraphics() {
    const originX = 5;
    const originY = 6;

    const charHeight = 24;
    const charWidth = 14;

    const parentContainer = this.pixiContainer; 
    parentContainer.x = originX;
    parentContainer.y = this.toTop(originY, charHeight * 26);

    const charBgPrototype = new PIXI.Graphics();
    // Fill with solid white
    charBgPrototype.beginFill("white");
    charBgPrototype.drawRect(0, 0, charWidth, charHeight);
    charBgPrototype.endFill();

    const charContainers = this.charContainers;

    for (let rowNr = 0; rowNr < 26; rowNr++) {
      for (let colNr = 0; colNr < 68; colNr++) {
        const charContainer = new PIXI.Container();

        const charText = new PIXI.BitmapText('', { fontName: 'TextFontNormal' });
        const charBg = charBgPrototype.clone();

        charBg.visible = false;

        charBg.name = "bg";
        charText.name = "txt";

        charContainer.addChild(charBg);
        charContainer.addChild(charText);

        parentContainer.addChild(charContainer);
        charContainer.x = colNr * charWidth;
        charContainer.y = rowNr * charHeight;

        charContainers.push(charContainer);
      }
    }
  }

  print(str: string, delimiter: string) {
    const [colNr, rowNr] = this.getCursorPosition();
    for (let ch of Array.from(str)) {
      this.putChar(ch);
    }
    if (delimiter === null) {
      delimiter = this.getDelimiter();
    }

    for (let ch of Array.from(delimiter)) {
      this.putChar(ch);
    }
  }

  addDisplayAPI(): void {
    const vm = this.dspMgr.vm;
    const outerThis = this;
    
    this.dsp.set("color", this.defaultFgColor);
    this.dsp.set("backColor", this.defaultBgColor);
    this.dsp.set("column", 0);
    this.dsp.set("row", 25);
    this.dsp.set("delimiter", this.defaultDelimiter);

    vm.addMapIntrinsic(this.dsp, "setCell(k,x,y)",
    function(ch: string, colNr: number, mmRowNr: number) {
      outerThis.setCell(ch, colNr, mmRowNr);
    });

    vm.addMapIntrinsic(this.dsp, "setCellColor(x,y,color)",
    function(colNr: number, mmRowNr: number, color: string) {
      const rowNr = 25 - mmRowNr;
      const row = outerThis.rowCells[rowNr];
      const oldCell = row[colNr];
      const newCell = {
        char: oldCell.char,
        bgColor: oldCell.bgColor,
        fgColor: color,
      }
      row[colNr] = newCell;
      outerThis.repaintCell(newCell, colNr, mmRowNr);
    });

    vm.addMapIntrinsic(this.dsp, "setCellBackColor(x,y,color)",
    function(colNr: number, mmRowNr: number, color: string) {
      const rowNr = 25 - mmRowNr;
      const row = outerThis.rowCells[rowNr];
      const oldCell = row[colNr];
      const newCell = {
        char: oldCell.char,
        bgColor: color,
        fgColor: oldCell.fgColor,
      }
      row[colNr] = newCell;
      outerThis.repaintCell(newCell, colNr, mmRowNr);
    });

    vm.addMapIntrinsic(this.dsp, 'print(str="",delimiter=null)',
    function(str: string, delimiter: string) {
      str = formatValue(str);
      outerThis.print(str, delimiter);
    });

    vm.addMapIntrinsic(this.dsp, 'clear',
    function() {
      outerThis.clear();
    });

  }

  private clear() {
    this.rowCells = this.makeCellRows();
    this.repaintAllCells();
  }

  private makeCellRows(): TxtDspCell[][] {
    const rowCells: TxtDspCell[][] = [];

    const fgColor = this.getCurrentFgColor();
    const bgColor = this.getCurrentBgColor();

    for (let rowNr = 0; rowNr < 26; rowNr++) {
      const row: TxtDspCell[] = this.makeRow(fgColor, bgColor);
      rowCells.push(row);
    }

    return rowCells;
  }

  private makeRow(fgColor: string, bgColor: string): TxtDspCell[] {
    const row: TxtDspCell[] = [];
    for (let colNr = 0; colNr < 68; colNr++) {
      const cell: TxtDspCell = {
        char: "",
        bgColor: bgColor,
        fgColor: fgColor,
      }
      row.push(cell);
    }
    return row;
  }

  private getCurrentFgColor(): string {
    const vm = this.dspMgr.vm;
    const optColor = vm.mapAccessOpt(this.dsp, "color");
    if (typeof optColor === "string") {
      return optColor
    } else {
      return this.defaultFgColor;
    }
  }

  private getCurrentBgColor(): string {
    const vm = this.dspMgr.vm;
    const optColor = vm.mapAccessOpt(this.dsp, "backColor");
    if (typeof optColor === "string") {
      return optColor
    } else {
      return this.defaultBgColor;
    }
  }

  private getDelimiter(): string {
    const vm = this.dspMgr.vm;
    const d = vm.mapAccessOpt(this.dsp, "delimiter");
    if (typeof d === "string") {
      return d
    } else {
      return this.defaultDelimiter;
    }
  }

  private getCursorPosition(): [number, number] {
    const vm = this.dspMgr.vm;
    let col = vm.mapAccessOpt(this.dsp, "column");
    let row = vm.mapAccessOpt(this.dsp, "row");
    if (typeof col !== "number") {
      col = 0;
    }
    if (typeof row !== "number") {
      row = 25;
    }
    return [col, row];
  }

  private putChar(ch: string) {
    if (ch === "\n") {
      this.goToNewLine();
    } else {
      let [colNr, rowNr] = this.getCursorPosition();
      this.setCell(ch, colNr, rowNr);
      this.setCurrentColors(colNr, rowNr);
      this.advanceCursor();
    }
  }

  private advanceCursor() {
    let [colNr, _] = this.getCursorPosition();
    this.dsp.set("column", colNr + 1);
    if (colNr + 1 > 67) {
      this.goToNewLine();
    }
  }

  private goToNewLine() {
    let [_, rowNr] = this.getCursorPosition();
    this.dsp.set("column", 0);
    this.dsp.set("row", rowNr - 1);
    if (rowNr - 1 < 0) {
      this.scrollUp();
      this.dsp.set("row", 0);
    }
  }

  private scrollUp() {
    const fgColor = this.getCurrentFgColor();
    const bgColor = this.getCurrentBgColor();
    // Append new row at the end
    const newRow = this.makeRow(fgColor, bgColor);
    this.rowCells.push(newRow);
    // Delete first row
    this.rowCells.splice(0, 1);
    // Repaint!
    this.repaintAllCells();
  }

  private repaintAllCells() {
    for (let mmRowNr = 0; mmRowNr < 26; mmRowNr++) {
      const rowNr = 25 - mmRowNr;
      const row = this.rowCells[rowNr];
      for (let colNr = 0; colNr < 68; colNr++) {
        const cell = row[colNr];
        this.repaintCell(cell, colNr, mmRowNr);
      }
    }
  }

  private setCell(ch: string, colNr: number, mmRowNr: number) {
      const rowNr = 25 - mmRowNr;
      const row = this.rowCells[rowNr];
      const oldCell = row[colNr];
      const newCell = {
        char: ch,
        bgColor: oldCell.bgColor,
        fgColor: oldCell.fgColor,
      }
      row[colNr] = newCell;
      this.repaintCell(newCell, colNr, mmRowNr);
  }

  private setCurrentColors(colNr: number, mmRowNr: number) {
    const rowNr = 25 - mmRowNr;
    const row = this.rowCells[rowNr];
    const oldCell = row[colNr];
    const newCell = {
      char: oldCell.char,
      bgColor: this.getCurrentBgColor(),
      fgColor: this.getCurrentFgColor(),
    }
    row[colNr] = newCell;
    this.repaintCell(newCell, colNr, mmRowNr);
  }

  private repaintCell(cell: TxtDspCell, colNr: number, mmRowNr: number) {

    const rowNr = 25 - mmRowNr;
    const idx = colNr + rowNr * 68;
    const container = this.charContainers[idx];

    const bgCell = container.getChildAt(0);
    const txtCell = container.getChildAt(1);

    const [fgTint, fgAlpha] = this.getTintAndAlpha(cell.fgColor);
    
    txtCell.text = cell.char;
    txtCell.tint = fgTint;
    txtCell.alpha = fgAlpha;

    const [bgTint, bgAlpha] = this.getTintAndAlpha(cell.bgColor);
    bgCell.tint = bgTint;
    bgCell.alpha = bgAlpha;
  }


}