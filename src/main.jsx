import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';

import App from './App.jsx';
import './index.css';
import { store } from './store/store.js';

import installMockApi from './lib/mockApi.js';

const enableMock =
  import.meta.env.VITE_USE_MOCK === 'true' ||
  new URLSearchParams(window.location.search).get('mock') === '1';

if (enableMock) {
  installMockApi();
  window.__mockApi?.seed?.();
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
