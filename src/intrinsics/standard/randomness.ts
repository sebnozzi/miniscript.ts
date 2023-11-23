
function addRandomnessIntrinsics(p: Processor) {

  p.addIntrinsic("rnd(seed)", 
  function(seed: any): number {
    if (seed !== null) {
      seed = toIntegerValue(seed);
      p.initRandomGenerator(seed);
    }
    return p.random();
  });

  p.addIntrinsic("shuffle(self)", 
  function(self: any): any {  
    if (self instanceof Array) {
      for (let idx = self.length - 1; idx >= 1; idx--) {
        const rndIdx = getRandomInt(p, idx+1);
        // Swap values between current index and random index
        const tempValue = self[rndIdx];
        self[rndIdx] = self[idx];
        self[idx] = tempValue;
      }
    } else if (self instanceof HashMap) {
      const keys = Array.from(self.keys());
      for (let keyIdx = keys.length - 1; keyIdx >= 1; keyIdx--) {
        const rndIdx = getRandomInt(p, keyIdx+1);
        // Swap values between current key in loop and random key
        const key = keys[keyIdx];
        const rndKey = keys[rndIdx];
        const tempValue = self.get(rndKey);
        self.set(rndKey, self.get(key));
        self.set(key, tempValue);
      }
    }
    return null;
  });

}
