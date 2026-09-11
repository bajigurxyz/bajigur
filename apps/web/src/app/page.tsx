import { redirect } from "next/navigation";

/** The app has no marketing surface — that lives in apps/landingpage. */
export default function Home() {
  redirect("/prompts");
}
