import AuthorizePanel from "@/components/AuthorizePanel";

export const metadata = {
  title: "Authorize | Bajigur",
  description: "Let an MCP client buy prompts from your Bajigur wallet.",
};

/**
 * The browser half of the OAuth flow. An MCP client sends the user here, they
 * sign in with Privy, and we hand the client a code.
 */
export default async function AuthorizePage({ searchParams }: PageProps<"/oauth/authorize">) {
  const params = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  return (
    <AuthorizePanel
      clientId={one(params.client_id) ?? ""}
      redirectUri={one(params.redirect_uri) ?? ""}
      codeChallenge={one(params.code_challenge) ?? ""}
      codeChallengeMethod={one(params.code_challenge_method) ?? ""}
      state={one(params.state)}
    />
  );
}
