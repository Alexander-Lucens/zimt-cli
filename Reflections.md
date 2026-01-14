# Reflections

## graph TD
    A[User enters: zimt new my-api] --> B{Args provided? }
    B -- Yes --> C[Skip questions / Use defaults] 
        If it wat -y (yes for all) --> Create Prisma for Postgres with docker files.
        BUT for MVP i would prefere not to do that,
        because if user decide to add one more DB instances we will require AST and code analisation algorithm to correctly pased this information.
    C -- No --> D[Interactive UI (Prompts)]
    
    D --> E[Choice: DB Type?]
        1 --> Prisma/PostrgeSQL - MVP
        2 --> Local Storage in Memory - maybe also in MVP(not shure is it required for someone or not)
        3 --> Mongoose - 1-st things in beetwen v.1 -> v.2

    E --> F[Choice: Auth Strategy?]
        I think here i need to implement in project:
        1 --> @Decorators of Role Based Access Control
        2 --> From template create Auth module (but before need to ask Session | JWT type)
    
    F --> G[CORE ENGINE]
        Here could be created parts of project mostely by calling `nest g service && nest g module && nest g controller` and could be added @Decorators by default (but also need Parsing to AST and may be decorators injection left for v.2)
    
    subgraph "Zimt Logic"
        G --> H[1. Load Templates]
        H --> I[2. Replace Variables]
        I --> J[3. Generate File Structure]
    end
    
    subgraph "Templates Source"
        H -.-> K[Local Templates Folder]
        K -- (Future) --> L[Download from GitHub]
    end
    
    J --> M[Install Dependencies]
    M --> N[Format Code (Prettier)]
    N --> O[Done! Green Success Message]

Parse **app.module.ts** with *ts-morph* and put new created modules in import section of **app.modules.ts**;
