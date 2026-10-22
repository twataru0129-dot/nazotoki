/** public/assets/ 以下のURLを、Vite の base（/nazotoki/）込みで返す */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}assets/${path}`;
}
