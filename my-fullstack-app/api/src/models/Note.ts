import mongoose from "mongoose";
import { mongoModel } from "@tilcayo/core";

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String },
}, { timestamps: true });

export const Note = mongoModel("Note", noteSchema, { tenantScoped: true });
