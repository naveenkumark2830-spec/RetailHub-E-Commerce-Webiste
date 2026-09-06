import mysql from 'mysql2';
import mysqlPromise from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { EventLogger } from '../services/eventLogger';
import bcrypt from 'bcryptjs';

dotenv.config();

let MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
if (MYSQL_HOST === 'host.docker.internal' && !process.env.IS_DOCKER) {
  MYSQL_HOST = 'localhost';
}
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'retailhub';

export interface SessionRecord {
  session_id: string;
  customer_id: string | null;
  session_type: string;
  device: string;
  browser: string;
  ip_hash: string;
  started_at: Date;
  last_activity: Date;
  ended_at: Date | null;
}

export interface CustomerRecord {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password_hash: string;
  date_of_birth: string | null;
  gender: string | null;
  country: string;
  state: string;
  city: string;
  language: string;
  membership: string;
  preferred_payment: string;
  account_status: string;
  created_at: Date;
  updated_at: Date;
}

export interface CategoryRecord {
  category_id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  product_count: number;
  display_order: number;
  status: string;
}

export interface ProductRecord {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  category_id: string;
  subcategory_id: string;
  description: string;
  price: number;
  discount: number;
  sale_price: number;
  rating: number;
  review_count: number;
  weight: number;
  color: string;
  size: string;
  warranty: string;
  return_eligible: boolean;
  country: string;
  delivery_days: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface BannerRecord {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  status: string;
}

export let dbPool: mysqlPromise.Pool | null = null;
let isInMemoryFallback = false;

// High-performance In-Memory repository fallback
const inMemorySessions = new Map<string, SessionRecord>();
const inMemoryCustomers = new Map<string, CustomerRecord>();
const inMemoryAdminUsers = new Map<string, any>();
const inMemoryCategories = new Map<string, CategoryRecord>();
const inMemoryProducts = new Map<string, ProductRecord>();
const inMemoryBanners = new Map<number, BannerRecord>();
const inMemoryCart = new Map<string, Array<{ product_id: string; quantity: number }>>(); // keyed by session_id/customer_id
const inMemoryRecentlyViewed = new Map<string, string[]>(); // key: session/customer, value: product_ids
const inMemoryWishlist = new Map<string, string[]>(); // key: session/customer, value: product_ids

const CATEGORIES_LIST = [
  { id: 'CAT001', name: 'Electronics', slug: 'electronics', desc: 'Gadgets, devices, and computing gear.' },
  { id: 'CAT002', name: 'Fashion', slug: 'fashion', desc: 'Trendy clothing, apparel, and styling.' },
  { id: 'CAT003', name: 'Home & Furniture', slug: 'home-furniture', desc: 'Decor, premium chairs, tables, and sofas.' },
  { id: 'CAT004', name: 'Grocery', slug: 'grocery', desc: 'Organic snacks, fresh foods, essentials.' },
  { id: 'CAT005', name: 'Beauty', slug: 'beauty', desc: 'Skin care, hair styling, cosmetics.' },
  { id: 'CAT006', name: 'Sports & Fitness', slug: 'sports-fitness', desc: 'Yoga mats, weights, sports activewear.' },
  { id: 'CAT007', name: 'Books', slug: 'books', desc: 'Novels, biographies, academic textbooks.' },
  { id: 'CAT008', name: 'Toys & Games', slug: 'toys-games', desc: 'Board games, action figures, puzzles.' },
  { id: 'CAT009', name: 'Automotive', slug: 'automotive', desc: 'Car accessories, cleaning kits, parts.' },
  { id: 'CAT010', name: 'Computers & Accessories', slug: 'computers-accessories', desc: 'Mice, mechanical keyboards, monitors.' },
  { id: 'CAT011', name: 'Mobile & Tablets', slug: 'mobile-tablets', desc: 'Smartphones, cases, charging bricks.' },
  { id: 'CAT012', name: 'Appliances', slug: 'appliances', desc: 'Air conditioners, refrigerators, washers.' },
  { id: 'CAT013', name: 'Kitchen', slug: 'kitchen', desc: 'Cookware, mixers, blenders, utensils.' },
  { id: 'CAT014', name: 'Office & Stationery', slug: 'office-stationery', desc: 'Journals, premium pens, desk organizers.' },
  { id: 'CAT015', name: 'Health & Wellness', slug: 'health-wellness', desc: 'Supplements, proteins, vitamins.' },
  { id: 'CAT016', name: 'Baby Products', slug: 'baby-products', desc: 'Pampers, baby oils, safety gear.' },
  { id: 'CAT017', name: 'Pet Supplies', slug: 'pet-supplies', desc: 'Pedigree pet foods, collars, toys.' },
  { id: 'CAT018', name: 'Shoes & Accessories', slug: 'shoes-accessories', desc: 'Sneakers, high-tops, travel backpacks.' },
  { id: 'CAT019', name: 'Jewellery & Watches', slug: 'jewellery-watches', desc: 'Premium wristwatches, luxury rings.' },
  { id: 'CAT020', name: 'Travel & Outdoor', slug: 'travel-outdoor', desc: 'Tents, hiking bags, sleeping gear.' }
];

export async function initDb() {
  try {
    const rootConn = await mysqlPromise.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`;`);
    await rootConn.end();

    dbPool = mysqlPromise.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
    });

    // Create database tables schema
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        slug VARCHAR(128) UNIQUE NOT NULL,
        description TEXT,
        image_url VARCHAR(255),
        product_count INT DEFAULT 0,
        display_order INT,
        status VARCHAR(32) DEFAULT 'ACTIVE'
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS subcategories (
        subcategory_id VARCHAR(64) PRIMARY KEY,
        category_id VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        slug VARCHAR(128) NOT NULL
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS sellers (
        seller_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        rating DECIMAL(3,2),
        status VARCHAR(32) DEFAULT 'ACTIVE'
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        warehouse_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        location VARCHAR(128) NOT NULL
      );
    `);

    // Migrate warehouses table columns
    const [whCols]: any = await dbPool.query("SHOW COLUMNS FROM warehouses");
    const colNames = whCols.map((c: any) => c.Field);
    
    if (!colNames.includes('address')) {
      await dbPool.query("ALTER TABLE warehouses ADD COLUMN address VARCHAR(255) DEFAULT ''");
    }
    if (!colNames.includes('city')) {
      await dbPool.query("ALTER TABLE warehouses ADD COLUMN city VARCHAR(128) DEFAULT ''");
    }
    if (!colNames.includes('state')) {
      await dbPool.query("ALTER TABLE warehouses ADD COLUMN state VARCHAR(128) DEFAULT ''");
    }
    if (!colNames.includes('country')) {
      await dbPool.query("ALTER TABLE warehouses ADD COLUMN country VARCHAR(128) DEFAULT 'India'");
    }
    if (!colNames.includes('postal_code')) {
      await dbPool.query("ALTER TABLE warehouses ADD COLUMN postal_code VARCHAR(32) DEFAULT ''");
    }
    if (!colNames.includes('latitude')) {
      await dbPool.query("ALTER TABLE warehouses ADD COLUMN latitude DECIMAL(10, 8) DEFAULT 0.0");
    }
    if (!colNames.includes('longitude')) {
      await dbPool.query("ALTER TABLE warehouses ADD COLUMN longitude DECIMAL(11, 8) DEFAULT 0.0");
    }
    if (!colNames.includes('capacity_units')) {
      await dbPool.query("ALTER TABLE warehouses ADD COLUMN capacity_units INT DEFAULT 100000");
    }
    if (!colNames.includes('status')) {
      await dbPool.query("ALTER TABLE warehouses ADD COLUMN status VARCHAR(32) DEFAULT 'ACTIVE'");
    }
    if (!colNames.includes('warehouse_code')) {
      await dbPool.query("ALTER TABLE warehouses ADD COLUMN warehouse_code VARCHAR(32) DEFAULT ''");
    }

    // Backfill realistic seeded warehouse details
    await dbPool.query(`
      UPDATE warehouses SET 
        warehouse_code = 'WH-BLR-01',
        address = '12, Outer Ring Road, Bellandur',
        city = 'Bengaluru',
        state = 'Karnataka',
        country = 'India',
        postal_code = '560103',
        latitude = 12.9304,
        longitude = 77.6784,
        capacity_units = 150000,
        status = 'ACTIVE'
      WHERE warehouse_id = 'WH001'
    `);
    await dbPool.query(`
      UPDATE warehouses SET 
        warehouse_code = 'WH-BOM-02',
        address = 'Plot 45, MIDC Industrial Area, Andheri East',
        city = 'Mumbai',
        state = 'Maharashtra',
        country = 'India',
        postal_code = '400093',
        latitude = 19.1176,
        longitude = 72.8631,
        capacity_units = 250000,
        status = 'ACTIVE'
      WHERE warehouse_id = 'WH002'
    `);
    await dbPool.query(`
      UPDATE warehouses SET 
        warehouse_code = 'WH-DEL-03',
        address = '88, Okhla Industrial Estate Phase III',
        city = 'New Delhi',
        state = 'Delhi',
        country = 'India',
        postal_code = '110020',
        latitude = 28.5355,
        longitude = 77.2739,
        capacity_units = 180000,
        status = 'ACTIVE'
      WHERE warehouse_id = 'WH003'
    `);

    await dbPool.query(`
      UPDATE warehouses SET 
        warehouse_code = 'WH-HYD-04',
        address = 'Plot 12, Tech Park, Madhapur',
        city = 'Hyderabad',
        state = 'Telangana',
        country = 'India',
        postal_code = '500081',
        latitude = 17.4483,
        longitude = 78.3741,
        capacity_units = 220000,
        status = 'ACTIVE'
      WHERE warehouse_id = 'WH004'
    `);

    await dbPool.query(`
      UPDATE warehouses SET 
        warehouse_code = 'WH-MAA-05',
        address = '50, SIPCOT Industrial Park, Irungattukottai',
        city = 'Chennai',
        state = 'Tamil Nadu',
        country = 'India',
        postal_code = '602105',
        latitude = 13.0827,
        longitude = 80.2707,
        capacity_units = 200000,
        status = 'ACTIVE'
      WHERE warehouse_id = 'WH005'
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id VARCHAR(64) PRIMARY KEY,
        sku VARCHAR(128) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        brand VARCHAR(128) NOT NULL,
        category_id VARCHAR(64) NOT NULL,
        subcategory_id VARCHAR(64) NOT NULL,
        description TEXT,
        price INT NOT NULL,
        discount INT DEFAULT 0,
        sale_price INT NOT NULL,
        rating DECIMAL(3,2) DEFAULT 0,
        review_count INT DEFAULT 0,
        weight DECIMAL(6,2),
        color VARCHAR(64),
        size VARCHAR(64),
        warranty VARCHAR(128),
        return_eligible BOOLEAN DEFAULT TRUE,
        country VARCHAR(128) DEFAULT 'India',
        delivery_days INT DEFAULT 3,
        status VARCHAR(32) DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        inventory_id VARCHAR(64) PRIMARY KEY,
        product_id VARCHAR(64) NOT NULL,
        warehouse_id VARCHAR(64) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        reserved_stock INT NOT NULL DEFAULT 0
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS homepage_banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(128) NOT NULL,
        subtitle VARCHAR(255),
        image_url VARCHAR(255) NOT NULL,
        link_url VARCHAR(128) NOT NULL,
        status VARCHAR(32) DEFAULT 'ACTIVE'
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        customer_id VARCHAR(64) NULL,
        session_type VARCHAR(32) NOT NULL,
        device VARCHAR(64),
        browser VARCHAR(64),
        ip_hash VARCHAR(64),
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        ended_at DATETIME NULL
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id VARCHAR(64) PRIMARY KEY,
        first_name VARCHAR(64) NOT NULL,
        last_name VARCHAR(64) NOT NULL,
        email VARCHAR(128) UNIQUE NOT NULL,
        phone VARCHAR(32) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        date_of_birth VARCHAR(32) NULL,
        gender VARCHAR(16) NULL,
        country VARCHAR(64) NOT NULL,
        state VARCHAR(64) NOT NULL,
        city VARCHAR(64) NOT NULL,
        language VARCHAR(32) NOT NULL DEFAULT 'English',
        membership VARCHAR(32) NOT NULL DEFAULT 'Standard',
        preferred_payment VARCHAR(32) NOT NULL DEFAULT 'UPI',
        account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await dbPool.query('DROP TABLE IF EXISTS cart_items');
    await dbPool.query('DROP TABLE IF EXISTS saved_cart_items');
    await dbPool.query('DROP TABLE IF EXISTS coupon_usages');
    await dbPool.query('DROP TABLE IF EXISTS cart');
    await dbPool.query('DROP TABLE IF EXISTS coupons');

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        coupon_id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(64) UNIQUE NOT NULL,
        discount_type VARCHAR(32) NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        minimum_order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        maximum_discount DECIMAL(10,2) NOT NULL DEFAULT 999999.00,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        usage_limit INT NOT NULL DEFAULT 1000,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS coupon_usages (
        usage_id VARCHAR(64) PRIMARY KEY,
        coupon_id VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64) NOT NULL,
        order_id VARCHAR(64) NOT NULL,
        discount_amount DECIMAL(10,2) NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coupon_id) REFERENCES coupons(coupon_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS cart (
        cart_id VARCHAR(64) PRIMARY KEY,
        customer_id VARCHAR(64) NULL,
        session_id VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        currency VARCHAR(8) NOT NULL DEFAULT 'INR',
        coupon_code VARCHAR(64) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_customer_cart (customer_id),
        UNIQUE KEY uq_session_cart (session_id)
      );
    `);

    try {
      await dbPool.query("ALTER TABLE admin_users ADD COLUMN category_access VARCHAR(512) NOT NULL DEFAULT 'ALL'");
    } catch (e) {}
    try {
      await dbPool.query("ALTER TABLE inventory ADD COLUMN damaged_stock INT NOT NULL DEFAULT 0");
    } catch (e) {}
    try {
      await dbPool.query("ALTER TABLE inventory ADD COLUMN reorder_level INT NOT NULL DEFAULT 20");
    } catch (e) {}

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        cart_item_id VARCHAR(64) PRIMARY KEY,
        cart_id VARCHAR(64) NOT NULL,
        product_id VARCHAR(64) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_cart_product (cart_id, product_id)
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS saved_cart_items (
        saved_item_id VARCHAR(64) PRIMARY KEY,
        cart_id VARCHAR(64) NOT NULL,
        product_id VARCHAR(64) NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_saved_product (cart_id, product_id)
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS recently_viewed (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64) NULL,
        product_id VARCHAR(64) NOT NULL,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        search_id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64) NULL,
        query VARCHAR(255) NOT NULL,
        result_count INT DEFAULT 0,
        searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        image_id VARCHAR(64) PRIMARY KEY,
        product_id VARCHAR(64) NOT NULL,
        image_url VARCHAR(512) NOT NULL,
        image_type VARCHAR(32) NOT NULL,
        display_order INT DEFAULT 1,
        alt_text VARCHAR(255)
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS product_specifications (
        spec_id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(64) NOT NULL,
        spec_name VARCHAR(128) NOT NULL,
        spec_value VARCHAR(255) NOT NULL
      );
    `);

    await dbPool.query('DROP TABLE IF EXISTS wishlist');
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        wishlist_id VARCHAR(64) PRIMARY KEY,
        customer_id VARCHAR(64) NULL,
        session_id VARCHAR(64) NOT NULL,
        product_id VARCHAR(64) NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        removed_at DATETIME NULL,
        UNIQUE KEY uq_customer_product (customer_id, product_id),
        UNIQUE KEY uq_session_product (session_id, product_id)
      );
    `);

    // Drop tables using a single connection to maintain SET FOREIGN_KEY_CHECKS = 0
    const dropConn = await dbPool.getConnection();
    try {
      await dropConn.query('SET FOREIGN_KEY_CHECKS = 0');
      await dropConn.query('DROP TABLE IF EXISTS admin_audit_logs');
      await dropConn.query('DROP TABLE IF EXISTS admin_sessions');
      await dropConn.query('DROP TABLE IF EXISTS admin_users');
      await dropConn.query('DROP TABLE IF EXISTS role_permissions');
      await dropConn.query('DROP TABLE IF EXISTS permissions');
      await dropConn.query('DROP TABLE IF EXISTS roles');
      await dropConn.query('DROP TABLE IF EXISTS support_ticket_messages');
      await dropConn.query('DROP TABLE IF EXISTS support_tickets');
      await dropConn.query('DROP TABLE IF EXISTS help_articles');
      await dropConn.query('DROP TABLE IF EXISTS notifications');
      await dropConn.query('DROP TABLE IF EXISTS order_addresses');
      await dropConn.query('DROP TABLE IF EXISTS order_cancellations');
      await dropConn.query('DROP TABLE IF EXISTS review_media');
      await dropConn.query('DROP TABLE IF EXISTS reviews');
      await dropConn.query('DROP TABLE IF EXISTS refunds');
      await dropConn.query('DROP TABLE IF EXISTS return_items');
      await dropConn.query('DROP TABLE IF EXISTS returns');
      await dropConn.query('DROP TABLE IF EXISTS invoice_items');
      await dropConn.query('DROP TABLE IF EXISTS invoices');
      await dropConn.query('DROP TABLE IF EXISTS shipment_tracking_events');
      await dropConn.query('DROP TABLE IF EXISTS shipments');
      await dropConn.query('DROP TABLE IF EXISTS payment_attempts');
      await dropConn.query('DROP TABLE IF EXISTS payments');
      await dropConn.query('DROP TABLE IF EXISTS order_items');
      await dropConn.query('DROP TABLE IF EXISTS orders');
      await dropConn.query('DROP TABLE IF EXISTS delivery_options');
      await dropConn.query('DROP TABLE IF EXISTS addresses');
      await dropConn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      dropConn.release();
    }

    // Create Addresses Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        address_id VARCHAR(64) PRIMARY KEY,
        customer_id VARCHAR(64) NOT NULL,
        address_type VARCHAR(32) NOT NULL,
        full_name VARCHAR(128) NOT NULL,
        phone VARCHAR(32) NOT NULL,
        address_line_1 VARCHAR(255) NOT NULL,
        address_line_2 VARCHAR(255) NULL,
        city VARCHAR(128) NOT NULL,
        state VARCHAR(128) NOT NULL,
        postal_code VARCHAR(32) NOT NULL,
        country VARCHAR(128) NOT NULL DEFAULT 'India',
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      );
    `);

    // Create Delivery Options Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS delivery_options (
        delivery_option_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        delivery_days_min INT NOT NULL,
        delivery_days_max INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
      );
    `);

    // Create Orders Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR(64) PRIMARY KEY,
        customer_id VARCHAR(64) NOT NULL,
        session_id VARCHAR(64) NOT NULL,
        address_id VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        subtotal DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        coupon_discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        tax DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_status VARCHAR(32) NOT NULL DEFAULT 'UNPAID',
        delivery_status VARCHAR(32) NOT NULL DEFAULT 'NOT_SHIPPED',
        coupon_code VARCHAR(64) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
        FOREIGN KEY (address_id) REFERENCES addresses(address_id)
      );
    `);

    // Create Order Items Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        order_item_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        product_id VARCHAR(64) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        final_price DECIMAL(10,2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
      );
    `);

    // Create Order Addresses Registry (Historical Snapshot)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS order_addresses (
        order_address_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        address_type VARCHAR(32) NOT NULL,
        full_name VARCHAR(128) NOT NULL,
        phone VARCHAR(32) NOT NULL,
        address_line_1 VARCHAR(255) NOT NULL,
        address_line_2 VARCHAR(255) NULL,
        city VARCHAR(128) NOT NULL,
        state VARCHAR(128) NOT NULL,
        postal_code VARCHAR(32) NOT NULL,
        country VARCHAR(128) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
      );
    `);

    // Create Payments Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(16) NOT NULL DEFAULT 'INR',
        status VARCHAR(32) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      );
    `);

    // Create Payment Attempts Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS payment_attempts (
        attempt_id VARCHAR(64) PRIMARY KEY,
        payment_id VARCHAR(64) NOT NULL,
        attempt_number INT NOT NULL,
        payment_method VARCHAR(64) NOT NULL,
        transaction_reference VARCHAR(128) NULL,
        status VARCHAR(32) NOT NULL,
        failure_reason VARCHAR(255) NULL,
        gateway VARCHAR(64) NOT NULL DEFAULT 'RetailHub-Sim',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
      );
    `);

    // Create Shipments Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        shipment_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64) NOT NULL,
        warehouse_id VARCHAR(64) NOT NULL,
        carrier_id VARCHAR(64) NOT NULL,
        tracking_number VARCHAR(128) NOT NULL,
        shipment_status VARCHAR(64) NOT NULL DEFAULT 'CREATED',
        origin_city VARCHAR(128) NOT NULL,
        origin_state VARCHAR(128) NOT NULL,
        origin_country VARCHAR(128) NOT NULL DEFAULT 'India',
        destination_city VARCHAR(128) NOT NULL,
        destination_state VARCHAR(128) NOT NULL,
        destination_country VARCHAR(128) NOT NULL DEFAULT 'India',
        estimated_delivery DATE NOT NULL,
        actual_delivery DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        shipped_at DATETIME NULL,
        delivered_at DATETIME NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      );
    `);

    // Create Shipment Tracking Events History Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS shipment_tracking_events (
        tracking_event_id VARCHAR(64) PRIMARY KEY,
        shipment_id VARCHAR(64) NOT NULL,
        order_id VARCHAR(64) NOT NULL,
        status VARCHAR(64) NOT NULL,
        location_city VARCHAR(128) NOT NULL,
        location_state VARCHAR(128) NOT NULL,
        location_country VARCHAR(128) NOT NULL DEFAULT 'India',
        facility_id VARCHAR(64) NULL,
        description VARCHAR(255) NOT NULL,
        event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id),
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
      );
    `);

    // Create Invoices Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        invoice_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64) NOT NULL,
        invoice_number VARCHAR(128) NOT NULL UNIQUE,
        invoice_date DATE NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(16) NOT NULL DEFAULT 'INR',
        payment_status VARCHAR(64) NOT NULL,
        payment_method VARCHAR(64) NOT NULL,
        billing_address_id VARCHAR(64) NOT NULL,
        shipping_address_id VARCHAR(64) NOT NULL,
        pdf_path VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      );
    `);

    // Create Invoice Items History Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        invoice_item_id VARCHAR(64) PRIMARY KEY,
        invoice_id VARCHAR(64) NOT NULL,
        order_item_id VARCHAR(64) NOT NULL,
        product_id VARCHAR(64) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        sku VARCHAR(128) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        line_total DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
        FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id)
      );
    `);

    // Create Returns Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS returns (
        return_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64) NOT NULL,
        return_status VARCHAR(64) NOT NULL DEFAULT 'REQUESTED',
        return_reason VARCHAR(128) NOT NULL,
        customer_comments TEXT NULL,
        pickup_address_id VARCHAR(64) NOT NULL,
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME NULL,
        rejected_at DATETIME NULL,
        picked_up_at DATETIME NULL,
        received_at DATETIME NULL,
        completed_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      );
    `);

    // Create Return Items Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS return_items (
        return_item_id VARCHAR(64) PRIMARY KEY,
        return_id VARCHAR(64) NOT NULL,
        order_item_id VARCHAR(64) NOT NULL,
        product_id VARCHAR(64) NOT NULL,
        quantity INT NOT NULL,
        item_price DECIMAL(10,2) NOT NULL,
        refund_amount DECIMAL(10,2) NOT NULL,
        inspection_status VARCHAR(64) NOT NULL DEFAULT 'PENDING',
        FOREIGN KEY (return_id) REFERENCES returns(return_id),
        FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id),
        FOREIGN KEY (product_id) REFERENCES products(product_id)
      );
    `);

    // Create Refunds Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS refunds (
        refund_id VARCHAR(64) PRIMARY KEY,
        return_id VARCHAR(64) NOT NULL,
        order_id VARCHAR(64) NOT NULL,
        payment_id VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64) NOT NULL,
        refund_method VARCHAR(64) NOT NULL,
        refund_amount DECIMAL(10,2) NOT NULL,
        refund_status VARCHAR(64) NOT NULL DEFAULT 'PENDING',
        refund_reference VARCHAR(128) NULL,
        failure_reason VARCHAR(255) NULL,
        initiated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (return_id) REFERENCES returns(return_id),
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      );
    `);

    // Create Reviews Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        review_id VARCHAR(64) PRIMARY KEY,
        customer_id VARCHAR(64) NOT NULL,
        order_id VARCHAR(64) NULL,
        order_item_id VARCHAR(64) NULL,
        product_id VARCHAR(64) NOT NULL,
        rating INT NOT NULL,
        review_title VARCHAR(255) NOT NULL,
        review_text TEXT NOT NULL,
        verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
        review_status VARCHAR(64) NOT NULL DEFAULT 'PUBLISHED',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id),
        FOREIGN KEY (product_id) REFERENCES products(product_id)
      );
    `);

    // Create Review Media Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS review_media (
        media_id VARCHAR(64) PRIMARY KEY,
        review_id VARCHAR(64) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        media_type VARCHAR(64) NOT NULL DEFAULT 'IMAGE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (review_id) REFERENCES reviews(review_id)
      );
    `);

    // Create Order Cancellations Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS order_cancellations (
        cancellation_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64) NOT NULL,
        reason VARCHAR(128) NOT NULL,
        refund_required BOOLEAN NOT NULL DEFAULT FALSE,
        refund_id VARCHAR(64) NULL,
        cancelled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      );
    `);

    // Create Notifications Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id VARCHAR(64) PRIMARY KEY,
        customer_id VARCHAR(64) NOT NULL,
        notification_type VARCHAR(64) NOT NULL,
        notification_category VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        reference_type VARCHAR(64) NULL,
        reference_id VARCHAR(64) NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      );
    `);

    // Create Help Articles Registry (FAQs)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS help_articles (
        article_id VARCHAR(64) PRIMARY KEY,
        category VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        keywords VARCHAR(255) NOT NULL,
        status VARCHAR(32) DEFAULT 'PUBLISHED',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create Support Tickets Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        ticket_id VARCHAR(64) PRIMARY KEY,
        customer_id VARCHAR(64) NOT NULL,
        order_id VARCHAR(64) NULL,
        category VARCHAR(64) NOT NULL,
        priority VARCHAR(32) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(64) DEFAULT 'OPEN',
        assigned_admin_id VARCHAR(64) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        resolved_at DATETIME NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      );
    `);

    // Create Support Ticket Messages Registry (Chat Threads)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS support_ticket_messages (
        message_id VARCHAR(64) PRIMARY KEY,
        ticket_id VARCHAR(64) NOT NULL,
        sender_type VARCHAR(32) NOT NULL,
        sender_id VARCHAR(64) NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id)
      );
    `);

    // Create Simulation Runs Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS simulation_runs (
        run_id VARCHAR(64) PRIMARY KEY,
        users INT NOT NULL DEFAULT 100,
        target_rate INT NOT NULL DEFAULT 50,
        rate_unit VARCHAR(32) NOT NULL DEFAULT '/sec',
        duration VARCHAR(32) NOT NULL DEFAULT '5 min',
        traffic_profile VARCHAR(64) NOT NULL DEFAULT 'Mixed / Realistic',
        total_events INT DEFAULT 0,
        orders INT DEFAULT 0,
        payments INT DEFAULT 0,
        returns INT DEFAULT 0,
        invalid INT DEFAULT 0,
        duplicates INT DEFAULT 0,
        late INT DEFAULT 0,
        status VARCHAR(64) NOT NULL,
        started_at DATETIME NOT NULL,
        ended_at DATETIME NULL
      );
    `);

    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN users INT NOT NULL DEFAULT 100'); } catch (e) {}
    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN target_rate INT NOT NULL DEFAULT 50'); } catch (e) {}
    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN rate_unit VARCHAR(32) NOT NULL DEFAULT "/sec"'); } catch (e) {}
    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN duration VARCHAR(32) NOT NULL DEFAULT "5 min"'); } catch (e) {}
    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN traffic_profile VARCHAR(64) NOT NULL DEFAULT "Mixed / Realistic"'); } catch (e) {}
    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN total_events INT DEFAULT 0'); } catch (e) {}
    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN orders INT DEFAULT 0'); } catch (e) {}
    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN payments INT DEFAULT 0'); } catch (e) {}
    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN returns INT DEFAULT 0'); } catch (e) {}
    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN invalid INT DEFAULT 0'); } catch (e) {}
    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN duplicates INT DEFAULT 0'); } catch (e) {}
    try { await dbPool.query('ALTER TABLE simulation_runs ADD COLUMN late INT DEFAULT 0'); } catch (e) {}

    // Create Roles Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        description TEXT NULL
      );
    `);

    // Create Permissions Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        permission_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        description TEXT NULL
      );
    `);

    // Create Role Permissions Map
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id VARCHAR(64) NOT NULL,
        permission_id VARCHAR(64) NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(role_id),
        FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
      );
    `);

    // Create Admin Users Registry
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        admin_id VARCHAR(64) PRIMARY KEY,
        first_name VARCHAR(128) NOT NULL,
        last_name VARCHAR(128) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role_id VARCHAR(64) NOT NULL,
        category_access VARCHAR(512) NOT NULL DEFAULT 'ALL',
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        last_login_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
      );
    `);

    // Create Admin Sessions Log
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        admin_id VARCHAR(64) NOT NULL,
        login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        logout_at DATETIME NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        FOREIGN KEY (admin_id) REFERENCES admin_users(admin_id)
      );
    `);

    // Create Admin Audit Logs
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        audit_id VARCHAR(64) PRIMARY KEY,
        admin_id VARCHAR(64) NOT NULL,
        action VARCHAR(128) NOT NULL,
        entity_type VARCHAR(64) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        old_value TEXT NULL,
        new_value TEXT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES admin_users(admin_id)
      );
    `);

    // Perform database seed check
    await seedDatabaseIfNeeded();

  } catch (error: any) {
    console.warn(`[MySQL DB Warning] Could not connect to MySQL server at ${MYSQL_HOST}:${MYSQL_PORT} (${error.message}).`);
    console.warn(`[MySQL DB Warning] Operating in in-memory mode.`);
    isInMemoryFallback = true;
    seedInMemoryData();
  }
}

