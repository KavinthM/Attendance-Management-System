import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders app without crashing', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  // Just test that the app renders without crashing
  expect(document.body).toBeInTheDocument();
});
