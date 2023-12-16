import * as PIXI from "pixi.js";
import { HashMap } from "../../../vm/hashmap";
import { toNumberValue } from "../../../vm/runtime";
import { getNativeTexture, getBaseImage, toImageMap, setPixel } from "../image";
import { MMLikeDisplayManager } from "../mmLikeDisplayManager";
import { Display } from "./display";
import { DisplayMode } from "./modes";

// Backed up by an HTMLCanvas, on each update it sets its contents 
// to a Pixi Sprite which displays the contents in its hierarchy.
// This is needed because Pixi's Graphics does not support everything
// we need, in particular rendering images.
export class PixelDisplay extends Display {

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pixiCanvasTexture: any;

  constructor(dspMgr: MMLikeDisplayManager) {
    super(dspMgr);
    this.canvas = document.createElement("canvas") as HTMLCanvasElement;
    this.canvas.setAttribute("image-rendering", "pixelated");
    this.canvas.setAttribute("image-rendering", "crisp-edges");
    this.canvas.width = 960;
    this.canvas.height = 640;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    // This is in order for the first line / row to be "visible".
    // Otherwise things like drawRect 0,0,... don't show the left/bottom lines.
    // Consequentially, all width / height parameters need to be shortened by 1.
    this.ctx.translate(1,1);

    this.pixiCanvasTexture = PIXI.Texture.from(this.canvas);
    const displaySprite = PIXI.Sprite.from(this.pixiCanvasTexture);
    this.pixiContainer.addChild(displaySprite);
    displaySprite.x = 0;
    displaySprite.y = 0;
  }

  update() {
    if (this.isDirty()) {
      this.pixiCanvasTexture.update();
      this.markUpdated();
    }
  }

  getModeNr(): DisplayMode {
    return DisplayMode.pixel;
  }

  addDisplayAPI(dsp: HashMap): void {
    const outerThis = this;
    const vm = this.vm;
    const gfxMap = dsp

    // Set the default color
    gfxMap.set("color", "#FFFFFFFF");

    vm.addMapIntrinsic(gfxMap, 'clear(color="#00000000", width=960, height=640)', 
    function(color:any, _1: any, _2: any) {
      outerThis.clear(color);
    });

    vm.addMapIntrinsic(gfxMap, "line(x0,y0,x1,y1,color,penSize)", 
    function(x0:number, y0:number, x1:number, y1:number, color:string, penSize: number) {
      outerThis.line(x0, y0, x1, y1, color, penSize);
    });
    
    vm.addMapIntrinsic(gfxMap, "drawImage(img,x,y,width=-1,height=-1)", 
    function(img: HashMap, x:number, y:number, width: number, height: number) {
      outerThis.drawImage(img, x, y, width, height);
    });

    vm.addMapIntrinsic(gfxMap, "fillRect(left,y,width,height,color)", 
    function(x:number, y:number, width:number, height:number, color:string) {
      outerThis.fillRect(x,y,width,height,color);
    });

    vm.addMapIntrinsic(gfxMap, "drawRect(left,y,width,height,color,penSize)", 
    function(x:number, y:number, width:number, height:number, color:string, penSize: number) {
      outerThis.drawRect(x,y,width,height,color,penSize);
    });

    vm.addMapIntrinsic(gfxMap, "fillEllipse(left,bottom,width,height,color)", 
    function(x:number, y:number, width:number, height:number, color:string) {
      outerThis.fillEllipse(x,y,width,height,color);
    });

    vm.addMapIntrinsic(gfxMap, "drawEllipse(left,bottom,width,height,color,penSize)", 
    function(x:number, y:number, width:number, height:number, color:string, penSize: number) {
      outerThis.drawEllipse(x,y,width,height,color,penSize);
    });

    vm.addMapIntrinsic(gfxMap, "drawPoly(points,color=null,penSize=1)", 
    function(points: any, color: any, penSize: any) {
      outerThis.drawPoly(points, color, penSize);
    });

    vm.addMapIntrinsic(gfxMap, "fillPoly(points,color=null)", 
    function(points: any, color: string) {
      outerThis.fillPoly(points, color);
    });

    vm.addMapIntrinsic(gfxMap, 'print(str="",x=0,y=0,color=null,fontName="normal")', 
    function(str: string, x: number, y: number, color:string, fontName: string) {
      outerThis.print(str,x,y,color,fontName);
    });

    vm.addMapIntrinsic(gfxMap, 'getImage(left,bottom,width,height)', 
    function(x:number, y:number, width:number, height:number) {
      return outerThis.getImage(x,y,width,height);
    });

    vm.addMapIntrinsic(gfxMap, 'pixel(left,bottom)', 
    function(x:number, y:number): string {
      return outerThis.getPixel(x,y);
    });

    vm.addMapIntrinsic(gfxMap, 'setPixel(left,bottom,clr)', 
    function(x:number, y:number, color: string) {
      outerThis.setPixel(x,y,color);
    });

  }

