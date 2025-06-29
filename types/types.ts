export type ServerError = {
  log: string;
  status: number;
  message: { err: string };
};

export type LegalMetadata = {
  caseTitle: string;
  summary: string;
  jurisdiction?: string;
  courtLevel?: string;
  legalTopic?: string;
};

export type StructuredQuery = {
  summaryToEmbed?: string | null;
  titleToFind?: string | null;
  filters?: {
    jurisdiction?: string | null;
    legalTopic?: string | null;
    courtLevel?: string | null;
  };
};


export type LogType = {
  log: string;
  level: 'DEBUG' | 'INFO' | 'ERROR';
  reqId: string;
  timestamp?: Date;
};
