import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Box, Container, Heading, Text } from "@chakra-ui/react";

import type { Route } from "./+types/root";
import { Provider } from "@/components/ui/provider";
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from "@/components/app-header/main";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

/** Theme, color mode, navigation header, and the notification area, around every page including the error page. */
// @spec SHELL-UI-001, SHELL-UI-002, SHELL-UI-003, SHELL-NAV-001
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      <AppHeader />
      {children}
      <Toaster />
    </Provider>
  );
}

// React Router renders Layout around both the route tree and ErrorBoundary.
// @spec SHELL-UI-004, SHELL-UI-005
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Beauty Tracker</title>
        <meta name="description" content="Track beauty product usage, purchases, and inventory" />
        <Meta />
        <Links />
      </head>
      <body>
        <Shell>{children}</Shell>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// @spec SHELL-ERR-001, SHELL-ERR-002, SHELL-ERR-003, SHELL-ERR-004
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <Container as="main" pt="16" pb="4">
      <Heading as="h1" size="2xl" mb="2">{message}</Heading>
      <Text>{details}</Text>
      {stack && (
        <Box as="pre" w="full" p="4" mt="4" overflowX="auto">
          <code>{stack}</code>
        </Box>
      )}
    </Container>
  );
}
