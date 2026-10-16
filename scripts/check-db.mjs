import nextEnv from "@next/env";
import mongoose from "mongoose";

// Load the same development environment files as `next dev`.
nextEnv.loadEnvConfig(process.cwd(), true);

const timeout = setTimeout(() => {
  console.error("Database check timed out. Check DNS, network access, and Atlas availability.");
  process.exit(1);
}, 15000);

async function checkDatabase() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI is missing. Configure it in .env.local.");
      process.exitCode = 1;
      return;
    }

    console.log("Connecting to MongoDB (credentials are kept private)...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await mongoose.connection.db.admin().ping();
    console.log("MongoDB connection and ping succeeded. No records were changed.");
  } catch (error) {
    // Do not print the connection URI or unrestricted driver errors.
    if (error.syscall === "querySrv" || error.syscall === "queryTxt") {
      console.error("MongoDB DNS lookup failed. Check your network's DNS resolution.");
    } else if (error.code === 18 || error.codeName === "AuthenticationFailed") {
      console.error("MongoDB rejected authentication. Check the database credentials in .env.local.");
    } else {
      console.error("MongoDB connection failed. Check connectivity, Atlas Network Access, and database configuration.");
    }
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    clearTimeout(timeout);
  }
}

checkDatabase();
