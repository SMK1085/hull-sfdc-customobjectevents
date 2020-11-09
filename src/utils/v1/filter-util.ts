import { intersection, isNil } from "lodash";
import { connector_v1 } from "../../core/connector.v1";
import { hull_v1 } from "../../core/hull.v1";
import {
  VALIDATION_SKIP_HULLOBJECT_NOTINANYSEGMENT,
  VALIDATION_SKIP_NOEVENT,
} from "../../core/messages";
import { get } from "lodash";

export class FilterUtil {
  public readonly appSettings: connector_v1.Schema$AppSettings;

  constructor(options: connector_v1.Schema$DiRegistrationOptions) {
    this.appSettings = options.hullAppSettings;
  }

  public filterSegments<THullMessage>(
    params: connector_v1.Params$FilterEnvelopesSegment<THullMessage, unknown>,
  ): connector_v1.Schema$OutgoingOperationEnvelope<THullMessage, unknown>[] {
    return params.envelopes.map((envelope) => {
      if (params.isBatch) {
        // Bypass on batch operations
        return envelope;
      } else {
        const whitelistedSegments =
          envelope.hullObjectType === "user"
            ? this.appSettings.user_synchronized_segments
            : [];
        if (
          FilterUtil.isInAnySegment(
            envelope.hullObjectType === "user"
              ? (envelope.hullMessage as any).segments
              : (envelope.hullMessage as any).account_segments,
            whitelistedSegments,
          )
        ) {
          return envelope;
        } else {
          return {
            ...envelope,
            notes: [
              VALIDATION_SKIP_HULLOBJECT_NOTINANYSEGMENT(
                envelope.hullObjectType as any,
              ),
            ],
            hullOperationResult: "skip",
          };
        }
      }
    });
  }

  public filterMandatoryData(
    params: connector_v1.Params$FilterEnvelopesMandatoryData<
      hull_v1.Schema$MessageUserUpdate,
      unknown
    >,
  ): connector_v1.Schema$OutgoingOperationEnvelope<
    hull_v1.Schema$MessageUserUpdate,
    unknown
  >[] {
    return params.envelopes.map((envelope) => {
      const whiteListedEvents = this.appSettings.hull_events;
      const hasChangedRef = this.hasReferenceChanged(envelope);

      if (
        (isNil(envelope.hullMessage.events) ||
          envelope.hullMessage.events.length === 0) &&
        hasChangedRef === false
      ) {
        return {
          ...envelope,
          notes: [...get(envelope, "notes", []), VALIDATION_SKIP_NOEVENT],
          hullOperationResult: "skip",
        };
      }

      const matchingEvents = envelope.hullMessage.events.filter((e) => {
        return whiteListedEvents.includes(e.event);
      });

      if (matchingEvents.length === 0 && hasChangedRef === false) {
        return {
          ...envelope,
          notes: [...get(envelope, "notes", []), VALIDATION_SKIP_NOEVENT],
          hullOperationResult: "skip",
        };
      } else if (hasChangedRef === true) {
        return {
          ...envelope,
          serviceOperation: "UPSERTREFS",
        };
      }

      return envelope;
    });
  }

  private static isInAnySegment(
    actualSegments: hull_v1.Schema$Segment[],
    whitelistedSegments: string[],
  ): boolean {
    const actualIds = actualSegments.map((s) => s.id);
    if (intersection(actualIds, whitelistedSegments).length === 0) {
      return false;
    }

    return true;
  }

  private hasReferenceChanged(
    envelope: connector_v1.Schema$OutgoingOperationEnvelope<
      hull_v1.Schema$MessageUserUpdate,
      unknown
    >,
  ): boolean {
    let result = false;

    if (!isNil(this.appSettings.user_references_outgoing)) {
      const userChanges = get(envelope, "hullMessage.changes.user", {});
      const accountChanges = get(envelope, "hullMessage.changes.account", {});
      this.appSettings.user_references_outgoing.forEach((map) => {
        if (!isNil(map.hull) && !map.hull.startsWith("account.")) {
          if (!isNil(get(userChanges, map.hull, null))) {
            result = true;
          }
        } else if (!isNil(map.hull) && map.hull.startsWith("account.")) {
          if (
            !isNil(get(accountChanges, map.hull.replace("account.", ""), null))
          ) {
            result = true;
          }
        }
      });
    }
    console.log(">> Has ref changes", result);
    return result;
  }
}
