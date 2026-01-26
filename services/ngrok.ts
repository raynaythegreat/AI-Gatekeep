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
  domain?: string;
}

// Ngrok Agent API response types
interface NgrokAgentTunnel {
  name: string;
  proto: string;
  addr: string;
  public_url: string;
  metrics: {
    conns: { count: number; gauge: number };
    http: { count: number; rate: number };
  }
}

interface NgrokAgentResponse {
  tunnels: NgrokAgentTunnel[];
  uri: string;
  public_url: string;
}

function formatNgrokError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; details?: { messages?: string[] } }>;

    if (axiosError.response?.status === 401) {
      return 'Invalid ngrok API key';
    }
    if (axiosError.response?.status === 403) {
      return 'Forbidden - Check API key permissions';
    }
    if (axiosError.response?.status === 404) {
      return 'Resource not found';
    }
    if (axiosError.response?.status === 429) {
      return 'Rate limited - try again later';
    }

    // Try to get detailed error messages
    const details = axiosError.response?.data?.details?.messages;
    if (details && details.length > 0) {
      return details.join(', ');
    }

    return axiosError.response?.data?.error ||
           axiosError.message ||
           'Failed to communicate with ngrok';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error occurred';
}

export class NgrokService {
  private cloudClient: AxiosInstance;
  private localClient: AxiosInstance;
  private readonly LOCAL_AGENT_URL = 'http://127.0.0.1:4040';
  private readonly LOCAL_API_URL = 'http://127.0.0.1:4040/api';

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim().length < 10) {
      throw new Error('Invalid ngrok API key');
    }

    // Cloud API client for reserved domains, edges, etc.
    this.cloudClient = axios.create({
      baseURL: 'https://api.ngrok.com/api/v2',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Ngrok-Version': '2',
      },
      timeout: 30000,
    });

    // Local agent API client
    this.localClient = axios.create({
      baseURL: this.LOCAL_API_URL,
      timeout: 10000,
    });
  }

  /**
   * Check if the ngrok agent is running locally
   */
  async isAgentRunning(): Promise<boolean> {
    try {
      await this.localClient.get('/');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create or find a tunnel for the specified port
   * Uses the ngrok agent's local API to find existing tunnels
   */
  async createTunnel(options: NgrokCreateOptions): Promise<NgrokTunnel> {
    const agentRunning = await this.isAgentRunning();

    if (!agentRunning) {
      throw new Error(
        'ngrok agent is not running. Please start ngrok first:\n' +
        '1. Install ngrok: https://ngrok.com/download\n' +
        '2. Run: ngrok http 3456\n' +
        '3. Then try deploying again'
      );
    }

    // Get all tunnels from the local agent
    const tunnels = await this.listTunnels();

    // Look for a tunnel that's already pointing to our target port
    const targetAddr = `localhost:${options.port}`;
    const existingTunnel = tunnels.find(t => t.addr === targetAddr || t.port === options.port);

    if (existingTunnel) {
      console.log(`Found existing tunnel for port ${options.port}: ${existingTunnel.public_url}`);
      return existingTunnel;
    }

    // No tunnel found - provide instructions
    throw new Error(
      `No ngrok tunnel found for port ${options.port}.\n\n` +
      `Please start ngrok with this command:\n` +
      `ngrok http ${options.port}\n\n` +
      `Then try deploying again.`
    );
  }

  /**
   * List all tunnels from the ngrok agent
   */
  async listTunnels(): Promise<NgrokTunnel[]> {
    const agentRunning = await this.isAgentRunning();

    if (!agentRunning) {
      return [];
    }

    try {
      const response = await this.localClient.get<NgrokAgentResponse>('/tunnels');
      const agentTunnels = response.data.tunnels || [];

      return agentTunnels.map((t: NgrokAgentTunnel) => ({
        id: t.name || t.public_url,
        public_url: t.public_url,
        proto: t.proto,
        addr: t.addr,
        port: parseInt(t.addr.split(':')[1]) || 80,
        region: 'local',
        created_at: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to list tunnels from ngrok agent:', error);
      return [];
    }
  }

  /**
   * Get a specific tunnel by ID or URL
   */
  async getTunnel(tunnelId: string): Promise<NgrokTunnel | null> {
    const tunnels = await this.listTunnels();
    return tunnels.find(t => t.id === tunnelId || t.public_url === tunnelId) || null;
  }

  /**
   * Delete a tunnel (stops it via the agent API)
   */
  async deleteTunnel(tunnelId: string): Promise<void> {
    const agentRunning = await this.isAgentRunning();

    if (!agentRunning) {
      throw new Error('ngrok agent is not running');
    }

    try {
      // Find the tunnel and stop it
      const tunnels = await this.listTunnels();
      const tunnel = tunnels.find(t => t.id === tunnelId || t.public_url === tunnelId);

      if (tunnel) {
        // Extract the tunnel name from the public URL or ID
        const tunnelName = tunnel.public_url.split('https://')[1];
        await this.localClient.delete(`/tunnels/${tunnelName}`);
        console.log(`Successfully stopped ngrok tunnel: ${tunnelName}`);
      }
    } catch (error) {
      throw new Error(formatNgrokError(error));
    }
  }

  /**
   * Validate the ngrok API key with the cloud API
   */
  async validateToken(): Promise<{ valid: boolean; account?: NgrokAccount }> {
    try {
      const response = await this.cloudClient.get('/account');
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

  /**
   * Create a reserved domain using the cloud API
   */
  async createReservedDomain(description: string, region: string = 'us'): Promise<string> {
    try {
      const response = await this.cloudClient.post('/reserved_domains', {
        description,
        region,
      });
      return response.data.hostname;
    } catch (error) {
      throw new Error(formatNgrokError(error));
    }
  }

  /**
   * List reserved domains
   */
  async listReservedDomains(): Promise<string[]> {
    try {
      const response = await this.cloudClient.get('/reserved_domains');
      const domains = response.data.reserved_domains || [];
      return domains.map((d: any) => d.hostname);
    } catch (error) {
      console.error('Failed to list reserved domains:', error);
      return [];
    }
  }
}
