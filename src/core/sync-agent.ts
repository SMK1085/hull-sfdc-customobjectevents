import { AwilixContainer, asClass, asValue } from "awilix";
import { ServiceClient } from "./service-client";
import { LoggingUtil } from "../utils/v1/logging-util";
import { FilterUtil } from "../utils/v1/filter-util";
import { MappingUtil } from "../utils/v1/mapping-util";
import { CachingUtil } from "../utils/v1/caching-util";
import { Logger } from "winston";
import IHullClient from "../types/hull-client";
import { isNil, cloneDeep, filter, set, get, compact } from "lodash";
import {
  ERROR_UNHANDLED_GENERIC,
  STATUS_SETUPREQUIRED_NOCLIENTID,
  STATUS_SETUPREQUIRED_NOCLIENTSECRET,
  STATUS_SETUPREQUIRED_OAUTHINCOMPLETE,
} from "./messages";
import { HullUtil } from "../utils/v1/hull-util";
import { connector_v1 } from "./connector.v1";
import { hull_v1 } from "./hull.v1";
import { Field, Record } from "jsforce";
import asyncForEach from "../utils/v1/async-foreach";

export class SyncAgent {
  public readonly diContainer: AwilixContainer;

  constructor(container: AwilixContainer) {
    this.diContainer = container;
    this.diContainer.register("serviceClient", asClass(ServiceClient));
    this.diContainer.register("loggingUtil", asClass(LoggingUtil));
    this.diContainer.register("filterUtil", asClass(FilterUtil));
    this.diContainer.register("mappingUtil", asClass(MappingUtil));
    this.diContainer.register("hullUtil", asClass(HullUtil));
    this.diContainer.register("cachingUtil", asClass(CachingUtil));
    const serviceClient = this.diContainer.resolve<ServiceClient>(
      "serviceClient",
    );
    serviceClient.on("refresh", (accessToken: string, resp: any) => {
      this.handleAccessTokenRefresh(accessToken, resp);
    });
  }

  /**
   * Processes outgoing notifications for user:update lane.
   *
   * @param {hull_v1.Schema$MessageUserUpdate[]} messages The notification messages.
   * @param {boolean} [isBatch=false] `True` if it is a batch; otherwise `false`.
   * @returns {Promise<unknown>} An awaitable Promise.
   * @memberof SyncAgent
   */
  public async sendUserMessages(
    messages: hull_v1.Schema$MessageUserUpdate[],
    isBatch = false,
  ): Promise<void> {
    if (!isBatch) {
      await this.handleNonBatchUsers(messages);
    } else {
      await this.handleBatchUsers(messages);
    }
  }

  /**
   * Determines the overall status of the connector.
   *
   * @returns {Promise<connector_v1.Schema$ConnectorStatusResponse>} The status response.
   * @memberof SyncAgent
   */
  public async determineConnectorStatus(): Promise<
    connector_v1.Schema$ConnectorStatusResponse
  > {
    const logger = this.diContainer.resolve<Logger>("logger");
    const loggingUtil = this.diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = this.diContainer.resolve<string>("correlationKey");

    const statusResult: connector_v1.Schema$ConnectorStatusResponse = {
      status: "ok",
      messages: [],
    };

    try {
      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_CONNECTORSTATUS_START",
          correlationKey,
        ),
      );

      const connectorSettings = this.diContainer.resolve<
        connector_v1.Schema$AppSettings
      >("hullAppSettings");
      const hullClient = this.diContainer.resolve<IHullClient>("hullClient");
      const connectorId = this.diContainer.resolve<string>("hullAppId");

      // Perfom checks to verify setup is complete
      if (isNil(connectorSettings.auth_client_id)) {
        statusResult.status = "setupRequired";
        statusResult.messages.push(STATUS_SETUPREQUIRED_NOCLIENTID);
      }

      if (isNil(connectorSettings.auth_client_secret)) {
        statusResult.status = "setupRequired";
        statusResult.messages.push(STATUS_SETUPREQUIRED_NOCLIENTSECRET);
      }

