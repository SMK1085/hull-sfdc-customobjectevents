import IHullClient from "../../types/hull-client";
import { connector_v1 } from "../../core/connector.v1";
import { ApiUtil } from "./api-util";
import axios, { AxiosError, AxiosRequestConfig } from "axios";

export class HullUtil {
  public readonly hull: IHullClient;
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly orgId: string;

  constructor(options: any) {
    this.hull = options.hullClient;
    this.appId = options.hullAppId;
    this.appSecret = options.hullAppSecret;
    this.orgId = options.hullAppOrganization;
  }

  public async processIncomingData(
    params: connector_v1.Schema$MapIncomingResult[],
  ): Promise<unknown> {
    const promises = params.map((param) => {
      return (this.hull[param.hullScope](param.ident as any) as any)[
        param.hullOperation
      ](...param.hullOperationParams);
    });

    return Promise.all(promises);
  }

  public async getPastEvents(
    params: connector_v1.Params$GetPastEvents,
  ): Promise<
    connector_v1.Schema$ApiResult<
      connector_v1.Params$GetPastEvents,
      connector_v1.Schema$GetPastEventsResponse,
      AxiosError
    >
  > {
    const url = `https://${this.orgId}/api/v1/entities-data/user/events`;
    const method = "post";
    const config: AxiosRequestConfig = {
      headers: {
        "Hull-App-Id": this.appId,
        "Hull-Access-Token": this.appSecret,
      },
    };

    try {
      const response = await axios.post(
        url,
        {
          page: params.page,
          per_page: params.pageSize,
          sort: params.sort,
          entity_ids: [params.userId],
          event_names: params.eventNames,
        },
        config,
      );
      return ApiUtil.handleApiResultSuccess(url, method, params, response.data);
    } catch (error) {
      return ApiUtil.handleApiResultError(url, method, params, error);
    }
  }
}
