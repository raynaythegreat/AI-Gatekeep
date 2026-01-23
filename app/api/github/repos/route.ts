import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";

export const dynamic = 'force-dynamic';

// Helper function to get GitHub token from headers or environment
function getGitHubToken(request: NextRequest): string | null {
  // Try custom header first (from client-side SecureStorage)
  const headerToken = request.headers.get("X-API-Key-GitHub");
  if (headerToken && headerToken.trim()) {
    return headerToken;
  }
  
  // Fall back to environment variable (for CLI/production builds)
  return process.env.GITHUB_TOKEN || null;
}

// GET - List repositories
export async function GET(request: NextRequest) {
  try {
    const token = getGitHubToken(request);
    if (!token) {
      return NextResponse.json(
        {
          error: "GitHub token not configured",
          details: "Please set up your GitHub token in Settings > Deployment Tools > GitHub. Make sure it has 'repo' scope for private repositories."
        },
        { status: 401 }
      );
    }

    const github = new GitHubService(token);
    const repos = await github.listRepositories();

    // Limit to first 20 repos for performance
    const limitedRepos = repos.slice(0, 20);

    return NextResponse.json({ repos: limitedRepos, total: repos.length });
  } catch (error) {
    console.error("Failed to list repos:", error);

    let errorMessage = "Failed to list repositories";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Bad credentials')) {
        errorMessage = "Invalid GitHub token";
        statusCode = 401;
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = "GitHub token lacks required permissions. Please ensure it has 'repo' scope.";
        statusCode = 403;
      } else if (error.message.includes('rate limit')) {
        errorMessage = "GitHub API rate limit exceeded. Please try again later.";
        statusCode = 429;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// POST - Create repository
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      isPrivate,
      private: legacyPrivate,
      autoInit,
      gitignoreTemplate,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Repository name is required" }, { status: 400 });
    }

    const token = getGitHubToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const github = new GitHubService(token);
    const repo = await github.createRepository({
      name,
      description,
      private: isPrivate ?? legacyPrivate,
      auto_init: autoInit ?? true,
      gitignore_template: gitignoreTemplate,
    });

    return NextResponse.json({ repo });
  } catch (error) {
    console.error("Failed to create repo:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create repository" },
      { status: 500 }
    );
  }
}
