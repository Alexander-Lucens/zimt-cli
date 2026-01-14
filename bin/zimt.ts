#!/usr/bin/env node
import { Command } from 'commander';
import { generateCommand } from '../src/commands/generate';
import chalk from 'chalk';

const program = new Command();

program
    .name('zimt')
    .description('Zimt CLI - Spice up your NestJS backend')
    .version('0.0.1');

program
    .command('new <name>')
    .description('Create a new prodact ready NestJS project')
    .action((name: string) => {
        console.log(chalk.green(`Creating a new NestJS project called ${name}...`));
        console.log(chalk.yellow('This will take a few minutes...'));
    });

program.addCommand(generateCommand);

program.parse(process.argv);    