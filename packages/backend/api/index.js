"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/config/index.ts
var import_dotenv, import_zod, EnvSchema, parseEnv, env, config;
var init_config = __esm({
  "src/config/index.ts"() {
    "use strict";
    import_dotenv = __toESM(require("dotenv"));
    import_zod = require("zod");
    import_dotenv.default.config();
    EnvSchema = import_zod.z.object({
      // Environment
      NODE_ENV: import_zod.z.enum(["development", "production", "test"]).default("development"),
      // Server
      PORT: import_zod.z.coerce.number().int().min(1).max(65535).default(3001),
      HOST: import_zod.z.string().default("localhost"),
      // Database
      DATABASE_URL: import_zod.z.string().url(),
      // JWT
      JWT_SECRET: import_zod.z.string().min(32),
      JWT_EXPIRES_IN: import_zod.z.string().default("7d"),
      // CORS
      CORS_ORIGIN: import_zod.z.string().default("http://localhost:5173"),
      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: import_zod.z.coerce.number().int().positive().default(9e5),
      // 15 min
      RATE_LIMIT_MAX_REQUESTS: import_zod.z.coerce.number().int().positive().default(100),
      // Logging
      LOG_LEVEL: import_zod.z.enum(["error", "warn", "info", "debug"]).default("info"),
      LOG_FILE_PATH: import_zod.z.string().optional().default("./logs"),
      // External APIs
      RAPIDAPI_KEY: import_zod.z.string().optional(),
      // Integration API (n8n/Supabase)
      N8N_API_KEY: import_zod.z.string().optional(),
      SUPABASE_URL: import_zod.z.string().url().optional(),
      SUPABASE_SERVICE_ROLE_KEY: import_zod.z.string().optional(),
      // Matching Algorithm
      DEFAULT_MAX_CANDIDATS: import_zod.z.coerce.number().int().positive().default(10),
      DEFAULT_SEUIL_SCORE_MINIMUM: import_zod.z.coerce.number().int().min(0).max(100).default(30),
      DEFAULT_DISTANCE_MAX_GPS: import_zod.z.coerce.number().int().positive().default(500)
    });
    parseEnv = () => {
      try {
        return EnvSchema.parse(process.env);
      } catch (error) {
        if (error instanceof import_zod.z.ZodError) {
          const missingVars = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
          throw new Error(
            `Invalid environment variables:
${missingVars.join("\n")}

Please check your .env file.`
          );
        }
        throw error;
      }
    };
    env = parseEnv();
    config = {
      /**
       * Environment de l'application
       */
      env: env.NODE_ENV,
      /**
       * Indique si l'application est en mode production
       */
      isProduction: env.NODE_ENV === "production",
      /**
       * Indique si l'application est en mode développement
       */
      isDevelopment: env.NODE_ENV === "development",
      /**
       * Indique si l'application est en mode test
       */
      isTest: env.NODE_ENV === "test",
      /**
       * Configuration du serveur
       */
      server: {
        port: env.PORT,
        host: env.HOST
      },
      /**
       * Configuration de la base de données
       */
      database: {
        url: env.DATABASE_URL
      },
      /**
       * Configuration JWT
       */
      jwt: {
        secret: env.JWT_SECRET,
        expiresIn: env.JWT_EXPIRES_IN
      },
      /**
       * Configuration CORS
       */
      cors: {
        origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
        credentials: true
      },
      /**
       * Configuration du rate limiting
       */
      rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS
      },
      /**
       * Configuration des logs
       */
      logging: {
        level: env.LOG_LEVEL,
        filePath: env.LOG_FILE_PATH
      },
      /**
       * Configuration des APIs externes
       */
      externalApis: {
        rapidApiKey: env.RAPIDAPI_KEY,
        n8nApiKey: env.N8N_API_KEY,
        supabaseUrl: env.SUPABASE_URL,
        supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
      },
      /**
       * Configuration de l'algorithme de matching
       */
      matching: {
        defaultMaxCandidats: env.DEFAULT_MAX_CANDIDATS,
        defaultSeuilScoreMinimum: env.DEFAULT_SEUIL_SCORE_MINIMUM,
        defaultDistanceMaxGPS: env.DEFAULT_DISTANCE_MAX_GPS
      }
    };
  }
});

// src/utils/errors.ts
var import_shared, AppError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError, InternalServerError;
var init_errors = __esm({
  "src/utils/errors.ts"() {
    "use strict";
    import_shared = require("@dpe-matching/shared");
    AppError = class extends Error {
      statusCode;
      code;
      isOperational;
      details;
      constructor(message, statusCode, code, isOperational = true, details) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;
        Error.captureStackTrace(this);
      }
    };
    BadRequestError = class extends AppError {
      constructor(message, code = import_shared.ERROR_CODES.VALIDATION_ERROR, details) {
        super(message, 400, code, true, details);
      }
    };
    UnauthorizedError = class extends AppError {
      constructor(message = import_shared.ERROR_MESSAGES[import_shared.ERROR_CODES.AUTH_UNAUTHORIZED], code = import_shared.ERROR_CODES.AUTH_UNAUTHORIZED, details) {
        super(message, 401, code, true, details);
      }
    };
    ForbiddenError = class extends AppError {
      constructor(message, code = import_shared.ERROR_CODES.AUTH_UNAUTHORIZED, details) {
        super(message, 403, code, true, details);
      }
    };
    NotFoundError = class extends AppError {
      constructor(message = import_shared.ERROR_MESSAGES[import_shared.ERROR_CODES.RESOURCE_NOT_FOUND], code = import_shared.ERROR_CODES.RESOURCE_NOT_FOUND, details) {
        super(message, 404, code, true, details);
      }
    };
    ConflictError = class extends AppError {
      constructor(message = import_shared.ERROR_MESSAGES[import_shared.ERROR_CODES.RESOURCE_ALREADY_EXISTS], code = import_shared.ERROR_CODES.RESOURCE_ALREADY_EXISTS, details) {
        super(message, 409, code, true, details);
      }
    };
    ValidationError = class extends AppError {
      constructor(message = import_shared.ERROR_MESSAGES[import_shared.ERROR_CODES.VALIDATION_INVALID_INPUT], code = import_shared.ERROR_CODES.VALIDATION_INVALID_INPUT, details) {
        super(message, 422, code, true, details);
      }
    };
    InternalServerError = class extends AppError {
      constructor(message = import_shared.ERROR_MESSAGES[import_shared.ERROR_CODES.INTERNAL_SERVER_ERROR], code = import_shared.ERROR_CODES.INTERNAL_SERVER_ERROR, details) {
        super(message, 500, code, false, details);
      }
    };
  }
});

// src/middleware/auth.ts
var auth_exports = {};
__export(auth_exports, {
  authenticate: () => authenticate,
  authorize: () => authorize,
  optionalAuthenticate: () => optionalAuthenticate
});
var import_jsonwebtoken2, import_shared5, authenticate, authorize, optionalAuthenticate;
var init_auth = __esm({
  "src/middleware/auth.ts"() {
    "use strict";
    import_jsonwebtoken2 = __toESM(require("jsonwebtoken"));
    init_config();
    init_errors();
    import_shared5 = require("@dpe-matching/shared");
    authenticate = (req, _res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          throw new UnauthorizedError("No token provided", import_shared5.ERROR_CODES.AUTH_UNAUTHORIZED);
        }
        const token = authHeader.substring(7);
        const decoded = import_jsonwebtoken2.default.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
      } catch (error) {
        if (error instanceof import_jsonwebtoken2.default.TokenExpiredError) {
          next(
            new UnauthorizedError(
              import_shared5.ERROR_MESSAGES[import_shared5.ERROR_CODES.AUTH_TOKEN_EXPIRED],
              import_shared5.ERROR_CODES.AUTH_TOKEN_EXPIRED
            )
          );
        } else if (error instanceof import_jsonwebtoken2.default.JsonWebTokenError) {
          next(
            new UnauthorizedError(
              import_shared5.ERROR_MESSAGES[import_shared5.ERROR_CODES.AUTH_TOKEN_INVALID],
              import_shared5.ERROR_CODES.AUTH_TOKEN_INVALID
            )
          );
        } else {
          next(error);
        }
      }
    };
    authorize = (...roles) => {
      return (req, _res, next) => {
        if (!req.user) {
          throw new UnauthorizedError("Authentication required", import_shared5.ERROR_CODES.AUTH_UNAUTHORIZED);
        }
        if (!roles.includes(req.user.role)) {
          throw new UnauthorizedError("Insufficient permissions", import_shared5.ERROR_CODES.AUTH_UNAUTHORIZED);
        }
        next();
      };
    };
    optionalAuthenticate = (req, _res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);
          const decoded = import_jsonwebtoken2.default.verify(token, config.jwt.secret);
          req.user = decoded;
        }
        next();
      } catch (error) {
        next();
      }
    };
  }
});

// src/vercel-entry.ts
var vercel_entry_exports = {};
__export(vercel_entry_exports, {
  default: () => vercel_entry_default
});
module.exports = __toCommonJS(vercel_entry_exports);

// src/app.ts
var import_express18 = __toESM(require("express"));
var import_helmet = __toESM(require("helmet"));
var import_cors = __toESM(require("cors"));
var import_compression = __toESM(require("compression"));
var import_swagger_ui_express = __toESM(require("swagger-ui-express"));
init_config();

// src/config/swagger.ts
var import_swagger_jsdoc = __toESM(require("swagger-jsdoc"));
init_config();
var swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "DPE-Leboncoin Matching API",
    version: "1.0.0",
    description: `
      API backend pour le syst\xE8me de matching entre diagnostics DPE et annonces Leboncoin.

      ## Fonctionnalit\xE9s

      - **Authentification**: JWT et API Keys
      - **DPE**: Gestion des diagnostics de performance \xE9nerg\xE9tique
      - **Annonces**: Gestion des annonces Leboncoin
      - **Matching**: Algorithme de scoring et clustering
      - **Clusters**: Validation et gestion des matches

      ## Authentification

      L'API supporte deux m\xE9thodes d'authentification:

      1. **JWT Token**: Pour les utilisateurs web (header: \`Authorization: Bearer <token>\`)
      2. **API Key**: Pour les int\xE9grations (header: \`X-API-Key: <key>\`)
    `,
    contact: {
      name: "API Support",
      email: "support@example.com"
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT"
    }
  },
  servers: [
    {
      url: `http://localhost:${config.server.port}`,
      description: "Development server"
    },
    {
      url: "https://api.production.example.com",
      description: "Production server"
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtenu via /api/auth/login"
      },
      apiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "API Key pour les int\xE9grations"
      }
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false
          },
          error: {
            type: "object",
            properties: {
              code: {
                type: "string",
                example: "VALIDATION_INVALID_INPUT"
              },
              message: {
                type: "string",
                example: "Invalid input data"
              },
              details: {
                type: "object",
                nullable: true
              }
            }
          }
        }
      },
      DPERecord: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          numeroDpe: {
            type: "string",
            description: "Num\xE9ro unique du DPE"
          },
          adresseBan: {
            type: "string"
          },
          codePostalBan: {
            type: "string"
          },
          typeBatiment: {
            type: "string",
            enum: ["APPARTEMENT", "MAISON"]
          },
          surfaceHabitable: {
            type: "number"
          },
          anneConstruction: {
            type: "integer",
            nullable: true
          },
          etiquetteDpe: {
            type: "string",
            enum: ["A", "B", "C", "D", "E", "F", "G"]
          },
          etiquetteGes: {
            type: "string",
            enum: ["A", "B", "C", "D", "E", "F", "G"]
          },
          coordonneeX: {
            type: "number",
            description: "Longitude"
          },
          coordonneeY: {
            type: "number",
            description: "Latitude"
          },
          dateEtablissement: {
            type: "string",
            format: "date-time"
          }
        }
      },
      LeboncoinAnnonce: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          listId: {
            type: "string",
            description: "ID Leboncoin"
          },
          url: {
            type: "string",
            format: "uri"
          },
          codePostal: {
            type: "string"
          },
          typeBien: {
            type: "string",
            enum: ["APPARTEMENT", "MAISON"]
          },
          surface: {
            type: "number"
          },
          pieces: {
            type: "integer",
            nullable: true
          },
          lat: {
            type: "number"
          },
          lng: {
            type: "number"
          },
          datePublication: {
            type: "string",
            format: "date-time"
          }
        }
      },
      MatchCluster: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          annonceId: {
            type: "string",
            format: "uuid"
          },
          statut: {
            type: "string",
            enum: ["EN_ATTENTE", "VALIDE", "REJETE"]
          },
          meilleurScore: {
            type: "number",
            minimum: 0,
            maximum: 100
          },
          nombreCandidats: {
            type: "integer"
          }
        }
      }
    }
  },
  tags: [
    {
      name: "Auth",
      description: "Authentication endpoints"
    },
    {
      name: "DPE",
      description: "DPE management"
    },
    {
      name: "Annonces",
      description: "Leboncoin annonces management"
    },
    {
      name: "Matching",
      description: "Matching algorithm"
    },
    {
      name: "Clusters",
      description: "Match clusters validation"
    },
    {
      name: "API Keys",
      description: "API key management"
    }
  ]
};
var options = {
  definition: swaggerDefinition,
  apis: [
    "./src/routes/*.ts",
    "./src/modules/*/*.controller.ts",
    "./src/modules/*/*.types.ts"
  ]
};
var swaggerSpec = (0, import_swagger_jsdoc.default)(options);

// src/middleware/error-handler.ts
var import_zod2 = require("zod");
var import_client = require("@prisma/client");
init_errors();

// src/utils/logger.ts
var import_winston = __toESM(require("winston"));
var import_path = __toESM(require("path"));
init_config();
var customFormat = import_winston.default.format.combine(
  import_winston.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  import_winston.default.format.errors({ stack: true }),
  import_winston.default.format.splat(),
  import_winston.default.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) {
      log += `
${stack}`;
    }
    const metadataKeys = Object.keys(metadata);
    if (metadataKeys.length > 0) {
      log += `
${JSON.stringify(metadata, null, 2)}`;
    }
    return log;
  })
);
var transports = [
  // Console transport
  new import_winston.default.transports.Console({
    format: import_winston.default.format.combine(import_winston.default.format.colorize(), customFormat)
  })
];
if (config.isProduction || config.isDevelopment) {
  transports.push(
    // Tous les logs
    new import_winston.default.transports.File({
      filename: import_path.default.join(config.logging.filePath, "combined.log"),
      format: customFormat
    }),
    // Logs d'erreur uniquement
    new import_winston.default.transports.File({
      filename: import_path.default.join(config.logging.filePath, "error.log"),
      level: "error",
      format: customFormat
    })
  );
}
var logger = import_winston.default.createLogger({
  level: config.logging.level,
  format: customFormat,
  transports,
  exitOnError: false
});

// src/middleware/error-handler.ts
init_config();
var import_shared2 = require("@dpe-matching/shared");
var errorHandler = (err, _req, res, _next) => {
  let error = err;
  if (!(error instanceof AppError)) {
    if (error instanceof import_zod2.ZodError) {
      error = new AppError(
        import_shared2.ERROR_MESSAGES[import_shared2.ERROR_CODES.VALIDATION_ERROR],
        422,
        import_shared2.ERROR_CODES.VALIDATION_ERROR,
        true,
        error.errors
      );
    } else if (error instanceof import_client.Prisma.PrismaClientKnownRequestError) {
      error = handlePrismaError(error);
    } else {
      error = new InternalServerError(
        config.isProduction ? import_shared2.ERROR_MESSAGES[import_shared2.ERROR_CODES.INTERNAL_SERVER_ERROR] : error.message,
        import_shared2.ERROR_CODES.INTERNAL_SERVER_ERROR,
        config.isDevelopment ? { originalError: error.message, stack: error.stack } : void 0
      );
    }
  }
  const appError = error;
  if (appError.statusCode >= 500) {
    logger.error("Server Error:", {
      code: appError.code,
      message: appError.message,
      stack: appError.stack,
      details: appError.details
    });
  } else if (appError.statusCode >= 400) {
    logger.warn("Client Error:", {
      code: appError.code,
      message: appError.message,
      details: appError.details
    });
  }
  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: config.isDevelopment ? appError.details : void 0
    },
    metadata: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var handlePrismaError = (error) => {
  switch (error.code) {
    case "P2002":
      return new AppError(
        import_shared2.ERROR_MESSAGES[import_shared2.ERROR_CODES.RESOURCE_ALREADY_EXISTS],
        409,
        import_shared2.ERROR_CODES.RESOURCE_ALREADY_EXISTS,
        true,
        { field: error.meta?.target }
      );
    case "P2025":
      return new AppError(
        import_shared2.ERROR_MESSAGES[import_shared2.ERROR_CODES.RESOURCE_NOT_FOUND],
        404,
        import_shared2.ERROR_CODES.RESOURCE_NOT_FOUND,
        true
      );
    case "P2003":
      return new AppError(
        "Foreign key constraint violation",
        400,
        import_shared2.ERROR_CODES.VALIDATION_ERROR,
        true,
        { field: error.meta?.field_name }
      );
    default:
      return new InternalServerError(
        "Database error",
        import_shared2.ERROR_CODES.INTERNAL_SERVER_ERROR,
        config.isDevelopment ? { code: error.code, meta: error.meta } : void 0
      );
  }
};
var notFoundHandler = (_req, _res, next) => {
  const error = new AppError("Route not found", 404, import_shared2.ERROR_CODES.RESOURCE_NOT_FOUND, true);
  next(error);
};

// src/middleware/rate-limiter.ts
var import_express_rate_limit = __toESM(require("express-rate-limit"));
init_config();
var import_shared3 = require("@dpe-matching/shared");
var generalRateLimiter = (0, import_express_rate_limit.default)({
  windowMs: config.rateLimit.windowMs,
  max: config.isDevelopment ? 1e4 : config.rateLimit.maxRequests,
  // Très permissif en dev
  message: {
    success: false,
    error: {
      code: import_shared3.ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: import_shared3.ERROR_MESSAGES[import_shared3.ERROR_CODES.RATE_LIMIT_EXCEEDED]
    },
    metadata: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: import_shared3.ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: import_shared3.ERROR_MESSAGES[import_shared3.ERROR_CODES.RATE_LIMIT_EXCEEDED]
      },
      metadata: {
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  }
});
var authRateLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 5,
  // 5 tentatives max
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: import_shared3.ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: "Trop de tentatives de connexion, veuillez r\xE9essayer dans 15 minutes"
    },
    metadata: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
var matchingRateLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 10,
  // 10 requêtes max par minute
  message: {
    success: false,
    error: {
      code: import_shared3.ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: "Trop de requ\xEAtes de matching, veuillez patienter"
    },
    metadata: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// src/routes/index.ts
var import_express17 = require("express");

// src/routes/auth.routes.ts
var import_express = require("express");

// src/modules/auth/auth.service.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
init_config();

// src/config/database.ts
var import_client2 = require("@prisma/client");
init_config();
var prisma = new import_client2.PrismaClient({
  log: config.isDevelopment ? [
    { level: "query", emit: "event" },
    { level: "error", emit: "stdout" },
    { level: "warn", emit: "stdout" }
  ] : [
    { level: "error", emit: "stdout" },
    { level: "warn", emit: "stdout" }
  ]
});
if (config.isDevelopment) {
  prisma.$on("query", (e) => {
    logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`);
  });
}

// src/modules/auth/auth.service.ts
init_errors();
var import_shared4 = require("@dpe-matching/shared");
var AuthService = class {
  /**
   * Enregistrer un nouvel utilisateur
   */
  async register(data) {
    const { email, password } = data;
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      throw new ConflictError("Cet email est d\xE9j\xE0 utilis\xE9", import_shared4.ERROR_CODES.RESOURCE_ALREADY_EXISTS);
    }
    const hashedPassword = await import_bcryptjs.default.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword
      }
    });
    const token = this.generateToken(user.id, user.email, user.role);
    logger.info("User registered successfully", { userId: user.id, email: user.email });
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      token
    };
  }
  /**
   * Connecter un utilisateur
   */
  async login(data) {
    const { email, password } = data;
    const user = await prisma.user.findUnique({
      where: { email }
    });
    if (!user) {
      throw new UnauthorizedError(
        "Email ou mot de passe incorrect",
        import_shared4.ERROR_CODES.AUTH_INVALID_CREDENTIALS
      );
    }
    const isPasswordValid = await import_bcryptjs.default.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError(
        "Email ou mot de passe incorrect",
        import_shared4.ERROR_CODES.AUTH_INVALID_CREDENTIALS
      );
    }
    const token = this.generateToken(user.id, user.email, user.role);
    logger.info("User logged in successfully", { userId: user.id, email: user.email });
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      token
    };
  }
  /**
   * Générer un token JWT
   */
  generateToken(userId, email, role) {
    return import_jsonwebtoken.default.sign(
      {
        userId,
        email,
        role
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn
      }
    );
  }
};
var authService = new AuthService();

// src/utils/async-handler.ts
var asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// src/modules/auth/auth.controller.ts
var authController = {
  /**
   * POST /api/auth/register
   * Enregistrer un nouvel utilisateur
   */
  register: asyncHandler(async (req, res) => {
    const data = req.body;
    const result = await authService.register(data);
    res.status(201).json({
      success: true,
      data: result
    });
  }),
  /**
   * POST /api/auth/login
   * Connecter un utilisateur
   */
  login: asyncHandler(async (req, res) => {
    const data = req.body;
    const result = await authService.login(data);
    res.json({
      success: true,
      data: result
    });
  }),
  /**
   * GET /api/auth/me
   * Récupérer les informations de l'utilisateur connecté
   */
  me: asyncHandler(async (req, res) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "AUTH_UNAUTHORIZED",
          message: "Non autoris\xE9"
        }
      });
      return;
    }
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.userId,
          email: req.user.email,
          role: req.user.role
        }
      }
    });
  })
};

// src/routes/auth.routes.ts
init_auth();

// src/middleware/validator.ts
var import_zod3 = require("zod");
init_errors();
var import_shared6 = require("@dpe-matching/shared");
var validate = (schema) => {
  return async (req, _res, next) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof import_zod3.ZodError) {
        next(
          new ValidationError(
            "Invalid request data",
            import_shared6.ERROR_CODES.VALIDATION_INVALID_INPUT,
            error.errors
          )
        );
      } else {
        next(error);
      }
    }
  };
};

// src/modules/auth/auth.types.ts
var import_zod4 = require("zod");
var RegisterBodySchema = import_zod4.z.object({
  body: import_zod4.z.object({
    email: import_zod4.z.string().email("Email invalide"),
    password: import_zod4.z.string().min(8, "Le mot de passe doit contenir au moins 8 caract\xE8res").regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule").regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule").regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
  })
});
var LoginBodySchema = import_zod4.z.object({
  body: import_zod4.z.object({
    email: import_zod4.z.string().email("Email invalide"),
    password: import_zod4.z.string().min(1, "Le mot de passe est requis")
  })
});

// src/routes/auth.routes.ts
var router = (0, import_express.Router)();
router.post("/register", validate(RegisterBodySchema), authController.register);
router.post("/login", validate(LoginBodySchema), authController.login);
router.get("/me", authenticate, authController.me);
var auth_routes_default = router;

// src/routes/dpe.routes.ts
var import_express2 = require("express");

// src/modules/dpe/dpe.repository.ts
var DpeRepository = class {
  async createDpe(data) {
    return await prisma.dpeRecord.create({
      data
    });
  }
  async getDpeById(id) {
    return await prisma.dpeRecord.findUnique({
      where: { id }
    });
  }
  async getDpeByNumeroDpe(numeroDpe) {
    return await prisma.dpeRecord.findUnique({
      where: { numeroDpe }
    });
  }
  async findDpesByFilters(filters) {
    const { limit, ...whereFilters } = filters;
    return await prisma.dpeRecord.findMany({
      where: whereFilters,
      take: limit,
      orderBy: { dateEtablissement: "desc" }
    });
  }
  async listDpes(page, limit) {
    const [dpes, total] = await Promise.all([
      prisma.dpeRecord.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma.dpeRecord.count()
    ]);
    return { dpes, total };
  }
  async searchDpesByAddress(address) {
    const cleanedAddress = address.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    const keywords = cleanedAddress.split(" ").filter((k) => k.length > 0);
    return await prisma.dpeRecord.findMany({
      where: {
        AND: keywords.map((keyword) => ({
          adresseBan: {
            contains: keyword,
            mode: "insensitive"
          }
        }))
      },
      take: 20,
      // Limiter à 20 résultats
      orderBy: { dateEtablissement: "desc" }
    });
  }
  async getDpesForMap(filters = {}) {
    const { limit = 5e4, dateMin, dateMax } = filters;
    const whereConditions = [
      { coordonneeX: { not: null } },
      { coordonneeY: { not: null } },
      { codePostalBan: { startsWith: "64" } }
      // Pau et alentours
    ];
    if (dateMin || dateMax) {
      const dateFilter = {};
      if (dateMin) dateFilter.gte = dateMin;
      if (dateMax) dateFilter.lte = dateMax;
      whereConditions.push({ dateEtablissement: dateFilter });
    }
    return await prisma.dpeRecord.findMany({
      where: {
        AND: whereConditions
      },
      take: limit,
      orderBy: { dateEtablissement: "desc" }
    });
  }
};
var dpeRepository = new DpeRepository();

// src/modules/dpe/dpe.service.ts
init_errors();
var DpeService = class {
  async createDpe(data) {
    const existing = await dpeRepository.getDpeByNumeroDpe(data.numeroDpe);
    if (existing) {
      throw new ConflictError("DPE record with this numero already exists");
    }
    return await dpeRepository.createDpe(data);
  }
  async getDpeById(id) {
    const dpe = await dpeRepository.getDpeById(id);
    if (!dpe) {
      throw new NotFoundError("DPE record not found");
    }
    return dpe;
  }
  async listDpes(page, limit) {
    return await dpeRepository.listDpes(page, limit);
  }
  async searchDpesByAddress(address) {
    return await dpeRepository.searchDpesByAddress(address);
  }
  async getDpesForMap(filters = {}) {
    return await dpeRepository.getDpesForMap(filters);
  }
};
var dpeService = new DpeService();

// src/modules/dpe/dpe.controller.ts
var DpeController = class {
  createDpe = asyncHandler(async (req, res) => {
    const dpe = await dpeService.createDpe(req.body);
    res.status(201).json({ success: true, data: dpe });
  });
  getDpe = asyncHandler(async (req, res) => {
    const dpe = await dpeService.getDpeById(req.params.id);
    res.json({ success: true, data: dpe });
  });
  listDpes = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const { dpes, total } = await dpeService.listDpes(Number(page), Number(limit));
    const totalPages = Math.ceil(total / Number(limit));
    res.json({
      success: true,
      data: {
        items: dpes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      }
    });
  });
  searchDpes = asyncHandler(async (req, res) => {
    const { address } = req.query;
    if (!address || typeof address !== "string") {
      return res.status(400).json({
        success: false,
        error: "Address parameter is required"
      });
    }
    const dpes = await dpeService.searchDpesByAddress(address);
    res.json({
      success: true,
      data: dpes
    });
  });
  getDpesForMap = asyncHandler(async (req, res) => {
    const { limit, dateMin, dateMax } = req.query;
    const filters = {};
    if (limit) filters.limit = Number(limit);
    if (dateMin) filters.dateMin = new Date(dateMin);
    if (dateMax) filters.dateMax = new Date(dateMax);
    const dpes = await dpeService.getDpesForMap(filters);
    res.json({
      success: true,
      data: dpes
    });
  });
};
var dpeController = new DpeController();

// src/middleware/api-key-auth.ts
init_errors();

// src/utils/crypto.ts
var import_crypto = __toESM(require("crypto"));
var generateApiKey = () => {
  const randomBytes = import_crypto.default.randomBytes(32);
  const key = randomBytes.toString("hex");
  return `dpm_${key}`;
};
var hashApiKey = (plainKey) => {
  return import_crypto.default.createHash("sha256").update(plainKey).digest("hex");
};
var generateAndHashApiKey = () => {
  const plainKey = generateApiKey();
  const hashedKey = hashApiKey(plainKey);
  return { plainKey, hashedKey };
};

// src/middleware/api-key-auth.ts
var import_shared7 = require("@dpe-matching/shared");
var authenticateApiKey = async (req, _res, next) => {
  try {
    let apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer dpm_")) {
        apiKey = authHeader.substring(7);
      }
    }
    if (!apiKey) {
      throw new UnauthorizedError(
        "API key required. Provide it via X-API-Key header or Authorization: Bearer header",
        import_shared7.ERROR_CODES.AUTH_UNAUTHORIZED
      );
    }
    if (!apiKey.startsWith("dpm_")) {
      throw new UnauthorizedError("Invalid API key format", import_shared7.ERROR_CODES.AUTH_TOKEN_INVALID);
    }
    const hashedKey = hashApiKey(apiKey);
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
      select: {
        id: true,
        userId: true,
        permissions: true,
        isActive: true,
        expiresAt: true
      }
    });
    if (!apiKeyRecord) {
      logger.warn("Invalid API key attempt", { key: apiKey.substring(0, 10) + "..." });
      throw new UnauthorizedError("Invalid API key", import_shared7.ERROR_CODES.AUTH_TOKEN_INVALID);
    }
    if (!apiKeyRecord.isActive) {
      throw new UnauthorizedError("API key is disabled", import_shared7.ERROR_CODES.AUTH_TOKEN_INVALID);
    }
    if (apiKeyRecord.expiresAt && /* @__PURE__ */ new Date() > apiKeyRecord.expiresAt) {
      throw new UnauthorizedError("API key has expired", import_shared7.ERROR_CODES.AUTH_TOKEN_EXPIRED);
    }
    req.apiKey = {
      id: apiKeyRecord.id,
      userId: apiKeyRecord.userId ?? void 0,
      permissions: apiKeyRecord.permissions
    };
    prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: /* @__PURE__ */ new Date() }
    }).catch((error) => {
      logger.error("Failed to update API key lastUsedAt:", error);
    });
    logger.info("API key authenticated", { keyId: apiKeyRecord.id });
    next();
  } catch (error) {
    next(error);
  }
};
var authenticateJwtOrApiKey = async (req, res, next) => {
  const hasApiKey = req.headers["x-api-key"] || req.headers.authorization?.startsWith("Bearer dpm_");
  if (hasApiKey) {
    return authenticateApiKey(req, res, next);
  }
  const { authenticate: authenticate2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
  return authenticate2(req, res, next);
};

// src/modules/dpe/dpe.types.ts
var import_zod5 = require("zod");
var import_shared8 = require("@dpe-matching/shared");
var CreateDpeSchema = import_zod5.z.object({
  body: import_shared8.CreateDpeRecordSchema
});
var GetDpeSchema = import_zod5.z.object({
  params: import_zod5.z.object({
    id: import_zod5.z.string().uuid()
  })
});

// src/routes/dpe.routes.ts
var router2 = (0, import_express2.Router)();
router2.post("/", authenticateJwtOrApiKey, validate(CreateDpeSchema), dpeController.createDpe);
router2.get("/search", dpeController.searchDpes);
router2.get("/map", dpeController.getDpesForMap);
router2.get("/:id", validate(GetDpeSchema), dpeController.getDpe);
router2.get("/", dpeController.listDpes);
var dpe_routes_default = router2;

// src/routes/annonces.routes.ts
var import_express3 = require("express");

// src/modules/annonces/annonces.repository.ts
var AnnoncesRepository = class {
  async createAnnonce(data) {
    return await prisma.leboncoinAnnonce.create({
      data
    });
  }
  async getAnnonceById(id) {
    return await prisma.leboncoinAnnonce.findUnique({
      where: { id },
      include: {
        tracking: true
      }
    });
  }
  async getAnnonceByListId(listId) {
    return await prisma.leboncoinAnnonce.findUnique({
      where: { listId }
    });
  }
  async listAnnonces(page, limit) {
    const where = {
      statutAnnonce: {
        not: "DESACTIVEE"
        // Exclure les annonces désactivées
      }
    };
    const [annonces, total] = await Promise.all([
      prisma.leboncoinAnnonce.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { datePublication: "desc" }
      }),
      prisma.leboncoinAnnonce.count({ where })
    ]);
    return { annonces, total };
  }
  async getAnnoncesWithoutDpe(limit) {
    const annonces = await prisma.$queryRaw`
      SELECT la.*
      FROM leboncoin_annonces la
      LEFT JOIN match_clusters mc ON la.id = mc."annonceId"
      WHERE mc.id IS NULL
        AND la."rawData"->>'location' IS NOT NULL
        AND la."statutAnnonce" != 'DESACTIVEE'
      ORDER BY la."datePublication" DESC
      LIMIT ${limit}
    `;
    return annonces.map((annonce) => ({
      ...annonce,
      rawData: typeof annonce.rawData === "string" ? JSON.parse(annonce.rawData) : annonce.rawData
    }));
  }
};
var annoncesRepository = new AnnoncesRepository();

// src/modules/annonces/annonces.service.ts
init_errors();
var AnnoncesService = class {
  async createAnnonce(data) {
    const listId = typeof data.listId === "bigint" ? data.listId : BigInt(data.listId);
    const existing = await annoncesRepository.getAnnonceByListId(listId);
    if (existing) {
      throw new ConflictError("Annonce with this listId already exists");
    }
    return await annoncesRepository.createAnnonce(data);
  }
  async getAnnonceById(id) {
    const annonce = await annoncesRepository.getAnnonceById(id);
    if (!annonce) {
      throw new NotFoundError("Annonce not found");
    }
    return annonce;
  }
  async listAnnonces(page, limit) {
    return await annoncesRepository.listAnnonces(page, limit);
  }
  async getAnnoncesWithoutDpe(limit) {
    return await annoncesRepository.getAnnoncesWithoutDpe(limit);
  }
};
var annoncesService = new AnnoncesService();

// src/modules/annonces/annonces.controller.ts
var AnnoncesController = class {
  createAnnonce = asyncHandler(async (req, res) => {
    const annonce = await annoncesService.createAnnonce(req.body);
    res.status(201).json({ success: true, data: annonce });
  });
  getAnnonce = asyncHandler(async (req, res) => {
    const annonce = await annoncesService.getAnnonceById(req.params.id);
    res.json({ success: true, data: annonce });
  });
  listAnnonces = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const { annonces, total } = await annoncesService.listAnnonces(Number(page), Number(limit));
    const totalPages = Math.ceil(total / Number(limit));
    res.json({
      success: true,
      data: {
        items: annonces,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      }
    });
  });
  listAnnoncesWithoutDpe = asyncHandler(async (req, res) => {
    const { limit = 5e3 } = req.query;
    const annonces = await annoncesService.getAnnoncesWithoutDpe(Number(limit));
    res.json({
      success: true,
      data: {
        items: annonces,
        total: annonces.length
      }
    });
  });
};
var annoncesController = new AnnoncesController();

// src/modules/annonces/annonces.types.ts
var import_zod6 = require("zod");
var import_shared9 = require("@dpe-matching/shared");
var CreateAnnonceSchema = import_zod6.z.object({
  body: import_shared9.CreateLeboncoinAnnonceSchema
});
var GetAnnonceSchema = import_zod6.z.object({
  params: import_zod6.z.object({
    id: import_zod6.z.string().uuid()
  })
});

// src/routes/annonces.routes.ts
var router3 = (0, import_express3.Router)();
router3.post(
  "/",
  authenticateJwtOrApiKey,
  validate(CreateAnnonceSchema),
  annoncesController.createAnnonce
);
router3.get("/without-dpe", annoncesController.listAnnoncesWithoutDpe);
router3.get("/:id", validate(GetAnnonceSchema), annoncesController.getAnnonce);
router3.get("/", annoncesController.listAnnonces);
var annonces_routes_default = router3;

// src/routes/matching.routes.ts
var import_express4 = require("express");

// src/modules/matching/matching.service.ts
var import_shared10 = require("@dpe-matching/shared");

// src/utils/distance.ts
var calculateGPSDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const \u03C61 = lat1 * Math.PI / 180;
  const \u03C62 = lat2 * Math.PI / 180;
  const \u0394\u03C6 = (lat2 - lat1) * Math.PI / 180;
  const \u0394\u03BB = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(\u0394\u03C6 / 2) * Math.sin(\u0394\u03C6 / 2) + Math.cos(\u03C61) * Math.cos(\u03C62) * Math.sin(\u0394\u03BB / 2) * Math.sin(\u0394\u03BB / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
var calculateDaysDifference = (date1, date2) => {
  const diffTime = Math.abs(date1.getTime() - date2.getTime());
  return Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
};
var parsePeriodeConstruction = (periode) => {
  if (!periode || typeof periode !== "string") return null;
  const cleaned = periode.trim().toLowerCase();
  if (cleaned.startsWith("avant")) {
    const match = cleaned.match(/(\d{4})/);
    if (match) {
      const annee = parseInt(match[1], 10);
      return { anneeMin: 1800, anneeMax: annee - 1 };
    }
  }
  if (cleaned.startsWith("apr\xE8s") || cleaned.startsWith("apres")) {
    const match = cleaned.match(/(\d{4})/);
    if (match) {
      const annee = parseInt(match[1], 10);
      return { anneeMin: annee + 1, anneeMax: (/* @__PURE__ */ new Date()).getFullYear() };
    }
  }
  const rangeMatch = cleaned.match(/(\d{4})\s*[-àa]\s*(\d{4})/);
  if (rangeMatch) {
    return {
      anneeMin: parseInt(rangeMatch[1], 10),
      anneeMax: parseInt(rangeMatch[2], 10)
    };
  }
  const singleMatch = cleaned.match(/^(\d{4})$/);
  if (singleMatch) {
    const annee = parseInt(singleMatch[1], 10);
    return { anneeMin: annee, anneeMax: annee };
  }
  return null;
};
var compareConstructionPeriods = (annonceAnnee, dpePeriode, dpeAnnee) => {
  if (annonceAnnee && dpeAnnee) {
    const diff = Math.abs(annonceAnnee - dpeAnnee);
    if (diff === 0) return 10;
    if (diff <= 2) return 8;
    if (diff <= 5) return 10;
    return 0;
  }
  if (annonceAnnee && !dpeAnnee && dpePeriode) {
    const parsed = parsePeriodeConstruction(dpePeriode);
    if (parsed) {
      if (annonceAnnee >= parsed.anneeMin && annonceAnnee <= parsed.anneeMax) {
        return 10;
      }
      return 0;
    }
  }
  return 0;
};

// src/utils/quartiers-pau-leboncoin.ts
var QUARTIERS_PAU_LEBONCOIN = [
  // Centre-ville (zone historique et commerciale)
  {
    name: "Centre-ville",
    ville: "Pau",
    codePostal: ["64000"],
    coordinates: [
      [-0.38, 43.292],
      // SO
      [-0.36, 43.292],
      // SE
      [-0.36, 43.305],
      // NE
      [-0.38, 43.305],
      // NO
      [-0.38, 43.292]
    ],
    center: [-0.37, 43.2985]
    // Boulevard des Pyrénées
  },
  // Dufau - Tourasse (quartier résidentiel est)
  {
    name: "Dufau - Tourasse",
    ville: "Pau",
    codePostal: ["64000"],
    coordinates: [
      [-0.36, 43.287],
      // SO
      [-0.345, 43.287],
      // SE
      [-0.345, 43.298],
      // NE
      [-0.36, 43.298],
      // NO
      [-0.36, 43.287]
    ],
    center: [-0.3525, 43.2925]
    // Rue Dufau
  },
  // Le Hameau (quartier ouest)
  {
    name: "Le Hameau",
    ville: "Pau",
    codePostal: ["64000"],
    coordinates: [
      [-0.39, 43.298],
      // SO
      [-0.375, 43.298],
      // SE
      [-0.375, 43.312],
      // NE
      [-0.39, 43.312],
      // NO
      [-0.39, 43.298]
    ],
    center: [-0.3825, 43.305]
    // Quartier Hameau
  },
  // Pau Nord (secteur nord avec université et quartiers récents)
  {
    name: "Pau Nord",
    ville: "Pau",
    codePostal: ["64000"],
    coordinates: [
      [-0.38, 43.305],
      // SO
      [-0.34, 43.305],
      // SE
      [-0.34, 43.33],
      // NE
      [-0.38, 43.33],
      // NO
      [-0.38, 43.305]
    ],
    center: [-0.36, 43.3175]
    // Zone Université / Ousse-des-Bois
  },
  // Pau Sud (secteur sud avec quartiers résidentiels)
  {
    name: "Pau Sud",
    ville: "Pau",
    codePostal: ["64000"],
    coordinates: [
      [-0.38, 43.27],
      // SO
      [-0.33, 43.27],
      // SE
      [-0.33, 43.287],
      // NE
      [-0.38, 43.287],
      // NO
      [-0.38, 43.27]
    ],
    center: [-0.355, 43.2785]
    // Zone Trespoey / Buros
  }
];

// src/utils/quartiers.ts
var QUARTIERS_DATABASE = [
  // PAU (64000) - 5 quartiers alignés avec l'API Leboncoin
  ...QUARTIERS_PAU_LEBONCOIN,
  // PARIS - Exemples de quartiers
  {
    name: "Marais",
    ville: "Paris",
    codePostal: ["75003", "75004"],
    coordinates: [
      [2.3522, 48.8566],
      [2.3622, 48.8566],
      [2.3622, 48.8616],
      [2.3522, 48.8616],
      [2.3522, 48.8566]
    ],
    center: [2.3572, 48.8591]
  },
  {
    name: "Montmartre",
    ville: "Paris",
    codePostal: ["75018"],
    coordinates: [
      [2.3388, 48.8847],
      [2.3488, 48.8847],
      [2.3488, 48.8897],
      [2.3388, 48.8897],
      [2.3388, 48.8847]
    ],
    center: [2.3438, 48.8872]
  },
  {
    name: "Quartier Latin",
    ville: "Paris",
    codePostal: ["75005"],
    coordinates: [
      [2.3444, 48.8449],
      [2.3544, 48.8449],
      [2.3544, 48.8499],
      [2.3444, 48.8499],
      [2.3444, 48.8449]
    ],
    center: [2.3494, 48.8474]
  }
];
function isPointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}
function findQuartier(lng, lat, codePostal) {
  const point = [lng, lat];
  let candidates = QUARTIERS_DATABASE;
  if (codePostal) {
    candidates = candidates.filter((q) => q.codePostal.includes(codePostal));
  }
  for (const quartier of candidates) {
    if (isPointInPolygon(point, quartier.coordinates)) {
      return quartier;
    }
  }
  return null;
}
function findQuartiersNearby(lng, lat, maxDistance = 2e3, codePostal) {
  let candidates = QUARTIERS_DATABASE;
  if (codePostal) {
    candidates = candidates.filter((q) => q.codePostal.includes(codePostal));
  }
  const results = [];
  for (const quartier of candidates) {
    const distance = calculateDistance(lat, lng, quartier.center[1], quartier.center[0]);
    if (distance <= maxDistance) {
      results.push({
        ...quartier,
        distance: Math.round(distance)
      });
    }
  }
  return results.sort((a, b) => a.distance - b.distance);
}
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const \u03C61 = lat1 * Math.PI / 180;
  const \u03C62 = lat2 * Math.PI / 180;
  const \u0394\u03C6 = (lat2 - lat1) * Math.PI / 180;
  const \u0394\u03BB = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(\u0394\u03C6 / 2) * Math.sin(\u0394\u03C6 / 2) + Math.cos(\u03C61) * Math.cos(\u03C62) * Math.sin(\u0394\u03BB / 2) * Math.sin(\u0394\u03BB / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function normalizeQuartierName(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
}
function searchQuartierByName(name, ville) {
  const normalized = normalizeQuartierName(name);
  let candidates = QUARTIERS_DATABASE;
  if (ville) {
    const normalizedVille = normalizeQuartierName(ville);
    candidates = candidates.filter((q) => normalizeQuartierName(q.ville) === normalizedVille);
  }
  for (const quartier of candidates) {
    const quartierNormalized = normalizeQuartierName(quartier.name);
    if (quartierNormalized === normalized || quartierNormalized.includes(normalized)) {
      return quartier;
    }
  }
  return null;
}
function getQuartiersByVille(ville) {
  const normalizedVille = normalizeQuartierName(ville);
  return QUARTIERS_DATABASE.filter((q) => normalizeQuartierName(q.ville) === normalizedVille);
}

// src/utils/coordinates.ts
var import_proj4 = __toESM(require("proj4"));
var lambert93 = "+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs";
var wgs84 = "+proj=longlat +datum=WGS84 +no_defs +type=crs";
function lambert93ToWGS84(x, y) {
  try {
    const [lng, lat] = (0, import_proj4.default)(lambert93, wgs84, [x, y]);
    return [lng, lat];
  } catch (error) {
    console.error(`Erreur conversion Lambert93 \u2192 WGS84: ${error}`);
    return [0, 0];
  }
}

// src/modules/matching/matching.service.ts
var MatchingService = class {
  /**
   * Calcule le matching entre une annonce et des DPE candidats
   * @param annonce Annonce Leboncoin
   * @param dpes Liste des DPE candidats
   * @param options Options de matching
   * @returns Résultat du matching avec les candidats scorés
   */
  async matchAnnonceToDpes(annonce, dpes, options2 = {}) {
    const startTime = Date.now();
    const {
      maxCandidats = import_shared10.DEFAULT_MAX_CANDIDATS,
      seuilScoreMinimum = import_shared10.DEFAULT_SEUIL_SCORE_MINIMUM,
      distanceMaxGPS = import_shared10.DEFAULT_DISTANCE_MAX_GPS,
      includeScoreDetails = true
    } = options2;
    logger.info(`Starting matching for annonce ${annonce.id} with ${dpes.length} DPE candidates`);
    const candidatsWithDpe = dpes.map((dpe) => ({
      dpe,
      score: this.calculateMatchScore(annonce, dpe, includeScoreDetails)
    }));
    const candidatsScores = candidatsWithDpe.filter(({ dpe, score: candidat }) => {
      if (!candidat.scoreDetails.eliminatoires.codePostal || !candidat.scoreDetails.eliminatoires.typeBien) {
        return false;
      }
      const details = candidat.scoreDetails;
      if (details.scoreBase.dpe === 0 || details.scoreBase.ges === 0) {
        return false;
      }
      if (annonce.surface && dpe.surfaceHabitable) {
        const diffSurface = Math.abs(annonce.surface - dpe.surfaceHabitable);
        if (diffSurface > 5) {
          if (diffSurface > 15) {
            return false;
          }
          const criteresFortsOK = (details.scoreBase.coutEnergie >= 15 ? 1 : 0) + // Coût énergie OK (seuil ajusté pour 30pts max)
          (details.scoreBase.timing >= 3 ? 1 : 0) + // Date proche
          (details.scoreBase.annee >= 5 ? 1 : 0) + // Année/période OK
          (details.scoreBase.chauffage >= 3 ? 1 : 0);
          if (criteresFortsOK < 2) {
            return false;
          }
        }
      }
      if (candidat.scoreNormalized < seuilScoreMinimum) {
        return false;
      }
      if (candidat.distanceGps !== null && candidat.distanceGps > distanceMaxGPS) {
        return false;
      }
      return true;
    }).map(({ score }) => score).sort((a, b) => b.scoreNormalized - a.scoreNormalized).slice(0, maxCandidats).map((candidat, index) => ({
      ...candidat,
      rang: index + 1
    }));
    const executionTimeMs = Date.now() - startTime;
    logger.info(
      `Matching completed in ${executionTimeMs}ms. Found ${candidatsScores.length} valid candidates`
    );
    return {
      clusterId: "",
      // À définir lors de la sauvegarde
      annonceId: annonce.id,
      candidats: candidatsScores,
      nombreCandidats: candidatsScores.length,
      meilleurScore: candidatsScores.length > 0 ? candidatsScores[0].scoreNormalized : 0,
      executionTimeMs
    };
  }
  /**
   * Calcule le score de matching entre une annonce et un DPE
   * @param annonce Annonce Leboncoin
   * @param dpe DPE record
   * @param includeDetails Inclure les détails du score
   * @returns Candidat avec score
   */
  calculateMatchScore(annonce, dpe, includeDetails) {
    const eliminatoires = {
      codePostal: annonce.codePostal === dpe.codePostalBan,
      typeBien: annonce.typeBien === dpe.typeBatiment
    };
    const scoreBase = {
      dpe: 0,
      ges: 0,
      surface: 0,
      surfaceTerrain: 0,
      annee: 0,
      pieces: 0,
      niveauxEtage: 0,
      chauffage: 0,
      timing: 0,
      coutEnergie: 0
    };
    const bonus = {
      distanceGPS: 0,
      ville: 0,
      quartier: 0,
      rue: 0,
      chambres: 0,
      orientation: 0,
      exterieur: 0,
      traversant: 0
    };
    if (!eliminatoires.codePostal || !eliminatoires.typeBien) {
      return {
        dpeId: dpe.id,
        scoreTotal: 0,
        scoreBase: 0,
        scoreBonus: 0,
        scoreNormalized: 0,
        confiance: import_shared10.NiveauConfiance.DOUTEUX,
        scoreDetails: { eliminatoires, scoreBase, bonus },
        distanceGps: null,
        estSelectionne: false
      };
    }
    if (annonce.etiquetteDpe && annonce.etiquetteDpe === dpe.etiquetteDpe) {
      scoreBase.dpe = import_shared10.MAX_SCORES.DPE;
    }
    if (annonce.etiquetteGes && annonce.etiquetteGes === dpe.etiquetteGes) {
      scoreBase.ges = import_shared10.MAX_SCORES.GES;
    }
    if (annonce.surface && dpe.surfaceHabitable) {
      const surfaceDiffAbsolute = Math.abs(annonce.surface - dpe.surfaceHabitable);
      if (surfaceDiffAbsolute <= 2) {
        scoreBase.surface = 5;
      } else if (surfaceDiffAbsolute <= 5) {
        scoreBase.surface = 3;
      }
    }
    let surfaceTerrainAnnonce;
    if (annonce.rawData && typeof annonce.rawData === "object") {
      const rawData = annonce.rawData;
      if (rawData.attributes && Array.isArray(rawData.attributes)) {
        const landPlotAttr = rawData.attributes.find(
          (attr) => attr.key === "land_plot_surface"
        );
        if (landPlotAttr && landPlotAttr.value) {
          surfaceTerrainAnnonce = parseInt(landPlotAttr.value);
        }
      }
    }
    const surfaceTerrainDpe = dpe.surfaceTerrain;
    if (surfaceTerrainAnnonce && surfaceTerrainDpe) {
      const diffAbsolue = Math.abs(surfaceTerrainAnnonce - surfaceTerrainDpe);
      const diffPourcent = diffAbsolue / surfaceTerrainAnnonce * 100;
      if (diffPourcent <= 10) {
        scoreBase.surfaceTerrain = 10;
      } else if (diffPourcent <= 20) {
        scoreBase.surfaceTerrain = 6;
      } else if (diffPourcent <= 30) {
        scoreBase.surfaceTerrain = 3;
      }
    }
    const dpePeriode = dpe.rawData?.periode_construction;
    scoreBase.annee = compareConstructionPeriods(
      annonce.anneConstruction,
      dpePeriode,
      dpe.anneConstruction
    );
    const referenceDate = annonce.dateDpe || annonce.datePublication;
    const dateVisiteDiagnostiqueur = dpe.rawData?.date_visite_diagnostiqueur;
    let dpeReferenceDate = dpe.dateEtablissement;
    if (dateVisiteDiagnostiqueur) {
      try {
        dpeReferenceDate = new Date(dateVisiteDiagnostiqueur);
      } catch (e) {
      }
    }
    const daysDiff = calculateDaysDifference(referenceDate, dpeReferenceDate);
    if (daysDiff <= import_shared10.TIMING_THRESHOLDS.PERFECT) {
      scoreBase.timing = 15;
    } else if (daysDiff <= import_shared10.TIMING_THRESHOLDS.EXCELLENT) {
      scoreBase.timing = 12;
    } else if (daysDiff <= import_shared10.TIMING_THRESHOLDS.GOOD) {
      scoreBase.timing = 8;
    } else if (daysDiff <= import_shared10.TIMING_THRESHOLDS.ACCEPTABLE) {
      scoreBase.timing = 3;
    }
    const coutEnergieDpe = parseFloat(dpe.rawData?.cout_total_5_usages || "0");
    if (coutEnergieDpe > 0 && annonce.rawData) {
      const bodyText = annonce.rawData?.body || "";
      const coutMatch = bodyText.match(/entre\s+([\d\s]+)\s*€\s*et\s+([\d\s]+)\s*€/i);
      if (coutMatch) {
        const coutMin = parseInt(coutMatch[1].replace(/\s/g, ""));
        const coutMax = parseInt(coutMatch[2].replace(/\s/g, ""));
        if (coutEnergieDpe >= coutMin && coutEnergieDpe <= coutMax) {
          scoreBase.coutEnergie = 30;
        } else {
          const coutMoyen = (coutMin + coutMax) / 2;
          const ecartPourcent = Math.abs((coutEnergieDpe - coutMoyen) / coutMoyen) * 100;
          if (ecartPourcent <= 5) {
            scoreBase.coutEnergie = 25;
          } else if (ecartPourcent <= 10) {
            scoreBase.coutEnergie = 20;
          } else if (ecartPourcent <= 15) {
            scoreBase.coutEnergie = 15;
          } else if (ecartPourcent <= 20) {
            scoreBase.coutEnergie = 10;
          } else if (ecartPourcent <= 30) {
            scoreBase.coutEnergie = 5;
          }
        }
      }
    }
    let distanceGps = null;
    if (annonce.lat && annonce.lng && dpe.coordonneeX && dpe.coordonneeY) {
      distanceGps = calculateGPSDistance(
        annonce.lat,
        annonce.lng,
        dpe.coordonneeY,
        dpe.coordonneeX
      );
      if (distanceGps < import_shared10.GPS_DISTANCE_THRESHOLDS.EXCELLENT) {
        bonus.distanceGPS = import_shared10.MAX_BONUS.DISTANCE_GPS;
      } else if (distanceGps < import_shared10.GPS_DISTANCE_THRESHOLDS.GOOD) {
        bonus.distanceGPS = 7;
      } else if (distanceGps < import_shared10.GPS_DISTANCE_THRESHOLDS.ACCEPTABLE) {
        bonus.distanceGPS = 4;
      }
    }
    const annonceVille = this.getVilleFromAnnonce(annonce);
    const dpeVille = dpe.nomCommune;
    if (annonceVille && dpeVille) {
      const annonceNorm = this.normalizeVilleName(annonceVille);
      const dpeNorm = this.normalizeVilleName(dpeVille);
      if (annonceNorm === dpeNorm) {
        bonus.ville = import_shared10.MAX_BONUS.VILLE;
        logger.debug(`Ville match: ${annonceVille} = ${dpeVille}`);
      }
    }
    const annonceQuartier = this.getQuartierFromAnnonce(annonce);
    const dpeQuartier = this.getQuartierFromDpe(dpe);
    if (annonceQuartier && dpeQuartier) {
      const annonceNorm = normalizeQuartierName(annonceQuartier);
      const dpeNorm = normalizeQuartierName(dpeQuartier);
      if (annonceNorm === dpeNorm) {
        bonus.quartier = import_shared10.MAX_BONUS.QUARTIER;
        logger.debug(`Quartier match: ${annonceQuartier} = ${dpeQuartier}`);
      }
    }
    const dpeTraversant = dpe.rawData?.logement_traversant === "1";
    if (dpeTraversant && annonce.rawData) {
      const bodyText = (annonce.rawData?.body || "").toLowerCase();
      const subjectText = (annonce.rawData?.subject || "").toLowerCase();
      if (bodyText.includes("traversant") || subjectText.includes("traversant") || bodyText.includes("double exposition")) {
        bonus.traversant = import_shared10.MAX_BONUS.TRAVERSANT;
      }
    }
    const totalScoreBase = Object.values(scoreBase).reduce(
      (sum, score) => sum + score,
      0
    );
    const totalBonus = Object.values(bonus).reduce((sum, score) => sum + score, 0);
    const scoreTotal = totalScoreBase + totalBonus;
    const scoreNormalized = scoreTotal / import_shared10.SCORE_TOTAL_MAX * 100;
    const confiance = this.calculateConfiance(scoreNormalized);
    const scoreDetails = {
      eliminatoires,
      scoreBase,
      bonus
    };
    return {
      dpeId: dpe.id,
      scoreTotal,
      scoreBase: totalScoreBase,
      scoreBonus: totalBonus,
      scoreNormalized,
      confiance,
      scoreDetails: includeDetails ? scoreDetails : {},
      distanceGps,
      estSelectionne: false
    };
  }
  /**
   * Détermine le niveau de confiance basé sur le score normalisé
   * @param scoreNormalized Score normalisé (0-100)
   * @returns Niveau de confiance
   */
  calculateConfiance(scoreNormalized) {
    if (scoreNormalized >= import_shared10.CONFIANCE_THRESHOLDS.CERTAIN) {
      return import_shared10.NiveauConfiance.CERTAIN;
    } else if (scoreNormalized >= import_shared10.CONFIANCE_THRESHOLDS.TRES_FIABLE) {
      return import_shared10.NiveauConfiance.TRES_FIABLE;
    } else if (scoreNormalized >= import_shared10.CONFIANCE_THRESHOLDS.PROBABLE) {
      return import_shared10.NiveauConfiance.PROBABLE;
    } else if (scoreNormalized >= import_shared10.CONFIANCE_THRESHOLDS.POSSIBLE) {
      return import_shared10.NiveauConfiance.POSSIBLE;
    } else {
      return import_shared10.NiveauConfiance.DOUTEUX;
    }
  }
  /**
   * Extrait la ville d'une annonce Leboncoin
   * Cherche dans rawData.location.city_label ou city
   */
  getVilleFromAnnonce(annonce) {
    if (annonce.rawData && typeof annonce.rawData === "object") {
      const rawData = annonce.rawData;
      if (rawData.location?.city_label) {
        return rawData.location.city_label;
      }
      if (rawData.location?.city) {
        return rawData.location.city;
      }
    }
    return null;
  }
  /**
   * Normalise un nom de ville pour comparaison
   * Enlève les accents, met en minuscules, enlève espaces et tirets
   */
  normalizeVilleName(ville) {
    return ville.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-\s]/g, "");
  }
  /**
   * Extrait le quartier d'une annonce Leboncoin
   * Cherche d'abord dans rawData.location.district, puis géolocalise via GPS
   */
  getQuartierFromAnnonce(annonce) {
    if (annonce.rawData && typeof annonce.rawData === "object") {
      const rawData = annonce.rawData;
      if (rawData.location?.district) {
        return rawData.location.district;
      }
    }
    if (annonce.rawData && typeof annonce.rawData === "object") {
      const rawData = annonce.rawData;
      const body = (rawData.body || "").toLowerCase();
      const subject = (rawData.subject || "").toLowerCase();
      const fullText = body + " " + subject;
      const quartiersToSearch = [
        "hameau",
        "trespoey",
        "saragosse",
        "dufau",
        "tourasse",
        "xiv juillet",
        "14 juillet",
        "ousse des bois",
        "universit\xE9",
        "centre-ville",
        "pau sud",
        "pau nord"
      ];
      for (const q of quartiersToSearch) {
        if (fullText.includes(q)) {
          if (q === "hameau") return "Le Hameau";
          if (q === "trespoey") return "Trespoey";
          if (q === "saragosse") return "Saragosse";
          if (q === "dufau" || q === "tourasse") return "Dufau - Tourasse";
          if (q.includes("14 juillet") || q.includes("xiv juillet")) return "XIV Juillet";
          if (q === "ousse des bois") return "Ousse des Bois";
          if (q === "universit\xE9") return "Universit\xE9";
          if (q === "centre-ville") return "Centre-ville";
        }
      }
    }
    if (annonce.lat && annonce.lng && annonce.codePostal) {
      const quartier = findQuartier(annonce.lng, annonce.lat, annonce.codePostal);
      if (quartier) {
        return quartier.name;
      }
    }
    return null;
  }
  /**
   * Extrait le quartier d'un DPE
   * Utilise les coordonnées GPS pour déterminer le quartier
   */
  getQuartierFromDpe(dpe) {
    if (dpe.coordonneeX && dpe.coordonneeY && dpe.codePostalBan) {
      const [lng, lat] = lambert93ToWGS84(dpe.coordonneeX, dpe.coordonneeY);
      const quartier = findQuartier(lng, lat, dpe.codePostalBan);
      if (quartier) {
        return quartier.name;
      }
    }
    return null;
  }
};
var matchingService = new MatchingService();

// src/modules/matching/matching.repository.ts
var import_shared11 = require("@dpe-matching/shared");
var MatchingRepository = class {
  prisma = prisma;
  async createMatchCluster(annonceId, candidats, meilleurScore) {
    logger.info("Creating match cluster");
    const cluster = await prisma.matchCluster.create({
      data: {
        annonceId,
        nombreCandidats: candidats.length,
        meilleurScore,
        statut: import_shared11.StatutValidation.NON_VERIFIE,
        candidats: {
          create: candidats.map((c) => ({
            dpeId: c.dpeId,
            scoreTotal: c.scoreTotal,
            scoreBase: c.scoreBase,
            scoreBonus: c.scoreBonus,
            scoreNormalized: c.scoreNormalized,
            confiance: c.confiance,
            scoreDetails: c.scoreDetails,
            distanceGps: c.distanceGps,
            rang: c.rang,
            estSelectionne: c.estSelectionne
          }))
        }
      },
      include: {
        annonce: true,
        candidats: {
          include: {
            dpe: true
          },
          orderBy: {
            rang: "asc"
          }
        }
      }
    });
    return cluster;
  }
  async getMatchClusterById(id) {
    const cluster = await prisma.matchCluster.findUnique({
      where: { id },
      include: {
        annonce: {
          include: {
            tracking: true
            // Inclure le statut de tracking
          }
        },
        candidats: {
          include: {
            dpe: true
          },
          orderBy: {
            rang: "asc"
          }
        }
      }
    });
    return cluster;
  }
  async getClusterByAnnonceId(annonceId) {
    const cluster = await prisma.matchCluster.findUnique({
      where: { annonceId },
      include: {
        annonce: true,
        candidats: {
          include: {
            dpe: true
          },
          orderBy: {
            rang: "asc"
          }
        }
      }
    });
    return cluster;
  }
  async listMatchClusters(page, limit, statut) {
    const where = statut ? { statut } : {};
    where.annonce = {
      statutAnnonce: {
        not: "DESACTIVEE"
      }
    };
    const [clusters, total] = await Promise.all([
      prisma.matchCluster.findMany({
        where,
        include: {
          annonce: true
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.matchCluster.count({ where })
    ]);
    return {
      clusters,
      total
    };
  }
  async getCandidatesByClusterId(clusterId) {
    const candidates = await prisma.matchCandidat.findMany({
      where: { clusterId },
      include: {
        dpe: true
      },
      orderBy: {
        scoreTotal: "desc"
      }
    });
    return candidates;
  }
  async updateClusterStatus(id, statut, dpeConfirmeId) {
    const cluster = await prisma.matchCluster.update({
      where: { id },
      data: {
        statut,
        dpeConfirmeId,
        dateValidation: statut === import_shared11.StatutValidation.ADRESSE_CONFIRMEE ? /* @__PURE__ */ new Date() : null
      },
      include: {
        annonce: true,
        candidats: {
          include: {
            dpe: true
          }
        }
      }
    });
    return cluster;
  }
  /**
   * Créer une correction de matching
   */
  async createMatchCorrection(data) {
    return this.prisma.matchCorrection.create({
      data: {
        annonceId: data.annonceId,
        dpeProposedId: data.dpeProposedId,
        dpeCorrectId: data.dpeCorrectId,
        scoreProposed: data.scoreProposed,
        scoreCorrect: data.scoreCorrect,
        rangProposed: data.rangProposed,
        rangCorrect: data.rangCorrect,
        isValidation: data.isValidation,
        notes: data.notes,
        createdBy: data.createdBy
      },
      include: {
        annonce: true,
        dpeProposed: true,
        dpeCorrect: true
      }
    });
  }
  /**
   * Récupérer les statistiques des corrections
   */
  async getMatchCorrectionStats() {
    const [total, validations, corrections, avgScoreDiff] = await Promise.all([
      // Total de corrections
      this.prisma.matchCorrection.count(),
      // Nombre de validations (algo correct)
      this.prisma.matchCorrection.count({
        where: { isValidation: true }
      }),
      // Nombre de corrections (algo faux)
      this.prisma.matchCorrection.count({
        where: { isValidation: false }
      }),
      // Différence moyenne de score entre proposé et correct
      this.prisma.matchCorrection.aggregate({
        where: {
          isValidation: false,
          scoreProposed: { not: null },
          scoreCorrect: { not: null }
        },
        _avg: {
          scoreProposed: true,
          scoreCorrect: true
        }
      })
    ]);
    const errorsByRank = await this.prisma.matchCorrection.groupBy({
      by: ["rangCorrect"],
      where: {
        isValidation: false,
        rangCorrect: { not: null }
      },
      _count: true
    });
    return {
      total,
      validations,
      corrections,
      accuracy: total > 0 ? (validations / total * 100).toFixed(1) + "%" : "N/A",
      avgScoreProposed: avgScoreDiff._avg.scoreProposed,
      avgScoreCorrect: avgScoreDiff._avg.scoreCorrect,
      errorsByRank: errorsByRank.sort((a, b) => (a.rangCorrect || 0) - (b.rangCorrect || 0))
    };
  }
  /**
   * Récupérer un cluster par annonceId
   */
  async getMatchClusterByAnnonceId(annonceId) {
    return this.prisma.matchCluster.findUnique({
      where: { annonceId },
      include: {
        candidats: {
          include: {
            dpe: true
          }
        }
      }
    });
  }
  /**
   * Mettre à jour les coordonnées GPS de l'annonce avec celles du DPE corrigé
   */
  async updateAnnonceCoordinatesFromDpe(annonceId, dpeId) {
    const dpe = await prisma.dpeRecord.findUnique({
      where: { id: dpeId },
      select: { coordonneeX: true, coordonneeY: true }
    });
    if (!dpe || !dpe.coordonneeX || !dpe.coordonneeY) {
      logger.warn(`DPE ${dpeId} n'a pas de coordonn\xE9es GPS valides`);
      return;
    }
    await prisma.leboncoinAnnonce.update({
      where: { id: annonceId },
      data: {
        lat: dpe.coordonneeY / 1e5,
        // Conversion approximative
        lng: dpe.coordonneeX / 1e5,
        // Conversion approximative
        dpeCorrected: true,
        // Marquer comme corrigé manuellement
        dpeCorrectId: dpeId
        // Stocker l'ID du bon DPE
      }
    });
    logger.info(`Annonce ${annonceId} : coordonn\xE9es GPS mises \xE0 jour et marqu\xE9e comme corrig\xE9e (DPE ${dpeId})`);
  }
};
var matchingRepository = new MatchingRepository();

// src/modules/matching/matching.controller.ts
init_errors();

// src/services/matching-acquereur.service.ts
var import_client3 = require("@prisma/client");
var prisma2 = new import_client3.PrismaClient();
var MatchingAcquereurService = class {
  /**
   * Lance le matching complet : tous les biens Amanda disponibles × tous les acquéreurs actifs
   * Persiste les résultats dans match_acquereur_amanda
   * Retourne les nouveaux matchs créés
   */
  async runFullMatching(options2 = {}) {
    const { scoreMin = 40, bienIds, acquereurIds, dryRun = false } = options2;
    const biens = await prisma2.amandaBien.findMany({
      where: {
        ...bienIds ? { id: { in: bienIds } } : {},
        statut: { in: ["DISPONIBLE", "OFFRE_EN_COURS"] },
        typeBien: { not: null },
        codePostal: { not: null }
      }
    });
    const acquereurs = await prisma2.acquereur.findMany({
      where: {
        statutActif: true,
        ...acquereurIds ? { id: { in: acquereurIds } } : {}
      },
      include: {
        localisationsRecherche: true
      }
    });
    let nouveauxMatchs = 0;
    let matchsMisAJour = 0;
    const topMatchs = [];
    for (const amandaBien of biens) {
      const bien = this.amandaBienToNormalise(amandaBien);
      for (const acquereur of acquereurs) {
        const resultat = this.calculateMatch(bien, acquereur);
        if (resultat.scoreTotal < scoreMin) continue;
        if (!dryRun) {
          const { isNew } = await this.upsertMatch(acquereur.id, bien, resultat);
          if (isNew) nouveauxMatchs++;
          else matchsMisAJour++;
        } else {
          nouveauxMatchs++;
        }
        topMatchs.push({
          acquereurNom: `${acquereur.prenom} ${acquereur.nom}`,
          bienRef: bien.mandateRef,
          score: resultat.scoreTotal
        });
      }
    }
    topMatchs.sort((a, b) => b.score - a.score);
    return {
      totalBiens: biens.length,
      totalAcquereurs: acquereurs.length,
      nouveauxMatchs,
      matchsMisAJour,
      topMatchs: topMatchs.slice(0, 50)
    };
  }
  /**
   * Trouve les acquéreurs intéressés par un bien Amanda
   */
  async findAcquereursForBien(bienId, options2 = {}) {
    const { limit = 20, scoreMin = 40 } = options2;
    const amandaBien = await prisma2.amandaBien.findUnique({ where: { id: bienId } });
    if (!amandaBien) throw new Error(`Bien Amanda ${bienId} non trouv\xE9`);
    const bien = this.amandaBienToNormalise(amandaBien);
    const acquereurs = await prisma2.acquereur.findMany({
      where: { statutActif: true },
      include: { localisationsRecherche: true }
    });
    const resultats = [];
    for (const acquereur of acquereurs) {
      const resultat = this.calculateMatch(bien, acquereur);
      if (resultat.scoreTotal >= scoreMin) {
        resultats.push({
          acquereur,
          scoreTotal: resultat.scoreTotal,
          scoreDetails: resultat.scoreDetails,
          pointsForts: resultat.pointsForts,
          pointsFaibles: resultat.pointsFaibles
        });
      }
    }
    return resultats.sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, limit);
  }
  /**
   * Trouve les meilleurs biens Amanda pour un acquéreur
   */
  async findBiensForAcquereur(acquereurId, options2 = {}) {
    const { limit = 50, scoreMin = 40 } = options2;
    const acquereur = await prisma2.acquereur.findUnique({
      where: { id: acquereurId },
      include: { localisationsRecherche: true }
    });
    if (!acquereur) throw new Error("Acqu\xE9reur non trouv\xE9");
    const codesPostaux = acquereur.localisationsRecherche.filter((loc) => loc.type === "CODE_POSTAL").map((loc) => loc.valeur);
    const villes = acquereur.localisationsRecherche.filter((loc) => loc.type === "VILLE").map((loc) => loc.valeur.toLowerCase());
    const amandaBiens = await prisma2.amandaBien.findMany({
      where: {
        statut: { in: ["DISPONIBLE", "OFFRE_EN_COURS"] },
        typeBien: { not: null },
        OR: [
          ...codesPostaux.length > 0 ? [{ codePostal: { in: codesPostaux } }] : [],
          ...villes.length > 0 ? [{ ville: { in: villes.map((v) => v.charAt(0).toUpperCase() + v.slice(1)) } }] : []
        ].length > 0 ? [
          ...codesPostaux.length > 0 ? [{ codePostal: { in: codesPostaux } }] : [],
          ...villes.length > 0 ? [{ ville: { in: villes.map((v) => v.charAt(0).toUpperCase() + v.slice(1)) } }] : []
        ] : [{}]
      },
      take: 1e3
    });
    const resultats = [];
    for (const amandaBien of amandaBiens) {
      const bien = this.amandaBienToNormalise(amandaBien);
      const resultat = this.calculateMatch(bien, acquereur);
      if (resultat.scoreTotal >= scoreMin) {
        resultats.push(resultat);
      }
    }
    return resultats.sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, limit);
  }
  // ============================================================================
  // Algorithme de scoring (100 points)
  // ============================================================================
  calculateMatch(bien, acquereur) {
    const scores = {
      budget: 0,
      typeBien: 0,
      localisation: 0,
      surface: 0,
      pieces: 0,
      dpe: 0,
      equipements: 0
    };
    const pointsForts = [];
    const pointsFaibles = [];
    if (bien.prix && acquereur.budgetMax) {
      if (bien.prix > acquereur.budgetMax) {
        const depassement = Math.round((bien.prix - acquereur.budgetMax) / acquereur.budgetMax * 100);
        if (depassement > 15) {
          return this.eliminatoire(bien, scores, `Prix ${this.formatPrix(bien.prix)} d\xE9passe le budget de ${depassement}%`);
        }
        scores.budget = 5;
        pointsFaibles.push(`Prix ${this.formatPrix(bien.prix)} > budget max ${this.formatPrix(acquereur.budgetMax)} (+${depassement}%)`);
      } else {
        const pourcentage = bien.prix / acquereur.budgetMax;
        if (acquereur.budgetMin && bien.prix < acquereur.budgetMin) {
          scores.budget = 10;
          pointsFaibles.push(`Prix ${this.formatPrix(bien.prix)} < budget min ${this.formatPrix(acquereur.budgetMin)}`);
        } else if (pourcentage <= 0.75) {
          scores.budget = 30;
          pointsForts.push(`Excellent prix : ${this.formatPrix(bien.prix)} (${Math.round(pourcentage * 100)}% du budget)`);
        } else if (pourcentage <= 0.9) {
          scores.budget = 25;
          pointsForts.push(`Bon prix : ${this.formatPrix(bien.prix)}`);
        } else {
          scores.budget = 20;
          pointsForts.push(`Prix dans le budget : ${this.formatPrix(bien.prix)}`);
        }
      }
    } else {
      scores.budget = 15;
    }
    if (!bien.typeBien) {
      scores.typeBien = 5;
    } else if (acquereur.typeBienRecherche && acquereur.typeBienRecherche.length > 0) {
      if (acquereur.typeBienRecherche.includes(bien.typeBien)) {
        scores.typeBien = 20;
      } else {
        return this.eliminatoire(bien, scores, `Type ${bien.typeBien} non recherch\xE9 (cherche: ${acquereur.typeBienRecherche.join(", ")})`);
      }
    } else {
      scores.typeBien = 10;
    }
    const localisations = acquereur.localisationsRecherche || [];
    let matchLoc = false;
    if (bien.codePostal) {
      const locCP = localisations.find(
        (loc) => loc.type === "CODE_POSTAL" && loc.valeur === bien.codePostal
      );
      if (locCP) {
        scores.localisation = locCP.priorite === 1 ? 20 : 15;
        pointsForts.push(`Localisation ${bien.codePostal}${bien.ville ? ` (${bien.ville})` : ""}`);
        matchLoc = true;
      }
    }
    if (!matchLoc && bien.ville) {
      const locVille = localisations.find(
        (loc) => loc.type === "VILLE" && loc.valeur.toLowerCase() === bien.ville.toLowerCase()
      );
      if (locVille) {
        scores.localisation = locVille.priorite === 1 ? 20 : 15;
        pointsForts.push(`Ville ${bien.ville}`);
        matchLoc = true;
      }
    }
    if (!matchLoc && bien.codePostal) {
      const dept = bien.codePostal.substring(0, 2);
      const locDept = localisations.find(
        (loc) => loc.valeur.startsWith(dept)
      );
      if (locDept) {
        scores.localisation = 8;
        pointsForts.push(`M\xEAme d\xE9partement ${dept}`);
        matchLoc = true;
      }
    }
    if (!matchLoc && localisations.length > 0) {
      return this.eliminatoire(bien, scores, `Localisation ${bien.codePostal || bien.ville} non recherch\xE9e`);
    } else if (!matchLoc) {
      scores.localisation = 10;
    }
    if (bien.surface > 0) {
      if (acquereur.surfaceMin && bien.surface < acquereur.surfaceMin) {
        const deficit = Math.round((acquereur.surfaceMin - bien.surface) / acquereur.surfaceMin * 100);
        if (deficit > 30) {
          pointsFaibles.push(`Surface ${bien.surface}m\xB2 tr\xE8s insuffisante (min ${acquereur.surfaceMin}m\xB2)`);
        } else {
          scores.surface = 3;
          pointsFaibles.push(`Surface ${bien.surface}m\xB2 < min ${acquereur.surfaceMin}m\xB2`);
        }
      } else if (acquereur.surfaceMax && bien.surface > acquereur.surfaceMax) {
        scores.surface = 5;
        pointsFaibles.push(`Surface ${bien.surface}m\xB2 > max ${acquereur.surfaceMax}m\xB2`);
      } else {
        scores.surface = 10;
        pointsForts.push(`Surface ${bien.surface}m\xB2`);
      }
    } else {
      scores.surface = 5;
    }
    let scorePieces = 0;
    if (bien.chambres > 0 && acquereur.chambresMin) {
      if (bien.chambres >= acquereur.chambresMin) {
        scorePieces = 7;
        pointsForts.push(`${bien.chambres} chambres`);
      } else {
        pointsFaibles.push(`${bien.chambres} ch. < min ${acquereur.chambresMin}`);
      }
    }
    if (bien.pieces > 0) {
      if (acquereur.piecesMin && bien.pieces < acquereur.piecesMin) {
        pointsFaibles.push(`${bien.pieces} pi\xE8ces < min ${acquereur.piecesMin}`);
      } else if (acquereur.piecesMax && bien.pieces > acquereur.piecesMax) {
        scores.pieces = Math.max(scorePieces, 5);
      } else if (acquereur.piecesMin && bien.pieces >= acquereur.piecesMin) {
        scores.pieces = Math.max(scorePieces, 10);
        if (scorePieces === 0) pointsForts.push(`${bien.pieces} pi\xE8ces`);
      } else {
        scores.pieces = Math.max(scorePieces, 5);
      }
    } else {
      scores.pieces = Math.max(scorePieces, 5);
    }
    if (bien.etiquetteDpe && acquereur.dpeMax) {
      const dpeValues = ["A", "B", "C", "D", "E", "F", "G"];
      const indexBien = dpeValues.indexOf(bien.etiquetteDpe);
      const indexMax = dpeValues.indexOf(acquereur.dpeMax);
      if (indexBien >= 0 && indexMax >= 0) {
        if (indexBien <= indexMax) {
          scores.dpe = indexBien <= 2 ? 5 : 3;
          pointsForts.push(`DPE ${bien.etiquetteDpe}`);
        } else {
          pointsFaibles.push(`DPE ${bien.etiquetteDpe} > max accept\xE9 ${acquereur.dpeMax}`);
        }
      }
    } else if (bien.etiquetteDpe) {
      const idx = ["A", "B", "C", "D", "E", "F", "G"].indexOf(bien.etiquetteDpe);
      scores.dpe = idx <= 2 ? 5 : idx <= 4 ? 3 : 1;
    }
    let scoreEquip = 0;
    const equipDemandes = [];
    const equipPresents = [];
    if (bien.typeBien === "MAISON") {
      if (acquereur.terrainMin && bien.surfaceTerrain) {
        if (bien.surfaceTerrain >= acquereur.terrainMin) {
          scoreEquip += 1.5;
          pointsForts.push(`Terrain ${bien.surfaceTerrain}m\xB2`);
        } else {
          pointsFaibles.push(`Terrain ${bien.surfaceTerrain}m\xB2 < min ${acquereur.terrainMin}m\xB2`);
        }
      }
      if (acquereur.avecGarage) {
        equipDemandes.push("garage");
        if (bien.avecGarage) {
          scoreEquip += 1;
          equipPresents.push("garage");
        }
      }
      if (acquereur.avecJardin) {
        equipDemandes.push("jardin");
        if (bien.avecJardin) {
          scoreEquip += 1;
          equipPresents.push("jardin");
        }
      }
      if (acquereur.avecPiscine) {
        equipDemandes.push("piscine");
        if (bien.avecPiscine) {
          scoreEquip += 1.5;
          equipPresents.push("piscine");
        }
      }
    }
    if (bien.typeBien === "APPARTEMENT") {
      if (acquereur.avecAscenseur) {
        equipDemandes.push("ascenseur");
        if (bien.avecAscenseur) {
          scoreEquip += 1.5;
          equipPresents.push("ascenseur");
        } else if (bien.etage && bien.etage > 2) {
          pointsFaibles.push(`\xC9tage ${bien.etage} sans ascenseur`);
        }
      }
      if (acquereur.avecBalcon) {
        equipDemandes.push("balcon");
        if (bien.avecBalcon) {
          scoreEquip += 1;
          equipPresents.push("balcon");
        }
      }
      if (acquereur.avecTerrasse) {
        equipDemandes.push("terrasse");
        if (bien.avecTerrasse) {
          scoreEquip += 1.5;
          equipPresents.push("terrasse");
        }
      }
      if (acquereur.avecParking) {
        equipDemandes.push("parking");
        if (bien.avecParking) {
          scoreEquip += 1;
          equipPresents.push("parking");
        }
      }
      if (acquereur.tailleCoproMax && bien.estCopropriete && bien.nbLotsCopro && bien.nbLotsCopro > acquereur.tailleCoproMax) {
        pointsFaibles.push(`Copro ${bien.nbLotsCopro} lots > max ${acquereur.tailleCoproMax}`);
      }
    }
    scores.equipements = Math.min(scoreEquip, 5);
    if (equipPresents.length > 0) pointsForts.push(`\xC9quipements : ${equipPresents.join(", ")}`);
    const equipManquants = equipDemandes.filter((e) => !equipPresents.includes(e));
    if (equipManquants.length > 0) pointsFaibles.push(`Manque : ${equipManquants.join(", ")}`);
    const scoreTotal = Math.round(
      scores.budget + scores.typeBien + scores.localisation + scores.surface + scores.pieces + scores.dpe + scores.equipements
    );
    return {
      bien,
      scoreTotal,
      scoreDetails: scores,
      pointsForts,
      pointsFaibles
    };
  }
  // ============================================================================
  // Persistance
  // ============================================================================
  /**
   * Crée ou met à jour un match dans match_acquereur_amanda
   */
  async upsertMatch(acquereurId, bien, resultat) {
    const existing = await prisma2.matchAcquereurAmanda.findUnique({
      where: { acquereurId_bienId: { acquereurId, bienId: bien.id } }
    });
    const data = {
      scoreTotal: resultat.scoreTotal,
      scoreBudget: resultat.scoreDetails.budget,
      scoreType: resultat.scoreDetails.typeBien,
      scoreLocalisation: resultat.scoreDetails.localisation,
      scoreSurface: resultat.scoreDetails.surface,
      scorePieces: resultat.scoreDetails.pieces,
      scoreDpe: resultat.scoreDetails.dpe,
      scoreEquipements: resultat.scoreDetails.equipements,
      scoreDetails: {
        pointsForts: resultat.pointsForts,
        pointsFaibles: resultat.pointsFaibles
      }
    };
    if (existing) {
      await prisma2.matchAcquereurAmanda.update({
        where: { id: existing.id },
        data
      });
      return { isNew: false };
    }
    await prisma2.matchAcquereurAmanda.create({
      data: {
        acquereurId,
        bienId: bien.id,
        ...data,
        statut: "NOUVEAU"
      }
    });
    return { isNew: true };
  }
  /**
   * Récupère les matchs > seuil non encore notifiés sur Slack
   */
  async getMatchsANotifier(scoreMin = 70) {
    const matchs = await prisma2.matchAcquereurAmanda.findMany({
      where: {
        scoreTotal: { gte: scoreMin },
        slackNotifie: false,
        statut: "NOUVEAU"
      },
      include: {
        acquereur: true,
        bien: true
      },
      orderBy: { scoreTotal: "desc" },
      take: 100
    });
    return matchs.map((m) => ({
      id: m.id,
      acquereur: {
        nom: m.acquereur.nom,
        prenom: m.acquereur.prenom,
        telephone: m.acquereur.telephone || "",
        email: m.acquereur.email
      },
      bien: {
        mandateRef: m.bien.mandateRef,
        ville: m.bien.ville,
        prix: m.bien.prix,
        typeBien: m.bien.typeBien,
        surfaceHabitable: m.bien.surfaceHabitable
      },
      scoreTotal: m.scoreTotal,
      scoreDetails: m.scoreDetails
    }));
  }
  /**
   * Marque des matchs comme notifiés sur Slack
   */
  async markAsSlackNotified(matchIds) {
    await prisma2.matchAcquereurAmanda.updateMany({
      where: { id: { in: matchIds } },
      data: {
        slackNotifie: true,
        statut: "NOTIFIE",
        dateNotification: /* @__PURE__ */ new Date()
      }
    });
  }
  // ============================================================================
  // Conversions
  // ============================================================================
  /**
   * Convertit un AmandaBien Prisma en format normalisé pour le scoring
   */
  amandaBienToNormalise(ab) {
    return {
      id: ab.id,
      typeBien: ab.typeBien,
      surface: ab.surfaceHabitable || ab.surfaceCarrez || 0,
      pieces: ab.nbPieces || 0,
      chambres: ab.nbChambres || 0,
      codePostal: ab.codePostal || "",
      ville: ab.ville,
      prix: ab.prix,
      etiquetteDpe: ab.dpeClasse,
      etiquetteGes: ab.gesClasse,
      surfaceTerrain: ab.surfaceTerrain,
      etage: ab.etage,
      anneConstruction: ab.anneConstruction,
      etatGeneral: ab.etatGeneral,
      avecAscenseur: ab.avecAscenseur || false,
      avecBalcon: ab.avecBalcon || false,
      avecTerrasse: ab.avecTerrasse || false,
      avecParking: ab.avecParking || false,
      avecGarage: ab.avecGarage || false,
      avecJardin: ab.avecJardin || false,
      avecPiscine: ab.avecPiscine || false,
      avecCave: ab.avecCave || false,
      estCopropriete: ab.estCopropriete || false,
      nbLotsCopro: ab.nbLotsCopro,
      mandateRef: ab.mandateRef,
      mondayItemId: ab.mondayItemId
    };
  }
  // ============================================================================
  // Helpers
  // ============================================================================
  eliminatoire(bien, scores, raison) {
    return {
      bien,
      scoreTotal: 0,
      scoreDetails: scores,
      pointsForts: [],
      pointsFaibles: [raison]
    };
  }
  formatPrix(prix) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(prix);
  }
};
var matchingAcquereurService = new MatchingAcquereurService();

