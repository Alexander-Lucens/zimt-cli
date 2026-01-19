#!/usr/bin/env node
import { Command } from 'commander';
import { resourceGeneratorCommand } from '../src/commands/resource-generator';
import { createProject, promptProjectConfig } from '../src/commands/init';
import chalk from 'chalk';
import * as prompts from '@clack/prompts';
import * as path from 'path';
import * as fs from 'fs-extra';

const program = new Command();

program
    .name('zimt')
    .description('ZIMT CLI - The secret ingredient for production-ready NestJS apps')
    .version('0.0.1');

program
    .command('new [name]')
    .alias('n')
    .description('Create a new production-ready NestJS project')
    .action(async (name?: string) => {
        try {
            // Get project name
            const projectName = name || 
                ((await prompts.text({
                    message: 'What is your project name?',
                    placeholder: 'my-awesome-api',
                    validate: (value: string) => {
                        if (!value || value.trim().length === 0) {
                            return 'Project name is required';
                        }
                        if (!/^[a-z0-9-]+$/.test(value)) {
                            return 'Project name must be lowercase, alphanumeric with hyphens only';
                        }
                        return undefined;
                    },
                })) as string);

            if (!projectName) {
                prompts.cancel('Project creation cancelled.');
                process.exit(0);
            }

            const targetDir = path.resolve(process.cwd(), projectName);

            // Check if directory already exists
            if (fs.existsSync(targetDir)) {
                const shouldOverwrite = await prompts.confirm({
                    message: `Directory "${projectName}" already exists. Overwrite?`,
                    initialValue: false,
                });

                if (!shouldOverwrite) {
                    prompts.cancel('Project creation cancelled.');
                    process.exit(0);
                }

                // Remove existing directory
                await fs.remove(targetDir);
            }

            // Prompt for configuration
            const config = await promptProjectConfig(projectName);

            // Create project
            await createProject(config, targetDir);

            // Show success message
            prompts.outro(chalk.green(`\n✓ Project "${projectName}" created successfully!\n`));
            
            console.log(chalk.cyan(`  cd ${projectName}`));
            if (config.packageManager === 'npm') {
                console.log(chalk.cyan(`  npm install`));
            } else if (config.packageManager === 'yarn') {
                console.log(chalk.cyan(`  yarn install`));
            } else if (config.packageManager === 'pnpm') {
                console.log(chalk.cyan(`  pnpm install`));
            }
            console.log(chalk.cyan(`  npm run start:dev\n`));

        } catch (error: any) {
            prompts.cancel('Project creation failed.');
            console.error(chalk.red(`\nError: ${error.message}\n`));
            if (error.stack) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    });

program.addCommand(resourceGeneratorCommand);

program.parse(process.argv);    