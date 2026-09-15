import { revalidatePath } from 'next/cache';
export function refreshContactPages(slug: string) {
  if (/^[a-z0-9-]+$/i.test(slug)) revalidatePath('/installer/' + slug);
  revalidatePath('/');
}
