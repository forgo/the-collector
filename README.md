# The Collector

> Browser extension for collecting, organizing, and batch-downloading images from web pages

## Features

- **One-Click Collection** - Collect images from any webpage with hover buttons
- **Smart Organization** - Create color-coded groups to organize your images
- **Batch Download** - Download all images at once with customizable folder structure
- **Filename Templates** - Use tokens like `{date}`, `{index}`, `{name}` for automated naming
- **Gallery Mode** - Full-window slideshow viewer with keyboard navigation
- **Multiple Themes** - 7 built-in themes including dark, light, dracula, nord, and more
- **Drag & Drop** - Reorder images and move between groups
- **Grid/List Views** - Toggle between compact grid and detailed list layouts
- **Download Preview** - See the exact folder structure before downloading
- **Conflict Detection** - Warns about duplicate filenames before download

## Installation

### Chrome (Manifest V3)

1. Clone or download this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build for Chrome
4. Open Chrome and navigate to `chrome://extensions`
5. Enable **Developer mode** (toggle in top-right)
6. Click **Load unpacked**
7. Select the `.output/chrome-mv3` folder

### Firefox (Manifest V2)

1. Clone or download this repository
2. Run `npm install` to install dependencies
3. Run `npm run build:firefox` to build for Firefox
4. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
5. Click **Load Temporary Add-on**
6. Select any file in the `.output/firefox-mv2` folder

## Usage

### Collecting Images

1. Navigate to any webpage with images
2. Click the The Collector extension icon
3. Hover over images to see collection buttons
4. Click "+ Ungrouped" or "+ Group" to add images

### Organizing Images

- **Create Groups** - Click "New" to create a named, color-coded group
- **Add to Groups** - Select images and use "Group" button or drag & drop
- **Set Download Paths** - Each group can have its own subfolder for downloads

### Gallery Mode

Open the gallery to view your collected images in a full-window slideshow:

- **Open Gallery** - Click the play button in the header (all images) or on a group card
- **Navigate** - Use arrow keys, click left/right sides, or let it auto-play
- **Keyboard Shortcuts**:
  - Arrow keys: Navigate between images
  - Space: Next image
  - Home/End: First/last image
  - P: Toggle slideshow play/pause
  - F: Toggle fullscreen mode
  - Escape: Exit fullscreen or close gallery
- **Controls** - Adjust slideshow interval (1-10s) and transition effects (fade, slide, zoom)

### Downloading

1. Select images (or use "Select All")
2. Click the download button
3. Preview the folder structure in the download modal
4. Confirm to start the batch download

### Filename Templates

Customize filenames using these tokens:

| Token     | Description       | Example       |
| --------- | ----------------- | ------------- |
| `{name}`  | Original filename | `photo`       |
| `{index}` | Sequential number | `1`, `2`, `3` |
| `{group}` | Group name        | `Vacation`    |
| `{date}`  | Date (YYYY-MM-DD) | `2024-01-15`  |
| `{time}`  | Time (hh-mm-ss)   | `14-30-45`    |
| `{YYYY}`  | 4-digit year      | `2024`        |
| `{MM}`    | 2-digit month     | `01`          |
| `{DD}`    | 2-digit day       | `15`          |

Example: `{group}_{date}_{index}` produces `Vacation_2024-01-15_1.jpg`

## Configuration

Access settings via the Settings tab:

- **Theme** - Choose from 7 built-in themes (Default Light, GitHub Light, Dark, Dracula, Nord, Solarized Dark, Monokai)
- **Root Download Folder** - Set base folder for downloads
- **Filename Template** - Customize default naming pattern
- **Thumbnail Size** - Adjust preview size in grid/list views
- **UI Scale** - Small, medium, or large interface scaling
- **Density** - Compact, comfortable, or spacious spacing

## Development

### Prerequisites

- Node.js 18+
- npm

### Quick Start

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev           # Chrome
npm run dev:firefox   # Firefox

# Build for production
npm run build         # Chrome
npm run build:firefox # Firefox

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Type check
npm run typecheck
```

### Project Structure

```
the-collector/
├── entrypoints/           # Extension entry points
│   ├── background.ts      # Service worker / background script
│   ├── content.ts         # Content script (image detection)
│   ├── popup/             # Popup UI (React)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   └── gallery/           # Gallery mode (React)
│       ├── index.html
│       ├── main.tsx
│       └── Gallery.tsx
├── components/            # React components
│   ├── common/            # Shared components (Button, Icon, Modal)
│   ├── layout/            # Layout components (Header, Sidebar)
│   └── collections/       # Collection-specific components
├── lib/                   # Business logic
│   ├── storage.ts         # Browser storage utilities
│   ├── downloads.ts       # Download management
│   ├── filename.ts        # Filename template processing
│   └── groups.ts          # Group management
├── styles/                # Global CSS
│   └── global.css
├── public/                # Static assets
│   └── icon/              # Extension icons
├── tests/                 # Test files
├── wxt.config.ts          # WXT configuration
├── tsconfig.json          # TypeScript configuration
└── package.json
```

### Architecture

- **WXT Framework** - Modern browser extension tooling with hot reload
- **React + TypeScript** - Type-safe component architecture
- **CSS Modules** - Scoped component styling
- **Vitest** - Fast unit testing
- **ESLint + Prettier** - Code quality and formatting

## Browser Support

| Browser | Version | Manifest |
| ------- | ------- | -------- |
| Chrome  | 88+     | V3       |
| Edge    | 88+     | V3       |
| Firefox | 109+    | V2       |

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run `npm test` and `npm run lint`
5. Submit a pull request

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
