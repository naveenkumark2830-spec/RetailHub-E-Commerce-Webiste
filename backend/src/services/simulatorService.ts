import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EventLogger } from './eventLogger';
import { 
  dbPool, 
  getOrCreateCart, 
  addToCart, 
  createOrderAndPayment, 
  createShipmentForOrder,
  applyCoupon,
  insertSimulationRun,
  updateSimulationRun
} from '../config/db';

export const EVENT_REGISTRY = {
  SESSION: ['login', 'logout', 'session_started', 'session_ended'],
  NAVIGATION: ['page_view', 'category_view'],
  SEARCH: ['search', 'search_result_clicked', 'filter_applied'],
  PRODUCT: ['product_view', 'product_image_view', 'product_details_view', 'product_impression'],
  WISHLIST: ['wishlist_add', 'wishlist_remove'],
  CART: ['cart_item_added', 'cart_item_removed', 'cart_update'],
  CHECKOUT: [
    'checkout_started', 
    'address_selected', 
    'delivery_option_selected', 
    'payment_method_selected', 
    'checkout_abandoned'
  ],
  PAYMENT: ['payment_initiated', 'payment_success', 'payment_failed', 'payment_retry'],
  ORDER: ['order_created', 'order_confirmed', 'order_cancelled', 'order_status_updated'],
  FULFILLMENT: ['inventory_reserved', 'inventory_released', 'shipment_created', 'order_packed', 'order_shipped'],
  DELIVERY: ['in_transit', 'out_for_delivery', 'delivered', 'delivery_failed'],
  RETURNS: ['return_requested', 'return_approved', 'return_rejected', 'return_picked_up', 'return_received'],
  REFUNDS: ['refund_initiated', 'refund_success', 'refund_failed'],
  REVIEWS: ['review_added', 'rating_given'],
  COUPONS: ['coupon_viewed', 'coupon_applied', 'coupon_removed', 'coupon_rejected'],
  SYSTEM: ['invoice_generated', 'notification_created'],
  PROFILE: ['profile_viewed', 'profile_updated', 'address_added', 'address_updated', 'address_deleted'],
  ADMIN: ['admin_login', 'admin_login_failed', 'admin_dashboard_viewed']
};

export type BehaviorProfile = 
  | 'BROWSER'
  | 'DEAL_HUNTER'
  | 'REGULAR_BUYER'
  | 'IMPULSE_BUYER'
  | 'HIGH_VALUE_BUYER'
  | 'CART_ABANDONER'
  | 'RETURN_PRONE';

export type SessionIntent =
  | 'CASUAL_BROWSING'
  | 'DEAL_SEEKING'
  | 'URGENT_PURCHASE'
  | 'RESEARCH'
  | 'GIFT_SHOPPING'
  | 'REPEAT_PURCHASE';

export interface CustomerBehaviorProfile {
  profileName: BehaviorProfile;
  priceSensitivity: number;
  purchaseProbability: number;
  cartAbandonProbability: number;
  returnProbability: number;
  preferredCategories: string[];
}

export interface ProductInventoryState {
  productId: string;
  stockQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  fulfilledQuantity: number;
}

export interface CatalogCategory {
  category_id: string;
  name: string;
  slug: string;
}

export interface CatalogProduct {
  product_id: string;
  name: string;
  brand: string;
  category_id: string;
  subcategory_id: string;
  price: number;
  sale_price: number;
  rating: number;
  popularityWeight: number;
}

export const SEARCH_CATEGORY_MAP: Record<string, { categoryId: string; categoryName: string; searchTerms: string[]; productPool: string[] }> = {
  'CAT001': {
    categoryId: 'CAT001',
    categoryName: 'Electronics',
    searchTerms: ['gaming laptop', 'laptop under 50000', 'best headphones', 'wireless mouse', 'iphone', 'cheap laptop', 'best laptop for coding', 'laptop for students', 'wireless headphones under 5000', 'lapotp', 'iphnoe', 'headphnes'],
    productPool: ['PROD-CAT001-001', 'PROD-CAT001-002', 'PROD-CAT001-003', 'PROD-CAT001-004']
  },
  'CAT002': {
    categoryId: 'CAT002',
    categoryName: 'Fashion',
    searchTerms: ['running shoes', 'sneakers', 'leather jacket', 'cotton t-shirt', 'jeans'],
    productPool: ['PROD-CAT002-001', 'PROD-CAT002-002', 'PROD-CAT002-003']
  },
  'CAT003': {
    categoryId: 'CAT003',
    categoryName: 'Home & Furniture',
    searchTerms: ['office chair', 'study table', 'coffee maker', 'blender'],
    productPool: ['PROD-CAT003-001', 'PROD-CAT003-002']
  },
  'CAT004': {
    categoryId: 'CAT004',
    categoryName: 'Grocery',
    searchTerms: ['rice 5kg', 'shampoo', 'sunscreen', 'green tea'],
    productPool: ['PROD-CAT004-001', 'PROD-CAT004-002']
  },
  'CAT005': {
    categoryId: 'CAT005',
    categoryName: 'Beauty',
    searchTerms: ['skin care', 'face wash', 'lipstick', 'hair serum'],
    productPool: ['PROD-CAT005-001', 'PROD-CAT005-002']
  }
};

export const SEARCH_LIBRARY = Object.values(SEARCH_CATEGORY_MAP).flatMap(c => c.searchTerms);

export interface ScheduledEvent {
  triggerTime: number;
  eventTimeIso: string;
  customer: VirtualCustomer;
  eventType: string;
  metadata?: any;
  actorType?: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  eventSource?: string;
}

export interface CartItemState {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface VirtualCustomer {
  customerId: string | null;
  pendingCustomerId: string;
  anonymousId: string;
  sessionId: string;
  deviceId: string;
  ipAddress: string;
  isScraper?: boolean;
  userType: 'guest' | 'registered' | 'admin';
  profile: CustomerBehaviorProfile;
  sessionIntent: SessionIntent;
  currentState: string;
  cart: CartItemState[];
  wishlist: string[];
  searchResults: string[];
  journeyCounter: number;
  lastEventTime: number;
  activeProductId?: string;
  activeCategory?: string;
  activeOrderId?: string;
  activeOrderItemId?: string;
  activePaymentId?: string;
  activeShipmentId?: string;
  activeReturnId?: string;
  activeRefundId?: string;
  activeReviewId?: string;
  addressId?: string;
  couponCode?: string;
  paymentAttempts?: number;
  paymentMethod?: string;
  lastPaymentSuccess?: boolean;
  forcedSteps?: string[];
  currentStepIndex?: number;
  journeyContext?: any;
}

class SimulatorService {
  private isSimulating = false;
  private isPaused = false;
  private timer: NodeJS.Timeout | null = null;
  private secondsTimer: NodeJS.Timeout | null = null;
  private activeCustomers: VirtualCustomer[] = [];
  private pendingScheduledEvents: ScheduledEvent[] = [];
  
  // Simulation Configurations (CLEAN by default)
  private speedMs = 100;
  private usersCount = 100;
  private targetRate = 50;
  private rateUnit = '/sec';
  private duration = '5 min';
  private trafficProfile = 'Mixed / Realistic';
  private mode: 'CLEAN' | 'DIRTY' | 'FRAUD' = 'CLEAN';

  // Fraud Generation Options
  private fraudIpsCount = 5;
  private fraudIngredients: 'DDOS' | 'SCRAPER' | 'BOTH' = 'BOTH';
  private fraudRatio = 0.10;
  private fraudIpPool: string[] = [];

  private currentRunId = '';
  private elapsedSeconds = 0;
  private rateAccumulator = 0;
  private currentTickEmittedCount = 0;
  private customerCounter = 0;

  // Distinct KPI Sets
  private distinctOrdersSet = new Set<string>();
  private distinctPaymentsSet = new Set<string>();
  private distinctReturnsSet = new Set<string>();

  // Live Statistics & Detailed Dirty Breakdown
  private liveStats = {
    total_events: 0,
    orders: 0,
    payments: 0,
    returns: 0,
    invalid: 0,
    duplicates: 0,
    late: 0,
    out_of_order: 0,
    invalid_timestamp: 0,
    missing_customer: 0,
    negative_price: 0,
    invalid_category: 0,
    corrupted_json: 0,
    fraud_events: 0,
    ddos_fraud_count: 0,
    scraper_fraud_count: 0
  };

  private eventTimestamps: number[] = [];
  private customerJourneys: Record<string, string[]> = {};
  private orderJourneys: Record<string, string[]> = {};
  private coverageStats: Record<string, number> = {};
  private skippedReasons: Record<string, string> = {};

  private cachedCustomerIds: string[] = [];
  private cachedCoupons: string[] = [];
  private inventoryState: Record<string, ProductInventoryState> = {};

  // Master Data In-Memory Catalog Caches & Indexing
  private categoryCatalog: CatalogCategory[] = [];
  private productCatalog: CatalogProduct[] = [];
  private categoriesById = new Map<string, CatalogCategory>();
  private productsById = new Map<string, CatalogProduct>();
  private productsByCategory = new Map<string, CatalogProduct[]>();

  private categoryWeightList: Array<{ category: CatalogCategory; weight: number }> = [];
  private totalCategoryWeight = 0;

  // Runtime Traffic Distribution Stats Tracking
  private runtimeProductCounts = new Map<string, number>();
  private runtimeCategoryCounts = new Map<string, number>();

  constructor() {
    this.resetStats();
    this.ensureCatalogLoaded();
  }

  private ensureCatalogLoaded() {
    if (this.categoryCatalog.length === 0 || this.productCatalog.length === 0) {
      const defaultCatNames = [
        'Electronics', 'Fashion', 'Home & Furniture', 'Grocery', 'Beauty',
        'Sports', 'Books', 'Toys', 'Automotive', 'Jewelry',
        'Footwear', 'Appliances', 'Stationery', 'Pet Supplies', 'Garden',
        'Health', 'Baby Products', 'Watches', 'Bags', 'Music'
      ];
      this.categoryCatalog = defaultCatNames.map((name, idx) => {
        const cId = `CAT${String(idx + 1).padStart(3, '0')}`;
        return {
          category_id: cId,
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        };
      });

      this.productCatalog = [];
      this.categoryCatalog.forEach((cat) => {
        for (let i = 1; i <= 50; i++) {
          const pNum = String(i).padStart(3, '0');
          const pId = `PROD-${cat.category_id}-${pNum}`;
          const skuIndex = (parseInt(cat.category_id.replace(/\D/g, '')) || 1) * 100 + i;
          const basePrice = Math.round((499 + ((skuIndex * 137) % 44500)) * 100) / 100;
          this.productCatalog.push({
            product_id: pId,
            name: `${cat.name} Item ${i}`,
            brand: `Brand-${cat.category_id}`,
            category_id: cat.category_id,
            subcategory_id: `SUB-${cat.category_id}-1`,
            price: basePrice,
            sale_price: Math.round(basePrice * 0.9 * 100) / 100,
            rating: Number((3.5 + (skuIndex % 15) * 0.1).toFixed(1)),
            popularityWeight: 1
          });
        }
      });

      this.categoryCatalog.forEach(c => {
        this.categoriesById.set(c.category_id, c);
        this.productsByCategory.set(c.category_id, []);
      });

      this.productCatalog.forEach(p => {
        this.productsById.set(p.product_id, p);
        const catList = this.productsByCategory.get(p.category_id) || [];
        catList.push(p);
        this.productsByCategory.set(p.category_id, catList);
      });

      const categoryWeightMap: Record<string, number> = {
        'CAT001': 22, 'CAT002': 16, 'CAT003': 12, 'CAT004': 10, 'CAT005': 8,
        'CAT006': 6, 'CAT007': 5, 'CAT008': 4, 'CAT009': 3, 'CAT010': 3,
        'CAT011': 2, 'CAT012': 2, 'CAT013': 2, 'CAT014': 1, 'CAT015': 1,
        'CAT016': 1, 'CAT017': 1, 'CAT018': 1, 'CAT019': 1, 'CAT020': 1
      };

      this.categoryWeightList = this.categoryCatalog.map(c => ({
        category: c,
        weight: categoryWeightMap[c.category_id] || 1
      }));
      this.totalCategoryWeight = this.categoryWeightList.reduce((sum, item) => sum + item.weight, 0);
    }
  }

