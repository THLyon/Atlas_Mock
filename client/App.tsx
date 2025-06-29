import React from 'react';
import { createRoot } from 'react-dom/client';

import './styles.css';
import LegalAssistant from './Components/LegalAssistant';

const App = () => {
  return (
    <div>
      <LegalAssistant />
    </div>
  );
};

createRoot(document.querySelector('#root')!).render(<App />);
export default App;
