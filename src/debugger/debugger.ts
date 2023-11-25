
class Debugger {

  private nextStepperId: number = 1;
  private steppers: Map<number, Stepper>;

  constructor(private vm: Processor) {
    this.steppers = new Map();
    vm.onPromiseResolved = () => {
      // Do not resume execution
      // Let the steppers continue
      const steppers = this.steppers.values();
      for (let s of steppers) {
        s.resumeFromSuspension();
      }
    }
  }

  onSrcChange = () => {};
  onFinished = () => {};

  // Move to first instruction
  start() {
    // Nothing to do? Vm should be initialized?
    this.notifyChanges();
  }

  stop() {
    this.vm.stopRunning();
  }

  getCurrentSrcMapEntry(): SourceMapEntry | null {
    return this._srcMap().findEntry(this.vm.ip);
  }

  // True if the current location can be stepped into 
  // (because it contains at least one call)
  canStepIn(): boolean {
    const entry = this.getCurrentSrcMapEntry();
    if (entry !== null) {
      return entry.isCall;
    } else {
      return false;
    }
  }

  canStepOut(): boolean {
    return this.vm.savedFrames.count() > 0;
  }

  newStepOverStepper(): StepOverStepper {
    const stepper = new StepOverStepper(this.nextStepperId, this, this.vm);
    this.steppers.set(this.nextStepperId, stepper);
    this.nextStepperId++;
    return stepper;
  }

  newStepIntoStepper(): StepIntoStepper {
    const stepper = new StepIntoStepper(this.nextStepperId, this, this.vm);
    this.steppers.set(this.nextStepperId, stepper);
    this.nextStepperId++;
    return stepper;
  }

  newStepOutStepper(): StepIntoStepper {
    const stepper = new StepOutStepper(this.nextStepperId, this, this.vm);
    this.steppers.set(this.nextStepperId, stepper);
    this.nextStepperId++;
    return stepper;
  }

  removeStepper(id: number) {
    this.steppers.delete(id);
  }

  stepOver() {
    const stepper = this.newStepOverStepper();
    stepper.scheduleNext();
  }

  stepInto() {
    const stepper = this.newStepIntoStepper();
    stepper.scheduleNext();
  }

  stepOut() {
    const stepper = this.newStepOutStepper();
    stepper.scheduleNext();
  }

  stepUntilSrcMapEntryFound() {
    let currentEntry = this.getCurrentSrcMapEntry();
    while (currentEntry === null && this.vm.isRunning()) {
      this.vm.executeCycles(1);
      currentEntry = this.getCurrentSrcMapEntry();
    }
  }

  notifyChanges() {
    this.highlightSource();
    this.notifyFinished();
  }

  highlightSource() {
    const sme = this.getCurrentSrcMapEntry()
    if (sme !== null) {
      this.onSrcChange();
    }
  }

  notifyFinished() {
    if (this.vm.isFinished()) {
      this.onFinished();
    }
  }

  _srcMap() {
    return this.vm.code.srcMap;
  }

  _srcMapEntry(): SourceMapEntry | null {
    return this._srcMap().findEntry(this.vm.ip);
  }

}