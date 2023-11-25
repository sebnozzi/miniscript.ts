
function addCanvasIntrinsics(p: Processor) {

  const gfx = new GfxPrimitives();

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

  clear(color: any) {
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    if (color !== null) {
      ctx.fillStyle = color;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
  }

  drawImage(img: HTMLImageElement,x:number,y:number) {
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.drawImage(img, x, y);
  }

  fillEllipse(x:number,y:number,width:number,height:number,color:string) {
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x,y,width,height,0,0,Math.PI*2);
    ctx.fill();
  }

  fillRect(x:number,y:number,width:number,height:number,color:string) {
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = color;
    ctx.fillRect(x,y,width,height);
  }

  drawRect(x:number,y:number,width:number,height:number,color:string,penSize:number) {
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  drawLine(x0:any,y0:any,x1:any,y1:any,color:any,penSize:any) {
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineWidth = penSize;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }

  loadImage(url: string): Promise<HTMLImageElement> {
    const img = document.createElement("img");
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        reject(`Could not load ${url}`);
      }
    });
    img.src = url;  
    return promise;
  }

  drawText(txt:string,x:number,y:number,color:string,size:number) {
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.save();
    ctx.font = `${size}px monospace`;
    ctx.fillStyle = color;
    ctx.fillText(txt,x,y);
    ctx.restore();
  }
  
} 