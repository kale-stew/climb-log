/**
 * Trip-report slugs that exist in this repo. Notion can name a post that was never written
 * (or was renamed), so links to /blog/hike/{slug} are built only from this list. The glob is
 * lazy: only the file names are bundled, not the posts.
 */
const posts = import.meta.glob('../content/blog/hike/*.md')

export const HIKE_POST_SLUGS: ReadonlySet<string> = new Set(
  Object.keys(posts).map(path => path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '')),
)

/** The trip report for an outing, or null when no such post exists. */
export function hikePostPath(
  slug: string | null | undefined,
  known: ReadonlySet<string> = HIKE_POST_SLUGS,
): string | null {
  return slug && known.has(slug) ? `/blog/hike/${slug}` : null
}
