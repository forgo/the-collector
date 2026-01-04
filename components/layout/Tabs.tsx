import clsx from 'clsx';
import { useApp } from '@/context/AppContext';
import styles from './Tabs.module.css';

export function Tabs() {
  const { activeTab, setActiveTab } = useApp();

  const handleUndock = async () => {
    await browser.runtime.sendMessage({ action: 'openInWindow' });
    window.close();
  };

  return (
    <div className={styles.tabs}>
      <button
        className={clsx(styles.tab, { [styles.active]: activeTab === 'collections' })}
        onClick={() => setActiveTab('collections')}
      >
        Collections
      </button>
      <button
        className={clsx(styles.tab, { [styles.active]: activeTab === 'settings' })}
        onClick={() => setActiveTab('settings')}
      >
        Settings
      </button>
      <button className={styles.undockBtn} onClick={handleUndock} title="Open in separate window">
        <span className={styles.undockLabel}>Undock</span>
      </button>
    </div>
  );
}
