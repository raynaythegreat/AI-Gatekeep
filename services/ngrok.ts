import axios, { AxiosInstance, AxiosError } from 'axios';

export interface NgrokTunnel {
  id: string;
  public_url: string;
  proto: string;
  addr: string;
  port: number;
  region: string;
  created_at: string;
}

export interface NgrokAccount {
  id: string;
  name: string;
  email: string;
}

export interface NgrokCreateOptions {
  port: number;
  proto?: 'http' | 'https' | 'tcp';
  region?: string;
}

function formatNgrokError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string }>;
    
    if (axiosError.response?.status === 401) {
      return 'Invalid ngrok API key';
    }
    if (axiosError.response?.status === 403) {
      return 'Forbidden - Check API key permissions';
    }
    if (axiosError.response?.status === 404) {
      return 'Tunnel not found';
    }
    if (axiosError.response?.status === 429) {
      return 'Rate limited - try again later';
    }
    
    return axiosError.response?.data?.error ||
           axiosError.message ||
           'Failed to create tunnel';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Unknown error occurred';
}

export class NgrokService {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim().length < 10) {
      throw new Error('Invalid ngrok API key');
    }

    this.client = axios.create({
      baseURL: 'https://api.ngrok.com/api/v2',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Ngrok-Version': '2',
      },
      timeout: 30000,
    });
  }

  async createTunnel(options: NgrokCreateOptions): Promise<NgrokTunnel> {
    try {
      const response = await this.client.post('/tunnels', {
        addr: `${options.proto || 'http'}://localhost:${options.port}`,
        proto: options.proto || 'http',
        region: options.region || 'us',
        bind_tls: options.proto === 'https',
      });

      return response.data as NgrokTunnel;
    } catch (error) {
      throw new Error(formatNgrokError(error));
    }
  }

  async listTunnels(): Promise<NgrokTunnel[]> {
    try {
      const response = await this.client.get('/tunnels');
      const tunnels = Array.isArray(response.data)
        ? response.data
        : [];

      return tunnels as NgrokTunnel[];
    } catch (error) {
      console.error('Failed to list tunnels:', error);
      return [];
    }
  }

  async getTunnel(tunnelId: string): Promise<NgrokTunnel | null> {
    try {
      const response = await this.client.get(`/tunnels/${encodeURIComponent(tunnelId)}`);
      return response.data as NgrokTunnel;
    } catch (error) {
      console.error(`Failed to get tunnel ${tunnelId}:`, error);
      return null;
    }
  }

  async deleteTunnel(tunnelId: string): Promise<void> {
    try {
      await this.client.delete(`/tunnels/${encodeURIComponent(tunnelId)}`);
      console.log(`Successfully deleted ngrok tunnel: ${tunnelId}`);
    } catch (error) {
      throw new Error(formatNgrokError(error));
    }
  }

  async validateToken(): Promise<{ valid: boolean; account?: NgrokAccount }> {
    try {
      const response = await this.client.get('/account');
      const account = response.data as NgrokAccount;
      
      return {
        valid: true,
        account
      };
    } catch (error) {
      console.error('Failed to validate ngrok token:', error);
      const errorMessage = formatNgrokError(error);
      
      if (errorMessage.includes('Invalid') || errorMessage.includes('401')) {
        return { valid: false };
      }
      
      return { valid: true };
    }
  }
}
