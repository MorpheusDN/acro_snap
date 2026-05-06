import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatPage } from './pages/ChatPage';
import { MainPage } from './pages/MainPage';
import { SearchPage } from './pages/SearchPage';
import './styles/app.css';

const params = new URLSearchParams(window.location.search);
const windowName = params.get('window') || 'main';

function App() {
  if (windowName === 'search') return <SearchPage />;
  if (windowName === 'chat') return <ChatPage />;
  return <MainPage />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
