import { find, isNil } from "lodash";
import { connector_v1 } from "../../core/connector.v1";
import opsDefinitions from "../../../assets/logging/operational.json";
import errorDefinitions from "../../../assets/logging/exceptions.json";
import metricDefinitions from "../../../assets/logging/metrics.json";

export class LoggingUtil {
  private readonly appId: string;
  private readonly tenantId: string;

  constructor(options: any) {
    this.appId = options.hullAppId;
    this.tenantId = options.hullAppOrganization;
  }

  public composeOperationalMessage(
    id: string,
    correlationKey?: string,
    message?: string,
  ): connector_v1.Schema$LogPayload | undefined {
    let def = find(opsDefinitions, { id });

    if (isNil(def) && !isNil(message)) {
      def = {
        id: "UNKNOWN",
        code: "OPS-00-000",
        component: "unknown",
        message,
      };
    } else if (isNil(def)) {
      return undefined;
    }

    const log: connector_v1.Schema$LogPayload = {
      appId: this.appId,
      channel: "operational",
      code: `OPS-${def.code}`,
      component: def.component,
      tenantId: this.tenantId,
      message: message ? message : def.message,
      correlationKey,
    };

    return log;
  }

  public static composeOperationalMessageGlobal(
    id: string,
    correlationKey?: string,
    message?: string,
  ): connector_v1.Schema$LogPayload | undefined {
    let def = find(opsDefinitions, { id });

    if (isNil(def) && !isNil(message)) {
      def = {
        id: "UNKNOWN",
        code: "OPS-00-000",
        component: "unknown",
        message,
      };
    } else if (isNil(def)) {
      return undefined;
    }

    const log: connector_v1.Schema$LogPayload = {
      appId: "global",
      channel: "operational",
      code: `OPS-${def.code}`,
      component: def.component,
      tenantId: "global",
      message: message ? message : def.message,
      correlationKey,
    };

    return log;
  }

  public composeErrorMessage(
    id: string,
    errorDetails: any,
    correlationKey?: string,
    message?: string,
  ): connector_v1.Schema$LogPayload | undefined {
    let def = find(errorDefinitions, { id });

    if (isNil(def) && !isNil(message)) {
      def = {
        id: "UNKNOWN",
        code: "ERR-00-000",
        component: "unknown",
        message,
      };
    } else if (isNil(def)) {
      return undefined;
    }

    const log: connector_v1.Schema$LogPayload = {
      appId: this.appId,
      channel: "error",
      code: `ERR-${def.code}`,
      component: def.component,
      tenantId: this.tenantId,
      message: message ? message : def.message,
      correlationKey,
      errorDetails,
    };

    return log;
  }

  public static composeErrorMessageGlobal(
    id: string,
    errorDetails: any,
    correlationKey?: string,
    message?: string,
  ): connector_v1.Schema$LogPayload | undefined {
    let def = find(errorDefinitions, { id });

    if (isNil(def) && !isNil(message)) {
      def = {
        id: "UNKNOWN",
        code: "ERR-00-000",
        component: "unknown",
        message,
      };
    } else if (isNil(def)) {
      return undefined;
    }

    const log: connector_v1.Schema$LogPayload = {
      appId: "global",
      channel: "error",
      code: `ERR-${def.code}`,
      component: def.component,
      tenantId: "global",
      message: message ? message : def.message,
      correlationKey,
      errorDetails,
    };

    return log;
  }

  public composeMetricMessage(
    id: string,
    correlationKey?: string,
    metricValue: number = 1,
  ): connector_v1.Schema$LogPayload | undefined {
    let def = find(metricDefinitions, { id });
    if (isNil(def)) {
      return undefined;
    }

    const log: connector_v1.Schema$LogPayload = {
      appId: this.appId,
      channel: "metric",
      code: `MET-${def.code}`,
      component: def.component,
      tenantId: this.tenantId,
      correlationKey,
      metricKey: def.metricKey,
      metricValue,
      message: `Captured metric '${def.metricKey}' with value of '${metricValue}'`,
    };

    return log;
  }

  public static composeMetricMessageGlobal(
    id: string,
    correlationKey?: string,
    metricValue: number = 1,
  ): connector_v1.Schema$LogPayload | undefined {
    let def = find(metricDefinitions, { id });
    if (isNil(def)) {
      return undefined;
    }

    const log: connector_v1.Schema$LogPayload = {
      appId: "global",
      channel: "metric",
      code: `MET-${def.code}`,
      component: def.component,
      tenantId: "global",
      correlationKey,
      metricKey: def.metricKey,
      metricValue,
      message: `Captured metric '${def.metricKey}' with value of '${metricValue}'`,
    };

    return log;
  }
}
