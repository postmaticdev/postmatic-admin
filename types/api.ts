export type BaseResponse<T = unknown> = {
  metaData?: {
    code?: number;
    message?: string;
    path?: string;
    method?: string;
    requestId?: string;
  };
  responseMessage?: string;
  data?: T;
  validationErrors?: unknown;
  filterQuery?: unknown;
  pagination?: unknown;
};

export type JsonRecord = Record<string, unknown>;
