import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the countdown hero', () => {
  render(<App />);
  expect(screen.getByText(/couple countdown/i)).toBeInTheDocument();
});
