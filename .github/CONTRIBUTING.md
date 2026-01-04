# Contributing to The Collector

Thank you for your interest in contributing to The Collector! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 22+
- npm 10+

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/the-collector.git
   cd the-collector
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:

   ```bash
   # For Chrome
   npm run dev

   # For Firefox
   npm run dev:firefox
   ```

## Development Workflow

### Available Scripts

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Start Chrome development server with hot reload  |
| `npm run dev:firefox`   | Start Firefox development server with hot reload |
| `npm run build`         | Build Chrome production extension                |
| `npm run build:firefox` | Build Firefox production extension               |
| `npm run zip`           | Build and package Chrome extension               |
| `npm run zip:firefox`   | Build and package Firefox extension              |
| `npm run lint`          | Run ESLint                                       |
| `npm run lint:fix`      | Run ESLint with auto-fix                         |
| `npm run format`        | Format code with Prettier                        |
| `npm run format:check`  | Check code formatting                            |
| `npm run typecheck`     | Run TypeScript type checking                     |
| `npm run test`          | Run tests                                        |

### Code Quality

Before submitting a pull request, ensure your code passes all checks:

```bash
npm run lint
npm run typecheck
npm run format:check
npm run test
```

Or run all checks with:

```bash
npm run lint && npm run typecheck && npm run format:check && npm run test
```

### Commit Messages

We follow conventional commit messages:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example: `feat: add bulk download progress indicator`

## Pull Request Process

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes and commit them with descriptive messages

3. Push to your fork:

   ```bash
   git push origin feat/your-feature-name
   ```

4. Open a Pull Request against the `main` branch

5. Ensure all CI checks pass

6. Wait for review and address any feedback

## Project Structure

```
the-collector/
├── components/          # React components
│   ├── collections/     # Collection management UI
│   ├── common/          # Shared UI components
│   ├── layout/          # Layout components
│   ├── modals/          # Modal dialogs
│   └── settings/        # Settings UI
├── context/             # React context providers
├── entrypoints/         # Extension entry points
│   ├── background.ts    # Service worker
│   ├── content.ts       # Content script
│   ├── gallery/         # Gallery page
│   └── popup/           # Popup UI
├── hooks/               # Custom React hooks
├── storage/             # WXT storage definitions
├── styles/              # Global styles
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

## Reporting Issues

When reporting issues, please include:

- Browser and version
- Extension version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable

## Questions?

Feel free to open an issue for any questions about contributing.
