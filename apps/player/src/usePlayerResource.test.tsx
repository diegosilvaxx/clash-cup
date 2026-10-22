// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePlayerResource } from './usePlayerResource';
afterEach(cleanup);
describe('player request lifecycle', () => {
  it('cancels a previous request and ignores its late response after the user changes', async () => {
    const pending: { signal: AbortSignal; resolve: (value: string) => void }[] = [];
    const load = vi.fn(
      (_tag: string, signal: AbortSignal) =>
        new Promise<string>((resolve) => pending.push({ signal, resolve })),
    );
    const { result, rerender, unmount } = renderHook(
      ({ uid, tag }) => usePlayerResource(uid, tag, load),
      { initialProps: { uid: 'a', tag: '#P0Y' } },
    );
    rerender({ uid: 'b', tag: '#ABC' });
    expect(pending[0]?.signal.aborted).toBe(true);
    await act(async () => pending[1]!.resolve('second player'));
    expect(result.current.data).toBe('second player');
    await act(async () => pending[0]!.resolve('first player'));
    expect(result.current.data).toBe('second player');
    unmount();
    expect(pending[1]?.signal.aborted).toBe(true);
  });
  it('reloads only when requested and clears a previous error', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce('updated');
    const { result, rerender } = renderHook(() => usePlayerResource('a', '#P0Y', load));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    rerender();
    expect(load).toHaveBeenCalledTimes(1);
    act(() => result.current.refresh());
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.data).toBe('updated'));
    expect(result.current.error).toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
