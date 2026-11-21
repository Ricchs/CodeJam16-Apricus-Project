import React from 'react';
import {createRoot} from 'react-dom/client';
import LoginPage from './pages/login.jsx';

export default function App() {
    return <LoginPage />;
}
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

