import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store/store';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          className: 'hot-toast',
          style: {
            background: '#1c2128',
            color: '#e6edf3',
            border: '1px solid #30363d',
            borderRadius: '8px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#00ff9d', secondary: '#0d1117' },
          },
          error: {
            iconTheme: { primary: '#ff3860', secondary: '#fff' },
          },
        }}
      />
    </Provider>
  </React.StrictMode>
);
