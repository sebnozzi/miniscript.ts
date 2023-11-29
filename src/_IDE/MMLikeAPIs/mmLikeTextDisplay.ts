
type TxtDspCell = {
  char: string,
  fgColor: string,
  bgColor: string | null,
}

class MMLikeTxtDisp {

  private gfx: GfxPrimitives;
  private rowCells: TxtDspCell[][];
  private color: string;
  private backColor: string | null;

  constructor(private vm: Processor) {
    this.gfx = new GfxPrimitives("txtDsp");
    
    this.color = "orange";
    this.backColor = null;

    this.rowCells = [];

    for (let rowNr = 0; rowNr < 26; rowNr++) {
      const row: TxtDspCell[] = [];
      for (let colNr = 0; colNr < 68; colNr++) {
        const cell: TxtDspCell = {
          char: "",
          bgColor: this.backColor,
          fgColor: this.color,
        }
        row.push(cell);
      }
      this.rowCells.push(row);
    }
  }

  addTextAPI() {
    const vm = this.vm;
    const outerThis = this;
    const textMap = new HashMap();

    vm.addIntrinsic("text", 
    function() {
      return textMap;
    });

    vm.addMapIntrinsic(textMap, "setCell(k,x,y)",
    function(ch: string, colNr: number, mmRowNr: number) {
      const rowNr = 25 - mmRowNr;
      const row = outerThis.rowCells[rowNr];
      const oldCell = row[colNr];
      const newCell = {
        char: ch,
        bgColor: oldCell.bgColor,
        fgColor: oldCell.fgColor,
      }
      row[colNr] = newCell;
      outerThis.repaintCell(newCell, colNr, mmRowNr);
    });

    vm.addMapIntrinsic(textMap, "setCellColor(x,y,color)",
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

    vm.addMapIntrinsic(textMap, "setCellBackColor(x,y,color)",
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