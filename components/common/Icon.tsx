import {
  DownloadIcon,
  UploadIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  Cross2Icon,
  CheckIcon,
  Pencil2Icon,
  PlusCircledIcon,
  FileIcon,
  StackIcon,
  HamburgerMenuIcon,
  DashboardIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  QuestionMarkCircledIcon,
  InfoCircledIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  EnterFullScreenIcon,
  MagnifyingGlassIcon,
  ZoomInIcon,
  GearIcon,
  ImageIcon,
  ExitIcon,
  EyeOpenIcon,
  PlayIcon,
  DragHandleDots2Icon,
} from '@radix-ui/react-icons';
import type { ComponentType } from 'react';

// Icon component props from Radix
interface RadixIconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

// Map icon names to Radix icon components
const ICON_MAP: Record<string, ComponentType<RadixIconProps>> = {
  download: DownloadIcon,
  upload: UploadIcon,
  trash: TrashIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  'x-mark': Cross2Icon,
  check: CheckIcon,
  pencil: Pencil2Icon,
  'folder-plus': PlusCircledIcon, // No folder icon in Radix, using PlusCircledIcon
  folder: FileIcon, // No folder icon in Radix, using FileIcon
  'rectangle-group': StackIcon,
  list: HamburgerMenuIcon,
  grid: DashboardIcon,
  'check-circle': CheckCircledIcon,
  'x-circle': CrossCircledIcon,
  'question-mark-circle': QuestionMarkCircledIcon,
  'information-circle': InfoCircledIcon,
  info: InfoCircledIcon,
  'exclamation-circle': ExclamationTriangleIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-up': ArrowUpIcon,
  'arrow-down': ArrowDownIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-left': ChevronLeftIcon,
  'chevron-down': ChevronDownIcon,
  'chevron-up': ChevronUpIcon,
  'arrow-top-right-on-square': ExternalLinkIcon,
  'arrows-pointing-out': EnterFullScreenIcon,
  'magnifying-glass': MagnifyingGlassIcon,
  'magnifying-glass-plus': ZoomInIcon,
  'cog-6-tooth': GearIcon,
  photo: ImageIcon,
  'arrow-right-end-on-rectangle': ExitIcon,
  eye: EyeOpenIcon,
  play: PlayIcon,
  gallery: PlayIcon,
  'drag-handle': DragHandleDots2Icon,
};

export interface IconProps {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number; // Kept for API compatibility, but Radix icons don't use it
}

export function Icon({ name, size = 16, className = '' }: IconProps) {
  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    console.warn('Icon not found:', name);
    return null;
  }

  return <IconComponent width={size} height={size} className={className} aria-hidden="true" />;
}

export type IconName = keyof typeof ICON_MAP;
