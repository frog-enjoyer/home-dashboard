export interface TflLine {
  name: string;
  severity: number; // 10 = Good Service; lower = worse
  status: string; // e.g. "Good Service", "Minor Delays"
  reason: string; // disruption detail, if any
}

export interface TflData {
  lines: TflLine[];
}
