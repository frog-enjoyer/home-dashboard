export interface FootballMatch {
  event: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (local of event, as given)
  league: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
}

export interface FootballTeam {
  name: string;
  next: FootballMatch[];
  last: FootballMatch[];
}

export interface FootballData {
  primary: FootballTeam;
  secondary: FootballTeam;
}
