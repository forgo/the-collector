import { useEffect, useState, useCallback, useRef } from 'react';
import type { ImageItem, Group, ThemeId } from '@/types';
import { groupsStorage, ungroupedStorage, settingsStorage } from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { applyTheme } from '@/lib/themes';
import styles from './Gallery.module.css';

interface GalleryImage {
  url: string;
  filename: string;
  groupName?: string;
}

type GalleryMode = 'group' | 'all';
type TransitionType = 'none' | 'fade' | 'slide' | 'zoom';

// Note: The native Fullscreen API doesn't work well in Firefox extension windows.
// Instead, we use a CSS-based "fullscreen" mode that hides UI elements.

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<GalleryMode>('all');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>('All Images');
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState(3000);
  const [transition, setTransition] = useState<TransitionType>('fade');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideshowTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse URL params on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode') as GalleryMode | null;
    const groupIdParam = params.get('groupId');
    const startIndex = parseInt(params.get('startIndex') ?? '0', 10);

    if (modeParam === 'group' && groupIdParam) {
      setMode('group');
      setGroupId(groupIdParam);
    } else {
      setMode('all');
    }
    setCurrentIndex(startIndex);
  }, []);

  // Load images based on mode
  useEffect(() => {
    async function loadImages() {
      setIsLoading(true);

      const [groups, ungrouped, settings] = await Promise.all([
        groupsStorage.getValue(),
        ungroupedStorage.getValue(),
        settingsStorage.getValue(),
      ]);

      // Apply theme
      const theme = settings?.theme ?? DEFAULT_SETTINGS.theme;
      applyTheme(theme as ThemeId, settings?.customTheme ?? undefined);

      const galleryImages: GalleryImage[] = [];

      if (mode === 'group' && groupId) {
        const group = groups?.find((g: Group) => g.id === groupId);
        if (group) {
          setGroupName(group.name);
          group.images.forEach((img: ImageItem) => {
            galleryImages.push({
              url: img.url,
              filename: img.customFilename ?? `${img.filename}${img.extension}`,
              groupName: group.name,
            });
          });
        }
      } else {
        // All images mode
        setGroupName('All Images');

        // Add ungrouped images
        ungrouped?.forEach((img: ImageItem) => {
          galleryImages.push({
            url: img.url,
            filename: img.customFilename ?? `${img.filename}${img.extension}`,
            groupName: 'Ungrouped',
          });
        });

        // Add images from all groups
        groups?.forEach((group: Group) => {
          group.images.forEach((img: ImageItem) => {
            galleryImages.push({
              url: img.url,
              filename: img.customFilename ?? `${img.filename}${img.extension}`,
              groupName: group.name,
            });
          });
        });
      }

      setImages(galleryImages);
      setIsLoading(false);
    }

    loadImages();
  }, [mode, groupId]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          goToNext();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            handleExitFullscreen();
          } else {
            window.close();
          }
          break;
        case 'Home':
          e.preventDefault();
          navigateTo(0, 'prev');
          break;
        case 'End':
          e.preventDefault();
          navigateTo(images.length - 1, 'next');
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          toggleSlideshow();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    images.length,
    isFullscreen,
    isPlaying,
    goToNext,
    goToPrevious,
    handleExitFullscreen,
    navigateTo,
    toggleFullscreen,
    toggleSlideshow,
  ]);

  // Mouse movement to show/hide controls
  useEffect(() => {
    function handleMouseMove() {
      setShowControls(true);

      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }

      hideControlsTimeout.current = setTimeout(() => {
        if (isFullscreen) {
          setShowControls(false);
        }
      }, 2500);
    }

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [isFullscreen]);

  // Slideshow auto-advance
  useEffect(() => {
    if (isPlaying && images.length > 1 && !isTransitioning) {
      slideshowTimeout.current = setTimeout(() => {
        goToNext();
      }, slideshowInterval);
    }

    return () => {
      if (slideshowTimeout.current) {
        clearTimeout(slideshowTimeout.current);
      }
    };
  }, [isPlaying, currentIndex, images.length, slideshowInterval, isTransitioning, goToNext]);

  // No native fullscreen API listeners needed - we use CSS-based fullscreen mode

  const navigateTo = useCallback(
    (newIndex: number, direction: 'next' | 'prev') => {
      if (isTransitioning || newIndex === currentIndex) return;

      if (transition !== 'none') {
        setIsTransitioning(true);
        setPreviousIndex(currentIndex);
        setTransitionDirection(direction);
      }

      setCurrentIndex(newIndex);

      if (transition !== 'none') {
        setTimeout(() => {
          setIsTransitioning(false);
          setPreviousIndex(null);
        }, 300);
      }
    },
    [currentIndex, transition, isTransitioning]
  );

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    navigateTo(newIndex, 'prev');
  }, [currentIndex, images.length, navigateTo]);

  const goToNext = useCallback(() => {
    const newIndex = (currentIndex + 1) % images.length;
    navigateTo(newIndex, 'next');
  }, [currentIndex, images.length, navigateTo]);

  // CSS-based fullscreen toggle (native Fullscreen API doesn't work in extension windows)
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleExitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const toggleSlideshow = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleImageClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const halfWidth = rect.width / 2;

      if (clickX < halfWidth) {
        goToPrevious();
      } else {
        goToNext();
      }
    },
    [goToPrevious, goToNext]
  );

  const getTransitionClass = (isEntering: boolean, isExiting: boolean): string => {
    if (transition === 'none') return '';

    const transitionName =
      transition === 'slide' && transitionDirection === 'prev' ? 'slideReverse' : transition;

    if (isEntering) {
      return `${styles[`${transitionName}Enter`]} ${styles[`${transitionName}EnterActive`]}`;
    }
    if (isExiting) {
      return `${styles[`${transitionName}Exit`]} ${styles[`${transitionName}ExitActive`]}`;
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className={styles.gallery} ref={containerRef}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={styles.gallery} ref={containerRef}>
        <div className={styles.empty}>
          <h2>No Images</h2>
          <p>Add some images to your collection to view them in the gallery.</p>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];
  const previousImage = previousIndex !== null ? images[previousIndex] : null;

  return (
    <div
      className={`${styles.gallery} ${isFullscreen ? styles.fullscreen : ''}`}
      ref={containerRef}
    >
      {/* Main image area */}
      <div className={styles.imageContainer} onClick={handleImageClick}>
        <div className={styles.imageWrapper}>
          {/* Previous image (exiting) */}
          {isTransitioning && previousImage && transition !== 'none' && (
            <img
              key={`prev-${previousImage.url}`}
              src={previousImage.url}
              alt={previousImage.filename}
              className={`${styles.imageTransition} ${getTransitionClass(false, true)}`}
              draggable={false}
            />
          )}
          {/* Current image (entering or static) */}
          <img
            key={`curr-${currentImage.url}`}
            src={currentImage.url}
            alt={currentImage.filename}
            className={`${transition !== 'none' ? styles.imageTransition : styles.image} ${isTransitioning ? getTransitionClass(true, false) : ''}`}
            draggable={false}
          />
        </div>
      </div>

      {/* Controls overlay */}
      <div className={`${styles.controls} ${showControls ? styles.visible : ''}`}>
        {/* Top bar with info */}
        <div className={styles.topBar}>
          <div className={styles.info}>
            <span className={styles.groupName}>{groupName}</span>
            <span className={styles.filename}>{currentImage.filename}</span>
          </div>
          <div className={styles.counter}>
            {currentIndex + 1} / {images.length}
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          className={`${styles.navButton} ${styles.prevButton}`}
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          title="Previous (Left Arrow)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        <button
          className={`${styles.navButton} ${styles.nextButton}`}
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          title="Next (Right Arrow)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>

        {/* Bottom bar with controls */}
        <div className={styles.bottomBar}>
          <div className={styles.buttonGroup}>
            <button
              className={`${styles.controlButton} ${isPlaying ? styles.active : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleSlideshow();
              }}
              title={isPlaying ? 'Pause Slideshow (P)' : 'Play Slideshow (P)'}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <select
              className={styles.intervalSelect}
              value={slideshowInterval}
              onChange={(e) => setSlideshowInterval(parseInt(e.target.value, 10))}
              onClick={(e) => e.stopPropagation()}
              title="Slideshow Interval"
            >
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
            </select>

            <select
              className={styles.transitionSelect}
              value={transition}
              onChange={(e) => setTransition(e.target.value as TransitionType)}
              onClick={(e) => e.stopPropagation()}
              title="Transition Effect"
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="zoom">Zoom</option>
            </select>
          </div>

          <div className={styles.buttonGroup}>
            <button
              className={styles.controlButton}
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
            >
              {isFullscreen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>

            <button
              className={styles.controlButton}
              onClick={(e) => {
                e.stopPropagation();
                window.close();
              }}
              title="Close Gallery (Escape)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      {!isFullscreen && images.length > 1 && (
        <div className={styles.thumbnailStrip}>
          {images.map((img, index) => (
            <button
              key={img.url}
              className={`${styles.thumbnail} ${index === currentIndex ? styles.active : ''}`}
              onClick={() => navigateTo(index, index > currentIndex ? 'next' : 'prev')}
              title={img.filename}
            >
              <img src={img.url} alt={img.filename} draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
