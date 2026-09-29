import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  age: { type: Number },
}, { timestamps: true });

export const Member = mongoose.model("Member", memberSchema);
