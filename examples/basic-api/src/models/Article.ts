import mongoose from "mongoose";
import { mongoModel } from "@tilcayo/core";

const articleSchema = new mongoose.Schema(
  {
    title: { type: String },
    year: { type: Number },
  },
  { timestamps: true },
);

export const Article = mongoModel("Article", articleSchema);
