import { notFound, type TilcayoContext } from "@tilcayo/core";

const books = [
  { id: "1", title: "Grit", author: "Angela Duckworth" },
  { id: "2", title: "Mindset", author: "Carol Dweck" },
];

// Get books controller
export const getBooks = async (ctx: TilcayoContext) => {
  return ctx.response.success(books, "Books retrieved");
};

// Get book controller
export const getBook = async (ctx: TilcayoContext) => {
  const book = books.find((item) => item.id === ctx.params.id);

  if (!book) {
    throw notFound("Book not found");
  }

  return ctx.response.success(book, "Book retrieved");
};

// Create book controller
export const createBook = async (ctx: TilcayoContext) => {
  return ctx.response.created(ctx.body, "Book created");
};

// Update book controller
export const updateBook = async (ctx: TilcayoContext) => {
  return ctx.response.success(
    { id: ctx.params.id, body: ctx.body },
    "Book updated",
  );
};

// Delete book controller
export const deleteBook = async (ctx: TilcayoContext) => {
  return ctx.response.noContent();
};
