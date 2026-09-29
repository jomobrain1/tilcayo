import type { ConnectOptions } from "mongoose";

export type MongoConnectOptions = ConnectOptions;
export type MongoState = "disconnected" | "connected" | "connecting" | "disconnecting" | "unknown";
