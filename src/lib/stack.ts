export class Stack<T> {

  elements: T[];

  constructor() {
    this.elements = [];
  }

  clear() {
    this.elements = [];
  }

  push(element: T) {
    if (element === undefined) {
      // This happens when a function returns no value.
      // Store null. It should be popped in the next cycle.
      this.elements.push(null as T);
    } else {
      this.elements.push(element)
    }
  }

  pop(): T {
    let result = this.elements.pop()
    if (result === undefined) {
      throw new Error("Stack is empty")
    } else {
      return result
    }
  }

  // Pop N values. Return them in original order (as they were pushed).
  popN(count: number): any[] {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.unshift(this.pop());
    }
    return result;
  }

  // Return top-most value without removing it
  peek(): T {
    if (this.elements.length == 0) {
      throw new Error("Stack is empty")
    } else {
      // Return last element
      return this.elements[this.elements.length - 1];
    }
  }

  count(): number {
    return this.elements.length;
  }

}