// ----------------------------------------------------
// DATABASE SEED GENERATOR
// ----------------------------------------------------
const SUBCATEGORIES_MAP: Record<string, Array<{ name: string; slug: string }>> = {
  'CAT001': [
    { name: 'Headphones', slug: 'headphones' },
    { name: 'Speakers', slug: 'speakers' },
    { name: 'Smart Devices', slug: 'smart-devices' },
    { name: 'Cameras', slug: 'cameras' },
    { name: 'Wearables', slug: 'wearables' }
  ],
  'CAT002': [
    { name: 'T-Shirts', slug: 't-shirts' },
    { name: 'Jackets', slug: 'jackets' },
    { name: 'Jeans', slug: 'jeans' },
    { name: 'Dresses', slug: 'dresses' },
    { name: 'Socks', slug: 'socks' }
  ],
  'CAT003': [
    { name: 'Chairs', slug: 'chairs' },
    { name: 'Sofas', slug: 'sofas' },
    { name: 'Study Tables', slug: 'study-tables' },
    { name: 'Lighting', slug: 'lighting' },
    { name: 'Mattresses', slug: 'mattresses' }
  ],
  'CAT004': [
    { name: 'Beverages', slug: 'beverages' },
    { name: 'Organic Honey', slug: 'organic-honey' },
    { name: 'Oats & Cereals', slug: 'oats-cereals' },
    { name: 'Cooking Oils', slug: 'cooking-oils' },
    { name: 'Snacks', slug: 'snacks' }
  ],
  'CAT005': [
    { name: 'Face Creams', slug: 'face-creams' },
    { name: 'Hair Shampoos', slug: 'hair-shampoos' },
    { name: 'Lipsticks', slug: 'lipsticks' },
    { name: 'Perfumes', slug: 'perfumes' },
    { name: 'Body Lotions', slug: 'body-lotions' }
  ],
  'CAT006': [
    { name: 'Yoga Mats', slug: 'yoga-mats' },
    { name: 'Dumbbells', slug: 'dumbbells' },
    { name: 'Running Tracksuits', slug: 'running-tracksuits' },
    { name: 'Shakers', slug: 'shakers' },
    { name: 'Sports Balls', slug: 'sports-balls' }
  ],
  'CAT007': [
    { name: 'Fiction Novels', slug: 'fiction-novels' },
    { name: 'Self-Help', slug: 'self-help' },
    { name: 'Biographies', slug: 'biographies' },
    { name: 'Science Fiction', slug: 'science-fiction' },
    { name: 'History Books', slug: 'history-books' }
  ],
  'CAT008': [
    { name: 'LEGO Sets', slug: 'lego-sets' },
    { name: 'Action Figures', slug: 'action-figures' },
    { name: 'Board Games', slug: 'board-games' },
    { name: 'Card Games', slug: 'card-games' },
    { name: 'Toy Cars', slug: 'toy-cars' }
  ],
  'CAT009': [
    { name: 'Engine Oils', slug: 'engine-oils' },
    { name: 'Car Cleaners', slug: 'car-cleaners' },
    { name: 'Phone Mounts', slug: 'phone-mounts' },
    { name: 'Floor Mats', slug: 'floor-mats' },
    { name: 'Seat Covers', slug: 'seat-covers' }
  ],
  'CAT010': [
    { name: 'Laptops', slug: 'laptops' },
    { name: 'Keyboards', slug: 'keyboards' },
    { name: 'Monitors', slug: 'monitors' },
    { name: 'Mice', slug: 'mice' },
    { name: 'Solid State Drives', slug: 'ssds' }
  ],
  'CAT011': [
    { name: 'Smartphones', slug: 'smartphones' },
    { name: 'Tablets', slug: 'tablets' },
    { name: 'Power Banks', slug: 'power-banks' },
    { name: 'Back Covers', slug: 'back-covers' },
    { name: 'Charging Cables', slug: 'charging-cables' }
  ],
  'CAT012': [
    { name: 'Smart TVs', slug: 'smart-tvs' },
    { name: 'Air Conditioners', slug: 'air-conditioners' },
    { name: 'Refrigerators', slug: 'refrigerators' },
    { name: 'Washing Machines', slug: 'washing-machines' },
    { name: 'Microwaves', slug: 'microwaves' }
  ],
  'CAT013': [
    { name: 'Pressure Cookers', slug: 'pressure-cookers' },
    { name: 'Non-stick Pans', slug: 'non-stick-pans' },
    { name: 'Mixers & Grinders', slug: 'mixers-grinders' },
    { name: 'Water Bottles', slug: 'water-bottles' },
    { name: 'Knife Sets', slug: 'knife-sets' }
  ],
  'CAT014': [
    { name: 'Notebooks', slug: 'notebooks' },
    { name: 'Gel Pens', slug: 'gel-pens' },
    { name: 'Desk Organizers', slug: 'desk-organizers' },
    { name: 'Staplers', slug: 'staplers' },
    { name: 'Calculators', slug: 'calculators' }
  ],
  'CAT015': [
    { name: 'Whey Proteins', slug: 'whey-proteins' },
    { name: 'Multivitamins', slug: 'multivitamins' },
    { name: 'Fish Oil Caps', slug: 'fish-oil-caps' },
    { name: 'Green Tea', slug: 'green-tea' },
    { name: 'Herbal Juices', slug: 'herbal-juices' }
  ],
  'CAT016': [
    { name: 'Baby Diapers', slug: 'baby-diapers' },
    { name: 'Baby Oils', slug: 'baby-oils' },
    { name: 'Wipes', slug: 'wipes' },
    { name: 'Baby Swings', slug: 'baby-swings' },
    { name: 'Baby Teethers', slug: 'baby-teethers' }
  ],
  'CAT017': [
    { name: 'Dog Food', slug: 'dog-food' },
    { name: 'Cat Litter', slug: 'cat-litter' },
    { name: 'Pet Collars', slug: 'pet-collars' },
    { name: 'Chew Toys', slug: 'chew-toys' },
    { name: 'Pet Shampoos', slug: 'pet-shampoos' }
  ],
  'CAT018': [
    { name: 'Sneakers', slug: 'sneakers' },
    { name: 'Running Shoes', slug: 'running-shoes' },
    { name: 'Leather Belts', slug: 'leather-belts' },
    { name: 'Sunglasses', slug: 'sunglasses' },
    { name: 'Backpacks', slug: 'backpacks' }
  ],
  'CAT019': [
    { name: 'Smart Watches', slug: 'smart-watches' },
    { name: 'Analog Watches', slug: 'analog-watches' },
    { name: 'Silver Rings', slug: 'silver-rings' },
    { name: 'Pendant Necklaces', slug: 'pendant-necklaces' },
    { name: 'Cufflinks', slug: 'cufflinks' }
  ],
  'CAT020': [
    { name: 'Camping Tents', slug: 'camping-tents' },
    { name: 'Sleeping Bags', slug: 'sleeping-bags' },
    { name: 'Trekking Poles', slug: 'trekking-poles' },
    { name: 'Flasks & Bottles', slug: 'flasks-bottles' },
    { name: 'Compass & Tools', slug: 'compass-tools' }
  ]
};

