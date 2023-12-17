import { describe, it, } from "vitest";
import { ParserError } from "../../src/parser/commonModel";
import { Parser } from "../../src/parser/parser";
import { fetchAndParseTestSuite } from "./testSuiteParser";

export function parseSuite(suiteFileName: string, description: string) {
  
  describe(description, async function() {

    const tests = await fetchAndParseTestSuite(suiteFileName);

    for (let test of tests) {
      const srcCode = test.code.join("\n");
      const testName = test.testName + ' (line ' + test.lineNr +')';
      it(testName, function() {
        const parser = new Parser(srcCode);
        try {
          parser.parse();
        } catch(e) {
          if (e instanceof ParserError && !e.message.startsWith("Compiler Error:")) {                 
            throw e;
          }
        }
      });
    }
  });

}