      if (
        isNil(connectorSettings.auth_instance_url) ||
        isNil(connectorSettings.auth_access_token) ||
        isNil(connectorSettings.auth_refresh_token)
      ) {
        statusResult.status = "setupRequired";
        statusResult.messages.push(STATUS_SETUPREQUIRED_OAUTHINCOMPLETE);
      }

      if (statusResult.status !== "setupRequired") {
      }

      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_CONNECTORSTATUS_STARTHULLAPI",
          correlationKey,
        ),
      );

      await hullClient.put(`${connectorId}/status`, statusResult);

      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_CONNECTORSTATUS_SUCCESS",
          correlationKey,
        ),
      );
    } catch (error) {
      console.error(error);
      const logPayload = loggingUtil.composeErrorMessage(
        "OPERATION_CONNECTORSTATUS_UNHANDLED",
        cloneDeep(error),
        correlationKey,
      );
      logger.error(logPayload);
      statusResult.status = "error";
      if (logPayload && logPayload.message) {
        statusResult.messages.push(logPayload.message);
      } else {
        statusResult.messages.push(ERROR_UNHANDLED_GENERIC);
      }
    }

    return statusResult;
  }

  /**
   * Returns the url for OAuth flow initialization.
   * @param baseUrl The base url of the connector without trailing slash and path.
   * @param state The state argument to include in the authorization url.
   * @memberof SyncAgent
   */
  public getOAuthUri(baseUrl: string, state: string): string {
    const serviceClient = this.diContainer.resolve<ServiceClient>(
      "serviceClient",
    ) as ServiceClient;
    const redirectUrl = `${baseUrl}/oauth/callback`;
    return serviceClient.getAuthUri(redirectUrl, state);
  }

  /**
   * Handles the completion of the OAuth flow by retrieving the tokens from the code.
   * @param code The code returned from the OAuth server.
   * @memberof SyncAgent
   */
  public async getTokenFromCode(code: string): Promise<void> {
    const logger = this.diContainer.resolve<Logger>("logger");
    const loggingUtil = this.diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = this.diContainer.resolve<string>("correlationKey");

    try {
      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_AUTHTOKENFROMCODE_START",
          correlationKey,
        ),
      );

      const serviceClient = this.diContainer.resolve<ServiceClient>(
        "serviceClient",
      );
      const hullClient = this.diContainer.resolve<IHullClient>("hullClient");

      const resp = await serviceClient.getTokenFromCode(code);

      await (hullClient as any).utils.settings.update({
        auth_refresh_token: resp.refreshToken,
        auth_access_token: resp.accessToken,
        auth_instance_url: resp.instanceUrl,
        auth_user_id: resp.userId,
        auth_sfdcorg_id: resp.organizationId,
      });

      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_AUTHTOKENFROMCODE_SUCCESS",
          correlationKey,
        ),
      );
    } catch (error) {
      const logPayload = loggingUtil.composeErrorMessage(
        "OPERATION_AUTHTOKENFROMCODE_UNHANDLED",
        cloneDeep(error),
        correlationKey,
      );
      logger.error(logPayload);
      // Re-throw error to make sure we do not redirect the user
      throw error;
    }
  }

  /**
   * Determines the authentication status of the connector.
   *
   * @returns {Promise<connector_v1.Schema$AuthStatus>} The authentication status.
   * @memberof SyncAgent
   */
  public async determineAuthStatus(): Promise<connector_v1.Schema$AuthStatus> {
    const logger = this.diContainer.resolve<Logger>("logger");
    const loggingUtil = this.diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = this.diContainer.resolve<string>("correlationKey");
    const appSettings = this.diContainer.resolve<
      connector_v1.Schema$AppSettings
    >("hullAppSettings");

    const result: connector_v1.Schema$AuthStatus = {
      statusCode: 200,
      message: "Connected",
    };

    try {
      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_AUTHSTATUS_START",
          correlationKey,
        ),
      );

      const {
        auth_access_token,
        auth_client_id,
        auth_client_secret,
        auth_refresh_token,
        auth_instance_url,
      } = appSettings;
      if (
        auth_access_token === undefined ||
        auth_client_id === undefined ||
        auth_client_secret === undefined ||
        auth_refresh_token === undefined ||
        auth_instance_url === undefined
      ) {
        result.statusCode = 401;
        result.message = "Connector is not authorized.";
        logger.debug(
          loggingUtil.composeOperationalMessage(
            "OPERATION_AUTHSTATUS_UNAUTHORIZED",
            correlationKey,
          ),
        );
      } else {
        result.message = `Connected to instance '${auth_instance_url}'.`;

        logger.debug(
          loggingUtil.composeOperationalMessage(
            "OPERATION_AUTHSTATUS_SUCCESS",
            correlationKey,
          ),
        );
      }
    } catch (error) {
      const logPayload = loggingUtil.composeErrorMessage(
        "OPERATION_AUTHSTATUS_UNHANDLED",
        cloneDeep(error),
        correlationKey,
      );
      logger.error(logPayload);
      result.statusCode = 500;
      if (logPayload && logPayload.message) {
        result.message = logPayload.message;
      } else {
        result.message = ERROR_UNHANDLED_GENERIC;
      }
    }

    return Promise.resolve(result);
  }

  public async listMetadata(
    params: connector_v1.Params$ListMetadata,
  ): Promise<connector_v1.Schema$ListMetadataResponse> {
    const logger = this.diContainer.resolve<Logger>("logger");
    const loggingUtil = this.diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = this.diContainer.resolve<string>("correlationKey");

    try {
      if (this.isAuthenticated() === false) {
        throw new Error(
          "Connector is not authenticated. Please authenticate first and/or refresh the page.",
        );
      }

      const appId = this.diContainer.resolve<string>("hullAppId");
      const appSettings = this.diContainer.resolve<
        connector_v1.Schema$AppSettings
      >("hullAppSettings");
      const cachingUtil = this.diContainer.resolve<CachingUtil>("cachingUtil");
      const serviceClient = this.diContainer.resolve<ServiceClient>(
        "serviceClient",
      );
      let cacheKey = `${appId}_meta_${params.objectType}_${params.dataDirection}`;
      const combined = `${params.objectType}_${params.dataDirection}`;
      const result: connector_v1.Schema$ListMetadataResponse = {
        ok: true,
        options: [],
      };
      switch (combined) {
        case "customobjects_outgoing":
          const apiResult = await cachingUtil.getCachedApiResponse(
            cacheKey,
            () =>
              serviceClient.listCustomObjects({
                queries: [{ type: "CustomObject", folder: undefined }],
              }),
          );
          if (apiResult.success) {
            result.options = apiResult.data!.map((d) => {
              return {
                label: d.fullName,
                value: d.fullName,
              };
            });
          } else {
            throw apiResult.errorDetails;
          }
          break;
        case "fieldsrefs_outgoing":
        case "fieldsunique_outgoing":
        case "fieldsupdatable_outgoing":
          if (isNil(appSettings.salesforce_customobject)) {
            throw new Error(
              "No custom object selected. Please specify the custom object, save your changes and reload the Settings page.",
            );
          }
          cacheKey = `${appId}_meta_${appSettings.salesforce_customobject}_fields`;
          const apiResultFields = await cachingUtil.getCachedApiResponse(
            cacheKey,
            () =>
              serviceClient.listFields({
                objectType: appSettings.salesforce_customobject as string,
              }),
          );
          if (apiResultFields.success) {
            let filtersFields: { [key: string]: (field: Field) => boolean } = {
              fieldsrefs_outgoing: (field: Field) => {
                return field.updateable === true && field.type === "reference";
              },
              fieldsunique_outgoing: (field: Field) => {
                return field.unique === true && field.updateable === true;
              },
              fieldsupdatable_outgoing: (field: Field) => {
                return field.updateable === true;
              },
            };

            console.log(apiResultFields.data);
            const filteredFields = apiResultFields.data!.filter(
              filtersFields[combined],
            ) as Field[];
            console.log(filteredFields);
            result.options = filteredFields.map((f: Field) => {
              return {
                label: f.label,
                value: f.name,
              };
            });
          } else {
            throw apiResultFields.errorDetails;
          }
          break;
        default:
          // TODO: Log no match
          result.ok = false;
          result.error = `No match for object type '${params.objectType}' and direction '${params.dataDirection}'.`;
          break;
      }

      return result;
    } catch (error) {
      console.error(error);
      // TODO: Log error
      return {
        ok: false,
        options: [],
        error: `Failed to load metadata: ${error.message}`,
      };
    }
  }

  private isAuthenticated(): boolean {
    const appSettings = this.diContainer.resolve<
      connector_v1.Schema$AppSettings
    >("hullAppSettings");

    if (isNil(appSettings.auth_access_token)) {
      return false;
    }

    if (isNil(appSettings.auth_instance_url)) {
      return false;
    }

    if (isNil(appSettings.auth_client_id)) {
      return false;
    }

    if (isNil(appSettings.auth_client_secret)) {
      return false;
    }

    return true;
  }

  private handleAccessTokenRefresh(accessToken: string, response: any) {
    const hullClient = this.diContainer.resolve<IHullClient>("hullClient");
    hullClient.utils.update({
      auth_access_token: accessToken,
    });
  }

  private async handleNonBatchUsers(
    messages: hull_v1.Schema$MessageUserUpdate[],
  ): Promise<void> {
    const logger = this.diContainer.resolve<Logger>("logger");
    const loggingUtil = this.diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = this.diContainer.resolve<string>("correlationKey");

    try {
      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_SENDUSERMESSAGES_START",
          correlationKey,
        ),
      );

      if (this.isAuthenticated() === false) {
        // TODO: Log skip
        return;
      }
      const mappingUtil = this.diContainer.resolve<MappingUtil>("mappingUtil");
      const filterUtil = this.diContainer.resolve<FilterUtil>("filterUtil");
      const hullClient = this.diContainer.resolve<IHullClient>("hullClient");
      let envelopes = mappingUtil.mapMessagesToOutgoingEnvelopes({
        channel: "user:update",
        messages,
      });
      envelopes = filterUtil.filterSegments({
        envelopes,
        isBatch: false,
      });
      this.logSkips(
        envelopes.filter((envelope) => {
          return envelope.hullOperationResult === "skip";
        }),
      );
      envelopes = envelopes.filter((envelope) => {
        return envelope.hullOperationResult !== "skip";
      });
      if (envelopes.length === 0) {
        // TODO: Log no-op
        return;
      }
      envelopes = filterUtil.filterMandatoryData({
        envelopes,
      });
      this.logSkips(
        envelopes.filter((envelope) => {
          return envelope.hullOperationResult === "skip";
        }),
      );
      envelopes = envelopes.filter((envelope) => {
        return envelope.hullOperationResult !== "skip";
      });
      if (envelopes.length === 0) {
        // TODO: Log no-op
        return;
      }

      // Now we are good to go
      const appSettings = this.diContainer.resolve<
        connector_v1.Schema$AppSettings
      >("hullAppSettings");
      const operationEnvelopes = mappingUtil.mapEnvelopesToServiceObjects(
        envelopes.filter((e) => e.serviceOperation !== "UPSERTREFS"),
      );
      const serviceClient = this.diContainer.resolve<ServiceClient>(
        "serviceClient",
      );

      const records: Record[] = [];

      operationEnvelopes.forEach((envelope) => {
        records.push(...(envelope.serviceObject as Record[]));
      });
      const createResult = await serviceClient.createRecords({
        objectType: appSettings.salesforce_customobject as string,
        records,
      });

      // Now we need to correlate the data for logging purposes
      console.log(createResult);
      if (createResult.data) {
        createResult.data.forEach((d, i) => {
          const opEnvelope = operationEnvelopes[i];
          if (d.success === false) {
            hullClient
              .asUser(opEnvelope.hullMessage.user)
              .logger.error(`outgoing.event.error`, {
                errors: d.errors,
              });
          } else {
            hullClient
              .asUser(opEnvelope.hullMessage.user)
              .logger.info(`outgoing.event.success`, {
                record_id: d.id,
                record: opEnvelope.serviceObject,
                operation: opEnvelope.serviceOperation,
              });
          }
          console.log(d);
        });
      } else if (createResult.success === false) {
        operationEnvelopes.forEach((opEnvelope) => {
          hullClient
            .asUser(opEnvelope.hullMessage.user)
            .logger.error(`outgoing.event.error`, {
              errors: createResult.error,
            });
        });
      }

      const updatedRefEnvelopes = envelopes.filter(
        (e) => e.serviceOperation === "UPSERTREFS",
      );
      if (updatedRefEnvelopes.length > 0) {
        let enrichedEnvelopes: connector_v1.Schema$OutgoingOperationEnvelope<
          hull_v1.Schema$MessageUserUpdate,
          unknown
        >[] = [];
        await asyncForEach(
          updatedRefEnvelopes,
          async (
            envelope: connector_v1.Schema$OutgoingOperationEnvelope<
              hull_v1.Schema$MessageUserUpdate,
              unknown
            >,
          ) => {
            const userEvents = await this.getAllMatchingUserEvents(
              envelope.hullMessage.user.id,
            );
            envelope.hullMessage.events = userEvents;
            enrichedEnvelopes.push(envelope);
          },
        );

        enrichedEnvelopes = filterUtil.filterMandatoryData({
          envelopes: enrichedEnvelopes,
        });
        this.logSkips(
          enrichedEnvelopes.filter((envelope) => {
            return envelope.hullOperationResult === "skip";
          }),
        );
        enrichedEnvelopes = enrichedEnvelopes.filter((envelope) => {
          return envelope.hullOperationResult !== "skip";
        });
        if (enrichedEnvelopes.length !== 0) {
          enrichedEnvelopes = mappingUtil.mapEnvelopesToServiceObjects(
            enrichedEnvelopes,
          );
          await asyncForEach(
            enrichedEnvelopes,
            async (
              opEnvelope: connector_v1.Schema$OutgoingOperationEnvelope<
                hull_v1.Schema$MessageUserUpdate,
                Record[]
              >,
            ) => {
              await this.handleHistoricalEvents(
                opEnvelope,
                appSettings,
                serviceClient,
                hullClient,
              );
            },
          );
        }
      }

      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_SENDUSERMESSAGES_SUCCESS",
          correlationKey,
        ),
      );
    } catch (error) {
      console.error(error);
      logger.error(
        loggingUtil.composeErrorMessage(
          "OPERATION_SENDUSERMESSAGES_UNHANDLED",
          cloneDeep(error),
          correlationKey,
        ),
      );
    }
  }

  private async handleBatchUsers(
    messages: hull_v1.Schema$MessageUserUpdate[],
  ): Promise<void> {
    const logger = this.diContainer.resolve<Logger>("logger");
    const loggingUtil = this.diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = this.diContainer.resolve<string>("correlationKey");

    try {
      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_SENDUSERMESSAGESBATCH_START",
          correlationKey,
        ),
      );

      if (this.isAuthenticated() === false) {
        // TODO: Log skip
        return;
      }
      const mappingUtil = this.diContainer.resolve<MappingUtil>("mappingUtil");
      const filterUtil = this.diContainer.resolve<FilterUtil>("filterUtil");
      const hullClient = this.diContainer.resolve<IHullClient>("hullClient");
      let envelopes = mappingUtil.mapMessagesToOutgoingEnvelopes({
        channel: "user:update",
        messages,
      });
      envelopes = filterUtil.filterSegments({
        envelopes,
        isBatch: true,
      });
      this.logSkips(
        envelopes.filter((envelope) => {
          return envelope.hullOperationResult === "skip";
        }),
      );
      envelopes = envelopes.filter((envelope) => {
        return envelope.hullOperationResult !== "skip";
      });
      if (envelopes.length === 0) {
        // TODO: Log no-op
        return;
      }
      const enrichedEnvelopes: connector_v1.Schema$OutgoingOperationEnvelope<
        hull_v1.Schema$MessageUserUpdate,
        unknown
      >[] = [];
      await asyncForEach(
        envelopes,
        async (
          envelope: connector_v1.Schema$OutgoingOperationEnvelope<
            hull_v1.Schema$MessageUserUpdate,
            unknown
          >,
        ) => {
          const userEvents = await this.getAllMatchingUserEvents(
            envelope.hullMessage.user.id,
          );
          envelope.hullMessage.events = userEvents;
          enrichedEnvelopes.push(envelope);
        },
      );

      envelopes = filterUtil.filterMandatoryData({
        envelopes: enrichedEnvelopes,
      });
      this.logSkips(
        envelopes.filter((envelope) => {
          return envelope.hullOperationResult === "skip";
        }),
      );
      envelopes = envelopes.filter((envelope) => {
        return envelope.hullOperationResult !== "skip";
      });
      if (envelopes.length === 0) {
        // TODO: Log no-op
        return;
      }

      // Now we are good to go
      const appSettings = this.diContainer.resolve<
        connector_v1.Schema$AppSettings
      >("hullAppSettings");
      const serviceClient = this.diContainer.resolve<ServiceClient>(
        "serviceClient",
      );
      const operationEnvelopes = mappingUtil.mapEnvelopesToServiceObjects(
        envelopes,
      );

      await asyncForEach(
        operationEnvelopes,
        async (
          opEnvelope: connector_v1.Schema$OutgoingOperationEnvelope<
            hull_v1.Schema$MessageUserUpdate,
            Record[]
          >,
        ) => {
          await this.handleHistoricalEvents(
            opEnvelope,
            appSettings,
            serviceClient,
            hullClient,
          );
        },
      );

      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_SENDUSERMESSAGES_SUCCESS",
          correlationKey,
        ),
      );
    } catch (error) {
      console.error(error);
      logger.error(
        loggingUtil.composeErrorMessage(
          "OPERATION_SENDUSERMESSAGES_UNHANDLED",
          cloneDeep(error),
          correlationKey,
        ),
      );
    }
  }

  private logSkips<THullMessage>(
    envelopes: connector_v1.Schema$OutgoingOperationEnvelope<
      THullMessage,
      unknown
    >[],
  ): void {
    const hullClient = this.diContainer.resolve<IHullClient>("hullClient");
    envelopes.forEach((envelope) => {
      const scopedClient =
        envelope.hullObjectType === "account"
          ? hullClient.asAccount((envelope.hullMessage as any).account)
          : hullClient.asUser((envelope.hullMessage as any).user);
      // Log skips right away
      scopedClient.logger.info(
        `outgoing.${envelope.hullObjectType}.${envelope.hullOperationResult}`,
        {
          reason: envelope.notes,
        },
      );
    });
  }

  private async getAllMatchingUserEvents(
    userId: string,
  ): Promise<hull_v1.Schema$UserEvent[]> {
    const appSettings = this.diContainer.resolve<
      connector_v1.Schema$AppSettings
    >("hullAppSettings");
    const hullUtil = this.diContainer.resolve<HullUtil>("hullUtil");

    let userEvents: hull_v1.Schema$UserEvent[] = [];

    try {
      let page = 0;
      const pageSize = 100;
      let total = 100;
      while (page * pageSize < total) {
        const result = await hullUtil.getPastEvents({
          eventNames: appSettings.hull_events,
          page,
          pageSize,
          sort: { created_at: "asc" },
          userId,
        });

        if (result.success === false) {
          throw result.errorDetails;
        }

        total = result.data!.pagination.total;
        userEvents.push(...(result.data!.data as hull_v1.Schema$UserEvent[]));
        page += 1;
      }
    } catch (error) {
      // TODO: Replace with proper logging
      console.error(error);
      userEvents = [];
    } finally {
      return userEvents;
    }
  }

  private async handleHistoricalEvents(
    opEnvelope: connector_v1.Schema$OutgoingOperationEnvelope<
      hull_v1.Schema$MessageUserUpdate,
      Record[]
    >,
    appSettings: connector_v1.Schema$AppSettings,
    serviceClient: ServiceClient,
    hullClient: IHullClient,
  ): Promise<void> {
    const queryParams = {};
    set(queryParams, appSettings.salesforce_customobject_id as string, {
      $in: compact(
        opEnvelope.serviceObject?.map((r) =>
          get(r, appSettings.salesforce_customobject_id as string, null),
        ),
      ),
    });
    const existingRecords = await serviceClient.queryRecords({
      objectType: appSettings.salesforce_customobject as string,
      query: queryParams,
    });

    if (existingRecords.success === false) {
      // TODO: Decide whether we should throw or not
      return;
    }

    const existingRecordIdentifiers = existingRecords.data!.map((r: Record) =>
      get(r, appSettings.salesforce_customobject_id as string, null),
    );

    const recordsToInsert: Record[] = [];
    const recordsToUpdate: Record[] = [];
    opEnvelope.serviceObject!.forEach((r: Record) => {
      if (
        existingRecordIdentifiers.includes(
          get(r, appSettings.salesforce_customobject_id as string, null),
        )
      ) {
        recordsToUpdate.push({
          Id: existingRecords.data!.find((re: Record) => {
            return (
              get(
                re,
                appSettings.salesforce_customobject_id as string,
                null,
              ) ===
              get(r, appSettings.salesforce_customobject_id as string, null)
            );
          }).Id,
          ...r,
        });
      } else {
        recordsToInsert.push(r);
      }
    });

    // Now let's create and update the stuff
    if (recordsToInsert.length > 0) {
      const createResult = await serviceClient.createRecords({
        objectType: appSettings.salesforce_customobject as string,
        records: recordsToInsert,
      });

      // Now we need to correlate the data for logging purposes
      console.log(createResult);
      if (createResult.data) {
        createResult.data.forEach((d, i) => {
          if (d.success === false) {
            hullClient
              .asUser(opEnvelope.hullMessage.user)
              .logger.error(`outgoing.event.error`, {
                errors: d.errors,
              });
          } else {
            hullClient
              .asUser(opEnvelope.hullMessage.user)
              .logger.info(`outgoing.event.success`, {
                record_id: d.id,
                record: opEnvelope.serviceObject,
                operation: "INSERT",
              });
          }
          console.log(d);
        });
      } else if (createResult.success === false) {
        hullClient
          .asUser(opEnvelope.hullMessage.user)
          .logger.error(`outgoing.event.error`, {
            errors: createResult.error,
          });
      }
    }

    if (recordsToUpdate.length > 0) {
      const updateResult = await serviceClient.updateRecords({
        objectType: appSettings.salesforce_customobject as string,
        records: recordsToUpdate,
      });

      // Now we need to correlate the data for logging purposes
      console.log(updateResult);
      if (updateResult.data) {
        updateResult.data.forEach((d, i) => {
          if (d.success === false) {
            hullClient
              .asUser(opEnvelope.hullMessage.user)
              .logger.error(`outgoing.event.error`, {
                errors: d.errors,
              });
          } else {
            hullClient
              .asUser(opEnvelope.hullMessage.user)
              .logger.info(`outgoing.event.success`, {
                record_id: d.id,
                record: opEnvelope.serviceObject,
                operation: "UPDATE",
              });
          }
          console.log(d);
        });
      } else if (updateResult.success === false) {
        hullClient
          .asUser(opEnvelope.hullMessage.user)
          .logger.error(`outgoing.event.error`, {
            errors: updateResult.error,
          });
      }
    }
  }
}
