// Module augmentation so the enriched id/phone/role fields are typed on the
// session and on the user returned by `authorize`.
//
// The JWT interface is intentionally not augmented here: it is re-exported
// from `@auth/core/jwt`, which pnpm does not hoist, so `declare module
// "next-auth/jwt"` would create a separate interface rather than merge. The
// session callback asserts the token fields back to these types instead.

import type { DefaultSession } from "next-auth";

type Role = "USER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      phone: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    phone: string;
    role: Role;
  }
}
