/**
 * System Status Service
 * Real-time operational monitoring for user visibility
 */
import { globalApiClient } from '@client/infrastructure/api/client';

export type ServiceStatus = 'operational' | 'degraded' | 'maintenance' | 'down';

export interface ServiceComponent {
  name: string;
  status: ServiceStatus;
  lastUpdated: string;
  message?: string;
}

export interface SystemStatus {
  overallStatus: ServiceStatus;
  components: ServiceComponent[];
  lastUpdated: string;
  incidentHistory: Array<{ id: string; title: string; status: string; resolvedAt?: string }>;
}

export const statusService = {
  async fetchSystemStatus(): Promise<SystemStatus> {
    const response = await globalApiClient.get<SystemStatus>('/api/status');
    return response.data;
  },

  async subscribeToStatusUpdates(onUpdate: (status: SystemStatus) => void): Promise<() => void> {
    // Delegates to infrastructure for real-time updates
    const interval = setInterval(async () => {
      const status = await this.fetchSystemStatus();
      onUpdate(status);
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  },

  async reportIncident(title: string, affectedServices: string[]): Promise<void> {
    await globalApiClient.post('/api/status/incident', { title, affectedServices });
  },

  async getIncidentHistory(days: number = 30): Promise<Array<{ id: string; title: string; status: string }>> {
    const response = await globalApiClient.get<Array<{ id: string; title: string; status: string }>>('/api/status/incidents', { params: { days } });
    return response.data;
  },
};
