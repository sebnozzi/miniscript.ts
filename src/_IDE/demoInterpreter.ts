/// <reference path="../interpreter/interpreter.ts"/>

class DemoInterpreter extends Interpreter {

  private remotePath: string = "";

  constructor(stdoutCallback: TxtCallback, stderrCallback: TxtCallback) {
      super(stdoutCallback,stderrCallback);

      addCanvasIntrinsics(this.vm);

      // Add MiniMicro-like APIs ;-)
      this.addGfxAPI();
      this.defineHex2();
      this.addColorAPI();
      this.addFileAPI();
      this.addKeyHandling();
  }

  setScriptUrl(scriptUrl: string) {
    const regex = /(?<path>(?:.*\/)?)(?<fileName>\w+\.ms$)/gm;
    const matches = regex.exec(scriptUrl,);
    if (matches && matches.groups) {
      const path = matches.groups["path"];
      this.remotePath = path;
      console.log("Setting remote path to:", this.remotePath);
    }
  }

  private addKeyHandling(): void {
    console.log("Regisering key events");
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    canvas.addEventListener("keydown", function(e: KeyboardEvent) {
      console.log("keydown:", e);
    });
    canvas.addEventListener("keyup", function(e: KeyboardEvent) {
      console.log("keyup:", e);
    });
  }

  private addFileAPI() {
    const vm = this.vm;
    const fileMap = new HashMap();
    const outerThis = this;

    vm.addIntrinsic("file", function() {
      return fileMap;
    })

    vm.addMapIntrinsic(fileMap, 'loadImage(path="")',
    function(path: string): Promise<HTMLImageElement | null> {
      const fullPath = `${outerThis.remotePath}${path}`;
      if (path === null || path === "") {
        return new Promise((resolve) => {
          resolve(null);
        });
      }
      const gfPrim = new GfxPrimitives();
      return gfPrim.loadImage(fullPath);
    });

    return fileMap;
  }

  private defineHex2() {
    const code = `
    hex2 = function(val)
	    result = 0
	    digits = "0123456789ABCDEF"
	    val = floor(val)
	    if val < 0 then return "00"
	    if val >= 255 then return "FF"
	    return digits[val / 16] + digits[val % 16]
    end function`;
    this.runSrcCode(code);
  }

  private addColorAPI() {
    const code = `
    color = {}
    color.clear   = "#00000000"
    color.black 	= "#000000"
    color.white		= "#FFFFFF"
    color.gray		= "#808080"
    color.silver	= "#C0C0C0"
    color.maroon	= "#800000"
    color.red		  = "#FF0000"
    color.olive		= "#808000"
    color.yellow	= "#FFFF00"
    color.orange	= "#FF8000"
    color.green		= "#008000"
    color.lime		= "#00FF00"
    color.teal		= "#008080"
    color.aqua		= "#00FFFF"
    color.navy		= "#000080"
    color.blue		= "#0000FF"
    color.purple	= "#800080"
    color.fuchsia	= "#FF00FF"
    color.brown		= "#996633"
    color.pink		= "#FF8080"
    color.rgb = function(r, g, b)
      return "#" + hex2(r) + hex2(g) + hex2(b)
    end function
    color.rgba = function(r, g, b, a)
      return "#" + hex2(r) + hex2(g) + hex2(b) + hex2(a)
    end function`;
    this.runSrcCode(code);
  }

  private addGfxAPI() {
    const gfPrim = new GfxPrimitives();
    const vm = this.vm;
    const gfxMap = new HashMap();

    vm.addIntrinsic("gfx", 
    function() {
      console.log("Returning gfx");
      return gfxMap;
    });

    vm.addMapIntrinsic(gfxMap, "clear(color=null)", gfPrim.clear);
    
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

    vm.addMapIntrinsic(gfxMap, "fillEllipse(left,bottom,width,height,color)", 
    function(x:number, bottom:number, width:number, height:number, color:string) {
      let y = gfPrim.toTop(bottom, height);
      //y -= height * 2;
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
      let y = gfPrim.toTop(bottom, fontSize);
      gfPrim.drawText(str, x, y, color, fontSize);
    });

  }

}
