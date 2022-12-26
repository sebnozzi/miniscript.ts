class Stack<T> {

  elements: T[];

  constructor() {
    this.elements = []
  }

  push(element: T) {
    this.elements.push(element)
  }

  pop(): T {
    let result = this.elements.pop()
    if (result === undefined) {
      throw new Error("Stack is empty")
    } else {
      return result
    }
  }

  count(): number {
    return this.elements.length;
  }

}