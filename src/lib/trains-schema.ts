export type TrainStatus = 'ontime' | 'delayed' | 'cancelled';

export interface TrainService {
  std: string; // scheduled departure "HH:MM"
  etd: string; // estimated: "On time" | "HH:MM" | "Cancelled" | "Delayed"
  status: TrainStatus;
  platform: string | null;
  operator: string;
  destination: string;
}

export interface TrainBoard {
  from: string; // station name
  to: string;
  services: TrainService[];
}

export interface TrainsData {
  fromCode: string; // CRS code for the origin (e.g. the configured home station)
  toCode: string; // CRS code for the destination
  outbound: TrainBoard; // origin -> destination
  inbound: TrainBoard; // destination -> origin
  alerts: string[]; // nrccMessages, HTML-stripped
  configured: boolean; // false when the API key is missing
}
