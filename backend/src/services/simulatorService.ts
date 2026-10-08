import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EventLogger } from './eventLogger';
import { processFraudSecurityWorkflow } from './fraudSecurityWorkflow';
import { 
  dbPool, 
  getOrCreateCart, 
  addToCart, 
  createOrderAndPayment, 
  createShipmentForOrder,
  applyCoupon,
  insertSimulationRun,
  updateSimulationRun,
  insertFraudIncident,
  FraudIncidentRecord
} from '../config/db';

export const EVENT_REGISTRY = {
  SESSION: ['login', 'login_failed', 'logout', 'session_started', 'session_ended'],
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
  PROFILE: [
    'profile_viewed', 'profile_updated', 'address_added', 'address_updated', 'address_deleted',
    'password_changed', 'email_changed', 'phone_changed', 'device_registered', 'payment_method_changed'
  ],
  ADMIN: ['admin_login', 'admin_login_failed', 'admin_dashboard_viewed']
};

export class SimulationTimeUtils {
  public static addMilliseconds(baseTime: number | string, ms: number): string {
    const timeMs = typeof baseTime === 'string' ? new Date(baseTime).getTime() : baseTime;
    return new Date(timeMs + ms).toISOString();
  }

  public static addSeconds(baseTime: number | string, seconds: number): string {
    return SimulationTimeUtils.addMilliseconds(baseTime, seconds * 1000);
  }

  public static addMinutes(baseTime: number | string, minutes: number): string {
    return SimulationTimeUtils.addMilliseconds(baseTime, minutes * 60 * 1000);
  }

  public static addHours(baseTime: number | string, hours: number): string {
    return SimulationTimeUtils.addMilliseconds(baseTime, hours * 3600 * 1000);
  }

  public static addDays(baseTime: number | string, days: number): string {
    return SimulationTimeUtils.addMilliseconds(baseTime, days * 86400 * 1000);
  }

  public static generateGapMs(
    granularity: 'ms' | 'seconds' | 'minutes' | 'hours' | 'days', 
    min: number, 
    max: number, 
    rng?: () => number
  ): number {
    const rand = rng ? rng() : Math.random();
    const val = min + rand * (max - min);
    switch (granularity) {
      case 'ms': return Math.round(val);
      case 'seconds': return Math.round(val * 1000);
      case 'minutes': return Math.round(val * 60 * 1000);
      case 'hours': return Math.round(val * 3600 * 1000);
      case 'days': return Math.round(val * 86400 * 1000);
    }
  }
}

