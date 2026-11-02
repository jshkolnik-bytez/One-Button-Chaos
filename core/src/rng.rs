//! rng.rs: seeded random numbers. The same seed always gives the same
//! numbers, which is what makes Daily Chaos fair. The game never reads the
//! clock: every "random" thing comes from here.

/// Scrambles a seed so that 20261020 and 20261021 give completely different runs.
pub fn mix(mut x: u32) -> u32 {
    x ^= x >> 16;
    x = x.wrapping_mul(0x7feb352d);
    x ^= x >> 15;
    x = x.wrapping_mul(0x846ca68b);
    x ^= x >> 16;
    x
}

/// xorshift32: a tiny, fast random number generator.
#[derive(Clone)]
pub struct Rng {
    state: u32,
}

impl Rng {
    pub fn new(seed: u32) -> Rng {
        let state = mix(seed);
        // xorshift breaks if its state is ever 0, so swap 0 for a fixed number
        Rng { state: if state == 0 { 0x9e3779b9 } else { state } }
    }

    /// The next "random" 32-bit number: three shifts and XORs
    pub fn next_u32(&mut self) -> u32 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.state = x;
        x
    }

    /// A whole number from 0 up to n - 1
    pub fn int(&mut self, n: u32) -> u32 {
        self.next_u32() % n
    }

    /// A decimal number from lo up to (not including) hi
    pub fn range(&mut self, lo: f32, hi: f32) -> f32 {
        let f = (self.next_u32() >> 8) as f32 / 16_777_216.0; // 0 <= f < 1
        lo + f * (hi - lo)
    }
}
