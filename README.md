# The Collector

> Browser extension for collecting, organizing, and batch-downloading images from web pages

## Features

- **One-Click Collection** - Collect all images from any webpage instantly
- **Smart Organization** - Create color-coded groups to organize your images
- **Batch Download** - Download all images at once with customizable folder structure
- **Filename Templates** - Use tokens like `{date}`, `{index}`, `{name}` for automated naming
- **Multiple Themes** - Dark, light, dracula, nord, and solarized themes included
- **Drag & Drop** - Reorder images and move between groups
- **Grid/List Views** - Toggle between compact grid and detailed list layouts
- **Download Preview** - See the exact folder structure before downloading

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the project folder

### From Chrome Web Store

Coming soon.

## Usage

### Collecting Images

1. Navigate to any webpage with images
2. Click the The Collector extension icon
3. Images from the page are automatically collected
4. Use the search/filter to find specific images

### Organizing Images

- **Create Groups** - Click "New Group" to create a named, color-coded group
- **Add to Groups** - Select images and use "Add to Group" or drag & drop
- **Set Download Paths** - Each group can have its own subfolder for downloads

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

Access settings via the gear icon:

- **Theme** - Choose from 5 built-in themes
- **Default Download Path** - Set base folder for downloads
- **Filename Template** - Customize default naming pattern
- **Thumbnail Size** - Adjust preview size in grid/list views
- **Minimum Image Size** - Filter out small images (icons, avatars)

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Project Structure

```
/src
├── /popup          # Main extension UI
├── /downloads      # Download management modules
├── /shared         # Shared utilities
└── /settings       # Settings and theme management
/styles             # Extracted CSS stylesheets
/tests              # Unit tests
/icons              # Extension icons
```

### Architecture

- **Manifest V3** - Modern Chrome extension architecture
- **Modular Design** - Single-responsibility modules
- **No Dependencies** - Zero runtime dependencies (vanilla JS)
- **Vitest** - Fast unit testing

## Browser Support

- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)

Firefox support planned for future release.

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
