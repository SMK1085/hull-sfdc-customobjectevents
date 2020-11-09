import { Record } from "jsforce";
import { first, get, isNil, last, min, set } from "lodash";
import { connector_v1 } from "../../core/connector.v1";
import { hull_v1 } from "../../core/hull.v1";
import jsonata from "jsonata";

export class MappingUtil {
  public readonly appSettings: connector_v1.Schema$AppSettings;
  private readonly registerMapMessages: {
    [key: string]: (
      params: connector_v1.Params$MapMessagesToEnvelopes<any>,
    ) => connector_v1.Schema$OutgoingOperationEnvelope<any, unknown>[];
  };

  constructor(options: connector_v1.Schema$DiRegistrationOptions) {
    this.appSettings = options.hullAppSettings;
    // Registered mappings for messages to envelopes
    this.registerMapMessages = {
      "user:update": this.mapMessagesUserUpdateToOutgoingEnvelopes.bind(this),
    };
  }

  public mapMessagesToOutgoingEnvelopes<THullMessage>(
    params: connector_v1.Params$MapMessagesToEnvelopes<THullMessage>,
  ): connector_v1.Schema$OutgoingOperationEnvelope<THullMessage, unknown>[] {
    if (!Object.keys(this.registerMapMessages).includes(params.channel)) {
      throw new Error(
        `Channel '${
          params.channel
        }' is not registered. Allowed channels are ${Object.keys(
          this.registerMapMessages,
        ).join(", ")}.`,
      );
    }

    return this.registerMapMessages[params.channel](params);
  }

  public mapEnvelopesToServiceObjects<THullMessage>(
    envelopes: connector_v1.Schema$OutgoingOperationEnvelope<
      THullMessage,
      unknown
    >[],
  ): connector_v1.Schema$OutgoingOperationEnvelope<THullMessage, Record[]>[] {
    return envelopes.map((envelope) => {
      const msg = (envelope.hullMessage as any) as hull_v1.Schema$MessageUserUpdate;
      envelope.serviceObject = this.mapMessageUserUpdateToServiceObject(msg);
      envelope.serviceOperation = "INSERT";
      return envelope as connector_v1.Schema$OutgoingOperationEnvelope<
        THullMessage,
        Record[]
      >;
    });
  }

  private mapMessagesUserUpdateToOutgoingEnvelopes(
    params: connector_v1.Params$MapMessagesToEnvelopes<
      hull_v1.Schema$MessageUserUpdate
    >,
  ): connector_v1.Schema$OutgoingOperationEnvelope<
    hull_v1.Schema$MessageUserUpdate,
    unknown
  >[] {
    return params.messages.map((msg) => {
      return {
        hullMessage: msg,
        hullObjectType: "user",
        serviceOperation: "UNSPECIFIED",
      };
    });
  }

  private mapMessageUserUpdateToServiceObject(
    message: hull_v1.Schema$MessageUserUpdate,
  ): Record[] {
    const result: Record[] = [];

    message.events.forEach((e) => {
      const combinedObject = {
        ...e,
        user: message.user,
        account: message.account,
      };
      const referenceObject = {
        ...message.user,
        account: message.account,
      };
      const record = {};
      set(
        record,
        this.appSettings.salesforce_customobject_id as string,
        get(combinedObject, this.appSettings.hull_event_id!, null),
      );

      if (!isNil(this.appSettings.user_references_outgoing)) {
        this.appSettings.user_references_outgoing.forEach((map) => {
          if (!isNil(map.hull) && !isNil(map.service)) {
            const attribVal = get(referenceObject, map.hull, null);
            if (!isNil(attribVal)) {
              set(record, map.service, attribVal);
            }
          }
        });
      }
      if (!isNil(this.appSettings.user_event_properties)) {
        this.appSettings.user_event_properties.forEach((map) => {
          if (!isNil(map.hull) && !isNil(map.service)) {
            const expr = jsonata(map.hull as string);
            const attribVal = expr.evaluate(combinedObject);
            if (!isNil(attribVal)) {
              set(record, map.service, attribVal);
            }
          }
        });
      }
      console.log(record);
      result.push(record);
    });

    return result;
  }
}
