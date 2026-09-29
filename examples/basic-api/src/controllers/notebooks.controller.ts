import { notFound, type TilcayoContext } from "@tilcayo/core";
import { Notebook } from "../models/Notebook.js";

type CreateNotebookBody = {
  title: string;
  price: number;
  active: boolean;
};

type UpdateNotebookBody = Partial<CreateNotebookBody>;

// Index controller
export const index = async (ctx: TilcayoContext) => {
  const records = await Notebook.all();
  return ctx.response.success(records, "Notebooks retrieved");
};

// Store controller
export const store = async (ctx: TilcayoContext<CreateNotebookBody>) => {
  const record = await Notebook.create(ctx.body);
  return ctx.response.created(record, "Notebook created");
};

// Show controller
export const show = async (ctx: TilcayoContext) => {
  const record = await Notebook.findOrFail(ctx.params.id);
  return ctx.response.success(record, "Notebook retrieved");
};

// Update controller
export const update = async (ctx: TilcayoContext<UpdateNotebookBody>) => {
  const record = await Notebook.update(ctx.params.id, ctx.body);
  if (!record) throw notFound("Notebook not found");
  return ctx.response.success(record, "Notebook updated");
};

// Destroy controller
export const destroy = async (ctx: TilcayoContext) => {
  const record = await Notebook.delete(ctx.params.id);
  if (!record) throw notFound("Notebook not found");
  return ctx.response.noContent();
};
