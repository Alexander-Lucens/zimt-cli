import * as fs from "fs-extra";
import * as path from "path";
import * as prompts from "@clack/prompts";
import chalk from "chalk";
import { copyTemplateFiles, TemplateContext } from "../utils/template-manager";
import { execSync } from "child_process";

import { ProjectConfig } from "../types";

const CURRENT_TEMPLATE_NAME = "template_v002";

// Helper to get __dirname in TypeScript/CommonJS context
// @ts-ignore - __dirname is available in CommonJS runtime
const dirname: string =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(require.main?.filename || "");

// Get template directory - Template is now in src/templates/zimt-template
// In development: __dirname = src/commands, so template is at ../templates/zimt-template
// In production: __dirname = dist/src/commands, so template is at ../templates/zimt-template
function getTemplateDir(): string {
  // Try multiple possible paths
  // When compiled: dirname = dist/src/commands, so we need ../../../src/templates/zimt-template
  // When in dev with ts-node: dirname = src/commands, so we need ../templates/zimt-template
  const possiblePaths = [
    path.resolve(dirname, "../templates", CURRENT_TEMPLATE_NAME), // From src/commands (dev)
    path.resolve(dirname, "../../../src/templates", CURRENT_TEMPLATE_NAME), // From dist/src/commands (compiled)
    path.resolve(dirname, "../../src/templates", CURRENT_TEMPLATE_NAME), // Alternative build structure
    path.resolve(process.cwd(), "src/templates", CURRENT_TEMPLATE_NAME), // Fallback from project root
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      return possiblePath;
    }
  }

  // Fallback to the most likely path
  return path.resolve(dirname, "../templates", CURRENT_TEMPLATE_NAME);
}

// Get template directory - initialize lazily
let TEMPLATE_DIR: string | null = null;

function getTemplateDirectory(): string {
  if (!TEMPLATE_DIR) {
    TEMPLATE_DIR = getTemplateDir();
  }
  return TEMPLATE_DIR;
}

export async function createProject(
  config: ProjectConfig,
  targetDir: string,
): Promise<void> {
  const TEMPLATE_DIR = getTemplateDirectory();

  // Verify template directory exists
  if (!fs.existsSync(TEMPLATE_DIR)) {
    throw new Error(`Template directory not found at: ${TEMPLATE_DIR}`);
  }

  const s = prompts.spinner();

  // Create target directory
  s.start("Creating project directory...");
  await fs.ensureDir(targetDir);
  s.stop("✓ Project directory created");

  // Copy template files using template manager
  s.start("Copying template files...");
  const templateContext: TemplateContext = {
    projectName: config.name,
    description: config.description,
    author: config.author,
    packageManager: config.packageManager,
    database: config.database,
    authStrategy: config.authStrategy,
  };
  await copyTemplateFiles(TEMPLATE_DIR, targetDir, templateContext);
  s.stop("✓ Template files copied");

  // Handle package manager specific files
  s.start(`Configuring for ${config.packageManager}...`);
  await configurePackageManager(targetDir, config.packageManager);
  s.stop(`✓ Configured for ${config.packageManager}`);

  // Initialize git if requested
  if (config.initializeGit) {
    s.start("Initializing git repository...");
    try {
      execSync("git init", { cwd: targetDir, stdio: "ignore" });
      s.stop("✓ Git repository initialized");
    } catch (error) {
      s.stop("⚠ Git initialization skipped (git not available)");
    }
  }

  // Install dependencies
  s.start(`Installing dependencies with ${config.packageManager}...`);
  try {
    const installCommand =
      config.packageManager === "yarn"
        ? "yarn install"
        : config.packageManager === "pnpm"
          ? "pnpm install"
          : "npm install";

    execSync(installCommand, {
      cwd: targetDir,
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "production" },
    });
    s.stop(`✓ Dependencies installed with ${config.packageManager}`);
  } catch (error: any) {
    s.stop(
      `⚠ Installation failed, run manually: ${config.packageManager} install`,
    );
    console.warn(chalk.yellow(`Warning: ${error.message}`));
  }
}

async function configurePackageManager(
  targetDir: string,
  packageManager: "npm" | "yarn" | "pnpm",
): Promise<void> {
  const packageJsonPath = path.join(targetDir, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  try {
    const pkgContent = await fs.readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(pkgContent);

    // Remove package-lock.json for yarn and pnpm
    if (packageManager !== "npm") {
      const lockFilePath = path.join(targetDir, "package-lock.json");
      if (fs.existsSync(lockFilePath)) {
        await fs.remove(lockFilePath);
      }
    }

    // Update scripts to use the selected package manager
    if (pkg.scripts) {
      const scriptUpdates: Record<string, string> = {};

      for (const [scriptName, scriptValue] of Object.entries(pkg.scripts)) {
        if (typeof scriptValue === "string") {
          // Replace npx with appropriate package manager command
          let updatedScript = scriptValue;
          if (packageManager === "yarn") {
            updatedScript = updatedScript.replace(/npx /g, "yarn ");
          } else if (packageManager === "pnpm") {
            updatedScript = updatedScript.replace(/npx /g, "pnpm ");
          }
          // Only update if script actually changed
          if (updatedScript !== scriptValue) {
            scriptUpdates[scriptName] = updatedScript;
          }
        }
      }

      // Apply updates
      Object.assign(pkg.scripts, scriptUpdates);
    }

    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(pkg, null, 2) + "\n",
      "utf-8",
    );
  } catch (error) {
    // If updating fails, just skip it - not critical
    console.warn(
      `Warning: Could not configure package.json for ${packageManager}`,
    );
  }
}

export async function promptProjectConfig(
  projectName?: string,
): Promise<ProjectConfig> {
  prompts.intro(
    chalk.cyan("ZIMT CLI - Create a production-ready NestJS project"),
  );

  const projectConfig = await prompts.group(
    {
      name: projectName
        ? async () => projectName
        : async () =>
            await prompts.text({
              message: "What is your project name?",
              placeholder: "my-awesome-api",
              validate: (value: string) => {
                if (!value || value.trim().length === 0) {
                  return "Project name is required";
                }
                if (!/^[a-z0-9-]+$/.test(value)) {
                  return "Project name must be lowercase, alphanumeric with hyphens only";
                }
                return undefined;
              },
            }),

      packageManager: () =>
        prompts.select({
          message: "Which package manager would you like to use?",
          options: [
            { value: "npm", label: "npm" },
            { value: "yarn", label: "yarn" },
            { value: "pnpm", label: "pnpm" },
          ],
        }),

      database: () =>
        prompts.select({
          message: "Which database would you like to use?",
          options: [
            { value: "prisma-postgresql", label: "Prisma (PostgreSQL)" },
          ],
        }),

      authStrategy: () =>
        prompts.select({
          message: "Which authentication strategy would you like?",
          options: [{ value: "jwt", label: "JWT (Stateless)" }],
        }),

      description: () =>
        prompts.text({
          message: "Project description (optional)",
          placeholder: "A production-ready NestJS application",
          initialValue: "",
        }),

      author: () =>
        prompts.text({
          message: "Author (optional)",
          placeholder: "Your Name",
          initialValue: "",
        }),

      initializeGit: () =>
        prompts.confirm({
          message: "Initialize a git repository?",
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        prompts.cancel("Project creation cancelled.");
        process.exit(0);
      },
    },
  );
  return projectConfig as ProjectConfig;
}
