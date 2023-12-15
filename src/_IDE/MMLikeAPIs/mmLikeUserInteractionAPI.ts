
class MMLikeUserInteractionAPI {

  constructor(private vm: Processor) {

  }

  addUserInteractionAPI() {
    const vm = this.vm;

    vm.addIntrinsic('input(prompt="")', 
    function(message: string | undefined): Promise<string | null> {
      if (message === null || message === "") {
        message = undefined;
      }
      return new Promise((resolved)=>{
        const result = prompt(message);
        resolved(result);
      });
    });
  }


}