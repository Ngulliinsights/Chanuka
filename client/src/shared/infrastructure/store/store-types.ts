// Store types to break circular dependencies
export interface BaseStoreState {
  [key: string]: any;
}

export interface UserDashboardState extends BaseStoreState {
  [key: string]: any;
}

export interface StoreAction {
  type: string;
  payload?: any;
}
