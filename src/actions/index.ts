import { statusActionFactory } from "./status";
import { userUpdateHandlerFactory } from "./user-update";
import {
  oauthInitActionFactory,
  oauthCallbackActionFactory,
  oauthStatusActionFactory,
} from "./oauth";
import { metaActionFactory } from "./meta";

export default {
  status: statusActionFactory,
  userUpdate: userUpdateHandlerFactory,
  oauthInit: oauthInitActionFactory,
  oauthCallback: oauthCallbackActionFactory,
  oauthStatus: oauthStatusActionFactory,
  meta: metaActionFactory,
};
