// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { useLoaderData } from "react-router";
import { describe, expect, it } from "vitest";
import { sampleConfigs, sampleUsage } from "@/test/data-dir";
import { renderPage } from "@/test/render";
import Home from "./home";

type HomeProps = Parameters<typeof Home>[0];

function Page() {
  const loaderData = useLoaderData();
  return <Home {...({ loaderData } as HomeProps)} />;
}

describe("home page", () => {
  // @spec SHELL-HOME-001
  it("shows the routine cards above the usage table", async () => {
    renderPage(Page, () => ({
      usage: sampleUsage,
      categories: sampleConfigs.categories,
      routines: sampleConfigs.routines,
    }));
    const routineTitle = await screen.findByText("Morning Skincare");
    const table = screen.getByRole("table");
    expect(routineTitle.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
