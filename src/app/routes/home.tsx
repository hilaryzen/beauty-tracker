import type { Route } from "./+types/home";
import Welcome from "../welcome/welcome";
import { DoubleButton } from "../../components/button/main";
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "@chakra-ui/react/preset";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <ChakraProvider value={system}>
      <Welcome />
      <DoubleButton />
    </ChakraProvider>
  );
}