  private resolveColor(color: any): any {
    if (color) {
      return color;
    } else {
      // Resolve from display object
      const currentColor = this.vm.mapAccessOpt(this.dsp, "color");
      return currentColor;
    }
  }
  
  private clear(color: any) {
    color = this.resolveColor(color);
    const canvas = this.canvas;
    const ctx = this.ctx;
    this.ctx.translate(-1,-1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    if (color !== null) {
      ctx.fillStyle = color;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    this.ctx.translate(1,1);
    this.markDirty();
  }

  private line(x0: number, y0: number, x1: number, y1: number, color: string, penSize: number) {
    color = this.resolveColor(color);
    penSize = penSize ? penSize : 1;

    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);

    const ctx = this.ctx;
    y0 = Display.toTop(y0);
    y1 = Display.toTop(y1);

    if (Display.isTransparentColor(color)) {
      ctx.save();
      ctx.lineWidth = penSize;
      ctx.strokeStyle = "white";
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1-1, y1-1);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.lineWidth = penSize;
    ctx.strokeStyle = color;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1-1, y1-1);

    ctx.stroke();
    ctx.restore();

    this.markDirty();
  }

  private fillRect(x: number, y: number, width: number, height: number, color: string) {
    color = this.resolveColor(color);

    x = Math.round(x);
    y = Math.round(y);
    width = Math.round(width);
    height = Math.round(height);

    const ctx = this.ctx;
    y = Display.toTop(y, height);

    if (Display.isTransparentColor(color)) {
      ctx.save();
      ctx.fillStyle = "white";
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(x,y,width-1,height-1);
      ctx.restore();
    }
    
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(x,y,width-1,height-1);
    ctx.restore();

    this.markDirty();
  }

  private drawRect(x: number, y: number, width: number, height: number, color: string, penSize: number) {
    color = this.resolveColor(color);
    penSize = penSize ? penSize : 1;

    x = Math.round(x);
    y = Math.round(y);
    width = Math.round(width);
    height = Math.round(height);

    const ctx = this.ctx;
    y = Display.toTop(y, height);

    if (Display.isTransparentColor(color)) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "white";
      ctx.lineWidth = penSize;
      ctx.strokeRect(x, y, width-1, height-1);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    ctx.strokeRect(x, y, width-1, height-1);
    ctx.restore();

    this.markDirty();
  }