async function seedDatabaseIfNeeded() {
  if (!dbPool) return;

  // Check if roles are populated, seed if empty
  const [existingRoles]: any = await dbPool.query('SELECT COUNT(*) as count FROM roles');
  if (!existingRoles[0] || existingRoles[0].count === 0) {
    console.log('[MySQL DB] Seeding default roles...');
    const roleValues = [
      ['SUPER_ADMIN', 'Super Administrator', 'Full platform administrative privileges.'],
      ['PRODUCT_MANAGER', 'Product Manager', 'Manage products, categories, and descriptions.'],
      ['INVENTORY_MANAGER', 'Inventory Manager', 'Manage inventory, stock levels, and warehouses.'],
      ['ORDER_MANAGER', 'Order Manager', 'Manage customer orders, shipments, returns, and refunds.'],
      ['CUSTOMER_SUPPORT', 'Customer Support Specialist', 'Manage customer details, support tickets, and chat threads.'],
      ['REVIEW_MANAGER', 'Review Manager', 'Moderate and manage customer reviews.'],
      ['ANALYST', 'Data Analyst', 'Read-only access to operational logs and dashboard metrics.']
    ];
    await dbPool.query('INSERT INTO roles (role_id, name, description) VALUES ?', [roleValues]);
  }

  // Check if permissions are populated, seed if empty
  const [existingPermissions]: any = await dbPool.query('SELECT COUNT(*) as count FROM permissions');
  if (!existingPermissions[0] || existingPermissions[0].count === 0) {
    console.log('[MySQL DB] Seeding default permissions...');
    const permissionValues = [
      ['PRODUCT_CREATE', 'Create Product', 'Add new products to catalog.'],
      ['PRODUCT_READ', 'Read Product', 'View product details.'],
      ['PRODUCT_UPDATE', 'Update Product', 'Edit existing products.'],
      ['PRODUCT_DELETE', 'Delete Product', 'Remove products from database.'],
      ['INVENTORY_READ', 'Read Inventory', 'View warehouse stock counts.'],
      ['INVENTORY_UPDATE', 'Update Inventory', 'Edit stock levels.'],
      ['ORDER_READ', 'Read Order', 'View order metrics.'],
      ['ORDER_UPDATE', 'Update Order', 'Update shipping/delivery status.'],
      ['ORDER_CANCEL', 'Cancel Order', 'Cancel active orders.'],
      ['CUSTOMER_READ', 'Read Customer', 'View customer details.'],
      ['REVIEW_READ', 'Read Review', 'View product reviews.'],
      ['REVIEW_APPROVE', 'Approve Review', 'Approve pending reviews.'],
      ['REVIEW_REJECT', 'Reject Review', 'Reject product reviews.'],
      ['ANALYTICS_READ', 'Read Analytics', 'View operational charts.'],
      ['SIMULATOR_RUN', 'Run Simulator', 'Generate virtual load behavior.'],
      ['SYSTEM_MONITOR', 'System Monitor', 'Monitor pipeline health.']
    ];
    await dbPool.query('INSERT INTO permissions (permission_id, name, description) VALUES ?', [permissionValues]);

    // Seed Role Permissions join mapping
    console.log('[MySQL DB] Mapping role permissions...');
    const mappingValues: string[][] = [];
    
    // SUPER_ADMIN gets everything
    const allPerms = permissionValues.map(p => p[0]);
    allPerms.forEach(p => mappingValues.push(['SUPER_ADMIN', p]));

    // PRODUCT_MANAGER permissions
    ['PRODUCT_CREATE', 'PRODUCT_READ', 'PRODUCT_UPDATE', 'PRODUCT_DELETE'].forEach(p => {
      mappingValues.push(['PRODUCT_MANAGER', p]);
    });

    // INVENTORY_MANAGER permissions
    ['INVENTORY_READ', 'INVENTORY_UPDATE', 'SYSTEM_MONITOR'].forEach(p => {
      mappingValues.push(['INVENTORY_MANAGER', p]);
    });

    // ORDER_MANAGER permissions
    ['ORDER_READ', 'ORDER_UPDATE', 'ORDER_CANCEL'].forEach(p => {
      mappingValues.push(['ORDER_MANAGER', p]);
    });

    // CUSTOMER_SUPPORT permissions
    ['CUSTOMER_READ', 'ORDER_READ', 'ORDER_UPDATE'].forEach(p => {
      mappingValues.push(['CUSTOMER_SUPPORT', p]);
    });

    // ANALYST permissions
    ['ANALYTICS_READ', 'SYSTEM_MONITOR', 'PRODUCT_READ', 'INVENTORY_READ', 'ORDER_READ'].forEach(p => {
      mappingValues.push(['ANALYST', p]);
    });

    await dbPool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [mappingValues]);
  }

  // Check if admin_users are populated, seed if empty
  const [existingAdmins]: any = await dbPool.query('SELECT COUNT(*) as count FROM admin_users WHERE email = "admin@retailhub.com"');
  if (!existingAdmins[0] || existingAdmins[0].count === 0) {
    console.log('[MySQL DB] Seeding default administrator...');
    const defaultPassword = 'adminpassword123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    await dbPool.query(
      `INSERT INTO admin_users (admin_id, first_name, last_name, email, password_hash, role_id, status)
       VALUES ('ADM001', 'System', 'Administrator', 'admin@retailhub.com', ?, 'SUPER_ADMIN', 'ACTIVE')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      [passwordHash]
    );
  }

  // Ensure default customers exist in database
  const custPassHash = await bcrypt.hash('password123', 10);
  const [existingWalslat]: any = await dbPool.query('SELECT COUNT(*) as count FROM customers WHERE email = "walslat1802@gmail.com"');
  if (!existingWalslat[0] || existingWalslat[0].count === 0) {
    await dbPool.query(
      `INSERT INTO customers (
        customer_id, first_name, last_name, email, phone, password_hash, country, state, city, language, membership, preferred_payment, account_status
      ) VALUES ('CUST1802', 'Walslat', 'User', 'walslat1802@gmail.com', '9876543210', ?, 'India', 'Karnataka', 'Bengaluru', 'English', 'Standard', 'UPI', 'ACTIVE')
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      [custPassHash]
    );
  }

  // Check if delivery_options are populated, seed if empty
  const [existingDeliveryOpts]: any = await dbPool.query('SELECT COUNT(*) as count FROM delivery_options');
  if (!existingDeliveryOpts[0] || existingDeliveryOpts[0].count === 0) {
    console.log('[MySQL DB] Seeding default delivery options...');
    const deliveryOptionValues = [
      ['D1', 'Standard Delivery', 3, 5, 0.00, 'ACTIVE'],
      ['D2', 'Fast Delivery', 1, 2, 99.00, 'ACTIVE'],
      ['D3', 'Same Day', 0, 1, 199.00, 'ACTIVE']
    ];
    await dbPool.query('INSERT INTO delivery_options (delivery_option_id, name, delivery_days_min, delivery_days_max, price, status) VALUES ?', [deliveryOptionValues]);
  }

  // Check if coupons are populated, seed if empty
  const [existingCoupons]: any = await dbPool.query('SELECT COUNT(*) as count FROM coupons');
  if (!existingCoupons[0] || existingCoupons[0].count === 0) {
    console.log('[MySQL DB] Seeding default coupons...');
    const couponValues = [
      ['COUP001', 'SAVE10', 'percentage', 10.00, 1000.00, 500.00, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1000, 'ACTIVE'],
      ['COUP002', 'NEXDAY500', 'flat', 500.00, 3000.00, 500.00, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1000, 'ACTIVE'],
      ['COUP003', 'FIRSTBUY', 'percentage', 15.00, 500.00, 300.00, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1000, 'ACTIVE']
    ];
    await dbPool.query('INSERT INTO coupons (coupon_id, code, discount_type, discount_value, minimum_order_value, maximum_discount, start_date, end_date, usage_limit, status) VALUES ?', [couponValues]);
  }

  // Check if help_articles are populated, seed if empty
  const [existingHelpArticles]: any = await dbPool.query('SELECT COUNT(*) as count FROM help_articles');
  if (!existingHelpArticles[0] || existingHelpArticles[0].count === 0) {
    console.log('[MySQL DB] Seeding default help articles (FAQs)...');
    const helpArticlesValues = [
      ['FAQ001', 'ORDERS', 'How do I cancel my order?', 'You can cancel any order directly from your Orders page before it reaches an irreversible delivery stage. Open your orders, click on the target order, and select the pre-delivery cancel button.', 'cancel order, cancellation policy, cancel order request', 'PUBLISHED'],
      ['FAQ002', 'REFUNDS', 'How long does a refund take?', 'Refunds are initiated immediately upon return approval or cancellation. UPI and card refunds usually reflect in your account within 3 to 5 business days, depending on your bank.', 'refund delay, where is my refund, return refund time', 'PUBLISHED'],
      ['FAQ003', 'DELIVERY', 'Where is my order tracking information?', 'Once your order is dispatched, you can live-track its status on the Order Tracking screen. Deep links are available on your Orders list and in your transaction notifications feed.', 'track package, live tracking, order location', 'PUBLISHED'],
      ['FAQ004', 'PAYMENTS', 'Why did my payment fail?', 'Payment failures usually happen due to bank timeout, incorrect CVV/OTP entry, or insufficient funds. In case of failure, you can retry from checkout or select cash on delivery.', 'payment failure, decline transaction, retry checkout', 'PUBLISHED'],
      ['FAQ005', 'ACCOUNT', 'How do I update my shipping addresses?', 'You can manage your delivery addresses inside your Profile dashboard. Select "Addresses Book" to add, edit, or set default delivery destinations.', 'change address, billing details, edit location', 'PUBLISHED']
    ];
    await dbPool.query('INSERT INTO help_articles (article_id, category, title, content, keywords, status) VALUES ?', [helpArticlesValues]);
  }

  // Check if categories are already populated
  const [existingCats]: any = await dbPool.query('SELECT COUNT(*) as count FROM categories');
  if (existingCats[0] && existingCats[0].count > 0) {
    console.log('[MySQL DB] Database is already seeded. Skipping initial seeding.');
    return;
  }

  // Clear existing catalog data to re-seed with updated realistic pricing segments
  console.log('[MySQL DB] Clearing old catalog records...');
  await dbPool.query('SET FOREIGN_KEY_CHECKS = 0');
  await dbPool.query('TRUNCATE TABLE products');
  await dbPool.query('TRUNCATE TABLE categories');
  await dbPool.query('TRUNCATE TABLE subcategories');
  await dbPool.query('TRUNCATE TABLE sellers');
  await dbPool.query('TRUNCATE TABLE warehouses');
  await dbPool.query('TRUNCATE TABLE inventory');
  await dbPool.query('TRUNCATE TABLE homepage_banners');
  await dbPool.query('TRUNCATE TABLE product_images');
  await dbPool.query('TRUNCATE TABLE product_specifications');
  await dbPool.query('TRUNCATE TABLE reviews');
  await dbPool.query('TRUNCATE TABLE wishlist');
  await dbPool.query('TRUNCATE TABLE cart');
  await dbPool.query('TRUNCATE TABLE cart_items');
  await dbPool.query('TRUNCATE TABLE saved_cart_items');
  await dbPool.query('TRUNCATE TABLE coupons');
  await dbPool.query('TRUNCATE TABLE payments');
  await dbPool.query('TRUNCATE TABLE order_items');
  await dbPool.query('TRUNCATE TABLE orders');
  await dbPool.query('TRUNCATE TABLE delivery_options');
  await dbPool.query('TRUNCATE TABLE addresses');
  await dbPool.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('[MySQL DB] Starting generation of 1,000 products...');

  // 1. Seed Categories
  const categoryInsertQuery = `
    INSERT INTO categories (category_id, name, slug, description, image_url, product_count, display_order, status)
    VALUES ?
  `;
  const categoryValues = CATEGORIES_LIST.map((c, i) => [
    c.id, c.name, c.slug, c.desc, `/images/categories/${c.slug}.jpg`, 50, i + 1, 'ACTIVE'
  ]);
  await dbPool.query(categoryInsertQuery, [categoryValues]);

  // Seed Coupons
  const couponValues = [
    ['COUP001', 'SAVE10', 'percentage', 10.00, 1000.00, 500.00, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1000, 'ACTIVE'],
    ['COUP002', 'NEXDAY500', 'flat', 500.00, 3000.00, 500.00, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1000, 'ACTIVE'],
    ['COUP003', 'FIRSTBUY', 'percentage', 15.00, 500.00, 300.00, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1000, 'ACTIVE']
  ];
  await dbPool.query('INSERT INTO coupons (coupon_id, code, discount_type, discount_value, minimum_order_value, maximum_discount, start_date, end_date, usage_limit, status) VALUES ?', [couponValues]);

  // Seed Delivery Options
  const deliveryOptionValues = [
    ['D1', 'Standard Delivery', 3, 5, 0.00, 'ACTIVE'],
    ['D2', 'Fast Delivery', 1, 2, 99.00, 'ACTIVE'],
    ['D3', 'Same Day', 0, 1, 199.00, 'ACTIVE']
  ];
  await dbPool.query('INSERT INTO delivery_options (delivery_option_id, name, delivery_days_min, delivery_days_max, price, status) VALUES ?', [deliveryOptionValues]);

  // 2. Seed Subcategories
  const subcategoryValues: any[] = [];
  CATEGORIES_LIST.forEach((c) => {
    const list = SUBCATEGORIES_MAP[c.id] || [];
    list.forEach((sub, i) => {
      subcategoryValues.push([
        `SUB-${c.id}-${i + 1}`,
        c.id,
        sub.name,
        sub.slug
      ]);
    });
  });
  await dbPool.query('INSERT INTO subcategories (subcategory_id, category_id, name, slug) VALUES ?', [subcategoryValues]);

  // 3. Seed Sellers
  const sellerValues: any[] = [];
  for (let i = 1; i <= 20; i++) {
    sellerValues.push([
      `SELLER${String(i).padStart(3, '0')}`,
      `Enterprise Seller ${i}`,
      Number((3.5 + Math.random() * 1.5).toFixed(2)),
      'ACTIVE'
    ]);
  }
  await dbPool.query('INSERT INTO sellers (seller_id, name, rating, status) VALUES ?', [sellerValues]);

  // 4. Seed Warehouses
  const warehouseValues = [
    ['WH001', 'Warehouse Bengaluru', 'Bengaluru, Karnataka'],
    ['WH002', 'Warehouse Mumbai', 'Mumbai, Maharashtra'],
    ['WH003', 'Warehouse Delhi', 'New Delhi, Delhi'],
    ['WH004', 'Warehouse Hyderabad', 'Hyderabad, Telangana'],
    ['WH005', 'Warehouse Chennai', 'Chennai, Tamil Nadu']
  ];
  await dbPool.query('INSERT INTO warehouses (warehouse_id, name, location) VALUES ?', [warehouseValues]);

  // 5. Seed Banners
  const bannerValues = [
    ['Festival Mega Sale', 'Up to 60% Off Electronics & Fashion', '/images/hero/hero_banner.jpg', '/home', 'ACTIVE'],
    ['Back To School Campaign', 'Flat 20% Off study desks and accessories', '/images/hero/hero_banner.jpg', '/home', 'ACTIVE'],
    ['New Arrivals Collection', 'Explore fresh organic groceries & supplements', '/images/hero/hero_banner.jpg', '/home', 'ACTIVE']
  ];
  await dbPool.query('INSERT INTO homepage_banners (title, subtitle, image_url, link_url, status) VALUES ?', [bannerValues]);

  // 6. Programmatically Generate 1,000 Products (50 per category)
  const brandsMap: Record<string, string[]> = {
    'Electronics': ['Sony', 'Bose', 'JBL', 'Philips', 'Logitech', 'Sennheiser'],
    'Computers & Accessories': ['Dell', 'HP', 'Lenovo', 'ASUS', 'Logitech', 'Acer'],
    'Mobile & Tablets': ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Google', 'Realme'],
    'Fashion': ['Zara', 'H&M', 'Levi\'s', 'Uniqlo', 'Only', 'Roadster'],
    'Shoes & Accessories': ['Nike', 'Adidas', 'Puma', 'Skechers', 'Reebok', 'Crocs'],
    'Jewellery & Watches': ['Rolex', 'Casio', 'Titan', 'Fossil', 'Seiko', 'Tanishq'],
    'Grocery': ['Nestle', 'PepsiCo', 'Kellogg\'s', 'Organic India', 'Unilever', 'Tata'],
    'Home & Furniture': ['IKEA', 'Sleepwell', 'Nilkamal', 'Urban Ladder', 'Pepperfry'],
    'Appliances': ['LG', 'Samsung', 'Whirlpool', 'Godrej', 'Haier', 'IFB'],
    'Kitchen': ['Prestige', 'Hawkins', 'Wonderchef', 'Philips', 'Bajaj'],
    'Beauty': ['L\'Oreal', 'Nivea', 'Colgate', 'Gillette', 'Himalaya', 'Maybelline'],
    'Health & Wellness': ['Muscletech', 'Optimum Nutrition', 'Amway', 'Revital', 'Dabur'],
    'Baby Products': ['Pampers', 'Johnson\'s', 'Himalaya Baby', 'MamyPoko', 'Sebamed'],
    'Pet Supplies': ['Pedigree', 'Royal Canin', 'Whiskas', 'Drools', 'Choostix'],
    'Sports & Fitness': ['Decathlon', 'Yonex', 'Cosco', 'Nivia', 'Cockatoo'],
    'Books': ['Penguin', 'HarperCollins', 'Scholastic', 'Rupa', 'Oxford'],
    'Toys & Games': ['LEGO', 'Hasbro', 'Mattel', 'Funskool', 'Hot Wheels'],
    'Office & Stationery': ['Classmate', 'Parker', 'Camel', 'Reynolds', 'Kangaro'],
    'Automotive': ['Bosch', 'Castrol', '3M', 'Michelin', 'Bridgestone'],
    'Travel & Outdoor': ['Samsonite', 'American Tourister', 'Wildcraft', 'Safari', 'Decathlon']
  };

  const subcategoryImagesMap: Record<string, string[]> = {
    'laptops': [
      'https://images.unsplash.com/photo-1496181130204-7552cc14ACFC?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop'
    ],
    'keyboards': [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1601445638532-3c6f6c3aa1d6?w=800&auto=format&fit=crop'
    ],
    'monitors': [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551645121-d1034da75057?w=800&auto=format&fit=crop'
    ],
    'mice': [
      'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1625842268584-8f329040ff31?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1625842268393-d1421684c98f?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop'
    ],
    'ssds': [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600541519401-4471c351f08e?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1628557118391-7662828b6d80?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop'
    ],
    'smartphones': [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1565849906660-bf47b22a08f5?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop'
    ],
    'tablets': [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop'
    ],
    'sneakers': [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&auto=format&fit=crop'
    ],
    'running-shoes': [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&auto=format&fit=crop'
    ],
    'smart-watches': [
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop'
    ],
    'headphones': [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop'
    ]
  };

  const categoryImagesMap: Record<string, string[]> = {
    'CAT001': [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop'
    ],
    'CAT002': [
      'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop'
    ],
    'CAT003': [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop'
    ],
    'CAT004': [
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506617496734-11367ad00acc?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1543083503-08727137a7ed?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=800&auto=format&fit=crop'
    ],
    'CAT005': [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1515688594390-b649af70d282?w=800&auto=format&fit=crop'
    ],
    'CAT010': [
      'https://images.unsplash.com/photo-1496181130204-7552cc14ACFC?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1618424181497-157f25b6ddd5?w=800&auto=format&fit=crop'
    ],
    'CAT011': [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1565849906660-bf47b22a08f5?w=800&auto=format&fit=crop'
    ]
  };

  const defaultImages = [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop'
  ];

  const productValues: any[] = [];
  const inventoryValues: any[] = [];
  const imageValues: any[] = [];
  const specificationValues: any[] = [];
  const reviewValues: any[] = [];

  CATEGORIES_LIST.forEach((cat) => {
    const priceRanges = getPriceRange(cat.name);
    const brands = brandsMap[cat.name] || ['NexDay Brand'];
    const subList = SUBCATEGORIES_MAP[cat.id] || [];

    for (let pIndex = 1; pIndex <= 50; pIndex++) {
      const pId = `PROD-${cat.id}-${String(pIndex).padStart(3, '0')}`;
      const sku = `SKU-${cat.slug.substring(0, 3).toUpperCase()}-${String(pIndex).padStart(3, '0')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      
      const brand = brands[pIndex % brands.length];
      const subIdx = (pIndex - 1) % 5;
      const activeSub = subList[subIdx] || { name: 'Generic', slug: 'generic' };
      
      const pName = `${brand} Premium ${activeSub.name} Model ${pIndex}`;
      const desc = `High quality product from our ${activeSub.name} line. Designed for maximum utility, comfort, and performance. Product Spec Model ${pIndex}.`;
      
      // Calculate realistic price
      const rawPrice = priceRanges.min + Math.random() * (priceRanges.max - priceRanges.min);
      const price = formatRetailPrice(rawPrice);
      
      const discounts = [0, 0, 5, 10, 15, 20, 25, 30, 40, 50];
      const discount = discounts[pIndex % discounts.length];
      const sale_price = discount > 0 ? formatRetailPrice(price * (1 - discount / 100)) : price;

      // Rating/Reviews
      let rating = 4.2;
      let reviewCount = 0;
      const rSeed = Math.random();
      if (rSeed > 0.8) {
        rating = Number((4.5 + Math.random() * 0.4).toFixed(1));
        reviewCount = Math.floor(1000 + Math.random() * 14000);
      } else if (rSeed > 0.15) {
        rating = Number((3.8 + Math.random() * 0.7).toFixed(1));
        reviewCount = Math.floor(100 + Math.random() * 900);
      } else {
        rating = Number((2.5 + Math.random() * 1.3).toFixed(1));
        reviewCount = Math.floor(10 + Math.random() * 300);
      }

      const weight = Number((0.2 + Math.random() * 15).toFixed(2));
      const colors = ['Black', 'Silver', 'White', 'Blue', 'Red', 'Grey'];
      const sizes = ['Standard', 'Small', 'Medium', 'Large', 'Pack of 1', 'Pack of 2'];
      
      productValues.push([
        pId, sku, pName, brand, cat.id, `SUB-${cat.id}-${subIdx + 1}`,
        desc, price, discount, sale_price, rating, reviewCount, weight,
        colors[pIndex % colors.length], sizes[pIndex % sizes.length],
        '1 Year Warranty', true, 'India', (pIndex % 4) + 1, 'ACTIVE'
      ]);

      // Distribute stock across 5 warehouses
      warehouseValues.forEach((wh, wIdx) => {
        const stocks = [0, 3, 5, 12, 28, 64, 150, 450];
        const stockVal = stocks[(pIndex + wIdx) % stocks.length];
        inventoryValues.push([
          `INV-${pId}-${wh[0]}`,
          pId,
          wh[0],
          stockVal,
          0
        ]);
      });

      // Seeding 4 high-quality Unsplash image URLs per product
      const catImages = subcategoryImagesMap[activeSub.slug] || categoryImagesMap[cat.id] || defaultImages;
      catImages.forEach((imgUrl, imgIdx) => {
        imageValues.push([
          `IMG-${pId}-${imgIdx + 1}`,
          pId,
          imgUrl,
          imgIdx === 0 ? 'primary' : 'alternate',
          imgIdx + 1,
          `${pName} view ${imgIdx + 1}`
        ]);
      });

      // Seeding category specific specifications
      const specs: Array<{ name: string; value: string }> = [];
      if (cat.name === 'Electronics' || cat.name === 'Computers & Accessories') {
        specs.push(
          { name: 'Display Size', value: pIndex % 2 === 0 ? '15.6 inch' : '14 inch' },
          { name: 'Resolution', value: '1920 x 1080 FHD' },
          { name: 'Processor', value: pIndex % 3 === 0 ? 'Intel Core i7' : 'Intel Core i5' },
          { name: 'RAM', value: pIndex % 2 === 0 ? '16 GB DDR4' : '8 GB DDR4' },
          { name: 'Storage', value: '512 GB SSD' },
          { name: 'Warranty', value: '1 Year Brand Warranty' }
        );
      } else if (cat.name === 'Fashion' || cat.name === 'Shoes & Accessories') {
        specs.push(
          { name: 'Material', value: pIndex % 2 === 0 ? '100% Cotton' : 'Polyester Blend' },
          { name: 'Fit Type', value: 'Regular Fit' },
          { name: 'Occasion', value: 'Casual Wear' },
          { name: 'Care Instructions', value: 'Machine Wash cold' },
          { name: 'Country of Origin', value: 'India' }
        );
      } else if (cat.name === 'Grocery') {
        specs.push(
          { name: 'Weight', value: pIndex % 2 === 0 ? '500g' : '1kg' },
          { name: 'Shelf Life', value: '6 Months' },
          { name: 'Ingredients', value: 'Organic Certified ingredients' },
          { name: 'Storage Type', value: 'Cool and Dry Place' }
        );
      } else {
        specs.push(
          { name: 'Material', value: 'Premium Grade Materials' },
          { name: 'Color', value: colors[pIndex % colors.length] },
          { name: 'Weight', value: `${weight} kg` },
          { name: 'Warranty', value: '1 Year Warranty' },
          { name: 'Return Eligible', value: 'Yes, 7 Days Return Policy' }
        );
      }

      specs.forEach((spec) => {
        specificationValues.push([
          pId,
          spec.name,
          spec.value
        ]);
      });

      // Seeding 3 customer reviews per product to calculate realistic average reviews
      const reviewTitles = ['Excellent product!', 'Decent quality', 'Satisfied with purchase', 'Value for money', 'Great support'];
      const reviewTexts = [
        'Really impressed with the quality and design. Exceeded expectations and matches description perfectly.',
        'Good quality product for the price. Works as expected but delivery took an extra day.',
        'Satisfied with the purchase. Decent packaging and matches specifications.',
        'Great value for money. Very reliable performance and looks premium.',
        'Very durable and easy to use. Highly recommended for daily use.'
      ];

      for (let rIdx = 1; rIdx <= 3; rIdx++) {
        reviewValues.push([
          `REV-${pId}-${rIdx}`,
          pId,
          `CUST${Math.floor(10000 + Math.random() * 90000)}`,
          Number((3.5 + Math.random() * 1.5).toFixed(1)),
          reviewTitles[(pIndex + rIdx) % reviewTitles.length],
          reviewTexts[(pIndex + rIdx) % reviewTexts.length],
          Math.random() > 0.3
        ]);
      }
    }
  });

  // Batch insert products
  const productInsertQuery = `
    INSERT INTO products (
      product_id, sku, name, brand, category_id, subcategory_id, description,
      price, discount, sale_price, rating, review_count, weight, color, size,
      warranty, return_eligible, country, delivery_days, status
    ) VALUES ?
  `;
  await dbPool.query(productInsertQuery, [productValues]);

  // Batch insert inventories
  const inventoryInsertQuery = `
    INSERT INTO inventory (inventory_id, product_id, warehouse_id, stock, reserved_stock)
    VALUES ?
  `;
  await dbPool.query(inventoryInsertQuery, [inventoryValues]);

  // Batch insert product images
  const imageInsertQuery = `
    INSERT INTO product_images (image_id, product_id, image_url, image_type, display_order, alt_text)
    VALUES ?
  `;
  await dbPool.query(imageInsertQuery, [imageValues]);

  // Batch insert specifications
  const specInsertQuery = `
    INSERT INTO product_specifications (product_id, spec_name, spec_value)
    VALUES ?
  `;
  await dbPool.query(specInsertQuery, [specificationValues]);

  // Batch insert reviews
  const reviewInsertQuery = `
    INSERT INTO reviews (review_id, product_id, customer_id, rating, title, review_text, verified_purchase)
    VALUES ?
  `;
  await dbPool.query(reviewInsertQuery, [reviewValues]);

  console.log(`[MySQL DB] Successfully generated and seeded precisely 20 categories, 100 subcategories, and 1,000 products into MySQL.`);

  // 6. Seed Help Articles FAQs
  console.log('[MySQL DB] Seeding default help articles (FAQs)...');
  const helpArticlesValues = [
    ['FAQ001', 'ORDERS', 'How do I cancel my order?', 'You can cancel any order directly from your Orders page before it reaches an irreversible delivery stage. Open your orders, click on the target order, and select the pre-delivery cancel button.', 'cancel order, cancellation policy, cancel order request', 'PUBLISHED'],
    ['FAQ002', 'REFUNDS', 'How long does a refund take?', 'Refunds are initiated immediately upon return approval or cancellation. UPI and card refunds usually reflect in your account within 3 to 5 business days, depending on your bank.', 'refund delay, where is my refund, return refund time', 'PUBLISHED'],
    ['FAQ003', 'DELIVERY', 'Where is my order tracking information?', 'Once your order is dispatched, you can live-track its status on the Order Tracking screen. Deep links are available on your Orders list and in your transaction notifications feed.', 'track package, live tracking, order location', 'PUBLISHED'],
    ['FAQ004', 'PAYMENTS', 'Why did my payment fail?', 'Payment failures usually happen due to bank timeout, incorrect CVV/OTP entry, or insufficient funds. In case of failure, you can retry from checkout or select cash on delivery.', 'payment failure, decline transaction, retry checkout', 'PUBLISHED'],
    ['FAQ005', 'ACCOUNT', 'How do I update my shipping addresses?', 'You can manage your delivery addresses inside your Profile dashboard. Select "Addresses Book" to add, edit, or set default delivery destinations.', 'change address, billing details, edit location', 'PUBLISHED']
  ];
  await dbPool.query('INSERT INTO help_articles (article_id, category, title, content, keywords, status) VALUES ?', [helpArticlesValues]);
}

function getPriceRange(catName: string): { min: number; max: number } {
  switch (catName) {
    case 'Electronics':
      return { min: 499, max: 29999 };
    case 'Computers & Accessories':
      return { min: 199, max: 89999 };
    case 'Mobile & Tablets':
      return { min: 4999, max: 149999 };
    case 'Fashion':
      return { min: 199, max: 4999 };
    case 'Shoes & Accessories':
      return { min: 399, max: 9999 };
    case 'Jewellery & Watches':
      return { min: 499, max: 39999 };
    case 'Grocery':
      return { min: 15, max: 799 };
    case 'Home & Furniture':
      return { min: 999, max: 49999 };
    case 'Appliances':
      return { min: 5999, max: 79999 };
    case 'Kitchen':
      return { min: 199, max: 9999 };
    case 'Beauty':
      return { min: 49, max: 2499 };
    case 'Health & Wellness':
      return { min: 99, max: 4999 };
    case 'Baby Products':
      return { min: 79, max: 3499 };
    case 'Pet Supplies':
      return { min: 99, max: 4999 };
    case 'Sports & Fitness':
      return { min: 149, max: 14999 };
    case 'Books':
      return { min: 99, max: 999 };
    case 'Toys & Games':
      return { min: 149, max: 3999 };
    case 'Office & Stationery':
      return { min: 49, max: 1999 };
    case 'Automotive':
      return { min: 99, max: 9999 };
    case 'Travel & Outdoor':
      return { min: 499, max: 19999 };
    default:
      return { min: 500, max: 10000 };
  }
}

function formatRetailPrice(rawPrice: number): number {
  if (rawPrice > 10000) {
    return Math.round(rawPrice / 1000) * 1000 - 1;
  } else if (rawPrice > 1000) {
    return Math.round(rawPrice / 100) * 100 - 1;
  } else if (rawPrice > 100) {
    return Math.round(rawPrice / 50) * 50 - 1;
  } else {
    const val = Math.round(rawPrice);
    return val < 15 ? 19 : val;
  }
}

// ----------------------------------------------------
// IN-MEMORY FALLBACK GENERATION
// ----------------------------------------------------
function seedInMemoryData() {
  // Populate categories
  CATEGORIES_LIST.forEach((c, idx) => {
    inMemoryCategories.set(c.id, {
      category_id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.desc,
      image_url: `/images/categories/${c.slug}.jpg`,
      product_count: 50,
      display_order: idx + 1,
      status: 'ACTIVE'
    });
  });

  // Populate Banners
  inMemoryBanners.set(1, { id: 1, title: 'Festival Mega Sale', subtitle: 'Up to 60% Off Electronics & Fashion', image_url: '/images/hero/hero_banner.jpg', link_url: '/home', status: 'ACTIVE' });
  inMemoryBanners.set(2, { id: 2, title: 'Back To School Campaign', subtitle: 'Flat 20% Off study desks and accessories', image_url: '/images/hero/hero_banner.jpg', link_url: '/home', status: 'ACTIVE' });

  // Generate 1,000 Products in-memory
  CATEGORIES_LIST.forEach((cat) => {
    const priceRanges = getPriceRange(cat.name);
    for (let pIndex = 1; pIndex <= 50; pIndex++) {
      const pId = `PROD-${cat.id}-${String(pIndex).padStart(3, '0')}`;
      const sku = `SKU-${cat.slug.substring(0, 3).toUpperCase()}-${String(pIndex).padStart(3, '0')}`;
      const brand = 'NexDay Premium';
      const price = formatRetailPrice(priceRanges.min + Math.random() * (priceRanges.max - priceRanges.min));
      const discount = pIndex % 3 === 0 ? 20 : 0;
      const sale_price = discount > 0 ? formatRetailPrice(price * (1 - discount / 100)) : price;

      inMemoryProducts.set(pId, {
        product_id: pId,
        sku,
        name: `${brand} ${cat.name} Card-${pIndex}`,
        brand,
        category_id: cat.id,
        subcategory_id: `SUB-${cat.id}-1`,
        description: `In-memory premium details for ${cat.name} product ${pIndex}.`,
        price,
        discount,
        sale_price,
        rating: 4.4,
        review_count: 120,
        weight: 1.5,
        color: 'Space Grey',
        size: 'Medium',
        warranty: '1 Year',
        return_eligible: true,
        country: 'India',
        delivery_days: 2,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  });

  // Load any previously persisted customers from JSON file
  loadPersistedInMemoryCustomers();

  // Seed default admin in-memory
  const adminPassHash = bcrypt.hashSync('adminpassword123', 10);
  inMemoryAdminUsers.set('ADM001', {
    admin_id: 'ADM001',
    first_name: 'System',
    last_name: 'Administrator',
    email: 'admin@retailhub.com',
    password_hash: adminPassHash,
    role_id: 'SUPER_ADMIN',
    category_access: 'ALL',
    status: 'ACTIVE'
  });

  // Seed default customers in-memory if not already loaded
  if (!inMemoryCustomers.has('CUST1802')) {
    const custPassHash = bcrypt.hashSync('password123', 10);
    inMemoryCustomers.set('CUST1802', {
      customer_id: 'CUST1802',
      first_name: 'Walslat',
      last_name: 'User',
      email: 'walslat1802@gmail.com',
      phone: '9876543210',
      password_hash: custPassHash,
      date_of_birth: null,
      gender: null,
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      language: 'English',
      membership: 'Standard',
      preferred_payment: 'UPI',
      account_status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  persistInMemoryCustomers();
}

const DATA_DIR = path.resolve(__dirname, '../../data');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');

function persistInMemoryCustomers() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const arr = Array.from(inMemoryCustomers.values());
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (e) {}
}

function loadPersistedInMemoryCustomers() {
  try {
    if (fs.existsSync(CUSTOMERS_FILE)) {
      const raw = fs.readFileSync(CUSTOMERS_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const cust of list) {
          inMemoryCustomers.set(cust.customer_id, cust);
        }
      }
    }
  } catch (e) {}
}

// ----------------------------------------------------
// DATABASE & REPOSITORY OPERATIONS HELPERS
// ----------------------------------------------------

export async function saveSession(session: {
  session_id: string;
  customer_id: string | null;
  session_type: string;
  device: string;
  browser: string;
  ip_hash: string;
}): Promise<SessionRecord> {
  const now = new Date();
  const record: SessionRecord = {
    session_id: session.session_id,
    customer_id: session.customer_id,
    session_type: session.session_type,
    device: session.device,
    browser: session.browser,
    ip_hash: session.ip_hash,
    started_at: now,
    last_activity: now,
    ended_at: null,
  };

  if (dbPool && !isInMemoryFallback) {
    const query = `
      INSERT INTO sessions (session_id, customer_id, session_type, device, browser, ip_hash, started_at, last_activity, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      ON DUPLICATE KEY UPDATE last_activity = VALUES(last_activity);
    `;
    await dbPool.query(query, [
      record.session_id,
      record.customer_id,
      record.session_type,
      record.device,
      record.browser,
      record.ip_hash,
      record.started_at,
      record.last_activity,
    ]);
  } else {
    inMemorySessions.set(session.session_id, record);
  }

  return record;
}

export async function getSession(session_id: string): Promise<SessionRecord | null> {
  if (dbPool && !isInMemoryFallback) {
    const [rows] = await dbPool.query<any[]>('SELECT * FROM sessions WHERE session_id = ?', [session_id]);
    if (rows.length > 0) {
      return rows[0] as SessionRecord;
    }
    return null;
  } else {
    return inMemorySessions.get(session_id) || null;
  }
}

export async function endSession(session_id: string): Promise<SessionRecord | null> {
  const now = new Date();
  if (dbPool && !isInMemoryFallback) {
    await dbPool.query('UPDATE sessions SET ended_at = ? WHERE session_id = ?', [now, session_id]);
    return getSession(session_id);
  } else {
    const record = inMemorySessions.get(session_id);
    if (record) {
      record.ended_at = now;
      inMemorySessions.set(session_id, record);
      return record;
    }
    return null;
  }
}

export async function linkSessionToCustomer(session_id: string, customer_id: string): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const [rows] = await dbPool.query<any[]>('SELECT session_id FROM sessions WHERE session_id = ?', [session_id]);
    if (rows.length > 0) {
      const query = 'UPDATE sessions SET customer_id = ?, session_type = "authenticated" WHERE session_id = ?';
      await dbPool.query(query, [customer_id, session_id]);
    } else {
      const query = `
        INSERT INTO sessions (session_id, customer_id, session_type, device, browser, ip_hash, started_at, last_activity, ended_at)
        VALUES (?, ?, 'authenticated', 'desktop', 'Chrome', 'self', NOW(), NOW(), NULL)
      `;
      await dbPool.query(query, [session_id, customer_id]);
    }
  } else {
    const record = inMemorySessions.get(session_id);
    if (record) {
      record.customer_id = customer_id;
      record.session_type = 'authenticated';
      inMemorySessions.set(session_id, record);
    } else {
      const now = new Date();
      inMemorySessions.set(session_id, {
        session_id,
        customer_id,
        session_type: 'authenticated',
        device: 'desktop',
        browser: 'Chrome',
        ip_hash: 'self',
        started_at: now,
        last_activity: now,
        ended_at: null,
      });
    }
  }
}

export async function saveCustomer(customer: Omit<CustomerRecord, 'created_at' | 'updated_at'>): Promise<CustomerRecord> {
  const now = new Date();
  const record: CustomerRecord = {
    ...customer,
    created_at: now,
    updated_at: now,
  };

  inMemoryCustomers.set(record.customer_id, record);
  persistInMemoryCustomers();

  if (dbPool && !isInMemoryFallback) {
    try {
      const query = `
        INSERT INTO customers (
          customer_id, first_name, last_name, email, phone, password_hash,
          date_of_birth, gender, country, state, city, language, membership,
          preferred_payment, account_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)
      `;
      await dbPool.query(query, [
        record.customer_id,
        record.first_name,
        record.last_name,
        record.email,
        record.phone,
        record.password_hash,
        record.date_of_birth,
        record.gender,
        record.country,
        record.state,
        record.city,
        record.language,
        record.membership,
        record.preferred_payment,
        record.account_status,
        record.created_at,
        record.updated_at,
      ]);
    } catch (e) {
      console.error('[DB] Failed to insert customer into MySQL, saved to disk persistence:', e);
    }
  }

  return record;
}

export async function getCustomerByEmail(email: string): Promise<CustomerRecord | null> {
  if (dbPool && !isInMemoryFallback) {
    try {
      const [rows] = await dbPool.query<any[]>('SELECT * FROM customers WHERE email = ?', [email]);
      if (rows.length > 0) {
        return rows[0] as CustomerRecord;
      }
    } catch (e) {
      console.error('[DB] MySQL query for getCustomerByEmail failed:', e);
    }
  }

  for (const customer of inMemoryCustomers.values()) {
    if (customer.email.toLowerCase() === email.toLowerCase()) {
      return customer;
    }
  }
  return null;
}

export async function getCustomerById(customer_id: string): Promise<CustomerRecord | null> {
  if (dbPool && !isInMemoryFallback) {
    try {
      const [rows] = await dbPool.query<any[]>('SELECT * FROM customers WHERE customer_id = ?', [customer_id]);
      if (rows.length > 0) {
        return rows[0] as CustomerRecord;
      }
    } catch (e) {
      console.error('[DB] MySQL query for getCustomerById failed:', e);
    }
  }
  return inMemoryCustomers.get(customer_id) || null;
}

// Banner campaigns accessor
export async function getBanners(): Promise<any[]> {
  if (dbPool && !isInMemoryFallback) {
    const [rows] = await dbPool.query('SELECT * FROM homepage_banners WHERE status = "ACTIVE"');
    return rows as any[];
  } else {
    return Array.from(inMemoryBanners.values()).filter(b => b.status === 'ACTIVE');
  }
}

// Categories accessor
export async function getCategories(): Promise<any[]> {
  if (dbPool && !isInMemoryFallback) {
    const [rows] = await dbPool.query('SELECT * FROM categories WHERE status = "ACTIVE" ORDER BY display_order');
    return rows as any[];
  } else {
    return Array.from(inMemoryCategories.values()).filter(c => c.status === 'ACTIVE');
  }
}

export async function getSubcategoriesForCategory(categorySlug: string): Promise<any[]> {
  if (dbPool && !isInMemoryFallback) {
    const query = `
      SELECT s.* 
      FROM subcategories s 
      JOIN categories c ON s.category_id = c.category_id 
      WHERE c.slug = ?
    `;
    const [rows] = await dbPool.query(query, [categorySlug]);
    return rows as any[];
  } else {
    const cat = Array.from(inMemoryCategories.values()).find(c => c.slug === categorySlug);
    if (!cat) return [];
    const list = SUBCATEGORIES_MAP[cat.category_id] || [];
    return list.map((sub, i) => ({
      subcategory_id: `SUB-${cat.category_id}-${i + 1}`,
      category_id: cat.category_id,
      name: sub.name,
      slug: sub.slug
    }));
  }
}

export interface ProductQueryFilters {
  category_id?: string;
  category_slug?: string;
  subcategory_slug?: string;
  search?: string;
  brands?: string[];
  min_price?: number;
  max_price?: number;
  rating?: number;
  in_stock?: boolean;
  delivery_days?: number;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginatedProducts {
  products: any[];
  total: number;
}

// Products Catalog query accessor
export async function getProducts(filters: ProductQueryFilters): Promise<PaginatedProducts> {
  const limit = filters.limit || 24;
  const page = filters.page || 1;
  const offset = (page - 1) * limit;

  if (dbPool && !isInMemoryFallback) {
    // 1. Build SELECT query
    let selectQuery = `
      SELECT p.*, COALESCE(SUM(i.stock), 0) as stock, MIN(pi.image_url) as image_url
      FROM products p 
      LEFT JOIN inventory i ON p.product_id = i.product_id 
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.image_type = 'primary'
      WHERE p.status = 'ACTIVE'
    `;
    const params: any[] = [];

    if (filters.category_id) {
      selectQuery += ' AND p.category_id = ?';
      params.push(filters.category_id);
    }
    if (filters.category_slug) {
      selectQuery += ' AND c.slug = ?';
      params.push(filters.category_slug);
    }
    if (filters.subcategory_slug) {
      selectQuery += ' AND s.slug = ?';
      params.push(filters.subcategory_slug);
    }
    if (filters.search) {
      selectQuery += ' AND (p.name LIKE ? OR p.brand LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.brands && filters.brands.length > 0) {
      selectQuery += ' AND p.brand IN (?)';
      params.push(filters.brands);
    }
    if (filters.min_price !== undefined) {
      selectQuery += ' AND p.sale_price >= ?';
      params.push(filters.min_price);
    }
    if (filters.max_price !== undefined) {
      selectQuery += ' AND p.sale_price <= ?';
      params.push(filters.max_price);
    }
    if (filters.rating !== undefined) {
      selectQuery += ' AND p.rating >= ?';
      params.push(filters.rating);
    }
    if (filters.delivery_days !== undefined) {
      selectQuery += ' AND p.delivery_days <= ?';
      params.push(filters.delivery_days);
    }

    selectQuery += ' GROUP BY p.product_id';

    if (filters.in_stock) {
      selectQuery += ' HAVING stock > 0';
    }

    // Sorting
    if (filters.sort === 'price_asc') {
      selectQuery += ' ORDER BY p.sale_price ASC';
    } else if (filters.sort === 'price_desc') {
      selectQuery += ' ORDER BY p.sale_price DESC';
    } else if (filters.sort === 'rating') {
      selectQuery += ' ORDER BY p.rating DESC';
    } else if (filters.sort === 'discount') {
      selectQuery += ' ORDER BY p.discount DESC';
    } else if (filters.sort === 'relevance' || (!filters.sort && filters.search)) {
      selectQuery += ' ORDER BY CASE WHEN p.name LIKE ? THEN 1 WHEN p.brand LIKE ? THEN 2 ELSE 3 END ASC';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    } else {
      selectQuery += ' ORDER BY p.product_id ASC';
    }

    // 2. Count total matches using subquery
    const countQuery = `SELECT COUNT(*) as total FROM (${selectQuery}) as sub`;
    const [countRows]: any = await dbPool.query(countQuery, params);
    const total = countRows[0]?.total || 0;

    // 3. Add pagination bounds to select query
    selectQuery += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await dbPool.query(selectQuery, params);
    return { products: rows as any[], total };
  } else {
    // In-memory catalog filter
    let items = Array.from(inMemoryProducts.values()).map(p => ({
      ...p,
      stock: 50,
      image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop'
    }));
    
    if (filters.category_id) {
      items = items.filter(p => p.category_id === filters.category_id);
    }
    if (filters.category_slug) {
      const cat = Array.from(inMemoryCategories.values()).find(c => c.slug === filters.category_slug);
      if (cat) {
        items = items.filter(p => p.category_id === cat.category_id);
      } else {
        items = [];
      }
    }
    if (filters.subcategory_slug) {
      items = items.filter(p => p.subcategory_id.includes(filters.subcategory_slug!.toUpperCase()));
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term));
    }
    if (filters.brands && filters.brands.length > 0) {
      const brandsLower = filters.brands.map(b => b.toLowerCase());
      items = items.filter(p => brandsLower.includes(p.brand.toLowerCase()));
    }
    if (filters.min_price !== undefined) {
      items = items.filter(p => p.sale_price >= filters.min_price!);
    }
    if (filters.max_price !== undefined) {
      items = items.filter(p => p.sale_price <= filters.max_price!);
    }
    if (filters.rating !== undefined) {
      items = items.filter(p => p.rating >= filters.rating!);
    }
    if (filters.delivery_days !== undefined) {
      items = items.filter(p => p.delivery_days <= filters.delivery_days!);
    }
    
    // Sort
    if (filters.sort === 'price_asc') {
      items.sort((a,b) => a.sale_price - b.sale_price);
    } else if (filters.sort === 'price_desc') {
      items.sort((a,b) => b.sale_price - a.sale_price);
    } else if (filters.sort === 'rating') {
      items.sort((a,b) => b.rating - a.rating);
    }

    const total = items.length;
    const products = items.slice(offset, offset + limit);
    return { products, total };
  }
}

// ----------------------------------------------------
// SHOPPING CART DATABASE / IN-MEMORY STORAGE HELPERS
// ----------------------------------------------------

export interface CartItemRecord {
  cart_item_id: string;
  product_id: string;
  name: string;
  brand: string;
  price: number;
  discount: number;
  sale_price: number;
  added_price: number;
  quantity: number;
  stock: number;
  delivery_days: number;
}

export async function getOrCreateCart(session_id: string, customer_id: string | null): Promise<any> {
  if (dbPool && !isInMemoryFallback) {
    // 1. If customer_id is provided, search for their active cart first
    if (customer_id) {
      const [custRows]: any = await dbPool.query('SELECT * FROM cart WHERE customer_id = ? AND status = "ACTIVE"', [customer_id]);
      if (custRows.length > 0) {
        return custRows[0];
      }
    }

    // 2. Fallback to active cart matching session_id
    const [sessRows]: any = await dbPool.query('SELECT * FROM cart WHERE session_id = ? AND status = "ACTIVE"', [session_id]);
    if (sessRows.length > 0) {
      const cart = sessRows[0];
      if (customer_id && !cart.customer_id) {
        await dbPool.query('UPDATE cart SET customer_id = ? WHERE cart_id = ?', [customer_id, cart.cart_id]);
        cart.customer_id = customer_id;
      }
      return cart;
    }

    // 3. Create a new cart if none exist
    const cartId = `CART-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
    await dbPool.query(
      'INSERT INTO cart (cart_id, customer_id, session_id, status) VALUES (?, ?, ?, "ACTIVE")',
      [cartId, customer_id, session_id]
    );
    return { cart_id: cartId, customer_id, session_id, status: 'ACTIVE', coupon_code: null };
  } else {
    return { cart_id: `CART-${session_id.substring(0, 8)}`, customer_id, session_id, status: 'ACTIVE', coupon_code: null };
  }
}

export async function getCartItems(session_id: string, customer_id: string | null): Promise<CartItemRecord[]> {
  if (dbPool && !isInMemoryFallback) {
    const cart = await getOrCreateCart(session_id, customer_id);
    const query = `
      SELECT ci.cart_item_id, ci.product_id, ci.quantity, ci.unit_price as added_price,
             p.name, p.brand, p.price, p.discount, p.sale_price, COALESCE(SUM(i.stock), 0) as stock, p.delivery_days
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.product_id
      LEFT JOIN inventory i ON p.product_id = i.product_id
      WHERE ci.cart_id = ?
      GROUP BY ci.cart_item_id, ci.product_id, ci.quantity, ci.unit_price, p.name, p.brand, p.price, p.discount, p.sale_price, p.delivery_days
    `;
    const [rows] = await dbPool.query(query, [cart.cart_id]);
    return rows as CartItemRecord[];
  } else {
    const key = customer_id || session_id;
    const items = inMemoryCart.get(key) || [];
    return items.map(item => {
      const p = inMemoryProducts.get(item.product_id)!;
      return {
        cart_item_id: `CI-${item.product_id}`,
        product_id: item.product_id,
        quantity: item.quantity,
        added_price: p?.sale_price || 100,
        name: p?.name || 'In-Memory Item',
        brand: p?.brand || 'NexDay',
        price: p?.price || 100,
        discount: p?.discount || 0,
        sale_price: p?.sale_price || 100,
        stock: 50,
        delivery_days: 2
      };
    });
  }
}

export async function addToCart(session_id: string, customer_id: string | null, product_id: string, quantity: number, price?: number): Promise<number> {
  if (dbPool && !isInMemoryFallback) {
    const cart = await getOrCreateCart(session_id, customer_id);
    const [prods]: any = await dbPool.query('SELECT sale_price FROM products WHERE product_id = ?', [product_id]);
    const currentPrice = prods.length > 0 ? prods[0].sale_price : (price !== undefined ? price : 0);

    const [rows]: any = await dbPool.query(
      'SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cart.cart_id, product_id]
    );

    if (rows.length > 0) {
      const newQty = rows[0].quantity + quantity;
      await dbPool.query(
        'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?',
        [newQty, rows[0].cart_item_id]
      );
    } else {
      const itemId = `CI-${product_id}-${(customer_id || session_id).substring(0, 16)}`;
      await dbPool.query(
        'INSERT INTO cart_items (cart_item_id, cart_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        [itemId, cart.cart_id, product_id, quantity, currentPrice]
      );
    }
    return Number(currentPrice);
  } else {
    // In-memory fallback
    const key = customer_id || session_id;
    const items = inMemoryCart.get(key) || [];
    const existing = items.find(i => i.product_id === product_id);
    const mockPrice = price !== undefined ? price : 100;
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ product_id, quantity });
    }
    inMemoryCart.set(key, items);
    return mockPrice;
  }
}

