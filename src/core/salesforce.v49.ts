import { ListMetadataQuery, Record } from "jsforce";

export namespace salesforce_v49 {
  export interface Options {
    version: "v49.0";
  }

  export interface Params$ListCustomObjects {
    queries: ListMetadataQuery[];
  }

  export interface Schema$TokenFromCodeResponse {
    accessToken: string;
    refreshToken: string;
    instanceUrl: string;
    userId: string;
    organizationId: string;
  }

  export interface Params$ListFields {
    objectType: string;
  }

  export interface Params$QueryRecords {
    objectType: string;
    query?: string | object;
  }

  export interface Params$CreateRecords {
    objectType: string;
    records: Record[];
  }

  export interface Params$UpdateRecords {
    objectType: string;
    records: Record[];
  }
}