  private async loadSimulationCaches() {
    this.categoryCatalog = [];
    this.productCatalog = [];
    this.categoriesById.clear();
    this.productsById.clear();
    this.productsByCategory.clear();

    let loadedCategories: CatalogCategory[] = [];
    let loadedProducts: CatalogProduct[] = [];

    if (dbPool) {
      try {
        const [custRows]: any = await dbPool.query('SELECT customer_id FROM customers LIMIT 1000');
        this.cachedCustomerIds = custRows.map((r: any) => r.customer_id);

        const [catRows]: any = await dbPool.query('SELECT category_id, name, slug FROM categories');
        if (Array.isArray(catRows) && catRows.length > 0) {
          loadedCategories = catRows.map((r: any) => ({
            category_id: r.category_id,
            name: r.name,
            slug: r.slug || r.name.toLowerCase().replace(/\s+/g, '-')
          }));
        }

        const [prodRows]: any = await dbPool.query(
          'SELECT product_id, name, brand, category_id, subcategory_id, price, sale_price, rating FROM products'
        );
        if (Array.isArray(prodRows) && prodRows.length > 0) {
          loadedProducts = prodRows.map((r: any) => ({
            product_id: r.product_id,
            name: r.name || r.product_id,
            brand: r.brand || 'RetailHub',
            category_id: r.category_id,
            subcategory_id: r.subcategory_id || '',
            price: r.price ? parseFloat(r.price) : 2500,
            sale_price: r.sale_price ? parseFloat(r.sale_price) : (r.price ? parseFloat(r.price) : 2500),
            rating: r.rating ? parseFloat(r.rating) : 4.5,
            popularityWeight: 1
          }));
        }

        const [coupRows]: any = await dbPool.query('SELECT code FROM coupons WHERE status = "ACTIVE" LIMIT 100');
        this.cachedCoupons = coupRows.map((r: any) => r.code);
      } catch (err) {
        console.error('[Simulator Error] Failed to load MySQL simulation caches:', err);
      }
    }

    if (loadedCategories.length === 0) {
      const defaultCatNames = [
        'Electronics', 'Fashion', 'Home & Furniture', 'Grocery', 'Beauty',
        'Sports', 'Books', 'Toys', 'Automotive', 'Jewelry',
        'Footwear', 'Appliances', 'Stationery', 'Pet Supplies', 'Garden',
        'Health', 'Baby Products', 'Watches', 'Bags', 'Music'
      ];
      loadedCategories = defaultCatNames.map((name, idx) => {
        const cId = `CAT${String(idx + 1).padStart(3, '0')}`;
        return {
          category_id: cId,
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        };
      });
    }

    if (loadedProducts.length === 0) {
      loadedCategories.forEach((cat) => {
        for (let i = 1; i <= 50; i++) {
          const pNum = String(i).padStart(3, '0');
          const pId = `PROD-${cat.category_id}-${pNum}`;
          const skuIndex = (parseInt(cat.category_id.replace(/\D/g, '')) || 1) * 100 + i;
          const basePrice = Math.round((499 + ((skuIndex * 137) % 44500)) * 100) / 100;
          loadedProducts.push({
            product_id: pId,
            name: `${cat.name} Item ${i}`,
            brand: `Brand-${cat.category_id}`,
            category_id: cat.category_id,
            subcategory_id: `SUB-${cat.category_id}-1`,
            price: basePrice,
            sale_price: Math.round(basePrice * 0.9 * 100) / 100,
            rating: Number((3.5 + (skuIndex % 15) * 0.1).toFixed(1)),
            popularityWeight: 1
          });
        }
      });
    }

    this.categoryCatalog = loadedCategories;
    this.productCatalog = loadedProducts;

    this.categoryCatalog.forEach(c => {
      this.categoriesById.set(c.category_id, c);
      this.productsByCategory.set(c.category_id, []);
    });

    let invalidRelationships = 0;
    this.productCatalog.forEach(p => {
      this.productsById.set(p.product_id, p);
      if (!this.categoriesById.has(p.category_id)) {
        invalidRelationships++;
        if (this.categoryCatalog.length > 0) {
          p.category_id = this.categoryCatalog[0].category_id;
        }
      }
      const catList = this.productsByCategory.get(p.category_id) || [];
      catList.push(p);
      this.productsByCategory.set(p.category_id, catList);
    });

    // Assign Popularity Weights to Products (10% High, 30% Medium, 60% Long-tail) per Category
    this.productsByCategory.forEach((prods) => {
      const N = prods.length;
      prods.forEach((p, index) => {
        const percentile = index / N;
        if (percentile <= 0.10) {
          p.popularityWeight = 10;
        } else if (percentile <= 0.40) {
          p.popularityWeight = 4;
        } else {
          p.popularityWeight = 1;
        }
      });
    });

    const categoryWeightMap: Record<string, number> = {
      'CAT001': 22,
      'CAT002': 16,
      'CAT003': 12,
      'CAT004': 10,
      'CAT005': 8,
      'CAT006': 6,
      'CAT007': 5,
      'CAT008': 4,
      'CAT009': 3,
      'CAT010': 3,
      'CAT011': 2,
      'CAT012': 2,
      'CAT013': 2,
      'CAT014': 1,
      'CAT015': 1,
      'CAT016': 1,
      'CAT017': 1,
      'CAT018': 1,
      'CAT019': 1,
      'CAT020': 1
    };

    this.categoryWeightList = this.categoryCatalog.map(c => ({
      category: c,
      weight: categoryWeightMap[c.category_id] || 1
    }));
    this.totalCategoryWeight = this.categoryWeightList.reduce((sum, item) => sum + item.weight, 0);

    this.productCatalog.forEach(p => {
      this.inventoryState[p.product_id] = {
        productId: p.product_id,
        stockQuantity: 100,
        availableQuantity: 100,
        reservedQuantity: 0,
        fulfilledQuantity: 0
      };
    });

    console.log(`
============================================================
MYSQL CATALOG LOADED
============================================================

Categories loaded : ${this.categoryCatalog.length}
Products loaded   : ${this.productCatalog.length}

Sample products:
${this.productCatalog.slice(0, 3).map(p => `  ${p.product_id} → ${p.category_id}`).join('\n')}

Product-category validation:
  Invalid relationships : ${invalidRelationships}

============================================================
`);
  }

  // Master Data Selection Helper Methods
  public selectCategory(): CatalogCategory {
    this.ensureCatalogLoaded();
    if (this.categoryCatalog.length === 0) {
      return { category_id: 'CAT001', name: 'Electronics', slug: 'electronics' };
    }
    const rand = Math.random() * this.totalCategoryWeight;
    let sum = 0;
    for (const item of this.categoryWeightList) {
      sum += item.weight;
      if (rand <= sum) {
        return item.category;
      }
    }
    return this.categoryCatalog[0];
  }

  public selectProductForCategory(categoryId: string): CatalogProduct {
    this.ensureCatalogLoaded();
    const prods = this.productsByCategory.get(categoryId) || [];
    if (prods.length === 0) {
      return this.productCatalog[0] || {
        product_id: 'PROD-CAT001-001',
        name: 'Electronics Item 1',
        brand: 'Brand-CAT001',
        category_id: 'CAT001',
        subcategory_id: 'SUB-CAT001-1',
        price: 2500,
        sale_price: 2250,
        rating: 4.5,
        popularityWeight: 1
      };
    }
    const totalWeight = prods.reduce((sum, p) => sum + p.popularityWeight, 0);
    const rand = Math.random() * totalWeight;
    let accum = 0;
    for (const p of prods) {
      accum += p.popularityWeight;
      if (rand <= accum) return p;
    }
    return prods[0];
  }

  public selectProductFromCatalog(): CatalogProduct {
    this.ensureCatalogLoaded();
    const cat = this.selectCategory();
    return this.selectProductForCategory(cat.category_id);
  }

  public getProductDetails(productId: string): CatalogProduct | null {
    return this.productsById.get(productId) || null;
  }

  public getSkuPrice(productId: string): number {
    const prod = this.getProductDetails(productId);
    if (prod && prod.price && prod.price > 0) {
      return prod.price;
    }
    let hash = 0;
    for (let i = 0; i < productId.length; i++) {
      hash = (hash << 5) - hash + productId.charCodeAt(i);
      hash |= 0;
    }
    const price = 499 + (Math.abs(hash) % 44500);
    return Math.round(price * 100) / 100;
  }

  public getProductDistributionStats() {
    const totalProductEvents = Array.from(this.runtimeProductCounts.values()).reduce((a, b) => a + b, 0);
    const totalCategoryEvents = Array.from(this.runtimeCategoryCounts.values()).reduce((a, b) => a + b, 0);

    const sortedProducts = Array.from(this.runtimeProductCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pId, count]) => ({
        product_id: pId,
        count,
        percentage: totalProductEvents > 0 ? parseFloat(((count / totalProductEvents) * 100).toFixed(2)) : 0
      }));

