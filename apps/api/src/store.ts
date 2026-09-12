import { SQL } from "bun";
import type { Prompt } from "./prompts";

export type Store = {
  all(): Promise<Prompt[]>;
  add(prompt: Prompt): Promise<void>;
  remove(id: string): Promise<void>;
};

type Row = {
  id: string;
  title: string;
  preview: string;
  body: string;
  tags: string;
  price_usd: string;
  price_hbar: string;
  preview_media: string | null;
  pay_to: string;
  creator: string | null;
  registry_id: number | null;
};

const toPrompt = (row: Row): Prompt => ({
  id: row.id,
  title: row.title,
  preview: row.preview,
  body: row.body,
  tags: JSON.parse(row.tags) as string[],
  priceUsd: row.price_usd,
  priceHbar: row.price_hbar,
  payTo: row.pay_to,
  ...(row.preview_media ? { previewMedia: row.preview_media } : {}),
  ...(row.creator ? { creator: row.creator } : {}),
  ...(row.registry_id ? { registryId: row.registry_id } : {}),
});

/// Published prompts. The seed catalogue stays in the bundle; everything a creator
/// publishes lives here, because the body is the product and it has to survive a deploy.
export function postgresStore(): Store | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("publishing disabled: set DATABASE_URL");
    return undefined;
  }
  const sql = new SQL(url);
  // ponytail: one table, created on first use. A migration tool when there is a second one.
  const ready = sql`
    create table if not exists prompts (
      id text primary key,
      title text not null,
      preview text not null,
      body text not null,
      tags text not null default '[]',
      price_usd text not null,
      price_hbar text not null,
      preview_media text,
      pay_to text not null,
      creator text,
      registry_id integer,
      created_at timestamptz not null default now()
    )`;

  return {
    async all() {
      await ready;
      const rows = (await sql`select * from prompts order by created_at`) as Row[];
      return rows.map(toPrompt);
    },
    async add(prompt) {
      await ready;
      await sql`
        insert into prompts (id, title, preview, body, tags, price_usd, price_hbar, preview_media, pay_to, creator, registry_id)
        values (${prompt.id}, ${prompt.title}, ${prompt.preview}, ${prompt.body},
                ${JSON.stringify(prompt.tags)}, ${prompt.priceUsd}, ${prompt.priceHbar},
                ${prompt.previewMedia ?? null}, ${prompt.payTo ?? ""}, ${prompt.creator ?? null},
                ${prompt.registryId ?? null})`;
    },
    async remove(id) {
      await ready;
      await sql`delete from prompts where id = ${id}`;
    },
  };
}
