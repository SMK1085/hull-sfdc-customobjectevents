import { company, internet, random, date, name } from "faker";
import { hull_v1 } from "../../src/core/hull.v1";

export const createHullAccountUpdateMessages = (
  count: number,
  segmentIds: string[],
  countWithSegmentIds: number,
  countWithDomain: number,
  countWithExternalId: number,
): hull_v1.Schema$MessageAccountUpdate[] => {
  const result: hull_v1.Schema$MessageAccountUpdate[] = [];

  for (let index = 0; index < count; index++) {
    result.push({
      account: {
        id: random.uuid(),
        domain: index < countWithDomain ? internet.domainName() : null,
        external_id: index < countWithExternalId ? random.uuid() : null,
        anonymous_ids: [random.alphaNumeric()],
        name: company.companyName(),
      },
      message_id: random.uuid(),
      account_segments:
        index < countWithSegmentIds
          ? segmentIds.map((id) => {
              return {
                created_at: date.past().toISOString(),
                id,
                name: random.words(),
                type: "account_segment",
                updated_at: date.past().toISOString(),
              };
            })
          : [],
    });
  }

  return result;
};

export const createHullUserUpdateMessages = (
  count: number,
  segmentIds: string[],
  countWithSegmentIds: number,
  countWithEmail: number,
  countWithExternalId: number,
  countWithAccount: number,
  countWithAccountDomain: number,
  countWithAccountExternalId: number,
  events: hull_v1.Schema$UserEvent[] = [],
): hull_v1.Schema$MessageUserUpdate[] => {
  const result: hull_v1.Schema$MessageUserUpdate[] = [];

  for (let index = 0; index < count; index++) {
    result.push({
      account:
        index < countWithAccount
          ? {
              id: random.uuid(),
              domain:
                index < countWithAccountDomain ? internet.domainName() : null,
              external_id:
                index < countWithAccountExternalId ? random.uuid() : null,
              anonymous_ids: [random.alphaNumeric()],
              name: company.companyName(),
            }
          : null,
      user: {
        id: random.uuid(),
        external_id: index < countWithExternalId ? random.uuid() : null,
        email: index < countWithEmail ? internet.email() : null,
        anonymous_ids: [random.alphaNumeric()],
        first_name: name.firstName(),
        last_name: name.lastName(),
      },
      message_id: random.uuid(),
      segments:
        index < countWithSegmentIds
          ? segmentIds.map((id) => {
              return {
                created_at: date.past().toISOString(),
                id,
                name: random.words(),
                type: "user_segment",
                updated_at: date.past().toISOString(),
              };
            })
          : [],
      account_segments: [],
      events,
    });
  }

  return result;
};

export const createUserEvent = (
  userId: string,
  eventName: string,
  properties: any,
  sessionId: string | undefined = undefined,
  eventType: string = "track",
  context: any = undefined,
): hull_v1.Schema$UserEvent => {
  const result: hull_v1.Schema$UserEvent = {
    created_at: date.past().toISOString(),
    event: eventName,
    app_id: random.uuid(),
    app_name: random.words(2),
    event_id: random.uuid(),
    event_type: eventType,
    user_id: userId,
    session_id: sessionId,
    properties,
    context,
  };

  return result;
};
