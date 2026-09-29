import { notFound, type TilcayoContext } from "@tilcayo/core";
import type * as z from "zod";
import { Book } from "../models/Book.js";
import type { createBookSchema, updateBookSchema } from "../validators/books.validator.js";

// Index controller
export const index = async (ctx: TilcayoContext) => {
  const books = await Book.find();
  return ctx.response.success(books, "Books retrieved");
};

// Show controller
export const show = async (ctx: TilcayoContext) => {
  const book = await Book.findById(ctx.params.id);

  if (!book) {
    throw notFound("Book not found");
  }

  return ctx.response.success(book, "Book retrieved");
};

// Store controller
export const store = async (ctx: TilcayoContext) => {
  const book = await Book.create(ctx.body as z.infer<typeof createBookSchema>);
  return ctx.response.created(book, "Book created");
};

// Update controller
export const update = async (ctx: TilcayoContext) => {
  const book = await Book.findByIdAndUpdate(
    ctx.params.id,
    { $set: ctx.body as z.infer<typeof updateBookSchema> },
    { returnDocument: "after", runValidators: true },
  );
  if (!book) throw notFound("Book not found");
  return ctx.response.success(book, "Book updated");
};

// Destroy controller
export const destroy = async (ctx: TilcayoContext) => {
  const book = await Book.findByIdAndDelete(ctx.params.id);
  if (!book) throw notFound("Book not found");
  return ctx.response.noContent();
};
