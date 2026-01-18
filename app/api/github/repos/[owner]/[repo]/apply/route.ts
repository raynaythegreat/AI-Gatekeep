import { NextRequest } from "next/server";
import { GitHubService } from "@/services/github";
import { badRequest, internalError, ok } from "@/lib/apiResponse";

interface Params {
  params: Promise<{ owner: string; repo: string }>;
}

type ApplyBody = {
  message?: unknown;
  branch?: unknown;
  files?: unknown;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const body = (await request.json().catch(() => null)) as ApplyBody | null;

    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const branch = typeof body?.branch === "string" ? body.branch.trim() : undefined;
    const filesRaw = body?.files;

    if (!message) {
      return badRequest("Commit message is required");
    }

    if (!Array.isArray(filesRaw) || filesRaw.length === 0) {
      return badRequest("At least one file is required");
    }

    const normalizedFiles = filesRaw.map((file: { path?: unknown; content?: unknown }) => ({
      path: typeof file.path === "string" ? file.path : "",
      content: typeof file.content === "string" ? file.content : ""
    }));

    if (normalizedFiles.some((f) => !f.path)) {
      return badRequest("Each file must include a valid path");
    }

    const github = new GitHubService();
    const result = await github.commitFiles(owner, repo, {
      message,
      branch,
      files: normalizedFiles
    });

    return ok({ success: true, ...result });
  } catch (error) {
    console.error("Failed to apply changes:", error instanceof Error ? error.message : error);
    return internalError(error instanceof Error ? error.message : "Failed to apply changes");
  }
}