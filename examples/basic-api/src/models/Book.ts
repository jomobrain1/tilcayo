import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book is required"],
      trim: true,
      minlength: 2,
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
      minlength: 2,
    },
    publishedYear: {
      type: Number,
    },
  },
  { timestamps: true },
);

export const Book = mongoose.model("Book", bookSchema);
