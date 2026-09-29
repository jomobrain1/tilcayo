import mongoose, { type InferSchemaType } from "mongoose";

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, minlength: 2 },
  author: { type: String, required: true, minlength: 2 },
  publishedYear: { type: Number },
}, { timestamps: true });

export type BookDocument = InferSchemaType<typeof bookSchema>;

export const Book = mongoose.modelNames().includes("Book")
  ? mongoose.model<BookDocument>("Book")
  : mongoose.model<BookDocument>("Book", bookSchema);
