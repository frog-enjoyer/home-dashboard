export interface RainStep {
  t: string; // "HH:MM"
  mm: number; // precipitation in mm for the 15-min step
  prob: number; // precipitation probability %
}

export interface RainData {
  currentlyRaining: boolean;
  nextRainAt: string | null; // "HH:MM" of first precip in window, null if dry
  nextRainMinsFromIso: string | null; // ISO of that step (client computes "in Xm")
  maxProb: number;
  series: RainStep[]; // next ~2h at 15-min resolution (for the bar)
}
