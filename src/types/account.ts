import { HullAttribute } from "./common-types";

export interface IHullAccountClaims {
  id?: string | null;
  domain?: string | null;
  external_id?: string | null;
  anonymous_id?: string | null;
}

export default interface IHullAccount {
  id: string;
  domain?: string | null;
  external_id?: string | null;
  [propName: string]: HullAttribute;
}

export interface IHullAccountAttributes {
  [propName: string]: HullAttribute;
}
