export interface DownloadOptions {
  fileName?: string;
  /** 'image/png' | 'image/jpeg' */
  fileFormat?: string;
}

export function canvasDataUrl(canvas: HTMLCanvasElement, options?: DownloadOptions): string {
  return canvas.toDataURL(options?.fileFormat ?? 'image/png');
}

export function downloadCanvas(canvas: HTMLCanvasElement, options?: DownloadOptions): void {
  const link = document.createElement('a');
  link.href = canvasDataUrl(canvas, options);
  link.download = options?.fileName ?? 'chart.png';
  link.click();
}
