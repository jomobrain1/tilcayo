import { defineRoutes } from "@tilcayo/core";
import * as MemberController from "../controllers/members.controller.js";
import { createMemberSchema, updateMemberSchema, memberIdSchema } from "../validators/members.validator.js";

export default defineRoutes((router) => {
  router.resource("/members", MemberController, {
    store: { validate: { body: createMemberSchema } },
    show: { validate: { params: memberIdSchema } },
    update: { validate: { params: memberIdSchema, body: updateMemberSchema } },
    destroy: { validate: { params: memberIdSchema } },
  });
});
