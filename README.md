# CampusHub-Back-End
Campus Hub Backend – Powered by NestJS + TypeScript, this API supports the Campus Hub platform with user auth, marketplace, events, Q&A, and AI features. Built on MongoDB Atlas with Vector Search, Socket.IO for realtime chat, and BullMQ for jobs. Secure, scalable, and deployed via GitHub Actions + Railway/Render.

See [Repository Guidelines](AGENTS.md) for contributor instructions, coding standards, and release expectations.

## Running Seed Scripts
1. Attach to the backend container shell:
   ```bash
   docker exec -it campus-api /bin/bash
   ```
   (If you renamed the service, replace `campus-api` with that container name. The frontend container is typically `campus-web`.)

2. Ensure environment variables are available inside the container (`MONGO_URI`, pool settings, etc.).

3. Run the TypeScript seed directly:
   ```bash
   node -r ts-node/register -r tsconfig-paths/register src/database/script/seed.ts
   ```
   Or, if you prefer to run the compiled output:
   ```bash
   npm run build
   node dist/database/script/seed.js
   ```

The seed script upserts the predefined server list from `src/database/script/seed-server-var.ts` so it can be re-run safely.
