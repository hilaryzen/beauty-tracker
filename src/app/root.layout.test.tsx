import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { meta as homeMeta } from "./routes/home";
import { Layout, links } from "./root";

// Layout's document-level helpers need a running router; they are not under test here.
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  Meta: () => null,
  Links: () => null,
  Scripts: () => null,
  ScrollRestoration: () => null,
}));

type MetaArgs = Parameters<typeof homeMeta>[0];

describe("root layout", () => {
  // @spec SHELL-UI-001
  it("loads the Inter font and wraps every page, including the error page, in the shell", () => {
    const fontLinks = links().filter((link) => "href" in link && String(link.href).includes("family=Inter"));
    expect(fontLinks).toHaveLength(1);

    // React Router renders Layout around both the route tree and the error boundary.
    const html = renderToString(
      <Layout>
        <p id="page-content">page</p>
      </Layout>,
    );
    expect(html).toContain('id="page-content"');
    // The color-mode provider inside the shell injects its theme script.
    expect(html).toMatch(/<script[^>]*>[^<]*(classList|setAttribute)/);
  });

  // @spec SHELL-UI-004
  it("titles every page, including the error page, Beauty Tracker", () => {
    const html = renderToString(
      <Layout>
        <p>page</p>
      </Layout>,
    );
    expect(html).toContain("<title>Beauty Tracker</title>");

    const titles = homeMeta({} as MetaArgs).filter((tag) => "title" in tag);
    expect(titles.every((tag) => (tag as { title: string }).title === "Beauty Tracker")).toBe(true);
  });
});