export async function updateCartItemQuantity(session_id: string, customer_id: string | null, product_id: string, quantity: number): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const cart = await getOrCreateCart(session_id, customer_id);
    await dbPool.query(
      'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?',
      [quantity, cart.cart_id, product_id]
    );
  } else {
    const key = customer_id || session_id;
    const items = inMemoryCart.get(key) || [];
    const existing = items.find(i => i.product_id === product_id);
    if (existing) {
      existing.quantity = quantity;
    }
    inMemoryCart.set(key, items);
  }
}

export async function removeFromCart(session_id: string, customer_id: string | null, product_id: string): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const cart = await getOrCreateCart(session_id, customer_id);
    await dbPool.query('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.cart_id, product_id]);
  } else {
    const key = customer_id || session_id;
    let items = inMemoryCart.get(key) || [];
    items = items.filter(i => i.product_id !== product_id);
    inMemoryCart.set(key, items);
  }
}

export async function mergeCarts(session_id: string, customer_id: string): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const [guestCarts]: any = await dbPool.query('SELECT cart_id FROM cart WHERE session_id = ? AND customer_id IS NULL AND status = "ACTIVE"', [session_id]);
    if (guestCarts.length === 0) return;
    const guestCartId = guestCarts[0].cart_id;

    const custCart = await getOrCreateCart(session_id, customer_id);
    const custCartId = custCart.cart_id;

    const [guestItems]: any = await dbPool.query('SELECT product_id, quantity, unit_price FROM cart_items WHERE cart_id = ?', [guestCartId]);
    for (const gItem of guestItems) {
      const [custItems]: any = await dbPool.query('SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?', [custCartId, gItem.product_id]);
      if (custItems.length > 0) {
        const newQty = custItems[0].quantity + gItem.quantity;
        await dbPool.query('UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?', [newQty, custItems[0].cart_item_id]);
      } else {
        const itemId = `CI-${gItem.product_id}-${customer_id.substring(0, 16)}`;
        await dbPool.query('INSERT INTO cart_items (cart_item_id, cart_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)', [itemId, custCartId, gItem.product_id, gItem.quantity, gItem.unit_price]);
      }
    }

    await dbPool.query('DELETE FROM cart_items WHERE cart_id = ?', [guestCartId]);
    await dbPool.query('DELETE FROM cart WHERE cart_id = ?', [guestCartId]);
  } else {
    const guestItems = inMemoryCart.get(session_id) || [];
    const customerItems = inMemoryCart.get(customer_id) || [];
    
    guestItems.forEach(gItem => {
      const existing = customerItems.find(cItem => cItem.product_id === gItem.product_id);
      if (existing) {
        existing.quantity += gItem.quantity;
      } else {
        customerItems.push(gItem);
      }
    });

    inMemoryCart.set(customer_id, customerItems);
    inMemoryCart.delete(session_id);
  }
}

export async function saveForLater(session_id: string, customer_id: string | null, product_id: string): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const cart = await getOrCreateCart(session_id, customer_id);
    await dbPool.query('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.cart_id, product_id]);
    const savedId = `SAV-${product_id}-${(customer_id || session_id).substring(0, 16)}`;
    await dbPool.query(
      'INSERT INTO saved_cart_items (saved_item_id, cart_id, product_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE added_at = NOW()',
      [savedId, cart.cart_id, product_id]
    );
  } else {
    const key = customer_id || session_id;
    let items = inMemoryCart.get(key) || [];
    items = items.filter(i => i.product_id !== product_id);
    inMemoryCart.set(key, items);
  }
}

export async function moveToCart(session_id: string, customer_id: string | null, product_id: string): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const cart = await getOrCreateCart(session_id, customer_id);
    await dbPool.query('DELETE FROM saved_cart_items WHERE cart_id = ? AND product_id = ?', [cart.cart_id, product_id]);
    await addToCart(session_id, customer_id, product_id, 1);
  } else {
    const key = customer_id || session_id;
    await addToCart(session_id, customer_id, product_id, 1);
  }
}

export async function getSavedCartItems(session_id: string, customer_id: string | null): Promise<any[]> {
  if (dbPool && !isInMemoryFallback) {
    const cart = await getOrCreateCart(session_id, customer_id);
    const query = `
      SELECT sci.saved_item_id, sci.product_id, p.name, p.brand, p.price, p.discount, p.sale_price, COALESCE(SUM(i.stock), 0) as stock, p.delivery_days
      FROM saved_cart_items sci
      JOIN products p ON sci.product_id = p.product_id
      LEFT JOIN inventory i ON p.product_id = i.product_id
      WHERE sci.cart_id = ?
      GROUP BY sci.saved_item_id, sci.product_id, p.name, p.brand, p.price, p.discount, p.sale_price, p.delivery_days
    `;
    const [rows] = await dbPool.query(query, [cart.cart_id]);
    return rows as any[];
  } else {
    return [];
  }
}

export async function removeSavedCartItem(session_id: string, customer_id: string | null, product_id: string): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const cart = await getOrCreateCart(session_id, customer_id);
    await dbPool.query('DELETE FROM saved_cart_items WHERE cart_id = ? AND product_id = ?', [cart.cart_id, product_id]);
  }
}

export async function applyCoupon(session_id: string, customer_id: string | null, couponCode: string): Promise<any> {
  if (dbPool && !isInMemoryFallback) {
    const [coupons]: any = await dbPool.query('SELECT * FROM coupons WHERE code = ? AND status = "ACTIVE"', [couponCode]);
    if (coupons.length === 0) {
      throw new Error('invalid_code');
    }
    const coupon = coupons[0];
    const now = new Date();
    if (now < new Date(coupon.start_date) || now > new Date(coupon.end_date)) {
      throw new Error('expired');
    }
    const cart = await getOrCreateCart(session_id, customer_id);
    await dbPool.query('UPDATE cart SET coupon_code = ? WHERE cart_id = ?', [couponCode, cart.cart_id]);
    return coupon;
  } else {
    if (couponCode === 'SAVE10') {
      return { code: 'SAVE10', discount_type: 'percentage', discount_value: 10 };
    }
    throw new Error('invalid_code');
  }
}

export async function removeCoupon(session_id: string, customer_id: string | null): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const cart = await getOrCreateCart(session_id, customer_id);
    await dbPool.query('UPDATE cart SET coupon_code = NULL WHERE cart_id = ?', [cart.cart_id]);
  }
}

// ----------------------------------------------------
// RECENTLY VIEWED STORAGE HELPERS
// ----------------------------------------------------

export async function addRecentlyViewed(session_id: string, customer_id: string | null, product_id: string): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    // Maintain maximum 10 items in history
    const deleteQuery = `
      DELETE FROM recently_viewed 
      WHERE product_id = ? AND (session_id = ? OR (customer_id IS NOT NULL AND customer_id = ?))
    `;
    await dbPool.query(deleteQuery, [product_id, session_id, customer_id]);

    const insertQuery = 'INSERT INTO recently_viewed (session_id, customer_id, product_id) VALUES (?, ?, ?)';
    await dbPool.query(insertQuery, [session_id, customer_id, product_id]);
  } else {
    const key = customer_id || session_id;
    let list = inMemoryRecentlyViewed.get(key) || [];
    list = list.filter(id => id !== product_id);
    list.unshift(product_id);
    if (list.length > 10) list.pop();
    inMemoryRecentlyViewed.set(key, list);
  }
}

export async function getRecentlyViewed(session_id: string, customer_id: string | null): Promise<any[]> {
  if (dbPool && !isInMemoryFallback) {
    const query = `
      SELECT rv.product_id, p.name, p.brand, p.price, p.discount, p.sale_price, p.rating, p.review_count, COALESCE(SUM(i.stock), 0) as stock
      FROM recently_viewed rv
      JOIN products p ON rv.product_id = p.product_id
      LEFT JOIN inventory i ON p.product_id = i.product_id
      WHERE (rv.session_id = ? OR (rv.customer_id IS NOT NULL AND rv.customer_id = ?))
      GROUP BY rv.product_id, rv.viewed_at, p.name, p.brand, p.price, p.discount, p.sale_price, p.rating, p.review_count
      ORDER BY rv.viewed_at DESC
      LIMIT 10
    `;
    const [rows] = await dbPool.query(query, [session_id, customer_id]);
    return rows as any[];
  } else {
    const key = customer_id || session_id;
    const list = inMemoryRecentlyViewed.get(key) || [];
    return list.map(id => {
      const p = inMemoryProducts.get(id)!;
      return {
        product_id: id,
        name: p?.name || 'In-Memory Item',
        brand: p?.brand || 'NexDay',
        price: p?.price || 100,
        discount: p?.discount || 0,
        sale_price: p?.sale_price || 100,
        rating: p?.rating || 4.2,
        review_count: p?.review_count || 10,
        stock: 50
      };
    });
  }
}

export function getDbPool() {
  return dbPool;
}

export async function getSearchSuggestions(queryText: string): Promise<any[]> {
  const term = `%${queryText}%`;
  
  if (dbPool && !isInMemoryFallback) {
    const categoryQuery = "SELECT name as text, 'category' as type FROM categories WHERE name LIKE ? LIMIT 3";
    const brandQuery = "SELECT DISTINCT brand as text, 'brand' as type FROM products WHERE brand LIKE ? LIMIT 3";
    const productQuery = "SELECT name as text, 'product' as type FROM products WHERE name LIKE ? LIMIT 5";
    
    const [cats]: any = await dbPool.query(categoryQuery, [term]);
    const [brands]: any = await dbPool.query(brandQuery, [term]);
    const [prods]: any = await dbPool.query(productQuery, [term]);
    
    return [...cats, ...brands, ...prods].slice(0, 8);
  } else {
    const termLower = queryText.toLowerCase();
    const suggestions: any[] = [];
    
    for (const cat of inMemoryCategories.values()) {
      if (cat.name.toLowerCase().includes(termLower)) {
        suggestions.push({ text: cat.name, type: 'category' });
      }
    }
    
    const brandsSet = new Set<string>();
    for (const prod of inMemoryProducts.values()) {
      if (prod.brand.toLowerCase().includes(termLower)) {
        brandsSet.add(prod.brand);
      }
    }
    brandsSet.forEach(b => suggestions.push({ text: b, type: 'brand' }));
    
    for (const prod of inMemoryProducts.values()) {
      if (prod.name.toLowerCase().includes(termLower)) {
        suggestions.push({ text: prod.name, type: 'product' });
      }
    }
    
    return suggestions.slice(0, 8);
  }
}

export async function saveSearchQuery(session_id: string, customer_id: string | null, query: string, resultCount: number): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    if (!query || query.trim().length < 2) return;
    const insertQuery = "INSERT INTO search_history (session_id, customer_id, query, result_count) VALUES (?, ?, ?, ?)";
    await dbPool.query(insertQuery, [session_id, customer_id, query.trim(), resultCount]);
  }
}

export async function getSearchHistory(session_id: string, customer_id: string | null): Promise<any[]> {
  if (dbPool && !isInMemoryFallback) {
    const query = `
      SELECT search_id, query, result_count, searched_at 
      FROM search_history 
      WHERE session_id = ? OR (customer_id IS NOT NULL AND customer_id = ?)
      ORDER BY searched_at DESC 
      LIMIT 10
    `;
    const [rows] = await dbPool.query(query, [session_id, customer_id]);
    return rows as any[];
  }
  return [];
}

export async function deleteSearchHistory(search_id: number): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    await dbPool.query("DELETE FROM search_history WHERE search_id = ?", [search_id]);
  }
}

export async function getProductDetails(productId: string): Promise<any | null> {
  if (dbPool && !isInMemoryFallback) {
    const [prods]: any = await dbPool.query('SELECT * FROM products WHERE product_id = ? AND status = "ACTIVE"', [productId]);
    if (prods.length === 0) return null;
    const product = prods[0];

    const [images]: any = await dbPool.query('SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC', [productId]);
    const [specifications]: any = await dbPool.query('SELECT * FROM product_specifications WHERE product_id = ?', [productId]);
    const reviewsResult = await getProductReviews(productId);
    const reviews = reviewsResult.reviews;

    const sellerId = `SELLER${String(1 + (Math.abs(productId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 20)).padStart(3, '0')}`;
    const [sellers]: any = await dbPool.query('SELECT * FROM sellers WHERE seller_id = ?', [sellerId]);
    const seller = sellers.length > 0 ? sellers[0] : { name: 'NexDay Enterprise', rating: 4.5 };

    const [inventories]: any = await dbPool.query('SELECT COALESCE(SUM(stock), 0) as stock FROM inventory WHERE product_id = ?', [productId]);
    const stock = inventories.length > 0 ? inventories[0].stock : 0;

    return {
      product,
      images,
      specifications,
      reviews,
      seller,
      stock
    };
  } else {
    const product = inMemoryProducts.get(productId);
    if (!product) return null;

    let productImages: any[] = [];
    if (product.gallery_images && Array.isArray(product.gallery_images) && product.gallery_images.length > 0) {
      productImages = product.gallery_images.map((url: string, idx: number) => ({
        image_url: url,
        image_type: idx === 0 ? 'primary' : 'alternate',
        display_order: idx + 1
      }));
    } else if (product.image_url) {
      productImages = [{ image_url: product.image_url, image_type: 'primary', display_order: 1 }];
    } else {
      productImages = [{ image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop', image_type: 'primary', display_order: 1 }];
    }

    const defaultSpecs = [
      { spec_name: 'Material', spec_value: 'Premium Materials' },
      { spec_name: 'Color', spec_value: product.color || 'Standard' },
      { spec_name: 'Warranty', spec_value: product.warranty || '1 Year Warranty' },
      { spec_name: 'Weight', spec_value: `${product.weight || 1} kg` }
    ];

    const defaultReviews = [
      { review_id: '1', customer_id: 'CUST1001', rating: 5, title: 'Excellent!', review_text: 'Exceeded expectations. Very happy!', verified_purchase: true },
      { review_id: '2', customer_id: 'CUST2002', rating: 4, title: 'Good', review_text: 'Good quality for the price.', verified_purchase: true }
    ];

    return {
      product,
      images: productImages,
      specifications: defaultSpecs,
      reviews: defaultReviews,
      seller: { name: 'NexDay Enterprise', rating: 4.5 },
      stock: 50
    };
  }
}

export async function addProductReview(productId: string, customerId: string, rating: number, title: string, reviewText: string, verifiedPurchase: boolean): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const reviewId = `REV-${productId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const query = `
      INSERT INTO reviews (review_id, product_id, customer_id, rating, review_title, review_text, verified_purchase, review_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')
    `;
    await dbPool.query(query, [reviewId, productId, customerId, rating, title, reviewText, verifiedPurchase]);

    const avgQuery = 'SELECT COUNT(*) as count, AVG(rating) as avg FROM reviews WHERE product_id = ? AND review_status = "PUBLISHED"';
    const [rows]: any = await dbPool.query(avgQuery, [productId]);
    if (rows.length > 0) {
      const count = rows[0].count;
      const avg = Number(Number(rows[0].avg).toFixed(1));
      await dbPool.query('UPDATE products SET rating = ?, review_count = ? WHERE product_id = ?', [avg, count, productId]);
    }
  }
}

export async function getWishlist(session_id: string, customer_id: string | null): Promise<any[]> {
  if (dbPool && !isInMemoryFallback) {
    const query = `
      SELECT w.wishlist_id, p.*, MIN(pi.image_url) as image_url, COALESCE(SUM(i.stock), 0) as stock
      FROM wishlist w
      JOIN products p ON w.product_id = p.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.image_type = 'primary'
      LEFT JOIN inventory i ON p.product_id = i.product_id
      WHERE (w.session_id = ? OR (w.customer_id IS NOT NULL AND w.customer_id = ?)) AND w.removed_at IS NULL
      GROUP BY w.wishlist_id, p.product_id
      ORDER BY w.added_at DESC
    `;
    const [rows]: any = await dbPool.query(query, [session_id, customer_id]);
    return rows as any[];
  } else {
    const key = customer_id || session_id;
    const ids = inMemoryWishlist.get(key) || [];
    const list: any[] = [];
    for (const id of ids) {
      const prod = inMemoryProducts.get(id);
      if (prod) {
        list.push({
          ...prod,
          wishlist_id: `W-${id}-${key.substring(0, 8)}`,
          stock: 50,
          image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop'
        });
      }
    }
    return list;
  }
}

export async function addToWishlist(session_id: string, customer_id: string | null, product_id: string): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const wishlistId = `W-${product_id}-${(customer_id || session_id).substring(0, 16)}`;
    const query = `
      INSERT INTO wishlist (wishlist_id, customer_id, session_id, product_id, removed_at, added_at)
      VALUES (?, ?, ?, ?, NULL, NOW())
      ON DUPLICATE KEY UPDATE removed_at = NULL, added_at = NOW(), updated_at = NOW()
    `;
    await dbPool.query(query, [wishlistId, customer_id, session_id, product_id]);
  } else {
    const key = customer_id || session_id;
    const list = inMemoryWishlist.get(key) || [];
    if (!list.includes(product_id)) {
      list.push(product_id);
      inMemoryWishlist.set(key, list);
    }
  }
}

export async function removeFromWishlist(session_id: string, customer_id: string | null, product_id: string): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const query = `
      UPDATE wishlist
      SET removed_at = NOW()
      WHERE product_id = ? AND (session_id = ? OR (customer_id IS NOT NULL AND customer_id = ?)) AND removed_at IS NULL
    `;
    await dbPool.query(query, [product_id, session_id, customer_id]);
  } else {
    const key = customer_id || session_id;
    let list = inMemoryWishlist.get(key) || [];
    list = list.filter(id => id !== product_id);
    inMemoryWishlist.set(key, list);
  }
}

export async function mergeWishlists(session_id: string, customer_id: string): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const [guestItems]: any = await dbPool.query('SELECT product_id FROM wishlist WHERE session_id = ? AND customer_id IS NULL', [session_id]);
    for (const item of guestItems) {
      const [exist]: any = await dbPool.query('SELECT wishlist_id FROM wishlist WHERE customer_id = ? AND product_id = ?', [customer_id, item.product_id]);
      if (exist.length > 0) {
        await dbPool.query('DELETE FROM wishlist WHERE customer_id = ? AND product_id = ?', [customer_id, item.product_id]);
      }
    }
    await dbPool.query('UPDATE wishlist SET customer_id = ? WHERE session_id = ? AND customer_id IS NULL', [customer_id, session_id]);
  } else {
    const guestKey = session_id;
    const customerKey = customer_id;
    const guestList = inMemoryWishlist.get(guestKey) || [];
    const customerList = inMemoryWishlist.get(customerKey) || [];
    
    const merged = Array.from(new Set([...customerList, ...guestList]));
    inMemoryWishlist.set(customerKey, merged);
    inMemoryWishlist.delete(guestKey);
  }
}

export async function getCouponByCode(code: string): Promise<any> {
  if (dbPool && !isInMemoryFallback) {
    const [rows]: any = await dbPool.query('SELECT * FROM coupons WHERE code = ? AND status = "ACTIVE"', [code]);
    return rows.length > 0 ? rows[0] : null;
  }
  return null;
}

export async function getAddresses(customer_id: string): Promise<any[]> {
  if (dbPool && !isInMemoryFallback) {
    const [rows]: any = await dbPool.query('SELECT * FROM addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC', [customer_id]);
    return rows;
  }
  return [];
}

export async function addAddress(customer_id: string, addr: any): Promise<void> {
  if (dbPool && !isInMemoryFallback) {
    const addressId = `ADDR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    if (addr.is_default) {
      await dbPool.query('UPDATE addresses SET is_default = FALSE WHERE customer_id = ?', [customer_id]);
    }
    await dbPool.query(
      'INSERT INTO addresses (address_id, customer_id, address_type, full_name, phone, address_line_1, address_line_2, city, state, postal_code, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        addressId,
        customer_id,
        addr.address_type || 'Home',
        addr.full_name,
        addr.phone,
        addr.address_line_1,
        addr.address_line_2 || null,
        addr.city,
        addr.state,
        addr.postal_code,
        addr.country || 'India',
        addr.is_default ? 1 : 0
      ]
    );
  }
}

export async function getAddressById(address_id: string): Promise<any> {
  if (dbPool && !isInMemoryFallback) {
    const [rows]: any = await dbPool.query('SELECT * FROM addresses WHERE address_id = ?', [address_id]);
    return rows.length > 0 ? rows[0] : null;
  }
  return null;
}

export async function getDeliveryOptions(): Promise<any[]> {
  if (dbPool && !isInMemoryFallback) {
    const [rows]: any = await dbPool.query('SELECT * FROM delivery_options WHERE status = "ACTIVE"');
    return rows;
  }
  return [
    { delivery_option_id: 'D1', name: 'Standard Delivery', delivery_days_min: 3, delivery_days_max: 5, price: 0 },
    { delivery_option_id: 'D2', name: 'Fast Delivery', delivery_days_min: 1, delivery_days_max: 2, price: 99 },
    { delivery_option_id: 'D3', name: 'Same Day', delivery_days_min: 0, delivery_days_max: 1, price: 199 }
  ];
}

