import React from 'react';
import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('disables itself while loading even when the caller passes disabled={false}', () => {
    render(
      <Button isLoading disabled={false}>
        Save
      </Button>,
    );
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('respects an explicit disabled prop', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('is enabled by default', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
  });
});
