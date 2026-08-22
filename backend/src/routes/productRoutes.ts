import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { 
  getProducts, 
  getCategories, 
  getSubcategoriesForCategory,
  getBanners, 
  addRecentlyViewed, 
  getRecentlyViewed,
  getSearchSuggestions,
  saveSearchQuery,
  getSearchHistory,
  deleteSearchHistory,
  getProductDetails,
  addProductReview,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  mergeWishlists,
  getCustomerById
} from '../config/db';
import { EventLogger } from '../services/eventLogger';

const router = Router();

async function getGeoContext(customerId: string | null) {
  let country = 'India';
  let state = 'Karnataka';
  let city = 'Bengaluru';
  if (customerId) {
    const cust = await getCustomerById(customerId);
    if (cust) {
      country = cust.country;
      state = cust.state;
      city = cust.city;
    }
  }
  return {
    country,
    state,
    city,
    device: 'desktop',
    browser: 'Chrome'
  };
}

// GET /api/categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const list = await getCategories();
    return res.json({ success: true, categories: list });
  } catch (error: any) {
    console.error('[API Error] Fetching categories failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/categories/:slug/subcategories
router.get('/categories/:slug/subcategories', async (req: Request, res: Response) => {
  try {
    const list = await getSubcategoriesForCategory(req.params.slug);
    return res.json({ success: true, subcategories: list });
  } catch (error: any) {
    console.error('[API Error] Fetching subcategories failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/home/banners
router.get('/home/banners', async (_req: Request, res: Response) => {
  try {
    const banners = await getBanners();
    return res.json({ success: true, banners });
  } catch (error: any) {
    console.error('[API Error] Fetching banners failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/search
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, page, limit, sort, brands, min_price, max_price, rating, in_stock, delivery_days, session_id, customer_id } = req.query;
    const parsedPage = page ? parseInt(page as string, 10) : 1;
    const parsedLimit = limit ? parseInt(limit as string, 10) : 24;

    let parsedBrands: string[] | undefined = undefined;
    if (typeof brands === 'string') {
      parsedBrands = brands.split(',').map(b => b.trim()).filter(Boolean);
    }

    const items = await getProducts({
      search: q as string,
      brands: parsedBrands,
      min_price: min_price ? parseInt(min_price as string, 10) : undefined,
      max_price: max_price ? parseInt(max_price as string, 10) : undefined,
      rating: rating ? parseFloat(rating as string) : undefined,
      in_stock: in_stock === 'true',
      delivery_days: delivery_days ? parseInt(delivery_days as string, 10) : undefined,
      page: parsedPage,
      limit: parsedLimit,
      sort: sort as string,
    });

    if (q && session_id) {
      await saveSearchQuery(session_id as string, (customer_id as string) || null, q as string, items.total);
    }

    return res.json({
      success: true,
      products: items.products,
      pagination: {
        total: items.total,
        page: parsedPage,
        limit: parsedLimit
      }
    });
  } catch (error: any) {
    console.error('[API Error] Fetching search failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/search/suggestions
router.get('/search/suggestions', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, suggestions: [] });
    const suggestions = await getSearchSuggestions(q as string);
    return res.json({ success: true, suggestions });
  } catch (error: any) {
    console.error('[API Error] Suggestions failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/search/history
router.get('/search/history', async (req: Request, res: Response) => {
  try {
    const { session_id, customer_id } = req.query;
    if (!session_id) return res.status(400).json({ success: false, error: 'session_id is required' });
    const list = await getSearchHistory(session_id as string, (customer_id as string) || null);
    return res.json({ success: true, history: list });
  } catch (error: any) {
    console.error('[API Error] Fetching history failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE /api/search/history/:id
router.delete('/search/history/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteSearchHistory(parseInt(id, 10));
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[API Error] Deleting search history failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/products
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { 
      category_id, 
      category_slug,
      subcategory_slug,
      search, 
      brands, 
      min_price, 
      max_price, 
      rating, 
      in_stock, 
      delivery_days, 
      page, 
      limit, 
      sort 
    } = req.query;

    const parsedPage = page ? parseInt(page as string, 10) : 1;
    const parsedLimit = limit ? parseInt(limit as string, 10) : 24;

    // Split brand list if provided as a comma-separated string
    let parsedBrands: string[] | undefined = undefined;
    if (typeof brands === 'string') {
      parsedBrands = brands.split(',').map(b => b.trim()).filter(Boolean);
    } else if (Array.isArray(brands)) {
      parsedBrands = brands.map(b => String(b));
    }

    const items = await getProducts({
      category_id: category_id as string,
      category_slug: category_slug as string,
      subcategory_slug: subcategory_slug as string,
      search: search as string,
      brands: parsedBrands,
      min_price: min_price ? parseInt(min_price as string, 10) : undefined,
      max_price: max_price ? parseInt(max_price as string, 10) : undefined,
      rating: rating ? parseFloat(rating as string) : undefined,
      in_stock: in_stock === 'true',
      delivery_days: delivery_days ? parseInt(delivery_days as string, 10) : undefined,
      page: parsedPage,
      limit: parsedLimit,
      sort: sort as string,
    });

    return res.json({ 
      success: true, 
      products: items.products, 
      pagination: { 
        total: items.total, 
        page: parsedPage, 
        limit: parsedLimit 
      } 
    });
  } catch (error: any) {
    console.error('[API Error] Fetching products failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/products/flash-deals
router.get('/products/flash-deals', async (_req: Request, res: Response) => {
  try {
    const allProducts = await getProducts({ limit: 150 });
    const flashDeals = allProducts.products.filter(p => p.discount >= 15).slice(0, 10);
    return res.json({ success: true, products: flashDeals });
  } catch (error: any) {
    console.error('[API Error] Fetching flash deals failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/products/trending
router.get('/products/trending', async (_req: Request, res: Response) => {
  try {
    const trending = await getProducts({ limit: 12, sort: 'rating' });
    return res.json({ success: true, products: trending.products });
  } catch (error: any) {
    console.error('[API Error] Fetching trending products failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/products/view
router.post('/products/view', async (req: Request, res: Response) => {
  try {
    const { product_id, session_id, customer_id, category, price } = req.body;
    if (!product_id || !session_id) {
      return res.status(400).json({ success: false, error: 'product_id and session_id are required' });
    }

    // Add to recently viewed table
    await addRecentlyViewed(session_id, customer_id || null, product_id);

    const context = await getGeoContext(customer_id || null);

    // Emit product_view telemetry event
    EventLogger.logEvent({
      event_type: 'product_view',
      session_id,
      customer_id: customer_id || null,
      user_type: customer_id ? 'registered' : 'guest',
      page: 'home',
      device: 'desktop',
      browser: 'Chrome',
      context,
      metadata: {
        product_id,
        category: category || 'General',
        price: price || 0,
      }
    });

    return res.json({ success: true, message: 'View tracked successfully' });
  } catch (error: any) {
    console.error('[API Error] Tracking product view failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/products/recently-viewed
router.get('/products/recently-viewed', async (req: Request, res: Response) => {
  try {
    const { session_id, customer_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    const items = await getRecentlyViewed(session_id as string, customer_id ? (customer_id as string) : null);
    return res.json({ success: true, products: items });
  } catch (error: any) {
    console.error('[API Error] Fetching recently viewed failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/products/:productId
router.get('/products/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const details = await getProductDetails(productId);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.json({ success: true, ...details });
  } catch (error: any) {
    console.error('[API Error] Fetching product details failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/reviews
router.post('/reviews', async (req: Request, res: Response) => {
  try {
    const { product_id, customer_id, session_id, rating, title, review_text, verified_purchase } = req.body;
    if (!product_id || !customer_id || !session_id || !rating || !title || !review_text) {
      return res.status(400).json({ success: false, error: 'Missing review details' });
    }

    await addProductReview(product_id, customer_id, parseFloat(rating), title, review_text, verified_purchase === true);

    // Resolve location
    let country = 'India';
    let state = 'Karnataka';
    let city = 'Bengaluru';
    const cust = await getCustomerById(customer_id);
    if (cust) {
      country = cust.country;
      state = cust.state;
      city = cust.city;
    }

    const context = {
      country,
      state,
      city,
      device: 'desktop',
      browser: 'Chrome'
    };

    // Clickstream Telemetry
    EventLogger.logEvent({
      event_type: 'review_added',
      session_id,
      customer_id: customer_id,
      user_type: 'registered',
      page: 'product_details',
      context,
      metadata: {
        product_id,
        rating: parseFloat(rating),
        verified_purchase: verified_purchase === true
      }
    });

    return res.json({ success: true, message: 'Review added successfully' });
  } catch (error: any) {
    console.error('[API Error] Submitting review failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/wishlist
router.get('/wishlist', async (req: Request, res: Response) => {
  try {
    const { session_id, customer_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    const items = await getWishlist(session_id as string, customer_id ? (customer_id as string) : null);
    return res.json({ success: true, wishlist: items });
  } catch (error: any) {
    console.error('[API Error] Fetching wishlist failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/wishlist
router.post('/wishlist', async (req: Request, res: Response) => {
  try {
    const { session_id, customer_id, product_id, category, price } = req.body;
    if (!session_id || !product_id) {
      return res.status(400).json({ success: false, error: 'session_id and product_id are required' });
    }

    await addToWishlist(session_id, customer_id || null, product_id);

    const context = await getGeoContext(customer_id || null);

    // Log telemetry
    EventLogger.logEvent({
      event_type: 'wishlist_add',
      session_id,
      customer_id: customer_id || null,
      user_type: customer_id ? 'registered' : 'guest',
      page: 'catalog',
      context,
      metadata: {
        product_id,
        category,
        price
      }
    });

    return res.json({ success: true, message: 'Added to wishlist' });
  } catch (error: any) {
    console.error('[API Error] Adding to wishlist failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE /api/wishlist/:productId
router.delete('/wishlist/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { session_id, customer_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    await removeFromWishlist(session_id as string, customer_id ? (customer_id as string) : null, productId);

    const context = await getGeoContext(customer_id ? (customer_id as string) : null);

    // Log telemetry
    EventLogger.logEvent({
      event_type: 'wishlist_remove',
      session_id: session_id as string,
      customer_id: (customer_id as string) || null,
      user_type: customer_id ? 'registered' : 'guest',
      page: 'wishlist',
      context,
      metadata: {
        product_id: productId
      }
    });

    return res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error: any) {
    console.error('[API Error] Removing from wishlist failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/wishlist/merge
router.post('/wishlist/merge', async (req: Request, res: Response) => {
  try {
    const { session_id, customer_id } = req.body;
    if (!session_id || !customer_id) {
      return res.status(400).json({ success: false, error: 'session_id and customer_id are required' });
    }

    await mergeWishlists(session_id, customer_id);
    return res.json({ success: true, message: 'Wishlists merged successfully' });
  } catch (error: any) {
    console.error('[API Error] Merging wishlists failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
