import type { TilcayoContext } from "@tilcayo/core";
import { getNotes, getNoteById, createNote, updateNote, deleteNote } from "../services/notes.service.js";

type CreateNoteBody = {
  title: string;
  content?: string;
};

type UpdateNoteBody = Partial<CreateNoteBody>;

// Index controller
export const index = async (ctx: TilcayoContext) => {
  const records = await getNotes();
  return ctx.response.success(records, "Notes retrieved");
};

// Store controller
export const store = async (ctx: TilcayoContext<CreateNoteBody>) => {
  const record = await createNote(ctx.body);
  return ctx.response.created(record, "Note created");
};

// Show controller
export const show = async (ctx: TilcayoContext) => {
  const record = await getNoteById(ctx.params.id);
  return ctx.response.success(record, "Note retrieved");
};

// Update controller
export const update = async (ctx: TilcayoContext<UpdateNoteBody>) => {
  const record = await updateNote(ctx.params.id, ctx.body);
  return ctx.response.success(record, "Note updated");
};

// Destroy controller
export const destroy = async (ctx: TilcayoContext) => {
  await deleteNote(ctx.params.id);
  return ctx.response.noContent();
};
