import { connector_v1 } from "../../src/core/connector.v1";
import { hull_v1 } from "../../src/core/hull.v1";
import { MappingUtil } from "../../src/utils/v1/mapping-util";
import { APPSETTINGS_DEFAULT, OAUTH_REDIRECT_URL } from "../_helpers/constants";
import {
  createHullUserUpdateMessages,
  createUserEvent,
} from "../_helpers/data-helpers";
import { Record } from "jsforce";
import { random } from "faker";
import { set } from "lodash";

describe("MappingUtil", () => {
  describe("#constructor", () => {
    it("should initialize all readonly fields", () => {
      // Arrange
      const options = {
        hullAppSettings: APPSETTINGS_DEFAULT,
        oAuthRedirectUrl: OAUTH_REDIRECT_URL,
      };
      // Act
      const util = new MappingUtil(options);

      // Assert
      expect(util.appSettings).toEqual(options.hullAppSettings);
    });
  });

  describe("#mapMessagesToOutgoingEnvelopes()", () => {
    it("should map messages from user:update channel to envelopes", () => {
      // Arrange
      const segmentIds: string[] = [];
      const options = {
        hullAppSettings: {
          ...APPSETTINGS_DEFAULT,
          hull_events: ["Session started"],
          hull_event_id: "event_id",
          salesforce_customobject_id: "Hull_Session_ID__c",
          user_references_outgoing: [
            {
              hull: "traits_salesforce_lead/id",
              service: "Lead_id__c",
            },
            {
              hull: "traits_salesforce_contact/id",
              service: "Contact_id__c",
            },
            {
              hull: "traits_salesforce_contact/account_id",
              service: "Account_id__c",
            },
          ],
          user_event_properties: [
            {
              hull: "created_at",
              service: "Session_Start_Time__c",
            },
            {
              hull: "event_id",
              service: "Hull_Session_ID__c",
            },
            {
              hull: "properties.utm_medium",
              service: "utm_medium__c",
            },
            {
              hull: "properties.pi_campaign_id",
              service: "pi_campaign_id__c",
            },
            {
              hull: "properties.utm_source",
              service: "utm_source__c",
            },
            {
              hull: "properties.utm_campaign",
              service: "utm_campaign__c",
            },
            {
              hull: "properties.utm_term",
              service: "utm_term__c",
            },
            {
              hull: "properties.referrer",
              service: "referrer__c",
            },
            {
              hull: "properties.gclid",
              service: "Google_Ads_CID__c",
            },
            {
              hull: "properties.initial_url",
              service: "initial_url__c",
            },
            {
              hull: "properties.cookie_ids",
              service: "Hull_Cookie_ID__c",
            },
            {
              hull: "properties.is_conversion_session",
              service: "signup_session__c",
            },
            {
              hull: "user.domain",
              service: "Email_Domain__c",
            },
          ],
        },
        oAuthRedirectUrl: OAUTH_REDIRECT_URL,
      };

      const util = new MappingUtil(options);
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

      // Act
      const result = util.mapMessagesToOutgoingEnvelopes({
        channel: "user:update",
        messages,
      });

      // Assert
      expect(result).toHaveLength(messages.length);
      result.forEach((r) => {
        expect(r.hullMessage).toBeDefined();
        expect(r.hullObjectType).toEqual("user");
      });
    });

    it("should throw if channel is not registered", () => {
      // Arrange
      const options = {
        hullAppSettings: APPSETTINGS_DEFAULT,
        oAuthRedirectUrl: OAUTH_REDIRECT_URL,
      };

      const util = new MappingUtil(options);
      const messages = createHullUserUpdateMessages(5, [], 0, 5, 0, 0, 0, 0);

      // Act and Assert
      expect(() => {
        util.mapMessagesToOutgoingEnvelopes({ channel: "foo", messages });
      }).toThrow(
        `Channel 'foo' is not registered. Allowed channels are ${[
          "user:update",
        ].join(", ")}.`,
      );
    });
  });

  describe("#mapEnvelopesToServiceObjects()", () => {
    it("should map an envelope with whitelisted events to the proper records", () => {
      // Arrange
      const segmentIds: string[] = [];
      const options = {
        hullAppSettings: {
          ...APPSETTINGS_DEFAULT,
          hull_events: ["Session started"],
          hull_event_id: "event_id",
          salesforce_customobject_id: "Hull_Session_ID__c",
          user_references_outgoing: [
            {
              hull: "traits_salesforce_lead/id",
              service: "Lead_id__c",
            },
            {
              hull: "traits_salesforce_contact/id",
              service: "Contact_id__c",
            },
            {
              hull: "traits_salesforce_contact/account_id",
              service: "Account_id__c",
            },
          ],
          user_event_properties: [
            {
              hull: "created_at",
              service: "Session_Start_Time__c",
            },
            {
              hull: "event_id",
              service: "Hull_Session_ID__c",
            },
            {
              hull: "properties.utm_medium",
              service: "utm_medium__c",
            },
            {
              hull: "properties.pi_campaign_id",
              service: "pi_campaign_id__c",
            },
            {
              hull: "properties.utm_source",
              service: "utm_source__c",
            },
            {
              hull: "properties.utm_campaign",
              service: "utm_campaign__c",
            },
            {
              hull: "properties.utm_term",
              service: "utm_term__c",
            },
            {
              hull: "properties.referrer",
              service: "referrer__c",
            },
            {
              hull: "properties.gclid",
              service: "Google_Ads_CID__c",
            },
            {
              hull: "properties.initial_url",
              service: "initial_url__c",
            },
            {
              hull: "properties.cookie_ids",
              service: "Hull_Cookie_ID__c",
            },
            {
              hull: "properties.is_conversion_session",
              service: "signup_session__c",
            },
            {
              hull: "user.domain",
              service: "Email_Domain__c",
            },
          ],
        },
        oAuthRedirectUrl: OAUTH_REDIRECT_URL,
      };

      const util = new MappingUtil(options);
      const messages = createHullUserUpdateMessages(
        1,
        segmentIds,
        0,
        1,
        0,
        0,
        0,
        0,
      );
      const envelopes: connector_v1.Schema$OutgoingOperationEnvelope<
        hull_v1.Schema$MessageUserUpdate,
        Record[]
      >[] = [];
      const hullEvent = createUserEvent(
        messages[0].user.id,
        "Session started",
        {
          utm_medium: "Paid Ad",
          utm_campaign: "Test_Campaign",
          utm_content: "EN_v1",
          utm_source: "Google Ads",
          initial_url:
            "https://www.hull.io/test?utm_source=Google%20Ads&utm_medium=Paid%20Ad&utm_campaign=Test_Campaign&utm_content=EN_V1",
        },
      );
      const msgWithEvent = {
        ...messages[0],
        events: [hullEvent],
      };
      envelopes.push({
        hullMessage: msgWithEvent,
        hullObjectType: "user",
        serviceOperation: "UNSPECIFIED",
      });

      // Act
      const result = util.mapEnvelopesToServiceObjects(envelopes);

      // Assert
      const expectedRecord = {
        Hull_Session_ID__c: hullEvent.event_id,
        utm_medium__c: hullEvent.properties.utm_medium,
        utm_campaign__c: hullEvent.properties.utm_campaign,
        utm_source__c: hullEvent.properties.utm_source,
        initial_url__c: hullEvent.properties.initial_url,
        Session_Start_Time__c: hullEvent.created_at,
      };
      expect(result).toHaveLength(1);
      expect(result[0]!.serviceObject).toHaveLength(1);
      expect(result[0]!.serviceObject![0]).toEqual(expectedRecord);
    });

    it("should map an envelope with whitelisted events and a referenced Lead to the proper records", () => {
      // Arrange
      const segmentIds: string[] = [];
      const options = {
        hullAppSettings: {
          ...APPSETTINGS_DEFAULT,
          hull_events: ["Session started"],
          hull_event_id: "event_id",
          salesforce_customobject_id: "Hull_Session_ID__c",
          user_references_outgoing: [
            {
              hull: "traits_salesforce_lead/id",
              service: "Lead_id__c",
            },
            {
              hull: "traits_salesforce_contact/id",
              service: "Contact_id__c",
            },
            {
              hull: "traits_salesforce_contact/account_id",
              service: "Account_id__c",
            },
          ],
          user_event_properties: [
            {
              hull: "created_at",
              service: "Session_Start_Time__c",
            },
            {
              hull: "event_id",
              service: "Hull_Session_ID__c",
            },
            {
              hull: "properties.utm_medium",
              service: "utm_medium__c",
            },
            {
              hull: "properties.pi_campaign_id",
              service: "pi_campaign_id__c",
            },
            {
              hull: "properties.utm_source",
              service: "utm_source__c",
            },
            {
              hull: "properties.utm_campaign",
              service: "utm_campaign__c",
            },
            {
              hull: "properties.utm_term",
              service: "utm_term__c",
            },
            {
              hull: "properties.referrer",
              service: "referrer__c",
            },
            {
              hull: "properties.gclid",
              service: "Google_Ads_CID__c",
            },
            {
              hull: "properties.initial_url",
              service: "initial_url__c",
            },
            {
              hull: "properties.cookie_ids",
              service: "Hull_Cookie_ID__c",
            },
            {
              hull: "properties.is_conversion_session",
              service: "signup_session__c",
            },
            {
              hull: "user.domain",
              service: "Email_Domain__c",
            },
          ],
        },
        oAuthRedirectUrl: OAUTH_REDIRECT_URL,
      };

      const util = new MappingUtil(options);
      const messages = createHullUserUpdateMessages(
        1,
        segmentIds,
        0,
        1,
        0,
        0,
        0,
        0,
      );
      const envelopes: connector_v1.Schema$OutgoingOperationEnvelope<
        hull_v1.Schema$MessageUserUpdate,
        Record[]
      >[] = [];
      const hullEvent = createUserEvent(
        messages[0].user.id,
        "Session started",
        {
          utm_medium: "Paid Ad",
          utm_campaign: "Test_Campaign",
          utm_content: "EN_v1",
          utm_source: "Google Ads",
          initial_url:
            "https://www.hull.io/test?utm_source=Google%20Ads&utm_medium=Paid%20Ad&utm_campaign=Test_Campaign&utm_content=EN_V1",
        },
      );
      const msgWithEvent = {
        ...messages[0],
        events: [hullEvent],
      };
      envelopes.push({
        hullMessage: msgWithEvent,
        hullObjectType: "user",
        serviceOperation: "UNSPECIFIED",
      });
      const leadId = random.uuid();
      set(msgWithEvent.user, "traits_salesforce_lead/id", leadId);

      // Act
      const result = util.mapEnvelopesToServiceObjects(envelopes);

      // Assert
      const expectedRecord = {
        Hull_Session_ID__c: hullEvent.event_id,
        utm_medium__c: hullEvent.properties.utm_medium,
        utm_campaign__c: hullEvent.properties.utm_campaign,
        utm_source__c: hullEvent.properties.utm_source,
        initial_url__c: hullEvent.properties.initial_url,
        Session_Start_Time__c: hullEvent.created_at,
        Lead_id__c: leadId,
      };
      expect(result).toHaveLength(1);
      expect(result[0]!.serviceObject).toHaveLength(1);
      expect(result[0]!.serviceObject![0]).toEqual(expectedRecord);
    });
  });
});
