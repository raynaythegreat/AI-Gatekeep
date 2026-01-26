import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { buildChatApiHeaders } from "@/lib/chatHeaders";
import { VercelService } from "@/services/vercel";
import { GitHubService } from "@/services/github";
import { ensureNgrokTunnel } from "@/lib/ngrok";
import { getServerApiKey } from "@/lib/serverKeys";

export const dynamic = 'force-dynamic';

function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
}

function formatDeploymentError(errorMessage: string): string {
  if (errorMessage.includes('401') || errorMessage.includes('403')) {
    return 'Authentication failed. Please check your API keys.';
  }
  if (errorMessage.includes('404')) {
    return 'Repository or project not found.';
  }
  if (errorMessage.includes('repoId') || errorMessage.includes('repo')) {
    return 'Could not resolve GitHub repository. Ensure it exists and is connected to Vercel.';
  }
  if (errorMessage.includes('ngrok')) {
    return `Ngrok tunnel failed: ${errorMessage}`;
  }
  return errorMessage;
}

function getTunnelFailureActions(errorMsg: string): string[] {
  const actions: string[] = [];
  
  if (errorMsg.includes('CLI not found')) {
    actions.push('Install ngrok: npm install -g ngrok');
  }
  if (errorMsg.includes('authentication') || errorMsg.includes('401') || errorMsg.includes('Invalid API key')) {
    actions.push('Verify ngrok API key at: https://dashboard.ngrok.com/api-keys');
    actions.push('Run manually: ngrok config add-authtoken YOUR_API_KEY');
  }
  if (errorMsg.includes('timeout')) {
    actions.push('Ensure local server is running on port 3456');
    actions.push('Try manual command: ngrok http 3456');
  }
  if (!actions.length) {
    actions.push('Try starting ngrok manually: ngrok http 3456');
    actions.push('Check if ngrok is installed: ngrok version');
  }
  
  return actions;
}

function getActionItems(errorMessage: string, isTunnelError: boolean): string[] {
  if (isTunnelError) {
    return getTunnelFailureActions(errorMessage);
  }
  
  const actions: string[] = [];
  
  if (errorMessage.includes('401') || errorMessage.includes('403')) {
    actions.push('Check Vercel API key at: https://vercel.com/account/settings/tokens');
    actions.push('Check GitHub token has repo scope');
    actions.push('Verify ngrok API key');
  }
  if (errorMessage.includes('404')) {
    actions.push('Verify repository format: owner/repo');
    actions.push('Check if repository exists and is public');
    actions.push('Ensure repository is connected to Vercel');
  }
  if (errorMessage.includes('repoId') || errorMessage.includes('repo')) {
    actions.push('Ensure GITHUB_TOKEN is set');
    actions.push('Check repository exists on GitHub');
    actions.push('Ensure repository has GitHub Pages or Vercel integration');
  }
  if (!actions.length) {
    actions.push('Check browser console for detailed error logs');
    actions.push('Verify all API keys are configured correctly');
    actions.push('Ensure local OS Athena is running on port 3456');
  }
  
  return actions;
}

const logs: { type: 'info' | 'success' | 'error', message: string }[] = [];

function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
  logs.push({ type, message });
  console.log(`[mobile-deploy] [${type}] ${message}`);
}

