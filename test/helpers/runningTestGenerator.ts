import { describe, it, assert } from "vitest";
import { runCode } from "./codeRunner";
import { fetchAndParseTestSuite } from "./testSuiteParser";


export function runSuite(suiteFileName: string, description: string) {

  describe(description, async function () {
    const tests = await fetchAndParseTestSuite(suiteFileName);

    for (let test of tests) {
      const header = test.headers[1];
      const testName = header + ' (line ' + test.lineNr + ')';

      it(testName, async () => {

        const srcCode = test.code.join("\n");
        const expectedOutput = test.output;

        console.log(testName);

        await runCode(srcCode, testName).then((lines) => {
          try {
            if (lines.length !== expectedOutput.length) {
              console.error("Expected: ", expectedOutput);
              console.error("Actual: ", lines);
              assert.fail("Line lengths differ. Expected: " + expectedOutput.length + ". Found: " + lines.length);
            } else {
              for (let i = 0; i < lines.length; i++) {
                const actual_1 = lines[i];
                const expected = expectedOutput[i];
                console.error("Expected: ", actual_1);
                console.error("Actual: ", expected);
                assert.equal(actual_1, expected);
              }
            }
          } catch (e) {
            throw e;
          }
        });

      });

    }
  });

}
