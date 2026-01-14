#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const generate_1 = require("../src/commands/generate");
const chalk_1 = __importDefault(require("chalk"));
const program = new commander_1.Command();
program
    .name('zimt')
    .description('Zimt CLI - Spice up your NestJS backend')
    .version('0.0.1');
program
    .command('new <name>')
    .description('Create a new prodact ready NestJS project')
    .action((name) => {
    console.log(chalk_1.default.green(`Creating a new NestJS project called ${name}...`));
    console.log(chalk_1.default.yellow('This will take a few minutes...'));
});
program.addCommand(generate_1.generateCommand);
program.parse(process.argv);
