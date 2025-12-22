// Base interfaces to break circular dependencies
export interface BaseObservabilityInterface {
  [key: string]: any;
}

export interface BaseTelemetryInterface {
  [key: string]: any;
}

export interface BaseMetricsInterface {
  [key: string]: any;
}
