export type AuthStrategy =
  | "jwt"
  | "local"
  | "oauth-google"
  | "oauth-github"
  | "api-key";

export interface ProjectConfig {
  name: string;
  packageManager: "npm" | "yarn" | "pnpm";
  database: "prisma-postgresql";
  authStrategies: AuthStrategy[];
  description?: string;
  author?: string;
  license?: string;
  initializeGit?: boolean;
}

export interface ResourceField {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "uuid";
  required?: boolean;
  isArray?: boolean;
}
