// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { system } from "@/components/ui/provider";
import { toaster } from "@/components/ui/toaster";
import { stubMatchMedia } from "@/test/render";
import { ErrorBoundary, Shell } from "./root";

type ErrorProps = Parameters<typeof ErrorBoundary>[0];

function renderError(error: unknown) {
  stubMatchMedia();
  render(
    <MemoryRouter>
      <Shell>
        <ErrorBoundary {...({ error } as ErrorProps)} />
      </Shell>
    </MemoryRouter>,
  );
}

function routeError(status: number, statusText: string) {
  // The shape React Router's isRouteErrorResponse recognizes.
  return { status, statusText, internal: false, data: null };
}

afterEach(() => {
  vi.unstubAllEnvs();
  document.documentElement.className = "";
});

describe("layout", () => {
  // @spec SHELL-UI-001
  it("uses Inter as the default body and heading font", () => {
    expect(system.token("fonts.body")).toMatch(/^Inter\b/);
    expect(system.token("fonts.heading")).toMatch(/^Inter\b/);
  });

  // @spec SHELL-UI-002
  it("follows the system color-scheme preference, including on the error page", async () => {
    stubMatchMedia(true);
    render(
      <MemoryRouter>
        <Shell>
          <ErrorBoundary {...({ error: routeError(404, "Not Found") } as ErrorProps)} />
        </Shell>
      </MemoryRouter>,
    );
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
  });

  // @spec SHELL-UI-003
  it("shows notifications at the bottom-right of the page", async () => {
    stubMatchMedia();
    render(
      <MemoryRouter>
        <Shell>
          <p>page</p>
        </Shell>
      </MemoryRouter>,
    );
    toaster.create({ title: "Hello from a feature" });
    const toast = await screen.findByText("Hello from a feature");
    expect(toast.closest("[data-placement]")).toHaveAttribute("data-placement", "bottom-end");
  });
});

describe("error page", () => {
  // @spec SHELL-ERR-001
  it("shows 404 and a not-found message for a 404 response", async () => {
    renderError(routeError(404, "Not Found"));
    expect(await screen.findByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByText("The requested page could not be found.")).toBeInTheDocument();
  });

  // @spec SHELL-ERR-002
  it("shows Error and the status text for other error responses", async () => {
    renderError(routeError(500, "Your data could not be loaded."));
    expect(await screen.findByRole("heading", { name: "Error" })).toBeInTheDocument();
    expect(screen.getByText("Your data could not be loaded.")).toBeInTheDocument();
  });

  // @spec SHELL-ERR-002
  it("falls back to a generic message when the response has no status text", async () => {
    renderError(routeError(500, ""));
    expect(await screen.findByRole("heading", { name: "Error" })).toBeInTheDocument();
    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();
  });

  // @spec SHELL-ERR-003
  it("shows the message and stack trace of an Error in development", async () => {
    vi.stubEnv("DEV", true);
    const error = new Error("rollover write failed");
    renderError(error);
    expect(await screen.findByRole("heading", { name: "Oops!" })).toBeInTheDocument();
    expect(screen.getByText("rollover write failed")).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === "CODE" && el.textContent === error.stack)).toBeInTheDocument();
  });

  // @spec SHELL-ERR-004
  it("shows a generic message for an Error in production or a non-Error value", async () => {
    vi.stubEnv("DEV", false);
    renderError(new Error("secret detail"));
    expect(await screen.findByRole("heading", { name: "Oops!" })).toBeInTheDocument();
    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();
    expect(screen.queryByText("secret detail")).not.toBeInTheDocument();
  });
});
