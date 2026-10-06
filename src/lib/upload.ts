"use client";

/** POST a file to a Convex upload URL with progress and 2 retries. Returns the storage id. */
export function uploadToStorage(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const attempt = () =>
    new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText).storageId as string);
          } catch {
            reject(new Error("Upload failed. Try again."));
          }
        } else reject(new Error("Upload failed. Try again."));
      };
      xhr.onerror = () => reject(new Error("Network problem. Check your connection."));
      xhr.send(blob);
    });

  return (async () => {
    let last: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        return await attempt();
      } catch (e) {
        last = e;
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
    throw last instanceof Error ? last : new Error("Upload failed.");
  })();
}
