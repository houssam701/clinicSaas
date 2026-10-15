import NextAuth, { type NextAuthConfig, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import * as argon2 from "argon2";
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
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    clinic_id?: string | null;
  }
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
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 hours — keeps role/clinic_id reasonably fresh
  },

  callbacks: {
    // Persist role + clinic_id into the JWT at sign-in
    jwt({ token, user }) {
      if (user) {
        token.role      = user.role;
        token.clinic_id = user.clinic_id;
        token.id        = user.id;
      }
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
