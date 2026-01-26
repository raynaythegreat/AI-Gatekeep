import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    // Get project root
    const projectRoot = process.cwd();
    const envPath = path.join(projectRoot, ".env.local");
    
    // Read the file
    const content = await fs.readFile(envPath, "utf-8");
    
    // Parse env variables
    const envVars: Record<string, string> = {};
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
          envVars[key] = value;
        }
      }
    });
    
    return NextResponse.json({ success: true, env: envVars });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: "env.local not found or cannot be read" 
    });
  }
}
