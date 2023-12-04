
// Backed up by an HTMLCanvas, on each update it sets its contents 
// to a Pixi Sprite which displays the contents in its hierarchy.
// This is needed because Pixi's Graphics does not support everything
// we need, in particular rendering images.
class PixelDisplay extends Display {

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pixiCanvasTexture: any;

  constructor(dspMgr: MMLikeDisplayManager) {
    super(dspMgr);
    this.canvas = document.createElement("canvas") as HTMLCanvasElement;
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
    this.pixiCanvasTexture.update();
  }

  getModeNr(): DisplayMode {
    return DisplayMode.pixel;
  }

  addDisplayAPI(dsp: HashMap): void {
    const outerThis = this;
    const vm = this.dspMgr.vm;
    const gfxMap = dsp

    vm.addMapIntrinsic(gfxMap, "clear(color=null)", function(color:any) {
      outerThis.clear(color);
    });

    vm.addMapIntrinsic(gfxMap, "line(x0,y0,x1,y1,color,penSize)", 
    function(x0:number, y0:number, x1:number, y1:number, color:string, penSize: number) {
      outerThis.line(x0, y0, x1, y1, color, penSize);
    });
    
    vm.addMapIntrinsic(gfxMap, "drawImage(img,x,y)", 
    function(img: HashMap, x:number, y:number) {
      outerThis.drawImage(img, x, y);
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

    vm.addMapIntrinsic(gfxMap, 'print(str="",x=0,y=0,color=null,fontName="normal")', 
    function(str: string, x: number, y: number, color:string, fontName: string) {
      outerThis.print(str,x,y,color,fontName);
    });

    vm.addMapIntrinsic(gfxMap, 'getImage(left,bottom,width,height)', 
    function(x:number, y:number, width:number, height:number) {
      return outerThis.getImage(x,y,width,height);
    });

  }
  
  private clear(color: any) {
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
  }

  private line(x0: number, y0: number, x1: number, y1: number, color: string, penSize: number) {
    const ctx = this.ctx;
    y0 = this.toTop(y0);
    y1 = this.toTop(y1);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1-1, y1-1);
    ctx.lineWidth = penSize;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }

  private fillRect(x: number, y: number, width: number, height: number, color: string) {
    const ctx = this.ctx;
    y = this.toTop(y, height);
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(x,y,width-1,height-1);
    ctx.restore();
  }

  private drawRect(x: number, y: number, width: number, height: number, color: string, penSize: number) {
    const ctx = this.ctx;
    y = this.toTop(y, height);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    ctx.strokeRect(x, y, width-1, height-1);
    ctx.restore();
  }

  private fillEllipse(x: number, y: number, width: number, height: number, color: string) {
    y = this.toTop(y, height);
    x += width / 2;
    y += height / 2;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x,y,width/2-1,height/2-1,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  private drawEllipse(x: number, y: number, width: number, height: number, color: string, penSize: number) {
    y = this.toTop(y, height);
    x += width;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    ctx.beginPath();
    ctx.ellipse(x,y,width/2-1,height/2-1,0,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  private print(str: string, x: number, y: number, color: string, fontName: string) {
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
    y = this.toTop(y);
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = color;
    ctx.textBaseline = "bottom";
    ctx.fillText(str,x,y);
    ctx.restore();
  }

  private drawImage(img: HashMap, x: number, y: number) {
    const nativeImg = getNativeImage(img);
    if (nativeImg) {
      y = this.toTop(y, nativeImg.height);
      this.ctx.drawImage(nativeImg, x, y);
    } else {
      console.error("Could not render image from map:", img);
    }
  }

  private getImage(x: number, y: number, width: number, height: number): Promise<HashMap> {
    y = this.toTop(y, height);
    const rect = new PIXI.Rectangle(x,y,width,height);
    const source = this.pixiContainer;
    const app = this.dspMgr.getPixiApplication();
    const extract = app.renderer.extract;
    const imgPromise: Promise<HTMLImageElement> = extract.image(source, null, null, rect);
    const mapPromise = imgPromise.then((img) => {
      const loadPromise = new Promise<HashMap>((resolve) => {
        img.addEventListener("load", () => {
          const map = toImageMap(img);
          resolve(map);
        });
      });
      return loadPromise;
    });
    return mapPromise;
  }

}