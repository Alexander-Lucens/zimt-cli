import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { Project, SyntaxKind, Node, ImportDeclaration } from 'ts-morph';
import * as prompts from '@clack/prompts';

export const resourceGeneratorCommand = new Command('generate')
  .alias('g')
  .alias('p')
  .description('Generate a new resource (Module, Controller, Service, DTO, Repository)')
  .argument('<name>', 'Name of the resource (e.g. product, order)')
  .action(async (name: string) => {
    try {
      const resourceName = name.toLowerCase();
      const ResourceName = capitalize(resourceName);
      const targetDir = process.cwd();

      // Verify we're in a NestJS project
      const appModulePath = path.join(targetDir, 'src', 'app.module.ts');
      if (!fs.existsSync(appModulePath)) {
        prompts.cancel('Not a NestJS project. Run this command from your project root.');
        process.exit(1);
      }

      const s = prompts.spinner();

      // Create resource directory structure
      const resourceDir = path.join(targetDir, 'src', resourceName);
      const dtoDir = path.join(resourceDir, 'dto');
      const entitiesDir = path.join(resourceDir, 'entities');

      s.start(`Creating resource structure for ${ResourceName}...`);
      await fs.ensureDir(dtoDir);
      await fs.ensureDir(entitiesDir);
      s.stop(`✓ Created directories`);

      // Generate files
      s.start('Generating files...');
      await generateModule(resourceDir, resourceName, ResourceName);
      await generateController(resourceDir, resourceName, ResourceName);
      await generateService(resourceDir, resourceName, ResourceName);
      await generateDTO(dtoDir, resourceName, ResourceName);
      await generateEntity(entitiesDir, resourceName, ResourceName);
      await generateRepository(resourceDir, resourceName, ResourceName);
      // Generate test files
      await generateUnitTests(resourceDir, resourceName, ResourceName);
      await generateE2ETests(targetDir, resourceName, ResourceName);
      s.stop('✓ Files generated');

      // Update app.module.ts using ts-morph
      s.start('Updating app.module.ts...');
      await updateAppModule(appModulePath, resourceName, ResourceName);
      s.stop('✓ app.module.ts updated');

      prompts.outro(chalk.green(`\n✓ Resource "${ResourceName}" created successfully!\n`));
      console.log(chalk.yellow(`⚠️  Don't forget to:`));
      console.log(chalk.yellow(`   1. Add the ${ResourceName} model to prisma/schema.prisma`));
      console.log(chalk.yellow(`   2. Run: npx prisma generate\n`));

    } catch (error: any) {
      prompts.cancel('Resource generation failed.');
      console.error(chalk.red(`\nError: ${error.message}\n`));
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function generateModule(dir: string, name: string, Name: string): Promise<void> {
  const content = `import { Module } from '@nestjs/common';
import { ${Name}Controller } from './${name}.controller';
import { ${Name}Service } from './${name}.service';
import { PrismaModule } from '../prisma/prisma.module';
import { Prisma${Name}Repository } from './${name}.repository';

@Module({
  imports: [PrismaModule],
  controllers: [${Name}Controller],
  providers: [
    {
      provide: '${Name.toUpperCase()}_REPOSITORY',
      useClass: Prisma${Name}Repository,
    },
    ${Name}Service,
  ],
  exports: [${Name}Service],
})
export class ${Name}Module {}
`;

  await fs.writeFile(path.join(dir, `${name}.module.ts`), content);
}

async function generateController(dir: string, name: string, Name: string): Promise<void> {
  const content = `import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ${Name}Service } from './${name}.service';
import { Create${Name}Dto } from './dto/create-${name}.dto';
import { Update${Name}Dto } from './dto/update-${name}.dto';

@Controller('${name}s')
export class ${Name}Controller {
  constructor(private readonly ${name}Service: ${Name}Service) {}

  @Get()
  async findAll() {
    return this.${name}Service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.${name}Service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() create${Name}Dto: Create${Name}Dto) {
    return this.${name}Service.create(create${Name}Dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() update${Name}Dto: Update${Name}Dto,
  ) {
    return this.${name}Service.update(id, update${Name}Dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.${name}Service.remove(id);
  }
}
`;

  await fs.writeFile(path.join(dir, `${name}.controller.ts`), content);
}

async function generateService(dir: string, name: string, Name: string): Promise<void> {
  const content = `import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { I${Name}Repository } from './${name}.repository.interface';
import { Create${Name}Dto } from './dto/create-${name}.dto';
import { Update${Name}Dto } from './dto/update-${name}.dto';

@Injectable()
export class ${Name}Service {
  constructor(
    @Inject('${Name.toUpperCase()}_REPOSITORY')
    private repository: I${Name}Repository,
  ) {}

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: string) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundException(\`${Name} with ID \${id} not found\`);
    }
    return item;
  }

  async create(create${Name}Dto: Create${Name}Dto) {
    return this.repository.create(create${Name}Dto);
  }

  async update(id: string, update${Name}Dto: Update${Name}Dto) {
    const item = await this.repository.update(id, update${Name}Dto);
    if (!item) {
      throw new NotFoundException(\`${Name} with ID \${id} not found\`);
    }
    return item;
  }

  async remove(id: string) {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new NotFoundException(\`${Name} with ID \${id} not found\`);
    }
  }
}
`;

  await fs.writeFile(path.join(dir, `${name}.service.ts`), content);
}

async function generateDTO(dtoDir: string, name: string, Name: string): Promise<void> {
  const createDto = `import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class Create${Name}Dto {
  @IsNotEmpty()
  @IsString()
  name: string;

  // Add more fields as needed
}
`;

  const updateDto = `import { PartialType } from '@nestjs/mapped-types';
import { Create${Name}Dto } from './create-${name}.dto';

export class Update${Name}Dto extends PartialType(Create${Name}Dto) {}
`;

  await fs.writeFile(path.join(dtoDir, `create-${name}.dto.ts`), createDto);
  await fs.writeFile(path.join(dtoDir, `update-${name}.dto.ts`), updateDto);
}

async function generateEntity(entitiesDir: string, name: string, Name: string): Promise<void> {
  const content = `export interface ${Name} {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
`;

  await fs.writeFile(path.join(entitiesDir, `${name}.entity.ts`), content);
}

async function generateRepository(dir: string, name: string, Name: string): Promise<void> {
  const interfaceContent = `import { Create${Name}Dto, Update${Name}Dto } from './dto/create-${name}.dto';
import { ${Name} } from './entities/${name}.entity';

export interface I${Name}Repository {
  findAll(): Promise<${Name}[]>;
  findById(id: string): Promise<${Name} | undefined>;
  create(data: Create${Name}Dto): Promise<${Name}>;
  update(id: string, data: Update${Name}Dto): Promise<${Name} | undefined>;
  delete(id: string): Promise<boolean>;
}
`;

  const prismaRepoContent = `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I${Name}Repository } from './${name}.repository.interface';
import { ${Name} as Prisma${Name} } from '@prisma/client';
import { Create${Name}Dto, Update${Name}Dto } from './dto/create-${name}.dto';
import { ${Name} } from './entities/${name}.entity';

@Injectable()
export class Prisma${Name}Repository implements I${Name}Repository {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<${Name}[]> {
    const items = await this.prisma.${name}.findMany();
    return items.map(item => this.mapToDomain(item));
  }

  async findById(id: string): Promise<${Name} | undefined> {
    const item = await this.prisma.${name}.findUnique({ where: { id } });
    return item ? this.mapToDomain(item) : undefined;
  }

  async create(data: Create${Name}Dto): Promise<${Name}> {
    const item = await this.prisma.${name}.create({ data });
    return this.mapToDomain(item);
  }

  async update(id: string, data: Update${Name}Dto): Promise<${Name} | undefined> {
    try {
      const item = await this.prisma.${name}.update({
        where: { id },
        data,
      });
      return this.mapToDomain(item);
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.${name}.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  private mapToDomain(item: Prisma${Name}): ${Name} {
    return {
      id: item.id,
      name: item.name,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
`;

  await fs.writeFile(path.join(dir, `${name}.repository.interface.ts`), interfaceContent);
  await fs.writeFile(path.join(dir, `${name}.repository.ts`), prismaRepoContent);
}

async function updateAppModule(
  appModulePath: string,
  resourceName: string,
  ResourceName: string,
): Promise<void> {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(appModulePath);

  // Add import for the new module (check if it already exists)
  const existingImports = sourceFile.getImportDeclarations();
  const moduleImportExists = existingImports.some(
    imp => imp.getModuleSpecifierValue() === `./${resourceName}/${resourceName}.module`
  );

  if (!moduleImportExists) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: `./${resourceName}/${resourceName}.module`,
      namedImports: [{ name: `${ResourceName}Module` }],
    });
  }

  // Find the @Module decorator
  const appModuleClass = sourceFile.getClass('AppModule');
  if (!appModuleClass) {
    throw new Error('AppModule class not found');
  }

  const moduleDecorator = appModuleClass.getDecorator('Module');
  if (!moduleDecorator) {
    throw new Error('@Module decorator not found');
  }

  // Get the imports array from the decorator argument
  const decoratorArgs = moduleDecorator.getArguments();
  if (!decoratorArgs || decoratorArgs.length === 0) {
    throw new Error('@Module decorator has no arguments');
  }

  const firstArg = decoratorArgs[0];
  if (firstArg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    throw new Error('Invalid @Module decorator structure');
  }

  const objExpr = firstArg.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  const importsProp = objExpr.getProperty('imports');
  
  if (importsProp && importsProp.getKind() === SyntaxKind.PropertyAssignment) {
    const propertyAssignment = importsProp.asKindOrThrow(SyntaxKind.PropertyAssignment);
    const initializer = propertyAssignment.getInitializer();
    if (initializer && initializer.getKind() === SyntaxKind.ArrayLiteralExpression) {
      const arrayExpr = initializer.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
      
      // Check if module is already in the array
      const elements = arrayExpr.getElements();
      const moduleExists = elements.some(
        (el: any) => el.getText().trim() === `${ResourceName}Module`
      );

      if (!moduleExists) {
        arrayExpr.addElement(`${ResourceName}Module`);
      }
    }
  }

  // Save the file
  sourceFile.saveSync();
}

