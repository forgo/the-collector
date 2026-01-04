// Core types for The Collector extension

export interface ImageItem {
  url: string;
  filename: string;
  extension: string;
  customFilename?: string; // User-edited filename (with extension)
  width?: number;
  height?: number;
  size?: number;
  source?: 'content-script' | 'external-drop' | 'file-drop' | 'clipboard';
  addedAt?: number; // Timestamp when the image was added (for animation)
}

export interface Group {
  id: string;
  name: string;
  color: string;
  directory?: string;
  images: ImageItem[];
  collapsed?: boolean;
}

export interface Settings {
  downloadDirectory: string;
  ungroupedDirectory: string;
  filenameTemplate: string;
  autoRename: boolean;
  confirmDownload: boolean;
  listThumbnailSize: number;
  gridThumbnailSize: number;
  showDimensions: boolean;
  showFiletype: boolean;
  clearOnDownload: boolean;
  rememberGroups: boolean;
  theme: string;
  customTheme: Record<string, string> | null;
  uiScale: UIScale;
  density: Density;
}

export type UIScale = 'small' | 'medium' | 'large';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type ViewMode = 'list' | 'grid';
export type Tab = 'collections' | 'settings';

// Download tree types
export interface TreeFile {
  name: string;
  path: string;
  url: string;
  hasConflict?: boolean;
}

export interface TreeFolder {
  name: string;
  path: string;
  files: TreeFile[];
  subfolders: TreeFolder[];
}

export interface DownloadTree {
  rootFolder: string;
  folders: TreeFolder[];
  totalImages: number;
  hasConflicts: boolean;
}

// Message types for communication between scripts
export interface AddImageMessage {
  action: 'addImage';
  image: ImageItem;
  groupId?: string;
}

export interface OpenPopupMessage {
  action: 'openPopup';
  url: string;
}

export interface OpenInWindowMessage {
  action: 'openInWindow';
}

export type ExtensionMessage = AddImageMessage | OpenPopupMessage | OpenInWindowMessage;

// Theme types
export interface ThemePreset {
  name: string;
  variables: Record<string, string>;
}

export type ThemeId =
  | 'default'
  | 'dark'
  | 'dracula'
  | 'nord'
  | 'solarized-dark'
  | 'monokai'
  | 'github-light';
