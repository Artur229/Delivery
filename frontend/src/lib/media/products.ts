type ProductImageInput = {
  slug?: string | null;
  name?: string | null;
  cover?: string | null;
};

const imageParams = "?auto=format&fit=crop&w=1200&q=82";

const productImages: Record<string, string> = {
  "margherita-pizza": `https://images.unsplash.com/photo-1604068549290-dea0e4a305ca${imageParams}`,
  "pepperoni-pizza": `https://images.unsplash.com/photo-1628840042765-356cda07504e${imageParams}`,
  "four-cheese-pizza": `https://images.unsplash.com/photo-1574071318508-1cdbab80d002${imageParams}`,
  "classic-burger": `https://images.unsplash.com/photo-1568901346375-23c9450c58cd${imageParams}`,
  "double-beef-burger": `https://images.unsplash.com/photo-1550547660-d9450f859349${imageParams}`,
  "vegan-burger": `https://images.unsplash.com/photo-1520072959219-c595dc870360${imageParams}`,
  "philadelphia-roll": `https://images.unsplash.com/photo-1579871494447-9811cf80d66c${imageParams}`,
  "dragon-roll": `https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56${imageParams}`,
  "avocado-maki": `https://images.unsplash.com/photo-1611143669185-af224c5e3252${imageParams}`,
  "caesar-salad": `https://images.unsplash.com/photo-1550304943-4f24f54ddde9${imageParams}`,
  "greek-salad": `https://images.unsplash.com/photo-1540420773420-3366772f4999${imageParams}`,
  "green-bowl": `https://images.unsplash.com/photo-1512621776951-a57141f2eefd${imageParams}`,
  "homemade-lemonade": `https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e${imageParams}`,
  cola: `https://images.unsplash.com/photo-1622483767028-3f66f32aef97${imageParams}`,
  "berry-iced-tea": `https://images.unsplash.com/photo-1556679343-c7306c1976bc${imageParams}`,
};

const categoryImages = [
  {
    tokens: ["pizza", "margherita", "pepperoni", "cheese"],
    src: productImages["margherita-pizza"],
  },
  {
    tokens: ["burger", "beef", "vegan"],
    src: productImages["classic-burger"],
  },
  {
    tokens: ["roll", "maki", "sushi", "dragon", "philadelphia"],
    src: productImages["philadelphia-roll"],
  },
  {
    tokens: ["salad", "bowl", "green", "greek", "caesar"],
    src: productImages["green-bowl"],
  },
  {
    tokens: ["lemonade", "cola", "tea", "drink", "berry"],
    src: productImages["homemade-lemonade"],
  },
];

const seededFallbackCover = "images.unsplash.com/photo-1546069901-ba9599a7e63c";

export const getProductImage = (product: ProductImageInput | null | undefined) => {
  if (!product) {
    return "/food-placeholder.svg";
  }

  if (product.slug && productImages[product.slug]) {
    return productImages[product.slug];
  }

  const cover = product.cover?.trim();
  const shouldUseCover = cover && !cover.includes(seededFallbackCover);

  if (shouldUseCover) {
    return cover.includes("?") ? cover : `${cover}${imageParams}`;
  }

  const haystack = `${product.slug ?? ""} ${product.name ?? ""}`.toLowerCase();
  const match = categoryImages.find((item) => item.tokens.some((token) => haystack.includes(token)));

  return match?.src ?? "/food-placeholder.svg";
};
