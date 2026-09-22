export interface CategoryItem {
  name: string;
  slug: string;
  catId?: string;
  isOffer?: boolean;
}

// 15 Canonical categories as single source of truth across navigation and home page
// First 9 keep their original order, followed by the remaining 6 categories + Offers
export const CANONICAL_CATEGORIES: CategoryItem[] = [
  { name: 'Electronics', slug: 'electronics', catId: 'CAT001' },
  { name: 'Fashion', slug: 'fashion', catId: 'CAT002' },
  { name: 'Home & Living', slug: 'home-living', catId: 'CAT003' },
  { name: 'Groceries', slug: 'groceries', catId: 'CAT004' },
  { name: 'Beauty', slug: 'beauty', catId: 'CAT005' },
  { name: 'Sports & Fitness', slug: 'sports-fitness', catId: 'CAT006' },
  { name: 'Books', slug: 'books', catId: 'CAT007' },
  { name: 'Toys & Games', slug: 'toys-games', catId: 'CAT008' },
  { name: 'Automotive', slug: 'automotive', catId: 'CAT009' },
  { name: 'Mobile & Tablets', slug: 'mobile-tablets', catId: 'CAT011' },
  { name: 'Office & Stationery', slug: 'office-stationery', catId: 'CAT014' },
  { name: 'Health & Wellness', slug: 'health-wellness', catId: 'CAT015' },
  { name: 'Baby Products', slug: 'baby-products', catId: 'CAT016' },
  { name: 'Pet Supplies', slug: 'pet-supplies', catId: 'CAT017' },
  { name: 'Shoes & Accessories', slug: 'shoes-accessories', catId: 'CAT018' },
  { name: 'Offers', slug: 'offers', catId: 'CAT010', isOffer: true },
];

export async function fetchCategoryList(): Promise<CategoryItem[]> {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
      // Map server categories while preserving canonical structure where possible
      const serverMap = new Map<string, any>();
      data.categories.forEach((c: any) => {
        if (c.slug) serverMap.set(c.slug.toLowerCase(), c);
      });

      const merged: CategoryItem[] = CANONICAL_CATEGORIES.map(cat => {
        const serverCat = serverMap.get(cat.slug.toLowerCase());
        return {
          ...cat,
          name: serverCat?.name || cat.name,
          catId: serverCat?.category_id || cat.catId
        };
      });

      return merged;
    }
  } catch (e) {
    // Fallback to canonical list on network error
  }
  return CANONICAL_CATEGORIES;
}
