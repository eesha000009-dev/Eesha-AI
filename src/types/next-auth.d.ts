import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** The user's unique ID from our `users` table */
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    /** The user's unique ID from our `users` table */
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** The user's unique ID from our `users` table */
    id?: string;
    /** Whether the user's email has been verified */
    emailVerified?: string | null;
  }
}
