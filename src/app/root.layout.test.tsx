import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Layout, links } from "./root";

// Layout's document-level helpers need a running router; they are not under test here.
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  Meta: () => null,
  Links: () => null,
  Scripts: () => null,
  ScrollRestoration: () => null,
}));

// The shell's navigation header needs a router, as it has in the app.
function renderLayout() {
  return renderToString(
    <MemoryRouter>
      <Layout>
        <p id="page-content">page</p>
      </Layout>
    </MemoryRouter>,
  );
}

describe("root layout", () => {
  // @spec SHELL-UI-001
  it("loads the Inter font and wraps every page, including the error page, in the shell", () => {
    const fontLinks = links().filter((link) => "href" in link && String(link.href).includes("family=Inter"));
    expect(fontLinks).toHaveLength(1);

    // React Router renders Layout around both the route tree and the error boundary.
    const html = renderLayout();
    expect(html).toContain('id="page-content"');
    // The color-mode provider inside the shell injects its theme script.
    expect(html).toMatch(/<script[^>]*>[^<]*(classList|setAttribute)/);
  });

  // @spec SHELL-UI-004
  it("titles every page, including the error page, Beauty Tracker", () => {
    expect(renderLayout()).toContain("<title>Beauty Tracker</title>");
  });

  // @spec SHELL-UI-005
  it("gives every page, including the error page, the app's meta description", () => {
    expect(renderLayout()).toContain(
      '<meta name="description" content="Track beauty product usage, purchases, and inventory"/>',
    );
  });
});
