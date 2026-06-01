// Auth.js catch-all handler: sign-in, callback, session, CSRF, and sign-out
// endpoints are all served from here.

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
