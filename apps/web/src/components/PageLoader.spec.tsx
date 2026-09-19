import { act, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { PageLoader, SLOW_LOAD_NOTICE_DELAY_MS } from './PageLoader.js';

function renderLoader() {
  return render(
    <MantineProvider>
      <PageLoader />
    </MantineProvider>,
  );
}

describe('PageLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows only the spinner at first', () => {
    renderLoader();

    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText(/render/i)).not.toBeInTheDocument();
  });

  it('explains the delay once loading has taken a few seconds', () => {
    renderLoader();

    act(() => {
      vi.advanceTimersByTime(SLOW_LOAD_NOTICE_DELAY_MS);
    });

    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
    expect(screen.getByText(/free tier/i)).toBeInTheDocument();
  });

  it('does not show the explanation just before the delay elapses', () => {
    renderLoader();

    act(() => {
      vi.advanceTimersByTime(SLOW_LOAD_NOTICE_DELAY_MS - 1);
    });

    expect(screen.queryByText(/free tier/i)).not.toBeInTheDocument();
  });
});
