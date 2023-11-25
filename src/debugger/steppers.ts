abstract class Stepper {

  initialCallStackDepth: number;
  initialEntry: SourceMapEntry | null;

  constructor(protected readonly id: number, protected readonly d: Debugger, protected readonly vm: Processor) {
    this.initialCallStackDepth = this.vm.savedFrames.count();
    this.initialEntry = this.d.getCurrentSrcMapEntry();
  }

  abstract step(): void;

  scheduleNext() {
    setTimeout(() => {
      this.step();
    }, 0)
  }

  resumeFromSuspension() {
    this.scheduleNext();
  }

  finish() {
    // Advance until we are at a concrete srcMap entry
    this.d.stepUntilSrcMapEntryFound();
    this.d.notifyChanges();
    this.d.removeStepper(this.id);
  }
}

class StepOverStepper extends Stepper {

  initialCallStackDepth: number;
  initialEntry: SourceMapEntry | null;

  constructor(id: number, d: Debugger, vm: Processor) {
    super(id, d, vm);
    this.initialCallStackDepth = vm.savedFrames.count();
    this.initialEntry = d.getCurrentSrcMapEntry();
  }

  step() {

    if (this.vm.isSuspended()) {
      // Just return, the debugger will be notified
      // when the Promise is resolved and continue 
      // the process here.
      return;
    }

    this.vm.executeCycles(1);
    
    // If we went "deeper" into the call stack, execute cycles until we are "back".
    // Only then compare source locations.
    const currentCallStackDepth = this.vm.savedFrames.count();
    if (currentCallStackDepth > this.initialCallStackDepth) {
      this.scheduleNext();
      return;
    }

    if (this.vm.isFinished()) {
      this.finish();
      return;
    }

    const currentEntry = this.d.getCurrentSrcMapEntry();
    let sourceLocationChanged = false;

    if (this.initialEntry === null && currentEntry !== null) {
      sourceLocationChanged = true;
    } else if(this.initialEntry !== null && currentEntry === null) {
      // Skipping until non-null current-entry is found
      this.scheduleNext();
      return;
    } else if(this.initialEntry !== null && currentEntry !== null) {
      const initialLoc = this.initialEntry.srcLoc.start.row;
      const currentLoc = currentEntry.srcLoc.start.row;
      sourceLocationChanged = (initialLoc !== currentLoc);
    }

    if (sourceLocationChanged) {
      this.finish();
      return;
    }

    // Otherwise ...
    this.scheduleNext();
  }

}

class StepIntoStepper extends Stepper {

  initialCount: number;

  constructor(id: number, d: Debugger, vm: Processor) {
    super(id, d, vm);
    this.initialCount = this.vm.savedFrames.count();
  }

  step() {
    if (this.vm.isSuspended()) {
      // Just return, the debugger will be notified
      // when the Promise is resolved and continue 
      // the process here.
      return;
    }

    const nextOpIsCall = this.vm.couldResultInCall();
    this.vm.executeCycles(1);

    const currentCount = this.vm.savedFrames.count();
    if (currentCount > this.initialCount) {
      // A function call has been made, since a new frame was pushed
      this.finish();
      return;
    } else if (nextOpIsCall && currentCount == this.initialCount) {
      // A call should have been made, but was not.
      // Probably because a primitive was called.
      // Abandon the whole attempt.
      if (!this.vm.isSuspended()) {
        // Only finish if the call did not result in an intrinsic
        // call, which suspended the VM.
        // In that case we need to continue after that.
        this.finish();
      } 
      return;
    }
    if (this.vm.isFinished()) {
      this.finish();
      return;
    }

    // Otherwise ...
    this.scheduleNext();
  }

}

class StepOutStepper extends Stepper {

  initialCount: number;

  constructor(id: number, d: Debugger, vm: Processor) {
    super(id, d, vm);
    this.initialCount = this.vm.savedFrames.count();
  }

  step() {
    if (this.vm.isSuspended()) {
      // Just return, the debugger will be notified
      // when the Promise is resolved and continue 
      // the process here.
      return;
    }

    this.vm.executeCycles(1);

    const currentCount = this.vm.savedFrames.count();

    if (currentCount < this.initialCount) {
      // A return from a call has been made, since a frame was removed
      this.finish();
      return;
    }
    
    if (this.vm.isFinished()) {
      this.finish();
      return;
    }

    // Otherwise ...
    this.scheduleNext();
  }

}