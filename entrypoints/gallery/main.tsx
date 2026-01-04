import React from 'react';
import ReactDOM from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import Gallery from './Gallery';
import '@radix-ui/themes/styles.css';
import '@/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme appearance="dark" accentColor="blue" radius="medium">
      <Gallery />
    </Theme>
  </React.StrictMode>
);