// src/modules/matching/matching.controller.ts
var MatchingController = class {
  /**
   * POST /api/matching/annonces/:annonceId
   * Lance le matching pour une annonce
   */
  runMatching = asyncHandler(async (req, res) => {
    const { annonceId } = req.params;
    const options2 = req.body;
    const annonce = await annoncesRepository.getAnnonceById(annonceId);
    if (!annonce) {
      throw new NotFoundError("Annonce not found");
    }
    const dpes = await dpeRepository.findDpesByFilters({
      codePostalBan: annonce.codePostal,
      typeBatiment: annonce.typeBien
    });
    const result = await matchingService.matchAnnonceToDpes(annonce, dpes, options2);
    const cluster = await matchingRepository.createMatchCluster(
      annonceId,
      result.candidats,
      result.meilleurScore
    );
    res.status(201).json({
      success: true,
      data: {
        ...result,
        clusterId: cluster.id
      }
    });
  });
  /**
   * GET /api/matching/clusters/:clusterId
   * Récupère un cluster de match
   */
  getCluster = asyncHandler(async (req, res) => {
    const { clusterId } = req.params;
    const cluster = await matchingRepository.getMatchClusterById(clusterId);
    if (!cluster) {
      throw new NotFoundError("Match cluster not found");
    }
    const clusterWithTracking = {
      ...cluster,
      candidats: cluster.candidats?.map((candidat) => ({
        ...candidat,
        trackingStatut: cluster.annonce?.tracking?.statut || null
      }))
    };
    res.json({
      success: true,
      data: clusterWithTracking
    });
  });
  /**
   * GET /api/matching/clusters
   * Liste les clusters de match
   */
  listClusters = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, statut } = req.query;
    const { clusters, total } = await matchingRepository.listMatchClusters(
      Number(page),
      Number(limit),
      statut
    );
    const totalPages = Math.ceil(total / Number(limit));
    res.json({
      success: true,
      data: {
        items: clusters,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      }
    });
  });
  /**
   * GET /api/matching/clusters-with-dpe
   * Liste les clusters de match avec les informations du meilleur DPE
   */
  listClustersWithDpe = asyncHandler(async (req, res) => {
    const { page = 1, limit = 1e4, statut } = req.query;
    const { clusters, total } = await matchingRepository.listMatchClusters(
      Number(page),
      Number(limit),
      statut
    );
    const clustersWithDpe = await Promise.all(
      clusters.map(async (cluster) => {
        const candidates = await matchingRepository.getCandidatesByClusterId(cluster.id);
        const bestCandidate = candidates.sort((a, b) => b.score - a.score)[0];
        let bestDpe = null;
        if (bestCandidate) {
          bestDpe = await dpeRepository.getDpeById(bestCandidate.dpeId);
        }
        const annonce = await annoncesRepository.getAnnonceById(cluster.annonceId);
        const rawData = bestDpe?.rawData || {};
        return {
          ...cluster,
          annonce: annonce || null,
          score: bestCandidate?.scoreTotal || 0,
          trackingStatut: annonce?.tracking?.statut || null,
          bestDpe: bestDpe ? {
            id: bestDpe.id,
            numeroDpe: bestDpe.numeroDpe,
            adresseBan: bestDpe.adresseBan,
            codePostalBan: bestDpe.codePostalBan,
            coordonneeX: bestDpe.coordonneeX,
            coordonneeY: bestDpe.coordonneeY,
            etiquetteDpe: bestDpe.etiquetteDpe,
            etiquetteGes: bestDpe.etiquetteGes,
            surfaceHabitable: bestDpe.surfaceHabitable,
            typeBatiment: bestDpe.typeBatiment,
            anneConstruction: bestDpe.anneConstruction,
            dateEtablissement: bestDpe.dateEtablissement,
            // Détails d'isolation
            qualiteIsolationMurs: rawData.qualite_isolation_murs,
            qualiteIsolationMenuiseries: rawData.qualite_isolation_menuiseries,
            qualiteIsolationPlancherBas: rawData["qualite_isolation_plancher bas"],
            qualiteIsolationComblePerdu: rawData.qualite_isolation_plancher_haut_comble_perdu,
            qualiteIsolationCombleAmenage: rawData.qualite_isolation_plancher_haut_comble_amenage,
            qualiteIsolationToitTerrasse: rawData.qualite_isolation_plancher_haut_toit_terrasse,
            qualiteIsolationEnveloppe: rawData.qualite_isolation_enveloppe,
            // Chauffage
            typeEnergiePrincipaleChauffage: rawData.type_energie_principale_chauffage,
            typeInstallationChauffage: rawData.type_installation_chauffage,
            descriptionGenerateurChauffage: rawData.description_generateur_chauffage_n1_installation_n1,
            // ECS (Eau Chaude Sanitaire)
            typeEnergiePrincipaleEcs: rawData.type_energie_principale_ecs,
            typeGenerateurEcs: rawData.type_generateur_chauffage_principal_ecs,
            // Ventilation
            typeVentilation: rawData.type_ventilation,
            // Confort
            indicateurConfortEte: rawData.indicateur_confort_ete,
            // Consommations
            consoTotaleEf: rawData["conso_5 usages_ef"],
            consoParM2Ef: rawData["conso_5 usages_par_m2_ef"],
            consoChauffageEf: rawData.conso_chauffage_ef,
            consoEcsEf: rawData.conso_ecs_ef,
            // Coûts
            coutTotal5Usages: rawData.cout_total_5_usages,
            coutChauffage: rawData.cout_chauffage,
            coutEcs: rawData.cout_ecs,
            // GES
            emissionGes5Usages: rawData.emission_ges_5_usages,
            emissionGesParM2: rawData["emission_ges_5_usages par_m2"],
            // Structure du logement
            hauteurSousPlafond: rawData.hauteur_sous_plafond,
            nombreNiveauLogement: rawData.nombre_niveau_logement,
            numeroEtageAppartement: rawData.numero_etage_appartement,
            logementTraversant: rawData.logement_traversant,
            classeInertieBatiment: rawData.classe_inertie_batiment,
            periodeConstruction: rawData.periode_construction
          } : null
        };
      })
    );
    const totalPages = Math.ceil(total / Number(limit));
    res.json({
      success: true,
      data: {
        items: clustersWithDpe,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      }
    });
  });
  /**
   * PATCH /api/matching/clusters/:clusterId/validate
   * Valide un cluster de match
   */
  validateCluster = asyncHandler(async (req, res) => {
    const { clusterId } = req.params;
    const { statut, dpeConfirmeId } = req.body;
    const cluster = await matchingRepository.updateClusterStatus(clusterId, statut, dpeConfirmeId);
    res.json({
      success: true,
      data: cluster
    });
  });
  /**
   * POST /api/matching/corrections/validate
   * Valide que le matching proposé est correct
   */
  validateMatch = asyncHandler(async (req, res) => {
    const { annonceId, dpeId, notes } = req.body;
    if (!annonceId || !dpeId) {
      return res.status(400).json({
        success: false,
        error: "annonceId and dpeId are required"
      });
    }
    const correction = await matchingRepository.createMatchCorrection({
      annonceId,
      dpeCorrectId: dpeId,
      dpeProposedId: dpeId,
      // Même DPE = validation
      isValidation: true,
      notes,
      createdBy: "manual"
    });
    res.status(201).json({
      success: true,
      data: correction
    });
  });
  /**
   * POST /api/matching/corrections/correct
   * Corrige un matching en indiquant le bon DPE
   */
  correctMatch = asyncHandler(async (req, res) => {
    const { annonceId, dpeProposedId, dpeCorrectId, notes } = req.body;
    if (!annonceId || !dpeCorrectId) {
      return res.status(400).json({
        success: false,
        error: "annonceId and dpeCorrectId are required"
      });
    }
    const cluster = await matchingRepository.getMatchClusterByAnnonceId(annonceId);
    let scoreProposed = null;
    let scoreCorrect = null;
    let rangProposed = null;
    let rangCorrect = null;
    if (cluster) {
      const candidats = await matchingRepository.getCandidatesByClusterId(cluster.id);
      if (dpeProposedId) {
        const proposed = candidats.find((c) => c.dpeId === dpeProposedId);
        if (proposed) {
          scoreProposed = proposed.scoreTotal;
          rangProposed = proposed.rang;
        }
      }
      const correct = candidats.find((c) => c.dpeId === dpeCorrectId);
      if (correct) {
        scoreCorrect = correct.scoreTotal;
        rangCorrect = correct.rang;
      }
    }
    const correction = await matchingRepository.createMatchCorrection({
      annonceId,
      dpeProposedId,
      dpeCorrectId,
      scoreProposed,
      scoreCorrect,
      rangProposed,
      rangCorrect,
      isValidation: false,
      notes,
      createdBy: "manual"
    });
    await matchingRepository.updateAnnonceCoordinatesFromDpe(annonceId, dpeCorrectId);
    res.status(201).json({
      success: true,
      data: correction
    });
  });
  /**
   * GET /api/matching/corrections/stats
   * Statistiques sur les corrections pour améliorer l'algo
   */
  getCorrectionStats = asyncHandler(async (req, res) => {
    const stats = await matchingRepository.getMatchCorrectionStats();
    res.json({
      success: true,
      data: stats
    });
  });
  /**
   * GET /api/matching/candidates/:annonceId
   * Récupère tous les candidats DPE pour une annonce
   * Inclut les candidats du cluster de matching + des DPE additionnels du même code postal/type
   */
  getCandidatesByAnnonce = asyncHandler(async (req, res) => {
    const { annonceId } = req.params;
    const annonce = await annoncesRepository.getAnnonceById(annonceId);
    if (!annonce) {
      res.status(404).json({
        success: false,
        error: "Annonce not found"
      });
      return;
    }
    const cluster = await matchingRepository.getClusterByAnnonceId(annonceId);
    let candidats = [];
    let clusterId = null;
    if (cluster) {
      candidats = await matchingRepository.getCandidatesByClusterId(cluster.id);
      clusterId = cluster.id;
    }
    const additionalDpes = await dpeRepository.findDpesByFilters({
      codePostalBan: annonce.codePostal,
      typeBatiment: annonce.typeBien,
      limit: 20
    });
    const existingDpeIds = new Set(candidats.map((c) => c.dpeId));
    const additionalCandidats = additionalDpes.filter((dpe) => !existingDpeIds.has(dpe.id)).map((dpe, index) => ({
      id: `additional-${dpe.id}`,
      dpeId: dpe.id,
      scoreTotal: 0,
      scoreNormalized: 0,
      confiance: "POTENTIEL",
      rang: candidats.length + index + 1,
      estSelectionne: false,
      dpe
    }));
    res.json({
      success: true,
      data: {
        clusterId,
        candidats: [...candidats, ...additionalCandidats]
      }
    });
  });
  /**
   * GET /api/matching/acquereurs/:annonceId
   * Récupère les acquéreurs potentiellement intéressés par une annonce
   */
  getAcquereursForAnnonce = asyncHandler(async (req, res) => {
    const { annonceId } = req.params;
    const { scoreMin = 50, limit = 10 } = req.query;
    const annonce = await annoncesRepository.getAnnonceById(annonceId);
    if (!annonce) {
      res.status(404).json({
        success: false,
        error: "Annonce not found"
      });
      return;
    }
    const rawData = annonce.rawData || {};
    const bien = {
      id: annonce.id,
      typeBien: annonce.typeBien,
      surface: annonce.surface || 0,
      pieces: annonce.pieces || 0,
      codePostal: annonce.codePostal,
      prix: rawData?.price?.[0],
      etiquetteDpe: annonce.etiquetteDpe,
      etiquetteGes: annonce.etiquetteGes,
      anneConstruction: rawData?.attributes?.find((a) => a.key === "building_year")?.value,
      surfaceTerrain: rawData?.attributes?.find((a) => a.key === "land_plot_area")?.value,
      etage: rawData?.attributes?.find((a) => a.key === "floor_number")?.value,
      ascenseur: rawData?.attributes?.find((a) => a.key === "elevator")?.value === "1",
      balcon: rawData?.attributes?.find((a) => a.key === "outside_access")?.values?.includes("balcony"),
      terrasse: rawData?.attributes?.find((a) => a.key === "outside_access")?.values?.includes("terrace"),
      parking: rawData?.attributes?.find((a) => a.key === "nb_parkings")?.value ? parseInt(rawData.attributes.find((a) => a.key === "nb_parkings").value) > 0 : false,
      garage: rawData?.attributes?.find((a) => a.key === "specificities")?.values?.includes("with_garage_or_parking_spot"),
      source: "leboncoin",
      annonceId: annonce.id
    };
    const acquereurs = await matchingAcquereurService.findAcquereursForBien(bien, {
      scoreMin: Number(scoreMin),
      limit: Number(limit)
    });
    res.json({
      success: true,
      data: {
        acquereurs
      }
    });
  });
};
var matchingController = new MatchingController();

