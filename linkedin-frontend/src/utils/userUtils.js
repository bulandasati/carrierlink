/**
 * Converts a user object into a clean URL slug (e.g., "buland_asati").
 * Fallback to user.id if names are not present.
 */
export const getUserSlug = (user) => {
  if (!user) return '';
  const first = (user.firstName || '').toLowerCase().trim().replace(/\s+/g, '');
  const last = (user.lastName || '').toLowerCase().trim().replace(/\s+/g, '');
  if (first && last) return `${first}_${last}`;
  if (first) return first;
  return user.id || '';
};