  private fillEllipse(x: number, y: number, width: number, height: number, color: string) {
    color = this.resolveColor(color);

    x = Math.round(x);
    y = Math.round(y);
    width = Math.round(width);
    height = Math.round(height);

    y = Display.toTop(y, height);
    x += Math.floor(width / 2);
    y += Math.floor(height / 2);

    width = Math.round(width / 2);
    height = Math.round(height / 2);

    const ctx = this.ctx;

    if (Display.isTransparentColor(color)) {
      ctx.save();
      ctx.fillStyle = "white";
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.ellipse(x,y,width,height,0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = color;
    ctx.lineWidth = 0.0;
    ctx.beginPath();
    ctx.ellipse(x,y,width,height,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();

    this.markDirty();
  }

  private drawEllipse(x: number, y: number, width: number, height: number, color: string, penSize: number) {
    color = this.resolveColor(color);
    penSize = penSize ? penSize : 1;

    x = Math.round(x);
    y = Math.round(y);
    width = Math.round(width);
    height = Math.round(height);

    y = Display.toTop(y, height);
    x += width;

    width = Math.round(width / 2);
    height = Math.round(height / 2);

    const ctx = this.ctx;

    if (Display.isTransparentColor(color)) {
      ctx.save();
      ctx.strokeStyle = "white";
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = penSize;
      ctx.beginPath();
      ctx.ellipse(x,y,width,height,0,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    ctx.beginPath();
    ctx.ellipse(x,y,width,height,0,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();

    this.markDirty();
  }

  private fillPoly(mmPoints: any, color: string) {
    color = this.resolveColor(color);

    const points = this.getPolygonPoints(mmPoints);
    
    if (points.length < 2) {
      return;
    }

    const ctx = this.ctx;

    if (Display.isTransparentColor(color)) {
      ctx.save();
      ctx.fillStyle = "white";
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 0;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    this.markDirty();
  }

  private drawPoly(mmPoints: any, color: string, penSize: number) {
    color = this.resolveColor(color);
    penSize = penSize ? penSize : 1;

    const points = this.getPolygonPoints(mmPoints);
    
    if (points.length < 2) {
      return;
    }

    const ctx = this.ctx;

    if (Display.isTransparentColor(color)) {
      ctx.save();
      ctx.strokeStyle = "white";
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = penSize;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    this.markDirty();
  }

  private getPolygonPoints(mmPoints: any): Array<any> {
    if (!(mmPoints instanceof Array)) {
      return [];
    }

    const points = [];
    let minY = 960;
    let maxY = 0;
    for (let mmPoint of mmPoints) {
      const point = this.getPolygonPoint(mmPoint);
      const y = point.y;
      points.push(point);
      if (y > maxY) {
        maxY = y;
      }
      if (y < minY) {
        minY = y;
      }
    }
    
    if (points.length < 2) {
      return [];
    }

    for (let p of points) {
      p.y = Display.toTop(p.y, 0);
    }

    return points;
  }

  private getPolygonPoint(mmPoint: any) {
    let x = 0;
    let y = 0;
    if (mmPoint instanceof Array) {
      x = toNumberValue(mmPoint[0]);
      y = toNumberValue(mmPoint[1]);
    } else if (mmPoint instanceof HashMap) {
      x = toNumberValue(this.vm.mapAccessOpt(mmPoint, "x"));
      x = toNumberValue(this.vm.mapAccessOpt(mmPoint, "y"));
    }
    return {"x": x, "y": y};
  }

  private print(str: string, x: number, y: number, color: string, fontName: string) {
    color = this.resolveColor(color);

    x = Math.round(x);
    y = Math.round(y);

    let fontSize;
    if (fontName === "normal") {
      fontSize = 20;
    } else if (fontName === "large") {
      fontSize = 32;
    } else if (fontName === "medium") {
      fontSize = 24;
    } else if (fontName === "small") {
      fontSize = 16;
    } else {
      fontSize = 16;
    }
    y = Display.toTop(y);
    const ctx = this.ctx;

    if (Display.isTransparentColor(color)) {
      ctx.save();
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = "white";
      ctx.textBaseline = "bottom";
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillText(str,x,y);
      ctx.restore();
    }

    ctx.save();
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = color;
    ctx.textBaseline = "bottom";
    ctx.fillText(str,x,y);
    ctx.restore();

    this.markDirty();
  }

  private drawImage(img: HashMap, x: number, y: number, width: number, height: number) {
    const nativeTexture = getNativeTexture(this.vm, img);
    const drawableObj = getBaseImage(nativeTexture);
    if (drawableObj) {
      // Calculate source of base image
      const sx = nativeTexture.frame.x;
      const sy = nativeTexture.frame.y;
      const sw = nativeTexture.frame.width;
      const sh = nativeTexture.frame.height;

      if (width >= 0 && height >= 0) {
        y = Display.toTop(y, height);
      } else {
        y = Display.toTop(y, nativeTexture.height);
        width = nativeTexture.width;
        height = nativeTexture.height;
      }

      this.ctx.drawImage(drawableObj, sx, sy, sw, sh, x, y, width, height);
      this.markDirty();
    } else {
      console.error("Could not render image from map:", img);
    }
  }

  private getImage(x: number, y: number, width: number, height: number): Promise<HashMap> {
    // Make sure past/pending drawing operations are transferred
    // from the internal canvas to PIXI's texture, so that the 
    // right state (image) is "extracted".
    // This is particularly important for detached displays, which are
    // not automatically / regularly updated.
    if (this.isDirty()) {
      this.update();
    }

    y = Display.toTop(y, height);
    const rect = new PIXI.Rectangle(x,y,width,height);
    const source = this.pixiContainer;
    const app = this.dspMgr.getPixiApplication();
    const extract = app.renderer.extract;
    const imgPromise: Promise<HTMLImageElement> = extract.image(source, null, null, rect);
    const mapPromise = imgPromise.then((img) => {
      const loadPromise = new Promise<HashMap>((resolve) => {
        img.addEventListener("load", () => {
          const map = toImageMap(this.vm, img);
          resolve(map);
        });
      });
      return loadPromise;
    });
    return mapPromise;
  }

  private setPixel(x: number, y: number, color: string) {
    color = this.resolveColor(color);
    y = Display.toTop(y);
    setPixel(this.ctx, x, y, color);
  }

  private getPixel(x: number, y: number): string {
    y = Display.toTop(y);
    const imageData = this.ctx.getImageData(x, y, 1, 1);
    const pixChannels = imageData.data;
    const color = new PIXI.Color(pixChannels);
    const colorStr = color.toHexa();
    return colorStr;
  }

}