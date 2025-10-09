import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { MongoClient } from 'mongodb';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { AppUser } from 'src/database/schemas/user.schema';
const mongoUri = process.env.MONGO_URI ?? '';
export const mongoClient = new MongoClient(mongoUri);
// Optional: choose DB explicitly via MONGO_DB (otherwise URI's db is used)
export const db = mongoClient.db();

export const auth = betterAuth({
  basePath: '/api/auth',
  trustedOrigins: [process.env.CORS_ORIGIN ?? 'http://localhost:3000'],
  database: mongodbAdapter(db),
  user: {
    additionalFields: {
      isSuper: {
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
    },
  },

  // Email + password now
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  // Dev stub: print verification link to console
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      console.log(`[dev] [betterAuth] Verification for ${user.email}: ${url}`);
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (process.env.SUPER_USER_EMAIL == user.email.trim().toLowerCase()) {
            return {
              data: {
                ...user,
                isSuper: true,
              },
            };
          }
        },
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Adjust this path to match your sign-up route if different
      if (ctx.path !== '/sign-up/email') return;

      let email = ctx.body?.email as string | undefined;
      if (email) {
        email = email.trim().toLowerCase();
      }
      if (!email) {
        throw new APIError('BAD_REQUEST', { message: 'Email is required' });
      }

      const domain = email.split('@')[1]?.toLowerCase();
      const allowlist = (process.env.ALLOWED_EMAIL_DOMAINS ?? 'city.ac.uk')
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      const ok =
        !!domain &&
        allowlist.some((d) => domain === d || domain.endsWith(`.${d}`));
      if (!ok) {
        throw new APIError('BAD_REQUEST', {
          message: `Only institutional emails allowed (${allowlist.join(', ')})`,
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // This runs after any auth endpoint. Narrow it to the email sign-up endpoint:

      console.log('Creating an account in the local database');
      if (ctx.path !== '/sign-up/email') return;

      // After-hooks expose the newly created session here:
      const newSession = ctx.context.newSession;
      const user = newSession?.user; // Better Auth user
      if (!user) return;

      // Idempotent upsert of your app-side user document
      await AppUser.updateOne(
        { userId: user.id }, // link by BA user id
        {
          $setOnInsert: {
            userId: user.id,
            email: user.email,
            name: user.name ?? '',
            isSuper: user?.isSuper,
          },
        },
        { upsert: true },
      );
    }),
  },
});