// src/modules/matching/matching.types.ts
var import_zod7 = require("zod");
var import_shared12 = require("@dpe-matching/shared");
var RunMatchingSchema = import_zod7.z.object({
  body: import_zod7.z.object({
    maxCandidats: import_zod7.z.number().int().positive().optional(),
    seuilScoreMinimum: import_zod7.z.number().min(0).max(100).optional(),
    distanceMaxGPS: import_zod7.z.number().positive().optional(),
    includeScoreDetails: import_zod7.z.boolean().optional()
  }).optional(),
  params: import_zod7.z.object({
    annonceId: import_zod7.z.string().uuid()
  })
});
var ValidateClusterSchema = import_zod7.z.object({
  body: import_zod7.z.object({
    statut: import_shared12.StatutValidationSchema,
    dpeConfirmeId: import_zod7.z.string().uuid().optional()
  }),
  params: import_zod7.z.object({
    clusterId: import_zod7.z.string().uuid()
  })
});

// src/routes/matching.routes.ts
var router4 = (0, import_express4.Router)();
router4.post(
  "/annonces/:annonceId",
  authenticateJwtOrApiKey,
  matchingRateLimiter,
  validate(RunMatchingSchema),
  matchingController.runMatching
);
router4.get("/candidates/:annonceId", (req, res) => matchingController.getCandidatesByAnnonce(req, res));
router4.get("/acquereurs/:annonceId", (req, res) => matchingController.getAcquereursForAnnonce(req, res));
router4.get("/clusters/:clusterId", matchingController.getCluster);
router4.get("/clusters-with-dpe", matchingController.listClustersWithDpe);
router4.get("/clusters", matchingController.listClusters);
router4.patch(
  "/clusters/:clusterId/validate",
  authenticateJwtOrApiKey,
  validate(ValidateClusterSchema),
  matchingController.validateCluster
);
router4.post("/corrections/validate", matchingController.validateMatch);
router4.post("/corrections/correct", matchingController.correctMatch);
router4.get("/corrections/stats", matchingController.getCorrectionStats);
var matching_routes_default = router4;

// src/routes/api-keys.routes.ts
var import_express5 = require("express");

// src/modules/api-keys/api-keys.repository.ts
var ApiKeysRepository = class {
  /**
   * Crée une nouvelle API key
   */
  async createApiKey(data) {
    return await prisma.apiKey.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        userId: data.userId,
        permissions: data.permissions,
        expiresAt: data.expiresAt
      }
    });
  }
  /**
   * Récupère une API key par son ID
   */
  async getApiKeyById(id) {
    return await prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        userId: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
  /**
   * Liste les API keys d'un utilisateur
   */
  async listApiKeysByUserId(userId) {
    return await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        userId: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        key: false
        // Ne jamais retourner la clé hashée
      },
      orderBy: { createdAt: "desc" }
    });
  }
  /**
   * Met à jour une API key
   */
  async updateApiKey(id, data) {
    return await prisma.apiKey.update({
      where: { id },
      data: {
        ...data.name && { name: data.name },
        ...data.description !== void 0 && { description: data.description },
        ...data.permissions && { permissions: data.permissions },
        ...data.isActive !== void 0 && { isActive: data.isActive }
      }
    });
  }
  /**
   * Supprime une API key
   */
  async deleteApiKey(id) {
    await prisma.apiKey.delete({
      where: { id }
    });
  }
  /**
   * Vérifie si une API key appartient à un utilisateur
   */
  async isApiKeyOwnedByUser(apiKeyId, userId) {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId
      }
    });
    return apiKey !== null;
  }
};
var apiKeysRepository = new ApiKeysRepository();

// src/modules/api-keys/api-keys.service.ts
init_errors();
var ApiKeysService = class {
  /**
   * Crée une nouvelle API key pour un utilisateur
   */
  async createApiKey(userId, data) {
    logger.info("Creating new API key", { userId, name: data.name });
    const { plainKey, hashedKey } = generateAndHashApiKey();
    const apiKey = await apiKeysRepository.createApiKey({
      key: hashedKey,
      name: data.name,
      description: data.description,
      userId,
      permissions: data.permissions,
      expiresAt: data.expiresAt
    });
    logger.info("API key created successfully", { keyId: apiKey.id, userId });
    return {
      apiKey: {
        ...apiKey,
        key: "***"
        // Ne pas retourner le hash
      },
      plainTextKey: plainKey,
      message: "API key created successfully. Save this key securely - it will not be shown again."
    };
  }
  /**
   * Liste les API keys d'un utilisateur
   */
  async listUserApiKeys(userId) {
    return await apiKeysRepository.listApiKeysByUserId(userId);
  }
  /**
   * Récupère une API key par ID
   */
  async getApiKeyById(apiKeyId, userId) {
    const apiKey = await apiKeysRepository.getApiKeyById(apiKeyId);
    if (!apiKey) {
      throw new NotFoundError("API key not found");
    }
    if (apiKey.userId !== userId) {
      throw new ForbiddenError("You do not have access to this API key");
    }
    const { key, ...apiKeyWithoutKey } = apiKey;
    return apiKeyWithoutKey;
  }
  /**
   * Met à jour une API key
   */
  async updateApiKey(apiKeyId, userId, data) {
    const isOwner = await apiKeysRepository.isApiKeyOwnedByUser(apiKeyId, userId);
    if (!isOwner) {
      throw new ForbiddenError("You do not have access to this API key");
    }
    logger.info("Updating API key", { keyId: apiKeyId, userId });
    const updatedApiKey = await apiKeysRepository.updateApiKey(apiKeyId, data);
    const { key, ...apiKeyWithoutKey } = updatedApiKey;
    return apiKeyWithoutKey;
  }
  /**
   * Désactive une API key
   */
  async disableApiKey(apiKeyId, userId) {
    await this.updateApiKey(apiKeyId, userId, { isActive: false });
    logger.info("API key disabled", { keyId: apiKeyId, userId });
  }
  /**
   * Supprime une API key
   */
  async deleteApiKey(apiKeyId, userId) {
    const isOwner = await apiKeysRepository.isApiKeyOwnedByUser(apiKeyId, userId);
    if (!isOwner) {
      throw new ForbiddenError("You do not have access to this API key");
    }
    await apiKeysRepository.deleteApiKey(apiKeyId);
    logger.info("API key deleted", { keyId: apiKeyId, userId });
  }
};
var apiKeysService = new ApiKeysService();

