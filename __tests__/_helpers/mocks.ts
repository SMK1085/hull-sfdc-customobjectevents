/* eslint-disable max-classes-per-file, @typescript-eslint/no-explicit-any, no-console */
import IHullClient from "../../src/types/hull-client";
import { connector_v1 } from "../../src/core/connector.v1";

const ClientMock: any = jest.fn<IHullClient, []>(() => ({
  configuration: {},
  api: jest.fn(() => Promise.resolve()),
  asAccount: jest.fn().mockReturnThis(),
  asUser: jest.fn().mockReturnThis(),
  del: jest.fn(() => Promise.resolve()),
  get: jest.fn(() => Promise.resolve()),
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    silly: jest.fn(),
    verbose: jest.fn(),
  },
  post: jest.fn(() => Promise.resolve()),
  put: jest.fn(() => Promise.resolve()),
  utils: {},
  traits: jest.fn(() => Promise.resolve()),
  track: jest.fn(() => Promise.resolve()),
}));

class ConnectorMock {
  constructor(
    id: string,
    settings: any,
    privateSettings: connector_v1.Schema$AppSettings,
  ) {
    this.id = id;
    this.settings = settings;
    this.private_settings = privateSettings;
  }

  public id: string;

  public settings: any;

  public private_settings: connector_v1.Schema$AppSettings;
}

class ContextMock {
  constructor(
    id: string,
    settings: any,
    privateSettings: connector_v1.Schema$AppSettings,
  ) {
    this.ship = new ConnectorMock(id, settings, privateSettings);
    this.connector = new ConnectorMock(id, settings, privateSettings);
    this.client = new ClientMock();
    this.metric = {
      increment: jest.fn((name, value) => console.log(name, value)),
      value: jest.fn((name, value) => console.log(name, value)),
    };
  }

  // Public properties
  public ship: any;

  public connector: any;

  public client: IHullClient;

  public metric: any;
}

export { ClientMock, ConnectorMock, ContextMock };

/* eslint-enable max-classes-per-file, @typescript-eslint/no-explicit-any, no-console */
