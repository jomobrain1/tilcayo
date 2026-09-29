import { notFound, type TilcayoContext } from "@tilcayo/core";
import { Book } from "../models/Book.js";

type CreateBookBody = {
  title: string;
  author: string;
  publishedYear?: number;
};

type UpdateBookBody = Partial<CreateBookBody>;

// Index controller
export const index = async (ctx: TilcayoContext) => {
  const books = await Book.all();
  return ctx.response.success(books, "Books retrieved");
};

// Show controller
export const show = async (ctx: TilcayoContext) => {
  const book = await Book.findOrFail(ctx.params.id);

  return ctx.response.success(book, "Book retrieved");
};

// Store controller
export const store = async (ctx: TilcayoContext<CreateBookBody>) => {
  const book = await Book.create(ctx.body);
  return ctx.response.created(book, "Book created");
};

// Update controller
export const update = async (ctx: TilcayoContext<UpdateBookBody>) => {
  const book = await Book.update(ctx.params.id, ctx.body);
  if (!book) throw notFound("Book not found");
  return ctx.response.success(book, "Book updated");
};

// Destroy controller
export const destroy = async (ctx: TilcayoContext) => {
  const book = await Book.delete(ctx.params.id);
  if (!book) throw notFound("Book not found");
  return ctx.response.noContent();
};
