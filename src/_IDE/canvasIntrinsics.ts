
function addCanvasIntrinsics(p: Processor) {

  const gfx = new GfxPrimitives("gfx");

  p.addIntrinsic("clear(color=null)", gfx.clear);
  p.addIntrinsic("fillEllipse(x,y,width,height,color)", gfx.fillEllipse);
  p.addIntrinsic("fillRect(x,y,width,height,color)", gfx.fillRect);
  p.addIntrinsic("drawRect(x,y,width,height,color,penSize=1)", gfx.drawRect);
  p.addIntrinsic("drawLine(x0,y0,x1,y1,color,penSize=1)", gfx.drawLine);
  p.addIntrinsic("loadImage(url)", gfx.loadImage);
  p.addIntrinsic("drawImage(img,x,y)", gfx.drawImage);
  p.addIntrinsic('drawText(txt,x,y,color="black",size=16)', gfx.drawText);

}

class GfxPrimitives {

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvasId: string) {
    if (!canvasId) {
      throw new Error("Empty canvasId")
    }
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error("Canvas not found for id: " + canvasId)
    }
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!this.canvas) {
      throw new Error("Context not found for id: " + canvasId)
    }
    // This is in order for the first line / row to be "visible".
    // Otherwise things like drawRect 0,0,... don't show the left/bottom lines.
    // Consequentially, all width / height parameters need to be shortened by 1.
    this.ctx.translate(1,1);
  }

  toTop(bottom: number, height: number = 0): number {
    const canvas = this.canvas
    const canvasHeight = canvas.height;
    const y = canvasHeight - bottom - height;
    return y;
  }

  clear(color: any) {
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

  drawImage(img: HTMLImageElement,x:number,y:number) {
    const canvas = this.canvas;
    const ctx = this.ctx;
    ctx.drawImage(img, x, y);
  }

  fillEllipse(x:number,y:number,width:number,height:number,color:string) {
    const canvas = this.canvas;
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x,y,width/2-1,height/2-1,0,0,Math.PI*2);
    ctx.fill();
  }

  fillRect(x:number,y:number,width:number,height:number,color:string) {
    const canvas = this.canvas;
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(x,y,width-1,height-1);
  }

  drawRect(x:number,y:number,width:number,height:number,color:string,penSize:number) {
    const canvas = this.canvas;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    ctx.strokeRect(x, y, width-1, height-1);
    ctx.restore();
  }

  drawLine(x0:any,y0:any,x1:any,y1:any,color:any,penSize:any) {
    const canvas = this.canvas;
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1-1, y1-1);
    ctx.lineWidth = penSize;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }

  loadImage(url: string): Promise<HTMLImageElement | null> {
    const img = document.createElement("img");
    const promise = new Promise<HTMLImageElement | null>((resolve) => {
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        console.error(`Could not load image ${url}`);
        resolve(null);
      }
    });
    img.src = url;  
    return promise;
  }

  drawText(txt:string,x:number,y:number,color:string,size:number) {
    const canvas = this.canvas;
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `${size}px monospace`;
    ctx.fillStyle = color;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(txt,x,y);
    ctx.restore();
  }
  
} 