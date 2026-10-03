import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/usage", "routes/api.usage.ts"),
] satisfies RouteConfig;