import NextAuth, { type NextAuthConfig, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import * as argon2 from "argon2";
import { createHash } from "node:crypto";
import { UserRepository } from "../repository/user-repository";
import { LoginSchema, UserRole } from "../types/users";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      clinic_id?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    clinic_id?: string | null;
    /** Fingerprint of the password hash at sign-in (see passwordStamp) */
    password_stamp?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    clinic_id?: string | null;
    password_stamp?: string;
  }
}

/**
 * A short fingerprint of the stored password hash. The session keeps it, so
 * changing a password (which changes the hash) signs out every session of
 * that user. The JWT is encrypted, and this is a hash of a hash.
 */
function passwordStamp(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}


export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",

      /**
       * Called by NextAuth when a user attempts to sign in.
       * Validates credentials, verifies password, returns the user object
       * that gets baked into the JWT — or null on failure.
       */
      authorize: async (credentials) => {
        // 1. Validate input shape with Zod
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // 2. Fetch user from DB via repository (only DB call in the auth flow)
        const user = await UserRepository.findByEmail(parsed.data.email);
        if (!user) return null;

        // 3. Verify password using Argon2id (memory-hard, OWASP recommended)
        const valid = await argon2.verify(user.password_hash, parsed.data.password);
        if (!valid) return null;

        // 4. Return the object that NextAuth will sign into the JWT
        return {
          id:        user.id,
          email:     user.email,
          name:      `${user.first_name} ${user.last_name}`,
          role:      user.role as UserRole,
          clinic_id: user.clinic_id,
          password_stamp: passwordStamp(user.password_hash),
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 hours; role, clinic and the user itself are re-checked on every request (jwt callback)
  },

  callbacks: {
    /**
     * At sign-in: store who the user is. On every later request: re-read the
     * user, so a role or clinic change applies on the next click, and a
     * deleted user or a changed password ends the session (null clears it).
     */
    async jwt({ token, user }) {
      if (user) {
        token.role           = user.role;
        token.clinic_id      = user.clinic_id;
        token.id             = user.id;
        token.password_stamp = user.password_stamp;
        return token;
      }
      if (!token.id) return null;

      let current;
      try {
        current = await UserRepository.findSessionState(token.id);
      } catch {
        // Database unreachable: keep the session; every API call fails anyway until it is back
        return token;
      }
      if (!current || passwordStamp(current.password_hash) !== token.password_stamp) return null;

      token.role      = current.role as UserRole;
      token.clinic_id = current.clinic_id;
      token.name      = `${current.first_name} ${current.last_name}`;
      token.email     = current.email;
      return token;
    },
    // Expose role + clinic_id + id on the session object readable in route handlers
    session({ session, token }) {
      if (session.user) {
        session.user.role      = token.role as UserRole;
        session.user.clinic_id = token.clinic_id;
        session.user.id        = token.id as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login", // Future frontend login page
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
