import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders QuickFetch heading and search button', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'QuickFetch' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find' })).toBeInTheDocument();
  });
});
