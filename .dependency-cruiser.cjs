module.exports = {
  forbidden: [
    // ===== CIRCULAR DEPENDENCY RULES =====
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are not allowed',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-circular-infrastructure',
      severity: 'error',
      comment: 'Circular dependencies in infrastructure modules are not allowed',
      from: {
        path: '^client/src/infrastructure/'
      },
      to: {
        path: '^client/src/infrastructure/',
        circular: true
      }
    },

    // ===== CLIENT/SERVER BOUNDARY RULES =====
    {
      name: 'no-client-to-server',
      severity: 'error',
      comment: 'Client code should not import from server',
      from: {
        path: '^client/'
      },
      to: {
        path: '^server/'
      }
    },
    {
      name: 'no-server-to-client',
      severity: 'error',
      comment: 'Server code should not import from client',
      from: {
        path: '^server/'
      },
      to: {
        path: '^client/'
      }
    },
    {
      name: 'no-storage-and-persistence',
      severity: 'warn',
      comment: 'Do not mix legacy storage with modern persistence',
      from: {
        path: '^server/'
      },
      to: {
        path: '^server/(storage|persistence)/',
        pathNot: [
          '^server/storage/.*',
          '^server/persistence/.*'
        ]
      }
    },

    // ===== PUBLIC API ENFORCEMENT RULES =====
    {
      name: 'infrastructure-public-api-only',
      severity: 'error',
      comment: 'Infrastructure modules MUST be imported through their public API (index.ts) only',
      from: {
        path: '^client/src/',
        pathNot: '^client/src/infrastructure/'
      },
      to: {
        path: '^client/src/infrastructure/[^/]+/.+',
        pathNot: [
          '^client/src/infrastructure/[^/]+/index\\.ts$',
          '^client/src/infrastructure/[^/]+/types\\.ts$',
          '^client/src/infrastructure/[^/]+/types/',
          '^client/src/infrastructure/index\\.ts$',
          '^client/src/infrastructure/init\\.ts$'
        ]
      }
    },
    {
      name: 'infrastructure-internal-imports',
      severity: 'error',
      comment: 'Infrastructure modules should import from sibling modules through public API only',
      from: {
        path: '^client/src/infrastructure/([^/]+)/'
      },
      to: {
        path: '^client/src/infrastructure/([^/]+)/.+',
        pathNot: [
          '^client/src/infrastructure/([^/]+)/index\\.ts$',
          '^client/src/infrastructure/([^/]+)/types\\.ts$',
          '^client/src/infrastructure/([^/]+)/types/'
        ]
      }
    },
    {
      name: 'no-direct-submodule-imports',
      severity: 'error',
      comment: 'Sub-modules must be accessed through parent module public API',
      from: {
        path: '^client/src/',
        pathNot: '^client/src/infrastructure/'
      },
      to: {
        path: '^client/src/infrastructure/[^/]+/[^/]+/.+'
      }
    },

    // ===== ARCHITECTURAL LAYERING RULES =====
    // Layer 1: TYPES - Pure type definitions with no runtime dependencies
    {
      name: 'layer-types-no-upward-deps',
      severity: 'error',
      comment: 'TYPES layer (Layer 1) cannot depend on any higher layers (PRIMITIVES, SERVICES, INTEGRATION, PRESENTATION)',
      from: {
        path: '^client/src/infrastructure/(error|logging|observability|validation)/types'
      },
      to: {
        path: '^client/src/infrastructure/(?!(error|logging|observability|validation)/types)',
        pathNot: [
          '^client/src/infrastructure/index\\.ts$',
          '^shared/'
        ]
      }
    },
    {
      name: 'layer-types-only-shared-deps',
      severity: 'error',
      comment: 'TYPES layer can only depend on @shared/core and TypeScript built-ins',
      from: {
        path: '^client/src/infrastructure/(error|logging|observability|validation)/types'
      },
      to: {
        path: '^client/src/infrastructure/',
        pathNot: [
          '^client/src/infrastructure/(error|logging|observability|validation)/types'
        ]
      }
    },

    // Layer 2: PRIMITIVES - Core infrastructure primitives (events, storage, cache)
    {
      name: 'layer-primitives-no-upward-deps',
      severity: 'error',
      comment: 'PRIMITIVES layer (Layer 2) cannot depend on SERVICES, INTEGRATION, or PRESENTATION layers',
      from: {
        path: '^client/src/infrastructure/(events|storage|cache)/'
      },
      to: {
        path: '^client/src/infrastructure/(api|store|auth|observability|error|logging|validation|sync|search|security|personalization|recovery|command-palette|community|mobile|system|workers|asset-loading|browser|navigation|hooks)/'
      }
    },
    {
      name: 'layer-primitives-can-use-types',
      severity: 'error',
      comment: 'PRIMITIVES layer can depend on TYPES layer and @shared/core',
      from: {
        path: '^client/src/infrastructure/(events|storage|cache)/'
      },
      to: {
        path: '^client/src/infrastructure/(?!(events|storage|cache|error|logging|observability|validation)/types)',
        pathNot: [
          '^client/src/infrastructure/(error|logging|observability|validation)/types',
          '^shared/'
        ]
      }
    },

    // Layer 3: SERVICES - Core services (api, observability, error, logging, validation)
    {
      name: 'layer-services-no-upward-deps',
      severity: 'error',
      comment: 'SERVICES layer (Layer 3) cannot depend on INTEGRATION or PRESENTATION layers',
      from: {
        path: '^client/src/infrastructure/(api|observability|error|logging|validation)/'
      },
      to: {
        path: '^client/src/infrastructure/(store|auth|sync|search|security|personalization|recovery|command-palette|community|mobile|system|workers|asset-loading|browser|navigation|hooks)/'
      }
    },
    {
      name: 'layer-services-can-use-primitives',
      severity: 'warn',
      comment: 'SERVICES layer should primarily depend on PRIMITIVES and TYPES layers',
      from: {
        path: '^client/src/infrastructure/(api|observability|error|logging|validation)/'
      },
      to: {
        path: '^client/src/infrastructure/(?!(api|observability|error|logging|validation|events|storage|cache)/)',
        pathNot: [
          '^client/src/infrastructure/(error|logging|observability|validation)/types',
          '^shared/'
        ]
      }
    },

    // Layer 4: INTEGRATION - Integration with external systems (store, auth, sync, etc.)
    {
      name: 'layer-integration-no-upward-deps',
      severity: 'error',
      comment: 'INTEGRATION layer (Layer 4) cannot depend on PRESENTATION layer',
      from: {
        path: '^client/src/infrastructure/(store|auth|sync|search|security|personalization|recovery)/'
      },
      to: {
        path: '^client/src/infrastructure/(command-palette|community|mobile|system|workers|asset-loading|browser|navigation|hooks)/'
      }
    },
    {
      name: 'layer-integration-can-use-services',
      severity: 'info',
      comment: 'INTEGRATION layer can depend on SERVICES, PRIMITIVES, and TYPES layers',
      from: {
        path: '^client/src/infrastructure/(store|auth|sync|search|security|personalization|recovery)/'
      },
      to: {
        path: '^client/src/infrastructure/(api|observability|error|logging|validation|events|storage|cache)/'
      }
    },

    // Layer 5: PRESENTATION - UI-related infrastructure (command-palette, community, mobile, etc.)
    {
      name: 'layer-presentation-can-use-all-lower',
      severity: 'info',
      comment: 'PRESENTATION layer (Layer 5) can depend on all lower layers',
      from: {
        path: '^client/src/infrastructure/(command-palette|community|mobile|system|workers|asset-loading|browser|navigation|hooks)/'
      },
      to: {
        path: '^client/src/infrastructure/(store|auth|sync|search|security|personalization|recovery|api|observability|error|logging|validation|events|storage|cache)/'
      }
    },

    // Cross-layer circular dependency prevention
    {
      name: 'no-circular-across-layers',
      severity: 'error',
      comment: 'Circular dependencies across architectural layers are strictly forbidden',
      from: {
        path: '^client/src/infrastructure/'
      },
      to: {
        path: '^client/src/infrastructure/',
        circular: true
      }
    },

    // ===== MODULE-SPECIFIC BOUNDARY RULES =====
    {
      name: 'observability-encapsulation',
      severity: 'error',
      comment: 'Observability sub-modules must not be imported directly',
      from: {
        path: '^client/src/',
        pathNot: '^client/src/infrastructure/observability/'
      },
      to: {
        path: '^client/src/infrastructure/observability/(error-monitoring|performance|telemetry|analytics)/'
      }
    },
    {
      name: 'store-slices-encapsulation',
      severity: 'error',
      comment: 'Store slices must not be imported directly, use store public API',
      from: {
        path: '^client/src/',
        pathNot: '^client/src/infrastructure/store/'
      },
      to: {
        path: '^client/src/infrastructure/store/slices/'
      }
    },
    {
      name: 'api-submodules-encapsulation',
      severity: 'error',
      comment: 'API sub-modules (http, websocket, realtime) must not be imported directly',
      from: {
        path: '^client/src/',
        pathNot: '^client/src/infrastructure/api/'
      },
      to: {
        path: '^client/src/infrastructure/api/(http|websocket|realtime)/'
      }
    },
    {
      name: 'error-internal-encapsulation',
      severity: 'error',
      comment: 'Error module internals must not be imported directly',
      from: {
        path: '^client/src/',
        pathNot: '^client/src/infrastructure/error/'
      },
      to: {
        path: '^client/src/infrastructure/error/(factory|handler|serialization|recovery)/'
      }
    },
    {
      name: 'logging-internal-encapsulation',
      severity: 'error',
      comment: 'Logging module internals must not be imported directly',
      from: {
        path: '^client/src/',
        pathNot: '^client/src/infrastructure/logging/'
      },
      to: {
        path: '^client/src/infrastructure/logging/(client-logger|config|formatters)/'
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json'
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+'
      },
      archi: {
        collapsePattern: '^(client|server|shared)/[^/]+'
      }
    }
  }
};
