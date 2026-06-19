export interface WeatherData {
  tempC: number;
  apparentC: number;
  code: number;
  hi: number;
  lo: number;
  hourly: number[]; // next 12h temps (for the sparkline)
  daily: { day: string; hi: number; lo: number }[];
}

// Minimal WMO weather-code → short label map (the codes we actually surface).
export function weatherLabel(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly cloudy';
  if (code === 3) return 'overcast';
  if (code <= 48) return 'fog';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'showers';
  if (code <= 99) return 'storm';
  return '—';
}
