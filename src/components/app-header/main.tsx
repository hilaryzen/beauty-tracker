import { Flex, HStack, Link, Text } from "@chakra-ui/react";
import { NavLink } from "react-router";

const pages = [
  { label: "Usage", to: "/" },
  { label: "Purchases", to: "/purchases" },
];

/** The header shown above every page, with a link to each page. */
// @spec SHELL-NAV-001, SHELL-NAV-002, SHELL-NAV-003, SHELL-NAV-004, SHELL-NAV-005, SHELL-NAV-006, SHELL-NAV-007, SHELL-NAV-008
export function AppHeader() {
  return (
    <Flex as="header" align="center" gap="8" px="6" py="3" borderBottomWidth="1px">
      <Text fontWeight="bold">Beauty Tracker</Text>
      <HStack as="nav" gap="5">
        {pages.map(({ label, to }) => (
          <Link
            key={to}
            asChild
            color="fg.muted"
            _currentPage={{ color: "fg", fontWeight: "semibold" }}
          >
            {/* `end` keeps "/" from matching every path beneath it. */}
            <NavLink to={to} end>
              {label}
            </NavLink>
          </Link>
        ))}
      </HStack>
    </Flex>
  );
}