    const sortedCategories = Array.from(this.runtimeCategoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cId, count]) => ({
        category_id: cId,
        category_name: this.categoriesById.get(cId)?.name || cId,
        count,
        percentage: totalCategoryEvents > 0 ? parseFloat(((count / totalCategoryEvents) * 100).toFixed(2)) : 0
      }));

    return {
      totalProductEvents,
      totalCategoryEvents,
      topProducts: sortedProducts,
      categoryDistribution: sortedCategories
    };
  }

  public printDistributionStats() {
    const stats = this.getProductDistributionStats();
    console.log('\n============================================================');
    console.log('PRODUCT & CATEGORY DISTRIBUTION STATS');
    console.log('============================================================');
    console.log(`Total Product Events  : ${stats.totalProductEvents}`);
    console.log(`Total Category Events : ${stats.totalCategoryEvents}\n`);
    console.log('Top 10 Products:');
    stats.topProducts.forEach(p => {
      console.log(`  ${p.product_id.padEnd(20)} : ${p.count} events (${p.percentage}%)`);
    });
    console.log('\nCategory Distribution:');
    stats.categoryDistribution.forEach(c => {
      console.log(`  ${c.category_id.padEnd(10)} (${c.category_name.padEnd(25)}) : ${c.count} events (${c.percentage}%)`);
    });
    console.log('============================================================\n');
  }

  private resetStats() {
    this.coverageStats = {};
    this.skippedReasons = {};
    const uniqueEventTypes = Array.from(new Set(Object.values(EVENT_REGISTRY).flat()));
    uniqueEventTypes.forEach((evt) => {
      this.coverageStats[evt] = 0;
      this.skippedReasons[evt] = 'No simulation cycles ran yet';
    });
    this.distinctOrdersSet.clear();
    this.distinctPaymentsSet.clear();
    this.distinctReturnsSet.clear();
    this.liveStats = {
      total_events: 0,
      orders: 0,
      payments: 0,
      returns: 0,
      invalid: 0,
      duplicates: 0,
      late: 0,
      out_of_order: 0,
      invalid_timestamp: 0,
      missing_customer: 0,
      negative_price: 0,
      invalid_category: 0,
      corrupted_json: 0,
      fraud_events: 0,
      ddos_fraud_count: 0,
      scraper_fraud_count: 0
    };
    this.eventTimestamps = [];
    this.customerJourneys = {};
    this.orderJourneys = {};
    this.pendingScheduledEvents = [];
    this.elapsedSeconds = 0;
    this.rateAccumulator = 0;
    this.currentTickEmittedCount = 0;
    this.customerCounter = 0;
  }

  private getFormattedDuration(): string {
    const hrs = Math.floor(this.elapsedSeconds / 3600);
    const mins = Math.floor((this.elapsedSeconds % 3600) / 60);
    const secs = this.elapsedSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private getActualRate(): number {
    if (this.elapsedSeconds <= 0) return 0;
    return parseFloat((this.liveStats.total_events / this.elapsedSeconds).toFixed(1));
  }

  public getStatus() {
    const activeCustTraces = Object.entries(this.customerJourneys).map(([id, steps]) => ({
      customer_id: id,
      steps
    }));

    const activeOrderTraces = Object.entries(this.orderJourneys).map(([id, steps]) => ({
      order_id: id,
      steps
    }));

    const customerIds = activeCustTraces.map(c => c.customer_id);
    const orderIds = activeOrderTraces.map(o => o.order_id);

    const calculatedInvalid = 
      this.liveStats.duplicates +
      this.liveStats.late +
      this.liveStats.out_of_order +
      this.liveStats.invalid_timestamp +
      this.liveStats.missing_customer +
      this.liveStats.negative_price +
      this.liveStats.invalid_category +
      this.liveStats.corrupted_json;

    return {
      running: this.isSimulating,
      paused: this.isPaused,
      runId: this.currentRunId,
      config: {
        usersCount: this.usersCount,
        targetRate: this.targetRate,
        rateUnit: this.rateUnit,
        duration: this.duration,
        trafficProfile: this.trafficProfile,
        mode: this.mode,
        fraudIpsCount: this.fraudIpsCount,
        fraudIngredients: this.fraudIngredients,
        fraudRatio: this.fraudRatio
      },
      elapsedDuration: this.getFormattedDuration(),
      actualRate: this.getActualRate(),
      liveStats: {
        ...this.liveStats,
        invalid: calculatedInvalid,
        active_sessions: this.activeCustomers.length
      },
      customerIds,
      orderIds,
      customerJourneys: this.customerJourneys,
      orderJourneys: this.orderJourneys,
      customerJourney: activeCustTraces[0] ? { customerId: activeCustTraces[0].customer_id, steps: activeCustTraces[0].steps } : null,
      orderJourney: activeOrderTraces[0] ? { orderId: activeOrderTraces[0].order_id, steps: activeOrderTraces[0].steps } : null
    };
  }

  public getCoverageReport() {
    const report: Array<{ event_type: string; generated: boolean; count: number; skipped_reason: string }> = [];
    const uniqueEventTypes = Array.from(new Set(Object.values(EVENT_REGISTRY).flat()));
    uniqueEventTypes.forEach((evt) => {
      const count = this.coverageStats[evt] || 0;
      report.push({
        event_type: evt,
        generated: count > 0,
        count,
        skipped_reason: count > 0 ? '' : (this.skippedReasons[evt] || 'Not hit during state transitions')
      });
    });
    return report;
  }

  public async startSimulator(config: { 
    usersCount?: number; 
    targetRate?: number; 
    rateUnit?: string; 
    duration?: string; 
    trafficProfile?: string;
    mode?: 'CLEAN' | 'DIRTY' | 'FRAUD';
    fraudIpsCount?: number;
    fraudIngredients?: 'DDOS' | 'SCRAPER' | 'BOTH';
    fraudRatio?: number;
  }) {
    if (this.isSimulating) {
      await this.stopSimulator();
    }
    this.resetStats();

    this.isSimulating = true;
    this.isPaused = false;
    this.usersCount = config.usersCount || 100;
    this.targetRate = config.targetRate || 50;
    this.rateUnit = config.rateUnit || '/sec';
    this.duration = config.duration || '5 min';
    this.trafficProfile = config.trafficProfile || 'Mixed / Realistic';
    
    if (config.mode === 'FRAUD') {
      this.mode = 'FRAUD';
    } else if (config.mode === 'DIRTY' || (config.mode as string) === 'CHAOS') {
      this.mode = 'DIRTY';
    } else {
      this.mode = 'CLEAN';
    }

    this.fraudIpsCount = config.fraudIpsCount || 5;
    this.fraudIngredients = config.fraudIngredients || 'BOTH';
    this.fraudRatio = config.fraudRatio !== undefined ? config.fraudRatio : 0.10;

    // Generate pool of fraud IPs
    this.fraudIpPool = [];
    for (let i = 1; i <= this.fraudIpsCount; i++) {
      this.fraudIpPool.push(`198.51.100.${10 + i}`);
    }

    this.rateAccumulator = 0;
    this.speedMs = 100; // Fixed 100ms ticker interval for precision rate control

    await this.loadSimulationCaches();

    const now = new Date();
    this.currentRunId = `SIM-${now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)}`;

    console.log(`[Simulator] Starting run ${this.currentRunId} | mode: ${this.mode} | target: ${this.targetRate}${this.rateUnit} | ticker: ${this.speedMs}ms`);

    try {
      await insertSimulationRun({
        run_id: this.currentRunId,
        users: this.usersCount,
        target_rate: this.targetRate,
        rate_unit: this.rateUnit,
        duration: this.duration,
        traffic_profile: this.trafficProfile,
        total_events: 0,
        orders: 0,
        payments: 0,
        returns: 0,
        invalid: 0,
        duplicates: 0,
        late: 0,
        status: 'RUNNING',
        started_at: now
      });
    } catch (err) {
      console.error('[Simulator Error] Failed to log simulation run insert:', err);
    }

    for (let i = 0; i < Math.min(this.usersCount, 1000); i++) {
      const customer = this.spawnVirtualCustomer();
      if (customer) this.activeCustomers.push(customer);
    }

    this.timer = setInterval(() => this.tick(), this.speedMs);
    
    this.secondsTimer = setInterval(() => {
      if (!this.isPaused) {
        this.elapsedSeconds++;
        let limitSec = 300;
        if (this.duration.includes('sec')) {
          limitSec = parseInt(this.duration);
        } else if (this.duration.includes('min')) {
          limitSec = parseInt(this.duration) * 60;
        }
        if (this.elapsedSeconds >= limitSec) {
          this.stopSimulator();
        }
      }
    }, 1000);
  }

  public async stopSimulator() {
    this.isSimulating = false;
    this.isPaused = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.secondsTimer) {
      clearInterval(this.secondsTimer);
      this.secondsTimer = null;
    }

    const remainingEvents = [...this.pendingScheduledEvents];
    this.pendingScheduledEvents = [];

    for (const ev of remainingEvents) {
      if (this.assertStateInvariants(ev.customer, ev.eventType)) {
        this.triggerEvent(ev.customer, ev.eventType, ev.metadata, ev.actorType || 'SYSTEM', ev.eventSource || 'simulator');
      }
    }

    const distinctPaymentSuccessPayments = this.distinctPaymentsSet.size;
    const distinctOrderCreatedOrders = this.distinctOrdersSet.size;
    const distinctOrderCreatedPayments = this.distinctOrdersSet.size;

    console.log(`[Simulator End-of-Run Assertion] distinct payment_success.payment_id (${distinctPaymentSuccessPayments}) === distinct order_created.payment_id (${distinctOrderCreatedPayments}) === distinct order_created.order_id (${distinctOrderCreatedOrders})`);

    try {
      const now = new Date();
      await updateSimulationRun(this.currentRunId, {
        total_events: this.liveStats.total_events,
        orders: this.liveStats.orders,
        payments: this.liveStats.payments,
        returns: this.liveStats.returns,
        invalid: this.liveStats.invalid,
        duplicates: this.liveStats.duplicates,
        late: this.liveStats.late,
        status: 'COMPLETED',
        ended_at: now
      });
    } catch (err) {
      console.error('[Simulator Error] Failed to update simulation run in DB:', err);
    } finally {
      this.activeCustomers = [];
      console.log(`[Simulator] Run ${this.currentRunId} stopped safely.`);
    }
  }

  public pauseSimulator() {
    if (!this.isSimulating || this.isPaused) return;
    this.isPaused = true;
    console.log('[Simulator] Simulation paused.');
  }

  public resumeSimulator() {
    if (!this.isSimulating || !this.isPaused) return;
    this.isPaused = false;
    console.log('[Simulator] Simulation resumed.');
  }

  private spawnVirtualCustomer(registeredProbability = 0.7): VirtualCustomer {
    this.customerCounter++;
    const uniqueCustId = `CUST-SIM-${String(this.customerCounter).padStart(5, '0')}`;

    const sessionId = `sess_sim_${Math.random().toString(36).substr(2, 9)}`;
    const sessionHash = crypto.createHash('md5').update(sessionId).digest('hex').substring(0, 8).toUpperCase();
    const isScraper = this.mode === 'DIRTY' && Math.random() < 0.15; // 15% cookie-clearing scrapers in DIRTY mode
    const isRegistered = Math.random() < registeredProbability && !isScraper;
    
    const customerId: string | null = isRegistered ? uniqueCustId : null;
    const pendingCustomerId = uniqueCustId;
    const finalAnonId = isRegistered ? null : (isScraper ? `ANON-SCRAPER-${sessionHash}` : `ANON-SIM-${sessionHash}`);

    let profileName: BehaviorProfile = 'REGULAR_BUYER';
    if (this.trafficProfile === 'Deal Hunter') profileName = 'DEAL_HUNTER';
    else if (this.trafficProfile === 'Cart Abandoner') profileName = 'CART_ABANDONER';
    else if (this.trafficProfile === 'Return Prone') profileName = 'RETURN_PRONE';
    else if (this.trafficProfile === 'Browser Heavy') profileName = 'BROWSER';
    else if (this.trafficProfile === 'Impulse Buyer') profileName = 'IMPULSE_BUYER';
    else if (this.trafficProfile === 'High Value Buyer') profileName = 'HIGH_VALUE_BUYER';
    else if (this.trafficProfile === 'Regular Buyer') profileName = 'REGULAR_BUYER';
    else {
      const profiles: BehaviorProfile[] = [
        'BROWSER', 'DEAL_HUNTER', 'REGULAR_BUYER', 'IMPULSE_BUYER',
        'HIGH_VALUE_BUYER', 'CART_ABANDONER', 'RETURN_PRONE'
      ];
      profileName = profiles[Math.floor(Math.random() * profiles.length)];
    }

    const profile: CustomerBehaviorProfile = {
      profileName,
      priceSensitivity: profileName === 'DEAL_HUNTER' ? 0.9 : 0.4,
      purchaseProbability: profileName === 'IMPULSE_BUYER' ? 0.8 : 0.3,
      cartAbandonProbability: profileName === 'CART_ABANDONER' ? 0.7 : 0.15,
      returnProbability: profileName === 'RETURN_PRONE' ? 0.4 : 0.05,
      preferredCategories: ['CAT001', 'CAT002', 'CAT003', 'CAT004', 'CAT005']
    };

    const sessionIntents: SessionIntent[] = [
      'CASUAL_BROWSING', 'DEAL_SEEKING', 'URGENT_PURCHASE',
      'RESEARCH', 'GIFT_SHOPPING', 'REPEAT_PURCHASE'
    ];
    const sessionIntent = sessionIntents[Math.floor(Math.random() * sessionIntents.length)];

    const deviceId = `DEV-SIM-${sessionHash}-${Math.floor(100 + Math.random() * 900)}`;
    const ipAddress = `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(1 + Math.random() * 254)}`;

    const isForcedTest = Math.random() < 0.08;
    const forcedSteps = isForcedTest ? ['session_started', 'login', 'cart_item_added', 'checkout_started', 'payment_initiated', 'order_created', 'payment_success'] : undefined;

    return {
      customerId,
      pendingCustomerId,
      anonymousId: finalAnonId as any,
      sessionId,
      deviceId,
      ipAddress,
      isScraper,
      userType: customerId ? 'registered' : 'guest',
      profile,
      sessionIntent,
      currentState: 'NEW',
      cart: [],
      wishlist: [],
      searchResults: [],
      journeyCounter: 1,
      lastEventTime: Date.now(),
      ...(isForcedTest ? { forcedSteps, currentStepIndex: 0 } : {})
    };
  }

  private assertStateInvariants(customer: VirtualCustomer, eventType: string): boolean {
    if (eventType === 'cart_item_removed' || eventType === 'cart_update') {
      if (customer.cart.length === 0) return false;
    }
    if (eventType === 'checkout_started' || eventType === 'payment_initiated') {
      if (customer.cart.length === 0) return false;
    }
    if (eventType === 'payment_retry') {
      if (customer.lastPaymentSuccess !== false) return false;
    }
    if (eventType === 'order_created' || eventType === 'order_confirmed') {
      if (customer.lastPaymentSuccess !== true) return false;
    }
    if (eventType === 'inventory_reserved' || eventType === 'shipment_created') {
      if (!customer.activeOrderId) return false;
    }
    if (eventType === 'delivered') {
      if (!customer.activeOrderId) return false;
    }
    if (eventType === 'return_requested') {
      if (!customer.activeOrderId) return false;
    }
    if (eventType === 'refund_initiated' || eventType === 'refund_success') {
      if (!customer.activeReturnId) return false;
    }
    if (eventType === 'review_added' || eventType === 'rating_given') {
      if (!customer.activeOrderId) return false;
    }
    return true;
  }

  private async tick() {
    if (!this.isSimulating || this.isPaused) return;

    // Rate-limiting token accumulator (fires every 100ms = 10 ticks per sec)
    const eventsPerSec = this.rateUnit === '/min' ? (this.targetRate / 60) : this.targetRate;
    const eventsPerTick = eventsPerSec / 10;
    this.rateAccumulator += eventsPerTick;

    const allowedEventsThisTick = Math.floor(this.rateAccumulator);
    this.currentTickEmittedCount = 0;

    // 1. Process ready scheduled system events up to tick budget
    const now = Date.now();
    const readyEvents = [...this.pendingScheduledEvents.filter(ev => ev.triggerTime <= now)];

    for (const ev of readyEvents) {
      if (this.currentTickEmittedCount >= allowedEventsThisTick) break;
      if (this.assertStateInvariants(ev.customer, ev.eventType)) {
        const metaWithTime = { ...ev.metadata, ...(ev.eventTimeIso ? { event_time: ev.eventTimeIso } : {}) };
        this.triggerEvent(ev.customer, ev.eventType, metaWithTime, ev.actorType || 'SYSTEM', ev.eventSource || 'simulator');
        this.pendingScheduledEvents = this.pendingScheduledEvents.filter(e => e !== ev);
      }
    }

    // 2. Process customer progress transitions up to tick budget
    while (this.currentTickEmittedCount < allowedEventsThisTick && this.activeCustomers.length > 0) {
      const idx = Math.floor(Math.random() * this.activeCustomers.length);
      const customer = this.activeCustomers[idx];
      try {
        await this.progressCustomer(customer);
      } catch (err) {
        console.error(`[Simulator Error] Transition failed for session ${customer.sessionId}:`, err);
      }
    }

    // 3. Process Fraud Injection in FRAUD mode using clean generator logic
    if (this.mode === 'FRAUD' && this.fraudIpPool.length > 0) {
      const fraudBudget = Math.max(1, Math.floor((allowedEventsThisTick || 1) * this.fraudRatio));
      for (let f = 0; f < fraudBudget; f++) {
        const fraudIp = this.fraudIpPool[Math.floor(Math.random() * this.fraudIpPool.length)];
        const applyDdos = this.fraudIngredients === 'DDOS' || (this.fraudIngredients === 'BOTH' && Math.random() < 0.5);

        if (applyDdos) {
          // DDoS Fraud Ingredient: Pick an IP, force >30 events from it in <10s using clean event emission logic
          const ddosCust = this.spawnVirtualCustomer();
          if (ddosCust) {
            ddosCust.ipAddress = fraudIp;
            this.triggerEvent(ddosCust, 'page_view', {
              ground_truth_fraud: true,
              fraud_rule: 'DDOS',
              fraud_ip: fraudIp
            }, 'CUSTOMER', 'website');
            this.liveStats.fraud_events++;
            this.liveStats.ddos_fraud_count++;
          }
        } else {
          // Cookie-Clearing Scraper Ingredient: Pick an IP, force it to rotate across >3 distinct session_ids in <10s using clean session creation logic
          const scraperCust = this.spawnVirtualCustomer();
          if (scraperCust) {
            scraperCust.ipAddress = fraudIp;
            const newHash = crypto.createHash('md5').update(Math.random().toString()).digest('hex').substring(0, 8).toUpperCase();
            scraperCust.sessionId = `sess_sim_scr_${newHash}`;
            scraperCust.anonymousId = `ANON-SCRAPER-${newHash}`;
            this.triggerEvent(scraperCust, 'product_impression', {
              ground_truth_fraud: true,
              fraud_rule: 'COOKIE_CLEARING_SCRAPER',
              fraud_ip: fraudIp
            }, 'CUSTOMER', 'website');
            this.liveStats.fraud_events++;
            this.liveStats.scraper_fraud_count++;
          }
        }
      }
    }

    // Deduct actual emitted count from rate accumulator
    this.rateAccumulator -= this.currentTickEmittedCount;

    while (this.activeCustomers.length < this.usersCount) {
      const customer = this.spawnVirtualCustomer();
      this.activeCustomers.push(customer);
    }
  }

  private triggerEvent(
    customer: VirtualCustomer, 
    eventType: string, 
    metadata: any = {}, 
    actorType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' = 'CUSTOMER',
    eventSource: string = 'website'
  ) {
    if (!this.assertStateInvariants(customer, eventType) && !customer.forcedSteps) {
      return;
    }

    // Strict per-session non-decreasing event_time bounded by wall-clock now
    const realNow = Date.now();
    const eventTimeOverride = metadata.event_time || metadata.eventTimeIso;
    const nowMs = eventTimeOverride 
      ? new Date(eventTimeOverride).getTime() 
      : Math.min(realNow, Math.max(realNow, customer.lastEventTime || 0));
    if (!eventTimeOverride) {
      customer.lastEventTime = nowMs;
    } else {
      customer.lastEventTime = Math.max(customer.lastEventTime || 0, nowMs);
    }
    const nowIso = eventTimeOverride || new Date(nowMs).toISOString();

    this.coverageStats[eventType] = (this.coverageStats[eventType] || 0) + 1;
    if (this.skippedReasons[eventType]) {
      delete this.skippedReasons[eventType];
    }

    const isDirtyRun = this.mode === 'DIRTY';

    this.liveStats.total_events++;
    this.currentTickEmittedCount++;
    this.eventTimestamps.push(nowMs);

    const orderId = metadata.order_id || customer.activeOrderId;
    const paymentId = metadata.payment_id || customer.activePaymentId;
    const returnId = metadata.return_id || customer.activeReturnId;

    // Distinct Logical Orders, Payments, and Returns counted in BOTH Clean & Dirty mode (Set prevents double counting)
    if (eventType === 'order_created' && orderId) {
      this.distinctOrdersSet.add(orderId);
      this.liveStats.orders = this.distinctOrdersSet.size;
    }
    if (eventType === 'payment_success' && paymentId) {
      this.distinctPaymentsSet.add(paymentId);
      this.liveStats.payments = this.distinctPaymentsSet.size;
    }
    if (eventType === 'return_requested' && returnId) {
      this.distinctReturnsSet.add(returnId);
      this.liveStats.returns = this.distinctReturnsSet.size;
    }

    const journeyKey = customer.customerId || customer.sessionId;
    if (!this.customerJourneys[journeyKey]) {
      this.customerJourneys[journeyKey] = [];
    }
    this.customerJourneys[journeyKey].push(eventType);
    if (this.customerJourneys[journeyKey].length > 15) {
      this.customerJourneys[journeyKey].shift();
    }

    if (orderId) {
      if (!this.orderJourneys[orderId]) {
        this.orderJourneys[orderId] = [];
      }
      this.orderJourneys[orderId].push(eventType);
      if (this.orderJourneys[orderId].length > 15) {
        this.orderJourneys[orderId].shift();
      }
    }

    const isSessionOnlyEvent = ['session_started', 'session_ended', 'login', 'logout'].includes(eventType);
    const isCartStep = ['cart_item_added', 'cart_update', 'cart_item_removed', 'checkout_started', 'checkout_abandoned', 'coupon_applied', 'address_selected', 'delivery_option_selected', 'payment_method_selected', 'payment_initiated', 'payment_success', 'payment_failed', 'payment_retry', 'order_created', 'order_confirmed'].includes(eventType);
    const cartId = (customer.cart.length > 0 || isCartStep || metadata.cart_id) ? (metadata.cart_id || `CART-${customer.sessionId}`) : null;
    const isOrderStep = ['order_created', 'order_confirmed', 'order_status_updated', 'inventory_reserved', 'inventory_released', 'shipment_created', 'order_packed', 'order_shipped', 'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed', 'return_requested', 'return_approved', 'return_rejected', 'return_picked_up', 'return_received', 'refund_initiated', 'refund_success', 'review_added', 'rating_given', 'invoice_generated', 'notification_created'].includes(eventType);
    const isPaymentStep = ['payment_initiated', 'payment_success', 'payment_failed', 'payment_retry'].includes(eventType) || isOrderStep;
    const isShipmentStep = ['shipment_created', 'order_packed', 'order_shipped', 'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed'].includes(eventType);
    const isReturnStep = ['return_requested', 'return_approved', 'return_rejected', 'return_picked_up', 'return_received', 'refund_initiated', 'refund_success'].includes(eventType);
    const isRefundStep = ['refund_initiated', 'refund_success', 'refund_failed'].includes(eventType);
    const isReviewStep = ['review_added', 'rating_given'].includes(eventType);

    const isAdminType = eventType.startsWith('admin_') || actorType === 'ADMIN';
    const finalActorType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' = isAdminType ? 'ADMIN' : actorType;

    const finalCustomerId = isAdminType ? null : (metadata.customer_id !== undefined ? metadata.customer_id : customer.customerId);
    const finalUserType: 'guest' | 'registered' | 'admin' = isAdminType ? 'admin' : (finalCustomerId ? 'registered' : 'guest');
    const finalAnonymousId = (isAdminType || finalCustomerId) ? null : (metadata.anonymous_id || customer.anonymousId);

    const entityPayload = {
      product_id: isSessionOnlyEvent ? null : (metadata.selected_product_id || metadata.product_id || customer.activeProductId || null),
      cart_id: isSessionOnlyEvent ? null : cartId,
      order_id: (isOrderStep || metadata.order_id) ? (metadata.order_id || customer.activeOrderId || null) : null,
      order_item_id: (isOrderStep || metadata.order_item_id) ? (metadata.order_item_id || customer.activeOrderItemId || null) : null,
      payment_id: (isPaymentStep || metadata.payment_id) ? (metadata.payment_id || customer.activePaymentId || null) : null,
      shipment_id: (isShipmentStep || metadata.shipment_id) ? (metadata.shipment_id || customer.activeShipmentId || null) : null,
      return_id: (isReturnStep || metadata.return_id) ? (metadata.return_id || customer.activeReturnId || null) : null,
      refund_id: (isRefundStep || metadata.refund_id) ? (metadata.refund_id || customer.activeRefundId || null) : null,
      review_id: (isReviewStep || metadata.review_id) ? (metadata.review_id || customer.activeReviewId || null) : null,
      admin_id: isAdminType ? (metadata.admin_id || 'ADM001') : null
    };

    const isSystemActor = finalActorType === 'SYSTEM';

    const lagMs = Math.floor(10 + Math.random() * 290);
    const defaultIngestionIso = new Date(new Date(nowIso).getTime() + lagMs).toISOString();
    const finalIngestionIso = metadata.ingestion_time || defaultIngestionIso;
    const computedLagSec = metadata.ingestion_time 
      ? Math.max(0, parseFloat(((new Date(metadata.ingestion_time).getTime() - new Date(nowIso).getTime()) / 1000).toFixed(3)))
      : parseFloat((lagMs / 1000).toFixed(3));

    // Build 100% valid canonical payload with explicit simulation_mode tag
    const payload = {
      event_id: `EVT-SIM-${Math.floor(10000000 + Math.random() * 90000000)}`,
      simulation_run_id: this.currentRunId || 'SIM-TEST-RUN',
      event_type: eventType,
      event_version: 1,
      event_time: nowIso,
      ingestion_time: finalIngestionIso,
      event_source: isAdminType ? 'admin_portal' : eventSource,
      actor_type: finalActorType,
      session_id: customer.sessionId,
      customer_id: finalCustomerId,
      anonymous_id: finalAnonymousId,
      user_type: finalUserType,
      page: isSystemActor ? null : (isAdminType ? 'admin_dashboard' : customer.currentState.toLowerCase()),
      context: {
        country: 'IN',
        state: 'Tamil Nadu',
        city: 'Chennai',
        device: isSystemActor ? null : 'desktop',
        browser: isSystemActor ? null : 'Chrome',
        device_id: customer.deviceId,
        ip_address: customer.ipAddress
      },
      entity: entityPayload,
      metadata: {
        ...metadata,
        ground_truth_fraud: metadata.ground_truth_fraud === true,
        fraud_rule: metadata.fraud_rule || null,
        fraud_ip: metadata.fraud_ip || null,
        simulated: true,
        simulation_mode: (this.mode === 'FRAUD' || metadata.ground_truth_fraud === true) ? 'FRAUD' : 'CLEAN',
        producer_ingestion_lag_seconds: computedLagSec,
        forced_test: metadata.forced_test === true || !!customer.forcedSteps,
        ...(customer.isScraper ? { is_scraper: true, cookie_cleared: true } : {})
      }
    };

    // Cookie-clearing scraper behavior: Resets sessionId and anonymousId after burst click while retaining the exact same deviceId & ipAddress!
    if (customer.isScraper && Math.random() < 0.4) {
      const newHash = crypto.createHash('md5').update(Math.random().toString()).digest('hex').substring(0, 8).toUpperCase();
      customer.sessionId = `sess_sim_scr_${newHash}`;
      customer.anonymousId = `ANON-SCRAPER-${newHash}`;
    }

    // CLEAN MODE: Emit valid payload cleanly with 0 chaos mutations
    if (!isDirtyRun) {
      EventLogger.logEvent(payload);
      return;
    }

    // CHAOS MODE (isDirtyRun === true): Select chaos issue type if random trigger hits (~20% total dirty rate)
    const dirtyChance = Math.random();
    if (dirtyChance > 0.20) {
      // Uncorrupted events in dirty mode retain simulation_mode = 'CLEAN'
      EventLogger.logEvent(payload);
      return;
    }

    // Pick 1 of 8 specific chaos dirty types
    const dirtyTypeRoll = Math.floor(Math.random() * 8);

    switch (dirtyTypeRoll) {
      case 0: { // 1. DUPLICATE EVENT (Emit exact same event payload twice with same event_id, tag 2nd as DIRTY)
        this.liveStats.duplicates++;
        this.liveStats.total_events++; // Count 2nd physical emitted record
        this.currentTickEmittedCount++;
        this.liveStats.invalid++;
        EventLogger.logEvent(payload);
        const dupPayload = {
          ...payload,
          metadata: {
            ...payload.metadata,
            simulation_mode: 'DIRTY',
            data_quality: { is_dirty: true, issue_type: 'DUPLICATE_EVENT' }
          }
        };
        EventLogger.logEvent(dupPayload, true); // allowDuplicateEventId = true
        break;
      }
      case 1: { // 2. LATE EVENT (ingestion_time > event_time)
        this.liveStats.late++;
        this.liveStats.invalid++;
        const lateIso = new Date(nowMs + 60000).toISOString();
        const latePayload = {
          ...payload,
          ingestion_time: lateIso,
          metadata: {
            ...payload.metadata,
            simulation_mode: 'DIRTY',
            data_quality: { is_dirty: true, issue_type: 'LATE_EVENT' }
          }
        };
        EventLogger.logEvent(latePayload);
        break;
      }
      case 2: { // 3. OUT OF ORDER EVENT (arrival order differs from event-time order)
        this.liveStats.out_of_order++;
        this.liveStats.invalid++;
        const pastIso = new Date(nowMs - 120000).toISOString();
        const outOfOrderPayload = {
          ...payload,
          event_time: pastIso,
          metadata: {
            ...payload.metadata,
            simulation_mode: 'DIRTY',
            data_quality: { is_dirty: true, issue_type: 'OUT_OF_ORDER' }
          }
        };
        EventLogger.logEvent(outOfOrderPayload);
        break;
      }
      case 3: { // 4. INVALID TIMESTAMP (Null or malformed timestamp string)
        this.liveStats.invalid_timestamp++;
        this.liveStats.invalid++;
        const invalidTimePayload = {
          ...payload,
          event_time: 'INVALID_TIMESTAMP_2026',
          metadata: {
            ...payload.metadata,
            simulation_mode: 'DIRTY',
            data_quality: { is_dirty: true, issue_type: 'INVALID_TIMESTAMP' }
          }
        };
        EventLogger.logEvent(invalidTimePayload);
        break;
      }
      case 4: { // 5. MISSING REQUIRED CUSTOMER ID
        this.liveStats.missing_customer++;
        this.liveStats.invalid++;
        const missingCustomerPayload = {
          ...payload,
          customer_id: null,
          user_type: 'registered' as const, // registered user event missing required customer_id
          metadata: {
            ...payload.metadata,
            simulation_mode: 'DIRTY',
            data_quality: { is_dirty: true, issue_type: 'MISSING_REQUIRED_CUSTOMER' }
          }
        };
        EventLogger.logEvent(missingCustomerPayload);
        break;
      }
      case 5: { // 6. NEGATIVE PRICE (Mutate metadata price on emitted event only)
        this.liveStats.negative_price++;
        this.liveStats.invalid++;
        const negativePricePayload = {
          ...payload,
          metadata: {
            ...payload.metadata,
            simulation_mode: 'DIRTY',
            unit_price: -1499,
            amount: -1499,
            data_quality: { is_dirty: true, issue_type: 'NEGATIVE_PRICE' }
          }
        };
        EventLogger.logEvent(negativePricePayload);
        break;
      }
      case 6: { // 7. INVALID CATEGORY (Mutate metadata category on emitted event only)
        this.liveStats.invalid_category++;
        this.liveStats.invalid++;
        const invalidCategoryPayload = {
          ...payload,
          metadata: {
            ...payload.metadata,
            simulation_mode: 'DIRTY',
            category_id: 'INVALID_CAT_9999',
            data_quality: { is_dirty: true, issue_type: 'INVALID_CATEGORY' }
          }
        };
        EventLogger.logEvent(invalidCategoryPayload);
        break;
      }
      case 7: { // 8. CORRUPTED JSON (Keep simulation_run_id and simulation_mode visible before unclosed raw tail)
        this.liveStats.corrupted_json++;
        this.liveStats.invalid++;
        const corruptEventId = `EVT-SIM-${Math.floor(10000000 + Math.random() * 90000000)}`;
        const corruptedLine = `{"event_id":"${corruptEventId}","simulation_run_id":"${this.currentRunId}","simulation_mode":"DIRTY","event_type":"${eventType}","session_id":"${customer.sessionId}","customer_id":${customer.customerId ? `"${customer.customerId}"` : 'null'},"metadata":{"simulation_mode":"DIRTY","data_quality":{"is_dirty":true,"issue_type":"CORRUPTED_JSON"}},"unclosed_raw_payload":"CORRUPTED_PARSING_ERROR_TEST_STRING`;
        EventLogger.logRawCorruptedLine(corruptedLine);
        break;
      }
    }
  }

  private async progressCustomer(customer: VirtualCustomer) {
    if (customer.forcedSteps && customer.currentStepIndex !== undefined) {
      if (customer.currentStepIndex >= customer.forcedSteps.length) {
        this.activeCustomers = this.activeCustomers.filter(c => c.sessionId !== customer.sessionId);
        return;
      }
      const eventType = customer.forcedSteps[customer.currentStepIndex];
      await this.executeForcedEvent(customer, eventType);
      customer.currentStepIndex++;
      return;
    }

    const rand = Math.random();
    
    switch (customer.currentState) {
      case 'NEW':
        customer.currentState = 'SESSION_STARTED';
        this.triggerEvent(customer, 'session_started', {}, 'CUSTOMER', 'website');
        break;

      case 'SESSION_STARTED':
        if (customer.userType === 'registered') {
          customer.currentState = 'LOGGED_IN';
          this.triggerEvent(customer, 'login', {}, 'CUSTOMER', 'website');
        } else {
          customer.currentState = 'BROWSING';
          this.triggerEvent(customer, 'page_view', {}, 'CUSTOMER', 'website');
        }
        break;

      case 'LOGGED_IN':
        customer.currentState = 'BROWSING';
        this.triggerEvent(customer, 'page_view', {}, 'CUSTOMER', 'website');
        break;

      case 'BROWSING':
        if (rand < 0.20) {
          const impProd = this.selectProductFromCatalog();
          this.triggerEvent(customer, 'product_impression', { product_id: impProd.product_id }, 'CUSTOMER', 'website');
        } else if (rand < 0.45) {
          customer.currentState = 'SEARCHING';
          const query = SEARCH_LIBRARY[Math.floor(Math.random() * SEARCH_LIBRARY.length)];
          const matchingCat = Object.values(SEARCH_CATEGORY_MAP).find(c => c.searchTerms.includes(query)) || SEARCH_CATEGORY_MAP['CAT001'];
          customer.activeCategory = matchingCat.categoryId;

          const catProds = this.productsByCategory.get(matchingCat.categoryId) || [];
          if (catProds.length > 0) {
            customer.searchResults = catProds.slice(0, 5).map(p => p.product_id);
          } else {
            customer.searchResults = [this.selectProductForCategory(matchingCat.categoryId).product_id];
          }

          this.triggerEvent(customer, 'search', { query, result_count: customer.searchResults.length }, 'CUSTOMER', 'website');
          this.triggerEvent(customer, 'search_result_clicked', { query, selected_product_id: customer.searchResults[0] }, 'CUSTOMER', 'website');
        } else if (rand < 0.80) {
          let selectedProd: CatalogProduct;

          if (customer.searchResults.length > 0) {
            const pId = customer.searchResults[Math.floor(Math.random() * customer.searchResults.length)];
            const match = this.getProductDetails(pId);
            selectedProd = match || this.selectProductFromCatalog();
          } else if (customer.activeCategory) {
            selectedProd = this.selectProductForCategory(customer.activeCategory);
          } else {
            selectedProd = this.selectProductFromCatalog();
          }

          customer.activeProductId = selectedProd.product_id;
          customer.activeCategory = selectedProd.category_id;

          this.runtimeProductCounts.set(selectedProd.product_id, (this.runtimeProductCounts.get(selectedProd.product_id) || 0) + 1);
          this.runtimeCategoryCounts.set(selectedProd.category_id, (this.runtimeCategoryCounts.get(selectedProd.category_id) || 0) + 1);

          customer.currentState = 'PRODUCT_VIEW';
          this.triggerEvent(customer, 'product_view', { product_id: selectedProd.product_id }, 'CUSTOMER', 'website');
        } else {
          customer.currentState = 'COMPLETED';
          if (customer.userType === 'registered' && Math.random() < 0.4) {
            this.triggerEvent(customer, 'logout', {}, 'CUSTOMER', 'website');
          }
          this.triggerEvent(customer, 'session_ended', {}, 'CUSTOMER', 'website');
          this.activeCustomers = this.activeCustomers.filter(c => c.sessionId !== customer.sessionId);
        }
        break;

      case 'SEARCHING':
        const catId = customer.activeCategory || 'CAT001';
        const catObj = SEARCH_CATEGORY_MAP[catId] || SEARCH_CATEGORY_MAP['CAT001'];

        const filterBrands = ['BrandX', 'TechCorp', 'StyleCo', 'UrbanFit', 'Nexus', 'Apex', 'Aura'];
        const filterPriceMins = [200, 500, 1000, 2000, 5000];
        const filterPriceMaxs = [3000, 5000, 10000, 25000, 50000, 100000];
        const filterRatingMins = [3.0, 3.5, 4.0, 4.5];
        const filterDiscountMins = [5, 10, 15, 20, 30, 50];

        this.triggerEvent(customer, 'filter_applied', { 
          category_id: catObj.categoryId,
          category_name: catObj.categoryName,
          price_min: filterPriceMins[Math.floor(Math.random() * filterPriceMins.length)],
          price_max: filterPriceMaxs[Math.floor(Math.random() * filterPriceMaxs.length)],
          rating_min: filterRatingMins[Math.floor(Math.random() * filterRatingMins.length)],
          brand: filterBrands[Math.floor(Math.random() * filterBrands.length)],
          discount_min: filterDiscountMins[Math.floor(Math.random() * filterDiscountMins.length)]
        }, 'CUSTOMER', 'website');

        if (customer.profile.profileName === 'DEAL_HUNTER' || Math.random() < 0.4) {
          this.triggerEvent(customer, 'coupon_viewed', {}, 'CUSTOMER', 'website');
        }
        customer.currentState = 'BROWSING';
        break;

      case 'PRODUCT_VIEW':
        if (rand < 0.2) {
          this.triggerEvent(customer, 'product_image_view', { product_id: customer.activeProductId }, 'CUSTOMER', 'website');
        } else if (rand < 0.4) {
          this.triggerEvent(customer, 'product_details_view', { product_id: customer.activeProductId }, 'CUSTOMER', 'website');
        } else if (rand < 0.6) {
          if (customer.activeProductId && !customer.wishlist.includes(customer.activeProductId)) {
            customer.wishlist.push(customer.activeProductId);
            this.triggerEvent(customer, 'wishlist_add', { product_id: customer.activeProductId }, 'CUSTOMER', 'website');
          } else if (customer.wishlist.length > 0) {
            const remProd = customer.wishlist.pop();
            this.triggerEvent(customer, 'wishlist_remove', { product_id: remProd }, 'CUSTOMER', 'website');
          }
        } else if (rand < 0.85) {
          if (customer.activeProductId) {
            const price = this.getSkuPrice(customer.activeProductId);
            customer.cart.push({ productId: customer.activeProductId, quantity: 1, unitPrice: price });
            customer.currentState = 'CART';
            this.triggerEvent(customer, 'cart_item_added', { 
              product_id: customer.activeProductId, 
              cart_id: `CART-${customer.sessionId}`,
              quantity: 1, 
              unit_price: price 
            }, 'CUSTOMER', 'website');
          }
        } else {
          customer.currentState = 'BROWSING';
          this.triggerEvent(customer, 'page_view', {}, 'CUSTOMER', 'website');
        }
        break;

      case 'CART':
        if (customer.profile.profileName === 'CART_ABANDONER' && rand < 0.6) {
          this.triggerEvent(customer, 'checkout_abandoned', { cart_id: `CART-${customer.sessionId}` }, 'CUSTOMER', 'website');
          customer.currentState = 'BROWSING';
        } else if (customer.profile.profileName === 'DEAL_HUNTER' && Math.random() < 0.6) {
          const couponOptions = [
            { code: 'SAVE10', pct: 0.10 },
            { code: 'WELCOME20', pct: 0.20 },
            { code: 'FESTIVE15', pct: 0.15 },
            { code: 'FLAT500', flat: 500 },
            { code: 'MEGA25', pct: 0.25 }
          ];
          const selectedCoupon = couponOptions[Math.floor(Math.random() * couponOptions.length)];
          const cartTotal = customer.cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 2500;
          const discountAmt = selectedCoupon.flat ? Math.min(selectedCoupon.flat, cartTotal) : Math.round(cartTotal * (selectedCoupon.pct || 0.10));
          this.triggerEvent(customer, 'coupon_applied', { coupon: selectedCoupon.code, discount_amount: discountAmt }, 'CUSTOMER', 'website');
          customer.currentState = 'CHECKOUT';
          this.triggerEvent(customer, 'checkout_started', { cart_id: `CART-${customer.sessionId}` }, 'CUSTOMER', 'website');
        } else if (rand < 0.2 && customer.cart.length > 0) {
          const item = customer.cart[0];
          item.quantity += 1;
          this.triggerEvent(customer, 'cart_update', { 
            product_id: item.productId, 
            cart_id: `CART-${customer.sessionId}`, 
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.quantity * item.unitPrice
          }, 'CUSTOMER', 'website');
        } else if (rand < 0.35 && customer.cart.length > 0) {
          const remItem = customer.cart.pop();
          this.triggerEvent(customer, 'cart_item_removed', { product_id: remItem?.productId, cart_id: `CART-${customer.sessionId}` }, 'CUSTOMER', 'website');
          if (customer.cart.length === 0) customer.currentState = 'BROWSING';
        } else if (rand < 0.85 && customer.cart.length > 0) {
          customer.currentState = 'CHECKOUT';
          this.triggerEvent(customer, 'checkout_started', { cart_id: `CART-${customer.sessionId}` }, 'CUSTOMER', 'website');
        } else {
          customer.currentState = 'BROWSING';
          this.triggerEvent(customer, 'page_view', {}, 'CUSTOMER', 'website');
        }
        break;

      case 'CHECKOUT':
        const sessionSuffix = customer.sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
        customer.activeOrderId = `ORD-SIM-${sessionSuffix}-${customer.journeyCounter}`;
        customer.activeOrderItemId = `ITEM-SIM-${sessionSuffix}-${customer.journeyCounter}`;
        customer.activePaymentId = `PAY-SIM-${sessionSuffix}-${customer.journeyCounter}`;

        this.triggerEvent(customer, 'address_selected', { 
          shipping_address: {
            address_id: 'ADDR-101',
            city: 'Chennai',
            state: 'Tamil Nadu',
            country: 'IN'
          }
        }, 'CUSTOMER', 'website');
        
        this.triggerEvent(customer, 'delivery_option_selected', { delivery_option: 'EXPRESS', delivery_fee: 100.00 }, 'CUSTOMER', 'website');
        
        const availableMethods = ['upi', 'credit_card', 'net_banking', 'cod', 'debit_card'];
        customer.paymentMethod = availableMethods[Math.floor(Math.random() * availableMethods.length)];
        this.triggerEvent(customer, 'payment_method_selected', {
          payment_method: customer.paymentMethod,
          method: customer.paymentMethod
        }, 'CUSTOMER', 'website');
        
        customer.currentState = 'PAYMENT';
        this.triggerEvent(customer, 'payment_initiated', {
          payment_id: customer.activePaymentId,
          cart_id: `CART-${customer.sessionId}`,
          order_id: customer.activeOrderId,
          payment_method: customer.paymentMethod,
          currency: 'INR'
        }, 'CUSTOMER', 'website');
        break;

      case 'PAYMENT':
        const sessionSuffixPay = customer.sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();

        const itemsToProcess = customer.cart && customer.cart.length > 0 ? customer.cart : (() => {
          const fallbackProd = customer.activeProductId ? (this.getProductDetails(customer.activeProductId) || this.selectProductFromCatalog()) : this.selectProductFromCatalog();
          return [{ productId: fallbackProd.product_id, quantity: 1, unitPrice: fallbackProd.price }];
        })();

        let orderSubtotal = 0;
        itemsToProcess.forEach(item => {
          orderSubtotal += item.quantity * item.unitPrice;
        });

        const discount_amount = 0.00;
        const coupon_discount = 0.00;
        const tax_amount = Math.round(orderSubtotal * 0.18 * 100) / 100;
        const shipping_fee = 100.00;
        const delivery_fee = 0.00;
        const total_amount = orderSubtotal - discount_amount - coupon_discount + tax_amount + shipping_fee + delivery_fee;

        if (rand < 0.15 && customer.paymentAttempts === 0) {
          customer.paymentAttempts = 1;
          customer.lastPaymentSuccess = false;
          const attemptId1 = `ATT-SIM-${sessionSuffixPay}-1`;
          this.triggerEvent(customer, 'payment_failed', { 
            payment_id: customer.activePaymentId,
            order_id: customer.activeOrderId,
            payment_method: customer.paymentMethod,
            attempt_id: attemptId1,
            attempt_number: 1,
            payment_status: 'failed',
            amount: total_amount,
            reason: 'INSUFFICIENT_FUNDS'
          }, 'SYSTEM', 'payment_service');
          
          const attemptId2 = `ATT-SIM-${sessionSuffixPay}-2`;
          this.triggerEvent(customer, 'payment_retry', {
            payment_id: customer.activePaymentId,
            order_id: customer.activeOrderId,
            payment_method: customer.paymentMethod,
            attempt_id: attemptId2,
            attempt_number: 2,
            payment_status: 'retry',
            amount: total_amount
          }, 'CUSTOMER', 'website');
          customer.currentState = 'CHECKOUT';
        } else {
          customer.paymentAttempts = (customer.paymentAttempts || 0) + 1;
          customer.lastPaymentSuccess = true;
          const attemptNum = customer.paymentAttempts;
          const attemptId = `ATT-SIM-${sessionSuffixPay}-${attemptNum}`;
          
          // 1. Generate/store order_created timestamp FIRST
          const orderId = customer.activeOrderId || `ORD-SIM-${sessionSuffixPay}-${customer.journeyCounter}`;
          customer.activeOrderId = orderId;
          if (!customer.activeOrderItemId) {
            customer.activeOrderItemId = `ITEM-SIM-${sessionSuffixPay}-${customer.journeyCounter}`;
          }

          const randRange = (minMs: number, maxMs: number) => Math.floor(minMs + Math.random() * (maxMs - minMs));

          // Randomized realistic gaps (hours to days) between lifecycle stages
          const gapConfirmed = randRange(10 * 60 * 1000, 30 * 60 * 1000);              // 10-30 mins
          const gapInv = randRange(15 * 60 * 1000, 45 * 60 * 1000);                    // 15-45 mins
          const gapShipCreated = randRange(2 * 3600 * 1000, 6 * 3600 * 1000);          // 2-6 hours
          const gapPacked = randRange(4 * 3600 * 1000, 12 * 3600 * 1000);              // 4-12 hours
          const gapShipped = randRange(6 * 3600 * 1000, 18 * 3600 * 1000);             // 6-18 hours
          const gapInTransit = randRange(12 * 3600 * 1000, 36 * 3600 * 1000);          // 12-36 hours
          const gapOutForDeliv = randRange(12 * 3600 * 1000, 36 * 3600 * 1000);        // 12-36 hours
          const gapDelivered = randRange(2 * 3600 * 1000, 8 * 3600 * 1000);            // 2-8 hours

          const isReturn = customer.profile.profileName === 'RETURN_PRONE' || Math.random() < 0.15;
          const gapReturnReq = isReturn ? randRange(6 * 3600 * 1000, 48 * 3600 * 1000) : 0;     // 6-48 hours
          const gapReturnApp = isReturn ? randRange(2 * 3600 * 1000, 12 * 3600 * 1000) : 0;     // 2-12 hours
          const gapReturnPickup = isReturn ? randRange(12 * 3600 * 1000, 36 * 3600 * 1000) : 0; // 12-36 hours
          const gapReturnRecv = isReturn ? randRange(12 * 3600 * 1000, 48 * 3600 * 1000) : 0;   // 12-48 hours
          const gapRefundInit = isReturn ? randRange(1 * 3600 * 1000, 6 * 3600 * 1000) : 0;     // 1-6 hours
          const gapRefundSucc = isReturn ? randRange(2 * 3600 * 1000, 24 * 3600 * 1000) : 0;    // 2-24 hours

          let totalSpan = gapConfirmed + gapInv + gapShipCreated + gapPacked + gapShipped + gapInTransit + gapOutForDeliv + gapDelivered;
          if (isReturn) {
            totalSpan += gapReturnReq + gapReturnApp + gapReturnPickup + gapReturnRecv + gapRefundInit + gapRefundSucc;
          }

          // Anchor base order time T0 so all events complete prior to current time
          const nowMs = Date.now();
          const t0 = nowMs - totalSpan - 120000;

          let currTime = t0;
          const isoOrderCreated = new Date(currTime).toISOString();
          const isoPaySuccess = new Date(currTime + 2000).toISOString();
          const isoInvoiceGen = new Date(currTime + 3000).toISOString();
          const isoNotifCreated = new Date(currTime + 4000).toISOString();

          itemsToProcess.forEach((item, index) => {
            const itemId = (itemsToProcess.length === 1 && customer.journeyCounter === 1)
              ? `ITEM-SIM-${sessionSuffixPay}-1`
              : `ITEM-SIM-${sessionSuffixPay}-${customer.journeyCounter > 1 ? customer.journeyCounter + '-' : ''}${index + 1}`;
            customer.activeOrderItemId = itemId;
            const itemSubtotal = item.quantity * item.unitPrice;

            const orderMetadata = {
              event_time: isoOrderCreated,
              order_id: orderId,
              order_item_id: itemId,
              product_id: item.productId,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              subtotal: itemSubtotal,
              payment_id: customer.activePaymentId,
              payment_method: customer.paymentMethod,
              cart_id: `CART-${customer.sessionId}`,
              discount_amount,
              coupon_discount,
              tax_amount,
              shipping_fee,
              delivery_fee,
              total_amount,
              order_value: total_amount,
              currency: 'INR',
              shipping_address: {
                address_id: 'ADDR-101',
                city: 'Bengaluru',
                state: 'Karnataka',
                country: 'IN'
              }
            };

            this.triggerEvent(customer, 'order_created', orderMetadata, 'SYSTEM', 'order_service');
          });

          // 2. Generate payment_success SECOND (so payment_success_at >= order_created_at)
          this.triggerEvent(customer, 'payment_success', { 
            event_time: isoPaySuccess,
            payment_id: customer.activePaymentId, 
            order_id: customer.activeOrderId,
            cart_id: `CART-${customer.sessionId}`,
            payment_method: customer.paymentMethod,
            attempt_id: attemptId,
            attempt_number: attemptNum,
            payment_status: 'success',
            amount: total_amount,
            currency: 'INR' 
          }, 'SYSTEM', 'payment_service');

          const invoiceId = `INV-SIM-${Math.floor(10000 + Math.random() * 90000)}`;
          this.triggerEvent(customer, 'invoice_generated', { 
            event_time: isoInvoiceGen,
            order_id: orderId, 
            payment_id: customer.activePaymentId,
            invoice_id: invoiceId,
            total_amount: total_amount,
            currency: 'INR' 
          }, 'SYSTEM', 'billing_service');

          const notifId = `NOTIF-SIM-${Math.floor(10000 + Math.random() * 90000)}`;
          this.triggerEvent(customer, 'notification_created', { 
            event_time: isoNotifCreated,
            order_id: orderId, 
            notification_id: notifId,
            type: 'ORDER_CONFIRMED',
            channel: 'EMAIL' 
          }, 'SYSTEM', 'notification_service');

          // Schedule downstream events with incremental wall-clock trigger times and multi-day ISO event times
          const tSimNow = Date.now();
          let trigStep = 300;

          currTime += gapConfirmed;
          this.pendingScheduledEvents.push({
            triggerTime: tSimNow + trigStep,
            eventTimeIso: new Date(currTime).toISOString(),
            customer,
            eventType: 'order_confirmed',
            metadata: { order_id: orderId, order_value: total_amount, currency: 'INR' },
            actorType: 'SYSTEM',
            eventSource: 'order_service'
          });

          if (customer.activeProductId && this.inventoryState[customer.activeProductId]) {
            this.inventoryState[customer.activeProductId].availableQuantity -= 1;
            this.inventoryState[customer.activeProductId].reservedQuantity += 1;
          }

          if (Math.random() < 0.05) {
            trigStep += 300;
            this.pendingScheduledEvents.push({
              triggerTime: tSimNow + trigStep,
              eventTimeIso: new Date(currTime + 60000).toISOString(),
              customer,
              eventType: 'order_cancelled',
              metadata: { order_id: orderId, reason: 'CUSTOMER_CANCELLED' },
              actorType: 'CUSTOMER',
              eventSource: 'website'
            }, {
              triggerTime: tSimNow + trigStep + 300,
              eventTimeIso: new Date(currTime + 120000).toISOString(),
              customer,
              eventType: 'inventory_released',
              metadata: { order_id: orderId },
              actorType: 'SYSTEM',
              eventSource: 'inventory_service'
            });
          } else {
            currTime += gapInv;
            trigStep += 300;
            this.pendingScheduledEvents.push({
              triggerTime: tSimNow + trigStep,
              eventTimeIso: new Date(currTime).toISOString(),
              customer,
              eventType: 'inventory_reserved',
              metadata: { order_id: orderId },
              actorType: 'SYSTEM',
              eventSource: 'inventory_service'
            });

            const shipmentId = `SHIP-SIM-${Math.floor(10000 + Math.random() * 90000)}`;

            currTime += gapShipCreated;
            trigStep += 300;
            this.pendingScheduledEvents.push({
              triggerTime: tSimNow + trigStep,
              eventTimeIso: new Date(currTime).toISOString(),
              customer,
              eventType: 'shipment_created',
              metadata: { order_id: orderId, shipment_id: shipmentId },
              actorType: 'SYSTEM',
              eventSource: 'fulfillment_service'
            });

            currTime += gapPacked;
            trigStep += 300;
            this.pendingScheduledEvents.push({
              triggerTime: tSimNow + trigStep,
              eventTimeIso: new Date(currTime).toISOString(),
              customer,
              eventType: 'order_packed',
              metadata: { order_id: orderId, shipment_id: shipmentId },
              actorType: 'SYSTEM',
              eventSource: 'fulfillment_service'
            });

            currTime += gapShipped;
            trigStep += 300;
            this.pendingScheduledEvents.push({
              triggerTime: tSimNow + trigStep,
              eventTimeIso: new Date(currTime).toISOString(),
              customer,
              eventType: 'order_shipped',
              metadata: { order_id: orderId, shipment_id: shipmentId },
              actorType: 'SYSTEM',
              eventSource: 'fulfillment_service'
            });

            currTime += gapInTransit;
            trigStep += 300;
            this.pendingScheduledEvents.push({
              triggerTime: tSimNow + trigStep,
              eventTimeIso: new Date(currTime).toISOString(),
              customer,
              eventType: 'in_transit',
              metadata: { order_id: orderId, shipment_id: shipmentId },
              actorType: 'SYSTEM',
              eventSource: 'fulfillment_service'
            });

            const isDeliveryFail = Math.random() < 0.10;
            if (isDeliveryFail) {
              currTime += gapOutForDeliv;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'out_for_delivery',
                metadata: { order_id: orderId, shipment_id: shipmentId, attempt_number: 1 },
                actorType: 'SYSTEM',
                eventSource: 'fulfillment_service'
              });

              currTime += 3600 * 1000 * 3;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'delivery_failed',
                metadata: { order_id: orderId, shipment_id: shipmentId, reason: 'CUSTOMER_UNAVAILABLE', attempt_number: 1 },
                actorType: 'SYSTEM',
                eventSource: 'fulfillment_service'
              });

              currTime += gapOutForDeliv;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'out_for_delivery',
                metadata: { order_id: orderId, shipment_id: shipmentId, attempt_number: 2 },
                actorType: 'SYSTEM',
                eventSource: 'fulfillment_service'
              });

              currTime += gapDelivered;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'delivered',
                metadata: { order_id: orderId, shipment_id: shipmentId, attempt_number: 2 },
                actorType: 'SYSTEM',
                eventSource: 'fulfillment_service'
              });
            } else {
              currTime += gapOutForDeliv;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'out_for_delivery',
                metadata: { order_id: orderId, shipment_id: shipmentId },
                actorType: 'SYSTEM',
                eventSource: 'fulfillment_service'
              });

              currTime += gapDelivered;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'delivered',
                metadata: { order_id: orderId, shipment_id: shipmentId },
                actorType: 'SYSTEM',
                eventSource: 'fulfillment_service'
              });
            }

            if (isReturn) {
              const returnId = `RET-SIM-${Math.floor(10000 + Math.random() * 90000)}`;
              const refundId = `REF-SIM-${Math.floor(10000 + Math.random() * 90000)}`;

              const returnReasons = ['SIZE_ISSUE', 'DAMAGED', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'DEFECTIVE', 'QUALITY_DISAPPOINTED'];
              const returnReason = returnReasons[Math.floor(Math.random() * returnReasons.length)];

              currTime += gapReturnReq;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'return_requested',
                metadata: { order_id: orderId, return_id: returnId, reason: returnReason },
                actorType: 'CUSTOMER',
                eventSource: 'website'
              });

              currTime += gapReturnApp;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'return_approved',
                metadata: { order_id: orderId, return_id: returnId },
                actorType: 'SYSTEM',
                eventSource: 'fulfillment_service'
              });

              currTime += gapReturnPickup;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'return_picked_up',
                metadata: { order_id: orderId, return_id: returnId },
                actorType: 'SYSTEM',
                eventSource: 'fulfillment_service'
              });

              currTime += gapReturnRecv;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'return_received',
                metadata: { order_id: orderId, return_id: returnId },
                actorType: 'SYSTEM',
                eventSource: 'fulfillment_service'
              });

              currTime += gapRefundInit;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'refund_initiated',
                metadata: { order_id: orderId, return_id: returnId, refund_id: refundId },
                actorType: 'SYSTEM',
                eventSource: 'payment_service'
              });

              currTime += gapRefundSucc;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime).toISOString(),
                customer,
                eventType: 'refund_success',
                metadata: { order_id: orderId, return_id: returnId, refund_id: refundId, amount: total_amount },
                actorType: 'SYSTEM',
                eventSource: 'payment_service'
              });
            } else if (Math.random() < 0.4) {
              const reviewId = `REV-SIM-${Math.floor(10000 + Math.random() * 90000)}`;
              trigStep += 300;
              this.pendingScheduledEvents.push({
                triggerTime: tSimNow + trigStep,
                eventTimeIso: new Date(currTime + 7200000).toISOString(),
                customer,
                eventType: 'review_added',
                metadata: { order_id: orderId, review_id: reviewId },
                actorType: 'CUSTOMER',
                eventSource: 'website'
              }, {
                triggerTime: tSimNow + trigStep + 300,
                eventTimeIso: new Date(currTime + 7260000).toISOString(),
                customer,
                eventType: 'rating_given',
                metadata: { order_id: orderId, review_id: reviewId, rating: 5 },
                actorType: 'CUSTOMER',
                eventSource: 'website'
              });
            }
          }

          customer.journeyCounter++;
          customer.currentState = 'COMPLETED';
          this.activeCustomers = this.activeCustomers.filter(c => c.sessionId !== customer.sessionId);
        }
        break;

      default:
        customer.currentState = 'BROWSING';
        this.triggerEvent(customer, 'page_view', {}, 'CUSTOMER', 'website');
        break;
    }
  }

  private async executeForcedEvent(customer: VirtualCustomer, eventType: string) {
    const ctx = customer.journeyContext || {};
    const metadata: any = { forced_test: true };
    let actorType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' = 'CUSTOMER';
    let eventSource = 'website';
    
    if (eventType.startsWith('admin_')) {
      actorType = 'ADMIN';
      eventSource = 'admin_portal';
    } else if (eventType === 'order_created') {
      actorType = 'SYSTEM';
      eventSource = 'order_service';
    } else if (eventType === 'invoice_generated') {
      actorType = 'SYSTEM';
      eventSource = 'billing_service';
    } else if (eventType === 'notification_created') {
      actorType = 'SYSTEM';
      eventSource = 'notification_service';
    } else if (eventType === 'shipment_created' || eventType === 'order_packed' || eventType === 'order_shipped' || eventType === 'in_transit' || eventType === 'out_for_delivery' || eventType === 'delivered') {
      actorType = 'SYSTEM';
      eventSource = 'fulfillment_service';
    } else if (eventType === 'inventory_reserved' || eventType === 'inventory_released') {
      actorType = 'SYSTEM';
      eventSource = 'inventory_service';
    } else if (eventType === 'payment_failed') {
      actorType = 'SYSTEM';
      eventSource = 'payment_service';
    } else if (eventType === 'payment_success') {
      actorType = 'SYSTEM';
      eventSource = 'payment_service';
    } else if (eventType === 'return_approved' || eventType === 'return_picked_up' || eventType === 'return_received') {
      actorType = 'SYSTEM';
      eventSource = 'fulfillment_service';
    } else if (eventType === 'refund_initiated' || eventType === 'refund_success' || eventType === 'refund_failed') {
      actorType = 'SYSTEM';
      eventSource = 'payment_service';
    }

    if (eventType === 'delivery_option_selected') {
      metadata.delivery_option = 'EXPRESS';
      metadata.delivery_fee = 100.00;
    }
    if (eventType === 'payment_method_selected') {
      customer.paymentMethod = 'upi';
      metadata.payment_method = customer.paymentMethod;
      metadata.method = customer.paymentMethod;
    }
    if (['payment_initiated', 'payment_failed', 'payment_retry', 'payment_success', 'order_created'].includes(eventType)) {
      if (!customer.paymentMethod) customer.paymentMethod = 'upi';
      metadata.payment_method = customer.paymentMethod.toLowerCase();
      if (!metadata.currency) metadata.currency = 'INR';
    }

    if (ctx.orderId) metadata.order_id = ctx.orderId;
    if (ctx.orderItemId || customer.activeOrderItemId) metadata.order_item_id = ctx.orderItemId || customer.activeOrderItemId;
    if (ctx.paymentId) metadata.payment_id = ctx.paymentId;
    if (ctx.shipmentId) metadata.shipment_id = ctx.shipmentId;
    if (ctx.returnId) metadata.return_id = ctx.returnId;
    if (ctx.refundId) metadata.refund_id = ctx.refundId;
    if (ctx.reviewId) metadata.review_id = ctx.reviewId;
    if (ctx.productId) metadata.product_id = ctx.productId;
    if (ctx.cartId) metadata.cart_id = ctx.cartId;

    if (eventType === 'order_created') {
      const prod = (customer.activeProductId ? this.getProductDetails(customer.activeProductId) : null) || (ctx.productId ? this.getProductDetails(ctx.productId) : null) || this.selectProductFromCatalog();
      const quantity = 1;
      const unit_price = prod.price;
      const subtotal = quantity * unit_price;
      metadata.order_item_id = customer.activeOrderItemId || `ITEM-SIM-${customer.sessionId}`;
      metadata.product_id = prod.product_id;
      metadata.quantity = quantity;
      metadata.unit_price = unit_price;
      metadata.subtotal = subtotal;
      metadata.currency = 'INR';
      metadata.total_amount = subtotal + 100.00;
      (customer as any).lastOrderTotal = metadata.total_amount;
    }

    if (['payment_success', 'payment_failed', 'payment_retry'].includes(eventType)) {
      if (!metadata.amount) metadata.amount = (customer as any).lastOrderTotal || 2600.00;
      if (eventType === 'payment_failed') metadata.payment_status = 'failed';
      if (eventType === 'payment_retry') metadata.payment_status = 'retry';
      if (eventType === 'payment_success') metadata.payment_status = 'success';
    }

    this.triggerEvent(customer, eventType, metadata, actorType, eventSource);
    customer.currentState = `FORCED_${eventType}`;
  }

  public async runCoverageTest() {
    this.resetStats();
    console.log('[Simulator] Initiating Event Coverage Test Mode...');

    const journeys = [
      {
        userType: 'registered' as const,
        steps: [
          'session_started', 'login', 'page_view', 'category_view', 'search', 'search_result_clicked', 'filter_applied',
          'product_view', 'product_image_view', 'product_details_view', 'product_impression', 'cart_item_added',
          'checkout_started', 'address_selected', 'delivery_option_selected', 'payment_method_selected',
          'payment_initiated', 'order_created', 'payment_success', 'invoice_generated', 'notification_created', 'order_confirmed', 'order_status_updated',
          'inventory_reserved', 'shipment_created', 'order_packed', 'order_shipped',
          'in_transit', 'out_for_delivery', 'delivered', 'logout'
        ]
      },
      {
        userType: 'registered' as const,
        steps: [
          'session_started', 'login', 'cart_item_added', 'checkout_started',
          'payment_initiated', 'payment_failed', 'payment_retry', 'order_created', 'payment_success', 'invoice_generated', 'notification_created'
        ]
      },
      {
        userType: 'guest' as const,
        steps: [
          'session_started', 'page_view', 'search', 'product_view', 'cart_item_added', 'cart_update', 'cart_item_removed',
          'checkout_started', 'checkout_abandoned', 'session_ended'
        ]
      },
      {
        userType: 'registered' as const,
        steps: [
          'session_started', 'login', 'cart_item_added', 'checkout_started', 'payment_initiated', 'order_created', 'payment_success', 'shipment_created', 'delivered', 'return_requested', 'return_approved',
          'return_picked_up', 'return_received', 'refund_initiated', 'refund_success'
        ]
      },
      {
        userType: 'registered' as const,
        steps: [
          'session_started', 'login', 'cart_item_added', 'checkout_started', 'payment_initiated', 'order_created', 'payment_success', 'shipment_created', 'delivered', 'return_requested', 'return_rejected',
          'return_received', 'refund_initiated', 'refund_failed'
        ]
      },
      {
        userType: 'registered' as const,
        steps: ['session_started', 'login', 'cart_item_added', 'checkout_started', 'payment_initiated', 'order_created', 'payment_success', 'shipment_created', 'delivered', 'review_added', 'rating_given']
      },
      {
        userType: 'registered' as const,
        steps: ['session_started', 'login', 'product_view', 'wishlist_add', 'wishlist_remove']
      },
      {
        userType: 'registered' as const,
        steps: ['session_started', 'login', 'coupon_viewed', 'coupon_applied', 'coupon_removed', 'coupon_rejected']
      },
      {
        userType: 'admin' as const,
        steps: ['admin_login', 'admin_dashboard_viewed']
      },
      {
        userType: 'registered' as const,
        steps: [
          'session_started', 'login', 'profile_viewed', 'profile_updated',
          'address_added', 'address_updated', 'address_deleted'
        ]
      },
      {
        userType: 'registered' as const,
        steps: [
          'session_started', 'login', 'cart_item_added', 'checkout_started', 'payment_initiated', 'order_created', 'payment_success', 'order_cancelled', 'inventory_released', 'delivery_failed'
        ]
      }
    ];

    let journeyCounter = 1;
    for (const journey of journeys) {
      const customer = this.spawnVirtualCustomer(journey.userType === 'registered' ? 1.0 : 0.0);
      if (journey.userType === 'admin') {
        customer.userType = 'admin';
        customer.customerId = null;
      }

      const sessionSuffix = customer.sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
      const sampleProd = this.selectProductFromCatalog();

      customer.journeyContext = {
        orderId: `ORD-SIM-COV-${sessionSuffix}-${journeyCounter}`,
        orderItemId: `ITEM-SIM-COV-${sessionSuffix}-${journeyCounter}`,
        paymentId: `PAY-SIM-COV-${sessionSuffix}-${journeyCounter}`,
        shipmentId: `SHIP-SIM-COV-${sessionSuffix}-${journeyCounter}`,
        returnId: `RET-SIM-COV-${sessionSuffix}-${journeyCounter}`,
        refundId: `REF-SIM-COV-${sessionSuffix}-${journeyCounter}`,
        reviewId: `REV-SIM-COV-${sessionSuffix}-${journeyCounter}`,
        productId: sampleProd.product_id,
        cartId: `CART-${customer.sessionId}`
      };

      customer.activeOrderId = customer.journeyContext.orderId;
      customer.activeOrderItemId = customer.journeyContext.orderItemId;
      customer.activePaymentId = customer.journeyContext.paymentId;
      customer.activeShipmentId = customer.journeyContext.shipmentId;
      customer.activeReturnId = customer.journeyContext.returnId;
      customer.activeRefundId = customer.journeyContext.refundId;
      customer.activeReviewId = customer.journeyContext.reviewId;
      customer.activeProductId = customer.journeyContext.productId;

      customer.forcedSteps = journey.steps;
      customer.currentStepIndex = 0;

      while (customer.currentStepIndex !== undefined && customer.currentStepIndex < customer.forcedSteps.length) {
        const eventType = customer.forcedSteps[customer.currentStepIndex];
        await this.executeForcedEvent(customer, eventType);
        customer.currentStepIndex++;
      }
      journeyCounter++;
    }

    console.log('[Simulator] Event Coverage Test Mode finished successfully.');
  }
}

export const simulatorService = new SimulatorService();