export async function createOrderAndPayment(
  session_id: string,
  customer_id: string,
  address_id: string,
  delivery_option_id: string,
  payment_method: string,
  simulateFail = false
): Promise<any> {
  if (!dbPool || isInMemoryFallback) {
    throw new Error('Database is operating in fallback/in-memory mode.');
  }

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    // 1. Fetch Cart details
    const [cartRows]: any = await conn.query(
      'SELECT cart_id, coupon_code FROM cart WHERE customer_id = ? AND status = "ACTIVE"',
      [customer_id]
    );
    if (cartRows.length === 0) {
      throw new Error('Cart not found.');
    }
    const cart = cartRows[0];

    // 2. Fetch Cart Items with products and inventory data (supports custom/accessory fallbacks)
    const [items]: any = await conn.query(
      `SELECT ci.product_id, ci.quantity, ci.unit_price, 
              COALESCE(p.name, ci.product_id) as name, 
              COALESCE(SUM(i.stock), 999) as stock, 
              COALESCE(p.sale_price, ci.unit_price) as sale_price
       FROM cart_items ci
       LEFT JOIN products p ON ci.product_id = p.product_id
       LEFT JOIN inventory i ON p.product_id = i.product_id
       WHERE ci.cart_id = ?
       GROUP BY ci.product_id, ci.quantity, ci.unit_price, p.name, p.sale_price`,
      [cart.cart_id]
    );

    if (items.length === 0) {
      throw new Error('Your cart is empty.');
    }

    // 3. Re-validate prices and stock limits
    for (const item of items) {
      if (item.stock < item.quantity) {
        throw new Error(`Insufficient inventory for "${item.name}". Only ${item.stock} left in stock.`);
      }
      if (Number(item.sale_price) !== Number(item.unit_price)) {
        throw new Error(`PRICE_CHANGED: The price of "${item.name}" has changed. Previous: ₹${item.unit_price}, Current: ₹${item.sale_price}.`);
      }
    }

    // 4. Calculate Subtotal, Discounts, and Coupon Deductions
    const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.sale_price) * item.quantity), 0);
    let couponDiscount = 0;

    if (cart.coupon_code) {
      const [coupons]: any = await conn.query('SELECT * FROM coupons WHERE code = ? AND status = "ACTIVE"', [cart.coupon_code]);
      if (coupons.length > 0) {
        const coupon = coupons[0];
        if (subtotal >= Number(coupon.minimum_order_value)) {
          if (coupon.discount_type === 'percentage') {
            couponDiscount = subtotal * (Number(coupon.discount_value) / 100);
            if (couponDiscount > Number(coupon.maximum_discount)) {
              couponDiscount = Number(coupon.maximum_discount);
            }
          } else {
            couponDiscount = Number(coupon.discount_value);
          }
          couponDiscount = Math.min(couponDiscount, subtotal);
        }
      }
    }

    // 5. Fetch selected delivery option
    const [delOpts]: any = await conn.query('SELECT price FROM delivery_options WHERE delivery_option_id = ?', [delivery_option_id]);
    const shippingFee = delOpts.length > 0 ? Number(delOpts[0].price) : 0.00;

    const netTotal = subtotal - couponDiscount;
    const tax = Number((netTotal * 0.18).toFixed(2));
    const totalAmount = netTotal + tax + shippingFee;

    const orderId = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const paymentId = `PAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 6. Execute simulated transaction
    if (simulateFail) {
      // Payment failed scenario
      // Rollback transaction to release connection locks (stock is not touched)
      await conn.rollback();

      // Write order outside of transaction context
      await dbPool.query(
        'INSERT INTO orders (order_id, customer_id, session_id, address_id, status, subtotal, discount, coupon_discount, shipping_fee, tax, total_amount, payment_status, delivery_status, coupon_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [orderId, customer_id, session_id, address_id, 'PENDING', subtotal, 0.00, couponDiscount, shippingFee, tax, totalAmount, 'FAILED', 'NOT_SHIPPED', cart.coupon_code]
      );

      // Create Order Address Snapshot for failed order
      const [addrRows]: any = await dbPool.query('SELECT * FROM addresses WHERE address_id = ?', [address_id]);
      if (addrRows.length > 0) {
        const addr = addrRows[0];
        const orderAddressId = `OADDR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        await dbPool.query(
          `INSERT INTO order_addresses (order_address_id, order_id, address_type, full_name, phone, address_line_1, address_line_2, city, state, postal_code, country)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderAddressId, orderId, addr.address_type, addr.full_name, addr.phone, addr.address_line_1, addr.address_line_2, addr.city, addr.state, addr.postal_code, addr.country]
        );
      }

      for (const item of items) {
        const orderItemId = `OI-${item.product_id}-${orderId}`;
        await dbPool.query(
          'INSERT INTO order_items (order_item_id, order_id, product_id, quantity, unit_price, discount, final_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [orderItemId, orderId, item.product_id, item.quantity, item.sale_price, 0.00, item.sale_price * item.quantity]
        );
      }

      // Write payments registry
      await dbPool.query(
        'INSERT INTO payments (payment_id, order_id, customer_id, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)',
        [paymentId, orderId, customer_id, totalAmount, 'INR', 'FAILED']
      );

      // Write payment attempts
      const attemptId = `ATT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await dbPool.query(
        'INSERT INTO payment_attempts (attempt_id, payment_id, attempt_number, payment_method, transaction_reference, status, failure_reason, gateway, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [attemptId, paymentId, 1, payment_method, null, 'FAILED', 'BANK_DECLINED', 'RetailHub-Sim', new Date(), new Date()]
      );

      // Create Payment Failed Notification
      await createNotification(
        customer_id,
        'PAYMENT_FAILED',
        'TRANSACTIONAL',
        '💳 Payment Failed',
        `Transaction of ₹${totalAmount} failed for Order #${orderId}. Reason: Bank Declined.`,
        'ORDER',
        orderId,
        session_id
      );

      return { 
        order_id: orderId, 
        payment_id: paymentId, 
        attempt_id: attemptId,
        attempt_number: 1,
        payment_status: 'FAILED', 
        failure_reason: 'BANK_DECLINED',
        subtotal,
        discount: couponDiscount,
        shipping_fee: shippingFee,
        tax,
        total_amount: totalAmount,
        coupon_code: cart.coupon_code || null,
        cart_id: cart.cart_id,
        items: items.map((item: any) => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: Number(item.sale_price)
        }))
      };
    } else {
      // Payment success scenario
      // Subtract Inventory Stock from the first warehouse that has sufficient stock
      for (const item of items) {
        const [invs]: any = await conn.query(
          'SELECT inventory_id, stock FROM inventory WHERE product_id = ? AND stock >= ? ORDER BY stock DESC LIMIT 1',
          [item.product_id, item.quantity]
        );
        if (invs.length > 0) {
          await conn.query(
            'UPDATE inventory SET stock = stock - ? WHERE inventory_id = ?',
            [item.quantity, invs[0].inventory_id]
          );
        } else {
          // Fallback if no single warehouse has it, deduct from the warehouse with the most stock (if any)
          const [fallbackInvs]: any = await conn.query(
            'SELECT inventory_id, stock FROM inventory WHERE product_id = ? ORDER BY stock DESC LIMIT 1',
            [item.product_id]
          );
          if (fallbackInvs.length > 0) {
            await conn.query(
              'UPDATE inventory SET stock = stock - ? WHERE inventory_id = ?',
              [item.quantity, fallbackInvs[0].inventory_id]
            );
          }
        }
      }

      const orderPaymentStatus = payment_method === 'COD' ? 'PENDING' : 'PAID';
      const paymentStatus = payment_method === 'COD' ? 'PENDING' : 'SUCCESS';
      const attemptStatus = payment_method === 'COD' ? 'PENDING' : 'SUCCESS';

      // Create Order
      await conn.query(
        'INSERT INTO orders (order_id, customer_id, session_id, address_id, status, subtotal, discount, coupon_discount, shipping_fee, tax, total_amount, payment_status, delivery_status, coupon_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [orderId, customer_id, session_id, address_id, 'PROCESSING', subtotal, 0.00, couponDiscount, shippingFee, tax, totalAmount, orderPaymentStatus, 'NOT_SHIPPED', cart.coupon_code]
      );

      // Record coupon usage if a coupon was successfully applied
      if (cart.coupon_code) {
        const [couponRows]: any = await conn.query('SELECT coupon_id FROM coupons WHERE code = ?', [cart.coupon_code]);
        if (couponRows.length > 0) {
          const couponId = couponRows[0].coupon_id;
          const usageId = `USG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          await conn.query(
            `INSERT INTO coupon_usages (usage_id, coupon_id, customer_id, order_id, discount_amount)
             VALUES (?, ?, ?, ?, ?)`,
            [usageId, couponId, customer_id || 'GUEST', orderId, couponDiscount]
          );
        }
      }

      // Create Order Address Snapshot
      const [addrRows]: any = await conn.query('SELECT * FROM addresses WHERE address_id = ?', [address_id]);
      if (addrRows.length > 0) {
        const addr = addrRows[0];
        const orderAddressId = `OADDR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        await conn.query(
          `INSERT INTO order_addresses (order_address_id, order_id, address_type, full_name, phone, address_line_1, address_line_2, city, state, postal_code, country)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderAddressId, orderId, addr.address_type, addr.full_name, addr.phone, addr.address_line_1, addr.address_line_2, addr.city, addr.state, addr.postal_code, addr.country]
        );
      }

      // Create Order Items
      for (const item of items) {
        const orderItemId = `OI-${item.product_id}-${orderId}`;
        await conn.query(
          'INSERT INTO order_items (order_item_id, order_id, product_id, quantity, unit_price, discount, final_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [orderItemId, orderId, item.product_id, item.quantity, item.sale_price, 0.00, item.sale_price * item.quantity]
        );
      }

      // Create Payment Log
      const txRef = payment_method === 'COD' ? null : `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await conn.query(
        'INSERT INTO payments (payment_id, order_id, customer_id, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)',
        [paymentId, orderId, customer_id, totalAmount, 'INR', paymentStatus]
      );

      // Create Payment Attempt
      const attemptId = `ATT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await conn.query(
        'INSERT INTO payment_attempts (attempt_id, payment_id, attempt_number, payment_method, transaction_reference, status, failure_reason, gateway, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [attemptId, paymentId, 1, payment_method, txRef, attemptStatus, null, 'RetailHub-Sim', new Date(), new Date()]
      );

      // Clear the active cart items
      await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cart.cart_id]);
      await conn.query('UPDATE cart SET coupon_code = NULL WHERE cart_id = ?', [cart.cart_id]);

      await conn.commit();

      // Create Order Confirmed Notification
      await createNotification(
        customer_id,
        'ORDER_CONFIRMED',
        'TRANSACTIONAL',
        '📦 Order Confirmed',
        `Your order #${orderId} was successfully placed! We are packing your items.`,
        'ORDER',
        orderId,
        session_id
      );

      // Create Payment Successful Notification (if not COD)
      if (payment_method !== 'COD') {
        await createNotification(
          customer_id,
          'PAYMENT_SUCCESS',
          'TRANSACTIONAL',
          '💳 Payment Successful',
          `₹${totalAmount} paid successfully via ${payment_method} for Order #${orderId}.`,
          'ORDER',
          orderId,
          session_id
        );
      }
      
      // Auto-generate initial shipment parameters
      try {
        await createShipmentForOrder(orderId, address_id);
      } catch (shipErr) {
        console.error('[Warehouse Error] Auto-generating shipment failed:', shipErr);
      }

      // Auto-generate financial invoice records
      try {
        await createInvoiceForOrder(orderId);
      } catch (invErr) {
        console.error('[Invoice Error] Auto-generating invoice failed:', invErr);
      }

      return { 
        order_id: orderId, 
        payment_id: paymentId, 
        attempt_id: attemptId,
        attempt_number: 1,
        payment_status: 'PAID',
        subtotal,
        discount: couponDiscount,
        shipping_fee: shippingFee,
        tax,
        total_amount: totalAmount,
        coupon_code: cart.coupon_code || null,
        cart_id: cart.cart_id,
        items: items.map((item: any) => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: Number(item.sale_price)
        }))
      };
    }
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function retryOrderPayment(
  orderId: string,
  paymentMethod: string,
  simulateFail = false
): Promise<{ payment_status: string, payment_id: string, attempt_id: string, attempt_number: number, total_amount?: number, failure_reason?: string }> {
  if (!dbPool || isInMemoryFallback) {
    throw new Error('Database operating in fallback/in-memory mode.');
  }

  // Fetch order summary
  const [orders]: any = await dbPool.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
  if (orders.length === 0) {
    throw new Error('Order not found.');
  }
  const order = orders[0];

  // Fetch the existing payment ID for this order
  const [payRows]: any = await dbPool.query('SELECT payment_id FROM payments WHERE order_id = ?', [orderId]);
  if (payRows.length === 0) {
    throw new Error('Payment transaction record not found.');
  }
  const paymentId = payRows[0].payment_id;

  // Fetch attempts count for this payment record
  const [attemptsRows]: any = await dbPool.query('SELECT COUNT(*) as count FROM payment_attempts WHERE payment_id = ?', [paymentId]);
  const newAttempt = (attemptsRows[0].count || 0) + 1;
  const newAttemptId = `ATT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  if (simulateFail) {
    // Write failed attempt details
    await dbPool.query(
      'INSERT INTO payment_attempts (attempt_id, payment_id, attempt_number, payment_method, transaction_reference, status, failure_reason, gateway, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newAttemptId, paymentId, newAttempt, paymentMethod, null, 'FAILED', 'BANK_DECLINED', 'RetailHub-Sim', new Date(), new Date()]
    );
    return { 
      payment_status: 'FAILED', 
      payment_id: paymentId, 
      attempt_id: newAttemptId,
      attempt_number: newAttempt,
      total_amount: Number(order.total_amount),
      failure_reason: 'BANK_DECLINED' 
    };
  }

  // Success retry scenario
  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    // 1. Fetch Order Items
    const [items]: any = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);

    // 2. Validate stock availability before final payment
    for (const item of items) {
      const [inventory]: any = await conn.query('SELECT SUM(stock) as stock FROM inventory WHERE product_id = ?', [item.product_id]);
      const currentStock = inventory.length > 0 && inventory[0].stock !== null ? Number(inventory[0].stock) : 999;
      if (currentStock < item.quantity) {
        throw new Error('Some items in this order are no longer available in stock.');
      }
    }

    // 3. Deduct Stock
    for (const item of items) {
      const [invs]: any = await conn.query(
        'SELECT inventory_id, stock FROM inventory WHERE product_id = ? AND stock >= ? ORDER BY stock DESC LIMIT 1',
        [item.product_id, item.quantity]
      );
      if (invs.length > 0) {
        await conn.query(
          'UPDATE inventory SET stock = stock - ? WHERE inventory_id = ?',
          [item.quantity, invs[0].inventory_id]
        );
      } else {
        const [fallbackInvs]: any = await conn.query(
          'SELECT inventory_id, stock FROM inventory WHERE product_id = ? ORDER BY stock DESC LIMIT 1',
          [item.product_id]
        );
        if (fallbackInvs.length > 0) {
          await conn.query(
            'UPDATE inventory SET stock = stock - ? WHERE inventory_id = ?',
            [item.quantity, fallbackInvs[0].inventory_id]
          );
        }
      }
    }

    // 4. Update order payment status
    await conn.query('UPDATE orders SET status = "PROCESSING", payment_status = "PAID" WHERE order_id = ?', [orderId]);

    // 5. Update parent payment status
    await conn.query('UPDATE payments SET status = "SUCCESS" WHERE payment_id = ?', [paymentId]);

    // 6. Insert successful attempt logs
    const txRef = `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    await conn.query(
      'INSERT INTO payment_attempts (attempt_id, payment_id, attempt_number, payment_method, transaction_reference, status, failure_reason, gateway, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newAttemptId, paymentId, newAttempt, paymentMethod, txRef, 'SUCCESS', null, 'RetailHub-Sim', new Date(), new Date()]
    );

    // Clear cart if it hasn't been cleared (since payment failed originally, cart items were kept)
    const [cartRows]: any = await conn.query('SELECT cart_id FROM cart WHERE customer_id = ? AND status = "ACTIVE"', [order.customer_id]);
    if (cartRows.length > 0) {
      await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cartRows[0].cart_id]);
      await conn.query('UPDATE cart SET coupon_code = NULL WHERE cart_id = ?', [cartRows[0].cart_id]);
    }

    await conn.commit();

    // Auto-generate initial shipment parameters on successful retry payment
    try {
      await createShipmentForOrder(orderId, order.address_id);
    } catch (shipErr) {
      console.error('[Warehouse Error] Auto-generating shipment on retry failed:', shipErr);
    }

    // Auto-generate financial invoice records on successful retry payment
    try {
      await createInvoiceForOrder(orderId);
    } catch (invErr) {
      console.error('[Invoice Error] Auto-generating invoice on retry failed:', invErr);
    }

    return { 
      payment_status: 'PAID', 
      payment_id: paymentId,
      attempt_id: newAttemptId,
      attempt_number: newAttempt,
      total_amount: Number(order.total_amount)
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getOrdersByCustomerId(customerId: string): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];
  const [orders]: any = await dbPool.query(
    'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC',
    [customerId]
  );
  
  for (const order of orders) {
    const [items]: any = await dbPool.query(
      `SELECT oi.*, p.name as product_name, p.sku 
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = ?`,
      [order.order_id]
    );
    order.items = items;

    // Fetch shipment details
    const [shipments]: any = await dbPool.query('SELECT * FROM shipments WHERE order_id = ?', [order.order_id]);
    order.shipment = shipments.length > 0 ? shipments[0] : null;

    // Fetch tracking events history
    const [events]: any = await dbPool.query(
      'SELECT * FROM shipment_tracking_events WHERE order_id = ? ORDER BY event_time ASC',
      [order.order_id]
    );
    order.history = events;

    // Fetch order address snapshot
    const [addrRows]: any = await dbPool.query('SELECT * FROM order_addresses WHERE order_id = ?', [order.order_id]);
    order.address = addrRows.length > 0 ? addrRows[0] : null;
  }
  return orders;
}

export async function getShipmentByOrderId(orderId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;
  const [shipmentRows]: any = await dbPool.query('SELECT * FROM shipments WHERE order_id = ?', [orderId]);
  if (shipmentRows.length === 0) return null;
  
  const shipment = shipmentRows[0];
  const [eventRows]: any = await dbPool.query(
    'SELECT * FROM shipment_tracking_events WHERE shipment_id = ? ORDER BY event_time ASC, created_at ASC',
    [shipment.shipment_id]
  );
  
  return {
    ...shipment,
    events: eventRows
  };
}

export async function createShipmentForOrder(orderId: string, addressId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  // Fetch order details
  const [orderRows]: any = await dbPool.query('SELECT customer_id, session_id FROM orders WHERE order_id = ?', [orderId]);
  if (orderRows.length === 0) return null;
  const { customer_id, session_id } = orderRows[0];

  // Fetch address details
  const [addrRows]: any = await dbPool.query('SELECT city, state, country FROM addresses WHERE address_id = ?', [addressId]);
  if (addrRows.length === 0) return null;
  const destination = addrRows[0];

  const shipmentId = `SHIP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const trackingNumber = `TRK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Default estimations
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 2); // 2 days estimation

  const shipment = {
    shipment_id: shipmentId,
    order_id: orderId,
    customer_id,
    warehouse_id: 'WH-BLR-01',
    carrier_id: 'Carrier-RH',
    tracking_number: trackingNumber,
    shipment_status: 'CREATED',
    origin_city: 'Bengaluru',
    origin_state: 'Karnataka',
    origin_country: 'India',
    destination_city: destination.city,
    destination_state: destination.state,
    destination_country: destination.country,
    estimated_delivery: estimatedDelivery
  };

  await dbPool.query(
    `INSERT INTO shipments (
      shipment_id, order_id, customer_id, warehouse_id, carrier_id, tracking_number, shipment_status,
      origin_city, origin_state, origin_country, destination_city, destination_state, destination_country, estimated_delivery
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      shipment.shipment_id, shipment.order_id, shipment.customer_id, shipment.warehouse_id, shipment.carrier_id, shipment.tracking_number, shipment.shipment_status,
      shipment.origin_city, shipment.origin_state, shipment.origin_country, shipment.destination_city, shipment.destination_state, shipment.destination_country, shipment.estimated_delivery
    ]
  );

  // Add initial tracking event
  await addShipmentTrackingEvent(
    shipmentId,
    'CREATED',
    'Bengaluru',
    'Karnataka',
    'India',
    'Package packaged and shipment record created.',
    'WH-BLR-01'
  );

  return shipment;
}

export async function addShipmentTrackingEvent(
  shipmentId: string,
  status: string,
  city: string,
  state: string,
  country: string,
  description: string,
  facilityId: string | null = null
): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  // Fetch shipment details
  const [shipmentRows]: any = await dbPool.query('SELECT order_id, customer_id FROM shipments WHERE shipment_id = ?', [shipmentId]);
  if (shipmentRows.length === 0) return null;
  const { order_id, customer_id } = shipmentRows[0];

  const trackingEventId = `TRK-E-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const now = new Date();

  await dbPool.query(
    `INSERT INTO shipment_tracking_events (
      tracking_event_id, shipment_id, order_id, status, location_city, location_state, location_country, facility_id, description, event_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      trackingEventId, shipmentId, order_id, status, city, state, country, facilityId, description, now
    ]
  );

  // Update shipment status and timestamps
  let statusUpdateQuery = 'UPDATE shipments SET shipment_status = ?';
  const queryParams: any[] = [status];

  if (status === 'SHIPPED') {
    statusUpdateQuery += ', shipped_at = ?';
    queryParams.push(now);
  } else if (status === 'DELIVERED') {
    statusUpdateQuery += ', delivered_at = ?, actual_delivery = ?';
    queryParams.push(now, now);
  }

  statusUpdateQuery += ' WHERE shipment_id = ?';
  queryParams.push(shipmentId);

  await dbPool.query(statusUpdateQuery, queryParams);

  // Also update order delivery status if appropriate
  if (status === 'DELIVERED') {
    await dbPool.query('UPDATE orders SET status = "DELIVERED", delivery_status = "DELIVERED" WHERE order_id = ?', [order_id]);
  } else if (status === 'SHIPPED' || status === 'IN_TRANSIT') {
    await dbPool.query('UPDATE orders SET delivery_status = "SHIPPED" WHERE order_id = ?', [order_id]);
  }

  // Trigger Tracking Notifications
  try {
    if (status === 'SHIPPED') {
      await createNotification(
        customer_id,
        'ORDER_SHIPPED',
        'TRANSACTIONAL',
        '🚚 Order Shipped',
        `Your order #${order_id} has been shipped! Live tracking is active.`,
        'ORDER',
        order_id
      );
    } else if (status === 'OUT_FOR_DELIVERY') {
      await createNotification(
        customer_id,
        'OUT_FOR_DELIVERY',
        'TRANSACTIONAL',
        '🛵 Out For Delivery',
        `Package for Order #${order_id} is out for delivery! Expect it today.`,
        'ORDER',
        order_id
      );
    } else if (status === 'DELIVERED') {
      await createNotification(
        customer_id,
        'ORDER_DELIVERED',
        'TRANSACTIONAL',
        '✓ Order Delivered',
        `Your package for Order #${order_id} has been delivered successfully.`,
        'ORDER',
        order_id
      );
    }
  } catch (notifErr) {
    console.error('Failed to auto-send tracking notification:', notifErr);
  }

  return { tracking_event_id: trackingEventId, status, description, event_time: now };
}

export async function getInvoiceById(invoiceId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;
  
  const [invoiceRows]: any = await dbPool.query('SELECT * FROM invoices WHERE invoice_id = ?', [invoiceId]);
  if (invoiceRows.length === 0) return null;
  const invoice = invoiceRows[0];

  const [itemRows]: any = await dbPool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
  
  // Resolve address details
  const [addrRows]: any = await dbPool.query('SELECT * FROM addresses WHERE address_id = ?', [invoice.shipping_address_id]);
  const address = addrRows.length > 0 ? addrRows[0] : null;

  // Resolve customer details
  const [custRows]: any = await dbPool.query('SELECT first_name, last_name, email FROM customers WHERE customer_id = ?', [invoice.customer_id]);
  const customer = custRows.length > 0 ? custRows[0] : null;

  return {
    ...invoice,
    items: itemRows,
    address,
    customer
  };
}

export async function getInvoiceByOrderId(orderId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const [invoiceRows]: any = await dbPool.query('SELECT * FROM invoices WHERE order_id = ?', [orderId]);
  if (invoiceRows.length === 0) return null;
  return getInvoiceById(invoiceRows[0].invoice_id);
}

export async function createInvoiceForOrder(orderId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  // 1. Fetch Order Details
  const [orders]: any = await dbPool.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
  if (orders.length === 0) throw new Error(`Order ${orderId} not found.`);
  const order = orders[0];

  // Resolve payment method used
  let paymentMethod = 'UPI'; // fallback
  const [payRows]: any = await dbPool.query('SELECT payment_id FROM payments WHERE order_id = ?', [orderId]);
  if (payRows.length > 0) {
    const paymentId = payRows[0].payment_id;
    const [attRows]: any = await dbPool.query(
      'SELECT payment_method FROM payment_attempts WHERE payment_id = ? AND status = "SUCCESS" ORDER BY attempt_number DESC LIMIT 1',
      [paymentId]
    );
    if (attRows.length > 0) {
      paymentMethod = attRows[0].payment_method;
    } else {
      const [anyAttRows]: any = await dbPool.query(
        'SELECT payment_method FROM payment_attempts WHERE payment_id = ? ORDER BY attempt_number DESC LIMIT 1',
        [paymentId]
      );
      if (anyAttRows.length > 0) {
        paymentMethod = anyAttRows[0].payment_method;
      }
    }
  }

  // 2. Fetch Order Items with product details
  const [orderItems]: any = await dbPool.query(
    `SELECT oi.*, p.name as product_name, p.sku 
     FROM order_items oi
     JOIN products p ON oi.product_id = p.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );

  // 3. Fetch Customer Details
  const [custRows]: any = await dbPool.query('SELECT * FROM customers WHERE customer_id = ?', [order.customer_id]);
  if (custRows.length === 0) throw new Error(`Customer ${order.customer_id} not found.`);
  const customer = custRows[0];

  // 4. Resolve Address
  const [addrRows]: any = await dbPool.query('SELECT * FROM addresses WHERE address_id = ?', [order.address_id]);
  const address = addrRows.length > 0 ? addrRows[0] : { city: 'Bengaluru', state: 'Karnataka', country: 'India' };

  // 5. Generate Invoice IDs
  const invoiceId = `INV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `INV${dateStr}${rand}`;

  // 6. Write local Plain-Text Receipt file
  const invoicesDir = path.join(process.cwd(), 'invoices');
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }

  const pdfPath = `invoices/${invoiceNumber}.txt`;
  const absolutePath = path.join(invoicesDir, `${invoiceNumber}.txt`);

  // Construct plain-text invoice layout
  let txtContent = `==================================================\n`;
  txtContent += `                  RETAILHUB INVOICE\n`;
  txtContent += `==================================================\n`;
  txtContent += `GSTIN          : 29AAAAA0000A1Z5\n`;
  txtContent += `Invoice Number : ${invoiceNumber}\n`;
  txtContent += `Invoice Date   : ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
  txtContent += `Order Reference: ${orderId}\n`;
  txtContent += `Customer ID    : ${order.customer_id}\n\n`;

  txtContent += `BILL TO / SHIP TO:\n`;
  txtContent += `${customer.first_name} ${customer.last_name}\n`;
  txtContent += `${address.city || 'Bengaluru'}, ${address.state || 'Karnataka'}\n`;
  txtContent += `${address.country || 'India'}\n\n`;

  txtContent += `--------------------------------------------------\n`;
  txtContent += `ITEMS DETAILS:\n`;
  txtContent += `--------------------------------------------------\n`;

  for (const item of orderItems) {
    const itemTotal = Number(item.final_price);
    txtContent += `- ${item.product_name} (Qty ${item.quantity}) - Price: ₹${Number(item.unit_price).toLocaleString()} (Total: ₹${itemTotal.toLocaleString()})\n`;
  }
  txtContent += `--------------------------------------------------\n`;
  txtContent += `Subtotal       : ₹${Number(order.subtotal).toLocaleString()}\n`;
  if (Number(order.coupon_discount) > 0) {
    txtContent += `Coupon Discount: -₹${Number(order.coupon_discount).toLocaleString()}\n`;
  }
  txtContent += `Estimated GST  : ₹${Number(order.tax).toLocaleString()}\n`;
  txtContent += `Shipping Fee   : ${Number(order.shipping_fee) === 0 ? 'FREE' : '₹' + Number(order.shipping_fee).toLocaleString()}\n`;
  txtContent += `GRAND TOTAL    : ₹${Number(order.total_amount).toLocaleString()}\n`;
  txtContent += `--------------------------------------------------\n`;
  txtContent += `Payment Method : ${paymentMethod}\n`;
  txtContent += `Payment Status : ${order.payment_status === 'PAID' ? 'PAID' : 'SUCCESS'}\n`;
  txtContent += `==================================================\n`;
  txtContent += `Thank you for shopping with RetailHub!\n`;

  fs.writeFileSync(absolutePath, txtContent, 'utf-8');

  // 7. Insert Invoice Record
  await dbPool.query(
    `INSERT INTO invoices (
      invoice_id, order_id, customer_id, invoice_number, invoice_date, subtotal, discount, tax, shipping_fee, total_amount,
      currency, payment_status, payment_method, billing_address_id, shipping_address_id, pdf_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoiceId, orderId, order.customer_id, invoiceNumber, now, order.subtotal, order.coupon_discount, order.tax, order.shipping_fee, order.total_amount,
      'INR', order.payment_status === 'PAID' ? 'PAID' : 'SUCCESS', paymentMethod, order.address_id, order.address_id, pdfPath
    ]
  );

  // 8. Insert Invoice Items History Records
  for (const item of orderItems) {
    const itemId = `INV-I-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    await dbPool.query(
      `INSERT INTO invoice_items (
        invoice_item_id, invoice_id, order_item_id, product_id, product_name, sku, quantity, unit_price, discount, tax, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId, invoiceId, item.order_item_id, item.product_id, item.product_name, item.sku, item.quantity, item.unit_price, 0.00, Number((item.final_price * 0.18).toFixed(2)), item.final_price
      ]
    );
  }

  // 9. Emit telemetry event
  EventLogger.logEvent({
    event_type: 'invoice_generated',
    session_id: order.session_id || 'sess_ex3mk4wa',
    customer_id: order.customer_id,
    user_type: 'registered',
    page: 'payment',
    context: {
      country: customer.country || 'India',
      state: customer.state || 'Karnataka',
      city: customer.city || 'Bengaluru',
      device: 'desktop',
      browser: 'Chrome'
    },
    metadata: {
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      order_id: orderId,
      amount: Number(order.total_amount),
      currency: 'INR'
    }
  });

  return { invoice_id: invoiceId, invoice_number: invoiceNumber, pdf_path: pdfPath };
}