export async function POST(request: NextRequest) {
  if (!isLocalhostRequest(request)) {
    return NextResponse.json(
      { error: "Mobile deployment only allowed from localhost" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { repository, password, branch = 'main' } = body;

    if (!repository || typeof repository !== 'string' || !repository.trim()) {
      return NextResponse.json(
        { error: "Repository is required (format: owner/repo)" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json(
        { error: "Password is required (minimum 4 characters)" },
        { status: 400 }
      );
    }

    const ownerRepo = repository.trim();
    if (!/^[^/]+\/[^/]+$/.test(ownerRepo)) {
      return NextResponse.json(
        { error: "Invalid repository format. Expected: owner/repo (e.g., yourusername/os-athena-mobile)" },
        { status: 400 }
      );
    }

    const [owner, repo] = ownerRepo.split('/');

    const headers = await buildChatApiHeaders();

    const ngrokKey = getServerApiKey('ngrok', headers);
    const vercelKey = getServerApiKey('vercel', headers);
    const githubToken = getServerApiKey('github', headers);

    if (!ngrokKey || !vercelKey || !githubToken) {
      console.error('Missing API keys:', {
        ngrok: !!ngrokKey,
        vercel: !!vercelKey,
        github: !!githubToken
      });
      return NextResponse.json(
        {
          error: "Missing required API keys. Please configure Ngrok, Vercel, and GitHub tokens in Settings.",
          missing: {
            ngrok: !ngrokKey,
            vercel: !vercelKey,
            github: !githubToken
          }
        },
        { status: 400 }
      );
    }

    const deploymentKey = `mobile:${Date.now()}`;

    try {
      console.log('Starting mobile deployment:', { repository: ownerRepo, branch });
      
      addLog('Creating ngrok tunnel for port 3456...', 'info');
      const tunnelResult = await ensureNgrokTunnel(3456, ngrokKey);

      if (!tunnelResult.publicUrl) {
        const errorMsg = tunnelResult.error || 'Failed to establish ngrok tunnel';
        addLog(`Tunnel creation failed: ${errorMsg}`, 'error');
        const actionItems = getTunnelFailureActions(errorMsg);
        return NextResponse.json(
          { 
            error: errorMsg,
            type: 'tunnel_failure',
            actionItems
          },
          { status: 500 }
        );
      }

      const tunnel = {
        id: `mobile-${Date.now()}`,
        public_url: tunnelResult.publicUrl,
        port: 3456
      };

      addLog(`✓ Tunnel created: ${tunnel.id}`, 'success');
      addLog(`Public URL: ${tunnel.public_url}`, 'info');

      const github = new GitHubService(githubToken);
      addLog(`Verifying repository: ${ownerRepo}`, 'info');
      const repoData = await github.getRepository(owner, repo);

      if (!repoData) {
        addLog(`Repository not found: ${ownerRepo}`, 'error');
        return NextResponse.json(
          { 
            error: "Repository not found. Check the owner/repo format.",
            type: 'repository_error'
          },
          { status: 404 }
        );
      }

      addLog('✓ Repository verified', 'success');

      const vercel = new VercelService(vercelKey);

      const envVars = [
        {
          key: 'OS_PUBLIC_URL',
          value: tunnel.public_url,
          target: ['production', 'preview']
        },
        {
          key: 'MOBILE_PASSWORD',
          value: password,
          target: ['production', 'preview']
        },
        {
          key: 'OS_REMOTE_MODE',
          value: 'true',
          target: ['production', 'preview']
        },
        {
          key: 'NGROK_TUNNEL_ID',
          value: tunnel.id,
          target: ['production', 'preview']
        }
      ];

      console.log('Deploying with environment variables:', envVars.map(v => ({ key: v.key, value: v.value })));

      addLog('Starting Vercel deployment...', 'info');
      
      // Auto-load additional environment variables from local env.local if available
      try {
        const envContent = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf-8");
        const skippedKeys = ['OS_PUBLIC_URL', 'MOBILE_PASSWORD', 'OS_REMOTE_MODE', 'NGROK_TUNNEL_ID', 'NODE_ENV', 'NEXT_TELEMETRY_DISABLED'];
        
        envContent.split("\n").forEach(line => {
          if (line.trim() && !line.trim().startsWith("#")) {
            const eqIndex = line.indexOf("=");
            if (eqIndex > 0) {
              const key = line.substring(0, eqIndex).trim();
              const value = line.substring(eqIndex + 1).trim();
              if (!skippedKeys.includes(key) && key && value) {
                envVars.push({ key: key, value: value, target: ['production', 'preview'] });
              }
            }
          }
        });
        addLog('✓ Copied additional env variables from local env.local', 'success');
      } catch (err) {
        addLog('No additional env.local variables to copy', 'info');
      }

      const deployment = await vercel.deployFromGitHub({
        projectName: repo,
        repository: ownerRepo,
        branch,
        environmentVariables: envVars
      });

      addLog(`✓ Deployment created: ${deployment.deploymentId}`, 'success');
      addLog(`Deployment URL: ${deployment.url}`, 'info');

      return NextResponse.json({
        success: true,
        tunnel: {
          id: tunnel.id,
          public_url: tunnel.public_url
        },
        deployment: {
          url: deployment.url,
          deploymentId: deployment.deploymentId
        },
        mobileUrl: deployment.url
      }, {
        headers: {
          'x-mobile-deployment-id': tunnel.id,
          'x-mobile-public-url': tunnel.public_url,
          'x-mobile-url': deployment.url,
          'x-mobile-active': 'true'
        }
      });
    } catch (error) {
      console.error('Mobile deployment error:', error);

      let errorMessage = 'Deployment failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      const isTunnelError = errorMessage.includes('ngrok') || errorMessage.includes('tunnel');
      const errorType = isTunnelError ? 'tunnel_failure' : 'deployment_failure';
      
      const actionItems = getActionItems(errorMessage, isTunnelError);
      
      const formattedError = formatDeploymentError(errorMessage);
      addLog(`✗ ${formattedError}`, 'error');
      
      return NextResponse.json(
        { 
          error: formattedError,
          type: errorType,
          actionItems,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Request processing failed'
      },
      { status: 500 }
    );
  }
}
