/**
 * The WBS import modal is the only place an operator can turn a spreadsheet into
 * budget lines, and every one of its failure modes used to fail silently because
 * the shared axios client resolves 4xx on the "success" path.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { WBSImportModal } from './WBSImportModal';
import api from '../../lib/api';
import toast from 'react-hot-toast';

jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedPost = api.post as jest.Mock;
const mockedError = toast.error as jest.Mock;
const mockedSuccess = toast.success as jest.Mock;

const report = (overrides: Record<string, unknown> = {}) => ({
  imported: 2,
  errors: [],
  warnings: [],
  created: [],
  updated: [],
  skippedExisting: [],
  rows: [],
  summary: {
    totalRows: 2,
    importable: 2,
    flagged: 0,
    skipped: 0,
    estimatedTotal: 1000,
  },
  truncated: false,
  droppedRows: 0,
  headerRow: 1,
  columns: [],
  currencies: ['NGN'],
  dryRun: true,
  ...overrides,
});

const file = (name = 'budget.csv') =>
  new File(['WBS Code,Description\n1.0,A\n1.1,B'], name, { type: 'text/csv' });

const renderModal = () =>
  render(
    <WBSImportModal
      isOpen
      onClose={jest.fn()}
      projectId="11111111-1111-1111-1111-111111111111"
      onSuccess={jest.fn()}
    />,
  );

const chooseFile = async (target: File) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [target] } });
  // The filename shows twice: in the dropzone and in the file summary row.
  await waitFor(() => expect(screen.getAllByText(target.name).length).toBeGreaterThan(0));
};

const reviewFile = async () => {
  fireEvent.click(screen.getByRole('button', { name: /review file/i }));
  await waitFor(() =>
    expect(mockedPost).toHaveBeenCalledWith(
      expect.stringContaining('import-preview'),
      expect.anything(),
      expect.anything(),
    ),
  );
};

/**
 * Waits for the review screen itself. The mode handler reads `preview` from its
 * render closure, so clicking a radio before this screen exists acts on a stale
 * null and silently skips the re-read.
 */
const awaitReviewScreen = async () => {
  await waitFor(() =>
    expect(screen.getByText(/how this file was read/i)).toBeInTheDocument(),
  );
};

describe('WBSImportModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPost.mockResolvedValue({ status: 200, data: report() });
  });

  it('rejects a file over 5MB before it is ever uploaded', async () => {
    renderModal();
    const oversized = new File(['x'], 'big.csv', { type: 'text/csv' });
    Object.defineProperty(oversized, 'size', { value: 5 * 1024 * 1024 + 1 });

    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [oversized] },
    });

    expect(mockedError).toHaveBeenCalledWith(expect.stringMatching(/larger than 5MB/i));
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('rejects a file with no accepted extension', async () => {
    renderModal();
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [file('notes.txt')] },
    });

    expect(mockedError).toHaveBeenCalledWith(expect.stringMatching(/\.xlsx, \.xls and \.csv/i));
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('sends the create mode by default and lets the operator switch to update', async () => {
    renderModal();
    await chooseFile(file());
    await reviewFile();
    await awaitReviewScreen();

    expect(mockedPost.mock.calls[0][2].params).toEqual({ mode: 'create' });

    const updateRadio = screen
      .getAllByRole('radio')
      .find((el) => (el as HTMLInputElement).value === 'update') as HTMLInputElement;
    fireEvent.click(updateRadio);

    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(2));
    expect(mockedPost.mock.calls[1][2].params).toEqual({ mode: 'update' });
  });

  it('re-reads the file when the mode changes, so no import runs on a stale preview', async () => {
    renderModal();
    await chooseFile(file());
    await reviewFile();
    await awaitReviewScreen();
    fireEvent.click(screen.getByRole('radio', { name: /skip existing/i }));

    // The preview must be re-fetched rather than reused: "skip" and "update"
    // write different data, and importing a stale preview is how an operator
    // overwrites a budget they meant to leave alone.
    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(2));
    expect(mockedPost.mock.calls[1][2].params).toEqual({ mode: 'skip' });
  });

  it('treats a 400 as a failure instead of rendering it as a result', async () => {
    mockedPost.mockResolvedValue({
      status: 400,
      data: { message: 'This file is bigger than the importer reads.' },
    });
    renderModal();
    await chooseFile(file());
    await reviewFile();

    // The axios client resolves 4xx, so without an explicit check this would
    // have been read as an ImportReport and shown a "0 items" success.
    expect(mockedError).toHaveBeenCalledWith(
      'This file is bigger than the importer reads.',
    );
    expect(screen.queryByText(/import complete/i)).not.toBeInTheDocument();
  });

  it('surfaces the server message for a rejected file size', async () => {
    mockedPost.mockResolvedValue({
      status: 413,
      data: { message: 'File too large' },
    });
    renderModal();
    await chooseFile(file());
    await reviewFile();

    expect(mockedError).toHaveBeenCalledWith('File too large');
  });

  it('blocks the import when the file was truncated', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: report({ truncated: true, droppedRows: 900, imported: 2 }),
    });
    renderModal();
    await chooseFile(file());
    await reviewFile();
    await awaitReviewScreen();

    await waitFor(() =>
      expect(screen.getByText(/never read, so importing is blocked/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /cannot import yet/i })).toBeDisabled();
  });

  it('blocks the import when nothing is importable and says why', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: report({
        imported: 0,
        errors: ['Row 4 (1.4): no description was given'],
      }),
    });
    renderModal();
    await chooseFile(file());
    await reviewFile();
    await awaitReviewScreen();

    await waitFor(() =>
      expect(screen.getByText(/no description was given/)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /cannot import yet/i })).toBeDisabled();
  });

  it('does not call onSuccess when the import created nothing', async () => {
    const onSuccess = jest.fn();
    mockedPost
      .mockResolvedValueOnce({ status: 200, data: report() })
      .mockResolvedValueOnce({ status: 200, data: report({ imported: 0, dryRun: false }) });
    render(
      <WBSImportModal
        isOpen
        onClose={jest.fn()}
        projectId="11111111-1111-1111-1111-111111111111"
        onSuccess={onSuccess}
      />,
    );
    await chooseFile(file());
    await reviewFile();
    await awaitReviewScreen();
    fireEvent.click(screen.getByRole('button', { name: /^import 2 items$/i }));

    await waitFor(() => expect(mockedSuccess).not.toHaveBeenCalled());
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
