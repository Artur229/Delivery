export const createSlug = (name: string) => {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

export const createUniqueSlug = async (
  name: string,
  exists: (slug: string) => Promise<boolean>,
) => {
  const baseSlug = createSlug(name) || "item";
  let slug = baseSlug;
  let index = 1;

  while (await exists(slug)) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return slug;
};
