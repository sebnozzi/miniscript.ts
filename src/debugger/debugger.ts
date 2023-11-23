class Debugger {

  constructor(private vm: Processor) {}

  onSrcChange = (sme: SourceMapEntry) => {};
  onFihished = () => {};

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

      if (this.vm.isFinished()) {
        break;
      }

      const currentEntry = this.getCurrentSrcMapEntry();
      if (initialEntry === null && currentEntry !== null) {
        sourceLocationChanged = true;
      } else if(initialEntry !== null && currentEntry === null) {
        sourceLocationChanged = true;
      } else if(initialEntry !== null && currentEntry !== null) {
        sourceLocationChanged = (initialEntry.srcLoc.start.idx !== currentEntry.srcLoc.start.idx);
      }
      if (sourceLocationChanged) {
        break;
      }
    } while(true);

    this.notifyChanges();
  }

  // TODO: should not be "blocking"
  // Execute code until context changes into a new frame in top of current one.
  // Stop at first instruction of new frame.
  stepInto() {
    const initialCount = this.vm.savedFrames.count();
    let frameWasAdded = false;
    do {
      const nextOpIsCall = this.vm.willExecuteCall();
      this.vm.executeCycles(1);
      const currentCount = this.vm.savedFrames.count();
      if (currentCount > initialCount) {
        // A function call has been made, since a new frame was pushed
        frameWasAdded = true;
      } else if (nextOpIsCall && currentCount == initialCount) {
        // A call should have been made, but was not.
        // Probably because a primitive was called.
        // Abandon the whole attempt.
        break;
      }
      if (this.vm.isFinished() || frameWasAdded) {
        break;
      }
    } while(true);
    this.notifyChanges();
  }

  // TODO: should not be "blocking" - a call to this can take potentially a lot
  // of time. One should execute instructions in "bursts" and introduce a callback
  // for when the debugger state changes. (READY, EXECUTING, CONTEXT_CHANGED)
  // Execute code until current frame is popped (which means a return)
  stepOut() {
    const initialCount = this.vm.savedFrames.count();
    let frameWasRemoved = false;
    do {
      this.vm.executeCycles(1);
      const currentCount = this.vm.savedFrames.count();
      if (currentCount < initialCount) {
        // A return from a call has been made, since a frame was removed
        frameWasRemoved = true;
      }
      if (this.vm.isFinished() || frameWasRemoved) {
        break;
      }
    } while(true);
    this.notifyChanges();
  }

  notifyChanges() {
    this.highlightSource();
    this.notifyFinished();
  }

  highlightSource() {
    const sme = this.getCurrentSrcMapEntry()
    if (sme !== null) {
      this.onSrcChange(sme);
    }
  }

  notifyFinished() {
    if (this.vm.isFinished()) {
      this.onFihished();
    }
  }

  _srcMap() {
    return this.vm.code.srcMap;
  }

  _srcMapEntry(): SourceMapEntry | null {
    return this._srcMap().findEntry(this.vm.ip);
  }

}