// src/modules/api-keys/api-keys.controller.ts
var ApiKeysController = class {
  /**
   * POST /api/api-keys
   * Crée une nouvelle API key
   */
  createApiKey = asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    const result = await apiKeysService.createApiKey(req.user.userId, req.body);
    res.status(201).json({
      success: true,
      data: result
    });
  });
  /**
   * GET /api/api-keys
   * Liste les API keys de l'utilisateur
   */
  listApiKeys = asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    const apiKeys = await apiKeysService.listUserApiKeys(req.user.userId);
    res.json({
      success: true,
      data: apiKeys
    });
  });
  /**
   * GET /api/api-keys/:id
   * Récupère une API key
   */
  getApiKey = asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    const apiKey = await apiKeysService.getApiKeyById(req.params.id, req.user.userId);
    res.json({
      success: true,
      data: apiKey
    });
  });
  /**
   * PATCH /api/api-keys/:id
   * Met à jour une API key
   */
  updateApiKey = asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    const apiKey = await apiKeysService.updateApiKey(req.params.id, req.user.userId, req.body);
    res.json({
      success: true,
      data: apiKey
    });
  });
  /**
   * POST /api/api-keys/:id/disable
   * Désactive une API key
   */
  disableApiKey = asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    await apiKeysService.disableApiKey(req.params.id, req.user.userId);
    res.json({
      success: true,
      data: { message: "API key disabled successfully" }
    });
  });
  /**
   * DELETE /api/api-keys/:id
   * Supprime une API key
   */
  deleteApiKey = asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    await apiKeysService.deleteApiKey(req.params.id, req.user.userId);
    res.json({
      success: true,
      data: { message: "API key deleted successfully" }
    });
  });
};
var apiKeysController = new ApiKeysController();

// src/routes/api-keys.routes.ts
init_auth();

// src/modules/api-keys/api-keys.types.ts
var import_zod8 = require("zod");
var import_shared13 = require("@dpe-matching/shared");
var CreateApiKeyBodySchema = import_zod8.z.object({
  body: import_shared13.CreateApiKeySchema
});
var UpdateApiKeyBodySchema = import_zod8.z.object({
  body: import_shared13.UpdateApiKeySchema,
  params: import_zod8.z.object({
    id: import_zod8.z.string().uuid()
  })
});
var GetApiKeySchema = import_zod8.z.object({
  params: import_zod8.z.object({
    id: import_zod8.z.string().uuid()
  })
});

// src/routes/api-keys.routes.ts
var router5 = (0, import_express5.Router)();
router5.use(authenticate);
router5.post("/", validate(CreateApiKeyBodySchema), apiKeysController.createApiKey);
router5.get("/", apiKeysController.listApiKeys);
router5.get("/:id", validate(GetApiKeySchema), apiKeysController.getApiKey);
router5.patch("/:id", validate(UpdateApiKeyBodySchema), apiKeysController.updateApiKey);
router5.post("/:id/disable", validate(GetApiKeySchema), apiKeysController.disableApiKey);
router5.delete("/:id", validate(GetApiKeySchema), apiKeysController.deleteApiKey);
var api_keys_routes_default = router5;

// src/routes/clusters.routes.ts
var import_express6 = require("express");

// src/modules/clusters/clusters.controller.ts
var import_zod9 = require("zod");
var import_shared16 = require("@dpe-matching/shared");

// src/modules/clusters/clusters.service.ts
var import_shared15 = require("@dpe-matching/shared");
init_errors();

// src/modules/clusters/clusters.repository.ts
var import_shared14 = require("@dpe-matching/shared");
var clustersRepository = {
  /**
   * Récupérer tous les clusters avec filtres
   */
  async findMany(filters = {}) {
    const { statut, scoreMin, scoreMax, codePostal, limit = 50, offset = 0 } = filters;
    const where = {};
    if (statut) {
      where.statut = statut;
    }
    if (scoreMin !== void 0 || scoreMax !== void 0) {
      where.meilleurScore = {};
      if (scoreMin !== void 0) where.meilleurScore.gte = scoreMin;
      if (scoreMax !== void 0) where.meilleurScore.lte = scoreMax;
    }
    if (codePostal) {
      where.annonce = {
        codePostal
      };
    }
    return prisma.matchCluster.findMany({
      where,
      include: {
        annonce: {
          select: {
            id: true,
            listId: true,
            url: true,
            codePostal: true,
            typeBien: true,
            surface: true,
            pieces: true,
            etiquetteDpe: true,
            etiquetteGes: true
          }
        },
        candidats: {
          include: {
            dpe: {
              select: {
                id: true,
                adresseBan: true,
                codePostalBan: true,
                typeBatiment: true,
                surfaceHabitable: true,
                etiquetteDpe: true,
                etiquetteGes: true,
                anneConstruction: true
              }
            }
          },
          orderBy: {
            rang: "asc"
          }
        }
      },
      orderBy: {
        meilleurScore: "desc"
      },
      take: limit,
      skip: offset
    });
  },
  /**
   * Récupérer un cluster par ID
   */
  async findById(id) {
    return prisma.matchCluster.findUnique({
      where: { id },
      include: {
        annonce: {
          select: {
            id: true,
            listId: true,
            url: true,
            codePostal: true,
            typeBien: true,
            surface: true,
            pieces: true,
            etiquetteDpe: true,
            etiquetteGes: true
          }
        },
        candidats: {
          include: {
            dpe: {
              select: {
                id: true,
                adresseBan: true,
                codePostalBan: true,
                typeBatiment: true,
                surfaceHabitable: true,
                etiquetteDpe: true,
                etiquetteGes: true,
                anneConstruction: true
              }
            }
          },
          orderBy: {
            rang: "asc"
          }
        }
      }
    });
  },
  /**
   * Mettre à jour le statut d'un cluster
   */
  async updateStatus(id, statut) {
    return prisma.matchCluster.update({
      where: { id },
      data: { statut }
    });
  },
  /**
   * Obtenir les statistiques des clusters
   */
  async getStats() {
    const [total, parStatut, scoreStats] = await Promise.all([
      // Total
      prisma.matchCluster.count(),
      // Par statut
      prisma.matchCluster.groupBy({
        by: ["statut"],
        _count: true
      }),
      // Stats de score
      prisma.matchCluster.aggregate({
        _avg: {
          meilleurScore: true
        },
        _max: {
          meilleurScore: true
        }
      })
    ]);
    const statutCounts = {
      [import_shared14.StatutValidation.NON_VERIFIE]: 0,
      [import_shared14.StatutValidation.EN_COURS]: 0,
      [import_shared14.StatutValidation.ADRESSE_CONFIRMEE]: 0,
      [import_shared14.StatutValidation.FAUX_POSITIF]: 0,
      [import_shared14.StatutValidation.IGNORE]: 0
    };
    parStatut.forEach((item) => {
      statutCounts[item.statut] = item._count;
    });
    return {
      total,
      parStatut: statutCounts,
      scoreMoyen: scoreStats._avg.meilleurScore || 0,
      meilleurScore: scoreStats._max.meilleurScore || 0
    };
  }
};

// src/modules/clusters/clusters.service.ts
var clustersService = {
  /**
   * Récupérer tous les clusters
   */
  async getClusters(filters) {
    return clustersRepository.findMany(filters);
  },
  /**
   * Récupérer un cluster par ID
   */
  async getClusterById(id) {
    const cluster = await clustersRepository.findById(id);
    if (!cluster) {
      throw new NotFoundError(`Cluster ${id} not found`);
    }
    return cluster;
  },
  /**
   * Mettre à jour le statut d'un cluster
   */
  async updateClusterStatus(id, data) {
    const cluster = await clustersRepository.findById(id);
    if (!cluster) {
      throw new NotFoundError(`Cluster ${id} not found`);
    }
    const validStatuts = Object.values(import_shared15.StatutValidation);
    if (!validStatuts.includes(data.statut)) {
      throw new BadRequestError(`Invalid status: ${data.statut}`);
    }
    return clustersRepository.updateStatus(id, data.statut);
  },
  /**
   * Obtenir les statistiques des clusters
   */
  async getStats() {
    return clustersRepository.getStats();
  },
  /**
   * Exporter les clusters validés en JSON
   */
  async exportValidated() {
    const clusters = await clustersRepository.findMany({
      statut: import_shared15.StatutValidation.ADRESSE_CONFIRMEE,
      limit: 1e3
    });
    return clusters.map((cluster) => ({
      clusterId: cluster.id,
      annonce: {
        url: cluster.annonce.url,
        codePostal: cluster.annonce.codePostal,
        typeBien: cluster.annonce.typeBien,
        surface: cluster.annonce.surface,
        pieces: cluster.annonce.pieces,
        etiquetteDpe: cluster.annonce.etiquetteDpe,
        etiquetteGes: cluster.annonce.etiquetteGes
      },
      meilleurCandidat: cluster.candidats[0] ? {
        adresse: cluster.candidats[0].dpe.adresseBan,
        typeBatiment: cluster.candidats[0].dpe.typeBatiment,
        surface: cluster.candidats[0].dpe.surfaceHabitable,
        etiquetteDpe: cluster.candidats[0].dpe.etiquetteDpe,
        etiquetteGes: cluster.candidats[0].dpe.etiquetteGes,
        anneConstruction: cluster.candidats[0].dpe.anneConstruction,
        score: cluster.candidats[0].scoreNormalized,
        confiance: cluster.candidats[0].confiance
      } : null,
      tousLesCandidats: cluster.candidats.map((c) => ({
        rang: c.rang,
        adresse: c.dpe.adresseBan,
        score: c.scoreNormalized,
        confiance: c.confiance
      }))
    }));
  }
};

// src/modules/clusters/clusters.controller.ts
var ClusterFiltersSchema = import_zod9.z.object({
  statut: import_zod9.z.nativeEnum(import_shared16.StatutValidation).optional(),
  scoreMin: import_zod9.z.coerce.number().min(0).max(100).optional(),
  scoreMax: import_zod9.z.coerce.number().min(0).max(100).optional(),
  codePostal: import_zod9.z.string().optional(),
  limit: import_zod9.z.coerce.number().min(1).max(100).optional(),
  offset: import_zod9.z.coerce.number().min(0).optional()
});
var UpdateStatusSchema = import_zod9.z.object({
  statut: import_zod9.z.nativeEnum(import_shared16.StatutValidation)
});
var clustersController = {
  /**
   * GET /api/clusters
   * Récupérer tous les clusters avec filtres
   */
  getClusters: asyncHandler(async (req, res) => {
    const filters = ClusterFiltersSchema.parse(req.query);
    const clusters = await clustersService.getClusters(filters);
    const serializedClusters = clusters.map((cluster) => ({
      ...cluster,
      annonce: {
        ...cluster.annonce,
        listId: cluster.annonce.listId.toString()
      }
    }));
    res.json({
      success: true,
      data: serializedClusters,
      count: serializedClusters.length
    });
  }),
  /**
   * GET /api/clusters/stats
   * Obtenir les statistiques des clusters
   */
  getStats: asyncHandler(async (_req, res) => {
    const stats = await clustersService.getStats();
    res.json({
      success: true,
      data: stats
    });
  }),
  /**
   * GET /api/clusters/:id
   * Récupérer un cluster par ID
   */
  getClusterById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cluster = await clustersService.getClusterById(id);
    const serializedCluster = {
      ...cluster,
      annonce: {
        ...cluster.annonce,
        listId: cluster.annonce.listId.toString()
      }
    };
    res.json({
      success: true,
      data: serializedCluster
    });
  }),
  /**
   * PATCH /api/clusters/:id/status
   * Mettre à jour le statut d'un cluster
   */
  updateStatus: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = UpdateStatusSchema.parse(req.body);
    const cluster = await clustersService.updateClusterStatus(id, data);
    res.json({
      success: true,
      data: cluster,
      message: `Cluster status updated to ${data.statut}`
    });
  }),
  /**
   * GET /api/clusters/export/validated
   * Exporter les clusters validés
   */
  exportValidated: asyncHandler(async (_req, res) => {
    const data = await clustersService.exportValidated();
    res.json({
      success: true,
      data,
      count: data.length
    });
  })
};

// src/routes/clusters.routes.ts
var router6 = (0, import_express6.Router)();
router6.get("/", clustersController.getClusters);
router6.get("/stats", clustersController.getStats);
router6.get("/export/validated", clustersController.exportValidated);
router6.get("/:id", clustersController.getClusterById);
router6.patch("/:id/status", clustersController.updateStatus);
var clusters_routes_default = router6;

// src/routes/quartiers.routes.ts
var import_express7 = require("express");
var router7 = (0, import_express7.Router)();
router7.get(
  "/:ville",
  asyncHandler(async (req, res) => {
    const { ville } = req.params;
    const quartiers = getQuartiersByVille(ville);
    res.json({
      success: true,
      data: {
        ville,
        count: quartiers.length,
        quartiers: quartiers.map((q) => ({
          name: q.name,
          codePostal: q.codePostal,
          center: q.center
        }))
      }
    });
  })
);
router7.get(
  "/search/name",
  asyncHandler(async (req, res) => {
    const { name, ville } = req.query;
    if (!name || typeof name !== "string") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_INVALID_INPUT",
          message: 'Le param\xE8tre "name" est requis'
        }
      });
    }
    const quartier = searchQuartierByName(name, ville);
    if (!quartier) {
      return res.status(404).json({
        success: false,
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Quartier non trouv\xE9"
        }
      });
    }
    res.json({
      success: true,
      data: quartier
    });
  })
);
router7.post(
  "/locate",
  asyncHandler(async (req, res) => {
    const { lat, lng, codePostal } = req.body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_INVALID_INPUT",
          message: "Les coordonn\xE9es lat et lng sont requises"
        }
      });
    }
    const quartier = findQuartier(lng, lat, codePostal);
    if (!quartier) {
      return res.status(404).json({
        success: false,
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Aucun quartier trouv\xE9 pour ces coordonn\xE9es"
        }
      });
    }
    res.json({
      success: true,
      data: quartier
    });
  })
);
router7.get(
  "/nearby/search",
  asyncHandler(async (req, res) => {
    const { lat, lng, distance = "2000", codePostal } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const distanceNum = parseInt(distance, 10);
    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_INVALID_INPUT",
          message: "Les coordonn\xE9es lat et lng sont requises"
        }
      });
    }
    if (isNaN(distanceNum) || distanceNum < 0 || distanceNum > 5e4) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_INVALID_INPUT",
          message: "La distance doit \xEAtre entre 0 et 50000 m\xE8tres"
        }
      });
    }
    const quartiers = findQuartiersNearby(lngNum, latNum, distanceNum, codePostal);
    res.json({
      success: true,
      data: {
        count: quartiers.length,
        maxDistance: distanceNum,
        quartiers
      }
    });
  })
);
var quartiers_routes_default = router7;

// src/routes/tracking.routes.ts
var import_express8 = require("express");

// src/services/tracking.service.ts
var import_client4 = require("@prisma/client");
var prisma3 = new import_client4.PrismaClient();
var TrackingService = class {
  async getByAnnonceId(annonceId) {
    return prisma3.annonceTracking.findUnique({
      where: { annonceId }
    });
  }
  async markAsViewed(annonceId) {
    const existing = await this.getByAnnonceId(annonceId);
    if (!existing) {
      return prisma3.annonceTracking.create({
        data: {
          annonceId,
          statut: "vu",
          firstViewedAt: /* @__PURE__ */ new Date()
        }
      });
    }
    return existing;
  }
  async updateTracking(annonceId, data) {
    const existing = await this.getByAnnonceId(annonceId);
    if (existing) {
      return prisma3.annonceTracking.update({
        where: { id: existing.id },
        data
      });
    } else {
      return prisma3.annonceTracking.create({
        data: {
          annonceId,
          firstViewedAt: /* @__PURE__ */ new Date(),
          ...data
        }
      });
    }
  }
  async updateMondaySync(annonceId, mondayItemId, boardId) {
    const existing = await this.getByAnnonceId(annonceId);
    const data = {
      mondayItemId,
      mondayBoardId: boardId,
      mondaySyncedAt: /* @__PURE__ */ new Date(),
      statut: "envoye_monday"
    };
    if (existing) {
      return prisma3.annonceTracking.update({
        where: { id: existing.id },
        data
      });
    } else {
      return prisma3.annonceTracking.create({
        data: {
          annonceId,
          firstViewedAt: /* @__PURE__ */ new Date(),
          ...data
        }
      });
    }
  }
  async getAllTracking(filters) {
    const where = {};
    if (filters?.statut) {
      where.statut = filters.statut;
    }
    if (filters?.hasMonday !== void 0) {
      where.mondayItemId = filters.hasMonday ? { not: null } : null;
    }
    return prisma3.annonceTracking.findMany({
      where,
      include: {
        annonce: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });
  }
};
var trackingService = new TrackingService();

// src/routes/tracking.routes.ts
var router8 = (0, import_express8.Router)();
router8.get("/:annonceId", asyncHandler(async (req, res) => {
  const { annonceId } = req.params;
  const tracking = await trackingService.getByAnnonceId(annonceId);
  if (!tracking) {
    return res.status(404).json({ message: "Tracking non trouv\xE9" });
  }
  res.json(tracking);
}));
router8.post("/:annonceId/view", asyncHandler(async (req, res) => {
  const { annonceId } = req.params;
  const tracking = await trackingService.markAsViewed(annonceId);
  res.json(tracking);
}));
router8.put("/:annonceId", asyncHandler(async (req, res) => {
  const { annonceId } = req.params;
  const { statut, etapeMonday, notes, tacheAFaire } = req.body;
  const tracking = await trackingService.updateTracking(annonceId, {
    statut,
    etapeMonday,
    notes,
    tacheAFaire
  });
  res.json(tracking);
}));
router8.patch("/:annonceId", asyncHandler(async (req, res) => {
  const { annonceId } = req.params;
  const { statut, etapeMonday, notes, tacheAFaire } = req.body;
  const tracking = await trackingService.updateTracking(annonceId, {
    statut,
    etapeMonday,
    notes,
    tacheAFaire
  });
  res.json(tracking);
}));
router8.get("/", asyncHandler(async (req, res) => {
  const { statut, hasMonday } = req.query;
  const tracking = await trackingService.getAllTracking({
    statut,
    hasMonday: hasMonday === "true" ? true : hasMonday === "false" ? false : void 0
  });
  res.json(tracking);
}));
var tracking_routes_default = router8;

// src/routes/monday.routes.ts
var import_express9 = require("express");

// src/services/monday.service.ts
var MondayService = class {
  apiToken;
  boardId;
  defaultSource;
  apiUrl = "https://api.monday.com/v2";
  constructor() {
    this.apiToken = process.env.MONDAY_API_TOKEN || "";
    this.boardId = process.env.MONDAY_BOARD_ID || "";
    this.defaultSource = process.env.MONDAY_DEFAULT_SOURCE || "Boitage";
    if (!this.apiToken) {
      console.warn("\u26A0\uFE0F MONDAY_API_TOKEN not configured");
    }
    if (!this.boardId) {
      console.warn("\u26A0\uFE0F MONDAY_BOARD_ID not configured");
    }
  }
  // Méthode helper pour obtenir l'ID utilisateur Monday à partir de son email ou nom
  async getUserIdByEmail(email) {
    const query = `
      query {
        users {
          id
          name
          email
        }
      }
    `;
    try {
      const result = await this.mondayQuery(query);
      const user = result.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      return user?.id || null;
    } catch (error) {
      console.error("Erreur lors de la r\xE9cup\xE9ration des utilisateurs:", error);
      return null;
    }
  }
  async mondayQuery(query, variables) {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": this.apiToken,
        "API-Version": "2024-10"
      },
      body: JSON.stringify({ query, variables })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Monday API error: ${response.status} - ${errorText}`);
      throw new Error(`Monday API error: ${response.statusText}`);
    }
    const result = await response.json();
    if (result.errors) {
      console.error("Monday API GraphQL errors:", result.errors);
      throw new Error(`Monday GraphQL error: ${JSON.stringify(result.errors)}`);
    }
    return result.data;
  }
  async getBoardGroups() {
    const query = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          groups {
            id
            title
          }
        }
      }
    `;
    const result = await this.mondayQuery(query, {
      boardId: this.boardId
    });
    return result.boards[0]?.groups || [];
  }
  async getBoardColumns() {
    const query = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns {
            id
            title
            type
          }
        }
      }
    `;
    const result = await this.mondayQuery(query, {
      boardId: this.boardId
    });
    return result.boards[0]?.columns || [];
  }
  async getItem(itemId) {
    const query = `
      query ($itemId: ID!) {
        items(ids: [$itemId]) {
          id
          name
          group {
            id
            title
          }
          column_values {
            id
            title
            text
            value
          }
        }
      }
    `;
    const result = await this.mondayQuery(query, {
      itemId
    });
    return result.items[0] || null;
  }
  async getBoardItems() {
    const query = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          items_page(limit: 10) {
            items {
              id
              name
              group {
                id
                title
              }
              created_at
            }
          }
        }
      }
    `;
    const result = await this.mondayQuery(query, {
      boardId: this.boardId
    });
    return result.boards[0]?.items_page?.items || [];
  }
  async addCommentToItem(itemId, comment) {
    const mutation = `
      mutation ($itemId: ID!, $body: String!) {
        create_update (
          item_id: $itemId,
          body: $body
        ) {
          id
        }
      }
    `;
    const result = await this.mondayQuery(mutation, {
      itemId,
      body: comment
    });
    console.log(`\u{1F4AC} Commentaire ajout\xE9 \xE0 l'item Monday ${itemId}`);
    return result.create_update;
  }
  async createQualificationItem(data) {
    try {
      const groups = await this.getBoardGroups();
      if (groups.length === 0) {
        throw new Error("Aucun groupe trouv\xE9 dans le board Monday");
      }
      const groupId = groups[0].id;
      console.log(`\u{1F4CC} Utilisation du groupe: ${groups[0].title} (${groupId})`);
      const itemName = `${data.typeBien} ${data.surface ? data.surface + "m\xB2" : ""} - ${data.codePostal}`.trim();
      const columnValues = {};
      if (data.annonceUrl) {
        columnValues.long_text_mkr0kq02 = data.annonceUrl;
        console.log(`\u{1F517} Lien de l'annonce: ${data.annonceUrl}`);
      }
      if (data.tacheAFaire) {
        columnValues.color_mkr08jq4 = { label: "\xC0 faire" };
        console.log(`\u2705 T\xE2che \xE0 faire: Oui`);
      }
      columnValues.color_mkr0f69m = { label: this.defaultSource };
      console.log(`\u{1F4E5} Source: ${this.defaultSource}`);
      if (data.datePublication) {
        const date = new Date(data.datePublication);
        columnValues.date_mkr0narn = {
          date: date.toISOString().split("T")[0]
        };
        console.log(`\u{1F4C5} Date publication: ${date.toISOString().split("T")[0]}`);
      }
      console.log("\u{1F4E6} Column values:", JSON.stringify(columnValues, null, 2));
      const mutation = `
        mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
          create_item (
            board_id: $boardId,
            group_id: $groupId,
            item_name: $itemName,
            column_values: $columnValues
          ) {
            id
          }
        }
      `;
      const result = await this.mondayQuery(mutation, {
        boardId: this.boardId,
        groupId,
        itemName,
        columnValues: JSON.stringify(columnValues)
      });
      const mondayItemId = result.create_item.id;
      if (data.notes && data.notes.trim()) {
        await this.addCommentToItem(mondayItemId, data.notes);
      }
      await trackingService.updateMondaySync(
        data.annonceId,
        mondayItemId,
        this.boardId
      );
      await trackingService.updateTracking(data.annonceId, {
        statut: "envoye_monday",
        // Marquer comme traité
        etapeMonday: data.etape,
        notes: data.notes,
        tacheAFaire: data.tacheAFaire
      });
      console.log(`\u2705 Item cr\xE9\xE9 dans Monday.com: ${mondayItemId} pour annonce ${data.annonceId}`);
      return {
        success: true,
        mondayItemId,
        itemName
      };
    } catch (error) {
      console.error("\u274C Erreur lors de la cr\xE9ation de l'item Monday:", error);
      throw error;
    }
  }
  async createDpeQualificationItem(data) {
    try {
      const groups = await this.getBoardGroups();
      if (groups.length === 0) {
        throw new Error("Aucun groupe trouv\xE9 dans le board Monday");
      }
      const groupId = groups[0].id;
      console.log(`\u{1F4CC} Utilisation du groupe: ${groups[0].title} (${groupId})`);
      const itemName = `[DPE] ${data.typeBatiment} ${data.surface}m\xB2 - ${data.codePostal}`.trim();
      const columnValues = {};
      const dpeInfo = `DPE N\xB0 ${data.numeroDpe}
Adresse: ${data.adresse}
DPE: ${data.etiquetteDpe}${data.etiquetteGes ? " | GES: " + data.etiquetteGes : ""}
Ann\xE9e construction: ${data.anneConstruction || "N/A"}`;
      columnValues.long_text_mkr0kq02 = dpeInfo;
      console.log(`\u{1F517} Info DPE: ${dpeInfo}`);
      if (data.tacheAFaire) {
        columnValues.color_mkr08jq4 = { label: "\xC0 faire" };
        console.log(`\u2705 T\xE2che \xE0 faire: Oui`);
      }
      columnValues.color_mkr0f69m = { label: this.defaultSource };
      console.log(`\u{1F4E5} Source: ${this.defaultSource}`);
      console.log("\u{1F4E6} Column values:", JSON.stringify(columnValues, null, 2));
      const mutation = `
        mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
          create_item (
            board_id: $boardId,
            group_id: $groupId,
            item_name: $itemName,
            column_values: $columnValues
          ) {
            id
          }
        }
      `;
      const result = await this.mondayQuery(mutation, {
        boardId: this.boardId,
        groupId,
        itemName,
        columnValues: JSON.stringify(columnValues)
      });
      const mondayItemId = result.create_item.id;
      const maxenceEmail = process.env.MONDAY_DPE_ASSIGNEE_EMAIL || "maxence.daviot@amepi.fr";
      try {
        const maxenceId = await this.getUserIdByEmail(maxenceEmail);
        if (maxenceId) {
          await this.assignPersonToItem(mondayItemId, "people_mkr0f710", maxenceId);
          console.log(`\u{1F464} Assign\xE9 \xE0 Maxence Daviot (${maxenceId})`);
        } else {
          console.warn(`\u26A0\uFE0F Impossible de trouver l'utilisateur ${maxenceEmail}`);
        }
      } catch (assignError) {
        console.warn("\u26A0\uFE0F Erreur lors de l'assignation:", assignError);
      }
      if (data.notes && data.notes.trim()) {
        await this.addCommentToItem(mondayItemId, data.notes);
      }
      console.log(`\u2705 Item DPE cr\xE9\xE9 dans Monday.com: ${mondayItemId} pour DPE ${data.dpeId}`);
      return {
        success: true,
        mondayItemId,
        itemName
      };
    } catch (error) {
      console.error("\u274C Erreur lors de la cr\xE9ation de l'item DPE Monday:", error);
      throw error;
    }
  }
  // Méthode pour assigner une personne à un item
  async assignPersonToItem(itemId, columnId, userId) {
    const mutation = `
      mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value (
          board_id: $boardId,
          item_id: $itemId,
          column_id: $columnId,
          value: $value
        ) {
          id
        }
      }
    `;
    await this.mondayQuery(mutation, {
      boardId: this.boardId,
      itemId,
      columnId,
      value: JSON.stringify({ personsAndTeams: [{ id: parseInt(userId), kind: "person" }] })
    });
  }
  async updateQualificationItem(mondayItemId, data) {
    try {
      const columnValues = {};
      if (data.etape) {
        columnValues.color_mkr03tjd = { label: data.etape };
      }
      if (data.tacheAFaire !== void 0) {
        columnValues.color_mkr08jq4 = { label: data.tacheAFaire ? "\xC0 faire" : "" };
      }
      const mutation = `
        mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
          change_multiple_column_values (
            board_id: $boardId,
            item_id: $itemId,
            column_values: $columnValues
          ) {
            id
          }
        }
      `;
      await this.mondayQuery(mutation, {
        boardId: this.boardId,
        itemId: mondayItemId,
        columnValues: JSON.stringify(columnValues)
      });
      console.log(`\u2705 Item mis \xE0 jour dans Monday.com: ${mondayItemId}`);
      return {
        success: true,
        mondayItemId
      };
    } catch (error) {
      console.error("\u274C Erreur lors de la mise \xE0 jour de l'item Monday:", error);
      throw error;
    }
  }
};
var mondayService = new MondayService();

