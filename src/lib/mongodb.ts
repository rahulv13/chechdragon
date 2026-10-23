
import { MongoClient, ServerApiVersion } from 'mongodb';

// Ensure the build doesn't crash during static generation when MONGODB_URI is absent
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://dummy';

if (MONGODB_URI === 'mongodb://dummy' && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  console.warn('MONGODB_URI is not set. Using dummy URI for build step.');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(MONGODB_URI, {
      serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
      }
  });
  clientPromise = client.connect().catch(e => {
       console.warn("MongoDB connection failed, likely because of dummy URI during static build.", e.message);
       return client;
  });
}

export default clientPromise;
