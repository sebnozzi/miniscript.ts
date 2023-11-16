
function addGraphicIntrinsics(p: Processor) {

  // clear
  p.addGlobalIntrinsic("clear", function() {
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    const gfx = canvas.getContext("2d") as CanvasRenderingContext2D;
    gfx.clearRect(0,0,canvas.width,canvas.height);
  });

  // fillEllipse x,y,w,h,c
  p.addGlobalIntrinsic("fillEllipse(x,y,width,height,color)", function(x:number,y:number,width:number,height:number,color:string) {
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    const gfx = canvas.getContext("2d") as CanvasRenderingContext2D;
    gfx.fillStyle = color;
    gfx.beginPath();
    gfx.ellipse(x,y,width,height,0,0,Math.PI*2);
    gfx.fill();
  });

}