// src/routes/monday.routes.ts
var router9 = (0, import_express9.Router)();
router9.get("/board-info", asyncHandler(async (req, res) => {
  const [columns, groups] = await Promise.all([
    mondayService.getBoardColumns(),
    mondayService.getBoardGroups()
  ]);
  res.json({
    success: true,
    data: {
      columns,
      groups
    }
  });
}));
router9.post("/create-qualification", asyncHandler(async (req, res) => {
  const {
    annonceId,
    annonceUrl,
    typeBien,
    surface,
    pieces,
    codePostal,
    etiquetteDpe,
    score,
    etape,
    notes,
    tacheAFaire,
    datePublication
  } = req.body;
  const result = await mondayService.createQualificationItem({
    annonceId,
    annonceUrl,
    typeBien,
    surface,
    pieces,
    codePostal,
    etiquetteDpe,
    score,
    etape,
    notes,
    tacheAFaire,
    datePublication
  });
  res.json(result);
}));
router9.put("/update-qualification/:mondayItemId", asyncHandler(async (req, res) => {
  const { mondayItemId } = req.params;
  const { etape, notes, tacheAFaire } = req.body;
  const result = await mondayService.updateQualificationItem(mondayItemId, {
    etape,
    notes,
    tacheAFaire
  });
  res.json(result);
}));
router9.post("/create-dpe-qualification", asyncHandler(async (req, res) => {
  const {
    dpeId,
    numeroDpe,
    adresse,
    codePostal,
    typeBatiment,
    surface,
    etiquetteDpe,
    etiquetteGes,
    anneConstruction,
    etape,
    notes,
    tacheAFaire
  } = req.body;
  const result = await mondayService.createDpeQualificationItem({
    dpeId,
    numeroDpe,
    adresse,
    codePostal,
    typeBatiment,
    surface,
    etiquetteDpe,
    etiquetteGes,
    anneConstruction,
    etape,
    notes,
    tacheAFaire
  });
  res.json(result);
}));
var monday_routes_default = router9;

// src/routes/cadastre.routes.ts
var import_express10 = require("express");

// src/services/cadastre.service.ts
var CadastreService = class {
  API_BASE = "https://apicarto.ign.fr/api/cadastre";
  /**
   * Crée un buffer circulaire autour d'un point
   * @param lon Longitude
   * @param lat Latitude
   * @param radiusMeters Rayon en mètres
   * @returns Polygon GeoJSON
   */
  createBuffer(lon, lat, radiusMeters) {
    const deltaLat = radiusMeters / 111e3;
    const deltaLon = radiusMeters / (111e3 * Math.cos(lat * Math.PI / 180));
    const numPoints = 16;
    const coordinates = [];
    for (let i = 0; i <= numPoints; i++) {
      const angle = i * 2 * Math.PI / numPoints;
      const x = lon + deltaLon * Math.cos(angle);
      const y = lat + deltaLat * Math.sin(angle);
      coordinates.push([x, y]);
    }
    return {
      type: "Polygon",
      coordinates: [coordinates]
    };
  }
  /**
   * Recherche les parcelles cadastrales autour d'un point GPS avec un rayon donné
   * @param lat Latitude
   * @param lon Longitude
   * @param radius Rayon de recherche en mètres
   * @returns Liste brute des parcelles trouvées
   */
  async fetchParcelles(lat, lon, radius) {
    const buffer = this.createBuffer(lon, lat, radius);
    const geomJson = JSON.stringify(buffer);
    const url = `${this.API_BASE}/parcelle?geom=${encodeURIComponent(geomJson)}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      return [];
    }
    return data.features.map((feature) => {
      const props = feature.properties;
      return {
        id: props.idu || props.id || `${props.code_insee}${props.section}${props.numero}`,
        commune: props.code_com || props.commune,
        nomCommune: props.nom_com,
        section: props.section,
        numero: props.numero,
        contenance: props.contenance || props.surf_parc || 0,
        codePostal: props.code_postal,
        adresse: props.adresse,
        geometry: feature.geometry,
        // Inclure la géométrie complète
        bbox: feature.bbox
        // Inclure le bounding box
      };
    });
  }
  /**
   * Recherche les parcelles cadastrales autour d'un point GPS
   * Utilise une approche multi-rayons pour maximiser la précision
   * @param lat Latitude
   * @param lon Longitude
   * @param radius Rayon initial de recherche en mètres (défaut: 15m)
   * @param expectedSurface Surface attendue en m² (optionnel, pour filtrage intelligent)
   * @returns Liste des parcelles trouvées
   */
  async getParcellsByLocation(lat, lon, radius = 15, expectedSurface) {
    try {
      logger.info(`\u{1F50D} Recherche cadastre autour de (lat: ${lat}, lon: ${lon})`);
      if (expectedSurface) {
        logger.info(`\u{1F3AF} Surface cible: ${expectedSurface}m\xB2`);
        const radii = [10, 15, 20, 25, 30];
        let bestMatch = null;
        for (const testRadius of radii) {
          const parcelles2 = await this.fetchParcelles(lat, lon, testRadius);
          if (parcelles2.length === 0) continue;
          const bySection = /* @__PURE__ */ new Map();
          parcelles2.forEach((p) => {
            const key = `${p.nomCommune}-${p.section}`;
            if (!bySection.has(key)) bySection.set(key, []);
            bySection.get(key).push(p);
          });
          for (const [sectionKey, sectionParcelles] of bySection.entries()) {
            const totalSurface2 = sectionParcelles.reduce((sum, p) => sum + p.contenance, 0);
            const diff = Math.abs(totalSurface2 - expectedSurface);
            const diffPercent = diff / expectedSurface;
            const score = Math.max(0, 100 - diffPercent * 100);
            if (diffPercent < 0.5 && (!bestMatch || score > bestMatch.score)) {
              bestMatch = { parcelles: sectionParcelles, score, diff };
              logger.info(`  \u2728 Rayon ${testRadius}m, Section ${sectionKey}: ${Math.round(totalSurface2)}m\xB2 (score: ${Math.round(score)})`);
            }
          }
        }
        if (bestMatch) {
          const totalSurface2 = bestMatch.parcelles.reduce((sum, p) => sum + p.contenance, 0);
          logger.info(`\u{1F3C6} Meilleur match: ${bestMatch.parcelles.length} parcelle(s) - ${Math.round(totalSurface2)}m\xB2 (\xE9cart: ${Math.round(bestMatch.diff)}m\xB2, score: ${Math.round(bestMatch.score)})`);
          bestMatch.parcelles.forEach((p) => {
            logger.info(`  \u{1F4CD} ${p.nomCommune} - Section ${p.section} N\xB0${p.numero} - ${p.contenance}m\xB2`);
          });
          return bestMatch.parcelles;
        }
        logger.warn("\u26A0\uFE0F Aucune correspondance trouv\xE9e avec la surface attendue");
        radius = 15;
      }
      const parcelles = await this.fetchParcelles(lat, lon, radius);
      if (parcelles.length === 0) {
        logger.info("\u26A0\uFE0F Aucune parcelle trouv\xE9e");
        return [];
      }
      const parcellesBySection = /* @__PURE__ */ new Map();
      parcelles.forEach((p) => {
        const key = `${p.nomCommune}-${p.section}`;
        if (!parcellesBySection.has(key)) {
          parcellesBySection.set(key, []);
        }
        parcellesBySection.get(key).push(p);
      });
      let mainSection = [];
      let maxCount = 0;
      for (const [key, group] of parcellesBySection.entries()) {
        if (group.length > maxCount) {
          maxCount = group.length;
          mainSection = group;
        }
      }
      const equalGroups = [];
      for (const group of parcellesBySection.values()) {
        if (group.length === maxCount) {
          equalGroups.push(group);
        }
      }
      if (equalGroups.length > 1) {
        mainSection = equalGroups.reduce((max, current) => {
          const maxSurface = max.reduce((sum, p) => sum + p.contenance, 0);
          const currentSurface = current.reduce((sum, p) => sum + p.contenance, 0);
          return currentSurface > maxSurface ? current : max;
        });
      }
      const totalSurface = mainSection.reduce((sum, p) => sum + p.contenance, 0);
      logger.info(`\u2705 Trouv\xE9 ${parcelles.length} parcelle(s) au total, ${mainSection.length} dans la s\xE9lection finale`);
      logger.info(`\u{1F4CA} Surface totale: ${Math.round(totalSurface)}m\xB2`);
      mainSection.forEach((p) => {
        logger.info(`  \u{1F4CD} ${p.nomCommune} - Section ${p.section} N\xB0${p.numero} - ${p.contenance}m\xB2`);
      });
      return mainSection;
    } catch (error) {
      logger.error("\u274C Erreur lors de la requ\xEAte cadastre:", error);
      return [];
    }
  }
  /**
   * Recherche par adresse
   * @param adresse Adresse complète
   * @param expectedSurface Surface attendue en m² (optionnel)
   * @returns Liste des parcelles
   */
  async getParcellsByAddress(adresse, expectedSurface) {
    try {
      const geocodeUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`;
      const geocodeResponse = await fetch(geocodeUrl);
      if (!geocodeResponse.ok) {
        return [];
      }
      const geocodeData = await geocodeResponse.json();
      if (!geocodeData.features || geocodeData.features.length === 0) {
        return [];
      }
      const [lon, lat] = geocodeData.features[0].geometry.coordinates;
      return this.getParcellsByLocation(lat, lon, 15, expectedSurface);
    } catch (error) {
      logger.error("Erreur lors du g\xE9ocodage:", error);
      return [];
    }
  }
  /**
   * Récupère les informations détaillées d'une parcelle spécifique
   * @param codeCommune Code INSEE de la commune
   * @param section Section cadastrale
   * @param numero Numéro de parcelle
   */
  async getParcelleDetails(codeCommune, section, numero) {
    try {
      const url = `${this.API_BASE}/commune/${codeCommune}/parcelle/${section}/${numero}`;
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return {
        id: `${codeCommune}${section}${numero}`,
        commune: codeCommune,
        section,
        numero,
        contenance: data.contenance || data.surface
      };
    } catch (error) {
      logger.error("Erreur lors de la r\xE9cup\xE9ration des d\xE9tails parcelle:", error);
      return null;
    }
  }
};
var cadastreService = new CadastreService();

// src/routes/cadastre.routes.ts
var router10 = (0, import_express10.Router)();
router10.get("/location", asyncHandler(async (req, res) => {
  const { lat, lon, radius } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({
      success: false,
      message: "Param\xE8tres lat et lon requis"
    });
  }
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  const searchRadius = radius ? parseInt(radius) : 50;
  const parcelles = await cadastreService.getParcellsByLocation(
    latitude,
    longitude,
    searchRadius
  );
  res.json({
    success: true,
    data: {
      parcelles,
      count: parcelles.length
    }
  });
}));
router10.get("/address", asyncHandler(async (req, res) => {
  const { adresse, expectedSurface } = req.query;
  if (!adresse) {
    return res.status(400).json({
      success: false,
      message: "Param\xE8tre adresse requis"
    });
  }
  const expectedSurfaceNum = expectedSurface ? parseFloat(expectedSurface) : void 0;
  const parcelles = await cadastreService.getParcellsByAddress(
    adresse,
    expectedSurfaceNum
  );
  res.json({
    success: true,
    data: {
      parcelles,
      count: parcelles.length
    }
  });
}));
var cadastre_routes_default = router10;

// src/routes/integration.routes.ts
var import_express11 = require("express");
init_config();
var router11 = (0, import_express11.Router)();
var n8nAuth = (req, res, next) => {
  if (config.isDevelopment && !config.externalApis.n8nApiKey) {
    return next();
  }
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== config.externalApis.n8nApiKey) {
    return res.status(401).json({
      success: false,
      error: "API key invalide ou manquante"
    });
  }
  next();
};
router11.get("/annonces/new", n8nAuth, generalRateLimiter, async (req, res) => {
  try {
    const { since, limit = 100 } = req.query;
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1e3);
    const annonces = await prisma.leboncoinAnnonce.findMany({
      where: {
        createdAt: {
          gte: sinceDate
        }
      },
      orderBy: {
        datePublication: "desc"
      },
      take: Number(limit)
    });
    const transformed = annonces.map((a) => ({
      // Identifiants
      lbc_id: a.listId.toString(),
      source_id: a.id,
      url: a.url,
      // Informations de base
      titre: a.rawData?.subject || `${a.typeBien} ${a.surface}m\xB2 ${a.pieces}p`,
      description: a.rawData?.body || "",
      prix: a.rawData?.price?.[0] || null,
      // Localisation
      code_postal: a.codePostal,
      ville: a.rawData?.location?.city || "",
      quartier: a.rawData?.location?.district || null,
      lat: a.lat,
      lng: a.lng,
      // Caractéristiques
      type_bien: a.typeBien.toLowerCase(),
      surface: a.surface,
      nb_pieces: a.pieces,
      nb_chambres: extractAttribute(a.rawData, "bedrooms"),
      // DPE/GES
      dpe: a.etiquetteDpe,
      ges: a.etiquetteGes,
      // Critères enrichis pour matching IA
      criteres_enrichis: {
        annee_construction: a.anneConstruction || extractAttribute(a.rawData, "building_year"),
        etage: extractAttribute(a.rawData, "floor_number"),
        ascenseur: extractAttribute(a.rawData, "elevator") === "1",
        balcon: hasOutsideAccess(a.rawData, "balcony"),
        terrasse: hasOutsideAccess(a.rawData, "terrace"),
        parking: extractAttribute(a.rawData, "nb_parkings") > 0,
        garage: hasSpecificity(a.rawData, "with_garage_or_parking_spot"),
        cuisine_equipee: hasSpecificity(a.rawData, "equipped_kitchen"),
        cave: hasSpecificity(a.rawData, "cellar"),
        type_chauffage: extractAttribute(a.rawData, "heating_type"),
        mode_chauffage: extractAttribute(a.rawData, "heating_mode"),
        etat: extractAttribute(a.rawData, "global_condition"),
        surface_terrain: extractAttribute(a.rawData, "land_plot_area"),
        type_mandat: extractAttribute(a.rawData, "mandate_type")
      },
      // Images
      images: a.rawData?.images?.urls || [],
      image_principale: a.rawData?.images?.urls?.[0] || null,
      // Dates
      date_publication: a.datePublication,
      date_importation: a.createdAt,
      // Statut
      statut_disponibilite: "disponible",
      source: "leboncoin"
    }));
    res.json({
      success: true,
      data: {
        count: transformed.length,
        since: sinceDate.toISOString(),
        annonces: transformed
      }
    });
  } catch (error) {
    console.error("Erreur r\xE9cup\xE9ration nouvelles annonces:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur"
    });
  }
});
router11.get("/stats", n8nAuth, generalRateLimiter, async (req, res) => {
  try {
    const [
      totalAnnonces,
      annoncesLast24h,
      annoncesByType
    ] = await Promise.all([
      prisma.leboncoinAnnonce.count(),
      prisma.leboncoinAnnonce.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1e3)
          }
        }
      }),
      prisma.leboncoinAnnonce.groupBy({
        by: ["typeBien"],
        _count: true
      })
    ]);
    res.json({
      success: true,
      data: {
        total_annonces: totalAnnonces,
        nouvelles_24h: annoncesLast24h,
        par_type: annoncesByType,
        derniere_maj: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("Erreur r\xE9cup\xE9ration stats:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur"
    });
  }
});
router11.post("/webhook/match-created", async (req, res) => {
  try {
    const { match_id, acquereur_id, bien_lbc_id, score } = req.body;
    console.log("\u{1F4EC} Webhook match cr\xE9\xE9:", {
      match_id,
      acquereur_id,
      bien_lbc_id,
      score
    });
    res.json({
      success: true,
      message: "Webhook re\xE7u"
    });
  } catch (error) {
    console.error("Erreur webhook:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur"
    });
  }
});
function extractAttribute(rawData, key) {
  if (!rawData?.attributes) return null;
  const attr = rawData.attributes.find((a) => a.key === key);
  return attr?.value || null;
}
function hasOutsideAccess(rawData, type) {
  if (!rawData?.attributes) return false;
  const attr = rawData.attributes.find((a) => a.key === "outside_access");
  return attr?.values?.includes(type) || false;
}
function hasSpecificity(rawData, type) {
  if (!rawData?.attributes) return false;
  const attr = rawData.attributes.find((a) => a.key === "specificities");
  return attr?.values?.includes(type) || false;
}
var integration_routes_default = router11;

// src/routes/acquereurs.routes.ts
var import_express12 = require("express");

// src/modules/acquereurs/acquereurs.repository.ts
var import_client5 = require("@prisma/client");

// src/services/email.service.ts
var import_nodemailer = __toESM(require("nodemailer"));
var EmailService = class {
  transporter = null;
  n8nWebhookUrl = null;
  constructor() {
    this.n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || null;
    if (this.n8nWebhookUrl) {
      logger.info("\u2705 Service d'envoi d'email configur\xE9 avec N8n webhook");
    } else {
      this.initializeTransporter();
    }
  }
  initializeTransporter() {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    if (!emailUser || !emailPassword) {
      logger.warn("\u26A0\uFE0F  EMAIL_USER ou EMAIL_PASSWORD non configur\xE9s - les emails seront logg\xE9s seulement");
      return;
    }
    try {
      this.transporter = import_nodemailer.default.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      });
      logger.info("\u2705 Service d'envoi d'email configur\xE9 avec succ\xE8s (Gmail SMTP)");
    } catch (error) {
      logger.error("\u274C Erreur lors de la configuration du service email:", error);
    }
  }
  async sendEmail(options2) {
    const from = options2.from || process.env.EMAIL_USER || "noreply@example.com";
    if (this.n8nWebhookUrl) {
      return this.sendViaN8nWebhook({ ...options2, from });
    }
    if (this.transporter) {
      return this.sendViaSmtp({ ...options2, from });
    }
    logger.info("=== EMAIL \xC0 ENVOYER (MODE SIMULATION) ===");
    logger.info(`De: ${from}`);
    logger.info(`\xC0: ${options2.to}`);
    logger.info(`Sujet: ${options2.subject}`);
    logger.info(`Contenu HTML: ${options2.html.substring(0, 500)}...`);
    logger.info("==========================================");
  }
  async sendViaN8nWebhook(options2) {
    try {
      const response = await fetch(this.n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: options2.to,
          subject: options2.subject,
          html: options2.html,
          from: options2.from
        })
      });
      if (!response.ok) {
        throw new Error(`N8n webhook r\xE9ponse: ${response.status} ${response.statusText}`);
      }
      logger.info(`\u2705 Email envoy\xE9 via N8n \xE0 ${options2.to}`);
    } catch (error) {
      logger.error(`\u274C Erreur lors de l'envoi via N8n \xE0 ${options2.to}:`, error);
      throw new Error(`Erreur lors de l'envoi de l'email via N8n: ${error}`);
    }
  }
  async sendViaSmtp(options2) {
    try {
      const info = await this.transporter.sendMail({
        from: `"DPE Matching" <${options2.from}>`,
        to: options2.to,
        subject: options2.subject,
        html: options2.html
      });
      logger.info(`\u2705 Email envoy\xE9 via Gmail SMTP \xE0 ${options2.to} - Message ID: ${info.messageId}`);
    } catch (error) {
      logger.error(`\u274C Erreur lors de l'envoi via SMTP \xE0 ${options2.to}:`, error);
      throw new Error(`Erreur lors de l'envoi de l'email via SMTP: ${error}`);
    }
  }
};
var emailService = new EmailService();

