export interface NewsItem {
  title: string;
  link: string;
  source: string;
  ts: number; // epoch ms, 0 if unknown
}
