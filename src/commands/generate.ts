import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getInterfaceTemplate, getPrismaRepoTemplate } from '../templates/repository';

export const generateCommand = new Command('generate')
  .alias('g')
  .alias('generate')
  .description('Generate a new resource (Repository pattern)')
  .argument('<name>', 'Name of the resource (e.g. users)')
  .action(async (name: string) => {

    const { type } = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Which repository type?',
        choices: ['prisma', 'in-memory'],
        default: 'prisma',
      },
    ]);

    const lowerName = name.toLowerCase();
    const targetDir = path.join(process.cwd(), 'src', 'database', lowerName);

    await fs.ensureDir(targetDir);
    console.log(chalk.blue(`📂 Created directory: ${targetDir}`));

    const interfacePath = path.join(targetDir, `${lowerName}.repository.interface.ts`);
    await fs.writeFile(interfacePath, getInterfaceTemplate(lowerName));
    console.log(chalk.green(`✅ Created Interface: ${lowerName}.repository.interface.ts`));

    if (type === 'prisma') {
      const repoPath = path.join(targetDir, `prisma.${lowerName}.repository.ts`);
      await fs.writeFile(repoPath, getPrismaRepoTemplate(lowerName));
      console.log(chalk.green(`✅ Created Prisma Repository: prisma.${lowerName}.repository.ts`));
    } else {
      console.log(chalk.yellow('⚠️ In-memory template is todo for you!'));
      // Сюда добавишь вызов getInMemoryTemplate(lowerName) но это не точно
    }
  });