export async function createReturnRequest(
  orderId: string,
  customerId: string,
  returnReason: string,
  customerComments: string | null,
  pickupAddressId: string,
  items: Array<{ order_item_id: string; product_id: string; quantity: number; refund_amount: number; item_price: number }>
): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verify order exists
    const [orders]: any = await conn.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (orders.length === 0) throw new Error(`Order ${orderId} not found.`);
    const order = orders[0];

    const returnId = `RET-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 2. Insert returns header record
    await conn.query(
      `INSERT INTO returns (return_id, order_id, customer_id, return_status, return_reason, customer_comments, pickup_address_id, requested_at)
       VALUES (?, ?, ?, 'REQUESTED', ?, ?, ?, ?)`,
      [returnId, orderId, customerId, returnReason, customerComments, pickupAddressId, new Date()]
    );

    // 3. Insert return items
    let totalRefundEstimate = 0;
    for (const item of items) {
      const returnItemId = `RET-I-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await conn.query(
        `INSERT INTO return_items (return_item_id, return_id, order_item_id, product_id, quantity, item_price, refund_amount, inspection_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [returnItemId, returnId, item.order_item_id, item.product_id, item.quantity, item.item_price, item.refund_amount]
      );
      totalRefundEstimate += item.refund_amount;
    }

    // Update order and shipment status to RETURN_REQUESTED
    await conn.query('UPDATE orders SET status = "RETURN_REQUESTED" WHERE order_id = ?', [orderId]);
    await conn.query('UPDATE shipments SET shipment_status = "RETURN_REQUESTED" WHERE order_id = ?', [orderId]);

    // Insert tracking event
    const [shipmentsRows]: any = await conn.query('SELECT shipment_id FROM shipments WHERE order_id = ?', [orderId]);
    const shipmentId = shipmentsRows.length > 0 ? shipmentsRows[0].shipment_id : 'MOCK-SHIPMENT-ID';
    const trackingEventId = `EVT-TRK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    await conn.query(
      `INSERT INTO shipment_tracking_events (
         tracking_event_id, shipment_id, order_id, status, location_city, location_state, location_country, facility_id, description, event_time
       ) VALUES (?, ?, ?, 'RETURN_REQUESTED', 'Bengaluru', 'Karnataka', 'India', 'WH-BLR-01', 'Customer has requested a return for items in this order.', NOW())`,
      [trackingEventId, shipmentId, orderId]
    );

    await conn.commit();

    // Create Return Requested Notification
    await createNotification(
      customerId,
      'RETURN_REQUESTED',
      'TRANSACTIONAL',
      '↩ Return Requested',
      `Your return request RET-${returnId} for Order #${orderId} was received.`,
      'ORDER',
      orderId,
      order.session_id || 'system_triggered'
    );

    // 4. Resolve customer details for telemetry context
    const [custRows]: any = await dbPool.query('SELECT * FROM customers WHERE customer_id = ?', [customerId]);
    const customer = custRows.length > 0 ? custRows[0] : null;

    // 5. Emit telemetry event 'return_requested'
    EventLogger.logEvent({
      event_type: 'return_requested',
      session_id: order.session_id || 'sess_ex3mk4wa',
      customer_id: customerId,
      user_type: 'registered',
      page: 'return',
      context: {
        country: customer?.country || 'India',
        state: customer?.state || 'Karnataka',
        city: customer?.city || 'Bengaluru',
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        return_id: returnId,
        order_id: orderId,
        return_reason: returnReason,
        refund_amount: totalRefundEstimate
      }
    });

    return { return_id: returnId, status: 'REQUESTED' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getReturnByOrderId(orderId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const [returnRows]: any = await dbPool.query('SELECT * FROM returns WHERE order_id = ? ORDER BY created_at DESC', [orderId]);
  if (returnRows.length === 0) return null;
  const returnObj = returnRows[0];

  const [itemRows]: any = await dbPool.query(
    `SELECT ri.*, p.name as product_name, p.sku 
     FROM return_items ri
     JOIN products p ON ri.product_id = p.product_id
     WHERE ri.return_id = ?`,
    [returnObj.return_id]
  );

  const [refundRows]: any = await dbPool.query('SELECT * FROM refunds WHERE return_id = ?', [returnObj.return_id]);
  const refund = refundRows.length > 0 ? refundRows[0] : null;

  return {
    ...returnObj,
    items: itemRows,
    refund
  };
}

export async function advanceReturnLifecycle(returnId: string, nextStatus: string, simulateFail?: boolean): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const [returnRows]: any = await dbPool.query('SELECT * FROM returns WHERE return_id = ?', [returnId]);
  if (returnRows.length === 0) throw new Error(`Return ${returnId} not found.`);
  const returnObj = returnRows[0];

  const [items]: any = await dbPool.query('SELECT * FROM return_items WHERE return_id = ?', [returnId]);
  const [custRows]: any = await dbPool.query('SELECT * FROM customers WHERE customer_id = ?', [returnObj.customer_id]);
  const customer = custRows.length > 0 ? custRows[0] : null;

  const [orders]: any = await dbPool.query('SELECT * FROM orders WHERE order_id = ?', [returnObj.order_id]);
  const order = orders.length > 0 ? orders[0] : null;

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    let refundSum = 0;
    const now = new Date();
    let updateQuery = 'UPDATE returns SET return_status = ?';
    const queryParams: any[] = [nextStatus];

    if (nextStatus === 'APPROVED') {
      updateQuery += ', approved_at = ?';
      queryParams.push(now);
    } else if (nextStatus === 'REJECTED') {
      updateQuery += ', rejected_at = ?';
      queryParams.push(now);
    } else if (nextStatus === 'PICKED_UP') {
      updateQuery += ', picked_up_at = ?';
      queryParams.push(now);
    } else if (nextStatus === 'RECEIVED') {
      updateQuery += ', received_at = ?';
      queryParams.push(now);
    } else if (nextStatus === 'COMPLETED') {
      updateQuery += ', completed_at = ?';
      queryParams.push(now);
    }

    updateQuery += ' WHERE return_id = ?';
    queryParams.push(returnId);

    await conn.query(updateQuery, queryParams);

    // If completed/approved in inspection, execute the refund logic
    if (nextStatus === 'COMPLETED') {
      // 1. Update all return items inspection status to APPROVED
      await conn.query('UPDATE return_items SET inspection_status = "APPROVED" WHERE return_id = ?', [returnId]);

      // 2. Find total refund sum
      refundSum = 0;
      for (const item of items) {
        refundSum += Number(item.refund_amount);
      }

      // 3. Resolve parent payment ID
      const [payRows]: any = await conn.query('SELECT payment_id FROM payments WHERE order_id = ?', [returnObj.order_id]);
      const paymentId = payRows.length > 0 ? payRows[0].payment_id : `PAY-MOCK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // 4. Create Refund Record
      const refundId = `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const refundMethod = order?.payment_method || 'UPI';

      // Log 'refund_initiated' event
      EventLogger.logEvent({
        event_type: 'refund_initiated',
        session_id: order?.session_id || 'sess_ex3mk4wa',
        customer_id: returnObj.customer_id,
        user_type: 'registered',
        page: 'return',
        context: {
          country: customer?.country || 'India',
          state: customer?.state || 'Karnataka',
          city: customer?.city || 'Bengaluru',
          device: 'desktop',
          browser: 'Chrome'
        },
        metadata: {
          refund_id: refundId,
          return_id: returnId,
          order_id: returnObj.order_id,
          payment_id: paymentId,
          refund_amount: refundSum,
          refund_method: refundMethod
        }
      });

      if (simulateFail) {
        // Log 'refund_failed' event
        EventLogger.logEvent({
          event_type: 'refund_failed',
          session_id: order?.session_id || 'sess_ex3mk4wa',
          customer_id: returnObj.customer_id,
          user_type: 'registered',
          page: 'return',
          context: {
            country: customer?.country || 'India',
            state: customer?.state || 'Karnataka',
            city: customer?.city || 'Bengaluru',
            device: 'desktop',
            browser: 'Chrome'
          },
          metadata: {
            refund_id: refundId,
            return_id: returnId,
            order_id: returnObj.order_id,
            refund_amount: refundSum,
            failure_reason: 'BANK_PROCESSING_ERROR'
          }
        });

        // Insert failed refund record
        await conn.query(
          `INSERT INTO refunds (refund_id, return_id, order_id, payment_id, customer_id, refund_method, refund_amount, refund_status, failure_reason, initiated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'FAILED', 'BANK_PROCESSING_ERROR', ?)`,
          [refundId, returnId, returnObj.order_id, paymentId, returnObj.customer_id, refundMethod, refundSum, now]
        );

        // Keep return status in received/inspection failed state
        await conn.query('UPDATE returns SET return_status = "RECEIVED" WHERE return_id = ?', [returnId]);
      } else {
        // Success refund scenario
        const refNumber = `RFN${Math.floor(100000 + Math.random() * 900000)}`;

        // Log 'refund_success' event
        EventLogger.logEvent({
          event_type: 'refund_success',
          session_id: order?.session_id || 'sess_ex3mk4wa',
          customer_id: returnObj.customer_id,
          user_type: 'registered',
          page: 'return',
          context: {
            country: customer?.country || 'India',
            state: customer?.state || 'Karnataka',
            city: customer?.city || 'Bengaluru',
            device: 'desktop',
            browser: 'Chrome'
          },
          metadata: {
            refund_id: refundId,
            return_id: returnId,
            order_id: returnObj.order_id,
            payment_id: paymentId,
            refund_amount: refundSum,
            refund_method: refundMethod,
            refund_reference: refNumber
          }
        });

        // Insert successful refund record
        await conn.query(
          `INSERT INTO refunds (refund_id, return_id, order_id, payment_id, customer_id, refund_method, refund_amount, refund_status, refund_reference, initiated_at, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?)`,
          [refundId, returnId, returnObj.order_id, paymentId, returnObj.customer_id, refundMethod, refundSum, refNumber, now, now]
        );

        // Restock inventory in MySQL
        for (const item of items) {
          // Increment stock count in the warehouse
          const [invRows]: any = await conn.query(
            'SELECT inventory_id FROM inventory WHERE product_id = ? ORDER BY stock ASC LIMIT 1',
            [item.product_id]
          );
          if (invRows.length > 0) {
            await conn.query(
              'UPDATE inventory SET stock = stock + ? WHERE inventory_id = ?',
              [item.quantity, invRows[0].inventory_id]
            );
          }
        }
      }
    } else {
      // Log return progression telemetry events for intermediate steps
      let evType = '';
      if (nextStatus === 'APPROVED') evType = 'return_approved';
      else if (nextStatus === 'REJECTED') evType = 'return_rejected';
      else if (nextStatus === 'PICKUP_SCHEDULED') evType = 'return_pickup_scheduled';
      else if (nextStatus === 'PICKED_UP') evType = 'return_picked_up';
      else if (nextStatus === 'RECEIVED') evType = 'return_received';

      if (evType) {
        EventLogger.logEvent({
          event_type: evType,
          session_id: order?.session_id || 'sess_ex3mk4wa',
          customer_id: returnObj.customer_id,
          user_type: 'registered',
          page: 'return',
          context: {
            country: customer?.country || 'India',
            state: customer?.state || 'Karnataka',
            city: customer?.city || 'Bengaluru',
            device: 'desktop',
            browser: 'Chrome'
          },
          metadata: {
            return_id: returnId,
            order_id: returnObj.order_id,
            status: nextStatus
          }
        });
      }
    }

    // Sync order status with the return progression
    let orderStatus = '';
    if (nextStatus === 'APPROVED') {
      orderStatus = 'RETURN_APPROVED';
    } else if (nextStatus === 'RECEIVED') {
      orderStatus = 'RETURN_RECEIVED';
    } else if (nextStatus === 'COMPLETED') {
      orderStatus = 'REFUNDED';
    } else if (nextStatus === 'REJECTED') {
      orderStatus = 'DELIVERED';
    }

    if (orderStatus) {
      await conn.query('UPDATE orders SET status = ? WHERE order_id = ?', [orderStatus, returnObj.order_id]);
      await conn.query('UPDATE shipments SET shipment_status = ? WHERE order_id = ?', [orderStatus, returnObj.order_id]);

      // Add a shipment tracking event logs row
      const [shipments]: any = await conn.query('SELECT shipment_id FROM shipments WHERE order_id = ?', [returnObj.order_id]);
      const shipmentId = shipments.length > 0 ? shipments[0].shipment_id : 'MOCK-SHIPMENT-ID';
      const trackingEventId = `EVT-TRK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await conn.query(
        `INSERT INTO shipment_tracking_events (
           tracking_event_id, shipment_id, order_id, status, location_city, location_state, location_country, facility_id, description, event_time
         ) VALUES (?, ?, ?, ?, 'Bengaluru', 'Karnataka', 'India', 'WH-BLR-01', ?, NOW())`,
        [trackingEventId, shipmentId, returnObj.order_id, orderStatus, `Return lifecycle progressed to ${nextStatus}`]
      );
    }

    await conn.commit();

    // Trigger Return / Refund Notifications
    try {
      if (nextStatus === 'APPROVED') {
        await createNotification(
          returnObj.customer_id,
          'RETURN_APPROVED',
          'TRANSACTIONAL',
          '✓ Return Approved',
          `Your return RET-${returnId} for Order #${returnObj.order_id} has been approved.`,
          'ORDER',
          returnObj.order_id
        );
      } else if (nextStatus === 'REJECTED') {
        await createNotification(
          returnObj.customer_id,
          'RETURN_REJECTED',
          'TRANSACTIONAL',
          '🚫 Return Rejected',
          `Your return RET-${returnId} for Order #${returnObj.order_id} was rejected.`,
          'ORDER',
          returnObj.order_id
        );
      } else if (nextStatus === 'PICKED_UP') {
        await createNotification(
          returnObj.customer_id,
          'RETURN_PICKED_UP',
          'TRANSACTIONAL',
          '📦 Return Picked Up',
          `Package for return RET-${returnId} has been picked up by the carrier.`,
          'ORDER',
          returnObj.order_id
        );
      } else if (nextStatus === 'RECEIVED') {
        await createNotification(
          returnObj.customer_id,
          'RETURN_RECEIVED',
          'TRANSACTIONAL',
          '🏢 Return Package Received',
          `Your return package for RET-${returnId} has arrived at our warehouse.`,
          'ORDER',
          returnObj.order_id
        );
      } else if (nextStatus === 'COMPLETED') {
        // Calculate refund sum if not already available in scope
        let rSum = 0;
        if (typeof refundSum !== 'undefined') {
          rSum = refundSum;
        } else {
          for (const item of items) {
            rSum += Number(item.refund_amount);
          }
        }
        if (simulateFail) {
          await createNotification(
            returnObj.customer_id,
            'REFUND_FAILED',
            'TRANSACTIONAL',
            '⚠️ Refund Delayed',
            `Refund processing failed for Order #${returnObj.order_id}. Contact support.`,
            'ORDER',
            returnObj.order_id
          );
        } else {
          await createNotification(
            returnObj.customer_id,
            'REFUND_SUCCESS',
            'TRANSACTIONAL',
            '💰 Refund Successful',
            `Refund of ₹${rSum} has been credited to your payment account for Order #${returnObj.order_id}.`,
            'ORDER',
            returnObj.order_id
          );
        }
      }
    } catch (notifErr) {
      console.error('Failed to auto-send return/refund notification:', notifErr);
    }

    return { return_id: returnId, status: nextStatus };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function submitProductReview(
  customerId: string,
  orderId: string,
  orderItemId: string,
  productId: string,
  rating: number,
  reviewTitle: string,
  reviewText: string,
  filePaths: string[] = []
): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verify that order item exists, belongs to the customer, and is delivered
    const [orderItems]: any = await conn.query(
      `SELECT oi.*, o.customer_id, o.delivery_status 
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.order_id
       WHERE oi.order_item_id = ? AND o.order_id = ? AND o.customer_id = ?`,
      [orderItemId, orderId, customerId]
    );

    if (orderItems.length === 0) {
      throw new Error('No matching purchase record was found for this item.');
    }

    const orderItem = orderItems[0];
    const isVerified = orderItem.delivery_status === 'DELIVERED';

    // 2. Generate review ID
    const reviewId = `REV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 3. Insert review record
    await conn.query(
      `INSERT INTO reviews (review_id, customer_id, order_id, order_item_id, product_id, rating, review_title, review_text, verified_purchase, review_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')`,
      [reviewId, customerId, orderId, orderItemId, productId, rating, reviewTitle, reviewText, isVerified]
    );

    // 4. Insert media files
    for (const filePath of filePaths) {
      const mediaId = `REV-M-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await conn.query(
        `INSERT INTO review_media (media_id, review_id, file_path, media_type)
         VALUES (?, ?, ?, 'IMAGE')`,
        [mediaId, reviewId, filePath]
      );
    }

    await conn.commit();

    // 5. Fetch telemetry context details
    const [custRows]: any = await dbPool.query('SELECT * FROM customers WHERE customer_id = ?', [customerId]);
    const customer = custRows.length > 0 ? custRows[0] : null;

    const [prodRows]: any = await dbPool.query('SELECT * FROM products WHERE product_id = ?', [productId]);
    const product = prodRows.length > 0 ? prodRows[0] : null;

    const [orders]: any = await dbPool.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    const order = orders.length > 0 ? orders[0] : null;

    // 6. Log 'review_added' clickstream event
    EventLogger.logEvent({
      event_type: 'review_added',
      session_id: order?.session_id || 'sess_ex3mk4wa',
      customer_id: customerId,
      user_type: 'registered',
      page: 'product_details',
      context: {
        country: customer?.country || 'India',
        state: customer?.state || 'Karnataka',
        city: customer?.city || 'Bengaluru',
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        review_id: reviewId,
        order_id: orderId,
        order_item_id: orderItemId,
        product_id: productId,
        category_id: product?.category || 'GENERAL',
        brand: product?.brand || 'Generic',
        rating: rating,
        verified_purchase: isVerified,
        media_count: filePaths.length
      }
    });

    // 7. Log 'rating_given' clickstream event
    EventLogger.logEvent({
      event_type: 'rating_given',
      session_id: order?.session_id || 'sess_ex3mk4wa',
      customer_id: customerId,
      user_type: 'registered',
      page: 'product_details',
      context: {
        country: customer?.country || 'India',
        state: customer?.state || 'Karnataka',
        city: customer?.city || 'Bengaluru',
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        review_id: reviewId,
        product_id: productId,
        rating: rating,
        verified_purchase: isVerified
      }
    });

    return { review_id: reviewId, verified_purchase: isVerified, status: 'PUBLISHED' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getProductReviews(productId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return { reviews: [], stats: { average: 0, count: 0, distribution: {} } };

  // 1. Fetch published reviews
  const [reviews]: any = await dbPool.query(
    `SELECT r.*, c.first_name, c.last_name 
     FROM reviews r
     JOIN customers c ON r.customer_id = c.customer_id
     WHERE r.product_id = ? AND r.review_status = 'PUBLISHED'
     ORDER BY r.created_at DESC`,
    [productId]
  );

  // 2. Fetch associated media for reviews
  for (const review of reviews) {
    const [media]: any = await dbPool.query('SELECT * FROM review_media WHERE review_id = ?', [review.review_id]);
    review.media = media;
  }

  // 3. Compute aggregate statistics
  const [statsRows]: any = await dbPool.query(
    `SELECT rating, COUNT(*) as count 
     FROM reviews 
     WHERE product_id = ? AND review_status = 'PUBLISHED'
     GROUP BY rating`,
    [productId]
  );

  let totalScore = 0;
  let totalCount = 0;
  const distribution: { [star: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const row of statsRows) {
    const star = Number(row.rating);
    const count = Number(row.count);
    distribution[star] = count;
    totalScore += star * count;
    totalCount += count;
  }

  const average = totalCount > 0 ? Number((totalScore / totalCount).toFixed(1)) : 0;

  return {
    reviews,
    stats: {
      average,
      count: totalCount,
      distribution
    }
  };
}

export async function updateCustomerProfile(customerId: string, fields: any, sessionId: string = 'sess_ex3mk4wa'): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const allowedFields = ['first_name', 'last_name', 'phone', 'gender', 'preferred_payment', 'language', 'date_of_birth'];
  const updatePairs: string[] = [];
  const params: any[] = [];
  const updatedSections: string[] = [];

  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      updatePairs.push(`${key} = ?`);
      params.push(fields[key]);
      updatedSections.push(key);
    }
  }

  if (updatePairs.length === 0) return null;

  params.push(customerId);
  const query = `UPDATE customers SET ${updatePairs.join(', ')} WHERE customer_id = ?`;
  await dbPool.query(query, params);

  // Fetch updated customer record
  const [rows]: any = await dbPool.query('SELECT * FROM customers WHERE customer_id = ?', [customerId]);
  const updatedProfile = rows.length > 0 ? rows[0] : null;

  // Log telemetry event
  EventLogger.logEvent({
    event_type: 'profile_updated',
    session_id: sessionId,
    customer_id: customerId,
    user_type: 'registered',
    page: 'profile',
    context: {
      country: updatedProfile?.country || 'India',
      state: updatedProfile?.state || 'Karnataka',
      city: updatedProfile?.city || 'Bengaluru',
      device: 'desktop',
      browser: 'Chrome'
    },
    metadata: {
      updated_sections: updatedSections
    }
  });

  return updatedProfile;
}

export async function cancelCustomerOrder(customerId: string, orderId: string, reason: string, sessionId: string = 'sess_ex3mk4wa'): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Fetch order details
    const [orders]: any = await conn.query(
      'SELECT * FROM orders WHERE order_id = ? AND customer_id = ?',
      [orderId, customerId]
    );

    if (orders.length === 0) {
      throw new Error('Order not found.');
    }

    const order = orders[0];
    const ineligibleStatuses = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
    if (ineligibleStatuses.includes(order.status)) {
      throw new Error(`This order cannot be cancelled because its current status is ${order.status}.`);
    }

    const prevStatus = order.status;
    const cancellationId = `CAN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const refundRequired = order.payment_status === 'PAID';
    const refundId = refundRequired ? `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null;

    // 2. Insert order cancellation record
    await conn.query(
      `INSERT INTO order_cancellations (cancellation_id, order_id, customer_id, reason, refund_required, refund_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cancellationId, orderId, customerId, reason, refundRequired, refundId]
    );

    // 3. Update order status
    await conn.query(
      'UPDATE orders SET status = "CANCELLED", payment_status = ? WHERE order_id = ?',
      [refundRequired ? 'REFUNDED' : order.payment_status, orderId]
    );

    // 4. Update shipment status if shipment exists
    await conn.query(
      'UPDATE shipments SET shipment_status = "CANCELLED" WHERE order_id = ?',
      [orderId]
    );

    // 5. Restore stock levels in inventory
    const [items]: any = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
    for (const item of items) {
      // Restore stock into the first warehouse mapping row for the product
      await conn.query(
        'UPDATE inventory SET stock = stock + ? WHERE product_id = ? LIMIT 1',
        [item.quantity, item.product_id]
      );
    }

    // 6. Handle refund record insertion if pre-paid
    if (refundRequired) {
      // Find matching payment record
      const [payments]: any = await conn.query(
        `SELECT p.payment_id, pa.payment_method 
         FROM payments p 
         LEFT JOIN payment_attempts pa ON p.payment_id = pa.payment_id 
         WHERE p.order_id = ? 
         ORDER BY pa.attempt_number DESC LIMIT 1`,
        [orderId]
      );
      const payment = payments.length > 0 && payments[0].payment_id ? payments[0] : { payment_id: 'UNKNOWN', payment_method: 'UPI' };
      
      const dummyReturnId = `RET-CAN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await conn.query(
        `INSERT INTO returns (return_id, order_id, customer_id, return_status, return_reason, pickup_address_id, requested_at)
         VALUES (?, ?, ?, 'CANCELLED', 'CANCELLATION', ?, NOW())`,
        [dummyReturnId, orderId, customerId, order.address_id || 'UNKNOWN-ADDR']
      );

      const refundRef = `REF-TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      await conn.query(
        `INSERT INTO refunds (refund_id, return_id, order_id, payment_id, customer_id, refund_method, refund_amount, refund_status, refund_reference, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?, NOW())`,
        [refundId, dummyReturnId, orderId, payment.payment_id, customerId, payment.payment_method, order.total_amount, refundRef]
      );
    }

    await conn.commit();

    // Create Order Cancelled Notification
    await createNotification(
      customerId,
      'ORDER_CANCELLED',
      'TRANSACTIONAL',
      '🚫 Order Cancelled',
      `Your order #${orderId} has been cancelled successfully.`,
      'ORDER',
      orderId,
      sessionId
    );

    // Create Refund Successful Notification (if pre-paid)
    if (refundRequired && refundId) {
      await createNotification(
        customerId,
        'REFUND_SUCCESS',
        'TRANSACTIONAL',
        '💰 Refund Successful',
        `₹${order.total_amount} was refunded successfully for your cancelled Order #${orderId}.`,
        'ORDER',
        orderId,
        sessionId
      );
    }

    // 7. Log telemetry clickstream events
    const [custRows]: any = await dbPool.query('SELECT * FROM customers WHERE customer_id = ?', [customerId]);
    const customer = custRows.length > 0 ? custRows[0] : null;
    const context = {
      country: customer?.country || 'India',
      state: customer?.state || 'Karnataka',
      city: customer?.city || 'Bengaluru',
      device: 'desktop',
      browser: 'Chrome'
    };

    // order_cancelled event
    EventLogger.logEvent({
      event_type: 'order_cancelled',
      session_id: sessionId,
      customer_id: customerId,
      user_type: 'registered',
      page: 'orders',
      context,
      metadata: {
        order_id: orderId,
        previous_status: prevStatus,
        new_status: 'CANCELLED',
        reason: reason,
        order_value: Number(order.total_amount)
      }
    });

    // inventory_restocked events
    for (const item of items) {
      EventLogger.logEvent({
        event_type: 'inventory_restocked',
        session_id: sessionId,
        customer_id: customerId,
        user_type: 'registered',
        page: 'orders',
        context,
        metadata: {
          product_id: item.product_id,
          quantity: item.quantity,
          reason: 'ORDER_CANCELLED',
          order_id: orderId
        }
      });
    }

    // refund events
    if (refundRequired && refundId) {
      EventLogger.logEvent({
        event_type: 'refund_initiated',
        session_id: sessionId,
        customer_id: customerId,
        user_type: 'registered',
        page: 'orders',
        context,
        metadata: {
          refund_id: refundId,
          order_id: orderId,
          amount: Number(order.total_amount),
          reason: 'ORDER_CANCELLED'
        }
      });

      EventLogger.logEvent({
        event_type: 'refund_success',
        session_id: sessionId,
        customer_id: customerId,
        user_type: 'registered',
        page: 'orders',
        context,
        metadata: {
          refund_id: refundId,
          order_id: orderId,
          amount: Number(order.total_amount)
        }
      });
    }

    return { success: true, order_id: orderId, status: 'CANCELLED' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getCustomerAddresses(customerId: string): Promise<any[]> {
  if (dbPool && !isInMemoryFallback) {
    const [rows]: any = await dbPool.query(
      'SELECT * FROM addresses WHERE customer_id = ? AND is_active = TRUE ORDER BY is_default DESC, created_at DESC',
      [customerId]
    );
    return rows;
  }
  return [];
}

export async function saveCustomerAddress(customerId: string, addressData: any, sessionId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const addressId = `ADDR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const isDefault = addressData.is_default ? 1 : 0;

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    if (isDefault === 1) {
      // Reset other defaults
      await conn.query('UPDATE addresses SET is_default = FALSE WHERE customer_id = ?', [customerId]);
    }

    await conn.query(
      `INSERT INTO addresses (address_id, customer_id, address_type, full_name, phone, address_line_1, address_line_2, city, state, postal_code, country, is_default, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        addressId,
        customerId,
        addressData.address_type || 'HOME',
        addressData.full_name,
        addressData.phone,
        addressData.address_line_1,
        addressData.address_line_2 || null,
        addressData.city,
        addressData.state,
        addressData.postal_code,
        addressData.country || 'India',
        isDefault
      ]
    );

    await conn.commit();

    // Fetch new address
    const [rows]: any = await dbPool.query('SELECT * FROM addresses WHERE address_id = ?', [addressId]);
    const newAddress = rows[0];

    // Log telemetry event
    EventLogger.logEvent({
      event_type: 'address_added',
      session_id: sessionId,
      customer_id: customerId,
      user_type: 'registered',
      page: 'addresses',
      context: {
        country: newAddress.country,
        state: newAddress.state,
        city: newAddress.city,
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        address_id: addressId,
        address_type: newAddress.address_type,
        is_default: isDefault === 1
      }
    });

    return newAddress;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateCustomerAddress(customerId: string, addressId: string, addressData: any, sessionId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const isDefault = addressData.is_default ? 1 : 0;

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    if (isDefault === 1) {
      // Reset other defaults
      await conn.query('UPDATE addresses SET is_default = FALSE WHERE customer_id = ?', [customerId]);
    }

    await conn.query(
      `UPDATE addresses 
       SET address_type = ?, full_name = ?, phone = ?, address_line_1 = ?, address_line_2 = ?, city = ?, state = ?, postal_code = ?, country = ?, is_default = ?
       WHERE address_id = ? AND customer_id = ?`,
      [
        addressData.address_type || 'HOME',
        addressData.full_name,
        addressData.phone,
        addressData.address_line_1,
        addressData.address_line_2 || null,
        addressData.city,
        addressData.state,
        addressData.postal_code,
        addressData.country || 'India',
        isDefault,
        addressId,
        customerId
      ]
    );

    await conn.commit();

    const [rows]: any = await dbPool.query('SELECT * FROM addresses WHERE address_id = ?', [addressId]);
    const updatedAddress = rows[0];

    // Log telemetry event
    EventLogger.logEvent({
      event_type: 'address_updated',
      session_id: sessionId,
      customer_id: customerId,
      user_type: 'registered',
      page: 'addresses',
      context: {
        country: updatedAddress.country,
        state: updatedAddress.state,
        city: updatedAddress.city,
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        address_id: addressId,
        updated_fields: ['address_type', 'full_name', 'phone', 'address_line_1', 'address_line_2', 'city', 'state', 'postal_code', 'country', 'is_default']
      }
    });

    return updatedAddress;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteCustomerAddress(customerId: string, addressId: string, sessionId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  const [addressRows]: any = await dbPool.query('SELECT * FROM addresses WHERE address_id = ? AND customer_id = ?', [addressId, customerId]);
  if (addressRows.length === 0) return false;
  const address = addressRows[0];

  await dbPool.query('UPDATE addresses SET is_active = FALSE, is_default = FALSE WHERE address_id = ? AND customer_id = ?', [addressId, customerId]);

  // Log telemetry event
  EventLogger.logEvent({
    event_type: 'address_deleted',
    session_id: sessionId,
    customer_id: customerId,
    user_type: 'registered',
    page: 'addresses',
    context: {
      country: address.country,
      state: address.state,
      city: address.city,
      device: 'desktop',
      browser: 'Chrome'
    },
    metadata: {
      address_id: addressId,
      address_type: address.address_type
    }
  });

  return true;
}

export async function setDefaultAddress(customerId: string, addressId: string, sessionId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  const [addressRows]: any = await dbPool.query('SELECT * FROM addresses WHERE address_id = ? AND customer_id = ? AND is_active = TRUE', [addressId, customerId]);
  if (addressRows.length === 0) return false;
  const address = addressRows[0];

  const [prevDefaultRows]: any = await dbPool.query('SELECT address_id FROM addresses WHERE customer_id = ? AND is_default = TRUE AND is_active = TRUE', [customerId]);
  const prevDefaultId = prevDefaultRows.length > 0 ? prevDefaultRows[0].address_id : null;

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('UPDATE addresses SET is_default = FALSE WHERE customer_id = ?', [customerId]);
    await conn.query('UPDATE addresses SET is_default = TRUE WHERE address_id = ? AND customer_id = ?', [addressId, customerId]);

    await conn.commit();

    // Log telemetry event
    EventLogger.logEvent({
      event_type: 'default_address_changed',
      session_id: sessionId,
      customer_id: customerId,
      user_type: 'registered',
      page: 'addresses',
      context: {
        country: address.country,
        state: address.state,
        city: address.city,
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        new_default_address_id: addressId,
        previous_default_address_id: prevDefaultId
      }
    });

    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function saveOrderAddressSnapshot(orderId: string, addressId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  const [addressRows]: any = await dbPool.query('SELECT * FROM addresses WHERE address_id = ?', [addressId]);
  if (addressRows.length === 0) return false;
  const addr = addressRows[0];

  const orderAddressId = `OADDR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  await dbPool.query(
    `INSERT INTO order_addresses (order_address_id, order_id, address_type, full_name, phone, address_line_1, address_line_2, city, state, postal_code, country)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderAddressId,
      orderId,
      addr.address_type,
      addr.full_name,
      addr.phone,
      addr.address_line_1,
      addr.address_line_2,
      addr.city,
      addr.state,
      addr.postal_code,
      addr.country
    ]
  );

  return true;
}

export async function createNotification(
  customerId: string,
  type: string,
  category: 'TRANSACTIONAL' | 'MARKETING',
  title: string,
  message: string,
  refType: string | null = null,
  refId: string | null = null,
  sessionId: string = 'system_triggered'
): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const notificationId = `NOT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  await dbPool!.query(
    `INSERT INTO notifications (notification_id, customer_id, notification_type, notification_category, title, message, reference_type, reference_id, is_read, read_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, NULL)`,
    [notificationId, customerId, type, category, title, message, refType, refId]
  );

  // Fetch customer context for telemetry event log enrichment
  const [custRows]: any = await dbPool!.query('SELECT country, state, city FROM customers WHERE customer_id = ?', [customerId]);
  const cust = custRows[0] || { country: 'India', state: 'Karnataka', city: 'Bengaluru' };

  EventLogger.logEvent({
    event_type: 'notification_created',
    session_id: sessionId,
    customer_id: customerId,
    user_type: 'registered',
    page: 'notifications',
    context: {
      country: cust.country,
      state: cust.state,
      city: cust.city,
      device: 'desktop',
      browser: 'Chrome'
    },
    metadata: {
      notification_id: notificationId,
      notification_type: type,
      notification_category: category,
      reference_type: refType,
      reference_id: refId
    }
  });

  return { notification_id: notificationId, customer_id: customerId, notification_type: type };
}

export async function getCustomerNotifications(customerId: string): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];
  const [rows]: any = await dbPool!.query(
    'SELECT * FROM notifications WHERE customer_id = ? ORDER BY created_at DESC',
    [customerId]
  );
  return rows;
}

export async function markNotificationRead(
  notificationId: string,
  customerId: string,
  sessionId: string
): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  const [notifRows]: any = await dbPool!.query(
    'SELECT * FROM notifications WHERE notification_id = ? AND customer_id = ?',
    [notificationId, customerId]
  );
  if (notifRows.length === 0) return false;
  const notif = notifRows[0];

  await dbPool!.query(
    'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE notification_id = ? AND customer_id = ?',
    [notificationId, customerId]
  );

  // Fetch customer context
  const [custRows]: any = await dbPool!.query('SELECT country, state, city FROM customers WHERE customer_id = ?', [customerId]);
  const cust = custRows[0] || { country: 'India', state: 'Karnataka', city: 'Bengaluru' };

  // Log notification_opened
  EventLogger.logEvent({
    event_type: 'notification_opened',
    session_id: sessionId,
    customer_id: customerId,
    user_type: 'registered',
    page: 'notifications',
    context: {
      country: cust.country,
      state: cust.state,
      city: cust.city,
      device: 'desktop',
      browser: 'Chrome'
    },
    metadata: {
      notification_id: notificationId,
      notification_type: notif.notification_type,
      reference_type: notif.reference_type,
      reference_id: notif.reference_id
    }
  });

  return true;
}

export async function markAllNotificationsRead(customerId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;
  await dbPool!.query(
    'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE customer_id = ? AND is_read = FALSE',
    [customerId]
  );
  return true;
}

export async function getHelpArticles(searchQuery: string): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];
  
  if (!searchQuery || searchQuery.trim() === '') {
    const [rows]: any = await dbPool!.query('SELECT * FROM help_articles WHERE status = "PUBLISHED"');
    return rows;
  }

  const keyword = `%${searchQuery.trim()}%`;
  const [rows]: any = await dbPool!.query(
    `SELECT * FROM help_articles 
     WHERE status = 'PUBLISHED' 
       AND (title LIKE ? OR content LIKE ? OR keywords LIKE ? OR category LIKE ?)`,
    [keyword, keyword, keyword, keyword]
  );
  return rows;
}

export async function createSupportTicket(
  customerId: string,
  orderId: string | null,
  category: string,
  priority: string,
  subject: string,
  description: string,
  sessionId: string
): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const ticketId = `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  await dbPool!.query(
    `INSERT INTO support_tickets (ticket_id, customer_id, order_id, category, priority, subject, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
    [ticketId, customerId, orderId || null, category, priority, subject, description]
  );

  // Fetch customer context
  const [custRows]: any = await dbPool!.query('SELECT country, state, city FROM customers WHERE customer_id = ?', [customerId]);
  const cust = custRows[0] || { country: 'India', state: 'Karnataka', city: 'Bengaluru' };

  // Log support_ticket_created
  EventLogger.logEvent({
    event_type: 'support_ticket_created',
    session_id: sessionId,
    customer_id: customerId,
    user_type: 'registered',
    page: 'help',
    context: {
      country: cust.country,
      state: cust.state,
      city: cust.city,
      device: 'desktop',
      browser: 'Chrome'
    },
    metadata: {
      ticket_id: ticketId,
      order_id: orderId || null,
      category,
      priority
    }
  });

  return { ticket_id: ticketId, customer_id: customerId, category, status: 'OPEN' };
}

export async function addSupportTicketMessage(
  ticketId: string,
  senderType: 'CUSTOMER' | 'ADMIN',
  senderId: string,
  message: string,
  sessionId: string
): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const messageId = `MSG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  await dbPool!.query(
    `INSERT INTO support_ticket_messages (message_id, ticket_id, sender_type, sender_id, message)
     VALUES (?, ?, ?, ?, ?)`,
    [messageId, ticketId, senderType, senderId, message]
  );

  // Update parent ticket's updated_at
  await dbPool!.query('UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?', [ticketId]);

  // Fetch ticket details for customer context
  const [ticketRows]: any = await dbPool!.query('SELECT customer_id FROM support_tickets WHERE ticket_id = ?', [ticketId]);
  const customerId = ticketRows[0]?.customer_id || senderId;

  const [custRows]: any = await dbPool!.query('SELECT country, state, city FROM customers WHERE customer_id = ?', [customerId]);
  const cust = custRows[0] || { country: 'India', state: 'Karnataka', city: 'Bengaluru' };

  // Log support_ticket_message_added
  EventLogger.logEvent({
    event_type: 'support_ticket_message_added',
    session_id: sessionId,
    customer_id: customerId,
    user_type: 'registered',
    page: 'help',
    context: {
      country: cust.country,
      state: cust.state,
      city: cust.city,
      device: 'desktop',
      browser: 'Chrome'
    },
    metadata: {
      ticket_id: ticketId,
      message_id: messageId,
      sender_type: senderType
    }
  });

  return { message_id: messageId, ticket_id: ticketId, sender_type: senderType, message };
}

export async function getCustomerTickets(customerId: string): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];

  const [tickets]: any = await dbPool!.query(
    'SELECT * FROM support_tickets WHERE customer_id = ? ORDER BY created_at DESC',
    [customerId]
  );

  for (const ticket of tickets) {
    const [messages]: any = await dbPool!.query(
      'SELECT * FROM support_ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC',
      [ticket.ticket_id]
    );
    ticket.messages = messages;
  }

  return tickets;
}