async function generateUnitTests(
  dir: string,
  name: string,
  Name: string,
): Promise<void> {
  // Service unit test
  const serviceSpec = `import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ${Name}Service } from './${name}.service';
import { I${Name}Repository } from './${name}.repository.interface';
import { Create${Name}Dto, Update${Name}Dto, ${Name} } from './dto/create-${name}.dto';

describe('${Name}Service', () => {
  let service: ${Name}Service;
  let repository: jest.Mocked<I${Name}Repository>;

  const mock${Name}: ${Name} = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test ${Name}',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${Name}Service,
        {
          provide: '${Name.toUpperCase()}_REPOSITORY',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<${Name}Service>(${Name}Service);
    repository = module.get('${Name.toUpperCase()}_REPOSITORY');

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all ${name}s', async () => {
      const ${name}s = [mock${Name}];
      repository.findAll.mockResolvedValue(${name}s);

      const result = await service.findAll();

      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return ${name} by id', async () => {
      repository.findById.mockResolvedValue(mock${Name});

      const result = await service.findOne(mock${Name}.id);

      expect(repository.findById).toHaveBeenCalledWith(mock${Name}.id);
      expect(result).toEqual(mock${Name});
    });

    it('should throw NotFoundException if ${name} not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(service.findOne(mock${Name}.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new ${name}', async () => {
      const createDto: Create${Name}Dto = {
        name: 'New ${Name}',
      };

      repository.create.mockResolvedValue(mock${Name});

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mock${Name});
    });
  });

  describe('update', () => {
    it('should update ${name}', async () => {
      const updateDto: Update${Name}Dto = {
        name: 'Updated ${Name}',
      };

      const updated${Name} = { ...mock${Name}, ...updateDto };
      repository.update.mockResolvedValue(updated${Name});

      const result = await service.update(mock${Name}.id, updateDto);

      expect(repository.update).toHaveBeenCalledWith(mock${Name}.id, updateDto);
      expect(result).toEqual(updated${Name});
    });

    it('should throw NotFoundException if ${name} not found', async () => {
      const updateDto: Update${Name}Dto = { name: 'Updated' };
      repository.update.mockResolvedValue(undefined);

      await expect(
        service.update(mock${Name}.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete ${name}', async () => {
      repository.delete.mockResolvedValue(true);

      await service.remove(mock${Name}.id);

      expect(repository.delete).toHaveBeenCalledWith(mock${Name}.id);
    });

    it('should throw NotFoundException if ${name} not found', async () => {
      repository.delete.mockResolvedValue(false);

      await expect(service.remove(mock${Name}.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
`;

  // Controller unit test
  const controllerSpec = `import { Test, TestingModule } from '@nestjs/testing';
import { ${Name}Controller } from './${name}.controller';
import { ${Name}Service } from './${name}.service';
import { Create${Name}Dto, Update${Name}Dto } from './dto/create-${name}.dto';

describe('${Name}Controller', () => {
  let controller: ${Name}Controller;
  let service: jest.Mocked<${Name}Service>;

  const mock${Name}Service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [${Name}Controller],
      providers: [
        {
          provide: ${Name}Service,
          useValue: mock${Name}Service,
        },
      ],
    }).compile();

    controller = module.get<${Name}Controller>(${Name}Controller);
    service = module.get(${Name}Service);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all ${name}s', async () => {
      const ${name}s = [{ id: '1', name: 'Test' }];
      service.findAll.mockResolvedValue(${name}s as any);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(${name}s);
    });
  });

  describe('findOne', () => {
    it('should return ${name} by id', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const ${name} = { id, name: 'Test' };
      service.findOne.mockResolvedValue(${name} as any);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(${name});
    });
  });

  describe('create', () => {
    it('should create a new ${name}', async () => {
      const createDto: Create${Name}Dto = {
        name: 'New ${Name}',
      };
      const created${Name} = { id: '1', ...createDto };
      service.create.mockResolvedValue(created${Name} as any);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(created${Name});
    });
  });

  describe('update', () => {
    it('should update ${name}', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: Update${Name}Dto = {
        name: 'Updated ${Name}',
      };
      const updated${Name} = { id, ...updateDto };
      service.update.mockResolvedValue(updated${Name} as any);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(updated${Name});
    });
  });

  describe('remove', () => {
    it('should delete ${name}', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
      expect(result).toBeUndefined();
    });
  });
});
`;

  await fs.writeFile(path.join(dir, `${name}.service.spec.ts`), serviceSpec);
  await fs.writeFile(path.join(dir, `${name}.controller.spec.ts`), controllerSpec);
}

