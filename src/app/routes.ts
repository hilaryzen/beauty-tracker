import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/usage", "routes/api.usage.ts"),
  route("api/configs", "routes/api.configs.ts"),
] satisfies RouteConfig;