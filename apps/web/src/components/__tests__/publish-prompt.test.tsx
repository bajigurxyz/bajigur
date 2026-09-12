import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublishPrompt from "../PublishPrompt";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * The form checks this browser holds an agent token before it posts, because
 * the token is a cookie and a wallet set up elsewhere arrives without one.
 * Answering that check is what lets these tests reach the publish call.
 */
const linked = (publish: Response) => (input: string | URL | Request) =>
  Promise.resolve(String(input).includes("/api/agent/me") ? new Response("{}") : publish);

/** Opens the form and fills everything the API requires. */
function fill(overrides: Partial<Record<string, string>> = {}) {
  render(<PublishPrompt onPublished={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: /Publish a prompt/ }));

  const values: Record<string, string> = {
    Title: "A test prompt",
    "Preview, shown before anyone pays":
      "A preview long enough to pass the twenty character floor.",
    "The prompt itself":
      "A body long enough to clear the fifty character minimum the API enforces.",
    Tags: "landing, hero",
    "Price in USDC": "0.20",
    "Price in HBAR": "2",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { value } });
  }
}

describe("PublishPrompt", () => {
  it("asks for both prices rather than converting one into the other", () => {
    render(<PublishPrompt onPublished={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Publish a prompt/ }));

    // The 402 offers both assets and the buyer picks, so the creator prices both.
    expect(screen.getByLabelText(/Price in USDC/)).toBeTruthy();
    expect(screen.getByLabelText(/Price in HBAR/)).toBeTruthy();
  });

  it("sends tags as an array the API will accept", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(linked(Response.json({ id: "a-test-prompt" }, { status: 201 })) as never);
    fill();

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    const publish = async () =>
      fetchMock.mock.calls.find((call) => String(call[0]).endsWith("/api/prompts"));
    await waitFor(async () => expect(await publish()).toBeTruthy());
    const body = JSON.parse(String((await publish())?.[1]?.body));
    expect(body.tags).toEqual(["landing", "hero"]);
    // Strings, never numbers: 0.1 USDC is not representable in binary and a
    // payment one atomic unit off is refused.
    expect(body.priceUsd).toBe("0.20");
    expect(body.priceHbar).toBe("2");
  });

  it("refuses a tag the API would reject, without a round trip", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fill({ Tags: "Landing Page!" });

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the API's own refusal rather than inventing one", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      linked(
        Response.json(
          { error: "previewMedia must be a .webp, .gif, .png, .jpg, .mp4 or .webm file" },
          { status: 400 },
        ),
      ) as never,
    );
    fill();

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "previewMedia must be a .webp, .gif, .png, .jpg, .mp4 or .webm file",
    );
  });
});
