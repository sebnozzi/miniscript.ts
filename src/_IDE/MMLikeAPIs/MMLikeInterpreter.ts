import * as PIXI from "pixi.js";
import { Interpreter } from "../../interpreter/interpreter";
import { TxtCallback } from "../../vm/processor";
import { createBoundsType } from "./bounds";
import { addConsoleLogging } from "./debugging";
import { MMLikeDisplayManager } from "./mmLikeDisplayManager";
import { EventHandler } from "./mmLikeEventHandling";
import { MMLikeFileAPI } from "./mmLikeFileAPI";
import { MMLikeModuleLoader } from "./mmLikeModuleLoader";
import { SoundManager } from "./MMLikeSound";
import { MMLikeUserInteractionAPI } from "./mmLikeUserInteractionAPI";
import { addMMLikeSchedulingIntrinsics } from "./scheduling";

export class MMLikeInterpreter extends Interpreter {

  private eventHandler: EventHandler;
  private soundMgr: SoundManager;
  private fileAPI: MMLikeFileAPI;
  private userInteractionAPI: MMLikeUserInteractionAPI;
  private dspMgr: MMLikeDisplayManager;
  private initializing: boolean = false;
  private pixiApp: any;

  constructor(stdoutCallback: TxtCallback, stderrCallback: TxtCallback) {
      super(stdoutCallback,stderrCallback);
      this.initializing = true;

      this.dspMgr = new MMLikeDisplayManager(this.vm);
      this.dspMgr.addDisplayApi();
      this.dspMgr.initDisplays();
      this.pixiApp = this.dspMgr.getPixiApplication();

      this.userInteractionAPI = new MMLikeUserInteractionAPI(this.vm);
      this.userInteractionAPI.addUserInteractionAPI();

      this.eventHandler = new EventHandler(this.vm);
      this.eventHandler.addKeyAPI();
      this.eventHandler.addMouseAPI();

      this.soundMgr = new SoundManager(this.vm);
      this.soundMgr.addSoundAPI();

      this.fileAPI = new MMLikeFileAPI(this.vm, this.soundMgr);
      this.fileAPI.addFileAPI();

      const moduleLoader = new MMLikeModuleLoader(this.vm, this.fileAPI);
      moduleLoader.addImportAPI();

      addMMLikeSchedulingIntrinsics(this.vm);

      // Run scripts to create definitions / APIs
      this.defineHex2();
      this.addColorAPI();
      this.defineClear();
      this.defineDisplays();
      this.definePrint();
      this.defineBounds();

      // Avoid VM taking control of execution
      this.vm.onPromiseResolved = () => {
        // Do nothing, let our ticker call the VM
      };

      this.vm.stdoutCallback = (line: string) => {
        console.log(line);
      }

      addConsoleLogging(this.vm);

      this.initializing = false;
  }

  protected startRunning() {
    if (this.initializing) {
      this.vm.run();
    } else {
      this.vm.setSourceName("main code");
      // Let Pixi drive the execution of the program
      // by running some cycles each time.
      this.pixiApp.ticker.add((_: number) => {
        if(this.vm.isRunning()) {
          this.vm.runCyclesOnce();
        }
        this.update();
      });
    }
  }

  protected processOnFinished(): void {
    if (this.initializing) {
      // Only clean up after initializing
      return;
    }

    if (this.soundMgr) {
      this.soundMgr.stopAll();
    }
    if (this.eventHandler) {
      this.eventHandler.removeEventListeners();
    }

    super.processOnFinished();
  }

  setScriptUrl(scriptUrl: string) {
    const regex = /(?<path>(?:[^\/]+\/)+)(?<fileName>.+\.ms$)/gm;
    const matches = regex.exec(scriptUrl,);
    if (matches && matches.groups) {
      const path = matches.groups["path"];
      this.fileAPI.setRemotePath(path);
    }
  }

  private update() {
    if (this.initializing) {
      return;
    }
    this.dspMgr.update();
    this.eventHandler.reset();
  }

  private defineClear() {
    this.vm.setSourceName("clear definition");
    const code = `
    clear = function
	    text.clear
      text.column = 0
      text.row = 25
      gfx.clear
    end function`;
    this.runSrcCode(code);
  }

  private definePrint() {
    this.vm.setSourceName("print definition");
    const code = `
    print = function(value,delimiter=null)
	    text.print @value,delimiter
    end function`;
    this.runSrcCode(code);
  }

  private defineBounds() {
    createBoundsType(this.vm);
  }

  private defineDisplays() {
    this.vm.setSourceName("displays definition");
    const code = `
    text = display(3)
    gfx = display(5)
    `;
    this.runSrcCode(code);
  }

  private defineHex2() {
    this.vm.setSourceName("hex2 definition");
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

    this.vm.addIntrinsic("_colorToRGBA(colorString)",
    function(colorStr: string): number[] {
      const clr = new PIXI.Color(colorStr);
      const result = [ 
        Math.round(clr.red * 255),
        Math.round(clr.green * 255),
        Math.round(clr.blue * 255),
        Math.round(clr.alpha * 255) ];
      return result;
    });

    this.vm.setSourceName("color API definition");
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
    end function
    //color.hsv = function(h, s, v, a=255)
    //  return _HSVAtoColor([h, s, v, a])
    //end function
    //color.lerp = function(colorA, colorB, t=0.5)
    //  return _lerpColor(colorA, colorB, t)
    //end function
    color.toList = function(colorString)
      return _colorToRGBA(colorString)
    end function
    //color.fromList = function(rgbaList)
    //  return _RGBAtoColor(rgbaList)
    //end function
    //color.toListHSV = function(colorString)
    //  return _colorToHSVA(colorString)
    //end function
    //color.fromListHSV = function(hsvaList)
    //  return _HSVAtoColor(hsvaList)
    //end function`;
    
    this.runSrcCode(code);
  }

}
