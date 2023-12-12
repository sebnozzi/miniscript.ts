
class MMLikeModuleLoader {

  constructor(private vm: Processor, private fileAPI: MMLikeFileAPI) {

  }

  addImportAPI() {
    const outerThis = this;

    // Import a module in the module-paths.
    // The code is executed in the context of a function.
    this.vm.addIntrinsic("import(moduleName)", 
    function(moduleName: string): Promise<null> {
      const fetchPromise = outerThis.fetchCode(moduleName);
      const runPromise = fetchPromise.then((srcCode: string) => {
        return outerThis.runSrcAsModule(moduleName, srcCode);
      });
      return runPromise;
     });
  }

  private runSrcAsModule(moduleName: string, srcCode: string): Promise<null> {
    const invocationCode = this.compileModuleInvocation(moduleName, srcCode);
    const subVM = this.vm.createSubProcessVM();
    subVM.setCode(invocationCode);
    subVM.setSourceName(`module ${moduleName}`);
    const promise = new Promise<null>((resolve) => {
      subVM.onFinished = () => {
        resolve(null);
      };
      subVM.runUntilDone();
    });
    return promise; 
  }
  
  private fetchCode(moduleName: string): Promise<string> {
    const moduleFileName = `${moduleName}.ms`;
    // Try fetching first at the "local" project path (same as
    // "current directory").
    const workingDirUrl =  this.fileAPI.resolveRelativePathUrl(moduleFileName);
    const responsePromise = fetch(workingDirUrl).then((response) => {
      if (response.status == 200) {
        return new Promise<Response>((resolve) => {resolve(response)});
      } else {
        // Try then fetching from "/sys/lib"
        const sysDirUrl =  this.fileAPI.resolveAbsolutePathUrl(`/sys/lib/${moduleFileName}`);
        return fetch(sysDirUrl);
      }
    });
    // Convert to text if the response is valid
    const textPromise = responsePromise.then<string>((response) => {
      if (response.status == 200) {
        return response.text();
      } else {
        const msg = `Fetching ${moduleFileName} from /sys/lib failed.`;
        console.error(msg, response);
        throw new RuntimeError(msg);
      }
    });
    
    return textPromise;
  }

  private compileModuleInvocation(moduleName: string, srcCode: string): Code {
    const p = new Parser(srcCode);
    const parsedStatements = p.parse();
    const compiler = new Compiler(parsedStatements);
    const code = compiler.compileModuleInvocation(moduleName);
    return code;
  }

}