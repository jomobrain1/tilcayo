import mongoose from "mongoose";
import { mongoModel } from "@tilcayo/core";

const notebookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  active: { type: Boolean, required: true },
}, { timestamps: true });

export const Notebook = mongoModel("Notebook", notebookSchema);
