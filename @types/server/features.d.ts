/**
 * Server features type declarations
 */

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  database: {
    url: string;
    ssl?: boolean;
  };
}

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: (req: any, res: any) => Promise<any>;
  middleware?: any[];
  auth?: boolean;
}

export interface ServerFeature {
  name: string;
  enabled: boolean;
  config?: Record<string, any>;
  routes?: ApiEndpoint[];
}
