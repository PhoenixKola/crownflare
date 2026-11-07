/** The local Iona preview is available only from a development build and an explicit query flag. */
export function shouldEnableIonaPreview(isDevelopmentBuild: boolean, queryValue: string | null): boolean {
  return isDevelopmentBuild && queryValue === '1';
}
