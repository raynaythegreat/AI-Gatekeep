import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";
import { VercelService } from "@/services/vercel";
import { GitHubService } from "@/services/github";
import { NgrokService } from "@/services/ngrok";
import { SecureStorage } from "@/lib/secureStorage";

export const dynamic = 'force-dynamic';

function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
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

    const ngrokKey = headers['X-API-Key-Ngrok'] || await SecureStorage.getKey('ngrok');
    const vercelKey = headers['X-API-Key-Vercel'] || await SecureStorage.getKey('vercel');
    const githubToken = headers['X-API-Key-GitHub'] || await SecureStorage.getKey('github');

    if (!ngrokKey || !vercelKey || !githubToken) {
      return NextResponse.json(
        { error: "Missing required API keys (ngrok, vercel, github)" },
        { status: 400 }
      );
    }

    const deploymentKey = `mobile:${Date.now()}`;

    try {
      const ngrok = new NgrokService(ngrokKey);

      const tunnel = await ngrok.createTunnel({
        port: 3456,
        proto: 'http'
      });

      const github = new GitHubService(githubToken);
      const repoData = await github.getRepository(owner, repo);

      if (!repoData) {
        await ngrok.deleteTunnel(tunnel.id);
        return NextResponse.json(
          { error: "Repository not found. Check the owner/repo format." },
          { status: 404 }
        );
      }

      const vercel = new VercelService(vercelKey);

      const deployment = await vercel.deployFromGitHub({
        projectName: 'os-athena-mobile',
        repository: ownerRepo,
        branch,
        environmentVariables: [
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
        ]
      });

      const mobileDeploymentInfo = {
        tunnelId: tunnel.id,
        publicUrl: tunnel.public_url,
        mobileUrl: deployment.url,
        deploymentId: deployment.deploymentId,
        createdAt: new Date().toISOString(),
        activatedAt: new Date().toISOString()
      };

      // Store deployment info for localStorage access on client
      // This is a placeholder - actual storage happens client-side
      await SecureStorage.saveKeys({ mobilePassword: password });

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
          // Send deployment info in response headers for client-side storage
          'x-mobile-deployment-id': tunnel.id,
          'x-mobile-public-url': tunnel.public_url,
          'x-mobile-url': deployment.url,
          'x-mobile-active': 'true'
        }
      });
    } catch (error) {
      console.error('Mobile deployment error:', error);

      try {
        const deployment = JSON.parse(localStorage.getItem('mobile-deployment') || '{}');
        if (deployment.tunnelId) {
          const ngrokKey = await SecureStorage.getKey('ngrok');
          if (ngrokKey) {
            const ngrok = new NgrokService(ngrokKey);
            await ngrok.deleteTunnel(deployment.tunnelId);
          }
        }
        localStorage.removeItem('mobile-deployment');
      } catch {}

      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Deployment failed'
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
