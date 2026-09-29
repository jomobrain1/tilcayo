import { notFound, type TilcayoContext } from "@tilcayo/core";
import { Article } from "../models/Article.js";

type CreateArticleBody = {
  title: string;
  year?: number;
};

type UpdateArticleBody = Partial<CreateArticleBody>;

// Index controller
export const index = async (ctx: TilcayoContext) => {
  const articles = await Article.all();
  return ctx.response.success(articles, "Articles retrieved");
};

// Store controller
export const store = async (ctx: TilcayoContext<CreateArticleBody>) => {
  const record = await Article.create(ctx.body);
  return ctx.response.created(record, "Article created");
};

// Show controller
export const show = async (ctx: TilcayoContext) => {
  const record = await Article.findOrFail(ctx.params.id);
  return ctx.response.success(record, "Article retrieved");
};

// Update controller
export const update = async (ctx: TilcayoContext<UpdateArticleBody>) => {
  const record = await Article.update(ctx.params.id, ctx.body);
  if (!record) throw notFound("Article not found");
  return ctx.response.success(record, "Article updated");
};

// Destroy controller
export const destroy = async (ctx: TilcayoContext) => {
  const record = await Article.delete(ctx.params.id);
  if (!record) throw notFound("Article not found");
  return ctx.response.noContent();
};
