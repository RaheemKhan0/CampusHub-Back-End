import mongoose from 'mongoose';

import { connectDB } from '../../lib/connectMongodb';
import { ServerModel } from '../schemas/server.schema';
import { seedServers } from './seed-server-var';

async function seedServerCollection() {
  await connectDB();

  const operations = seedServers.map((seed) =>
    ServerModel.updateOne(
      { slug: seed.slug },
      {
        $setOnInsert: {
          createdAt: new Date(),
        },
        $set: {
          name: seed.name,
          slug: seed.slug,
          type: seed.type,
          icon: seed.icon ?? undefined,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    ),
  );

  const result = await Promise.all(operations);

  const upserts = result.reduce(
    (total, op) => total + (op.upsertedCount ?? 0),
    0,
  );
  const modified = result.reduce(
    (total, op) => total + (op.modifiedCount ?? 0),
    0,
  );

  console.log(`Seed complete: ${upserts} inserted, ${modified} updated.`);
}

async function main() {
  try {
    await seedServerCollection();
  } catch (error) {
    console.error('Seed failed:', (error as Error).message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

void main();
