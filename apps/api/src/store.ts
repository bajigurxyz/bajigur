import { SQL } from "bun";
import type { Prompt } from "./prompts";

export type FeedbackRow = {
  id: string;
  creator: string;
  agentId: number;
  promptId: string;
  buyerAccount: string;
  buyerName?: string;
  value: number;
  comment?: string;
  transactionId: string;
  at: string;
};

export type Store = {
  all(): Promise<Prompt[]>;
  add(prompt: Prompt): Promise<void>;
  remove(id: string): Promise<void>;
  addFeedback(row: FeedbackRow): Promise<void>;
  feedbackFor(creator: string): Promise<FeedbackRow[]>;
  feedback(id: string): Promise<FeedbackRow | undefined>;
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
    )`.then(
    () => sql`
    create table if not exists feedback (
      id text primary key,
      creator text not null,
      agent_id integer not null,
      prompt_id text not null,
      buyer_account text not null,
      buyer_name text,
      value integer not null,
      comment text,
      transaction_id text not null,
      created_at timestamptz not null default now()
    )`,
  );

  const toFeedback = (r: Record<string, unknown>): FeedbackRow => ({
    id: String(r.id),
    creator: String(r.creator),
    agentId: Number(r.agent_id),
    promptId: String(r.prompt_id),
    buyerAccount: String(r.buyer_account),
    ...(r.buyer_name ? { buyerName: String(r.buyer_name) } : {}),
    value: Number(r.value),
    ...(r.comment ? { comment: String(r.comment) } : {}),
    transactionId: String(r.transaction_id),
    at: new Date(r.created_at as string).toISOString(),
  });

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
    // The onchain feedback carries a URI and a hash; this is the text behind them.
    async addFeedback(row) {
      await ready;
      await sql`
        insert into feedback (id, creator, agent_id, prompt_id, buyer_account, buyer_name, value, comment, transaction_id)
        values (${row.id}, ${row.creator}, ${row.agentId}, ${row.promptId}, ${row.buyerAccount},
                ${row.buyerName ?? null}, ${row.value}, ${row.comment ?? null}, ${row.transactionId})`;
    },
    async feedbackFor(creator) {
      await ready;
      const rows = (await sql`
        select * from feedback where creator = ${creator} order by created_at desc`) as Record<
        string,
        unknown
      >[];
      return rows.map(toFeedback);
    },
    async feedback(id) {
      await ready;
      const rows = (await sql`select * from feedback where id = ${id}`) as Record<
        string,
        unknown
      >[];
      return rows[0] ? toFeedback(rows[0]) : undefined;
    },
  };
}
