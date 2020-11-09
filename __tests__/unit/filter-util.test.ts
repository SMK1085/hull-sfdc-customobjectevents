import { random } from "faker";
import { connector_v1 } from "../../src/core/connector.v1";
import { hull_v1 } from "../../src/core/hull.v1";
import { VALIDATION_SKIP_HULLOBJECT_NOTINANYSEGMENT } from "../../src/core/messages";
import { FilterUtil } from "../../src/utils/v1/filter-util";
import { APPSETTINGS_DEFAULT, OAUTH_REDIRECT_URL } from "../_helpers/constants";
import { createHullUserUpdateMessages } from "../_helpers/data-helpers";

describe("FilterUtil.v1", () => {
  describe("#constructor", () => {
    it("should initialize all readonly fields", () => {
      // Arrange
      const options = {
        hullAppSettings: APPSETTINGS_DEFAULT,
        oAuthRedirectUrl: OAUTH_REDIRECT_URL,
      };
      // Act
      const util = new FilterUtil(options);

      // Assert
      expect(util.appSettings).toEqual(options.hullAppSettings);
    });
  });

  describe("#filterSegments()", () => {
    it("should not filter out any user:update envelope when batch operation", () => {
      // Arrange
      const segmentIds: string[] = [];
      const options = {
        hullAppSettings: APPSETTINGS_DEFAULT,
        oAuthRedirectUrl: OAUTH_REDIRECT_URL,
      };
      const util = new FilterUtil(options);
      const messages = createHullUserUpdateMessages(
        5,
        segmentIds,
        0,
        5,
        0,
        0,
        0,
        0,
      );
      const envelopes: connector_v1.Schema$OutgoingOperationEnvelope<
        hull_v1.Schema$MessageUserUpdate,
        unknown
      >[] = messages.map((msg) => {
        return {
          hullMessage: msg,
          hullObjectType: "user",
          serviceOperation: "UNSPECIFIED",
        };
      });
      const params: connector_v1.Params$FilterEnvelopesSegment<
        hull_v1.Schema$MessageUserUpdate,
        unknown
      > = {
        envelopes,
        isBatch: true,
      };

      // Act
      const result = util.filterSegments(params);

      // Assert
      expect(result).toHaveLength(envelopes.length);
      result.forEach((r) => {
        expect(r.notes).toBeUndefined();
        expect(r.hullOperationResult).toBeUndefined();
      });
    });

    it("should not filter out user:update envelopes which do not match any whitelisted segments", () => {
      // Arrange
      const segmentIds: string[] = [random.uuid()];
      const options = {
        hullAppSettings: {
          ...APPSETTINGS_DEFAULT,
          user_synchronized_segments: segmentIds,
        },
        oAuthRedirectUrl: OAUTH_REDIRECT_URL,
      };
      const util = new FilterUtil(options);
      const messages = createHullUserUpdateMessages(
        5,
        segmentIds,
        2,
        5,
        0,
        0,
        0,
        0,
      );
      const envelopes: connector_v1.Schema$OutgoingOperationEnvelope<
        hull_v1.Schema$MessageUserUpdate,
        unknown
      >[] = messages.map((msg) => {
        return {
          hullMessage: msg,
          hullObjectType: "user",
          serviceOperation: "UNSPECIFIED",
        };
      });
      const params: connector_v1.Params$FilterEnvelopesSegment<
        hull_v1.Schema$MessageUserUpdate,
        unknown
      > = {
        envelopes,
        isBatch: false,
      };

      // Act
      const result = util.filterSegments(params);

      // Assert
      expect(result).toHaveLength(envelopes.length);
      result.forEach((r, i) => {
        if (i < 2) {
          expect(r.notes).toBeUndefined();
          expect(r.hullOperationResult).toBeUndefined();
        } else {
          expect(r.notes).toEqual([
            VALIDATION_SKIP_HULLOBJECT_NOTINANYSEGMENT("user"),
          ]);
          expect(r.hullOperationResult).toEqual("skip");
        }
      });
    });
  });
});
