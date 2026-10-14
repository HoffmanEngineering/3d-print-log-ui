import { useVideoConfig } from 'remotion';

/** Everything that differs between the 9:16 and 16:9 cuts reads from here. */
export function useLayout() {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  return {
    width,
    height,
    portrait,
    /** Where headlines sit (fraction of height). */
    headlineY: portrait ? 0.15 : 0.12,
    /** Where the subject sits below the headline. */
    subjectY: portrait ? 0.56 : 0.58,
  };
}