export async function createAdminSession(
  adminId: string,
  ipAddress: string | null = null,
  userAgent: string | null = null
): Promise<any> {
  const sessionId = `ASESS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  if (dbPool && !isInMemoryFallback) {
    try {
      await dbPool!.query(
        `INSERT INTO admin_sessions (session_id, admin_id, login_at, status, ip_address, user_agent)
         VALUES (?, ?, NOW(), 'ACTIVE', ?, ?)`,
        [sessionId, adminId, ipAddress, userAgent]
      );
      await dbPool!.query('UPDATE admin_users SET last_login_at = NOW() WHERE admin_id = ?', [adminId]);
    } catch (e) {}
  }

  // Log admin_login telemetry event
  EventLogger.logEvent({
    event_type: 'admin_login',
    session_id: sessionId,
    customer_id: '',
    user_type: 'registered',
    page: 'admin_login',
    context: {
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      device: 'desktop',
      browser: 'Chrome'
    },
    metadata: {
      admin_id: adminId
    }
  }).catch(() => {});

  return { session_id: sessionId, admin_id: adminId, status: 'ACTIVE' };
}

export async function invalidateAdminSession(sessionId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  const [sessionRows]: any = await dbPool!.query('SELECT admin_id FROM admin_sessions WHERE session_id = ?', [sessionId]);
  if (sessionRows.length === 0) return false;
  const adminId = sessionRows[0].admin_id;

  // Update session status and logout time
  await dbPool!.query(
    'UPDATE admin_sessions SET status = "INACTIVE", logout_at = NOW() WHERE session_id = ?',
    [sessionId]
  );

  // Log admin_logout telemetry event
  EventLogger.logEvent({
    event_type: 'admin_logout',
    session_id: sessionId,
    customer_id: '',
    user_type: 'registered',
    page: 'admin_login',
    context: {
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      device: 'desktop',
      browser: 'Chrome'
    },
    metadata: {
      admin_id: adminId
    }
  });

  return true;
}

export async function getAdminUserByEmail(email: string): Promise<any> {
  const cleanEmail = email.trim().toLowerCase();
  if (dbPool && !isInMemoryFallback) {
    try {
      const [rows]: any = await dbPool!.query('SELECT * FROM admin_users WHERE LOWER(email) = ?', [cleanEmail]);
      if (rows.length > 0) return rows[0];
    } catch (e) {}
  }
  for (const admin of inMemoryAdminUsers.values()) {
    if (admin.email.toLowerCase() === cleanEmail) {
      return admin;
    }
  }
  return null;
}

export async function getAdminPermissions(roleId: string): Promise<string[]> {
  if (!dbPool || isInMemoryFallback) return [];
  const [rows]: any = await dbPool!.query(
    `SELECT p.permission_id FROM permissions p
     JOIN role_permissions rp ON p.permission_id = rp.permission_id
     WHERE rp.role_id = ?`,
    [roleId]
  );
  return rows.map((r: any) => r.permission_id);
}

export async function writeAdminAuditLog(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue: string | null = null,
  newValue: string | null = null
): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const auditId = `AUD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  await dbPool!.query(
    `INSERT INTO admin_audit_logs (audit_id, admin_id, action, entity_type, entity_id, old_value, new_value, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [auditId, adminId, action, entityType, entityId, oldValue, newValue]
  );

  return { audit_id: auditId, admin_id: adminId, action };
}

export async function getAdminDashboardMetrics(): Promise<any> {
  if (!dbPool || isInMemoryFallback) {
    return {
      kpis: { orders: 0, revenue: 0, aov: 0, customers: 0, conversion: 8.4, activeSessions: 0 },
      liveOrders: [],
      inventory: { total: 0, low: 0, out: 0 },
      delivery: { transit: 0, delivered: 0, delayed: 0, failed: 0 },
      payments: { success: 0, failed: 0, pending: 0 }
    };
  }

  // 1. KPI Calculations
  const [orderKpis]: any = await dbPool.query('SELECT COUNT(*) as count, IFNULL(SUM(total_amount), 0) as revenue FROM orders');
  const totalOrders = orderKpis[0]?.count || 0;
  const totalRevenue = parseFloat(orderKpis[0]?.revenue || 0);
  const aov = totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0;

  const [customerKpis]: any = await dbPool.query('SELECT COUNT(*) as count FROM customers');
  const totalCustomers = customerKpis[0]?.count || 0;

  const [sessionKpis]: any = await dbPool.query('SELECT COUNT(DISTINCT session_id) as count FROM sessions WHERE started_at >= NOW() - INTERVAL 1 DAY');
  const activeSessions = sessionKpis[0]?.count || 0;
  const conversionRate = activeSessions > 0 ? parseFloat(((totalOrders / activeSessions) * 100).toFixed(1)) : 8.4;

  // 2. Live Order Feed (recent 5 orders)
  const [liveOrders]: any = await dbPool.query(
    `SELECT o.order_id, o.customer_id, o.status, o.total_amount, o.created_at,
            c.first_name, c.last_name
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.customer_id
     ORDER BY o.created_at DESC LIMIT 5`
  );

  // 3. Inventory overview
  const [invSummary]: any = await dbPool.query(`
    SELECT 
      COUNT(DISTINCT product_id) as total,
      SUM(CASE WHEN stock > 0 AND stock < 20 THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock
    FROM inventory
  `);
  const inventory = {
    total: invSummary[0]?.total || 0,
    low: invSummary[0]?.low || 0,
    out: invSummary[0]?.out_of_stock || 0
  };

  // 4. Delivery overview
  const [shipSummary]: any = await dbPool.query(`
    SELECT 
      SUM(CASE WHEN shipment_status IN ('PACKED', 'SHIPPED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY') THEN 1 ELSE 0 END) as transit,
      SUM(CASE WHEN shipment_status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN shipment_status = 'FAILED_DELIVERY' THEN 1 ELSE 0 END) as failed
    FROM shipments
  `);
  const delivery = {
    transit: shipSummary[0]?.transit || 0,
    delivered: shipSummary[0]?.delivered || 0,
    delayed: 0,
    failed: shipSummary[0]?.failed || 0
  };

  // 5. Payment overview
  const [paySummary]: any = await dbPool.query(`
    SELECT 
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
    FROM payments
  `);
  const payments = {
    success: paySummary[0]?.success || 0,
    failed: paySummary[0]?.failed || 0,
    pending: paySummary[0]?.pending || 0
  };

  return {
    kpis: { orders: totalOrders, revenue: totalRevenue, aov, customers: totalCustomers, conversion: conversionRate, activeSessions },
    liveOrders,
    inventory,
    delivery,
    payments
  };
}

export async function getAdminProductsList(
  search: string = '',
  categoryId: string = '',
  status: string = ''
): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];
  let query = `
    SELECT p.*, COALESCE(SUM(i.stock), 0) as stock, MIN(pi.image_url) as image_url
    FROM products p
    LEFT JOIN inventory i ON p.product_id = i.product_id
    LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.image_type = 'primary'
    WHERE 1=1
  `;
  const params: any[] = [];
  if (search) {
    query += ' AND (p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (categoryId) {
    query += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }
  query += ' GROUP BY p.product_id ORDER BY p.created_at DESC';
  const [rows]: any = await dbPool.query(query, params);
  return rows;
}

export async function createAdminProduct(productData: any, adminId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;
  const productId = `PROD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const sku = productData.sku || `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const price = Math.round(parseFloat(productData.price));
  const discount = Math.round(parseFloat(productData.discount || 0));
  const salePrice = Math.round(price * (1 - discount / 100));

  await dbPool.query(
    `INSERT INTO products (product_id, sku, name, brand, category_id, subcategory_id, description, price, discount, sale_price, rating, review_count, weight, color, size, warranty, return_eligible, country, delivery_days, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, 0, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      productId,
      sku,
      productData.name,
      productData.brand,
      productData.category_id,
      productData.subcategory_id || 'SUBCAT001',
      productData.description || '',
      price,
      discount,
      salePrice,
      productData.weight || 0.5,
      productData.color || '',
      productData.size || '',
      productData.warranty || '',
      productData.return_eligible !== false ? 1 : 0,
      productData.country || 'India',
      productData.delivery_days || 3
    ]
  );

  // Insert stock into inventory
  const inventoryId = `INV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const stock = Math.round(parseInt(productData.stock || 0));
  await dbPool.query(
    `INSERT INTO inventory (inventory_id, product_id, warehouse_id, stock, reserved_stock)
     VALUES (?, ?, 'WH001', ?, 0)`,
    [inventoryId, productId, stock]
  );

  // Insert primary image
  const imageId = `IMG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const imageUrl = productData.image_url || 'https://via.placeholder.com/300';
  await dbPool.query(
    `INSERT INTO product_images (image_id, product_id, image_url, image_type, display_order, alt_text)
     VALUES (?, ?, ?, 'primary', 1, ?)`,
    [imageId, productId, imageUrl, productData.name]
  );

  // Write audit log
  await writeAdminAuditLog(adminId, 'CREATE_PRODUCT', 'PRODUCT', productId, null, JSON.stringify({ name: productData.name, price, stock }));

  // Log telemetry
  EventLogger.logEvent({
    event_type: 'product_created',
    session_id: 'admin_action',
    customer_id: '',
    user_type: 'registered',
    page: 'admin_products',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: { product_id: productId, name: productData.name, price, stock }
  });

  return { product_id: productId, sku };
}

export async function updateAdminProduct(productId: string, productData: any, adminId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  // Fetch old values for audit
  const [oldRows]: any = await dbPool.query('SELECT * FROM products WHERE product_id = ?', [productId]);
  if (oldRows.length === 0) return false;
  const oldProd = oldRows[0];

  const price = Math.round(parseFloat(productData.price));
  const discount = Math.round(parseFloat(productData.discount || 0));
  const salePrice = Math.round(price * (1 - discount / 100));

  await dbPool.query(
    `UPDATE products 
     SET name = ?, brand = ?, category_id = ?, subcategory_id = ?, description = ?, price = ?, discount = ?, sale_price = ?, weight = ?, color = ?, size = ?, warranty = ?, return_eligible = ?, country = ?, delivery_days = ?, status = ?
     WHERE product_id = ?`,
    [
      productData.name,
      productData.brand,
      productData.category_id,
      productData.subcategory_id || 'SUBCAT001',
      productData.description || '',
      price,
      discount,
      salePrice,
      productData.weight || 0.5,
      productData.color || '',
      productData.size || '',
      productData.warranty || '',
      productData.return_eligible !== false ? 1 : 0,
      productData.country || 'India',
      productData.delivery_days || 3,
      productData.status || 'ACTIVE',
      productId
    ]
  );

  // Update stock in inventory
  const stock = Math.round(parseInt(productData.stock || 0));
  await dbPool.query(
    `UPDATE inventory SET stock = ? WHERE product_id = ?`,
    [stock, productId]
  );

  // Update image_url
  if (productData.image_url) {
    await dbPool.query(
      `UPDATE product_images SET image_url = ? WHERE product_id = ? AND image_type = 'primary'`,
      [productData.image_url, productId]
    );
  }

  // Write audit log & trigger custom events
  await writeAdminAuditLog(
    adminId, 
    'UPDATE_PRODUCT', 
    'PRODUCT', 
    productId, 
    JSON.stringify({ name: oldProd.name, price: oldProd.price, status: oldProd.status }), 
    JSON.stringify({ name: productData.name, price, status: productData.status || 'ACTIVE' })
  );

  if (oldProd.price !== price) {
    EventLogger.logEvent({
      event_type: 'product_price_updated',
      session_id: 'admin_action',
      customer_id: '',
      user_type: 'registered',
      page: 'admin_products',
      context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
      metadata: { product_id: productId, old_price: oldProd.price, new_price: price }
    });
  }

  EventLogger.logEvent({
    event_type: 'product_updated',
    session_id: 'admin_action',
    customer_id: '',
    user_type: 'registered',
    page: 'admin_products',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: { product_id: productId }
  });

  return true;
}

export async function deactivateAdminProduct(productId: string, adminId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  await dbPool.query("UPDATE products SET status = 'INACTIVE' WHERE product_id = ?", [productId]);

  await writeAdminAuditLog(adminId, 'DEACTIVATE_PRODUCT', 'PRODUCT', productId, 'ACTIVE', 'INACTIVE');

  EventLogger.logEvent({
    event_type: 'product_deactivated',
    session_id: 'admin_action',
    customer_id: '',
    user_type: 'registered',
    page: 'admin_products',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: { product_id: productId }
  });

  return true;
}

export async function getAdminCategoriesList(search: string = ''): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];
  let query = `
    SELECT c.*, 
           COUNT(DISTINCT s.subcategory_id) as subcategories,
           COUNT(DISTINCT p.product_id) as products
    FROM categories c
    LEFT JOIN subcategories s ON c.category_id = s.category_id
    LEFT JOIN products p ON c.category_id = p.category_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (search) {
    query += ' AND (c.name LIKE ? OR c.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' GROUP BY c.category_id ORDER BY c.display_order ASC, c.name ASC';
  const [rows]: any = await dbPool.query(query, params);
  return rows;
}

export async function createAdminCategory(catData: any, adminId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;
  const categoryId = `CAT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const slug = catData.slug || catData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const displayOrder = parseInt(catData.display_order || 1);

  await dbPool.query(
    `INSERT INTO categories (category_id, name, slug, description, image_url, display_order, status)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      categoryId,
      catData.name,
      slug,
      catData.description || '',
      catData.image_url || '',
      displayOrder
    ]
  );

  await writeAdminAuditLog(adminId, 'CREATE_CATEGORY', 'CATEGORY', categoryId, null, JSON.stringify({ name: catData.name, displayOrder }));

  EventLogger.logEvent({
    event_type: 'category_created',
    session_id: 'admin_action',
    customer_id: '',
    user_type: 'registered',
    page: 'admin_categories',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: { category_id: categoryId, name: catData.name }
  });

  return { category_id: categoryId, slug };
}

export async function updateAdminCategory(catId: string, catData: any, adminId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;
  
  const [oldRows]: any = await dbPool.query('SELECT * FROM categories WHERE category_id = ?', [catId]);
  if (oldRows.length === 0) return false;
  const oldCat = oldRows[0];

  const slug = catData.slug || catData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const displayOrder = parseInt(catData.display_order || 1);

  await dbPool.query(
    `UPDATE categories 
     SET name = ?, slug = ?, description = ?, image_url = ?, display_order = ?, status = ?
     WHERE category_id = ?`,
    [
      catData.name,
      slug,
      catData.description || '',
      catData.image_url || '',
      displayOrder,
      catData.status || 'ACTIVE',
      catId
    ]
  );

  const updatedFields: string[] = [];
  if (oldCat.name !== catData.name) updatedFields.push('name');
  if (oldCat.display_order !== displayOrder) updatedFields.push('display_order');
  if (oldCat.status !== (catData.status || 'ACTIVE')) updatedFields.push('status');

  await writeAdminAuditLog(
    adminId, 
    'UPDATE_CATEGORY', 
    'CATEGORY', 
    catId, 
    JSON.stringify({ name: oldCat.name, display_order: oldCat.display_order }),
    JSON.stringify({ name: catData.name, display_order: displayOrder })
  );

  EventLogger.logEvent({
    event_type: 'category_updated',
    session_id: 'admin_action',
    customer_id: '',
    user_type: 'registered',
    page: 'admin_categories',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: { category_id: catId, updated_fields: updatedFields }
  });

  return true;
}

export async function deactivateAdminCategory(catId: string, adminId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  await dbPool.query("UPDATE categories SET status = 'INACTIVE' WHERE category_id = ?", [catId]);

  await writeAdminAuditLog(adminId, 'DEACTIVATE_CATEGORY', 'CATEGORY', catId, 'ACTIVE', 'INACTIVE');

  EventLogger.logEvent({
    event_type: 'category_deactivated',
    session_id: 'admin_action',
    customer_id: '',
    user_type: 'registered',
    page: 'admin_categories',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: { category_id: catId }
  });

  return true;
}

export async function getAdminInventoryList(
  search: string = '',
  warehouseId: string = '',
  categoryId: string = '',
  statusFilter: string = ''
): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];
  let query = `
    SELECT i.*, p.name as product_name, p.sku, p.brand, p.category_id,
           w.name as warehouse_name
    FROM inventory i
    JOIN products p ON i.product_id = p.product_id
    JOIN warehouses w ON i.warehouse_id = w.warehouse_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (search) {
    query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (warehouseId) {
    query += ' AND i.warehouse_id = ?';
    params.push(warehouseId);
  }
  if (categoryId) {
    query += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  if (statusFilter === 'LOW_STOCK') {
    query += ' AND i.stock > 0 AND i.stock <= i.reorder_level';
  } else if (statusFilter === 'OUT_OF_STOCK') {
    query += ' AND i.stock = 0';
  } else if (statusFilter === 'IN_STOCK') {
    query += ' AND i.stock > i.reorder_level';
  }

  query += ' ORDER BY i.stock ASC, p.name ASC';
  const [rows]: any = await dbPool.query(query, params);
  return rows;
}

export async function adjustAdminInventory(
  productId: string,
  warehouseId: string,
  amount: number,
  type: 'RESTOCK' | 'DISPATCH' | 'RESERVE' | 'RELEASE' | 'ALLOCATE' | 'DAMAGE' | 'ADJUST',
  reason: string,
  adminId: string
): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  const [invRows]: any = await dbPool.query(
    'SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?',
    [productId, warehouseId]
  );
  if (invRows.length === 0) return false;
  const inv = invRows[0];

  const prevQty = inv.stock;
  let newQty = prevQty;
  let prevReserved = inv.reserved_stock;
  let newReserved = prevReserved;
  let prevDamaged = inv.damaged_stock || 0;
  let newDamaged = prevDamaged;

  switch (type) {
    case 'RESTOCK':
      newQty += amount;
      break;
    case 'DISPATCH':
      newQty = Math.max(0, newQty - amount);
      break;
    case 'RESERVE':
      newQty = Math.max(0, newQty - amount);
      newReserved += amount;
      break;
    case 'RELEASE':
      newReserved = Math.max(0, newReserved - amount);
      newQty += amount;
      break;
    case 'ALLOCATE':
      newReserved = Math.max(0, newReserved - amount);
      break;
    case 'DAMAGE':
      newQty = Math.max(0, newQty - amount);
      newDamaged += amount;
      break;
    case 'ADJUST':
      newQty = amount;
      break;
  }

  await dbPool.query(
    `UPDATE inventory 
     SET stock = ?, reserved_stock = ?, damaged_stock = ?
     WHERE product_id = ? AND warehouse_id = ?`,
    [newQty, newReserved, newDamaged, productId, warehouseId]
  );

  await writeAdminAuditLog(
    adminId,
    'ADJUST_INVENTORY',
    'INVENTORY',
    inv.inventory_id,
    JSON.stringify({ stock: prevQty, reserved: prevReserved, damaged: prevDamaged }),
    JSON.stringify({ stock: newQty, reserved: newReserved, damaged: newDamaged, type, reason })
  );

  EventLogger.logEvent({
    event_type: 'inventory_updated',
    session_id: 'admin_action',
    customer_id: '',
    user_type: 'registered',
    page: 'admin_inventory',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: {
      product_id: productId,
      warehouse_id: warehouseId,
      previous_quantity: prevQty,
      new_quantity: newQty,
      change: newQty - prevQty,
      reason: `${type}: ${reason}`
    }
  });

  return true;
}

export async function getAdminOrdersList(filters: any): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];
  let query = `
    SELECT o.order_id, o.customer_id, o.status, o.total_amount, o.created_at, o.payment_status,
           c.first_name, c.last_name,
           a.state, a.city
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    JOIN addresses a ON o.address_id = a.address_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (filters.search) {
    query += ` AND (
      o.order_id LIKE ? 
      OR c.first_name LIKE ? 
      OR c.last_name LIKE ? 
      OR c.email LIKE ? 
      OR o.order_id IN (
        SELECT DISTINCT oi.order_id FROM order_items oi 
        JOIN products p ON oi.product_id = p.product_id 
        WHERE p.name LIKE ?
      )
    )`;
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.status) {
    query += ' AND o.status = ?';
    params.push(filters.status);
  }
  if (filters.state) {
    query += ' AND a.state = ?';
    params.push(filters.state);
  }
  if (filters.city) {
    query += ' AND a.city = ?';
    params.push(filters.city);
  }
  if (filters.payment) {
    query += ' AND o.payment_status = ?';
    params.push(filters.payment);
  }

  query += ' ORDER BY o.created_at DESC';
  const [rows]: any = await dbPool.query(query, params);
  return rows;
}

export async function getAdminOrderDetail(orderId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const [orderRows]: any = await dbPool.query(
    `SELECT o.*, c.first_name, c.last_name, c.email,
            a.full_name as address_name, a.phone, a.address_line_1, a.address_line_2, a.city, a.state, a.postal_code
     FROM orders o
     JOIN customers c ON o.customer_id = c.customer_id
     JOIN addresses a ON o.address_id = a.address_id
     WHERE o.order_id = ?`,
    [orderId]
  );
  if (orderRows.length === 0) return null;
  const order = orderRows[0];

  const [items]: any = await dbPool.query(
    `SELECT oi.*, p.name as product_name, p.brand
     FROM order_items oi
     JOIN products p ON oi.product_id = p.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );

  const [history]: any = await dbPool.query(
    `SELECT * FROM shipment_tracking_events WHERE order_id = ? ORDER BY event_time DESC`,
    [orderId]
  );

  return { ...order, items, history };
}

