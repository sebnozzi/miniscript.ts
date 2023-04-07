
describe('VM', function () {
  describe('running code', function () {
    it('should run recursive fibonacci', function (done) {

      const fibNr = 15;
      const sampleCode = [
        "fib = function(n)",
        "  if n <= 1 then",
        "    return n",
        "  else",
        "    return fib(n-1) + fib(n-2)",
        "  end if",
        "end function",
        "print \"Result: \" + fib("+fibNr+")"
      ].join("\n");

      runCode(sampleCode, "run fibonacci", (lines) => {
        chai.assert.deepEqual(lines, ["Result: 610"]);
        done();
      });

    });
  });
});
