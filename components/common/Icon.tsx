import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  CheckIcon,
  PencilIcon,
  FolderPlusIcon,
  FolderIcon,
  RectangleGroupIcon,
  Bars3Icon,
  Squares2X2Icon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsPointingOutIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassPlusIcon,
  Cog6ToothIcon,
  PhotoIcon,
  ArrowRightEndOnRectangleIcon,
  EyeIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

// Map old icon names to heroicon components
const ICON_MAP: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  download: ArrowDownTrayIcon,
  upload: ArrowUpTrayIcon,
  trash: TrashIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  'x-mark': XMarkIcon,
  check: CheckIcon,
  pencil: PencilIcon,
  'folder-plus': FolderPlusIcon,
  folder: FolderIcon,
  'rectangle-group': RectangleGroupIcon,
  list: Bars3Icon,
  grid: Squares2X2Icon,
  'check-circle': CheckCircleIcon,
  'x-circle': XCircleIcon,
  'question-mark-circle': QuestionMarkCircleIcon,
  'information-circle': InformationCircleIcon,
  info: InformationCircleIcon,
  'exclamation-circle': ExclamationCircleIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-up': ArrowUpIcon,
  'arrow-down': ArrowDownIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-left': ChevronLeftIcon,
  'chevron-down': ChevronDownIcon,
  'chevron-up': ChevronUpIcon,
  'arrow-top-right-on-square': ArrowTopRightOnSquareIcon,
  'arrows-pointing-out': ArrowsPointingOutIcon,
  'magnifying-glass': MagnifyingGlassIcon,
  'magnifying-glass-plus': MagnifyingGlassPlusIcon,
  'cog-6-tooth': Cog6ToothIcon,
  photo: PhotoIcon,
  'arrow-right-end-on-rectangle': ArrowRightEndOnRectangleIcon,
  eye: EyeIcon,
  play: PlayIcon,
  gallery: PlayIcon,
};

export interface IconProps {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 16, className = '', strokeWidth = 1.5 }: IconProps) {
  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    console.warn('Icon not found:', name);
    return null;
  }

  return (
    <IconComponent
      width={size}
      height={size}
      className={className}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    />
  );
}

export type IconName = keyof typeof ICON_MAP;