export async function updateAdminOrderStatus(
  orderId: string,
  newStatus: string,
  reason: string,
  adminId: string
): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  const [orderRows]: any = await dbPool.query('SELECT status, customer_id FROM orders WHERE order_id = ?', [orderId]);
  if (orderRows.length === 0) return false;
  const oldStatus = orderRows[0].status;

  // Enforce state transitions (permit forward transition jumps, or CANCELLED)
  const stagesOrder = [
    'PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
    'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_RECEIVED', 'REFUNDED'
  ];

  const oldIdx = stagesOrder.indexOf(oldStatus);
  const newIdx = stagesOrder.indexOf(newStatus);

  if (newStatus === 'CANCELLED') {
    // Only allow cancellation before dispatch
    const cancelableIdx = stagesOrder.indexOf('SHIPPED');
    if (oldIdx >= cancelableIdx) {
      throw new Error(`Order cannot be cancelled because it has already been dispatched.`);
    }
  } else if (newStatus === 'FAILED_DELIVERY') {
    if (oldStatus !== 'OUT_FOR_DELIVERY') {
      throw new Error(`Failed delivery is only allowed from OUT_FOR_DELIVERY status.`);
    }
  } else {
    // Permit direct forward transitions
    if (oldIdx === -1 || newIdx === -1 || newIdx <= oldIdx) {
      throw new Error(`State transition from ${oldStatus} to ${newStatus} is not permitted.`);
    }
  }

  // Update order status and delivery status
  let deliveryStatusUpdate = '';
  if (newStatus === 'DELIVERED') {
    deliveryStatusUpdate = ', delivery_status = "DELIVERED"';
  } else if (['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(newStatus)) {
    deliveryStatusUpdate = ', delivery_status = "SHIPPED"';
  }
  await dbPool.query(`UPDATE orders SET status = ? ${deliveryStatusUpdate} WHERE order_id = ?`, [newStatus, orderId]);

  // Update shipment status as well to keep logistics tracking in sync
  let shipmentStatus = newStatus;
  if (newStatus === 'CONFIRMED' || newStatus === 'PROCESSING' || newStatus === 'PENDING') {
    shipmentStatus = 'CREATED';
  }
  await dbPool.query('UPDATE shipments SET shipment_status = ? WHERE order_id = ?', [shipmentStatus, orderId]);

  // Insert tracking event
  const [shipments]: any = await dbPool.query('SELECT shipment_id FROM shipments WHERE order_id = ?', [orderId]);
  const shipmentId = shipments.length > 0 ? shipments[0].shipment_id : 'MOCK-SHIPMENT-ID';
  const trackingEventId = `TRK-E-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  await dbPool.query(
    `INSERT INTO shipment_tracking_events (
      tracking_event_id, shipment_id, order_id, status, location_city, location_state, location_country, facility_id, description, event_time
    ) VALUES (?, ?, ?, ?, 'Bengaluru', 'Karnataka', 'India', 'WH-BLR-01', ?, NOW())`,
    [trackingEventId, shipmentId, orderId, newStatus, reason]
  );

  // Write audit trail
  await writeAdminAuditLog(adminId, 'ORDER_STATUS_UPDATE', 'ORDER', orderId, oldStatus, newStatus);

  // Log telemetry event
  EventLogger.logEvent({
    event_type: 'order_status_updated',
    session_id: 'admin_action',
    customer_id: orderRows[0].customer_id,
    user_type: 'registered',
    page: 'admin_orders',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: { order_id: orderId, old_status: oldStatus, new_status: newStatus, reason }
  });

  return true;
}

export async function cancelAdminOrder(orderId: string, reason: string, adminId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  const [orderRows]: any = await dbPool.query('SELECT status, customer_id FROM orders WHERE order_id = ?', [orderId]);
  if (orderRows.length === 0) return false;
  const oldStatus = orderRows[0].status;

  if (['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(oldStatus)) {
    throw new Error(`Order cannot be cancelled in state: ${oldStatus}`);
  }

  // Update order
  await dbPool.query('UPDATE orders SET status = "CANCELLED" WHERE order_id = ?', [orderId]);

  // Track event
  const [shipments]: any = await dbPool.query('SELECT shipment_id FROM shipments WHERE order_id = ?', [orderId]);
  const shipmentId = shipments.length > 0 ? shipments[0].shipment_id : 'MOCK-SHIPMENT-ID';
  const trackingEventId = `TRK-E-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  await dbPool.query(
    `INSERT INTO shipment_tracking_events (
      tracking_event_id, shipment_id, order_id, status, location_city, location_state, location_country, facility_id, description, event_time
    ) VALUES (?, ?, ?, 'CANCELLED', 'Bengaluru', 'Karnataka', 'India', 'WH-BLR-01', ?, NOW())`,
    [trackingEventId, shipmentId, orderId, `Cancelled by Admin: ${reason}`]
  );

  // Release inventory
  const [items]: any = await dbPool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  for (const item of items) {
    // Release reserved stock back to available
    await dbPool.query(
      `UPDATE inventory SET stock = stock + ?, reserved_stock = GREATEST(0, CAST(reserved_stock AS SIGNED) - ?) WHERE product_id = ?`,
      [item.quantity, item.quantity, item.product_id]
    );
  }

  // Log audit & telemetry
  await writeAdminAuditLog(adminId, 'CANCEL_ORDER', 'ORDER', orderId, oldStatus, 'CANCELLED');

  EventLogger.logEvent({
    event_type: 'order_cancelled',
    session_id: 'admin_action',
    customer_id: orderRows[0].customer_id,
    user_type: 'registered',
    page: 'admin_orders',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: { order_id: orderId, cancelled_by: 'ADMIN', admin_id: adminId, reason }
  });

  return true;
}

export async function getAdminCustomersList(
  search: string = '',
  membership: string = '',
  country: string = '',
  status: string = ''
): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];
  let query = `
    SELECT c.customer_id, c.first_name, c.last_name, c.email, c.membership, c.account_status, c.created_at,
           COUNT(o.order_id) as orders_count
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (search) {
    query += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.customer_id LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (membership) {
    query += ' AND c.membership = ?';
    params.push(membership);
  }
  if (country) {
    query += ' AND c.country = ?';
    params.push(country);
  }
  if (status) {
    query += ' AND c.account_status = ?';
    params.push(status);
  }

  query += ' GROUP BY c.customer_id ORDER BY c.created_at DESC';
  const [rows]: any = await dbPool.query(query, params);
  return rows;
}

export async function getAdminCustomer360(customerId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;

  const [custRows]: any = await dbPool.query(
    'SELECT customer_id, first_name, last_name, email, phone, membership, account_status, city, state, country, created_at FROM customers WHERE customer_id = ?',
    [customerId]
  );
  if (custRows.length === 0) return null;
  const customer = custRows[0];

  // Spend and count aggregations
  const [orderSummary]: any = await dbPool.query(
    `SELECT COUNT(*) as count, IFNULL(SUM(total_amount), 0) as spend
     FROM orders WHERE customer_id = ?`,
    [customerId]
  );
  const totalOrders = orderSummary[0]?.count || 0;
  const totalSpend = parseFloat(orderSummary[0]?.spend || 0);
  const aov = totalOrders > 0 ? parseFloat((totalSpend / totalOrders).toFixed(2)) : 0;

  // Returns count
  const [returnSummary]: any = await dbPool.query(
    `SELECT COUNT(*) as count FROM returns WHERE customer_id = ?`,
    [customerId]
  );

  // Reviews count
  const [reviewSummary]: any = await dbPool.query(
    `SELECT COUNT(*) as count FROM reviews WHERE customer_id = ?`,
    [customerId]
  );

  // Cancellations count
  const [cancelSummary]: any = await dbPool.query(
    `SELECT COUNT(*) as count FROM order_cancellations oc JOIN orders o ON oc.order_id = o.order_id WHERE o.customer_id = ?`,
    [customerId]
  );

  // History orders list
  const [orders]: any = await dbPool.query(
    `SELECT order_id, total_amount, status, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5`,
    [customerId]
  );

  // Sessions count
  const [sessions]: any = await dbPool.query(
    `SELECT session_id, started_at, device, browser FROM sessions WHERE customer_id = ? ORDER BY started_at DESC LIMIT 5`,
    [customerId]
  );

  // Search History queries
  const [searches]: any = await dbPool.query(
    `SELECT query as query_text, COUNT(*) as search_count, MAX(searched_at) as updated_at 
     FROM search_history WHERE customer_id = ? 
     GROUP BY query ORDER BY updated_at DESC LIMIT 5`,
    [customerId]
  );

  return {
    profile: customer,
    stats: {
      orders_count: totalOrders,
      total_spend: totalSpend,
      aov,
      returns_count: returnSummary[0]?.count || 0,
      reviews_count: reviewSummary[0]?.count || 0,
      cancellations_count: cancelSummary[0]?.count || 0
    },
    orders,
    sessions,
    searches
  };
}

export async function updateAdminCustomerStatus(customerId: string, status: string, adminId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;

  const [custRows]: any = await dbPool.query('SELECT account_status FROM customers WHERE customer_id = ?', [customerId]);
  if (custRows.length === 0) return false;
  const oldStatus = custRows[0].account_status;

  await dbPool.query('UPDATE customers SET account_status = ? WHERE customer_id = ?', [status, customerId]);

  await writeAdminAuditLog(adminId, 'CUSTOMER_STATUS_UPDATE', 'CUSTOMER', customerId, oldStatus, status);

  EventLogger.logEvent({
    event_type: 'customer_status_updated',
    session_id: 'admin_action',
    customer_id: customerId,
    user_type: 'registered',
    page: 'admin_customers',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: { customer_id: customerId, old_status: oldStatus, new_status: status }
  });

  return true;
}

// ----------------------------------------------------
// ADMIN REVIEW MANAGEMENT HELPERS
// ----------------------------------------------------

export async function getAdminReviewsList(search = '', rating = '', status = ''): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];
  let query = `
    SELECT r.*, c.first_name, c.last_name, c.email, p.name as product_name
    FROM reviews r
    JOIN customers c ON r.customer_id = c.customer_id
    JOIN products p ON r.product_id = p.product_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (search) {
    query += ' AND (r.review_id LIKE ? OR p.name LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (rating) {
    query += ' AND r.rating = ?';
    params.push(rating);
  }
  if (status) {
    query += ' AND r.review_status = ?';
    params.push(status);
  }
  query += ' ORDER BY r.created_at DESC';
  const [rows] = await dbPool.query(query, params);
  return rows as any[];
}

export async function getAdminReviewDetail(reviewId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;
  const [rows]: any = await dbPool.query(
    `SELECT r.*, c.first_name, c.last_name, c.email, p.name as product_name, p.sku
     FROM reviews r
     JOIN customers c ON r.customer_id = c.customer_id
     JOIN products p ON r.product_id = p.product_id
     WHERE r.review_id = ?`,
    [reviewId]
  );
  if (rows.length === 0) return null;
  return rows[0];
}

export async function updateAdminReviewStatus(reviewId: string, status: string, adminId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;
  
  const [reviewRows]: any = await dbPool.query('SELECT review_status, product_id, customer_id FROM reviews WHERE review_id = ?', [reviewId]);
  if (reviewRows.length === 0) return false;
  const oldStatus = reviewRows[0].review_status;

  await dbPool.query('UPDATE reviews SET review_status = ? WHERE review_id = ?', [status, reviewId]);

  // Log telemetry event
  let evType = 'review_flagged';
  if (status === 'PUBLISHED') evType = 'review_approved';
  else if (status === 'REJECTED') evType = 'review_rejected';
  else if (status === 'HIDDEN') evType = 'review_hidden';

  EventLogger.logEvent({
    event_type: evType,
    session_id: 'admin_action',
    customer_id: reviewRows[0].customer_id,
    user_type: 'registered',
    page: 'admin_reviews',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: {
      review_id: reviewId,
      product_id: reviewRows[0].product_id,
      customer_id: reviewRows[0].customer_id,
      previous_status: oldStatus,
      new_status: status
    }
  });

  await writeAdminAuditLog(adminId, 'REVIEW_STATUS_UPDATE', 'REVIEW', reviewId, oldStatus, status);
  return true;
}

export async function getReviewAnalytics(): Promise<any> {
  if (!dbPool || isInMemoryFallback) {
    return {
      avgRating: 4.2,
      totalCount: 1500,
      pendingCount: 12,
      flaggedCount: 4,
      verifiedPct: 82.5,
      distribution: { 5: 800, 4: 400, 3: 200, 2: 70, 1: 30 }
    };
  }
  
  const [totalRows]: any = await dbPool.query('SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM reviews');
  const [pendingRows]: any = await dbPool.query('SELECT COUNT(*) as count FROM reviews WHERE review_status = "PENDING"');
  const [flaggedRows]: any = await dbPool.query('SELECT COUNT(*) as count FROM reviews WHERE review_status = "FLAGGED"');
  const [verifiedRows]: any = await dbPool.query('SELECT COUNT(*) as count FROM reviews WHERE verified_purchase = 1');
  const [distRows]: any = await dbPool.query('SELECT rating, COUNT(*) as count FROM reviews GROUP BY rating');

  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const row of distRows) {
    distribution[row.rating] = row.count;
  }

  const total = totalRows[0].count || 0;
  const verifiedCount = verifiedRows[0].count || 0;
  const verifiedPct = total > 0 ? Number(((verifiedCount / total) * 100).toFixed(1)) : 0;

  return {
    avgRating: total > 0 ? Number(Number(totalRows[0].avg_rating).toFixed(1)) : 0,
    totalCount: total,
    pendingCount: pendingRows[0].count || 0,
    flaggedCount: flaggedRows[0].count || 0,
    verifiedPct,
    distribution
  };
}

// ----------------------------------------------------
// ADMIN COUPON MANAGEMENT HELPERS
// ----------------------------------------------------

export async function getAdminCouponsList(search = '', status = ''): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];
  let query = 'SELECT * FROM coupons WHERE 1=1';
  const params: any[] = [];
  if (search) {
    query += ' AND code LIKE ?';
    params.push(`%${search}%`);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY start_date DESC';
  const [rows]: any = await dbPool.query(query, params);

  // For each coupon, fetch its usage count
  for (const row of rows) {
    const [usageRows]: any = await dbPool.query('SELECT COUNT(*) as count FROM coupon_usages WHERE coupon_id = ?', [row.coupon_id]);
    row.usage_count = usageRows[0].count || 0;
  }
  return rows;
}

export async function createAdminCoupon(coupon: any, adminId: string): Promise<any> {
  if (!dbPool || isInMemoryFallback) return null;
  const couponId = `CPN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  await dbPool.query(
    `INSERT INTO coupons (coupon_id, code, discount_type, discount_value, minimum_order_value, maximum_discount, start_date, end_date, usage_limit, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      couponId,
      coupon.code,
      coupon.discount_type,
      coupon.discount_value,
      coupon.minimum_order_value || 0,
      coupon.maximum_discount || 99999,
      coupon.start_date,
      coupon.end_date,
      coupon.usage_limit || 1000,
      coupon.status || 'ACTIVE'
    ]
  );

  EventLogger.logEvent({
    event_type: 'coupon_created',
    session_id: 'admin_action',
    customer_id: 'ADMIN',
    user_type: 'registered',
    page: 'admin_coupons',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: { coupon_id: couponId, coupon_code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value }
  });

  await writeAdminAuditLog(adminId, 'COUPON_CREATED', 'COUPON', couponId, null, coupon.code);
  return { coupon_id: couponId, ...coupon };
}

export async function deactivateAdminCoupon(couponId: string, adminId: string): Promise<boolean> {
  if (!dbPool || isInMemoryFallback) return false;
  await dbPool.query('UPDATE coupons SET status = "INACTIVE" WHERE coupon_id = ?', [couponId]);

  EventLogger.logEvent({
    event_type: 'coupon_deactivated',
    session_id: 'admin_action',
    customer_id: 'ADMIN',
    user_type: 'registered',
    page: 'admin_coupons',
    context: { country: 'India', state: 'Karnataka', city: 'Bengaluru', device: 'desktop', browser: 'Chrome' },
    metadata: { coupon_id: couponId }
  });

  await writeAdminAuditLog(adminId, 'COUPON_DEACTIVATED', 'COUPON', couponId, 'ACTIVE', 'INACTIVE');
  return true;
}

export async function getCouponAnalytics(): Promise<any> {
  if (!dbPool || isInMemoryFallback) {
    return {
      usageCount: 120,
      totalDiscount: 15400,
      revenueGenerated: 145000,
      aovWithCoupon: 2800,
      aovWithoutCoupon: 2400,
      usageByState: []
    };
  }

  const [usageRows]: any = await dbPool.query('SELECT COUNT(*) as count, SUM(discount_amount) as total_discount FROM coupon_usages');
  const [revenueRows]: any = await dbPool.query(
    `SELECT SUM(o.total_amount) as revenue 
     FROM orders o 
     JOIN coupon_usages cu ON o.order_id = cu.order_id`
  );
  const [aovWithRows]: any = await dbPool.query(
    `SELECT AVG(o.total_amount) as avg_val 
     FROM orders o 
     WHERE o.coupon_code IS NOT NULL`
  );
  const [aovWithoutRows]: any = await dbPool.query(
    `SELECT AVG(o.total_amount) as avg_val 
     FROM orders o 
     WHERE o.coupon_code IS NULL`
  );
  const [stateRows]: any = await dbPool.query(
    `SELECT oa.state, COUNT(*) as count, SUM(cu.discount_amount) as discount 
     FROM coupon_usages cu
     JOIN order_addresses oa ON cu.order_id = oa.order_id
     GROUP BY oa.state`
  );

  return {
    usageCount: usageRows[0].count || 0,
    totalDiscount: usageRows[0].total_discount || 0,
    revenueGenerated: revenueRows[0].revenue || 0,
    aovWithCoupon: aovWithRows[0].avg_val || 0,
    aovWithoutCoupon: aovWithoutRows[0].avg_val || 0,
    usageByState: stateRows
  };
}

// ----------------------------------------------------
// ADMIN WAREHOUSE MANAGEMENT HELPERS
// ----------------------------------------------------

const DEFAULT_MOCK_WAREHOUSES = [
  {
    warehouse_id: 'WH001',
    warehouse_code: 'WH-BLR-01',
    name: 'Bengaluru Central Fulfillment',
    address: 'Plot 45, Peenya Industrial Area',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postal_code: '560058',
    latitude: 13.0329,
    longitude: 77.5274,
    capacity_units: 150000,
    status: 'ACTIVE',
    current_utilization: 68500
  },
  {
    warehouse_id: 'WH002',
    warehouse_code: 'WH-MAA-01',
    name: 'Chennai Logistics Hub',
    address: '12, Sriperumbudur Expressway',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    postal_code: '602105',
    latitude: 12.9692,
    longitude: 79.9443,
    capacity_units: 120000,
    status: 'ACTIVE',
    current_utilization: 94200
  },
  {
    warehouse_id: 'WH003',
    warehouse_code: 'WH-BOM-01',
    name: 'Mumbai Metro Depot',
    address: 'Gate 3, Bhiwandi Logistics Park',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    postal_code: '421302',
    latitude: 19.2812,
    longitude: 73.0483,
    capacity_units: 200000,
    status: 'ACTIVE',
    current_utilization: 112000
  }
];

export async function getAdminWarehousesList(search = ''): Promise<any[]> {
  let list: any[] = [];
  if (dbPool && !isInMemoryFallback) {
    try {
      let query = 'SELECT * FROM warehouses WHERE 1=1';
      const params: any[] = [];
      if (search) {
        query += ' AND (name LIKE ? OR city LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      query += ' ORDER BY warehouse_code ASC';
      const [rows]: any = await dbPool.query(query, params);

      for (const row of rows) {
        const [stockRows]: any = await dbPool.query(
          'SELECT SUM(stock + reserved_stock + damaged_stock) as total FROM inventory WHERE warehouse_id = ?',
          [row.warehouse_id]
        );
        row.current_utilization = stockRows[0]?.total || 0;
      }
      list = rows;
    } catch (e) {
      list = [];
    }
  }

  if (list.length === 0) {
    list = DEFAULT_MOCK_WAREHOUSES;
    if (search) {
      list = list.filter(w => 
        w.name.toLowerCase().includes(search.toLowerCase()) || 
        w.city.toLowerCase().includes(search.toLowerCase())
      );
    }
  }

  return list;
}

export async function getWarehouseDetail(warehouseId: string): Promise<any> {
  if (dbPool && !isInMemoryFallback) {
    try {
      const [rows]: any = await dbPool.query('SELECT * FROM warehouses WHERE warehouse_id = ?', [warehouseId]);
      if (rows.length > 0) {
        const wh = rows[0];
        const [stockRows]: any = await dbPool.query(
          'SELECT SUM(stock + reserved_stock + damaged_stock) as total FROM inventory WHERE warehouse_id = ?',
          [warehouseId]
        );
        wh.current_utilization = stockRows[0]?.total || 0;
        return wh;
      }
    } catch (e) {}
  }
  return DEFAULT_MOCK_WAREHOUSES.find(w => w.warehouse_id === warehouseId) || DEFAULT_MOCK_WAREHOUSES[0];
}

export async function getWarehouseInventory(warehouseId: string): Promise<any[]> {
  if (dbPool && !isInMemoryFallback) {
    try {
      const [rows]: any = await dbPool.query(
        `SELECT i.inventory_id, i.product_id, i.stock, i.reorder_level, i.warehouse_id, i.reserved_stock as reserved, i.damaged_stock as damaged, p.name as product_name, p.sku
         FROM inventory i
         JOIN products p ON i.product_id = p.product_id
         WHERE i.warehouse_id = ?
         ORDER BY p.name ASC`,
        [warehouseId]
      );
      if (rows.length > 0) return rows;
    } catch (e) {}
  }

  return [
    { inventory_id: 'INV-101', product_id: 'PROD-CAT001-01', product_name: 'Gaming Laptop Pro 15', sku: 'SKU-LAP-PRO15', stock: 120, reserved: 15, damaged: 2, reorder_level: 20 },
    { inventory_id: 'INV-102', product_id: 'PROD-CAT001-02', product_name: 'Wireless Noise Cancelling Headphones', sku: 'SKU-AUD-WNC01', stock: 450, reserved: 32, damaged: 0, reorder_level: 50 },
    { inventory_id: 'INV-103', product_id: 'PROD-CAT002-01', product_name: 'Ultra Lightweight Running Sneakers', sku: 'SKU-FAS-RUN01', stock: 18, reserved: 5, damaged: 1, reorder_level: 30 },
    { inventory_id: 'INV-104', product_id: 'PROD-CAT003-01', product_name: 'Ergonomic Office Chair', sku: 'SKU-HOM-EOC01', stock: 85, reserved: 12, damaged: 0, reorder_level: 15 }
  ];
}

export async function getWarehouseAnalytics(warehouseId: string): Promise<any> {
  let ordersProcessed = 420;
  let cityDeliveries: any[] = [];

  if (dbPool && !isInMemoryFallback) {
    try {
      const [orderRows]: any = await dbPool.query(
        'SELECT COUNT(DISTINCT order_id) as count FROM shipments WHERE warehouse_id = ?',
        [warehouseId]
      );
      if (orderRows.length > 0 && orderRows[0].count) {
        ordersProcessed = orderRows[0].count;
      }

      const [cityRows]: any = await dbPool.query(
        `SELECT destination_city as city, AVG(DATEDIFF(delivered_at, shipped_at)) as avg_days, COUNT(*) as count
         FROM shipments
         WHERE warehouse_id = ? AND delivered_at IS NOT NULL AND shipped_at IS NOT NULL
         GROUP BY destination_city`,
        [warehouseId]
      );
      if (cityRows.length > 0) {
        cityDeliveries = cityRows;
      }
    } catch (e) {}
  }

  if (cityDeliveries.length === 0) {
    cityDeliveries = [
      { city: 'Bengaluru', count: 185, avg_days: 1.2 },
      { city: 'Chennai', count: 140, avg_days: 1.5 },
      { city: 'Mumbai', count: 95, avg_days: 2.1 },
      { city: 'Hyderabad', count: 75, avg_days: 1.8 }
    ];
  }

  return {
    ordersProcessed,
    avgProcessingTime: 1.8,
    delayedOrdersPct: 2.1,
    fulfillmentRate: 98.4,
    cityDeliveries
  };
}

export async function createAdminWarehouse(data: any): Promise<any> {
  const warehouseId = `WH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const wh = {
    warehouse_id: warehouseId,
    warehouse_code: data.warehouse_code || `WH-${data.city ? data.city.substring(0, 3).toUpperCase() : 'HUB'}-0${Math.floor(Math.random() * 9 + 1)}`,
    name: data.name || 'New Fulfillment Center',
    address: data.address || 'Industrial Zone 1',
    city: data.city || 'Bengaluru',
    state: data.state || 'Karnataka',
    country: data.country || 'India',
    postal_code: data.postal_code || '560001',
    latitude: Number(data.latitude) || 12.9716,
    longitude: Number(data.longitude) || 77.5946,
    capacity_units: Number(data.capacity_units) || 100000,
    status: data.status || 'ACTIVE',
    current_utilization: 0
  };

  if (dbPool && !isInMemoryFallback) {
    try {
      await dbPool.query(
        `INSERT INTO warehouses (
          warehouse_id, warehouse_code, name, address, city, state, country, postal_code,
          latitude, longitude, capacity_units, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wh.warehouse_id, wh.warehouse_code, wh.name, wh.address, wh.city, wh.state,
          wh.country, wh.postal_code, wh.latitude, wh.longitude, wh.capacity_units, wh.status
        ]
      );
    } catch (e) {}
  }

  DEFAULT_MOCK_WAREHOUSES.unshift(wh);
  return wh;
}

// ----------------------------------------------------
// SIMULATION RUN HELPERS
// ----------------------------------------------------

export async function getSimulationRuns(): Promise<any[]> {
  if (!dbPool || isInMemoryFallback) return [];
  const [rows]: any = await dbPool.query('SELECT * FROM simulation_runs ORDER BY started_at DESC');
  return rows;
}

export async function insertSimulationRun(run: any): Promise<void> {
  if (!dbPool || isInMemoryFallback) return;
  await dbPool.query(
    `INSERT INTO simulation_runs (
      run_id, users, target_rate, rate_unit, duration, traffic_profile,
      total_events, orders, payments, returns, invalid, duplicates, late,
      status, started_at, ended_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      run.run_id, run.users, run.target_rate, run.rate_unit, run.duration, run.traffic_profile,
      run.total_events || 0, run.orders || 0, run.payments || 0, run.returns || 0,
      run.invalid || 0, run.duplicates || 0, run.late || 0, run.status,
      run.started_at, run.ended_at || null
    ]
  );
}

export async function updateSimulationRun(runId: string, run: any): Promise<void> {
  if (!dbPool || isInMemoryFallback) return;
  await dbPool.query(
    `UPDATE simulation_runs SET 
      total_events = ?, orders = ?, payments = ?, returns = ?,
      invalid = ?, duplicates = ?, late = ?, status = ?, ended_at = ?
     WHERE run_id = ?`,
    [
      run.total_events, run.orders, run.payments, run.returns,
      run.invalid, run.duplicates, run.late, run.status, run.ended_at,
      runId
    ]
  );
}


