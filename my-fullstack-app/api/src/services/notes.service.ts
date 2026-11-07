import { notFound } from "@tilcayo/core";
import type { z } from "zod";
import { Note } from "../models/Note.js";
import type { createNoteSchema } from "../validators/notes.validator.js";

type CreateNoteBody = z.output<typeof createNoteSchema>;
type UpdateNoteBody = Partial<CreateNoteBody>;

export type NoteRelation = never;

export interface NoteQueryOptions {
  populate?: NoteRelation[];
}

const toNoteData = (body: UpdateNoteBody) => ({
  ...body,

});

// Population is explicit and intended for application code, not HTTP query strings.
export const getNotes = async (options: NoteQueryOptions = {}) => Note.all(options);

export const getNoteById = async (id: string | string[], options: NoteQueryOptions = {}) => {
  const record = await Note.findOrFail(id);
  for (const relation of options.populate ?? []) await record.populate(relation);
  return record;
};

export const createNote = async (body: CreateNoteBody) => Note.create(toNoteData(body));

export const updateNote = async (id: string | string[], body: UpdateNoteBody) => {
  const record = await Note.update(id, toNoteData(body));
  if (!record) throw notFound("Note not found");
  return record;
};

export const deleteNote = async (id: string | string[]) => {
  const record = await Note.delete(id);
  if (!record) throw notFound("Note not found");
  return record;
};
