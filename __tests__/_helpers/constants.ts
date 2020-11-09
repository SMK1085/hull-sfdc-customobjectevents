import { random, internet } from "faker";
import { connector_v1 } from "../../src/core/connector.v1";

// Salesforce API
const AUTH_ACCESSTOKEN =
  "99AA0000000dMQy!HpcXiZXZqJXBAeE4hZPYEpYbcLh8dcjA.2xT8Cye8uqCQXBiKA3U7zfGRZreGXpg3jPvM6ETpWwNCpxCLyXMohWM8iEB";
const AUTH_REFRESHTOKEN =
  "7pDiX9DhmFKggbPbQVTGxktvqPf6KF3pED8gXQCs.wHf84pCUZUCafQNkv2PDdYDFo.rrEzXLKuRHpt3yjRnCBP";
const AUTH_INSTANCEID = "https://test.my.salesforce.com";
const AUTH_CLIENTID =
  "8cf3jCwjH2PiUo7bBDyHd3dHcNhtfzirMyLznjV7zLruhHXAWrkdhRjxMvFX9rYYzqPEq02v1zhkxVlnIn9yt";
const AUTH_CLIENTSECRET = "TqWYf7iEiKB6EtYxcfYK";

// Default Settings
export const APPSETTINGS_DEFAULT: connector_v1.Schema$AppSettings = {
  user_synchronized_segments: [],
  auth_loginurl: "https://login.salesforce.com",
  disable_sync: false,
  hull_events: [],
  service_api_version: "v49.0",
  skip_objects_with_no_reference: false,
  user_event_properties: [],
  user_references_outgoing: [],
};

// Connector Stuff
export const OAUTH_REDIRECT_URL =
  "https://sfdc-customobjectevents.hulldx.com/oauth/callback";
