import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './login';
import { useRouter } from 'next/router';
import { useAuth } from '../components/context/AuthContext';

// Mock useRouter
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock useAuth
jest.mock('../components/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('LoginPage', () => {
  const mockLogin = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      // Add other router properties if needed by the component
    });
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      // Add other auth properties if needed by the component
    });
    jest.clearAllMocks(); // Clear calls and instances
  });

  it('renders login form elements correctly', () => {
    render(<LoginPage />);

    expect(screen.getByText('Sign in to SentinelFi')).toBeInTheDocument();
    expect(screen.getByLabelText(/username\/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot password\?/i)).toBeInTheDocument();
    expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument();
  });

  it('displays error message on empty submission', async () => {
    render(<LoginPage />);

    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Please enter both email and password.'
      );
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login function with correct credentials on successful submission', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/username\/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByLabelText(/remember me/i)); // Check remember me

    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123', true);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // Error message should not be visible
  });

  it('displays loading state during login attempt', async () => {
    // Make mockLogin return a promise that never resolves to simulate loading
    mockLogin.mockReturnValue(new Promise(() => {}));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/username\/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(screen.getByRole('button', { name: /logging in.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logging in.../i })).toBeDisabled();
  });

  it('displays error message on failed login attempt', async () => {
    const loginErrorMessage = 'Invalid credentials provided.';
    mockLogin.mockRejectedValue(new Error(loginErrorMessage));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/username\/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(loginErrorMessage);
    });
    expect(mockLogin).toHaveBeenCalled();
  });
});