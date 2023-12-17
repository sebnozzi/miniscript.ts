import { readFile } from "node:fs";

type SuiteTest = {
  lineNr: number,
  headers: string[],
  testName: string,
  code: string[],
  output: string[]
}

export function fetchAndParseTestSuite(testSuiteFileName: string): Promise<SuiteTest[]> {
  
  const promise = new Promise<SuiteTest[]>((resolve) => {
    readFile(testSuiteFileName, "utf-8", (err, contents) => {
      if (err) {
        throw err;
      } else {
        const tests = parseTestSuite(contents);
        resolve(tests);
      }
    })
  });

  return promise;
}

function parseTestSuite(testSuiteContents: string): SuiteTest[] {
  const lines = testSuiteContents.split("\n");

  const tests: SuiteTest[] = [];
  let lineNr = 1;
  let mode = "header";

  let test: SuiteTest = {
    lineNr: lineNr,
    headers: [],
    testName: "",
    code: [],
    output: []
  };

  for (let line of lines) {
    if (line.startsWith("====")) {
      if (mode === "output") {
        test.testName = parseTestName(test);
        tests.push(test);
        mode = "header";
        test = {
          lineNr: lineNr,
          headers: [],
          testName: "",
          code: [],
          output: []
        };
      }
      test.headers.push(line);
    } else if(line.startsWith("----")) {
      mode = "output";
    } else {
      if (mode === "header") {
        mode = "code"
      }
      // Append line
      if (mode === "code") {
        test.code.push(line);
      } else {
        test.output.push(line);
      }
    }
    lineNr++;
  }
  test.testName = parseTestName(test);
  tests.push(test);
  return tests;
}

function parseTestName(test: SuiteTest): string {
  // headers[0] is the one with only ========== ...
  const firstHeader = test.headers[1];
  // Remove "=" signs at the beginning
  const testName = firstHeader.replace(/^=+\s*/,"");
  return testName;
}