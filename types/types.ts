export type ServerError = {
  log: string;
  status: number;
  message: { err: string };
};

export type MovieMetadata = {
  id: string;
  year: number;
  title: string;
  origin: string;
  director: string;
  cast: string;
  genre: string;
  wiki: string;
  plot: string;
};

export interface StructuredQuery {
  summaryToEmbed: string | null;
  titleToFind: string | null;
  filters: {
    years: {
      startYear: number;
      endYear: number;
    } | null;
    genre: string | null;
    director: string | null;
  } | null;
}

export type LogType = {
  log: string;
  level: 'DEBUG' | 'INFO' | 'ERROR';
  reqId: string;
  timestamp?: Date;
};
