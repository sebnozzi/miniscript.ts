
class ParseError extends Error {}

// Location in the source-code.
class SrcLocation {

  public readonly start: Pos;
  public readonly end: Pos;
  public readonly source: string;

  constructor(start: Pos, end: Pos, source: string | undefined) {
    if (start.idx > end.idx) {
      throw new Error("Start must be less than end");
    }
    this.start = start;
    this.end = end;
    if (source !== undefined) {
      this.source = source;
    } else {
      this.source = "inline";
    }
  }

  static forTokenRange(firstToken: Token, lastToken: Token): SrcLocation {
    const firstLocation = firstToken.location;
    const lastLocation = lastToken.location;
    return firstLocation.upTo(lastLocation);
  }

  upTo(otherLocation: SrcLocation): SrcLocation {
    if (otherLocation.start.idx < this.end.idx) {
      throw new Error("The other location must be further ahead than the first one");
    }
    const newStart = this.start;
    const newEnd = otherLocation.end;
    const newLocation = new SrcLocation(newStart, newEnd, this.source);
    return newLocation;
  }

  toString(): string {
    return `[(row:${this.start.row},col:${this.start.col}) to (row:${this.end.row},col:${this.end.col})]`
  }

}

class Pos {

  idx: number;
  col: number;
  row: number;

  constructor(idx: number, col: number, row: number) {
    this.idx = idx;
    this.col = col;
    this.row = row;
  }

  copy() {
    return new Pos(this.idx, this.col, this.row);
  }

  advance() {
    this.idx=this.idx + 1
    this.col=this.col + 1
  }

  moveToNewLine() {
    this.idx=this.idx
    this.col=1
    this.row=this.row + 1
  }

  toString() {
    return `(idx=${this.idx},row=${this.row},col=${this.col})`
  }
}
