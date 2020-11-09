import { hull_v1 } from "./hull.v1";

export namespace connector_v1 {
  export interface Options {
    version: "v1";
  }

  export interface Schema$AppSettings {
    auth_client_id?: string;
    auth_client_secret?: string;
    auth_refresh_token?: string;
    auth_access_token?: string;
    auth_instance_url?: string;
    disable_sync: boolean;
    hull_events: string[];
    salesforce_customobject?: string | null;
    hull_event_id?: string | null;
    salesforce_customobject_id?: string | null;
    skip_objects_with_no_reference: boolean;
    user_synchronized_segments: string[];
    user_references_outgoing: Schema$AttributeMapping[];
    user_event_properties: Schema$AttributeMapping[];
    auth_loginurl: string;
    service_api_version: string;
  }

  export interface Schema$LogPayload {
    channel: "operational" | "metric" | "error";
    component: string;
    code: string;
    message?: string | null;
    metricKey?: string | null;
    metricValue?: number | null;
    errorDetails?: any | null;
    errorMessage?: string | null;
    appId: string;
    tenantId: string;
    correlationKey?: string;
  }

  export interface Schema$DiRegistrationOptions {
    hullAppSettings: Schema$AppSettings;
    oAuthRedirectUrl: string;
  }

  export type Type$ApiMethod =
    | "delete"
    | "get"
    | "GET"
    | "DELETE"
    | "head"
    | "HEAD"
    | "options"
    | "OPTIONS"
    | "post"
    | "POST"
    | "put"
    | "PUT"
    | "patch"
    | "PATCH"
    | "link"
    | "LINK"
    | "unlink"
    | "UNLINK";

  export interface Schema$ApiResult<TPayload, TData, TError> {
    endpoint: string;
    method: Type$ApiMethod;
    payload: TPayload | undefined;
    data?: TData;
    success: boolean;
    error?: string | string[];
    errorDetails?: TError;
  }

  export type Type$ServiceOperation =
    | "UNSPECIFIED"
    | "INSERT"
    | "UPDATE"
    | "UPSERTREFS";

  export interface Schema$OutgoingOperationEnvelope<
    THullMessage,
    TServiceObject
  > {
    hullMessage: THullMessage;
    hullObjectType: "user" | "account" | "event";
    hullOperationResult?: "success" | "error" | "skip";
    serviceObject?: TServiceObject;
    serviceOperation: Type$ServiceOperation;
    notes?: string[];
  }

  export interface Params$MapMessagesToEnvelopes<THullMessage> {
    channel: string;
    messages: THullMessage[];
  }

  export interface Params$FilterEnvelopesSegment<THullMessage, TServiceObject> {
    envelopes: Schema$OutgoingOperationEnvelope<THullMessage, TServiceObject>[];
    isBatch: boolean;
  }

  export interface Params$FilterEnvelopesMandatoryData<
    THullMessage,
    TServiceObject
  > {
    envelopes: Schema$OutgoingOperationEnvelope<THullMessage, TServiceObject>[];
  }

  export type Type$ConnectorStatus =
    | "ok"
    | "warning"
    | "error"
    | "setupRequired";

  export interface Schema$ConnectorStatusResponse {
    status: Type$ConnectorStatus;
    messages: string[];
  }

  export interface Schema$MapIncomingResult {
    ident: unknown;
    hullScope: "asUser" | "asAccount";
    hullOperation: "traits" | "track" | "alias" | "unalias";
    hullOperationParams: unknown[];
  }

  export interface Schema$AttributeMapping {
    hull?: string | null;
    service?: string | null;
    overwrite?: boolean;
    readOnly?: boolean;
  }

  export interface Schema$AuthStatus {
    statusCode: number;
    message: string;
  }

  export interface Params$ListMetadata {
    objectType: string;
    dataDirection: string;
  }

  export interface Schema$ListMetadataResponse {
    ok: boolean;
    options: { value: string; label: string }[];
    error?: string;
  }

  export interface Params$FetchHullEvents {
    page: number;
    perPage: number;
    eventNames: string[];
    userId: string;
    sort: { [key: string]: "asc" | "desc" };
  }

  export interface Params$GetPastEvents {
    userId: string;
    eventNames: string[];
    sort: { [key: string]: "asc" | "desc" };
    page: number;
    pageSize: number;
  }

  export interface Schema$GetPastEventsResponse {
    data: hull_v1.Schema$UserEvent[];
    pagination: {
      total: number;
      pages: number;
      has_more: boolean;
      page: number;
      per_page: number;
    };
  }
}