async function generateE2ETests(
  targetDir: string,
  name: string,
  Name: string,
): Promise<void> {
  const testDir = path.join(targetDir, 'test', name);
  await fs.ensureDir(testDir);

  const e2eSpec = `import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('${Name} (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let created${Name}Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get(PrismaService);

    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'admin', password: 'admin123' });
    authToken = loginResponse.body.accessToken;
  });

  beforeEach(async () => {
    // Clean ${name}s before each test
    await prisma.${name}.deleteMany({});
  });

  afterAll(async () => {
    await prisma.${name}.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /${name}s', () => {
    it('should create a new ${name}', async () => {
      const createDto = {
        name: 'Test ${Name}',
      };

      const response = await request(app.getHttpServer())
        .post('/${name}s')
        .set('Authorization', \`Bearer \${authToken}\`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', createDto.name);
      created${Name}Id = response.body.id;
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/${name}s')
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('GET /${name}s', () => {
    it('should return all ${name}s', async () => {
      const response = await request(app.getHttpServer())
        .get('/${name}s')
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /${name}s/:id', () => {
    beforeEach(async () => {
      // Create a ${name} for testing
      const ${name} = await prisma.${name}.create({
        data: { name: 'Test ${Name}' },
      });
      created${Name}Id = ${name}.id;
    });

    it('should return ${name} by id', async () => {
      const response = await request(app.getHttpServer())
        .get(\`/${name}s/\${created${Name}Id}\`)
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(200);

      expect(response.body).toHaveProperty('id', created${Name}Id);
    });

    it('should return 404 for non-existent ${name}', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      await request(app.getHttpServer())
        .get(\`/${name}s/\${fakeId}\`)
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(404);
    });
  });

  describe('PUT /${name}s/:id', () => {
    beforeEach(async () => {
      const ${name} = await prisma.${name}.create({
        data: { name: 'Test ${Name}' },
      });
      created${Name}Id = ${name}.id;
    });

    it('should update ${name}', async () => {
      const updateDto = {
        name: 'Updated ${Name}',
      };

      const response = await request(app.getHttpServer())
        .put(\`/${name}s/\${created${Name}Id}\`)
        .set('Authorization', \`Bearer \${authToken}\`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('name', updateDto.name);
    });
  });

  describe('DELETE /${name}s/:id', () => {
    beforeEach(async () => {
      const ${name} = await prisma.${name}.create({
        data: { name: 'Test ${Name}' },
      });
      created${Name}Id = ${name}.id;
    });

    it('should delete ${name}', async () => {
      await request(app.getHttpServer())
        .delete(\`/${name}s/\${created${Name}Id}\`)
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(204);

      // Verify ${name} was deleted
      await request(app.getHttpServer())
        .get(\`/${name}s/\${created${Name}Id}\`)
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(404);
    });
  });
});
`;

  await fs.writeFile(path.join(testDir, `${name}.e2e-spec.ts`), e2eSpec);
}
