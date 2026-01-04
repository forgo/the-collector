# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in The Collector, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email the maintainer directly or use GitHub's private vulnerability reporting feature
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- Acknowledgment of your report within 48 hours
- Regular updates on the progress of addressing the issue
- Credit in the release notes (unless you prefer to remain anonymous)

### Scope

This security policy applies to:

- The Collector browser extension code
- Build and release infrastructure

### Out of Scope

- Third-party websites or services
- Browser security issues (report to browser vendors)
- Social engineering attacks

## Security Best Practices

The Collector follows these security practices:

- **Minimal Permissions**: Only requests necessary browser permissions
- **No Remote Code**: Does not execute remotely loaded code
- **Local Storage**: All data is stored locally in your browser
- **No Tracking**: Does not collect or transmit user data
- **Open Source**: Full source code available for audit

## Content Security Policy

The extension uses a strict Content Security Policy to prevent XSS attacks:

```
script-src 'self'; object-src 'self'; img-src 'self' https: http: data: blob:;
```

This policy:

- Only allows scripts from the extension itself
- Permits loading images from any source (required for functionality)
- Blocks inline scripts and eval()
