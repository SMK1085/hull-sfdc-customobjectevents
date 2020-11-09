import { connector_v1 } from "./connector.v1";
import { ApiUtil } from "../utils/v1/api-util";
import { EventEmitter } from "events";
import {
  Connection,
  ConnectionOptions,
  Field,
  FileProperties,
  OAuth2,
  Record,
  RecordResult,
  UserInfo,
} from "jsforce";
import { salesforce_v49 } from "./salesforce.v49";
import { compact } from "lodash";

export class ServiceClient extends EventEmitter {
  public readonly appSettings: connector_v1.Schema$AppSettings;
  public readonly connection: Connection;

  /**
   * Initializes a new instance of ServiceClient with the given DI options.
   * @param options The dependency injection options
   */
  constructor(options: connector_v1.Schema$DiRegistrationOptions) {
    super();
    this.appSettings = options.hullAppSettings;
    const opts: ConnectionOptions = {
      accessToken: this.appSettings.auth_access_token,
      clientId: this.appSettings.auth_client_id,
      clientSecret: this.appSettings.auth_client_secret,
      logLevel: process.env.LOG_LEVEL,
      instanceUrl: this.appSettings.auth_instance_url,
      oauth2: {
        clientId: this.appSettings.auth_client_id,
        clientSecret: this.appSettings.auth_client_secret,
        redirectUri: options.oAuthRedirectUrl,
      },
      refreshToken: this.appSettings.auth_refresh_token,
      version: this.appSettings.service_api_version,
    };

    this.connection = new Connection(opts);
    this.connection.on("refresh", (accessToken: string, res: any) => {
      this.emit("refresh", accessToken, res);
    });
  }

  public async listCustomObjects(
    params: salesforce_v49.Params$ListCustomObjects,
  ): Promise<
    connector_v1.Schema$ApiResult<
      salesforce_v49.Params$ListCustomObjects,
      FileProperties[],
      Error
    >
  > {
    const url = `https://${this.appSettings.auth_instance_url}/services/Soap/c/v49.0/describeSObjects`;
    const method = "post";

    try {
      const result = await this.connection.metadata.list(params.queries);
      return ApiUtil.handleApiResultSuccess(url, method, params, result);
    } catch (error) {
      return ApiUtil.handleApiResultError(url, method, params, error);
    }
  }

  public async listFields(
    params: salesforce_v49.Params$ListFields,
  ): Promise<
    connector_v1.Schema$ApiResult<
      salesforce_v49.Params$ListFields,
      Field[],
      Error
    >
  > {
    const url = `https://${this.appSettings.auth_instance_url}/${this.appSettings.service_api_version}/sobjects/${params.objectType}/describe/`;
    const method = "get";

    try {
      const result = await this.connection.describe(params.objectType);
      return ApiUtil.handleApiResultSuccess(url, method, params, result.fields);
    } catch (error) {
      return ApiUtil.handleApiResultError(url, method, params, error);
    }
  }

  public async queryRecords(
    params: salesforce_v49.Params$QueryRecords,
  ): Promise<
    connector_v1.Schema$ApiResult<
      salesforce_v49.Params$QueryRecords,
      Record[],
      Error
    >
  > {
    const url = `https://${this.appSettings.auth_instance_url}/${this.appSettings.service_api_version}/sobjects/${params.objectType}/find/`;
    const method = "get";
    try {
      const result = await this.connection
        .sobject(params.objectType)
        .find(params.query);
      return ApiUtil.handleApiResultSuccess(url, method, params, result);
    } catch (error) {
      return ApiUtil.handleApiResultError(url, method, params, error);
    }
  }

  public async createRecords(
    params: salesforce_v49.Params$CreateRecords,
  ): Promise<
    connector_v1.Schema$ApiResult<
      salesforce_v49.Params$CreateRecords,
      RecordResult[],
      Error
    >
  > {
    const url = `https://${this.appSettings.auth_instance_url}/${this.appSettings.service_api_version}/sobjects/${params.objectType}/create/`;
    const method = "post";
    try {
      const result: RecordResult[] = (await this.connection
        .sobject(params.objectType)
        .create(params.records, { allOrNone: true })) as any;
      return ApiUtil.handleApiResultSuccess(url, method, params, result);
    } catch (error) {
      return ApiUtil.handleApiResultError(url, method, params, error);
    }
  }

  public async updateRecords(
    params: salesforce_v49.Params$UpdateRecords,
  ): Promise<
    connector_v1.Schema$ApiResult<
      salesforce_v49.Params$UpdateRecords,
      RecordResult[],
      Error
    >
  > {
    const url = `https://${this.appSettings.auth_instance_url}/${this.appSettings.service_api_version}/sobjects/${params.objectType}/update/`;
    const method = "put";
    try {
      const result: RecordResult[] = (await this.connection
        .sobject(params.objectType)
        .update(params.records, { allOrNone: true })) as any;
      return ApiUtil.handleApiResultSuccess(url, method, params, result);
    } catch (error) {
      return ApiUtil.handleApiResultError(url, method, params, error);
    }
  }

  public getAuthUri(redirectUri: string, state: string): string {
    const oauth = new OAuth2({
      clientId: this.appSettings.auth_client_id,
      clientSecret: this.appSettings.auth_client_secret,
      redirectUri: redirectUri,
    });
    const scope = compact((process.env.OAUTH_SCOPES as string).split(";")).join(
      " ",
    );

    return oauth.getAuthorizationUrl({
      scope,
      state,
    });
  }

  public async getTokenFromCode(
    code: string,
  ): Promise<salesforce_v49.Schema$TokenFromCodeResponse> {
    const userInfo = await this.connection.authorize(code);
    const result: salesforce_v49.Schema$TokenFromCodeResponse = {
      accessToken: this.connection.accessToken,
      instanceUrl: this.connection.instanceUrl,
      organizationId: userInfo.organizationId,
      refreshToken: this.connection.refreshToken as string,
      userId: userInfo.id,
    };

    return result;
  }
}
