# Security Policy

## Reporting a vulnerability
Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report privately by:
- emailing the maintainer (add contact in your repo settings), or
- using GitHub Security Advisories if enabled.

Include:
- reproduction steps
- impact assessment
- affected versions/commit hash
- any relevant logs **with secrets removed**

## Secrets
GateKeep is BYOK (bring your own keys). Never paste API keys into issues, PRs, or chat transcripts.

If a secret is exposed:
1) Revoke it immediately in the provider dashboard
2) Rotate any downstream credentials
3) Remove it from git history if necessary