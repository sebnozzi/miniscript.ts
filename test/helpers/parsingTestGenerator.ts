import { describe, it, } from "vitest";
import { ParserError } from "../../src/parser/commonModel";
import { Parser } from "../../src/parser/parser";
import { fetchAndParseTestSuite } from "./testSuiteParser";

export function parseSuite(suiteFileName: string, description: string) {
  describe('Parser', async function() {
  
    const tests = await fetchAndParseTestSuite(suiteFileName);

    describe(description, function() {
      for (let test of tests) {
        const srcCode = test.code.join("\n");
        const header = test.headers[1];
        it(header + ' (line ' + test.lineNr +')', function() {
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

  });
 
}