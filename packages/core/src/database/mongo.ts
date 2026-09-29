import dns from "node:dns";
import mongoose, { type Connection } from "mongoose";
import type { MongoConnectOptions, MongoState } from "./types.js";

const configureDns = () => {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
};

export const connectMongo = async (
  uri: string,
  options: MongoConnectOptions = {},
): Promise<Connection> => {
  if (typeof uri !== "string" || !uri.trim()) {
    throw new Error("MongoDB connection URI is required");
  }
  configureDns();
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(uri, options);
  console.log("MongoDB connected");
  return mongoose.connection;
};

export const disconnectMongo = async (): Promise<void> => {
  await mongoose.disconnect();
};

export const getMongoState = (): MongoState => {
  switch (mongoose.connection.readyState) {
    case 0: return "disconnected";
    case 1: return "connected";
    case 2: return "connecting";
    case 3: return "disconnecting";
    default: return "unknown";
  }
};
