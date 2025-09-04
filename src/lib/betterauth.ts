import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { createAuthMiddleware, APIError } from "better-auth/api";

const mongoUri = process.env.MONGO_URI ?? "";
export const mongoClient = new MongoClient(mongoUri);
// Optional: choose DB explicitly via MONGO_DB (otherwise URI's db is used)
export const db = mongoClient.db(process.env.MONGO_DB || undefined);

const auth = betterAuth({
  basePath: "/api/auth",
  trustedOrigins: [process.env.CORS_ORIGIN ?? "http://localhost:3000"],
  database: mongodbAdapter(db),

  // Email + password now
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  // Dev stub: print verification link to console
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      console.log(`[dev] Verification for ${user.email}: ${url}`);
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Adjust this path to match your sign-up route if different
      if (ctx.path !== "/sign-up/email") return;

      const email = ctx.body?.email as string | undefined;
      if (!email) {
        throw new APIError("BAD_REQUEST", { message: "Email is required" });
      }

      const domain = email.split("@")[1]?.toLowerCase();
      const allowlist = (process.env.ALLOWED_EMAIL_DOMAINS ?? "city.ac.uk")
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      const ok = !!domain && allowlist.some((d) => domain === d || domain.endsWith(`.${d}`));
      if (!ok) {
        throw new APIError("BAD_REQUEST", {
          message: `Only institutional emails allowed (${allowlist.join(", ")})`,
        });
      }
    }),
  },
});
export type AuthType = typeof auth;
