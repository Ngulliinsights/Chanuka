import { WebSocketManager as BaseWebSocketManager } from '@client/infrastructure/api';

export const WebSocketManager = BaseWebSocketManager;
export const getWebSocketManager = () => WebSocketManager;