export namespace hull_v1 {
  export interface Options {
    version: "v1";
  }

  export interface Schema$Segment {
    id: string;
    name: string;
    type: string;
    stats?: Schema$SegmentStatistics;
    created_at: string;
    updated_at: string;
  }

  export interface Schema$SegmentStatistics {
    users?: number;
    accounts?: number;
  }

  interface Schema$ChangesBaseSegments {
    entered?: Schema$Segment[];
    left?: Schema$Segment[];
  }

  export interface Schema$ChangesAccount {
    account: { [key: string]: any[] };
    account_segments: Schema$ChangesBaseSegments;
    is_new?: boolean;
  }

  export interface Schema$ChangesUser extends Schema$ChangesAccount {
    user: { [key: string]: any[] };
    segments: Schema$ChangesBaseSegments;
  }

  export interface Schema$ProfileBase {
    id: string;
    external_id?: string | null;
    anonymous_ids?: string[] | null;
    [key: string]: any;
  }

  export interface Schema$ProfileAccount extends Schema$ProfileBase {
    domain?: string | null;
  }

  export interface Schema$ProfileUser extends Schema$ProfileBase {
    email?: string | null;
  }

  interface Schema$UserEventContext {
    location?: any;
    page?: {
      referrer?: string;
    };
    referrer?: {
      url: string;
    };
    os?: any;
    useragent?: string;
    ip?: string | number;
    event_id?: string | null;
    source?: string | null;
    created_at?: string | number | null;
  }

  export interface Schema$UserEvent {
    id?: string;
    event_id?: string;
    event: string;
    created_at: string;
    event_source?: string;
    event_type?: string;
    track_id?: string;
    user_id?: string;
    anonymous_id?: string;
    session_id?: string;
    ship_id?: string;
    app_id?: string;
    app_name?: string;
    context: Schema$UserEventContext;
    properties: { [key: string]: any };
  }

  export interface Schema$MessageAccountUpdate {
    message_id: string;
    changes?: Schema$ChangesAccount;
    account_segments: Schema$Segment[];
    account: Schema$ProfileAccount;
  }

  export interface Schema$MessageUserUpdate {
    message_id: string;
    changes?: Schema$ChangesUser;
    account_segments: Schema$Segment[];
    account?: Schema$ProfileAccount | null;
    user: Schema$ProfileUser;
    segments: Schema$Segment[];
    events: Schema$UserEvent[];
  }
}
