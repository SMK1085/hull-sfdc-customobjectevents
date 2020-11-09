import { CachingUtil } from "../../src/utils/v1/caching-util";
import { connector_v1 } from "../../src/core/connector.v1";
import { internet, random } from "faker";

describe("CachingUtil", () => {
  describe("constructor()", () => {
    it("should initialize redisClient and logger", () => {
      const options = {
        redisClient: jest.fn().mockImplementation(() => {
          return {
            set: jest.fn().mockResolvedValue("saved"),
            hmSet: jest.fn().mockResolvedValue("saved"),
            get: jest.fn().mockResolvedValue(undefined),
            getAll: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(0),
            delHash: jest.fn().mockResolvedValue(0),
            quit: jest.fn().mockReturnValue(() => Promise.resolve()),
            end: jest.fn(),
          };
        }),
        logger: console,
        loggingUtil: {
          composeOperationalMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "operational",
            code: "OPS-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
          composeErrorMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "error",
            code: "ERR-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
        },
      };

      const util = new CachingUtil(options);
      expect(util.logger).toBeDefined();
      expect(util.redisClient).toEqual(options.redisClient);
    });
  });

  describe("getCachedApiResponse()", () => {
    it("should return the cached result if present and not call the API", async () => {
      const expected: connector_v1.Schema$ApiResult<unknown, any, Error> = {
        data: {
          test: true,
        },
        endpoint: internet.url(),
        method: "get",
        payload: undefined,
        success: true,
      };

      const debugMock = jest.fn();
      const errorMock = jest.fn();
      const apiFnMock = jest.fn().mockResolvedValue(expected);

      const options = {
        redisClient: {
          set: jest.fn().mockResolvedValue("saved"),
          hmSet: jest.fn().mockResolvedValue("saved"),
          get: jest.fn().mockResolvedValue(expected),
          getAll: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(0),
          delHash: jest.fn().mockResolvedValue(0),
          quit: jest.fn().mockReturnValue(() => Promise.resolve()),
          end: jest.fn(),
        },
        logger: {
          debug: debugMock,
          error: errorMock,
        },
        loggingUtil: {
          composeOperationalMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "operational",
            code: "OPS-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
          composeErrorMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "error",
            code: "ERR-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
        },
      };

      const cacheKey = "test";
      const expires = 600;

      const util = new CachingUtil(options);
      const actual = await util.getCachedApiResponse(
        cacheKey,
        apiFnMock,
        expires,
      );

      expect(actual).toEqual(expected);
      expect(debugMock.mock.calls).toHaveLength(2);
      expect(errorMock.mock.calls).toHaveLength(0);
      expect(apiFnMock).not.toHaveBeenCalled();
    });

    it("should call the API when no cached result is present and store the successful result in the cache", async () => {
      const expected: connector_v1.Schema$ApiResult<unknown, any, Error> = {
        data: {
          test: true,
        },
        endpoint: internet.url(),
        method: "get",
        payload: undefined,
        success: true,
      };

      const debugMock = jest.fn();
      const errorMock = jest.fn();
      const apiFnMock = jest.fn().mockResolvedValue(expected);
      const redisSetMock = jest.fn().mockResolvedValue("saved");

      const options = {
        redisClient: {
          set: redisSetMock,
          hmSet: jest.fn().mockResolvedValue("saved"),
          get: jest.fn().mockResolvedValue(undefined),
          getAll: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(0),
          delHash: jest.fn().mockResolvedValue(0),
          quit: jest.fn().mockReturnValue(() => Promise.resolve()),
          end: jest.fn(),
        },
        logger: {
          debug: debugMock,
          error: errorMock,
        },
        loggingUtil: {
          composeOperationalMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "operational",
            code: "OPS-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
          composeErrorMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "error",
            code: "ERR-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
        },
      };

      const cacheKey = "test";
      const expires = 600;

      const util = new CachingUtil(options);
      const actual = await util.getCachedApiResponse(
        cacheKey,
        apiFnMock,
        expires,
      );

      expect(actual).toEqual(expected);
      expect(debugMock.mock.calls).toHaveLength(4);
      expect(errorMock.mock.calls).toHaveLength(0);
      expect(apiFnMock).toHaveBeenCalledTimes(1);
      expect(redisSetMock).toHaveBeenCalledTimes(1);
    });

    it("should call the API when no cached result is present and don't store an unsuccessful result in the cache", async () => {
      const expected: connector_v1.Schema$ApiResult<unknown, any, Error> = {
        data: undefined,
        endpoint: internet.url(),
        method: "get",
        payload: undefined,
        success: false,
        error: ["Request failed with status code 401"],
      };

      const debugMock = jest.fn();
      const errorMock = jest.fn();
      const apiFnMock = jest.fn().mockResolvedValue(expected);
      const redisSetMock = jest.fn().mockResolvedValue("saved");

      const options = {
        redisClient: {
          set: redisSetMock,
          hmSet: jest.fn().mockResolvedValue("saved"),
          get: jest.fn().mockResolvedValue(undefined),
          getAll: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(0),
          delHash: jest.fn().mockResolvedValue(0),
          quit: jest.fn().mockReturnValue(() => Promise.resolve()),
          end: jest.fn(),
        },
        logger: {
          debug: debugMock,
          error: errorMock,
        },
        loggingUtil: {
          composeOperationalMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "operational",
            code: "OPS-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
          composeErrorMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "error",
            code: "ERR-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
        },
      };

      const cacheKey = "test";
      const expires = 600;

      const util = new CachingUtil(options);
      const actual = await util.getCachedApiResponse(
        cacheKey,
        apiFnMock,
        expires,
      );

      expect(actual).toEqual(expected);
      expect(debugMock.mock.calls).toHaveLength(2);
      expect(errorMock.mock.calls).toHaveLength(1);
      expect(apiFnMock).toHaveBeenCalledTimes(1);
      expect(redisSetMock).not.toHaveBeenCalled();
    });

    it("should call the API when retrieving cached results fails and store a successful result in the cache", async () => {
      const expected: connector_v1.Schema$ApiResult<unknown, any, Error> = {
        data: {
          test: true,
        },
        endpoint: internet.url(),
        method: "get",
        payload: undefined,
        success: true,
      };

      const debugMock = jest.fn();
      const errorMock = jest.fn();
      const apiFnMock = jest.fn().mockResolvedValue(expected);
      const redisSetMock = jest.fn().mockResolvedValue("saved");

      const options = {
        redisClient: {
          set: redisSetMock,
          hmSet: jest.fn().mockResolvedValue("saved"),
          get: jest.fn().mockRejectedValue("Access rejected"),
          getAll: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(0),
          delHash: jest.fn().mockResolvedValue(0),
          quit: jest.fn().mockReturnValue(() => Promise.resolve()),
          end: jest.fn(),
        },
        logger: {
          debug: debugMock,
          error: errorMock,
        },
        loggingUtil: {
          composeOperationalMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "operational",
            code: "OPS-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
          composeErrorMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "error",
            code: "ERR-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
        },
      };

      const cacheKey = "test";
      const expires = 600;

      const util = new CachingUtil(options);
      const actual = await util.getCachedApiResponse(
        cacheKey,
        apiFnMock,
        expires,
      );

      expect(actual).toEqual(expected);
      expect(debugMock.mock.calls).toHaveLength(4);
      expect(errorMock.mock.calls).toHaveLength(1);
      expect(apiFnMock).toHaveBeenCalledTimes(1);
      expect(redisSetMock).toHaveBeenCalledTimes(1);
    });

    it("should call the API when no cached result is present and return the result even when storing the successful result in the cache fails", async () => {
      const expected: connector_v1.Schema$ApiResult<unknown, any, Error> = {
        data: {
          test: true,
        },
        endpoint: internet.url(),
        method: "get",
        payload: undefined,
        success: true,
      };

      const debugMock = jest.fn();
      const errorMock = jest.fn();
      const apiFnMock = jest.fn().mockResolvedValue(expected);
      const redisSetMock = jest.fn().mockRejectedValue("Access denied");

      const options = {
        redisClient: {
          set: redisSetMock,
          hmSet: jest.fn().mockResolvedValue("saved"),
          get: jest.fn().mockResolvedValue(undefined),
          getAll: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(0),
          delHash: jest.fn().mockResolvedValue(0),
          quit: jest.fn().mockReturnValue(() => Promise.resolve()),
          end: jest.fn(),
        },
        logger: {
          debug: debugMock,
          error: errorMock,
        },
        loggingUtil: {
          composeOperationalMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "operational",
            code: "OPS-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
          composeErrorMessage: jest.fn().mockReturnValue({
            appId: random.uuid(),
            channel: "error",
            code: "ERR-00-000",
            component: "unknown",
            tenantId: random.uuid(),
            message: "Test message",
            correlationKey: random.uuid(),
          }),
        },
      };

      const cacheKey = "test";
      const expires = 600;

      const util = new CachingUtil(options);
      const actual = await util.getCachedApiResponse(
        cacheKey,
        apiFnMock,
        expires,
      );

      expect(actual).toEqual(expected);
      expect(debugMock.mock.calls).toHaveLength(3);
      expect(errorMock.mock.calls).toHaveLength(1);
      expect(apiFnMock).toHaveBeenCalledTimes(1);
      expect(redisSetMock).toHaveBeenCalledTimes(1);
    });
  });
});
