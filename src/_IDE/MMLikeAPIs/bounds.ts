function createBoundsType(vm: Processor): HashMap {
  const bounds = new HashMap();

  bounds.set("x", 0);
  bounds.set("y", 0);
  bounds.set("width", 100);
  bounds.set("height", 100);

  vm.addIntrinsic("Bounds", 
  function() {
    return bounds;
  });

  vm.addMapIntrinsic(bounds, "overlaps(self,other)", 
  function(self: HashMap, other: any): number | null {
    const selfBounds = Bounds.fromMap(vm, self);
    const otherBounds = Bounds.fromMap(vm, other);
    if (selfBounds && otherBounds) {
      const result = selfBounds.overlaps(otherBounds);
      return result ? 1 : 0;
    } else {
      return null;
    }
  });

  vm.addMapIntrinsic(bounds, "contains(self,x=0,y=0)", 
  function(self: HashMap, xOrPoint: any, y: any): number | null {
    const selfBounds = Bounds.fromMap(vm, self);
    const point = Point.fromParams(vm, xOrPoint, y);
    if (selfBounds && point) {
      const result = selfBounds.contains(point);
      return result ? 1 : 0;
    }
    return null;
  });

  return bounds;
}

class Point {

  constructor(readonly x: number, readonly y: number) {

  }

  static fromParams(vm: Processor, xOrPoint: any, y: any): Point | null {
    let x: any = null;

    if (xOrPoint instanceof HashMap) {
      x = vm.mapAccessOpt(xOrPoint, "x");
      y = vm.mapAccessOpt(xOrPoint, "y");

    } else if (xOrPoint instanceof Array) {
      if (xOrPoint.length == 2) {
        x = xOrPoint[0];
        y = xOrPoint[1];
      }
    } else if (typeof xOrPoint === "number") {
      x = xOrPoint;
    }

    if (typeof x === "number" && typeof y === "number") {
      return new Point(x, y);
    } else {
      return null;
    }
  }
}

class Bounds {
  
  readonly left: number;
  readonly bottom: number;
  readonly top: number;
  readonly right: number;

  constructor(
    public readonly x: number, 
    public readonly y: number, 
    public readonly width: number, 
    public readonly height: number) {
      //
      this.left = x;
      this.bottom = y;
      this.top = y + height;
      this.right = x + width;
  }

  static fromMap(vm: Processor, map: HashMap): Bounds | null {
    if (!(map instanceof HashMap)) {
      return null;
    }
    let x = vm.mapAccessOpt(map, "x");
    let y = vm.mapAccessOpt(map, "y");
    let width = vm.mapAccessOpt(map, "width");
    let height = vm.mapAccessOpt(map, "height");
    if (x !== undefined && y !== undefined 
      && width !== undefined && height !== undefined) {
      x = toNumberValue(x);
      y = toNumberValue(y);
      width = toNumberValue(width);
      height = toNumberValue(height);
      const b = new Bounds(x, y, width, height);
      return b;
    }
    return null;
  }

  toMap(): HashMap | null {
    const map = new HashMap();
    map.set("x", this.x);
    map.set("y", this.y);
    map.set("width", this.width);
    map.set("height", this.height);
    return map;
  }

  overlaps(other: Bounds): boolean {
    const result = (this.left <= other.right && this.right >= other.left &&
    this.top >= other.bottom && this.bottom <= other.top);
    return result;
  }

  contains(point: Point): boolean {
    const result = (point.x >= this.left && point.x <= this.right &&
      point.y >= this.bottom && point.y <= this.top);
      return result
  }

}