export class PageLibraryLoadError extends Error {
  public constructor(
    public readonly libraryName: string,
    public readonly exposedPath: string,
    public readonly manifestEntry: string,
    options?: ErrorOptions,
  ) {
    super(`page library "${libraryName}/${exposedPath}" failed to load from ${manifestEntry}`, options);
    this.name = "PageLibraryLoadError";
  }
}
