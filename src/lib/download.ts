// Filename helpers for downloads. Delivery itself is plain native links
// (<a href download>) — programmatic fetch→blob→click downloads are silently
// blocked by Safari and locked-down tabs, so every file URL is a real link.
export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'book';
}
