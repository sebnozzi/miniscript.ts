
type TxtDspCell = {
  char: string,
  fgColor: string,
  bgColor: string | null,
}

class MMLikeTxtDisp {

  private gfx: GfxPrimitives;
  private rowCells: TxtDspCell[][];
  private textMap: HashMap;

  private defaultFgColor = "#C0C0C0FF";
  private defaultBgColor = "#00000000"
  private defaultDelimiter = "\n";

  constructor(private vm: Processor) {
    this.gfx = new GfxPrimitives("txtDsp");
    this.textMap = new HashMap();

    this.textMap.set("color", this.defaultFgColor);
    this.textMap.set("backColor", this.defaultBgColor);
    this.textMap.set("column", 0);
    this.textMap.set("row", 25);
    this.textMap.set("delimiter", this.defaultDelimiter);

    this.rowCells = this.makeCellRows();
  }

  print(str: string) {
    for (let ch of Array.from(str)) {
      this.putChar(ch);
    }
    const delimiter = this.getDelimiter();
    this.putChar(delimiter);
  }

  addTextAPI() {
    const vm = this.vm;
    const outerThis = this;
    
    vm.addIntrinsic("text", 
    function() {
      return outerThis.textMap;
    });

    vm.addMapIntrinsic(this.textMap, "setCell(k,x,y)",
    function(ch: string, colNr: number, mmRowNr: number) {
      outerThis.setCell(ch, colNr, mmRowNr);
    });

    vm.addMapIntrinsic(this.textMap, "setCellColor(x,y,color)",
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

    vm.addMapIntrinsic(this.textMap, "setCellBackColor(x,y,color)",
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

    vm.addMapIntrinsic(this.textMap, 'print(str="")',
    function(str: string) {
      outerThis.print(str);
    });

    vm.addMapIntrinsic(this.textMap, 'clear',
    function() {
      outerThis.clear();
    });

  }

  private clear() {
    this.rowCells = this.makeCellRows();
    this.gfx.clear(null);
  }

  private makeCellRows(): TxtDspCell[][] {
    const rowCells: TxtDspCell[][] = [];

    const fgColor = this.getCurrentFgColor();
    const bgColor = this.getCurrentBgColor();

    for (let rowNr = 0; rowNr < 26; rowNr++) {
      const row: TxtDspCell[] = [];
      for (let colNr = 0; colNr < 68; colNr++) {
        const cell: TxtDspCell = {
          char: "",
          bgColor: bgColor,
          fgColor: fgColor,
        }
        row.push(cell);
      }
      rowCells.push(row);
    }

    return rowCells;
  }

  private getCurrentFgColor(): string {
    const optColor = this.vm.mapAccessOpt(this.textMap, "color");
    if (typeof optColor === "string") {
      return optColor
    } else {
      return this.defaultFgColor;
    }
  }

  private getCurrentBgColor(): string {
    const optColor = this.vm.mapAccessOpt(this.textMap, "backColor");
    if (typeof optColor === "string") {
      return optColor
    } else {
      return this.defaultFgColor;
    }
  }

  private getDelimiter(): string {
    const d = this.vm.mapAccessOpt(this.textMap, "delimiter");
    if (typeof d === "string") {
      return d
    } else {
      return this.defaultDelimiter;
    }
  }

  private getCursorPosition(): [number, number] {
    let col = this.vm.mapAccessOpt(this.textMap, "column");
    let row = this.vm.mapAccessOpt(this.textMap, "row");
    if (typeof col !== "number") {
      col = 0;
    }
    if (typeof row !== "number") {
      row = 25;
    }
    return [col, row];
  }

  private putChar(ch: string) {
    let [colNr, rowNr] = this.getCursorPosition();
    this.setCell(ch, colNr, rowNr);
    this.setCurrentColors(colNr, rowNr);
    if (ch === "\n") {
      this.goToNewLine();
    } else {
      this.advanceCursor();
    }
  }

  private advanceCursor() {
    let [colNr, _] = this.getCursorPosition();
    this.textMap.set("column", colNr + 1);
    if (colNr + 1 > 67) {
      this.goToNewLine();
    }
  }

  private goToNewLine() {
    let [_, rowNr] = this.getCursorPosition();
    this.textMap.set("column", 0);
    this.textMap.set("row", rowNr - 1);
    if (rowNr - 1 < 0) {
      this.scrollUp();
      this.textMap.set("row", 0);
    }
  }

  private scrollUp() {
    throw new Error("Not Implemented!");
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

    const charHeight = 24 // height / 26
    const charWidth = 14 // width / 68
  
    const originX = 5 // 960 / 2 - ((charWidth * 68) / 2)
    const originY = 6 // 640 / 2 - ((charHeight * 26) / 2)

    const fontSize = 20;

    let y = originY + (mmRowNr ) * charHeight;
    y = this.gfx.toTop(y, 0);

    const x = originX + (colNr ) * charWidth
    let fgColor = cell.fgColor;
    let bgColor = cell.bgColor;
    this.gfx.clearRect(x,y-charHeight,charWidth+1,charHeight+1);
    if (bgColor) {
      this.gfx.fillRect(x,y-charHeight,charWidth+1,charHeight+1, bgColor);
    }
    this.gfx.drawText(cell.char, x, y, fgColor, fontSize);
  }

}