module.exports = {
  forbidden: [
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
