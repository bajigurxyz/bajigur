import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNameAvailability } from "@/lib/useNameAvailability";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function Probe({ label }: { label: string }) {
  const state = useNameAvailability(label);
  return <output>{state.phase === "invalid" ? `invalid:${state.reason}` : state.phase}</output>;
}

const free = () => Response.json({ available: true });

describe("useNameAvailability", () => {
  it("says nothing about an empty box", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<Probe label="" />);

    expect(screen.getByRole("status").textContent).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a label the contract would reject, without asking the API", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<Probe label="ax" />);

    expect(screen.getByRole("status").textContent).toContain("invalid:");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("waits for typing to settle before asking", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(free());
    const { rerender } = render(<Probe label="axe" />);

    rerender(<Probe label="axel" />);
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    // One request for the label that was actually settled on, not one per key.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("label=axel");
  });

  it("ignores an answer about a label the user has moved past", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(free());
    const { rerender } = render(<Probe label="axel" />);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("free"));

    rerender(<Probe label="axelia" />);

    // The stale "free" must not be shown against the new label.
    expect(screen.getByRole("status").textContent).toBe("checking");
  });

  it("says so when claiming is not live rather than reporting a name free", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "not implemented" }, { status: 501 }),
    );
    render(<Probe label="axel" />);

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("unsupported"));
  });
});