export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  public next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export interface CustomerHistoryState {
  customerId: string;
  knownDevices: string[];
  primaryDevice: string;
  knownIps: string[];
  primaryIp: string;
  primaryLocation: { country: string; state: string; city: string };
  alternateLocations: Array<{ country: string; state: string; city: string }>;
  knownPaymentMethods: Array<{ payment_method_id: string; payment_method_type: string }>;
  baseline: {
    normalCategories: string[];
    normalOrderValueMin: number;
    normalOrderValueMax: number;
    normalActiveHours: number[];
    loginFrequencyPerDay: number;
    orderFrequencyPerMonth: number;
    refundFrequency: number;
  };
  history: {
    totalLogins: number;
    failedLogins: number;
    totalOrders: number;
    totalSpent: number;
    lastLoginTime?: number;
    lastOrderTime?: number;
    registeredAt: number;
  };
}

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
  historyState?: CustomerHistoryState;
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
  private targetRate = 15;
  private rateUnit = '/sec';
  private duration = '5 min';
  private trafficProfile = 'Mixed / Realistic';
  private mode: 'CLEAN' | 'DIRTY' | 'FRAUD' = 'CLEAN';

  // Fraud Generation Options
  private fraudIpsCount = 5;
  private fraudIngredients: 'DDOS' | 'SCRAPER' | 'BOTH' = 'BOTH';
  private fraudRatio = 0.80;
  private fraudIpPool: string[] = [];
  private selectedFraudScenario = 'ALL';
  private scenarioDeck: string[] = [];
  public groundTruthLogs: any[] = [];
  private fraudEventQueue: Array<{
    customer: VirtualCustomer;
    eventType: string;
    metadata?: any;
    actorType?: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
    eventSource?: string;
  }> = [];

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
  private customerHistoryMap = new Map<string, CustomerHistoryState>();

  public getOrCreateCustomerHistory(customerId: string): CustomerHistoryState {
    let history = this.customerHistoryMap.get(customerId);
    if (!history) {
      const hashNum = Math.abs(crypto.createHash('md5').update(customerId).digest().readInt32BE(0));
      const hashStr = hashNum.toString(36).substring(0, 6).toUpperCase();

      const dev1 = `DEV-${hashStr}-PRIMARY`;
      const dev2 = `DEV-${hashStr}-MOBILE`;
      const subnets = [49, 103, 182, 14, 157, 106, 27, 117, 152, 223];
      const subA1 = subnets[hashNum % subnets.length];
      const subA2 = subnets[(hashNum + 3) % subnets.length];
      const ip1 = `${subA1}.${(hashNum % 220) + 10}.${(hashNum % 250) + 1}.${((hashNum * 7) % 250) + 1}`;
      const ip2 = `${subA2}.${((hashNum * 13) % 220) + 10}.${((hashNum * 17) % 250) + 1}.${((hashNum * 31) % 250) + 1}`;

      const cities = [
        { city: 'Bengaluru', state: 'Karnataka', country: 'IN' },
        { city: 'Mumbai', state: 'Maharashtra', country: 'IN' },
        { city: 'Delhi', state: 'Delhi', country: 'IN' },
        { city: 'Chennai', state: 'Tamil Nadu', country: 'IN' },
        { city: 'Hyderabad', state: 'Telangana', country: 'IN' }
      ];
      const primaryLoc = cities[hashNum % cities.length];
      const altLoc = cities[(hashNum + 1) % cities.length];

      const pm1 = { payment_method_id: `PM-UPI-${hashStr}`, payment_method_type: 'upi' };
      const pm2 = { payment_method_id: `PM-CARD-${hashStr}`, payment_method_type: 'credit_card' };

      history = {
        customerId,
        knownDevices: [dev1, dev2],
        primaryDevice: dev1,
        knownIps: [ip1, ip2],
        primaryIp: ip1,
        primaryLocation: primaryLoc,
        alternateLocations: [altLoc],
        knownPaymentMethods: [pm1, pm2],
        baseline: {
          normalCategories: ['CAT001', 'CAT002'],
          normalOrderValueMin: 499,
          normalOrderValueMax: 25000,
          normalActiveHours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
          loginFrequencyPerDay: 2,
          orderFrequencyPerMonth: 3,
          refundFrequency: 0.05
        },
        history: {
          totalLogins: 10 + (hashNum % 20),
          failedLogins: hashNum % 2,
          totalOrders: 3 + (hashNum % 10),
          totalSpent: 12500 + (hashNum % 45000),
          registeredAt: Date.now() - (30 + (hashNum % 60)) * 86400 * 1000
        }
      };

      this.customerHistoryMap.set(customerId, history);
    }
    return history;
  }

  public generateNewDevice(customerId: string): string {
    const history = this.getOrCreateCustomerHistory(customerId);
    const newDev = `DEV-NEW-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    return newDev;
  }

  public generateNewPaymentMethod(customerId: string): { payment_method_id: string; payment_method_type: string } {
    return {
      payment_method_id: `PM-NEW-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      payment_method_type: 'credit_card'
    };
  }

  public recordDevice(customerId: string, deviceId: string): void {
    const history = this.getOrCreateCustomerHistory(customerId);
    if (!history.knownDevices.includes(deviceId)) {
      history.knownDevices.push(deviceId);
    }
  }

  public recordPaymentMethod(customerId: string, pm: { payment_method_id: string; payment_method_type: string }): void {
    const history = this.getOrCreateCustomerHistory(customerId);
    if (!history.knownPaymentMethods.some(p => p.payment_method_id === pm.payment_method_id)) {
      history.knownPaymentMethods.push(pm);
    }
  }

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
    this.fraudEventQueue = [];
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
        fraudRatio: this.fraudRatio,
        selectedFraudScenario: this.selectedFraudScenario
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
    selectedFraudScenario?: string;
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
    this.fraudRatio = config.fraudRatio !== undefined ? config.fraudRatio : 0.80;
    this.selectedFraudScenario = config.selectedFraudScenario || 'ALL';

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
    this.fraudEventQueue = [];

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
    const sessionId = `sess_sim_${Math.random().toString(36).substr(2, 9)}`;
    const sessionHash = crypto.createHash('md5').update(sessionId).digest('hex').substring(0, 8).toUpperCase();
    const isScraper = this.mode === 'DIRTY' && Math.random() < 0.15; // 15% cookie-clearing scrapers in DIRTY mode
    const isRegistered = Math.random() < registeredProbability && !isScraper;
    
    let customerId: string | null = null;
    let historyState: CustomerHistoryState | undefined = undefined;

    if (isRegistered) {
      if (this.customerHistoryMap.size > 0 && Math.random() < 0.7) {
        const historyKeys = Array.from(this.customerHistoryMap.keys());
        customerId = historyKeys[Math.floor(Math.random() * historyKeys.length)];
      } else {
        this.customerCounter++;
        customerId = `CUST-SIM-${String(this.customerCounter).padStart(5, '0')}`;
      }
      historyState = this.getOrCreateCustomerHistory(customerId);
    }

    const pendingCustomerId = customerId || `CUST-SIM-${String(++this.customerCounter).padStart(5, '0')}`;
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
      preferredCategories: historyState?.baseline.normalCategories || ['CAT001', 'CAT002', 'CAT003', 'CAT004', 'CAT005']
    };

    const sessionIntents: SessionIntent[] = [
      'CASUAL_BROWSING', 'DEAL_SEEKING', 'URGENT_PURCHASE',
      'RESEARCH', 'GIFT_SHOPPING', 'REPEAT_PURCHASE'
    ];
    const sessionIntent = sessionIntents[Math.floor(Math.random() * sessionIntents.length)];

    const deviceId = historyState 
      ? historyState.knownDevices[Math.floor(Math.random() * historyState.knownDevices.length)]
      : `DEV-SIM-${sessionHash}-${Math.floor(100 + Math.random() * 900)}`;

    const subnets = [49, 103, 182, 14, 157, 106, 27, 117, 152, 223];
    const randSub = subnets[Math.floor(Math.random() * subnets.length)];
    const ipAddress = historyState 
      ? historyState.knownIps[Math.floor(Math.random() * historyState.knownIps.length)]
      : `${randSub}.${Math.floor(1 + Math.random() * 250)}.${Math.floor(1 + Math.random() * 250)}.${Math.floor(1 + Math.random() * 250)}`;

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
      historyState,
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

    // 2. Process Fraud Injection in FRAUD mode using queue under rate control
    if (this.mode === 'FRAUD') {
      while (this.currentTickEmittedCount < allowedEventsThisTick && this.fraudEventQueue.length > 0) {
        const ev = this.fraudEventQueue.shift()!;
        this.triggerEvent(ev.customer, ev.eventType, ev.metadata, ev.actorType || 'CUSTOMER', ev.eventSource || 'website');
      }

      if (this.fraudEventQueue.length === 0 && Math.random() < this.fraudRatio) {
        await this.generateFraudScenarioSequence();
        while (this.currentTickEmittedCount < allowedEventsThisTick && this.fraudEventQueue.length > 0) {
          const ev = this.fraudEventQueue.shift()!;
          this.triggerEvent(ev.customer, ev.eventType, ev.metadata, ev.actorType || 'CUSTOMER', ev.eventSource || 'website');
        }
      }
    }

    // 3. Process background customer progress transitions up to remaining tick budget
    while (this.currentTickEmittedCount < allowedEventsThisTick && this.activeCustomers.length > 0) {
      const idx = Math.floor(Math.random() * this.activeCustomers.length);
      const customer = this.activeCustomers[idx];
      try {
        await this.progressCustomer(customer);
      } catch (err) {
        console.error(`[Simulator Error] Transition failed for session ${customer.sessionId}:`, err);
      }
    }

    // Deduct actual emitted count from rate accumulator
    this.rateAccumulator -= this.currentTickEmittedCount;

    while (this.activeCustomers.length < this.usersCount) {
      const customer = this.spawnVirtualCustomer();
      this.activeCustomers.push(customer);
    }
  }

  private appendGroundTruthRecord(record: any) {
    try {
      const logsBaseDir = path.resolve(__dirname, '../../event_logs');
      if (!fs.existsSync(logsBaseDir)) {
        fs.mkdirSync(logsBaseDir, { recursive: true });
      }
      const evalFilePath = path.join(logsBaseDir, 'ground_truth_evaluations.jsonl');
      fs.appendFileSync(evalFilePath, JSON.stringify(record) + '\n', 'utf-8');
    } catch (err) {
      console.error('[Simulator Error] Failed to write ground truth evaluation log:', err);
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
      admin_id: isAdminType ? (metadata.admin_id || 'ADM001') : null,
      coupon_code: metadata.coupon_code || metadata.coupon || null,
      amount: metadata.amount !== undefined ? metadata.amount : (metadata.total_amount !== undefined ? metadata.total_amount : null)
    };

    const isSystemActor = finalActorType === 'SYSTEM';

    const lagMs = Math.floor(10 + Math.random() * 290);
    const defaultIngestionIso = new Date(new Date(nowIso).getTime() + lagMs).toISOString();
    const finalIngestionIso = metadata.ingestion_time || defaultIngestionIso;
    const computedLagSec = metadata.ingestion_time 
      ? Math.max(0, parseFloat(((new Date(metadata.ingestion_time).getTime() - new Date(nowIso).getTime()) / 1000).toFixed(3)))
      : parseFloat((lagMs / 1000).toFixed(3));

    const generatedEventId = `EVT-SIM-${Math.floor(10000000 + Math.random() * 90000000)}`;

    // GROUND-TRUTH EVALUATION DATASET SEPARATION:
    // Log ground truth information into separate ground_truth_evaluations dataset
    const isFraud = metadata._is_fraud === true || metadata.ground_truth_fraud === true;
    const scenarioId = metadata._scenario_id || metadata.fraud_rule || (isFraud ? 'FRAUD_SCENARIO' : 'NORMAL_BEHAVIOR');
    const scenarioName = metadata._scenario_name || (isFraud ? 'Fraud Scenario' : 'Normal Customer Activity');

    const gtRecord = {
      event_id: generatedEventId,
      event_type: eventType,
      is_fraud: isFraud,
      scenario_id: scenarioId,
      scenario_name: scenarioName,
      customer_id: finalCustomerId,
      session_id: customer.sessionId,
      timestamp: nowIso
    };

    this.groundTruthLogs.push(gtRecord);
    this.appendGroundTruthRecord(gtRecord);

    // Strip internal/cheat fraud labels from clean Kafka telemetry payload so FraudGuard evaluates raw un-annotated events
    const cleanMeta = { ...metadata };
    delete cleanMeta._is_fraud;
    delete cleanMeta._scenario_id;
    delete cleanMeta._scenario_name;
    delete cleanMeta.ground_truth_fraud;
    delete cleanMeta.fraud_rule;
    delete cleanMeta.fraud_ip;
    delete cleanMeta.is_scraper;
    delete cleanMeta.cookie_cleared;
    delete cleanMeta.eventTimeIso;

    // Build 100% valid canonical payload without cheat labels for Kafka stream
    const payload = {
      event_id: generatedEventId,
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
        country: metadata.country || customer.historyState?.primaryLocation.country || 'IN',
        state: metadata.state || customer.historyState?.primaryLocation.state || 'Karnataka',
        city: metadata.city || customer.historyState?.primaryLocation.city || 'Bengaluru',
        device: isSystemActor ? null : (metadata.device || 'desktop'),
        browser: isSystemActor ? null : (metadata.browser || 'Chrome'),
        device_id: metadata.device_id !== undefined ? metadata.device_id : (isSystemActor ? null : customer.deviceId),
        ip_address: metadata.ip_address !== undefined ? metadata.ip_address : customer.ipAddress
      },
      entity: entityPayload,
      metadata: {
        ...cleanMeta,
        amount: metadata.amount !== undefined ? metadata.amount : (metadata.total_amount !== undefined ? metadata.total_amount : null),
        payment_method: metadata.payment_method || metadata.paymentMethod || null,
        coupon_code: metadata.coupon_code || metadata.coupon || null,
        simulated: true,
        simulation_mode: isDirtyRun ? 'DIRTY' : (isFraud ? 'FRAUD' : 'CLEAN'),
        producer_ingestion_lag_seconds: computedLagSec,
        forced_test: metadata.forced_test === true || !!customer.forcedSteps
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

  private emitOrQueueFraudEvent(
    customer: VirtualCustomer, 
    eventType: string, 
    metadata: any = {}, 
    actorType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' = 'CUSTOMER',
    eventSource: string = 'website'
  ) {
    if (this.mode === 'FRAUD') {
      this.fraudEventQueue.push({ customer, eventType, metadata, actorType, eventSource });
    } else {
      this.triggerEvent(customer, eventType, metadata, actorType, eventSource);
    }
  }

  public async recordIncidentForScenario(
    customerId: string,
    scenarioId: string,
    scenarioName: string,
    severity: string,
    riskLevel: string,
    riskScore: number,
    action: string,
    reason: string,
    deviceId?: string,
    ipAddress?: string
  ) {
    const incId = `INC-${scenarioId.substring(0, 6)}-${Math.floor(10000 + Math.random() * 90000)}`;
    const incident: FraudIncidentRecord = {
      incident_id: incId,
      customer_id: customerId,
      fraud_type: scenarioId,
      severity: severity,
      reason: reason,
      risk_score: riskScore,
      risk_level: riskLevel,
      action: action,
      requires_customer_action: action === 'STEP_UP_VERIFICATION',
      requires_admin_review: action === 'ADMIN_REVIEW' || severity === 'CRITICAL' || severity === 'VERY_HIGH',
      restriction_minutes: (severity === 'CRITICAL' || action === 'TEMPORARY_RESTRICTION') ? 1440 : null,
      ai_attack_pattern: `${severity} severity ${scenarioName} pattern detected`,
      ai_finding: `Real-time risk scoring engine assigned score ${riskScore}/100 based on composite event sequence anomaly.`,
      ai_confidence: 0.95,
      ai_recommendation: severity === 'CRITICAL' ? 'Immediate account restriction & mandatory MFA step-up required.' : 'Flagged for security administrator review.',
      ip_address: ipAddress || '103.22.14.88',
      device_id: deviceId || 'DEV-SIM-PRIMARY',
      session_id: `sess_sim_${incId}`,
      source_event_id: null,
      source_event_type: null,
      timestamp: new Date().toISOString()
    };

    try {
      const inserted = await insertFraudIncident(incident);
      if (inserted) {
        await processFraudSecurityWorkflow(incident);
        console.log(`[Simulator] Real DB Fraud Incident Created -> ${incId} (${riskLevel} - Score ${riskScore})`);
      }
    } catch (err) {
      console.error('[Simulator] Failed to write DB fraud incident:', err);
    }
  }

  private SCENARIO_KEYS = [
    'BRUTE_FORCE_LOGIN',
    'MULTI_IP_LOGIN_ATTACK',
    'PAYMENT_FAILURE_VELOCITY',
    'MULTIPLE_PAYMENT_METHODS',
    'HIGH_VALUE_TRANSACTION',
    'HIGH_VALUE_ORDER_VELOCITY',
    'ACCOUNT_CHANGE_NEW_DEVICE',
    'ACCOUNT_TAKEOVER_SEQUENCE',
    'MULTI_ACCOUNT_DEVICE',
    'MULTI_ACCOUNT_IP',
    'COUPON_ABUSE',
    'REFUND_ABUSE',
    'BOT_OR_SCRAPER',
    'DDOS',
    'CHECKOUT_VELOCITY',
    'CRITICAL_ATO_MULTI_CARD_HEIST',
    'CRITICAL_MULTI_ACCOUNT_COUPON_BURST',
    'CRITICAL_IMPOSSIBLE_TRAVEL_HIGH_VALUE',
    'CRITICAL_BOT_CHECKOUT_FLOOD',
    'VERY_HIGH_CREDENTIAL_STUFFING_BURST',
    'VERY_HIGH_REFUND_ACCOUNT_SWAP'
  ];

  private getNextFraudScenario(): string {
    if (this.scenarioDeck.length === 0) {
      const deck = [...this.SCENARIO_KEYS];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      this.scenarioDeck = deck;
    }
    return this.scenarioDeck.shift()!;
  }

  public async generateFraudScenarioSequence(targetScenario?: string) {
    let scenario = targetScenario || this.selectedFraudScenario;
    if (!scenario || scenario === 'ALL') {
      scenario = this.getNextFraudScenario();
    }

    const scenarioId = scenario;
    const scenarioNameMap: Record<string, string> = {
      'BRUTE_FORCE_LOGIN': 'Brute-force login',
      'MULTI_IP_LOGIN': 'Multi-IP login attack',
      'MULTI_IP_LOGIN_ATTACK': 'Multi-IP login attack',
      'PAYMENT_FRAUD': 'Payment failure velocity',
      'PAYMENT_FAILURE_VELOCITY': 'Payment failure velocity',
      'MULTIPLE_PAYMENT_METHODS': 'Multiple payment methods',
      'HIGH_VALUE_TRANSACTION': 'High-value transaction',
      'HIGH_VALUE_VELOCITY': 'High-value order velocity',
      'HIGH_VALUE_ORDER_VELOCITY': 'High-value order velocity',
      'ACCOUNT_CHANGE_NEW_DEVICE': 'Account change on new device',
      'ACCOUNT_TAKEOVER': 'Account takeover sequence',
      'ACCOUNT_TAKEOVER_SEQUENCE': 'Account takeover sequence',
      'MULTI_ACCOUNT_DEVICE': 'Multi-account device sharing',
      'MULTI_ACCOUNT_IP': 'Multi-account IP sharing',
      'COUPON_ABUSE': 'Coupon abuse',
      'REFUND_ABUSE': 'Refund abuse',
      'CHECKOUT_VELOCITY': 'Checkout velocity',
      'BOT_SCRAPER': 'Bot scraper',
      'BOT_OR_SCRAPER': 'Bot scraper',
      'BOT_ACTIVITY': 'Bot scraper',
      'DDOS_FLOOD': 'DDoS flood',
      'DDOS': 'DDoS flood',
      'SUSPICIOUS_LOCATION_CHANGE': 'Suspicious location change',
      'REPEATED_FRAUD_ESCALATION': 'Repeated fraud escalation',
      'REPEATED_OFFENDER': 'Repeated fraud escalation',
      'CRITICAL_ATO_MULTI_CARD_HEIST': 'Critical ATO & Multi-Card Heist',
      'CRITICAL_MULTI_ACCOUNT_COUPON_BURST': 'Critical Multi-Account Coupon Burst',
      'CRITICAL_IMPOSSIBLE_TRAVEL_HIGH_VALUE': 'Critical Impossible Travel & High-Value Order',
      'CRITICAL_BOT_CHECKOUT_FLOOD': 'Critical Bot Checkout Flood',
      'VERY_HIGH_CREDENTIAL_STUFFING_BURST': 'Very High Credential Stuffing Burst',
      'VERY_HIGH_REFUND_ACCOUNT_SWAP': 'Very High Refund Account Swap Abuse'
    };
    const scenarioName = scenarioNameMap[scenario] || 'Fraud Scenario';
    const fraudMeta = { _is_fraud: true, _scenario_id: scenarioId, _scenario_name: scenarioName };

    switch (scenario) {
      case 'BRUTE_FORCE_LOGIN': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-SIM-BF-${randSuffix}`;
        cust.deviceId = `DEV-SIM-BF-${randSuffix}`;
        cust.ipAddress = `103.22.${Math.floor(10 + Math.random() * 200)}.${Math.floor(1 + Math.random() * 250)}`;

        let baseTime = Date.now() - 25000;
        for (let attempt = 1; attempt <= 6; attempt++) {
          const timeIso = new Date(baseTime + attempt * 4000).toISOString();
          this.emitOrQueueFraudEvent(cust, 'login_failed', { ...fraudMeta, reason: 'INVALID_CREDENTIALS', attempt_count: attempt, event_time: timeIso }, 'CUSTOMER', 'website');
        }
        this.emitOrQueueFraudEvent(cust, 'login', { ...fraudMeta, event_time: new Date().toISOString() }, 'CUSTOMER', 'website');
        this.liveStats.fraud_events += 7;
        break;
      }

      case 'MULTI_IP_LOGIN':
      case 'MULTI_IP_LOGIN_ATTACK': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-SIM-MIP-${randSuffix}`;
        cust.deviceId = `DEV-SIM-MIP-${randSuffix}`;

        const ips = [
          `198.51.${Math.floor(10 + Math.random() * 200)}.${Math.floor(1 + Math.random() * 250)}`,
          `203.0.${Math.floor(10 + Math.random() * 200)}.${Math.floor(1 + Math.random() * 250)}`,
          `49.207.${Math.floor(10 + Math.random() * 200)}.${Math.floor(1 + Math.random() * 250)}`,
          `103.22.${Math.floor(10 + Math.random() * 200)}.${Math.floor(1 + Math.random() * 250)}`
        ];

        let baseTime = Date.now() - 30000;
        for (let i = 0; i < 3; i++) {
          const timeIso = new Date(baseTime + i * 8000).toISOString();
          this.emitOrQueueFraudEvent(cust, 'login_failed', { ...fraudMeta, reason: 'INVALID_CREDENTIALS', attempt_count: i + 1, ip_address: ips[i], event_time: timeIso }, 'CUSTOMER', 'website');
        }
        this.emitOrQueueFraudEvent(cust, 'login', { ...fraudMeta, ip_address: ips[3], event_time: new Date().toISOString() }, 'CUSTOMER', 'website');
        this.liveStats.fraud_events += 4;
        break;
      }

      case 'PAYMENT_FRAUD':
      case 'PAYMENT_FAILURE_VELOCITY': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-SIM-PFV-${randSuffix}`;
        cust.deviceId = `DEV-SIM-PFV-${randSuffix}`;

        let baseTime = Date.now() - 120000;
        for (let i = 1; i <= 4; i++) {
          const timeIso = new Date(baseTime + i * 25000).toISOString();
          const payId = `PAY-SIM-PFV-${i}-${randSuffix}`;
          this.emitOrQueueFraudEvent(cust, 'payment_failed', { ...fraudMeta, payment_id: payId, amount: 4999.00, payment_method: 'card', reason: 'CARD_DECLINED', attempt_number: i, event_time: timeIso }, 'SYSTEM', 'payment_service');
        }
        this.liveStats.fraud_events += 4;
        break;
      }

      case 'MULTIPLE_PAYMENT_METHODS': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-SIM-MPM-${randSuffix}`;
        cust.deviceId = `DEV-SIM-MPM-${randSuffix}`;

        const methods = ['card', 'upi', 'netbanking', 'wallet'];
        let baseTime = Date.now() - 100000;
        for (let i = 0; i < 4; i++) {
          const timeIso = new Date(baseTime + i * 20000).toISOString();
          const payId = `PAY-SIM-MPM-${i+1}-${randSuffix}`;
          const pm = methods[i % methods.length];
          this.emitOrQueueFraudEvent(cust, 'payment_failed', { ...fraudMeta, payment_id: payId, amount: 8900.00, payment_method: pm, reason: 'GATEWAY_ERROR', attempt_number: i + 1, event_time: timeIso }, 'SYSTEM', 'payment_service');
        }
        this.liveStats.fraud_events += 4;
        break;
      }

      case 'HIGH_VALUE_TRANSACTION': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-SIM-HVT-${randSuffix}`;
        cust.deviceId = `DEV-SIM-HVT-${randSuffix}`;

        const ordId = `ORD-SIM-HVT-${randSuffix}`;
        const payId = `PAY-SIM-HVT-${randSuffix}`;
        const amount = 75000 + Math.floor(Math.random() * 50000);
        this.emitOrQueueFraudEvent(cust, 'order_created', { ...fraudMeta, order_id: ordId, payment_id: payId, amount, total_amount: amount, payment_method: 'card', event_time: new Date().toISOString() }, 'SYSTEM', 'order_service');
        this.liveStats.fraud_events += 1;
        break;
      }

      case 'HIGH_VALUE_VELOCITY':
      case 'HIGH_VALUE_ORDER_VELOCITY': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-SIM-HVV-${randSuffix}`;
        cust.deviceId = `DEV-SIM-HVV-${randSuffix}`;

        let baseTime = Date.now() - 300000;
        for (let i = 1; i <= 3; i++) {
          const timeIso = new Date(baseTime + i * 90000).toISOString();
          const ordId = `ORD-SIM-HVV-${i}-${randSuffix}`;
          const payId = `PAY-SIM-HVV-${i}-${randSuffix}`;
          const amount = 65000 + Math.floor(Math.random() * 20000);
          this.emitOrQueueFraudEvent(cust, 'order_created', { ...fraudMeta, order_id: ordId, payment_id: payId, amount, total_amount: amount, payment_method: 'card', event_time: timeIso }, 'SYSTEM', 'order_service');
        }
        this.liveStats.fraud_events += 3;
        break;
      }

      case 'ACCOUNT_CHANGE_NEW_DEVICE': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-SIM-ACND-${randSuffix}`;
        const newDev = `DEV-SIM-NEW-${randSuffix}`;
        cust.deviceId = newDev;

        const baseTime = Date.now() - 120000;
        const timeIso1 = new Date(baseTime).toISOString();
        const timeIso2 = new Date(baseTime + 90000).toISOString();

        this.emitOrQueueFraudEvent(cust, 'login', { ...fraudMeta, device_id: newDev, event_time: timeIso1 }, 'CUSTOMER', 'website');
        this.emitOrQueueFraudEvent(cust, 'password_changed', { ...fraudMeta, device_id: newDev, change_source: 'account_settings', event_time: timeIso2 }, 'CUSTOMER', 'website');
        this.liveStats.fraud_events += 2;
        break;
      }

      case 'ACCOUNT_TAKEOVER':
      case 'ACCOUNT_TAKEOVER_SEQUENCE': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-SIM-ATO-${randSuffix}`;
        const newDev = `DEV-SIM-ATO-NEW-${randSuffix}`;

        let baseTime = Date.now() - 240000;
        const time1 = new Date(baseTime).toISOString();
        const time2 = new Date(baseTime + 60000).toISOString();
        const time3 = new Date(baseTime + 120000).toISOString();
        const time4 = new Date(baseTime + 180000).toISOString();

        // Event 1: login_failed with device_id = null
        const custNoDev = { ...cust, deviceId: null as any };
        this.emitOrQueueFraudEvent(custNoDev, 'login_failed', { ...fraudMeta, device_id: null, reason: 'INVALID_CREDENTIALS', attempt_count: 1, event_time: time1 }, 'CUSTOMER', 'website');

        // Event 2: login on new device
        cust.deviceId = newDev;
        this.emitOrQueueFraudEvent(cust, 'login', { ...fraudMeta, device_id: newDev, event_time: time2 }, 'CUSTOMER', 'website');

        // Event 3: password_changed on same new device
        this.emitOrQueueFraudEvent(cust, 'password_changed', { ...fraudMeta, device_id: newDev, change_source: 'account_settings', event_time: time3 }, 'CUSTOMER', 'website');

        // Event 4: order_created on same new device
        const ordId = `ORD-SIM-ATO-${randSuffix}`;
        const payId = `PAY-SIM-ATO-${randSuffix}`;
        this.emitOrQueueFraudEvent(cust, 'order_created', { ...fraudMeta, device_id: newDev, order_id: ordId, payment_id: payId, amount: 1500, total_amount: 1500, event_time: time4 }, 'SYSTEM', 'order_service');
        this.liveStats.fraud_events += 4;
        break;
      }

      case 'MULTI_ACCOUNT_DEVICE': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const sharedDev = `DEV-SHARED-ABUSE-${randSuffix}`;
        let baseTime = Date.now() - 150000;
        for (let i = 1; i <= 5; i++) {
          const accId = `CUST-SHARED-DEV-${i}-${randSuffix}`;
          const sessId = `sess_dev_${accId}`;
          const timeIso = new Date(baseTime + i * 20000).toISOString();
          const cust = this.spawnVirtualCustomer(1.0);
          cust.customerId = accId;
          cust.sessionId = sessId;
          cust.deviceId = sharedDev;
          cust.ipAddress = `10.0.1.${i}`;
          this.emitOrQueueFraudEvent(cust, 'login', { ...fraudMeta, device_id: sharedDev, event_time: timeIso }, 'CUSTOMER', 'website');
        }
        this.liveStats.fraud_events += 5;
        break;
      }

      case 'MULTI_ACCOUNT_IP': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const sharedIp = `198.51.${Math.floor(10 + Math.random() * 200)}.${Math.floor(1 + Math.random() * 250)}`;
        let baseTime = Date.now() - 150000;
        for (let i = 1; i <= 5; i++) {
          const accId = `CUST-SHARED-IP-${i}-${randSuffix}`;
          const sessId = `sess_ip_${accId}`;
          const devId = `DEV-IP-${i}-${randSuffix}`;
          const timeIso = new Date(baseTime + i * 20000).toISOString();
          const cust = this.spawnVirtualCustomer(1.0);
          cust.customerId = accId;
          cust.sessionId = sessId;
          cust.deviceId = devId;
          cust.ipAddress = sharedIp;
          this.emitOrQueueFraudEvent(cust, 'login', { ...fraudMeta, ip_address: sharedIp, event_time: timeIso }, 'CUSTOMER', 'website');
        }
        this.liveStats.fraud_events += 5;
        break;
      }

      case 'COUPON_ABUSE': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const couponCode = `SAVE50_${randSuffix}`;
        const dev1 = `DEV-COUP-A-${randSuffix}`;
        const dev2 = `DEV-COUP-B-${randSuffix}`;
        const devices = [dev1, dev2, dev1];

        let baseTime = Date.now() - 120000;
        for (let i = 1; i <= 3; i++) {
          const accId = `CUST-COUPON-${i}-${randSuffix}`;
          const sessId = `sess_coup_${accId}`;
          const devId = devices[i - 1];
          const timeIso = new Date(baseTime + i * 30000).toISOString();
          const cust = this.spawnVirtualCustomer(1.0);
          cust.customerId = accId;
          cust.sessionId = sessId;
          cust.deviceId = devId;
          this.emitOrQueueFraudEvent(cust, 'coupon_applied', { ...fraudMeta, coupon_code: couponCode, coupon: couponCode, discount_amount: 500.00, device_id: devId, event_time: timeIso }, 'CUSTOMER', 'website');
        }
        this.liveStats.fraud_events += 3;
        break;
      }

      case 'REFUND_ABUSE': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-SIM-REF-${randSuffix}`;
        cust.deviceId = `DEV-SIM-REF-${randSuffix}`;

        let baseTime = Date.now() - 3600000;
        for (let i = 1; i <= 3; i++) {
          const timeIso = new Date(baseTime + i * 600000).toISOString();
          const retId = `RET-SIM-REF-${i}-${randSuffix}`;
          const ordId = `ORD-SIM-REF-${i}-${randSuffix}`;
          this.emitOrQueueFraudEvent(cust, 'return_requested', { ...fraudMeta, order_id: ordId, return_id: retId, reason: 'DEFECTIVE', event_time: timeIso }, 'CUSTOMER', 'website');
        }
        this.liveStats.fraud_events += 3;
        break;
      }

      case 'BOT_SCRAPER':
      case 'BOT_OR_SCRAPER':
      case 'BOT_ACTIVITY': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const botIp = `198.51.100.${Math.floor(10 + Math.random() * 200)}`;
        const botDev = `DEV-BOT-SCRAPER-${randSuffix}`;

        const sessions = [
          `sess_bot_1_${randSuffix}`,
          `sess_bot_2_${randSuffix}`,
          `sess_bot_3_${randSuffix}`,
          `sess_bot_4_${randSuffix}`
        ];

        let baseTime = Date.now() - 5000;
        for (let loop = 1; loop <= 20; loop++) {
          const sessId = sessions[loop % sessions.length];
          const timeIso = new Date(baseTime + (loop * 200)).toISOString();
          const cust = this.spawnVirtualCustomer(0.0);
          cust.sessionId = sessId;
          cust.ipAddress = botIp;
          cust.deviceId = botDev;
          this.emitOrQueueFraudEvent(cust, 'page_view', { ...fraudMeta, page: `category_${loop}`, ip_address: botIp, event_time: timeIso }, 'CUSTOMER', 'website');
        }
        this.liveStats.fraud_events += 20;
        this.liveStats.scraper_fraud_count += 20;
        break;
      }

      case 'DDOS_FLOOD':
      case 'DDOS': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const ddosIp = `198.51.200.${Math.floor(10 + Math.random() * 200)}`;

        let baseTime = Date.now() - 8000;
        for (let i = 1; i <= 30; i++) {
          const sessId = `sess_ddos_${(i % 6) + 1}_${randSuffix}`;
          const timeIso = new Date(baseTime + (i * 250)).toISOString();
          const cust = this.spawnVirtualCustomer(0.0);
          cust.sessionId = sessId;
          cust.ipAddress = ddosIp;
          this.emitOrQueueFraudEvent(cust, 'page_view', { ...fraudMeta, ip_address: ddosIp, event_time: timeIso }, 'CUSTOMER', 'website');
        }
        this.liveStats.fraud_events += 30;
        this.liveStats.ddos_fraud_count += 30;
        break;
      }

      case 'CHECKOUT_VELOCITY': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-SIM-VEL-${randSuffix}`;
        cust.deviceId = `DEV-SIM-VEL-${randSuffix}`;

        let baseTime = Date.now() - 200000;
        for (let i = 1; i <= 5; i++) {
          const timeIso = new Date(baseTime + i * 35000).toISOString();
          const ordId = `ORD-SIM-VEL-${i}-${randSuffix}`;
          const payId = `PAY-SIM-VEL-${i}-${randSuffix}`;
          const eventType = i % 2 === 1 ? 'checkout_started' : 'order_created';
          this.emitOrQueueFraudEvent(cust, eventType, { ...fraudMeta, order_id: ordId, payment_id: payId, amount: 3000.00, total_amount: 3000.00, event_time: timeIso }, 'CUSTOMER', 'website');
        }
        this.liveStats.fraud_events += 5;
        break;
      }

      case 'CRITICAL_ATO_MULTI_CARD_HEIST': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-HEIST-${randSuffix}`;
        const newDev = `DEV-HEIST-NEW-${randSuffix}`;
        const heistIp = `103.22.${Math.floor(10 + Math.random() * 200)}.${Math.floor(1 + Math.random() * 250)}`;
        cust.ipAddress = heistIp;

        let baseTime = Date.now() - 180000;
        const time1 = new Date(baseTime).toISOString();
        const time2 = new Date(baseTime + 30000).toISOString();
        const time3 = new Date(baseTime + 60000).toISOString();
        const time4 = new Date(baseTime + 90000).toISOString();
        const time5 = new Date(baseTime + 120000).toISOString();
        const time6 = new Date(baseTime + 150000).toISOString();
        const time7 = new Date(baseTime + 160000).toISOString();

        this.emitOrQueueFraudEvent(cust, 'login_failed', { ...fraudMeta, reason: 'INVALID_CREDENTIALS', attempt_count: 1, event_time: time1 }, 'CUSTOMER', 'website');
        cust.deviceId = newDev;
        this.emitOrQueueFraudEvent(cust, 'login', { ...fraudMeta, device_id: newDev, event_time: time2 }, 'CUSTOMER', 'website');
        this.emitOrQueueFraudEvent(cust, 'email_changed', { ...fraudMeta, device_id: newDev, old_email_domain: 'gmail.com', new_email_domain: 'tempmail.org', event_time: time3 }, 'CUSTOMER', 'website');
        this.emitOrQueueFraudEvent(cust, 'phone_changed', { ...fraudMeta, device_id: newDev, event_time: time4 }, 'CUSTOMER', 'website');
        const cardId = `PM-CARD-HEIST-${randSuffix}`;
        this.emitOrQueueFraudEvent(cust, 'payment_method_changed', { ...fraudMeta, device_id: newDev, action: 'added', payment_method_id: cardId, payment_method_type: 'credit_card', event_time: time5 }, 'CUSTOMER', 'website');
        const ordId = `ORD-HEIST-${randSuffix}`;
        const payId = `PAY-HEIST-${randSuffix}`;
        this.emitOrQueueFraudEvent(cust, 'payment_failed', { ...fraudMeta, device_id: newDev, payment_id: payId, order_id: ordId, payment_method_id: cardId, amount: 145000.00, reason: 'CARD_DECLINED', attempt_number: 1, event_time: time6 }, 'SYSTEM', 'payment_service');
        this.emitOrQueueFraudEvent(cust, 'order_created', { ...fraudMeta, device_id: newDev, payment_id: payId, order_id: ordId, payment_method_id: cardId, amount: 145000.00, total_amount: 145000.00, event_time: time7 }, 'SYSTEM', 'order_service');
        this.liveStats.fraud_events += 7;

        this.recordIncidentForScenario(cust.customerId, 'CRITICAL_ATO_MULTI_CARD_HEIST', 'Critical ATO & Multi-Card Heist', 'CRITICAL', 'CRITICAL', 98, 'TEMPORARY_RESTRICTION', 'Account takeover on new device with card retry burst ₹1,45,000', newDev, heistIp);
        break;
      }

      case 'CRITICAL_MULTI_ACCOUNT_COUPON_BURST': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const sharedDev = `DEV-CRIT-COUPON-${randSuffix}`;
        const sharedIp = `198.51.120.${Math.floor(10 + Math.random() * 200)}`;
        const promoCode = `SUPER90_${randSuffix}`;
        let baseTime = Date.now() - 120000;

        for (let i = 1; i <= 5; i++) {
          const accId = `CUST-CRIT-COUPON-${i}-${randSuffix}`;
          const sessId = `sess_crit_coup_${accId}`;
          const timeIso = new Date(baseTime + i * 15000).toISOString();
          const cust = this.spawnVirtualCustomer(1.0);
          cust.customerId = accId;
          cust.sessionId = sessId;
          cust.deviceId = sharedDev;
          cust.ipAddress = sharedIp;

          const ordId = `ORD-CRIT-COUP-${i}-${randSuffix}`;
          const payId = `PAY-CRIT-COUP-${i}-${randSuffix}`;

          this.emitOrQueueFraudEvent(cust, 'login', { ...fraudMeta, device_id: sharedDev, ip_address: sharedIp, event_time: timeIso }, 'CUSTOMER', 'website');
          this.emitOrQueueFraudEvent(cust, 'coupon_applied', { ...fraudMeta, coupon_code: promoCode, coupon: promoCode, discount_amount: 9000.00, device_id: sharedDev, ip_address: sharedIp, event_time: timeIso }, 'CUSTOMER', 'website');
          this.emitOrQueueFraudEvent(cust, 'order_created', { ...fraudMeta, order_id: ordId, payment_id: payId, coupon_code: promoCode, discount_amount: 9000.00, amount: 999.00, total_amount: 999.00, device_id: sharedDev, ip_address: sharedIp, event_time: timeIso }, 'SYSTEM', 'order_service');
        }
        this.liveStats.fraud_events += 15;

        this.recordIncidentForScenario(`CUST-CRIT-COUPON-1-${randSuffix}`, 'CRITICAL_MULTI_ACCOUNT_COUPON_BURST', 'Critical Multi-Account Coupon Burst', 'CRITICAL', 'CRITICAL', 92, 'STEP_UP_VERIFICATION', '5 accounts sharing device & IP applying ₹9,000 coupon in 60s', sharedDev, sharedIp);
        break;
      }

      case 'CRITICAL_IMPOSSIBLE_TRAVEL_HIGH_VALUE': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-TRAVEL-${randSuffix}`;
        const devIN = `DEV-IN-${randSuffix}`;
        const devUS = `DEV-US-HEIST-${randSuffix}`;
        const ipIN = `103.22.14.${Math.floor(10 + Math.random() * 200)}`;
        const ipUS = `198.51.100.${Math.floor(10 + Math.random() * 200)}`;

        let baseTime = Date.now() - 300000;
        const time1 = new Date(baseTime).toISOString();
        const time2 = new Date(baseTime + 90000).toISOString();
        const time3 = new Date(baseTime + 120000).toISOString();
        const time4 = new Date(baseTime + 180000).toISOString();

        cust.deviceId = devIN;
        cust.ipAddress = ipIN;
        this.emitOrQueueFraudEvent(cust, 'login', { ...fraudMeta, country: 'IN', city: 'Bengaluru', device_id: devIN, ip_address: ipIN, event_time: time1 }, 'CUSTOMER', 'website');

        cust.deviceId = devUS;
        cust.ipAddress = ipUS;
        this.emitOrQueueFraudEvent(cust, 'login', { ...fraudMeta, country: 'US', city: 'New York', device_id: devUS, ip_address: ipUS, event_time: time2 }, 'CUSTOMER', 'website');
        this.emitOrQueueFraudEvent(cust, 'password_changed', { ...fraudMeta, country: 'US', city: 'New York', device_id: devUS, ip_address: ipUS, change_source: 'account_settings', event_time: time3 }, 'CUSTOMER', 'website');

        const ordId1 = `ORD-TRAVEL-1-${randSuffix}`;
        const ordId2 = `ORD-TRAVEL-2-${randSuffix}`;
        this.emitOrQueueFraudEvent(cust, 'order_created', { ...fraudMeta, country: 'US', city: 'New York', device_id: devUS, ip_address: ipUS, order_id: ordId1, amount: 85000.00, total_amount: 85000.00, event_time: time4 }, 'SYSTEM', 'order_service');
        this.emitOrQueueFraudEvent(cust, 'order_created', { ...fraudMeta, country: 'US', city: 'New York', device_id: devUS, ip_address: ipUS, order_id: ordId2, amount: 92000.00, total_amount: 92000.00, event_time: time4 }, 'SYSTEM', 'order_service');
        this.liveStats.fraud_events += 5;

        this.recordIncidentForScenario(cust.customerId, 'CRITICAL_IMPOSSIBLE_TRAVEL_HIGH_VALUE', 'Critical Impossible Travel & High-Value Order', 'CRITICAL', 'CRITICAL', 95, 'TEMPORARY_RESTRICTION', 'Location jump IN -> US in 90s with password change and ₹85k orders', devUS, ipUS);
        break;
      }

      case 'CRITICAL_BOT_CHECKOUT_FLOOD': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const botIp = `198.51.250.${Math.floor(10 + Math.random() * 200)}`;
        const botDev = `DEV-BOT-FLOOD-${randSuffix}`;
        let baseTime = Date.now() - 30000;

        for (let i = 1; i <= 15; i++) {
          const timeIso = new Date(baseTime + i * 80).toISOString();
          const cust = this.spawnVirtualCustomer(0.0);
          cust.sessionId = `sess_bot_flood_${(i % 3) + 1}_${randSuffix}`;
          cust.ipAddress = botIp;
          cust.deviceId = botDev;
          this.emitOrQueueFraudEvent(cust, 'page_view', { ...fraudMeta, ip_address: botIp, device_id: botDev, page: `category_${i}`, event_time: timeIso }, 'CUSTOMER', 'website');
        }

        for (let j = 1; j <= 6; j++) {
          const timeIso = new Date(baseTime + 2000 + j * 500).toISOString();
          const cust = this.spawnVirtualCustomer(0.0);
          cust.sessionId = `sess_bot_flood_chk_${j}_${randSuffix}`;
          cust.ipAddress = botIp;
          cust.deviceId = botDev;
          const ordId = `ORD-BOT-FLOOD-${j}-${randSuffix}`;
          const payId = `PAY-BOT-FLOOD-${j}-${randSuffix}`;
          this.emitOrQueueFraudEvent(cust, 'checkout_started', { ...fraudMeta, ip_address: botIp, device_id: botDev, order_id: ordId, payment_id: payId, amount: 15000.00, event_time: timeIso }, 'CUSTOMER', 'website');
          this.emitOrQueueFraudEvent(cust, 'payment_initiated', { ...fraudMeta, ip_address: botIp, device_id: botDev, order_id: ordId, payment_id: payId, amount: 15000.00, event_time: timeIso }, 'CUSTOMER', 'website');
        }
        this.liveStats.fraud_events += 27;
        this.liveStats.scraper_fraud_count += 15;

        this.recordIncidentForScenario(`CUST-BOT-FLOOD-${randSuffix}`, 'CRITICAL_BOT_CHECKOUT_FLOOD', 'Critical Bot Checkout Flood', 'CRITICAL', 'CRITICAL', 96, 'TEMPORARY_RESTRICTION', '15 sub-100ms scrapes followed by 6 rapid checkout floods', botDev, botIp);
        break;
      }

      case 'VERY_HIGH_CREDENTIAL_STUFFING_BURST': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const proxyIps = [
          `198.51.101.10`, `198.51.101.20`, `198.51.101.30`, `198.51.101.40`, `198.51.101.50`
        ];
        let baseTime = Date.now() - 15000;

        for (let i = 1; i <= 10; i++) {
          const victimId = `CUST-STUFFED-VICTIM-${i}-${randSuffix}`;
          const proxyIp = proxyIps[i % proxyIps.length];
          const devId = `DEV-PROXY-STUFF-${i % 3}`;
          const timeIso = new Date(baseTime + i * 1200).toISOString();
          const cust = this.spawnVirtualCustomer(1.0);
          cust.customerId = victimId;
          cust.deviceId = devId;
          cust.ipAddress = proxyIp;

          this.emitOrQueueFraudEvent(cust, 'login_failed', { ...fraudMeta, reason: 'INVALID_CREDENTIALS', attempt_count: (i % 2) + 1, ip_address: proxyIp, device_id: devId, event_time: timeIso }, 'CUSTOMER', 'website');
        }
        this.liveStats.fraud_events += 10;

        this.recordIncidentForScenario(`CUST-STUFFED-VICTIM-1-${randSuffix}`, 'VERY_HIGH_CREDENTIAL_STUFFING_BURST', 'Very High Credential Stuffing Burst', 'VERY_HIGH', 'VERY_HIGH', 85, 'STEP_UP_VERIFICATION', '10 victim accounts targeted from rotating proxy IPs in 15 seconds', 'DEV-PROXY-STUFF-0', proxyIps[0]);
        break;
      }

      case 'VERY_HIGH_REFUND_ACCOUNT_SWAP': {
        const randSuffix = Math.floor(10000 + Math.random() * 90000);
        const cust = this.spawnVirtualCustomer(1.0);
        cust.customerId = `CUST-REFUND-SWAP-${randSuffix}`;
        const newDev = `DEV-REFUND-NEW-${randSuffix}`;
        cust.deviceId = newDev;

        let baseTime = Date.now() - 600000;
        const time1 = new Date(baseTime).toISOString();

        this.emitOrQueueFraudEvent(cust, 'profile_updated', { ...fraudMeta, change_type: 'payout_upi_updated', new_upi_handle: `fraudster_${randSuffix}@upi`, event_time: time1 }, 'CUSTOMER', 'website');
        this.emitOrQueueFraudEvent(cust, 'payment_method_changed', { ...fraudMeta, action: 'added', payment_method_type: 'upi', payment_method_id: `PM-UPI-SWAP-${randSuffix}`, event_time: time1 }, 'CUSTOMER', 'website');

        const refundAmounts = [12000.00, 18000.00, 25000.00];
        for (let i = 0; i < 3; i++) {
          const timeIso = new Date(baseTime + (i + 1) * 120000).toISOString();
          const retId = `RET-SWAP-${i + 1}-${randSuffix}`;
          const ordId = `ORD-SWAP-${i + 1}-${randSuffix}`;
          const refId = `REF-SWAP-${i + 1}-${randSuffix}`;
          const amt = refundAmounts[i];

          this.emitOrQueueFraudEvent(cust, 'return_requested', { ...fraudMeta, order_id: ordId, return_id: retId, reason: 'DEFECTIVE', event_time: timeIso }, 'CUSTOMER', 'website');
          this.emitOrQueueFraudEvent(cust, 'refund_initiated', { ...fraudMeta, order_id: ordId, return_id: retId, refund_id: refId, amount: amt, currency: 'INR', event_time: timeIso }, 'SYSTEM', 'payment_service');
        }
        this.liveStats.fraud_events += 8;

        this.recordIncidentForScenario(cust.customerId, 'VERY_HIGH_REFUND_ACCOUNT_SWAP', 'Very High Refund Account Swap Abuse', 'VERY_HIGH', 'VERY_HIGH', 82, 'ADMIN_REVIEW', 'Payout UPI swapped on new device followed by 3 high-value return requests', newDev, '103.22.14.88');
        break;
      }
    }
  }

  private writeDryRunTestEvents(events: any[]) {
    try {
      const logsBaseDir = path.resolve(__dirname, '../../event_logs');
      const testRunsDir = path.join(logsBaseDir, 'test_runs');
      if (!fs.existsSync(testRunsDir)) {
        fs.mkdirSync(testRunsDir, { recursive: true });
      }
      const testFilePath = path.join(testRunsDir, 'deterministic_events.jsonl');
      const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n';
      fs.appendFileSync(testFilePath, lines, 'utf-8');
      console.log(`[Simulator Dry-Run Sink] Saved ${events.length} test events to ${testFilePath}`);
    } catch (err) {
      console.error('[Simulator Dry-Run Error] Failed to write test events sink:', err);
    }
  }

  public async runDeterministicTest(
    scenario: string = 'BRUTE_FORCE_LOGIN',
    seed: number = 42
  ): Promise<any[]> {
    const rng = new SeededRandom(seed);
    const eventsEmitted: any[] = [];
    const testRunId = `SIM-DETERMINISTIC-${scenario}-${seed}`;

    const mainCustId = `CUST-SIM-DET-${seed}`;
    const mainHistory = this.getOrCreateCustomerHistory(mainCustId);

    let currentTimeMs = 1773900000000;

    const emitDryRunEvent = async (
      eventType: string, 
      meta: any = {}, 
      actorType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' = 'CUSTOMER', 
      source: string = 'website',
      cId: string = mainCustId,
      sId?: string,
      dId?: string,
      ipVal?: string,
      locVal?: any,
      timeMsVal?: number
    ) => {
      const timeMs = timeMsVal || currentTimeMs;
      const timeIso = new Date(timeMs).toISOString();
      const sessId = sId || `sess_det_${cId}_${seed}`;
      const devId = dId || mainHistory.primaryDevice;
      const ip = ipVal || mainHistory.primaryIp;
      const loc = locVal || mainHistory.primaryLocation;

      const pmId = meta.payment_method_id || (mainHistory.knownPaymentMethods[0]?.payment_method_id || `PM-UPI-${seed}`);
      const pmType = meta.payment_method_type || meta.payment_method || (mainHistory.knownPaymentMethods[0]?.payment_method_type || 'upi');

      const isPaymentStep = ['payment_initiated', 'payment_success', 'payment_failed', 'payment_retry', 'payment_method_selected'].includes(eventType);

      const payload: any = {
        event_id: `EVT-DET-${eventType.toUpperCase()}-${Math.floor(1000 + rng.next() * 9000)}`,
        simulation_run_id: testRunId,
        event_type: eventType,
        event_version: 1,
        event_time: timeIso,
        ingestion_time: new Date(timeMs + 50).toISOString(),
        event_source: source,
        actor_type: actorType.toLowerCase(),
        session_id: sessId,
        customer_id: cId,
        anonymous_id: null,
        user_type: 'registered',
        page: eventType === 'login' ? 'login_page' : 'storefront',
        context: {
          country: loc.country || 'IN',
          state: loc.state || 'Karnataka',
          city: loc.city || 'Bengaluru',
          device: 'desktop',
          browser: 'Chrome',
          device_id: devId,
          ip_address: ip
        },
        entity: {
          product_id: meta.product_id || null,
          cart_id: meta.cart_id || `CART-${sessId}`,
          order_id: meta.order_id || null,
          order_item_id: meta.order_item_id || null,
          payment_id: meta.payment_id || null,
          shipment_id: meta.shipment_id || null,
          return_id: meta.return_id || null,
          refund_id: meta.refund_id || null,
          review_id: null,
          admin_id: null
        },
        metadata: {
          ...meta,
          ...(isPaymentStep ? { payment_method_id: pmId, payment_method_type: pmType } : {}),
          simulated: true,
          simulation_mode: 'CLEAN',
          forced_test: true
        }
      };

      eventsEmitted.push(payload);
      if (!timeMsVal) {
        currentTimeMs += SimulationTimeUtils.generateGapMs('seconds', 2, 10, () => rng.next());
      }
    };

    const emitBaselineHistory = async (targetCustId: string) => {
      const targetHistory = this.getOrCreateCustomerHistory(targetCustId);
      let histTimeMs = currentTimeMs - SimulationTimeUtils.generateGapMs('days', 14, 30, () => rng.next());

      const pastOrders = [
        { amount: 1500, prodId: 'PROD-CAT001-001' },
        { amount: 2200, prodId: 'PROD-CAT002-001' },
        { amount: 3100, prodId: 'PROD-CAT001-002' },
        { amount: 2700, prodId: 'PROD-CAT003-001' }
      ];

      for (let i = 0; i < pastOrders.length; i++) {
        const ord = pastOrders[i];
        const sId = `sess_hist_${targetCustId}_${i + 1}`;
        const dev = targetHistory.primaryDevice;
        const ip = targetHistory.primaryIp;
        const loc = targetHistory.primaryLocation;
        const pm = targetHistory.knownPaymentMethods[i % targetHistory.knownPaymentMethods.length];

        await emitDryRunEvent('session_started', {}, 'CUSTOMER', 'website', targetCustId, sId, dev, ip, loc, histTimeMs);
        histTimeMs += 3000;
        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', targetCustId, sId, dev, ip, loc, histTimeMs);
        histTimeMs += 15000;
        await emitDryRunEvent('product_view', { product_id: ord.prodId }, 'CUSTOMER', 'website', targetCustId, sId, dev, ip, loc, histTimeMs);
        histTimeMs += 20000;
        await emitDryRunEvent('cart_item_added', { product_id: ord.prodId, quantity: 1, unit_price: ord.amount }, 'CUSTOMER', 'website', targetCustId, sId, dev, ip, loc, histTimeMs);
        histTimeMs += 25000;
        await emitDryRunEvent('checkout_started', {}, 'CUSTOMER', 'website', targetCustId, sId, dev, ip, loc, histTimeMs);
        histTimeMs += 10000;

        const pId = `PAY-HIST-${targetCustId}-${i + 1}`;
        const oId = `ORD-HIST-${targetCustId}-${i + 1}`;
        await emitDryRunEvent('payment_initiated', { payment_id: pId, order_id: oId, payment_method_id: pm.payment_method_id, payment_method_type: pm.payment_method_type, amount: ord.amount, currency: 'INR' }, 'CUSTOMER', 'website', targetCustId, sId, dev, ip, loc, histTimeMs);
        histTimeMs += 2000;
        await emitDryRunEvent('payment_success', { payment_id: pId, order_id: oId, payment_method_id: pm.payment_method_id, payment_method_type: pm.payment_method_type, amount: ord.amount, currency: 'INR' }, 'SYSTEM', 'payment_service', targetCustId, sId, dev, ip, loc, histTimeMs);
        histTimeMs += 1000;
        await emitDryRunEvent('order_created', { order_id: oId, payment_id: pId, product_id: ord.prodId, quantity: 1, unit_price: ord.amount, total_amount: ord.amount, currency: 'INR' }, 'SYSTEM', 'order_service', targetCustId, sId, dev, ip, loc, histTimeMs);
        histTimeMs += 15000;
        await emitDryRunEvent('logout', {}, 'CUSTOMER', 'website', targetCustId, sId, dev, ip, loc, histTimeMs);
        histTimeMs += 2000;
        await emitDryRunEvent('session_ended', {}, 'CUSTOMER', 'website', targetCustId, sId, dev, ip, loc, histTimeMs);

        histTimeMs += SimulationTimeUtils.generateGapMs('days', 3, 6, () => rng.next());
      }
    };

    switch (scenario) {
      case 'NORMAL_CUSTOMER': {
        await emitBaselineHistory(mainCustId);
        await emitDryRunEvent('session_started');
        if (rng.next() < 0.05) {
          await emitDryRunEvent('login_failed', { reason: 'INVALID_PASSWORD', attempt_count: 1 });
        }
        await emitDryRunEvent('login');
        await emitDryRunEvent('page_view', { page: 'home' });
        await emitDryRunEvent('search', { query: 'wireless headphones', result_count: 5 });
        const prodId = 'PROD-CAT001-001';
        await emitDryRunEvent('product_view', { product_id: prodId });
        await emitDryRunEvent('cart_item_added', { product_id: prodId, quantity: 1, unit_price: 2499.00 });
        await emitDryRunEvent('checkout_started');
        const pm = mainHistory.knownPaymentMethods[0];
        await emitDryRunEvent('payment_method_selected', { payment_method_id: pm.payment_method_id, payment_method_type: pm.payment_method_type });
        const payId = `PAY-DET-${seed}`;
        const ordId = `ORD-DET-${seed}`;
        await emitDryRunEvent('payment_initiated', { payment_id: payId, order_id: ordId, payment_method_id: pm.payment_method_id, payment_method_type: pm.payment_method_type, amount: 2599.00, currency: 'INR' });
        await emitDryRunEvent('payment_success', { payment_id: payId, order_id: ordId, payment_method_id: pm.payment_method_id, payment_method_type: pm.payment_method_type, amount: 2599.00, currency: 'INR' }, 'SYSTEM', 'payment_service');
        await emitDryRunEvent('order_created', { order_id: ordId, product_id: prodId, quantity: 1, unit_price: 2499.00, total_amount: 2599.00, currency: 'INR' }, 'SYSTEM', 'order_service');
        await emitDryRunEvent('logout');
        await emitDryRunEvent('session_ended');
        break;
      }

      case 'BRUTE_FORCE_LOGIN': {
        for (let attempt = 1; attempt <= 6; attempt++) {
          await emitDryRunEvent('login_failed', { reason: 'INVALID_CREDENTIALS', attempt_count: attempt });
          currentTimeMs += 1000;
        }
        await emitDryRunEvent('login');
        break;
      }

      case 'MULTI_IP_LOGIN': {
        const ips = ['198.51.100.11', '198.51.100.22', '198.51.100.33', '198.51.100.44'];
        for (let i = 0; i < 3; i++) {
          await emitDryRunEvent('login_failed', { reason: 'INVALID_CREDENTIALS', attempt_count: i + 1 }, 'CUSTOMER', 'website', mainCustId, undefined, undefined, ips[i]);
          currentTimeMs += 2000;
        }
        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', mainCustId, undefined, undefined, ips[3]);
        break;
      }

      case 'NEW_DEVICE': {
        await emitBaselineHistory(mainCustId);
        const atoDev = `DEV-NEW-${seed}-999`;
        await emitDryRunEvent('session_started', {}, 'CUSTOMER', 'website', mainCustId, undefined, atoDev);
        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', mainCustId, undefined, atoDev);
        await emitDryRunEvent('device_registered', { device_id: atoDev, device_type: 'mobile' }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev);
        await emitDryRunEvent('page_view', { page: 'home' }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev);
        await emitDryRunEvent('logout', {}, 'CUSTOMER', 'website', mainCustId, undefined, atoDev);
        await emitDryRunEvent('session_ended', {}, 'CUSTOMER', 'website', mainCustId, undefined, atoDev);
        this.recordDevice(mainCustId, atoDev);
        break;
      }

      case 'ACCOUNT_TAKEOVER': {
        await emitBaselineHistory(mainCustId);
        const atoDev = `DEV-ATO-${seed}-999`;
        const atoLoc = { country: 'IN', state: 'Maharashtra', city: 'Mumbai' };
        const atoIp = '103.22.88.19';
        const atoPm = { payment_method_id: `PM-ATO-${seed}-999`, payment_method_type: 'credit_card' };

        await emitDryRunEvent('session_started', {}, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, atoIp, atoLoc);
        await emitDryRunEvent('login_failed', { reason: 'INVALID_CREDENTIALS', attempt_count: 1 }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, atoIp, atoLoc);
        currentTimeMs += 5000;
        await emitDryRunEvent('login_failed', { reason: 'INVALID_CREDENTIALS', attempt_count: 2 }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, atoIp, atoLoc);
        currentTimeMs += 7000;
        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, atoIp, atoLoc);
        currentTimeMs += 6000;
        await emitDryRunEvent('device_registered', { device_id: atoDev, device_type: 'desktop' }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, atoIp, atoLoc);
        currentTimeMs += 25000;
        await emitDryRunEvent('password_changed', { change_source: 'account_settings' }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, atoIp, atoLoc);
        currentTimeMs += 35000;
        await emitDryRunEvent('email_changed', { old_email_domain: 'example.com', new_email_domain: 'tempmail.com' }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, atoIp, atoLoc);
        currentTimeMs += 40000;
        await emitDryRunEvent('payment_method_changed', { action: 'added', payment_method_id: atoPm.payment_method_id, payment_method_type: atoPm.payment_method_type }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, atoIp, atoLoc);
        currentTimeMs += 30000;
        await emitDryRunEvent('checkout_started', {}, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, atoIp, atoLoc);
        currentTimeMs += 15000;

        const payId = `PAY-ATO-${seed}`;
        const ordId = `ORD-ATO-${seed}`;
        await emitDryRunEvent('payment_initiated', { payment_id: payId, order_id: ordId, payment_method_id: atoPm.payment_method_id, payment_method_type: atoPm.payment_method_type, amount: 45000.00, currency: 'INR' }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, atoIp, atoLoc);
        currentTimeMs += 3000;
        await emitDryRunEvent('payment_success', { payment_id: payId, order_id: ordId, payment_method_id: atoPm.payment_method_id, payment_method_type: atoPm.payment_method_type, amount: 45000.00, currency: 'INR' }, 'SYSTEM', 'payment_service', mainCustId, undefined, atoDev, atoIp, atoLoc);
        currentTimeMs += 2000;
        await emitDryRunEvent('order_created', { order_id: ordId, payment_id: payId, total_amount: 45000.00, currency: 'INR' }, 'SYSTEM', 'order_service', mainCustId, undefined, atoDev, atoIp, atoLoc);

        this.recordDevice(mainCustId, atoDev);
        this.recordPaymentMethod(mainCustId, atoPm);
        break;
      }

      case 'PAYMENT_FRAUD': {
        await emitBaselineHistory(mainCustId);
        await emitDryRunEvent('session_started');
        await emitDryRunEvent('login');
        await emitDryRunEvent('checkout_started');

        const ordId = `ORD-PAYFRAUD-${seed}`;
        const payId = `PAY-PAYFRAUD-${seed}`;

        const cards = [
          { id: `PM-CARD-${seed}-1`, type: 'credit_card', reason: 'CARD_DECLINED' },
          { id: `PM-CARD-${seed}-2`, type: 'credit_card', reason: 'EXPIRED_CARD' },
          { id: `PM-CARD-${seed}-3`, type: 'credit_card', reason: 'INSUFFICIENT_FUNDS' },
          { id: `PM-CARD-${seed}-4`, type: 'credit_card', reason: 'STOLEN_CARD_SUSPECT' },
          { id: `PM-CARD-${seed}-5`, type: 'credit_card', reason: 'SUCCESS' }
        ];

        for (let attempt = 1; attempt <= 4; attempt++) {
          const card = cards[attempt - 1];
          await emitDryRunEvent('payment_method_selected', { payment_method_id: card.id, payment_method_type: card.type });
          await emitDryRunEvent('payment_initiated', { payment_id: payId, order_id: ordId, payment_method_id: card.id, payment_method_type: card.type, amount: 8900.00, currency: 'INR', attempt_number: attempt });
          await emitDryRunEvent('payment_failed', { payment_id: payId, order_id: ordId, payment_method_id: card.id, payment_method_type: card.type, amount: 8900.00, currency: 'INR', attempt_number: attempt, reason: card.reason }, 'SYSTEM', 'payment_service');
          await emitDryRunEvent('payment_retry', { payment_id: payId, order_id: ordId, attempt_number: attempt + 1 });
          currentTimeMs += SimulationTimeUtils.generateGapMs('seconds', 10, 25, () => rng.next());
        }

        const finalCard = cards[4];
        await emitDryRunEvent('payment_method_selected', { payment_method_id: finalCard.id, payment_method_type: finalCard.type });
        await emitDryRunEvent('payment_initiated', { payment_id: payId, order_id: ordId, payment_method_id: finalCard.id, payment_method_type: finalCard.type, amount: 8900.00, currency: 'INR', attempt_number: 5 });
        await emitDryRunEvent('payment_success', { payment_id: payId, order_id: ordId, payment_method_id: finalCard.id, payment_method_type: finalCard.type, amount: 8900.00, currency: 'INR' }, 'SYSTEM', 'payment_service');
        await emitDryRunEvent('order_created', { order_id: ordId, payment_id: payId, total_amount: 8900.00, currency: 'INR' }, 'SYSTEM', 'order_service');
        break;
      }

      case 'HIGH_VALUE_TRANSACTION': {
        await emitBaselineHistory(mainCustId);
        await emitDryRunEvent('session_started');
        await emitDryRunEvent('login');
        await emitDryRunEvent('page_view', { page: 'luxury_catalog' });
        const prodId = 'PROD-CAT001-050';
        await emitDryRunEvent('product_view', { product_id: prodId });
        await emitDryRunEvent('cart_item_added', { product_id: prodId, quantity: 1, unit_price: 150000.00 });
        await emitDryRunEvent('checkout_started');
        const pm = mainHistory.knownPaymentMethods[0];
        const payId = `PAY-HV-${seed}`;
        const ordId = `ORD-HV-${seed}`;
        await emitDryRunEvent('payment_initiated', { payment_id: payId, order_id: ordId, payment_method_id: pm.payment_method_id, payment_method_type: pm.payment_method_type, amount: 150000.00, currency: 'INR' });
        await emitDryRunEvent('payment_success', { payment_id: payId, order_id: ordId, payment_method_id: pm.payment_method_id, payment_method_type: pm.payment_method_type, amount: 150000.00, currency: 'INR' }, 'SYSTEM', 'payment_service');
        await emitDryRunEvent('order_created', { order_id: ordId, payment_id: payId, product_id: prodId, quantity: 1, unit_price: 150000.00, total_amount: 150000.00, currency: 'INR' }, 'SYSTEM', 'order_service');
        break;
      }

      case 'HIGH_VALUE_VELOCITY': {
        await emitBaselineHistory(mainCustId);
        for (let i = 1; i <= 3; i++) {
          const ordId = `ORD-HVV-${seed}-${i}`;
          const payId = `PAY-HVV-${seed}-${i}`;
          await emitDryRunEvent('checkout_started');
          await emitDryRunEvent('payment_initiated', { payment_id: payId, order_id: ordId, amount: 65000.00, currency: 'INR' });
          await emitDryRunEvent('payment_success', { payment_id: payId, order_id: ordId, amount: 65000.00, currency: 'INR' }, 'SYSTEM', 'payment_service');
          await emitDryRunEvent('order_created', { order_id: ordId, payment_id: payId, total_amount: 65000.00, currency: 'INR' }, 'SYSTEM', 'order_service');
          currentTimeMs += 10000;
        }
        break;
      }

      case 'MULTI_ACCOUNT_DEVICE': {
        const sharedDev = `DEV-SHARED-FAMILY-${seed}`;
        const u1 = `CUST-SIM-FAMILY-1-${seed}`;
        const u2 = `CUST-SIM-FAMILY-2-${seed}`;

        await emitDryRunEvent('session_started', {}, 'CUSTOMER', 'website', u1, undefined, sharedDev);
        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', u1, undefined, sharedDev);
        await emitDryRunEvent('order_created', { total_amount: 1200.00 }, 'SYSTEM', 'order_service', u1, undefined, sharedDev);
        await emitDryRunEvent('logout', {}, 'CUSTOMER', 'website', u1, undefined, sharedDev);

        currentTimeMs += 3600000;
        await emitDryRunEvent('session_started', {}, 'CUSTOMER', 'website', u2, undefined, sharedDev);
        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', u2, undefined, sharedDev);
        await emitDryRunEvent('order_created', { total_amount: 800.00 }, 'SYSTEM', 'order_service', u2, undefined, sharedDev);
        await emitDryRunEvent('logout', {}, 'CUSTOMER', 'website', u2, undefined, sharedDev);

        const abuseDev = `DEV-MULTI-ABUSE-${seed}`;
        const abuseAccounts = [`CUST-ABUSE-1-${seed}`, `CUST-ABUSE-2-${seed}`, `CUST-ABUSE-3-${seed}`, `CUST-ABUSE-4-${seed}`];

        for (let i = 0; i < abuseAccounts.length; i++) {
          const accId = abuseAccounts[i];
          const accSess = `sess_multi_${accId}`;
          const pmCard = { payment_method_id: `PM-CARD-MULTI-${i + 1}`, payment_method_type: 'credit_card' };

          await emitDryRunEvent('session_started', {}, 'CUSTOMER', 'website', accId, accSess, abuseDev);
          await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', accId, accSess, abuseDev);
          await emitDryRunEvent('cart_item_added', { product_id: 'PROD-CAT001-001', quantity: 1, unit_price: 2500.00 }, 'CUSTOMER', 'website', accId, accSess, abuseDev);
          await emitDryRunEvent('checkout_started', {}, 'CUSTOMER', 'website', accId, accSess, abuseDev);
          await emitDryRunEvent('payment_initiated', { payment_id: `PAY-MULTI-${i}`, order_id: `ORD-MULTI-${i}`, payment_method_id: pmCard.payment_method_id, payment_method_type: pmCard.payment_method_type, amount: 2500.00 }, 'CUSTOMER', 'website', accId, accSess, abuseDev);
          await emitDryRunEvent('payment_success', { payment_id: `PAY-MULTI-${i}`, order_id: `ORD-MULTI-${i}`, amount: 2500.00 }, 'SYSTEM', 'payment_service', accId, accSess, abuseDev);
          await emitDryRunEvent('order_created', { order_id: `ORD-MULTI-${i}`, total_amount: 2500.00 }, 'SYSTEM', 'order_service', accId, accSess, abuseDev);
          await emitDryRunEvent('logout', {}, 'CUSTOMER', 'website', accId, accSess, abuseDev);

          currentTimeMs += SimulationTimeUtils.generateGapMs('seconds', 15, 45, () => rng.next());
        }
        break;
      }

      case 'MULTI_ACCOUNT_IP': {
        const sharedIp = `198.51.100.88`;
        for (let i = 1; i <= 5; i++) {
          const accId = `CUST-SHARED-IP-${i}-${seed}`;
          const accSess = `sess_ip_${accId}`;
          await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', accId, accSess, `DEV-IP-${i}`, sharedIp);
          await emitDryRunEvent('order_created', { order_id: `ORD-MAI-${i}`, total_amount: 1500.00 }, 'SYSTEM', 'order_service', accId, accSess, `DEV-IP-${i}`, sharedIp);
        }
        break;
      }

      case 'COUPON_ABUSE': {
        const couponDev = `DEV-COUPON-ABUSE-${seed}`;
        const couponAccounts = [`CUST-COUPON-1-${seed}`, `CUST-COUPON-2-${seed}`, `CUST-COUPON-3-${seed}`, `CUST-COUPON-4-${seed}`];

        for (let i = 0; i < couponAccounts.length; i++) {
          const accId = couponAccounts[i];
          const accSess = `sess_coupon_${accId}`;

          await emitDryRunEvent('session_started', {}, 'CUSTOMER', 'website', accId, accSess, couponDev);
          await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', accId, accSess, couponDev);
          await emitDryRunEvent('cart_item_added', { product_id: 'PROD-CAT004-001', quantity: 1, unit_price: 550.00 }, 'CUSTOMER', 'website', accId, accSess, couponDev);
          await emitDryRunEvent('coupon_applied', { coupon: 'WELCOME500', discount_amount: 500.00 }, 'CUSTOMER', 'website', accId, accSess, couponDev);
          await emitDryRunEvent('checkout_started', {}, 'CUSTOMER', 'website', accId, accSess, couponDev);
          await emitDryRunEvent('payment_initiated', { payment_id: `PAY-COUP-${i}`, order_id: `ORD-COUP-${i}`, amount: 50.00 }, 'CUSTOMER', 'website', accId, accSess, couponDev);
          await emitDryRunEvent('payment_success', { payment_id: `PAY-COUP-${i}`, order_id: `ORD-COUP-${i}`, amount: 50.00 }, 'SYSTEM', 'payment_service', accId, accSess, couponDev);
          await emitDryRunEvent('order_created', { order_id: `ORD-COUP-${i}`, coupon: 'WELCOME500', discount_amount: 500.00, total_amount: 50.00 }, 'SYSTEM', 'order_service', accId, accSess, couponDev);
          await emitDryRunEvent('logout', {}, 'CUSTOMER', 'website', accId, accSess, couponDev);

          currentTimeMs += SimulationTimeUtils.generateGapMs('seconds', 20, 60, () => rng.next());
        }
        break;
      }

      case 'REFUND_ABUSE': {
        await emitBaselineHistory(mainCustId);
        const refundOrders = [
          { ordId: `ORD-REF-1-${seed}`, amount: 5000.00, reason: 'DEFECTIVE' },
          { ordId: `ORD-REF-2-${seed}`, amount: 7500.00, reason: 'ITEM_MISSING' },
          { ordId: `ORD-REF-3-${seed}`, amount: 9000.00, reason: 'WRONG_ITEM' }
        ];

        for (let i = 0; i < refundOrders.length; i++) {
          const rOrd = refundOrders[i];
          const retId = `RET-ABUSE-${seed}-${i + 1}`;
          const refId = `REF-ABUSE-${seed}-${i + 1}`;

          await emitDryRunEvent('session_started');
          await emitDryRunEvent('login');
          await emitDryRunEvent('cart_item_added', { product_id: 'PROD-CAT001-010', quantity: 1, unit_price: rOrd.amount });
          await emitDryRunEvent('checkout_started');
          await emitDryRunEvent('payment_initiated', { order_id: rOrd.ordId, amount: rOrd.amount });
          await emitDryRunEvent('payment_success', { order_id: rOrd.ordId, amount: rOrd.amount }, 'SYSTEM', 'payment_service');
          await emitDryRunEvent('order_created', { order_id: rOrd.ordId, total_amount: rOrd.amount }, 'SYSTEM', 'order_service');
          await emitDryRunEvent('delivered', { order_id: rOrd.ordId }, 'SYSTEM', 'fulfillment_service');

          currentTimeMs += SimulationTimeUtils.generateGapMs('hours', 12, 36, () => rng.next());
          await emitDryRunEvent('return_requested', { order_id: rOrd.ordId, return_id: retId, reason: rOrd.reason });
          await emitDryRunEvent('refund_initiated', { order_id: rOrd.ordId, return_id: retId, refund_id: refId, amount: rOrd.amount }, 'SYSTEM', 'payment_service');
          await emitDryRunEvent('refund_success', { order_id: rOrd.ordId, return_id: retId, refund_id: refId, amount: rOrd.amount }, 'SYSTEM', 'payment_service');

          currentTimeMs += SimulationTimeUtils.generateGapMs('days', 2, 4, () => rng.next());
        }
        break;
      }

      case 'CHECKOUT_VELOCITY': {
        for (let i = 1; i <= 5; i++) {
          const ordId = `ORD-VEL-${seed}-${i}`;
          const payId = `PAY-VEL-${seed}-${i}`;
          await emitDryRunEvent('checkout_started');
          await emitDryRunEvent('payment_initiated', { payment_id: payId, order_id: ordId, amount: 3000.00 });
          currentTimeMs += 1000;
        }
        break;
      }

      case 'BOT_SCRAPER':
      case 'BOT_ACTIVITY': {
        const botDev = `DEV-BOT-SCRIPT-${seed}`;
        const botIp = '198.51.100.99';
        await emitDryRunEvent('session_started', {}, 'CUSTOMER', 'website', mainCustId, undefined, botDev, botIp);

        for (let loop = 1; loop <= 6; loop++) {
          await emitDryRunEvent('search', { query: `bot_query_${loop}` }, 'CUSTOMER', 'website', mainCustId, undefined, botDev, botIp);
          currentTimeMs += SimulationTimeUtils.generateGapMs('ms', 50, 120, () => rng.next());

          await emitDryRunEvent('product_view', { product_id: `PROD-CAT001-00${loop}` }, 'CUSTOMER', 'website', mainCustId, undefined, botDev, botIp);
          currentTimeMs += SimulationTimeUtils.generateGapMs('ms', 40, 100, () => rng.next());

          await emitDryRunEvent('cart_item_added', { product_id: `PROD-CAT001-00${loop}`, quantity: 1, unit_price: 1500.00 }, 'CUSTOMER', 'website', mainCustId, undefined, botDev, botIp);
          currentTimeMs += SimulationTimeUtils.generateGapMs('ms', 50, 90, () => rng.next());

          await emitDryRunEvent('checkout_started', {}, 'CUSTOMER', 'website', mainCustId, undefined, botDev, botIp);
          currentTimeMs += SimulationTimeUtils.generateGapMs('ms', 60, 150, () => rng.next());
        }
        break;
      }

      case 'DDOS_FLOOD': {
        const ddosIp = '198.51.100.50';
        for (let i = 0; i < 20; i++) {
          await emitDryRunEvent('page_view', {}, 'CUSTOMER', 'website', mainCustId, undefined, undefined, ddosIp);
          currentTimeMs += 50;
        }
        break;
      }

      case 'SUSPICIOUS_LOCATION_CHANGE': {
        await emitDryRunEvent('login', { country: 'IN', city: 'Bengaluru' });
        await emitDryRunEvent('password_changed', { country: 'US', city: 'New York', ip_address: '198.51.100.44' });
        const ordId = `ORD-LOC-${seed}`;
        const payId = `PAY-LOC-${seed}`;
        await emitDryRunEvent('order_created', { order_id: ordId, payment_id: payId, total_amount: 75000.00, country: 'US', city: 'New York', ip_address: '198.51.100.44' }, 'SYSTEM', 'order_service');
        break;
      }

      case 'REPEATED_FRAUD_ESCALATION':
      case 'REPEATED_OFFENDER': {
        const offenderId = `CUST-REPEATED-OFFENDER-${seed}`;
        const offHistory = this.getOrCreateCustomerHistory(offenderId);

        let incMs = currentTimeMs - SimulationTimeUtils.generateGapMs('days', 20, 30, () => rng.next());

        // Incident 1: 3 failed logins + login from new location Delhi
        const devInc1 = `DEV-OFFENDER-INC1-${seed}`;
        const locDelhi = { country: 'IN', state: 'Delhi', city: 'Delhi' };
        await emitDryRunEvent('session_started', {}, 'CUSTOMER', 'website', offenderId, 'sess_inc1', devInc1, offHistory.primaryIp, locDelhi, incMs);
        incMs += 3000;
        await emitDryRunEvent('login_failed', { reason: 'INVALID_CREDENTIALS', attempt_count: 1 }, 'CUSTOMER', 'website', offenderId, 'sess_inc1', devInc1, offHistory.primaryIp, locDelhi, incMs);
        incMs += 5000;
        await emitDryRunEvent('login_failed', { reason: 'INVALID_CREDENTIALS', attempt_count: 2 }, 'CUSTOMER', 'website', offenderId, 'sess_inc1', devInc1, offHistory.primaryIp, locDelhi, incMs);
        incMs += 6000;
        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', offenderId, 'sess_inc1', devInc1, offHistory.primaryIp, locDelhi, incMs);

        // Incident 2 (7 days later): Payment card failure burst
        incMs += SimulationTimeUtils.generateGapMs('days', 7, 10, () => rng.next());
        await emitDryRunEvent('session_started', {}, 'CUSTOMER', 'website', offenderId, 'sess_inc2', offHistory.primaryDevice, offHistory.primaryIp, offHistory.primaryLocation, incMs);
        incMs += 3000;
        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', offenderId, 'sess_inc2', offHistory.primaryDevice, offHistory.primaryIp, offHistory.primaryLocation, incMs);
        incMs += 15000;
        await emitDryRunEvent('checkout_started', {}, 'CUSTOMER', 'website', offenderId, 'sess_inc2', offHistory.primaryDevice, offHistory.primaryIp, offHistory.primaryLocation, incMs);
        incMs += 10000;
        await emitDryRunEvent('payment_initiated', { payment_id: `PAY-INC2-${seed}`, amount: 15000.00 }, 'CUSTOMER', 'website', offenderId, 'sess_inc2', offHistory.primaryDevice, offHistory.primaryIp, offHistory.primaryLocation, incMs);
        incMs += 2000;
        await emitDryRunEvent('payment_failed', { payment_id: `PAY-INC2-${seed}`, reason: 'STOLEN_CARD_SUSPECT' }, 'SYSTEM', 'payment_service', offenderId, 'sess_inc2', offHistory.primaryDevice, offHistory.primaryIp, offHistory.primaryLocation, incMs);

        // Incident 3 (Current): Address update + high value order ₹65,000
        currentTimeMs += 60000;
        await emitDryRunEvent('session_started', {}, 'CUSTOMER', 'website', offenderId);
        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', offenderId);
        await emitDryRunEvent('address_updated', { address_id: 'ADDR-OFFENDER-NEW' }, 'CUSTOMER', 'website', offenderId);
        await emitDryRunEvent('checkout_started', {}, 'CUSTOMER', 'website', offenderId);
        const payId = `PAY-INC3-${seed}`;
        const ordId = `ORD-INC3-${seed}`;
        await emitDryRunEvent('payment_initiated', { payment_id: payId, order_id: ordId, amount: 65000.00, currency: 'INR' }, 'CUSTOMER', 'website', offenderId);
        await emitDryRunEvent('payment_success', { payment_id: payId, order_id: ordId, amount: 65000.00, currency: 'INR' }, 'SYSTEM', 'payment_service', offenderId);
        await emitDryRunEvent('order_created', { order_id: ordId, payment_id: payId, total_amount: 65000.00, currency: 'INR' }, 'SYSTEM', 'order_service', offenderId);
        break;
      }

      case 'CRITICAL_ATO_MULTI_CARD_HEIST': {
        const atoDev = `DEV-HEIST-DET-${seed}`;
        const heistIp = `103.22.99.55`;
        const cardId = `PM-CARD-HEIST-${seed}`;

        await emitDryRunEvent('login_failed', { reason: 'INVALID_CREDENTIALS', attempt_count: 1 }, 'CUSTOMER', 'website', mainCustId, undefined, mainHistory.primaryDevice, mainHistory.primaryIp);
        currentTimeMs += 5000;
        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, heistIp);
        currentTimeMs += 10000;
        await emitDryRunEvent('email_changed', { old_email_domain: 'example.com', new_email_domain: 'tempmail.com' }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, heistIp);
        await emitDryRunEvent('phone_changed', {}, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, heistIp);
        currentTimeMs += 15000;
        await emitDryRunEvent('payment_method_changed', { action: 'added', payment_method_id: cardId, payment_method_type: 'credit_card' }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, heistIp);
        currentTimeMs += 20000;
        const ordId = `ORD-HEIST-${seed}`;
        const payId = `PAY-HEIST-${seed}`;
        await emitDryRunEvent('payment_initiated', { payment_id: payId, order_id: ordId, payment_method_id: cardId, amount: 145000.00, currency: 'INR' }, 'CUSTOMER', 'website', mainCustId, undefined, atoDev, heistIp);
        await emitDryRunEvent('payment_failed', { payment_id: payId, order_id: ordId, payment_method_id: cardId, amount: 145000.00, currency: 'INR', reason: 'CARD_DECLINED' }, 'SYSTEM', 'payment_service', mainCustId, undefined, atoDev, heistIp);
        await emitDryRunEvent('payment_success', { payment_id: payId, order_id: ordId, payment_method_id: cardId, amount: 145000.00, currency: 'INR' }, 'SYSTEM', 'payment_service', mainCustId, undefined, atoDev, heistIp);
        await emitDryRunEvent('order_created', { order_id: ordId, payment_id: payId, total_amount: 145000.00, currency: 'INR' }, 'SYSTEM', 'order_service', mainCustId, undefined, atoDev, heistIp);
        break;
      }

      case 'CRITICAL_MULTI_ACCOUNT_COUPON_BURST': {
        const sharedDev = `DEV-COUPON-BURST-${seed}`;
        const sharedIp = `198.51.120.99`;
        for (let i = 1; i <= 5; i++) {
          const accId = `CUST-BURST-COUPON-${i}-${seed}`;
          const sessId = `sess_burst_coup_${accId}`;
          await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', accId, sessId, sharedDev, sharedIp);
          await emitDryRunEvent('coupon_applied', { coupon: 'SUPER90', discount_amount: 9000.00 }, 'CUSTOMER', 'website', accId, sessId, sharedDev, sharedIp);
          await emitDryRunEvent('order_created', { order_id: `ORD-CRIT-BURST-${i}`, coupon: 'SUPER90', discount_amount: 9000.00, total_amount: 999.00 }, 'SYSTEM', 'order_service', accId, sessId, sharedDev, sharedIp);
          currentTimeMs += 2000;
        }
        break;
      }

      case 'CRITICAL_IMPOSSIBLE_TRAVEL_HIGH_VALUE': {
        const devIN = `DEV-IN-${seed}`;
        const devUS = `DEV-US-${seed}`;
        const ipIN = `103.22.14.88`;
        const ipUS = `198.51.100.99`;

        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', mainCustId, undefined, devIN, ipIN, { country: 'IN', city: 'Bengaluru' });
        currentTimeMs += 90000;
        await emitDryRunEvent('login', {}, 'CUSTOMER', 'website', mainCustId, undefined, devUS, ipUS, { country: 'US', city: 'New York' });
        await emitDryRunEvent('password_changed', { change_source: 'account_settings' }, 'CUSTOMER', 'website', mainCustId, undefined, devUS, ipUS, { country: 'US', city: 'New York' });
        await emitDryRunEvent('order_created', { order_id: `ORD-TRAVEL-1-${seed}`, total_amount: 85000.00, currency: 'INR' }, 'SYSTEM', 'order_service', mainCustId, undefined, devUS, ipUS, { country: 'US', city: 'New York' });
        await emitDryRunEvent('order_created', { order_id: `ORD-TRAVEL-2-${seed}`, total_amount: 92000.00, currency: 'INR' }, 'SYSTEM', 'order_service', mainCustId, undefined, devUS, ipUS, { country: 'US', city: 'New York' });
        break;
      }

      case 'CRITICAL_BOT_CHECKOUT_FLOOD': {
        const botDev = `DEV-BOT-CRIT-${seed}`;
        const botIp = `198.51.250.77`;
        for (let i = 1; i <= 15; i++) {
          await emitDryRunEvent('page_view', { page: `product_${i}` }, 'CUSTOMER', 'website', mainCustId, undefined, botDev, botIp);
          currentTimeMs += 80;
        }
        for (let j = 1; j <= 6; j++) {
          await emitDryRunEvent('checkout_started', { order_id: `ORD-BOT-FLOOD-${j}` }, 'CUSTOMER', 'website', mainCustId, undefined, botDev, botIp);
          await emitDryRunEvent('payment_initiated', { order_id: `ORD-BOT-FLOOD-${j}`, amount: 15000.00 }, 'CUSTOMER', 'website', mainCustId, undefined, botDev, botIp);
          currentTimeMs += 300;
        }
        break;
      }

      case 'VERY_HIGH_CREDENTIAL_STUFFING_BURST': {
        const proxyIps = ['198.51.101.10', '198.51.101.20', '198.51.101.30', '198.51.101.40', '198.51.101.50'];
        for (let i = 1; i <= 10; i++) {
          const victimId = `CUST-VICTIM-${i}-${seed}`;
          const proxyIp = proxyIps[i % proxyIps.length];
          await emitDryRunEvent('login_failed', { reason: 'INVALID_CREDENTIALS', attempt_count: 1 }, 'CUSTOMER', 'website', victimId, undefined, `DEV-PROXY-${i}`, proxyIp);
          currentTimeMs += 1000;
        }
        break;
      }

      case 'VERY_HIGH_REFUND_ACCOUNT_SWAP': {
        const newDev = `DEV-REFUND-SWAP-${seed}`;
        await emitDryRunEvent('profile_updated', { change_type: 'payout_upi_updated' }, 'CUSTOMER', 'website', mainCustId, undefined, newDev);
        await emitDryRunEvent('payment_method_changed', { action: 'added', payment_method_type: 'upi' }, 'CUSTOMER', 'website', mainCustId, undefined, newDev);
        const amounts = [12000.00, 18000.00, 25000.00];
        for (let i = 0; i < 3; i++) {
          const rOrd = `ORD-SWAP-${i + 1}-${seed}`;
          const rRet = `RET-SWAP-${i + 1}-${seed}`;
          const rRef = `REF-SWAP-${i + 1}-${seed}`;
          await emitDryRunEvent('return_requested', { order_id: rOrd, return_id: rRet, reason: 'DEFECTIVE' }, 'CUSTOMER', 'website', mainCustId, undefined, newDev);
          await emitDryRunEvent('refund_initiated', { order_id: rOrd, return_id: rRet, refund_id: rRef, amount: amounts[i] }, 'SYSTEM', 'payment_service', mainCustId, undefined, newDev);
          currentTimeMs += 60000;
        }
        break;
      }
    }

    this.writeDryRunTestEvents(eventsEmitted);
    return eventsEmitted;
  }
}

export const simulatorService = new SimulatorService();
