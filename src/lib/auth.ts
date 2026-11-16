import NextAuth, { CredentialsSignin, type NextAuthConfig, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createHash } from "node:crypto";
import { UserRepository } from "../repository/user-repository";
import { LoginSchema, UserRole } from "../types/users";
import { verifyPassword } from "./password";
import { LOGIN_LIMIT, attemptKeys } from "../config/auth-limits";
import { clearFailures, recordFailure, secondsUntilAllowed } from "../services/attempt-limit";

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

/**
 * Thrown by authorize while an email is blocked after too many wrong
 * passwords; POST /api/auth/login turns it into a 429 with the wait.
 */
export class TooManyAttemptsError extends CredentialsSignin {
  code = "too_many_attempts";
  constructor(public retryAfterSeconds: number) {
    super();
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",

      /**
       * Called by NextAuth for every sign-in (our /api/auth/login and its own
       * callback URL alike). Validates credentials, enforces LOGIN_LIMIT per
       * email, verifies the password, and returns the user object that gets
       * baked into the JWT, or null on failure.
       */
      authorize: async (credentials) => {
        // 1. Validate input shape with Zod
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // 2. Too many wrong passwords for this email lately: refuse without checking
        const key = attemptKeys.login(parsed.data.email);
        const wait = await secondsUntilAllowed(key, LOGIN_LIMIT);
        if (wait > 0) throw new TooManyAttemptsError(wait);

        // 3. Verify the password (Argon2id). An unknown email takes as long and
        //    counts as a failure too, so neither reveals whether it exists.
        const user = await UserRepository.findByEmail(parsed.data.email);
        if (!(await verifyPassword(user?.password_hash, parsed.data.password)) || !user) {
          await recordFailure(key);
          return null;
        }
        await clearFailures(key);

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

  // A wrong password (or a blocked email) is an expected outcome, not a server error:
  // keep it out of the error log; everything else is logged as usual
  logger: {
    error(error) {
      if (error instanceof CredentialsSignin) return;
      console.error(error);
    },
  },

  pages: {
    signIn: "/auth/login", // Future frontend login page
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
