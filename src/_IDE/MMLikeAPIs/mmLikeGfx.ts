
class MMLikeGfx {

  constructor(private vm: Processor) {

  }

  addGfxAPI() {
    const gfPrim = new GfxPrimitives("gfx");
    const vm = this.vm;
    const gfxMap = new HashMap();

    vm.addIntrinsic("gfx", 
    function() {
      return gfxMap;
    });

    vm.addMapIntrinsic(gfxMap, "clear(color=null)", function(color:any) {
      gfPrim.clear(color);
    });
    
    vm.addMapIntrinsic(gfxMap, "drawImage(img,left,bottom)", 
    function(img:HTMLImageElement, x:number, bottom:number) {
      let y = gfPrim.toTop(bottom, img.height);
      gfPrim.drawImage(img, x, y);
    });

    vm.addMapIntrinsic(gfxMap, "fillRect(left,bottom,width,height,color)", 
    function(x:number, bottom:number, width:number, height:number, color:string) {
      let y = gfPrim.toTop(bottom, height);
      gfPrim.fillRect(x, y, width, height, color);
    });

    vm.addMapIntrinsic(gfxMap, "drawRect(left,bottom,width,height,color,penSize)", 
    function(x:number, bottom:number, width:number, height:number, color:string, penSize: number) {
      let y = gfPrim.toTop(bottom, height);
      gfPrim.drawRect(x, y, width, height, color, penSize);
    });

    vm.addMapIntrinsic(gfxMap, "fillEllipse(left,bottom,width,height,color)", 
    function(x:number, bottom:number, width:number, height:number, color:string) {
      let y = gfPrim.toTop(bottom, height);
      x += width;
      gfPrim.fillEllipse(x, y, width, height, color);
    });

    vm.addMapIntrinsic(gfxMap, 'print(str="",x=0,y=0,color=null,fontName="normal")', 
    function(str: string, x: number, bottom: number, color:string, fontName: string) {
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
      let y = gfPrim.toTop(bottom, 0);
      gfPrim.drawText(str, x, y, color, fontSize);
    });

  }

}