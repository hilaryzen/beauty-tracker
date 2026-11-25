// Reads the CSS that Chakra (through Emotion) generated for an element, so tests
// can check responsive styles that jsdom cannot lay out.

const lgQuery = "@media screen and (min-width: 64rem)";

export type ResponsiveStyles = { base: Record<string, string>; lg: Record<string, string> };

function declarations(body: string) {
  const result: Record<string, string> = {};
  for (const part of body.split(";")) {
    const colon = part.indexOf(":");
    if (colon > 0) result[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
  }
  return result;
}

/** Splits generated CSS into top-level rules and the rules inside the `lg` media query. */
function split(css: string) {
  const base: string[] = [];
  const lg: string[] = [];
  let index = 0;
  while (index < css.length) {
    const open = css.indexOf("{", index);
    if (open < 0) break;
    const prelude = css.slice(index, open).trim();
    if (prelude.startsWith("@")) {
      let depth = 1;
      let end = open + 1;
      while (end < css.length && depth > 0) {
        if (css[end] === "{") depth++;
        else if (css[end] === "}") depth--;
        end++;
      }
      if (prelude === lgQuery) lg.push(css.slice(open + 1, end - 1));
      index = end;
    } else {
      const close = css.indexOf("}", open);
      base.push(`${prelude}{${css.slice(open + 1, close)}}`);
      index = close + 1;
    }
  }
  return { base: base.join(""), lg: lg.join("") };
}

function stylesFor(css: string, classes: string[]) {
  const result: Record<string, string> = {};
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((selector) => selector.trim());
    if (selectors.some((selector) => classes.some((name) => selector === `.${name}`))) {
      Object.assign(result, declarations(match[2]));
    }
  }
  return result;
}

/** The element's own class styles, below and at or above Chakra's `lg` breakpoint. */
export function responsiveStyles(element: Element): ResponsiveStyles {
  const css = Array.from(document.querySelectorAll("style"))
    .map((style) => style.textContent ?? "")
    .join("\n");
  const { base, lg } = split(css);
  const classes = Array.from(element.classList);
  const baseStyles = stylesFor(base, classes);
  return { base: baseStyles, lg: { ...baseStyles, ...stylesFor(lg, classes) } };
}
