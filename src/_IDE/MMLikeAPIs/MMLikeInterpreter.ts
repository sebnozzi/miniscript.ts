/// <reference path="../../interpreter/interpreter.ts"/>

class MMLikeInterpreter extends Interpreter {

  private eventHandler: EventHandler;
  private soundMgr: SoundManager;
  private fileAPI: MMLikeFileAPI;
  private userInteractionAPI: MMLikeUserInteractionAPI;
  private dspMgr: MMLikeDisplayManager;
  private initializing: boolean = false;

  constructor(stdoutCallback: TxtCallback, stderrCallback: TxtCallback) {
      super(stdoutCallback,stderrCallback);
      this.initializing = true;

      this.dspMgr = new MMLikeDisplayManager(this.vm);
      this.dspMgr.addDisplayApi();
      this.dspMgr.initDisplays();

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

      // Run scripts to create definitions / APIs
      this.defineHex2();
      this.addColorAPI();
      this.defineClear();
      this.defineDisplays();
      this.definePrint();
      this.defineBounds();

      // Hook the callback to be run before cycles execution
      this.vm.onBeforeCycles = () => { this.callbackBeforeCycles() };

      this.vm.stdoutCallback = (line: string) => {
        console.log(line);
      }

      this.initializing = false;
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

  private callbackBeforeCycles() {
    if (this.initializing) {
      return;
    }
    this.dspMgr.update();
    this.eventHandler.reset();
  }

  private defineClear() {
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
    const code = `
    print = function(txt,delimiter=null)
	    text.print txt,delimiter
    end function`;
    this.runSrcCode(code);
  }

  private defineBounds() {
    createBoundsType(this.vm);
  }

  private defineDisplays() {
    const code = `
    text = display(3)
    gfx = display(5)
    `;
    this.runSrcCode(code);
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

}