// src/modules/acquereurs/acquereurs.repository.ts
var prisma4 = new import_client5.PrismaClient();
var AcquereurRepository = class {
  /**
   * Crée un nouvel acquéreur avec ses localisations
   */
  async createAcquereur(data) {
    const { localisations, typeBienRecherche, ...acquereurData } = data;
    const typeBienMap = {
      "Maison": "MAISON",
      "Appartement": "APPARTEMENT",
      "Terrain": "TERRAIN",
      "Programme Neuf": "APPARTEMENT",
      // Map to APPARTEMENT by default
      "Immeuble": "APPARTEMENT",
      "Parking": "TERRAIN",
      "Autre": "TERRAIN"
    };
    const typeBienConverted = typeBienRecherche.map((type) => typeBienMap[type] || type.toUpperCase()).filter((value, index, self) => self.indexOf(value) === index);
    const acquereur = await prisma4.acquereur.create({
      data: {
        ...acquereurData,
        typeBienRecherche: typeBienConverted,
        localisationsRecherche: {
          create: localisations.map((loc) => ({
            type: loc.type,
            valeur: loc.valeur,
            priorite: loc.priorite || 1
          }))
        }
      },
      include: {
        localisationsRecherche: true
      }
    });
    return acquereur;
  }
  /**
   * Récupère tous les acquéreurs
   */
  async findAll(filters = {}) {
    return await prisma4.acquereur.findMany({
      where: filters,
      include: {
        localisationsRecherche: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }
  /**
   * Récupère un acquéreur par son ID
   */
  async findById(id) {
    return await prisma4.acquereur.findUnique({
      where: { id },
      include: {
        localisationsRecherche: true
      }
    });
  }
  /**
   * Met à jour un acquéreur
   */
  async updateAcquereur(id, data) {
    const { localisations, typeBienRecherche, ...updateData } = data;
    let typeBienConverted;
    if (typeBienRecherche) {
      const typeBienMap = {
        "Maison": "MAISON",
        "Appartement": "APPARTEMENT",
        "Terrain": "TERRAIN",
        "Programme Neuf": "APPARTEMENT",
        "Immeuble": "APPARTEMENT",
        "Parking": "TERRAIN",
        "Autre": "TERRAIN"
      };
      typeBienConverted = typeBienRecherche.map((type) => typeBienMap[type] || type.toUpperCase()).filter((value, index, self) => self.indexOf(value) === index);
    }
    if (localisations) {
      await prisma4.localisationRecherche.deleteMany({
        where: { acquereurId: id }
      });
    }
    const acquereur = await prisma4.acquereur.update({
      where: { id },
      data: {
        ...updateData,
        ...typeBienConverted && { typeBienRecherche: typeBienConverted },
        ...localisations && {
          localisationsRecherche: {
            create: localisations.map((loc) => ({
              type: loc.type,
              valeur: loc.valeur,
              priorite: loc.priorite || 1
            }))
          }
        }
      },
      include: {
        localisationsRecherche: true
      }
    });
    return acquereur;
  }
  /**
   * Trouve toutes les annonces qui correspondent aux critères d'un acquéreur
   */
  async findMatchingAnnonces(acquereurId) {
    const acquereur = await prisma4.acquereur.findUnique({
      where: { id: acquereurId },
      include: {
        localisationsRecherche: true
      }
    });
    if (!acquereur) {
      return [];
    }
    const whereClause = {
      // Filtre par budget
      ...acquereur.budgetMax && { prix: { lte: acquereur.budgetMax } },
      ...acquereur.budgetMin && { prix: { gte: acquereur.budgetMin } },
      // Filtre par surface
      ...acquereur.surfaceMin && { surface: { gte: acquereur.surfaceMin } },
      ...acquereur.surfaceMax && { surface: { lte: acquereur.surfaceMax } },
      // Filtre par nombre de pièces
      ...acquereur.piecesMin && { pieces: { gte: acquereur.piecesMin } },
      ...acquereur.piecesMax && { pieces: { lte: acquereur.piecesMax } },
      // Filtre par type de bien
      ...acquereur.typeBienRecherche.length > 0 && {
        typeBien: { in: acquereur.typeBienRecherche }
      }
    };
    const codesPostaux = acquereur.localisationsRecherche.filter((loc) => loc.type === "CODE_POSTAL").map((loc) => loc.valeur);
    const zonesCustom = acquereur.localisationsRecherche.filter((loc) => loc.type === "ZONE_CUSTOM").map((loc) => loc.valeur);
    if (codesPostaux.length > 0) {
      whereClause.codePostal = { in: codesPostaux };
    }
    let annonces = await prisma4.leboncoinAnnonce.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc"
      },
      take: 1e3
      // Augmenter la limite pour le filtrage géographique
    });
    if (zonesCustom.length > 0) {
      const zones = await prisma4.searchZone.findMany({
        where: {
          id: { in: zonesCustom },
          isActive: true
        }
      });
      if (zones.length > 0) {
        const villesInZone = /* @__PURE__ */ new Set();
        const quartiersInZone = /* @__PURE__ */ new Set();
        zones.forEach((zone) => {
          const geometry = zone.geometry;
          if (geometry.type === "Quartier" && geometry.city) {
            villesInZone.add(geometry.city);
            if (geometry.district) {
              quartiersInZone.add(geometry.district);
            }
          }
        });
        if (villesInZone.size === 0) {
          annonces.forEach((annonce) => {
            const rawData = annonce.rawData;
            if (rawData?.location?.city && rawData?.location?.lat && rawData?.location?.lng) {
              const point = [rawData.location.lng, rawData.location.lat];
              const isInZone = zones.some((zone) => {
                const geometry = zone.geometry;
                if (geometry.type === "Polygon" && geometry.coordinates) {
                  const polygon = geometry.coordinates[0];
                  return isPointInPolygon(point, polygon);
                } else if (geometry.type === "Circle" && geometry.center && geometry.radius) {
                  const [centerLng, centerLat] = geometry.center;
                  const distance = this.calculateDistance(
                    rawData.location.lat,
                    rawData.location.lng,
                    centerLat,
                    centerLng
                  );
                  return distance <= geometry.radius;
                }
                return false;
              });
              if (isInZone) {
                villesInZone.add(rawData.location.city);
              }
            }
          });
        }
        if (villesInZone.size > 0) {
          annonces = annonces.filter((annonce) => {
            const rawData = annonce.rawData;
            const city = rawData?.location?.city;
            if (!city || !villesInZone.has(city)) {
              return false;
            }
            if (quartiersInZone.size > 0) {
              const cityLabel = rawData?.location?.city_label || "";
              const hasMatchingQuartier = Array.from(quartiersInZone).some((quartier) => {
                const quartierNorm = quartier.toLowerCase().replace(/[^a-z0-9]/g, "");
                const cityLabelNorm = cityLabel.toLowerCase().replace(/[^a-z0-9]/g, "");
                return cityLabelNorm.includes(quartierNorm);
              });
              if (!hasMatchingQuartier && rawData?.location?.lat && rawData?.location?.lng) {
                const point = [rawData.location.lng, rawData.location.lat];
                const isInZone = zones.some((zone) => {
                  const geometry = zone.geometry;
                  if (geometry.type === "Polygon" && geometry.coordinates) {
                    const polygon = geometry.coordinates[0];
                    return isPointInPolygon(point, polygon);
                  } else if (geometry.type === "Circle" && geometry.center && geometry.radius) {
                    const [centerLng, centerLat] = geometry.center;
                    const distance = this.calculateDistance(
                      rawData.location.lat,
                      rawData.location.lng,
                      centerLat,
                      centerLng
                    );
                    return distance <= geometry.radius;
                  }
                  return false;
                });
                return isInZone;
              }
              return hasMatchingQuartier;
            }
            return true;
          });
        }
      }
    }
    annonces = annonces.filter((annonce) => {
      if (annonce.mandateType === "exclusive") {
        return false;
      }
      const rawData = annonce.rawData;
      const ownerName = rawData?.owner?.name || "";
      if (ownerName.toUpperCase().includes("ORPI")) {
        return false;
      }
      return true;
    });
    return annonces.slice(0, 100);
  }
  /**
   * Calcule la distance entre deux points GPS (formule de Haversine) en mètres
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const \u03C61 = lat1 * Math.PI / 180;
    const \u03C62 = lat2 * Math.PI / 180;
    const \u0394\u03C6 = (lat2 - lat1) * Math.PI / 180;
    const \u0394\u03BB = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(\u0394\u03C6 / 2) * Math.sin(\u0394\u03C6 / 2) + Math.cos(\u03C61) * Math.cos(\u03C62) * Math.sin(\u0394\u03BB / 2) * Math.sin(\u0394\u03BB / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  /**
   * Envoie une sélection de biens par email à un acquéreur
   */
  async sendSelectionEmail(acquereurId, annonceIds) {
    const acquereur = await prisma4.acquereur.findUnique({
      where: { id: acquereurId }
    });
    if (!acquereur) {
      throw new Error("Acqu\xE9reur introuvable");
    }
    if (!acquereur.email) {
      throw new Error("Cet acqu\xE9reur n'a pas d'adresse email");
    }
    const annonces = await prisma4.leboncoinAnnonce.findMany({
      where: {
        id: { in: annonceIds }
      }
    });
    const emailHTML = this.generateSelectionEmailHTML(acquereur, annonces);
    await emailService.sendEmail({
      to: acquereur.email,
      subject: `S\xE9lection de ${annonces.length} bien(s) correspondant \xE0 vos crit\xE8res`,
      html: emailHTML
    });
    return {
      message: `Email envoy\xE9 \xE0 ${acquereur.prenom} ${acquereur.nom} (${acquereur.email})`,
      bienCount: annonces.length
    };
  }
  /**
   * Génère le contenu HTML de l'email de sélection
   */
  generateSelectionEmailHTML(acquereur, annonces) {
    const biensHTML = annonces.map((annonce) => {
      const rawData = annonce.rawData;
      const imageUrl = rawData?.images?.urls_large?.[0] || rawData?.images?.small_url || "";
      const typeBien = rawData?.attributes?.find((a) => a.key === "real_estate_type")?.value_label || annonce.typeBien;
      const prix = rawData?.price?.[0] || annonce.prix;
      const ville = rawData?.location?.city || "";
      const pieces = annonce.pieces || rawData?.attributes?.find((a) => a.key === "rooms")?.value || "";
      const surface = annonce.surface || rawData?.attributes?.find((a) => a.key === "square")?.value || "";
      const url = rawData?.url || `https://www.leboncoin.fr/ventes_immobilieres/${annonce.listId}.htm`;
      return `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: white;">
          ${imageUrl ? `<img src="${imageUrl}" alt="${typeBien}" style="width: 100%; max-width: 300px; height: auto; border-radius: 4px; margin-bottom: 12px;" />` : ""}
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px; font-weight: 600;">${typeBien} - ${ville}</h3>
          <p style="margin: 4px 0; color: #059669; font-size: 20px; font-weight: 700;">${prix ? prix.toLocaleString() + " \u20AC" : "Prix non renseign\xE9"}</p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
            ${pieces ? pieces + " pi\xE8ce(s)" : ""} ${surface ? "\u2022 " + surface + " m\xB2" : ""}
          </p>
          <a href="${url}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">Voir l'annonce</a>
        </div>
      `;
    }).join("");
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>S\xE9lection de biens</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="margin: 0 0 8px 0; color: #1f2937; font-size: 24px;">Bonjour ${acquereur.prenom},</h1>
          <p style="margin: 8px 0; color: #6b7280; font-size: 16px;">
            Nous avons s\xE9lectionn\xE9 pour vous ${annonces.length} bien(s) correspondant \xE0 vos crit\xE8res de recherche.
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          ${biensHTML}
        </div>

        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Vous avez des questions ? N'h\xE9sitez pas \xE0 nous contacter.
          </p>
        </div>
      </body>
      </html>
    `;
  }
};
var acquereurRepository = new AcquereurRepository();

// src/modules/acquereurs/acquereurs.controller.ts
var AcquereursController = class {
  /**
   * POST /api/acquereurs
   * Crée un nouvel acquéreur avec ses critères de recherche
   */
  createAcquereur = asyncHandler(async (req, res) => {
    const acquereurData = req.body;
    const acquereur = await acquereurRepository.createAcquereur(acquereurData);
    res.status(201).json({
      success: true,
      data: acquereur
    });
  });
  /**
   * GET /api/acquereurs
   * Liste tous les acquéreurs actifs
   */
  listAcquereurs = asyncHandler(async (req, res) => {
    const { actifs = true } = req.query;
    const acquereurs = await acquereurRepository.findAll({
      statutActif: actifs === "true" || actifs === true
    });
    res.json({
      success: true,
      data: acquereurs
    });
  });
  /**
   * GET /api/acquereurs/:id
   * Récupère un acquéreur par son ID
   */
  getAcquereur = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const acquereur = await acquereurRepository.findById(id);
    if (!acquereur) {
      res.status(404).json({
        success: false,
        error: "Acqu\xE9reur not found"
      });
      return;
    }
    res.json({
      success: true,
      data: acquereur
    });
  });
  /**
   * PATCH /api/acquereurs/:id
   * Met à jour un acquéreur
   */
  updateAcquereur = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const acquereur = await acquereurRepository.updateAcquereur(id, updateData);
    res.json({
      success: true,
      data: acquereur
    });
  });
  /**
   * DELETE /api/acquereurs/:id
   * Désactive un acquéreur (soft delete)
   */
  deleteAcquereur = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await acquereurRepository.updateAcquereur(id, { statutActif: false });
    res.json({
      success: true,
      data: { message: "Acqu\xE9reur d\xE9sactiv\xE9" }
    });
  });
  /**
   * GET /api/acquereurs/:id/matches
   * Récupère tous les biens qui correspondent aux critères de l'acquéreur
   */
  getMatches = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const acquereur = await acquereurRepository.findById(id);
    if (!acquereur) {
      res.status(404).json({
        success: false,
        error: "Acqu\xE9reur not found"
      });
      return;
    }
    const matches = await acquereurRepository.findMatchingAnnonces(id);
    res.json({
      success: true,
      data: matches
    });
  });
  /**
   * POST /api/acquereurs/send-selection
   * Envoie une sélection de biens par email à un acquéreur
   */
  sendSelection = asyncHandler(async (req, res) => {
    const { acquereurId, annonceIds } = req.body;
    if (!acquereurId || !annonceIds || !Array.isArray(annonceIds)) {
      res.status(400).json({
        success: false,
        error: "acquereurId et annonceIds sont requis"
      });
      return;
    }
    const result = await acquereurRepository.sendSelectionEmail(acquereurId, annonceIds);
    res.json({
      success: true,
      data: result
    });
  });
};
var acquereursController = new AcquereursController();

// src/routes/acquereurs.routes.ts
var router12 = (0, import_express12.Router)();
router12.post("/send-selection", generalRateLimiter, acquereursController.sendSelection);
router12.post("/", generalRateLimiter, acquereursController.createAcquereur);
router12.get("/", generalRateLimiter, acquereursController.listAcquereurs);
router12.get("/:id", generalRateLimiter, acquereursController.getAcquereur);
router12.get("/:id/matches", generalRateLimiter, acquereursController.getMatches);
router12.patch("/:id", generalRateLimiter, acquereursController.updateAcquereur);
router12.delete("/:id", generalRateLimiter, acquereursController.deleteAcquereur);
var acquereurs_routes_default = router12;

// src/routes/matching-trigger.routes.ts
var import_express13 = require("express");

// src/services/slack-notification.service.ts
var SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
var SlackNotificationService = class {
  /**
   * Envoie les notifications Slack pour une liste de matchs
   * Retourne les IDs des matchs notifiés avec succès
   */
  async notifyMatchs(matchs) {
    if (!SLACK_WEBHOOK_URL) {
      console.warn("[Slack] SLACK_WEBHOOK_URL non configur\xE9 \u2014 notifications d\xE9sactiv\xE9es");
      return [];
    }
    if (matchs.length === 0) return [];
    const notifiedIds = [];
    const parBien = /* @__PURE__ */ new Map();
    for (const match of matchs) {
      const key = match.bien.mandateRef;
      if (!parBien.has(key)) parBien.set(key, []);
      parBien.get(key).push(match);
    }
    for (const [bienRef, biensMatchs] of parBien) {
      const premier = biensMatchs[0];
      const prixFormate = premier.bien.prix ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(premier.bien.prix) : "Prix N/C";
      const acquereursLines = biensMatchs.sort((a, b) => b.scoreTotal - a.scoreTotal).map((m) => {
        const emoji = m.scoreTotal >= 80 ? "\u{1F525}" : m.scoreTotal >= 70 ? "\u2B50" : "\u2705";
        const details = m.scoreDetails;
        const forts = (details?.pointsForts || []).slice(0, 3).join(" \xB7 ");
        return `${emoji} *${m.acquereur.prenom} ${m.acquereur.nom}* \u2014 Score: *${m.scoreTotal}/100*
    \u{1F4DE} ${m.acquereur.telephone || "N/C"} \xB7 \u2709\uFE0F ${m.acquereur.email}
    ${forts}`;
      }).join("\n\n");
      const payload = {
        text: `\u{1F3E0} Nouveaux matchs pour le bien ${bienRef}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `\u{1F3E0} Match${biensMatchs.length > 1 ? "s" : ""} \u2014 Bien ${bienRef}`,
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${premier.bien.typeBien || "Bien"}* \xE0 *${premier.bien.ville || "N/C"}* \xB7 ${prixFormate}${premier.bien.surfaceHabitable ? ` \xB7 ${premier.bien.surfaceHabitable}m\xB2` : ""}`
            }
          },
          { type: "divider" },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: acquereursLines
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `${biensMatchs.length} acqu\xE9reur${biensMatchs.length > 1 ? "s" : ""} match\xE9${biensMatchs.length > 1 ? "s" : ""} \xB7 ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")} ${(/* @__PURE__ */ new Date()).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              }
            ]
          }
        ]
      };
      try {
        const response = await fetch(SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          notifiedIds.push(...biensMatchs.map((m) => m.id));
          console.log(`[Slack] \u2705 Notification envoy\xE9e pour bien ${bienRef} (${biensMatchs.length} acqu\xE9reurs)`);
        } else {
          const text = await response.text();
          console.error(`[Slack] \u274C Erreur ${response.status} pour bien ${bienRef}: ${text}`);
        }
      } catch (error) {
        console.error(`[Slack] \u274C Erreur r\xE9seau pour bien ${bienRef}:`, error);
      }
    }
    return notifiedIds;
  }
  /**
   * Envoie un résumé du matching global
   */
  async notifySummary(stats) {
    if (!SLACK_WEBHOOK_URL) return;
    const top5 = stats.topMatchs.slice(0, 5);
    const topLines = top5.map(
      (m) => `\u2022 *${m.acquereurNom}* \u2194 Bien ${m.bienRef} \u2014 Score: *${m.score}/100*`
    ).join("\n");
    const payload = {
      text: `\u{1F4CA} Matching termin\xE9 \u2014 ${stats.nouveauxMatchs} nouveaux matchs`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "\u{1F4CA} Rapport de matching", emoji: true }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Biens analys\xE9s:*
${stats.totalBiens}` },
            { type: "mrkdwn", text: `*Acqu\xE9reurs:*
${stats.totalAcquereurs}` },
            { type: "mrkdwn", text: `*Nouveaux matchs:*
${stats.nouveauxMatchs}` },
            { type: "mrkdwn", text: `*Mis \xE0 jour:*
${stats.matchsMisAJour}` }
          ]
        },
        ...top5.length > 0 ? [
          { type: "divider" },
          {
            type: "section",
            text: { type: "mrkdwn", text: `*Top 5 matchs:*
${topLines}` }
          }
        ] : []
      ]
    };
    try {
      await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      console.log("[Slack] \u2705 R\xE9sum\xE9 de matching envoy\xE9");
    } catch (error) {
      console.error("[Slack] \u274C Erreur envoi r\xE9sum\xE9:", error);
    }
  }
};
var slackNotificationService = new SlackNotificationService();

// src/routes/matching-trigger.routes.ts
var router13 = (0, import_express13.Router)();
router13.post("/trigger", asyncHandler(async (req, res) => {
  const apiKey = req.body.apiKey || req.headers["x-api-key"];
  const expectedKey = process.env.MATCHING_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    res.status(401).json({ success: false, error: "API key invalide" });
    return;
  }
  const {
    scoreMin = 40,
    slackScoreMin = 70,
    dryRun = false,
    bienIds,
    acquereurIds
  } = req.body;
  console.log(`[Matching] \u{1F680} D\xE9clenchement matching (scoreMin=${scoreMin}, dryRun=${dryRun})`);
  const start = Date.now();
  const stats = await matchingAcquereurService.runFullMatching({
    scoreMin,
    bienIds,
    acquereurIds,
    dryRun
  });
  const duration = ((Date.now() - start) / 1e3).toFixed(1);
  console.log(`[Matching] \u2705 Termin\xE9 en ${duration}s \u2014 ${stats.nouveauxMatchs} nouveaux, ${stats.matchsMisAJour} mis \xE0 jour`);
  let slackNotified = 0;
  if (!dryRun && stats.nouveauxMatchs > 0) {
    const matchsANotifier = await matchingAcquereurService.getMatchsANotifier(slackScoreMin);
    if (matchsANotifier.length > 0) {
      const notifiedIds = await slackNotificationService.notifyMatchs(matchsANotifier);
      if (notifiedIds.length > 0) {
        await matchingAcquereurService.markAsSlackNotified(notifiedIds);
        slackNotified = notifiedIds.length;
      }
    }
    await slackNotificationService.notifySummary(stats);
  }
  res.json({
    success: true,
    data: {
      ...stats,
      slackNotified,
      durationSeconds: parseFloat(duration),
      dryRun
    }
  });
}));
router13.post("/trigger/bien", asyncHandler(async (req, res) => {
  const { bienId, scoreMin = 40, notify = false } = req.body;
  if (!bienId) {
    res.status(400).json({ success: false, error: "bienId requis" });
    return;
  }
  const resultats = await matchingAcquereurService.findAcquereursForBien(bienId, { scoreMin });
  if (notify && resultats.length > 0) {
    const matchsANotifier = await matchingAcquereurService.getMatchsANotifier(70);
    if (matchsANotifier.length > 0) {
      const notifiedIds = await slackNotificationService.notifyMatchs(matchsANotifier);
      if (notifiedIds.length > 0) {
        await matchingAcquereurService.markAsSlackNotified(notifiedIds);
      }
    }
  }
  res.json({
    success: true,
    data: {
      bienId,
      totalAcquereurs: resultats.length,
      acquereurs: resultats.map((r) => ({
        id: r.acquereur.id,
        nom: `${r.acquereur.prenom} ${r.acquereur.nom}`,
        scoreTotal: r.scoreTotal,
        scoreDetails: r.scoreDetails,
        pointsForts: r.pointsForts,
        pointsFaibles: r.pointsFaibles
      }))
    }
  });
}));
router13.get("/trigger/results", asyncHandler(async (req, res) => {
  const { limit = 50, scoreMin = 0, statut } = req.query;
  const { PrismaClient: PrismaClient5 } = await import("@prisma/client");
  const prisma5 = new PrismaClient5();
  const matchs = await prisma5.matchAcquereurAmanda.findMany({
    where: {
      scoreTotal: { gte: Number(scoreMin) },
      ...statut ? { statut } : {}
    },
    include: {
      acquereur: { select: { id: true, nom: true, prenom: true, email: true, telephone: true } },
      bien: { select: { id: true, mandateRef: true, ville: true, prix: true, typeBien: true, surfaceHabitable: true } }
    },
    orderBy: { scoreTotal: "desc" },
    take: Number(limit)
  });
  await prisma5.$disconnect();
  res.json({
    success: true,
    data: {
      total: matchs.length,
      matchs: matchs.map((m) => ({
        id: m.id,
        acquereur: `${m.acquereur.prenom} ${m.acquereur.nom}`,
        acquereurEmail: m.acquereur.email,
        bienRef: m.bien.mandateRef,
        bienVille: m.bien.ville,
        bienPrix: m.bien.prix,
        scoreTotal: m.scoreTotal,
        statut: m.statut,
        slackNotifie: m.slackNotifie,
        createdAt: m.createdAt
      }))
    }
  });
}));
var matching_trigger_routes_default = router13;

// src/routes/zones.ts
var import_express14 = require("express");
var router14 = (0, import_express14.Router)();
router14.get("/", async (req, res) => {
  try {
    const zones = await prisma.searchZone.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(zones);
  } catch (error) {
    console.error("Erreur lors de la r\xE9cup\xE9ration des zones:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
router14.get("/active", async (req, res) => {
  try {
    const zones = await prisma.searchZone.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(zones);
  } catch (error) {
    console.error("Erreur lors de la r\xE9cup\xE9ration des zones actives:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
router14.post("/", async (req, res) => {
  try {
    const { name, description, type, geometry, color } = req.body;
    if (!name || !type || !geometry) {
      return res.status(400).json({ error: "Champs manquants: name, type, geometry requis" });
    }
    const zone = await prisma.searchZone.create({
      data: {
        name,
        description,
        type,
        geometry,
        color: color || "#3b82f6",
        isActive: true
      }
    });
    res.status(201).json(zone);
  } catch (error) {
    console.error("Erreur lors de la cr\xE9ation de la zone:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
router14.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, color } = req.body;
    const zone = await prisma.searchZone.update({
      where: { id },
      data: {
        ...name !== void 0 && { name },
        ...description !== void 0 && { description },
        ...isActive !== void 0 && { isActive },
        ...color !== void 0 && { color }
      }
    });
    res.json(zone);
  } catch (error) {
    console.error("Erreur lors de la mise \xE0 jour de la zone:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
router14.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.searchZone.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression de la zone:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
var zones_default = router14;

// src/modules/pdf/pdf.routes.ts
var import_express15 = require("express");

// src/modules/pdf/pdf.service.ts
var import_puppeteer = __toESM(require("puppeteer"));

// src/modules/pdf/pdf-template-new.ts
function renderProfessionalTemplate(data) {
  const { annonce, bestDpe, score, images, logoPath } = data;
  const rawData = annonce.rawData;
  const prix = rawData?.price?.[0] || annonce.prix || "Non renseign\xE9";
  const description = rawData?.body || "";
  const location = rawData?.location;
  const ville = location?.city_label || location?.city || "";
  const codePostal = location?.zipcode || annonce.codePostal || "";
  const adresse = bestDpe?.adresseBan || `${ville}`;
  const attributes = rawData?.attributes || [];
  const surface = attributes.find((a) => a.key === "square")?.value || annonce.surface || "";
  const pieces = attributes.find((a) => a.key === "rooms")?.value || annonce.pieces || "";
  const chambres = attributes.find((a) => a.key === "bedrooms")?.value || "";
  const realEstateType = attributes.find((a) => a.key === "real_estate_type")?.value_label || "";
  const typeBien = realEstateType || rawData?.category_name || annonce.typeBien || "Bien immobilier";
  const ges = attributes.find((a) => a.key === "ges")?.value_label || "";
  const dpe = attributes.find((a) => a.key === "energy_rate")?.value_label || "";
  const energie = attributes.find((a) => a.key === "energy_rate")?.value || "";
  const surfaceTerrain = attributes.find((a) => a.key === "land_plot_surface")?.value || "";
  const etage = attributes.find((a) => a.key === "floor_number")?.value || "";
  const nbEtagesImmeuble = attributes.find((a) => a.key === "nb_floors_building")?.value || "";
  const outsideAccess = attributes.find((a) => a.key === "outside_access");
  const hasBalcon = outsideAccess?.values?.includes("balcony") || false;
  const hasTerrasse = outsideAccess?.values?.includes("terrace") || false;
  const parking = attributes.find((a) => a.key === "parking");
  const hasParking = parking?.values && parking.values.length > 0;
  const nbParkings = hasParking ? parking.values.length : 0;
  const specificities = attributes.find((a) => a.key === "specificities");
  const hasAscenseur = specificities?.values?.includes("elevator") || false;
  const hasInterphone = specificities?.values?.includes("intercom") || false;
  const hasDigicode = specificities?.values?.includes("digicode") || false;
  const hasCave = specificities?.values?.includes("cellar") || false;
  const nbSallesBain = attributes.find((a) => a.key === "bathrooms")?.value || "";
  const nbSallesEau = attributes.find((a) => a.key === "nb_shower_room")?.value || "";
  const modeChauffage = attributes.find((a) => a.key === "heating_mode")?.value_label || "";
  const etatGeneral = attributes.find((a) => a.key === "condition")?.value_label || "";
  const chargesAnnuelles = attributes.find((a) => a.key === "annual_charges")?.value || "";
  const nbLotsCopro = attributes.find((a) => a.key === "lots")?.value || "";
  const taxeFonciere = attributes.find((a) => a.key === "property_tax")?.value || "";
  const dpeClass = bestDpe?.etiquetteDpe || annonce.etiquetteDpe || dpe;
  const gesClass = bestDpe?.etiquetteGes || annonce.etiquetteGes || ges;
  const conso = bestDpe?.consoEnergie || energie || "";
  const emission = bestDpe?.emissionGes || "";
  const anneConstruction = bestDpe?.anneConstruction || attributes.find((a) => a.key === "building_year")?.value || "";
  const mainImage = images[0] || "";
  const additionalImages = images.slice(1, 37);
  const imagesPerPage = 6;
  const photoPages = [];
  for (let i = 0; i < additionalImages.length; i += imagesPerPage) {
    photoPages.push(additionalImages.slice(i, i + imagesPerPage));
  }
  const getDpeColor = (etiquette) => {
    const colors = {
      "A": "#319834",
      "B": "#34a639",
      "C": "#c2d545",
      "D": "#f5e625",
      "E": "#f7b715",
      "F": "#ed7a24",
      "G": "#e4162b"
    };
    return colors[etiquette?.toUpperCase()] || "#9ca3af";
  };
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Synth\xE8se du bien - ${ville}</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      color: #1a1a1a;
      line-height: 1.4;
      background: white;
    }

    @page {
      margin: 0;
    }

    .page {
      padding: 50px 40px 180px 40px;
      max-width: 900px;
      margin: 0 auto;
      position: relative;
      min-height: 200px;
    }

    .page:not(:last-child) {
      page-break-after: always;
    }

    .page:empty,
    .page:not(:has(*:not(.footer))) {
      display: none;
    }

    /* Page 1: Synth\xE8se */
    .title {
      color: rgb(27, 30, 100);
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 15px;
      text-transform: uppercase;
      page-break-after: avoid;
    }

    .header-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 0;
      page-break-inside: avoid;
    }

    .main-image {
      width: 100%;
      height: 320px;
      object-fit: contain;
      border-radius: 8px;
      page-break-inside: avoid;
      background: #f9fafb;
    }

    /* Sections */
    .section {
      background: white;
      border: 3px solid rgb(90, 100, 242);
      margin-bottom: 0;
      page-break-inside: avoid;
    }

    .section-title {
      background: rgb(90, 100, 242);
      color: white;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .section-content {
      padding: 10px 12px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      font-size: 12px;
    }

    .info-line {
      padding: 2px 0;
      font-size: 11px;
      line-height: 1.3;
    }

    .info-line strong {
      color: #1a1a1a;
      font-weight: bold;
    }

    /* Section financi\xE8re */
    .price-highlight {
      font-size: 18px;
      color: #4f46e5;
      font-weight: bold;
    }

    /* Table des surfaces */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 10px;
    }

    table thead {
      background: #4f46e5;
      color: white;
    }

    table th {
      padding: 8px;
      text-align: center;
      font-weight: bold;
    }

    table td {
      padding: 8px;
      text-align: center;
      border: 1px solid #e5e7eb;
    }

    table tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    /* Page 2: Diagnostics */
    .diagnostic-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin: 20px 0;
      font-size: 13px;
    }

    .diagnostic-item {
      padding: 8px;
    }

    .diagnostic-item strong {
      display: block;
      color: #1a1a1a;
      margin-bottom: 3px;
    }

    .diagnostic-text {
      font-size: 12px;
      line-height: 1.6;
      text-align: justify;
      margin-top: 15px;
    }

    /* Page 3: Photos */
    .photos-page {
      padding-top: 60px !important;
      padding-bottom: 180px !important;
    }

    .photos-title {
      background: rgb(90, 100, 242);
      color: white;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 15px;
      width: 100%;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 0;
    }

    .photo-item {
      width: 100%;
      height: 220px;
      object-fit: cover;
      border-radius: 4px;
      page-break-inside: avoid;
    }

    .photo-wrapper {
      page-break-inside: avoid;
    }

    /* Footer fixe */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px 40px;
      background: white;
      border-top: 2px solid #e5e7eb;
      font-size: 7px;
      color: #6b7280;
      text-align: center;
      line-height: 1.5;
      z-index: 1000;
    }

    .footer-logo {
      text-align: center;
      margin-bottom: 10px;
    }

    .footer-logo img {
      height: 40px;
      width: auto;
    }

    .page-break {
      page-break-before: always;
    }

    /* Badges DPE/GES */
    .dpe-badge {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 6px;
      color: white;
      font-weight: bold;
      font-size: 20px;
      text-align: center;
      min-width: 50px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .dpe-badges-container {
      display: flex;
      gap: 15px;
      align-items: center;
      margin-top: 10px;
    }

    .dpe-label {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 5px;
      font-weight: normal;
    }
  </style>
</head>
<body>
  <!-- PAGE 1: SYNTH\xC8SE DU BIEN -->
  <div class="page">
    <!-- Logo TASKIMO -->
    ${logoPath ? `<div style="margin-bottom: 20px;"><img src="${logoPath}" alt="TASKIMO" style="height: 60px; width: auto;" /></div>` : ""}

    <h1 class="title">SYNTH\xC8SE DU BIEN</h1>

    <div class="header-layout">
      <!-- Colonne gauche: Caract\xE9ristiques -->
      <div>
        <!-- Caract\xE9ristiques -->
        <div class="section">
          <div class="section-title">DESCRIPTION</div>
          <div class="section-content">
            <div class="info-line"><strong>Type de bien :</strong> ${typeBien}</div>
            <div class="info-line"><strong>Type de transaction :</strong> Vente</div>
            <div class="info-line"><strong>Code postal :</strong> ${codePostal || "-"}</div>
            <div class="info-line"><strong>Ville :</strong> ${ville}</div>
            ${nbEtagesImmeuble ? `<div class="info-line"><strong>Nombre d'\xE9tages :</strong> ${nbEtagesImmeuble}</div>` : ""}

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">ASPECT FINANCIER</strong>
              <div class="info-line"><strong>Prix :</strong> ${typeof prix === "number" ? prix.toLocaleString("fr-FR") : prix} \u20AC</div>
              <div class="info-line"><strong>Taxe fonci\xE8re :</strong> ${taxeFonciere ? taxeFonciere + " \u20AC" : "Non renseign\xE9e"}</div>
            </div>

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">COPROPRI\xC9T\xC9</strong>
              <div class="info-line"><strong>Copropri\xE9t\xE9 :</strong> ${chargesAnnuelles || nbLotsCopro ? "Oui" : "Non"}</div>
              ${nbLotsCopro ? `<div class="info-line"><strong>Nombre de lots :</strong> ${nbLotsCopro}</div>` : ""}
              ${chargesAnnuelles ? `<div class="info-line"><strong>Charges annuelles :</strong> ${chargesAnnuelles} \u20AC</div>` : ""}
            </div>

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">CARACT\xC9RISTIQUES DU BIEN</strong>
              <div class="info-line"><strong>Surface :</strong> ${surface ? surface + " m\xB2" : "-"}</div>
              ${anneConstruction ? `<div class="info-line"><strong>Ann\xE9e de construction :</strong> ${anneConstruction}</div>` : ""}
              ${etatGeneral ? `<div class="info-line"><strong>\xC9tat g\xE9n\xE9ral :</strong> ${etatGeneral}</div>` : ""}
              <div class="info-line"><strong>Nombre de pi\xE8ces :</strong> ${pieces || "-"}</div>
              <div class="info-line"><strong>Nombre de chambres :</strong> ${chambres || "-"}</div>
              ${nbSallesBain ? `<div class="info-line"><strong>Nombre de salles de bain :</strong> ${nbSallesBain}</div>` : ""}
              ${nbSallesEau ? `<div class="info-line"><strong>Nombre de salles d'eau :</strong> ${nbSallesEau}</div>` : ""}
              ${modeChauffage ? `<div class="info-line"><strong>Mode de chauffage :</strong> ${modeChauffage}</div>` : ""}
            </div>

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">AUTRES</strong>
              ${hasAscenseur ? `<div class="info-line">\u2022 Ascenseur</div>` : ""}
              ${hasInterphone ? `<div class="info-line">\u2022 Interphone</div>` : ""}
              ${hasDigicode ? `<div class="info-line">\u2022 Digicode</div>` : ""}
              ${hasTerrasse ? `<div class="info-line">\u2022 Terrasse</div>` : ""}
              ${hasBalcon ? `<div class="info-line">\u2022 Balcon</div>` : ""}
              ${hasCave ? `<div class="info-line">\u2022 Cave</div>` : ""}
              ${hasParking ? `<div class="info-line">\u2022 Parking (${nbParkings} place${nbParkings > 1 ? "s" : ""})</div>` : ""}
              ${!hasAscenseur && !hasInterphone && !hasDigicode && !hasTerrasse && !hasBalcon && !hasCave && !hasParking ? '<div class="info-line">-</div>' : ""}
            </div>

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">TERRAIN</strong>
              <div class="info-line"><strong>Terrain :</strong> ${surfaceTerrain ? "Oui" : "Non"}</div>
              ${surfaceTerrain ? `<div class="info-line"><strong>Superficie :</strong> ${surfaceTerrain} m\xB2</div>` : ""}
            </div>

            ${dpeClass || gesClass ? `
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">DIAGNOSTIC</strong>
              <div class="dpe-badges-container">
                ${dpeClass ? `
                <div>
                  <div class="dpe-label">Classe DPE</div>
                  <div class="dpe-badge" style="background-color: ${getDpeColor(dpeClass)};">${dpeClass}</div>
                </div>
                ` : ""}
                ${gesClass ? `
                <div>
                  <div class="dpe-label">Classe GES</div>
                  <div class="dpe-badge" style="background-color: ${getDpeColor(gesClass)};">${gesClass}</div>
                </div>
                ` : ""}
              </div>
            </div>
            ` : ""}
          </div>
        </div>
      </div>

      <!-- Colonne droite: Photo principale -->
      <div>
        ${mainImage ? `<img src="${mainImage}" alt="Photo principale" class="main-image" />` : '<div style="width:100%;height:280px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#9ca3af;">Aucune photo disponible</div>'}
      </div>
    </div>

  </div>

  <!-- PAGES PHOTOS -->
  ${photoPages.length > 0 ? photoPages.map((pageImages, index) => `
  <div class="page page-break photos-page">
    <div class="photos-title">LE BIEN EN PHOTOS</div>
    <div class="photo-grid">
      ${pageImages.map((img) => `
        <div class="photo-wrapper">
          <img src="${img}" alt="Photo du bien" class="photo-item" />
        </div>
      `).join("")}
    </div>
  </div>
  `).join("") : ""}

  <!-- FOOTER FIXE SUR TOUTES LES PAGES -->
  <div class="footer">
    ${logoPath ? `
    <div class="footer-logo">
      <img src="${logoPath}" alt="TASKIMO" />
    </div>
    ` : ""}
    <strong>LEVEL UP Immobilier</strong><br/>
    SARL LEVEL UP au capital de 10 000 euros - Si\xE8ge social : 4 rue des Charmes MORLA\xC0S<br/>
    RCS de Pau : 944348903 - Carte professionnelle Transaction n\xB0 CPI64022025000000009 d\xE9livr\xE9e par CCI de Pau Bearn<br/>
    Garantie financi\xE8re Galian (89, rue La Bo\xE9tie 75008 Paris) N\xB0. 159600 d'un montant de 120 000 \u20AC (sans d\xE9tention de fonds)<br/>
    RCP Galian N\xB0 RCP_01_174606P - TVA Intracommunautaire : FR22944348903<br/>
    CNPM MEDIATION CONSOMMATION : https://www.cnpm-mediation-consommation.eu/ - 27, avenue de la Lib\xE9ration, 42400 Saint-Chamond
  </div>
</body>
</html>
  `;
}

// src/modules/pdf/pdf.service.ts
var import_fs = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var PdfService = class {
  browser = null;
  /**
   * Initialise le navigateur Puppeteer (réutilisable pour de meilleures performances)
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await import_puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
    }
    return this.browser;
  }
  /**
   * Ferme le navigateur Puppeteer
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
  /**
   * Génère un PDF pour une fiche bien (annonce + DPE)
   */
  async generateFicheBien(options2) {
    logger.info(`\u{1F4C4} G\xE9n\xE9ration PDF pour annonce ${options2.annonceId}`);
    try {
      const match = await this.fetchMatchData(options2.annonceId);
      if (!match) {
        throw new Error(`Annonce ${options2.annonceId} introuvable`);
      }
      const images = this.extractImages(match.annonce);
      const logoPathFile = import_path2.default.join(process.cwd(), "public/assets/logo-levelup.png");
      let logoBase64 = "";
      try {
        const logoBuffer = import_fs.default.readFileSync(logoPathFile);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      } catch (error) {
        logger.warn("Logo not found, PDF will be generated without logo");
      }
      const html = renderProfessionalTemplate({
        annonce: match.annonce,
        bestDpe: match.bestDpe,
        score: match.score,
        images,
        logoPath: logoBase64
      });
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "15mm",
          bottom: "15mm",
          left: "10mm",
          right: "10mm"
        }
      });
      await page.close();
      logger.info(`\u2705 PDF g\xE9n\xE9r\xE9 avec succ\xE8s (${pdf.length} bytes)`);
      return pdf;
    } catch (error) {
      logger.error(`\u274C Erreur g\xE9n\xE9ration PDF:`, error);
      throw error;
    }
  }
  /**
   * Récupère les données complètes pour une annonce (avec son meilleur DPE si disponible)
   */
  async fetchMatchData(annonceId) {
    const matchCluster = await prisma.matchCluster.findUnique({
      where: { annonceId },
      include: {
        annonce: true,
        candidats: {
          include: {
            dpe: true
          },
          orderBy: {
            scoreNormalized: "desc"
          },
          take: 1
        }
      }
    });
    if (matchCluster && matchCluster.candidats.length > 0) {
      return {
        annonce: matchCluster.annonce,
        bestDpe: matchCluster.candidats[0].dpe,
        score: matchCluster.candidats[0].scoreNormalized
      };
    }
    const annonce = await prisma.leboncoinAnnonce.findUnique({
      where: { id: annonceId }
    });
    if (!annonce) {
      return null;
    }
    return {
      annonce,
      bestDpe: null,
      score: 0
    };
  }
  /**
   * Extrait les URLs des images depuis le rawData de l'annonce
   */
  extractImages(annonce) {
    const rawData = annonce.rawData;
    const imageUrls = rawData?.images?.urls || [];
    return imageUrls;
  }
  /**
   * Génère le template HTML de la fiche bien (format professionnel)
   */
  renderFicheTemplate(match) {
    const { annonce, bestDpe, score } = match;
    const rawData = annonce.rawData;
    const prix = rawData?.price?.[0] || annonce.prix || "Non renseign\xE9";
    const imageUrl = rawData?.images?.urls?.[0] || "";
    const description = rawData?.body || "Aucune description disponible";
    const location = rawData?.location;
    const ville = location?.city_label || location?.city || "Ville inconnue";
    const codePostal = location?.zipcode || annonce.codePostal;
    const adresse = bestDpe?.adresseBan || `${ville}, ${codePostal}`;
    const dpeColor = this.getDpeColor(bestDpe?.etiquetteDpe || annonce.etiquetteDpe);
    const gesColor = this.getDpeColor(bestDpe?.etiquetteGes || annonce.etiquetteGes);
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fiche Bien - ${ville}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
      line-height: 1.6;
      background: white;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      text-align: center;
    }

    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }

    .header .price {
      font-size: 36px;
      font-weight: bold;
      margin: 15px 0;
    }

    .header .address {
      font-size: 14px;
      opacity: 0.9;
    }

    /* Photo principale */
    .main-photo {
      width: 100%;
      height: 400px;
      object-fit: cover;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    /* Caract\xE9ristiques */
    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }

    .feature-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      border: 2px solid #e9ecef;
    }

    .feature-card .icon {
      font-size: 32px;
      margin-bottom: 10px;
    }

    .feature-card .label {
      font-size: 12px;
      color: #6c757d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 5px;
    }

    .feature-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #495057;
    }

    /* Section DPE */
    .dpe-section {
      background: #fff;
      padding: 25px;
      border-radius: 10px;
      margin-bottom: 30px;
      border: 2px solid #e9ecef;
    }

    .dpe-section h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #495057;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    .dpe-badges {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .dpe-badge {
      text-align: center;
      padding: 20px;
      border-radius: 8px;
      color: white;
      font-weight: bold;
    }

    .dpe-badge .label {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 5px;
    }

    .dpe-badge .value {
      font-size: 48px;
      font-weight: bold;
    }

    .dpe-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 20px;
    }

    .dpe-detail {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      font-size: 14px;
    }

    .dpe-detail strong {
      color: #495057;
    }

    /* Description */
    .description {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 10px;
      margin-bottom: 30px;
    }

    .description h2 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #495057;
    }

    .description p {
      font-size: 14px;
      color: #6c757d;
      line-height: 1.8;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 20px;
      color: #6c757d;
      font-size: 12px;
      border-top: 2px solid #e9ecef;
      margin-top: 30px;
    }

    .match-score {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>\u{1F3E0} Fiche Bien Immobilier</h1>
      <div class="price">${typeof prix === "number" ? prix.toLocaleString("fr-FR") : prix} \u20AC</div>
      <div class="address">\u{1F4CD} ${adresse}</div>
      ${annonce.dpeCorrected ? '<div class="match-score">\u2713 DPE V\xE9rifi\xE9</div>' : ""}
    </div>

    <!-- Photo principale -->
    ${imageUrl ? `<img src="${imageUrl}" alt="Photo du bien" class="main-photo" />` : ""}

    <!-- Caract\xE9ristiques -->
    <div class="features">
      <div class="feature-card">
        <div class="icon">\u{1F4D0}</div>
        <div class="label">Surface</div>
        <div class="value">${annonce.surface || bestDpe?.surfaceHabitable || "-"} m\xB2</div>
      </div>

      <div class="feature-card">
        <div class="icon">\u{1F6AA}</div>
        <div class="label">Pi\xE8ces</div>
        <div class="value">${annonce.pieces || bestDpe?.nombrePieces || "-"}</div>
      </div>

      <div class="feature-card">
        <div class="icon">\u{1F3D7}\uFE0F</div>
        <div class="label">Ann\xE9e</div>
        <div class="value">${annonce.anneConstruction || bestDpe?.anneConstruction || "-"}</div>
      </div>
    </div>

    <!-- DPE Section -->
    ${bestDpe ? `
    <div class="dpe-section">
      <h2>\u26A1 Performance \xC9nerg\xE9tique (DPE ADEME)</h2>

      <div class="dpe-badges">
        <div class="dpe-badge" style="background: ${dpeColor}">
          <div class="label">Consommation \xC9nerg\xE9tique</div>
          <div class="value">${bestDpe.etiquetteDpe || "-"}</div>
        </div>

        <div class="dpe-badge" style="background: ${gesColor}">
          <div class="label">\xC9missions GES</div>
          <div class="value">${bestDpe.etiquetteGes || "-"}</div>
        </div>
      </div>

      <div class="dpe-details">
        <div class="dpe-detail">
          <strong>Consommation:</strong> ${bestDpe.consommationEnergie || "-"} kWh/m\xB2/an
        </div>
        <div class="dpe-detail">
          <strong>\xC9missions:</strong> ${bestDpe.estimationGes || "-"} kg CO2/m\xB2/an
        </div>
        <div class="dpe-detail">
          <strong>Chauffage:</strong> ${bestDpe.typeChauffage || "Non renseign\xE9"}
        </div>
        <div class="dpe-detail">
          <strong>N\xB0 DPE:</strong> ${bestDpe.numeroDpe || "-"}
        </div>
      </div>

      ${score ? `<div style="text-align: center; margin-top: 20px;">
        <span class="match-score">\u2705 Match DPE: ${score}/100</span>
      </div>` : ""}
    </div>
    ` : ""}

    <!-- Description -->
    ${description ? `
    <div class="description">
      <h2>\u{1F4DD} Description</h2>
      <p>${description.substring(0, 800)}${description.length > 800 ? "..." : ""}</p>
    </div>
    ` : ""}

    <!-- Footer -->
    <div class="footer">
      <p>Fiche g\xE9n\xE9r\xE9e le ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })}</p>
      <p style="margin-top: 10px;">
        <a href="${annonce.url}" style="color: #667eea; text-decoration: none;">
          \u{1F517} Voir l'annonce compl\xE8te sur Leboncoin
        </a>
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }
  /**
   * Retourne la couleur correspondant à une étiquette DPE
   */
  getDpeColor(etiquette) {
    const colors = {
      A: "#00a650",
      B: "#50b748",
      C: "#c2d545",
      D: "#fef200",
      E: "#fdb913",
      F: "#f36f21",
      G: "#ed1c24"
    };
    return colors[etiquette || ""] || "#6c757d";
  }
};
var pdfService = new PdfService();

// src/modules/pdf/pdf.controller.ts
var PdfController = class {
  /**
   * GET /api/pdf/fiche/:annonceId
   * Génère et télécharge une fiche PDF pour une annonce
   */
  async generateFichePdf(req, res) {
    try {
      const { annonceId } = req.params;
      if (!annonceId) {
        return res.status(400).json({ error: "annonceId est requis" });
      }
      logger.info(`\u{1F4C4} Requ\xEAte g\xE9n\xE9ration PDF pour annonce ${annonceId}`);
      const pdfBuffer = await pdfService.generateFicheBien({ annonceId });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="fiche-bien-${annonceId}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.end(pdfBuffer, "binary");
      logger.info(`\u2705 PDF envoy\xE9 avec succ\xE8s (${pdfBuffer.length} bytes)`);
    } catch (error) {
      logger.error("\u274C Erreur g\xE9n\xE9ration PDF:", error);
      res.status(500).json({
        error: "Erreur lors de la g\xE9n\xE9ration du PDF",
        message: error.message
      });
    }
  }
};
var pdfController = new PdfController();

// src/modules/pdf/pdf.routes.ts
var router15 = (0, import_express15.Router)();
router15.get("/fiche/:annonceId", (req, res) => pdfController.generateFichePdf(req, res));
var pdf_routes_default = router15;

// src/modules/ia-analysis/ia-analysis.routes.ts
var import_express16 = require("express");

// src/modules/ia-analysis/ia-analysis.service.ts
var OPENROUTER_API_KEY = "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";
var IAAnalysisService = class {
  async analyzeAnnonce(annonceId) {
    const existingAnalysis = await prisma.iAAnalysis.findUnique({
      where: { annonceId }
    });
    if (existingAnalysis) {
      logger.info(`\u2705 Analyse IA existante trouv\xE9e pour annonce ${annonceId}`);
      return {
        etatGeneral: existingAnalysis.etatGeneral,
        travauxEstimes: JSON.parse(existingAnalysis.travauxEstimes),
        coutEstime: existingAnalysis.coutEstime,
        pointsForts: JSON.parse(existingAnalysis.pointsForts),
        pointsFaibles: JSON.parse(existingAnalysis.pointsFaibles)
      };
    }
    const annonce = await prisma.leboncoinAnnonce.findUnique({
      where: { id: annonceId }
    });
    if (!annonce) {
      throw new Error(`Annonce ${annonceId} introuvable`);
    }
    const rawData = annonce.rawData;
    const description = rawData?.body || "";
    const images = rawData?.images?.urls || [];
    const content = [];
    const imagesToAnalyze = images.slice(0, 5);
    for (const imageUrl of imagesToAnalyze) {
      try {
        const response2 = await fetch(imageUrl);
        const arrayBuffer = await response2.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        content.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64}`
          }
        });
      } catch (error) {
        logger.warn(`Erreur chargement image ${imageUrl}: ${error}`);
      }
    }
    content.push({
      type: "text",
      text: `Analyse ce bien immobilier en te basant sur les photos${description ? " et la description" : ""}.

${description ? `Description de l'annonce : ${description}` : ""}

Fournis une analyse d\xE9taill\xE9e au format JSON avec les champs suivants :
- etatGeneral: Une phrase d\xE9crivant l'\xE9tat g\xE9n\xE9ral du bien
- travauxEstimes: Liste d\xE9taill\xE9e des travaux n\xE9cessaires
- coutEstime: Estimation du co\xFBt total des travaux (format: "XX XXX \u20AC - YY YYY \u20AC")
- pointsForts: Array de 3-5 points forts du bien
- pointsFaibles: Array de 3-5 points faibles ou travaux n\xE9cessaires

R\xE9ponds UNIQUEMENT avec un JSON valide, sans texte avant ou apr\xE8s.`
    });
    logger.info(`\u{1F916} Envoi de ${imagesToAnalyze.length} images \xE0 Claude pour analyse`);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3001",
        "X-Title": "DPE Matching Analysis"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "user",
            content
          }
        ],
        max_tokens: 2e3
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "";
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (error) {
      logger.error(`Erreur parsing JSON: ${responseText}`);
      result = {
        etatGeneral: responseText,
        travauxEstimes: ["Analyse non disponible"],
        coutEstime: "Non estim\xE9",
        pointsForts: [],
        pointsFaibles: []
      };
    }
    try {
      await prisma.iAAnalysis.create({
        data: {
          annonceId,
          etatGeneral: result.etatGeneral || "",
          travauxEstimes: JSON.stringify(result.travauxEstimes || []),
          coutEstime: result.coutEstime || "Non estim\xE9",
          pointsForts: JSON.stringify(result.pointsForts || []),
          pointsFaibles: JSON.stringify(result.pointsFaibles || []),
          nombrePhotosAnalysees: imagesToAnalyze.length
        }
      });
      logger.info(`\u{1F4BE} Analyse IA sauvegard\xE9e pour annonce ${annonceId}`);
    } catch (saveError) {
      logger.error(`Erreur sauvegarde analyse IA: ${saveError}`);
    }
    return result;
  }
};
var iaAnalysisService = new IAAnalysisService();

// src/modules/ia-analysis/ia-analysis.controller.ts
var IAAnalysisController = class {
  async getAnalysis(req, res) {
    try {
      const { annonceId } = req.params;
      logger.info(`\u{1F4D6} Requ\xEAte r\xE9cup\xE9ration analyse IA pour annonce ${annonceId}`);
      const analysis = await prisma.iAAnalysis.findUnique({
        where: { annonceId }
      });
      if (!analysis) {
        return res.status(404).json({
          error: "Analyse non trouv\xE9e",
          message: "Aucune analyse IA n'existe pour cette annonce"
        });
      }
      res.json({
        etatGeneral: analysis.etatGeneral,
        travauxEstimes: JSON.parse(analysis.travauxEstimes),
        coutEstime: analysis.coutEstime,
        pointsForts: JSON.parse(analysis.pointsForts),
        pointsFaibles: JSON.parse(analysis.pointsFaibles)
      });
    } catch (error) {
      logger.error(`\u274C Erreur r\xE9cup\xE9ration analyse IA: ${error.message}`, error);
      res.status(500).json({
        error: "Erreur lors de la r\xE9cup\xE9ration de l'analyse IA",
        message: error.message
      });
    }
  }
  async analyzeAnnonce(req, res) {
    try {
      const { annonceId } = req.params;
      logger.info(`\u{1F916} Requ\xEAte analyse IA pour annonce ${annonceId}`);
      const result = await iaAnalysisService.analyzeAnnonce(annonceId);
      logger.info(`\u2705 Analyse IA termin\xE9e pour annonce ${annonceId}`);
      res.json(result);
    } catch (error) {
      logger.error(`\u274C Erreur analyse IA: ${error.message}`, error);
      res.status(500).json({
        error: "Erreur lors de l'analyse IA",
        message: error.message
      });
    }
  }
};
var iaAnalysisController = new IAAnalysisController();

// src/modules/ia-analysis/ia-analysis.routes.ts
var router16 = (0, import_express16.Router)();
router16.get("/:annonceId", (req, res) => iaAnalysisController.getAnalysis(req, res));
router16.post("/:annonceId", (req, res) => iaAnalysisController.analyzeAnnonce(req, res));
var ia_analysis_routes_default = router16;

// src/routes/index.ts
var router17 = (0, import_express17.Router)();
router17.use("/auth", auth_routes_default);
router17.use("/dpes", dpe_routes_default);
router17.use("/annonces", annonces_routes_default);
router17.use("/matching", matching_routes_default);
router17.use("/matching", matching_trigger_routes_default);
router17.use("/api-keys", api_keys_routes_default);
router17.use("/clusters", clusters_routes_default);
router17.use("/quartiers", quartiers_routes_default);
router17.use("/tracking", tracking_routes_default);
router17.use("/monday", monday_routes_default);
router17.use("/cadastre", cadastre_routes_default);
router17.use("/integration", integration_routes_default);
router17.use("/acquereurs", acquereurs_routes_default);
router17.use("/zones", zones_default);
router17.use("/pdf", pdf_routes_default);
router17.use("/ia-analysis", ia_analysis_routes_default);
var routes_default = router17;

// src/app.ts
BigInt.prototype.toJSON = function() {
  return this.toString();
};
var createApp = () => {
  const app2 = (0, import_express18.default)();
  app2.use((0, import_helmet.default)());
  app2.use((0, import_cors.default)(config.cors));
  app2.use(import_express18.default.json());
  app2.use(import_express18.default.urlencoded({ extended: true }));
  app2.use((0, import_compression.default)());
  app2.use(generalRateLimiter);
  app2.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.use("/api-docs", import_swagger_ui_express.default.serve, import_swagger_ui_express.default.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "DPE-Leboncoin API Documentation"
  }));
  app2.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  app2.use("/api", routes_default);
  app2.use(notFoundHandler);
  app2.use(errorHandler);
  return app2;
};

// src/vercel-entry.ts
var app = createApp();
var vercel_entry_default = app;
