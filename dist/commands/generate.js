"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommand = void 0;
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const repository_1 = require("../templates/repository");
exports.generateCommand = new commander_1.Command('generate')
    .alias('g')
    .description('Generate a new resource (Repository pattern)')
    .argument('<name>', 'Name of the resource (e.g. users)')
    .action(async (name) => {
    const { type } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'Which repository type?',
            choices: ['prisma', 'in-memory'],
            default: 'prisma',
        },
    ]);
    const lowerName = name.toLowerCase();
    const targetDir = path_1.default.join(process.cwd(), 'src', 'database', lowerName);
    await fs_extra_1.default.ensureDir(targetDir);
    console.log(chalk_1.default.blue(`📂 Created directory: ${targetDir}`));
    const interfacePath = path_1.default.join(targetDir, `${lowerName}.repository.interface.ts`);
    await fs_extra_1.default.writeFile(interfacePath, (0, repository_1.getInterfaceTemplate)(lowerName));
    console.log(chalk_1.default.green(`✅ Created Interface: ${lowerName}.repository.interface.ts`));
    if (type === 'prisma') {
        const repoPath = path_1.default.join(targetDir, `prisma.${lowerName}.repository.ts`);
        await fs_extra_1.default.writeFile(repoPath, (0, repository_1.getPrismaRepoTemplate)(lowerName));
        console.log(chalk_1.default.green(`✅ Created Prisma Repository: prisma.${lowerName}.repository.ts`));
    }
    else {
        console.log(chalk_1.default.yellow('⚠️ In-memory template is todo for you!'));
        // Сюда добавишь вызов getInMemoryTemplate(lowerName) но это не точно
    }
});
