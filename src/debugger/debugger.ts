
class Debugger {

  constructor(private vm: Processor) {}

  onSrcChange = () => {};
  onFinished = () => {};

  // Move to first instruction
  start() {
    // Nothing to do? Vm should be initialized?
    this.notifyChanges();
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

  // TODO: should not be "blocking"
  // Execute code in current source location until next location
  stepOver() {
    const initialCallStackDepth = this.vm.savedFrames.count();
    const initialEntry = this.getCurrentSrcMapEntry();
    let sourceLocationChanged = false;
    do {
      this.vm.executeCycles(1);
      
      // If we went "deeper" into the call stack, execute cycles until we are "back".
      // Only then compare source locations.
      const currentCallStackDepth = this.vm.savedFrames.count();
      if (currentCallStackDepth > initialCallStackDepth) {
        continue;
      }

      if (this.vm.isFinished() || this.vm.isSuspended()) {
        break;
      }

      const currentEntry = this.getCurrentSrcMapEntry();

      if (initialEntry === null && currentEntry !== null) {
        sourceLocationChanged = true;
      } else if(initialEntry !== null && currentEntry === null) {
        // Skipping until non-null current-entry is found
        continue;
      } else if(initialEntry !== null && currentEntry !== null) {
        const initialLoc = initialEntry.srcLoc.start.row;
        const currentLoc = currentEntry.srcLoc.start.row;
        sourceLocationChanged = (initialLoc !== currentLoc);
      }

      if (sourceLocationChanged) {
        break;
      }
    } while(true);

    // Advance until we are at a concrete srcMap entry
    this.stepUntilSrcMapEntryFound();

    this.notifyChanges();
  }

  // TODO: should not be "blocking"
  // Execute code until context changes into a new frame in top of current one.
  // Stop at first instruction of new frame.
  stepInto() {
    const initialCount = this.vm.savedFrames.count();
    do {
      const nextOpIsCall = this.vm.couldResultInCall();
      this.vm.executeCycles(1);
      const currentCount = this.vm.savedFrames.count();
      if (currentCount > initialCount) {
        // A function call has been made, since a new frame was pushed
        break;
      } else if (nextOpIsCall && currentCount == initialCount) {
        // A call should have been made, but was not.
        // Probably because a primitive was called.
        // Abandon the whole attempt.
        break;
      }
      if (this.vm.isFinished()) {
        break;
      }
    } while(true);

    this.stepUntilSrcMapEntryFound();

    this.notifyChanges();
  }

  // TODO: should not be "blocking" - a call to this can take potentially a lot
  // of time. One should execute instructions in "bursts" and introduce a callback
  // for when the debugger state changes. (READY, EXECUTING, CONTEXT_CHANGED)
  // Execute code until current frame is popped (which means a return)
  stepOut() {
    const initialCount = this.vm.savedFrames.count();
    let stepOutSuccessful = false;
    do {
      this.vm.executeCycles(1);
      const currentCount = this.vm.savedFrames.count();
      if (currentCount < initialCount) {
        // A return from a call has been made, since a frame was removed
        stepOutSuccessful = true;
      }
      if (this.vm.isFinished() || stepOutSuccessful) {
        break;
      }
    } while(true);

    // We might have stepped-out, but are in the middle of "nowhere"
    // Advance until we are at a concrete srcMap entry
    this.stepUntilSrcMapEntryFound();

    this.notifyChanges();
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