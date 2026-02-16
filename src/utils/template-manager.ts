import * as fs from "fs-extra";
import * as path from "path";
import * as ejs from "ejs";

export interface TemplateContext {
  projectName: string;
  description?: string;
  author?: string;
  license?: string;
  packageManager: "npm" | "yarn" | "pnpm";
  database?: string;
  authStrategy?: string;
}

/**
 * Copies template files from source to destination, processing EJS templates
 */
export async function copyTemplateFiles(
  sourceDir: string,
  targetDir: string,
  context: TemplateContext,
): Promise<void> {
  const files = await fs.readdir(sourceDir);

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);

    // Skip unnecessary directories and files
    // Note: package-lock.json is handled separately based on package manager
    const skipPatterns = ["node_modules", ".git", "dist", ".DS_Store"];
    if (skipPatterns.includes(file)) {
      continue;
    }

    // Skip package-lock.json as it will be regenerated or removed based on package manager
    if (file === "package-lock.json") {
      continue;
    }

    const stat = await fs.stat(sourcePath);

    if (stat.isDirectory()) {
      await fs.ensureDir(targetPath);
      await copyTemplateFiles(sourcePath, targetPath, context);
    } else {
      // Process EJS templates or copy files as-is
      if (file.endsWith(".ejs")) {
        await processEjsTemplate(sourcePath, targetPath, context);
      } else {
        await fs.copy(sourcePath, targetPath);
      }
    }
  }
}

/**
 * Processes an EJS template file
 */
async function processEjsTemplate(
  sourcePath: string,
  targetPath: string,
  context: TemplateContext,
): Promise<void> {
  const content = await fs.readFile(sourcePath, "utf-8");

  const rendered = ejs.render(content, {
    projectName: context.projectName,
    name: context.projectName, // Alias for backward compatibility
    description: context.description || "",
    author: context.author || "",
    license: context.license || "UNLICENSED",
    packageManager: context.packageManager,
    database: context.database || "prisma-postgresql",
    authStrategy: context.authStrategy || "jwt",
  });

  // Remove .ejs extension from target path
  const finalPath = targetPath.replace(/\.ejs$/, "");
  await fs.writeFile(finalPath, rendered, "utf-8");
}

/**
 * Renders a single EJS template string
 */
export function renderTemplate(
  content: string,
  context: TemplateContext,
): string {
  return ejs.render(content, {
    projectName: context.projectName,
    name: context.projectName,
    description: context.description || "",
    author: context.author || "",
    license: context.license || "UNLICENSED",
    packageManager: context.packageManager,
    database: context.database || "prisma-postgresql",
    authStrategy: context.authStrategy || "jwt",
  });
}
