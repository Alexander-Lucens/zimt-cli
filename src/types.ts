export interface ProjectConfig {
  name: string;
  packageManager: "npm" | "yarn" | "pnpm";
  database: "prisma-postgresql";
  authStrategy: "jwt";
  description?: string;
  author?: string;
  initializeGit?: boolean;
}
