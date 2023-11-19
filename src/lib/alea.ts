function newAleaRndNrGenerator(seed: number|string|undefined = undefined) {
  if(seed === undefined) {
    seed = +new Date() + Math.random();
  }
  function Mash() {
      let n = 4022871197;
      return function(r: string) {
          for(let t, s, u = 0, e = 0.02519603282416938; u < r.length; u++) {
            s = r.charCodeAt(u);
            let f = (e * (n += s) - (n*e|0));
            n = 4294967296 * ((t = f * (e*n|0)) - (t|0)) + (t|0);
          }
          return (n|0) * 2.3283064365386963e-10;
      }
  }
  return function() {
      let m = Mash();
      let a = m(" ");
      let b = m(" ");
      let c = m(" ");
      let x = 1;
      let y;
      const seedStr = seed.toString();
      a -= m(seedStr);
      b -= m(seedStr);
      c -= m(seedStr);
      a < 0 && a++;
      b < 0 && b++;
      c < 0 && c++;
      return function() {
          var y = x * 2.3283064365386963e-10 + a * 2091639; a = b, b = c;
          return c = y - (x = y|0);
      };
  }();
}