export interface BrowserInfo {
  name: string;
  version: string;
  majorVersion: number;
  engine: 'Blink' | 'Gecko' | 'WebKit' | 'Trident' | 'EdgeHTML' | 'Unknown';
  platform: string;
  userAgent: string;
  language: string;
  languages: string[];
  cookieEnabled: boolean;
  onLine: boolean;
  product: string;
  productSub: string;
  vendor: string;
  vendorSub: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  maxTouchPoints?: number;
  detectedAt: Date;
}

export interface FeatureSet {
  webgl: boolean;
  webgl2: boolean;
  serviceWorker: boolean;
  webAssembly: boolean;
  webRTC: boolean;
  indexedDB: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  geolocation: boolean;
  notification: boolean;
  push: boolean;
  backgroundSync: boolean;
  paymentRequest: boolean;
  credentialManagement: boolean;
  webAuthn: boolean;
  webShare: boolean;
  webShareTarget: boolean;
  fileSystemAccess: boolean;
  fileHandling: boolean;
  wakeLock: boolean;
  screenWakeLock: boolean;
  periodicBackgroundSync: boolean;
  backgroundFetch: boolean;
  contentIndexing: boolean;
  nativeFileSystem: boolean;
  webCodecs: boolean;
  webTransport: boolean;
  webUSB: boolean;
  webBluetooth: boolean;
  webHID: boolean;
  webNFC: boolean;
  webSerial: boolean;
  webMIDI: boolean;
  webAudio: boolean;
  webGL: boolean;
  webVR: boolean;
  webXR: boolean;
  gamepad: boolean;
  pointerLock: boolean;
  fullscreen: boolean;
  pictureInPicture: boolean;
  mediaSession: boolean;
  mediaCapabilities: boolean;
  encryptedMedia: boolean;
  managedMediaSource: boolean;
  mediaSource: boolean;
  textTracks: boolean;
  webVTT: boolean;
  resizeObserver: boolean;
  intersectionObserver: boolean;
  mutationObserver: boolean;
  performanceObserver: boolean;
  reportingObserver: boolean;
  layoutInstability: boolean;
  largestContentfulPaint: boolean;
  firstInput: boolean;
  longTasks: boolean;
  eventTiming: boolean;
  navigationTiming: boolean;
  resourceTiming: boolean;
  userTiming: boolean;
  serverTiming: boolean;
  paintTiming: boolean;
  elementTiming: boolean;
  customMetrics: boolean;
}

export type CompatibilityStatus = 'supported' | 'partial' | 'unsupported' | 'unknown';

export interface BrowserCapabilities {
  hardwareConcurrency: number;
  deviceMemory?: number;
  maxTouchPoints: number;
  screen: ScreenInfo;
  connection?: ConnectionInfo;
  permissions: PermissionStatus[];
  mediaDevices: MediaDeviceInfo[];
  battery?: BatteryInfo;
  vibration: boolean;
  ambientLight?: boolean;
  proximity?: boolean;
  accelerometer?: boolean;
  gyroscope?: boolean;
  magnetometer?: boolean;
  orientation?: boolean;
  detectedAt: Date;
}

export interface ScreenInfo {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  orientation?: {
    angle: number;
    type: 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary';
  };
}

export interface ConnectionInfo {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  rtt: number;
  downlink: number;
  saveData: boolean;
}

export interface PermissionStatus {
  name: PermissionName;
  state: 'granted' | 'denied' | 'prompt';
}

export interface MediaDeviceInfo {
  deviceId: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
  label: string;
  groupId: string;
}

export interface BatteryInfo {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

export interface BrowserCompatibility {
  browser: BrowserInfo;
  features: FeatureSet;
  capabilities: BrowserCapabilities;
  compatibility: Record<string, CompatibilityStatus>;
  recommendations: BrowserRecommendation[];
  lastChecked: Date;
}

export interface BrowserRecommendation {
  type: 'update' | 'alternative' | 'polyfill' | 'feature-flag';
  message: string;
  severity: 'low' | 'medium' | 'high';
  actionUrl?: string;
  affectedFeatures: string[];
}

export interface BrowserFingerprint {
  canvas: string;
  webgl: string;
  fonts: string[];
  plugins: string[];
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: boolean;
  screenResolution: string;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  hardwareConcurrency: number;
  deviceMemory?: number;
  generatedAt: Date;
}

export interface BrowserStorage {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  webSQL: boolean;
  cookies: boolean;
  cacheStorage: boolean;
  fileSystem: boolean;
  quota?: number;
  usage?: number;
}

export interface BrowserSecurity {
  https: boolean;
  mixedContent: boolean;
  insecureRequests: string[];
  certificateValid: boolean;
  certificateExpiry?: Date;
  hsts: boolean;
  csp: boolean;
  referrerPolicy: string;
  featurePolicy: Record<string, string>;
}

export interface BrowserNetwork {
  protocols: string[];
  http2: boolean;
  http3: boolean;
  websocket: boolean;
  webtransport: boolean;
  serverTiming: boolean;
  connectionHints: string[];
}

export interface BrowserAPIs {
  fetch: boolean;
  xhr: boolean;
  beacon: boolean;
  eventsource: boolean;
  websockets: boolean;
  webtransport: boolean;
  streams: boolean;
  formData: boolean;
  urlSearchParams: boolean;
  url: boolean;
  blob: boolean;
  file: boolean;
  filereader: boolean;
  arrayBuffer: boolean;
  dataView: boolean;
  typedArrays: boolean;
  sharedArrayBuffer: boolean;
  atomics: boolean;
  webWorkers: boolean;
  sharedWorkers: boolean;
  serviceWorkers: boolean;
  worklets: boolean;
}