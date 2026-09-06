import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { publishEvent } from "./kafkaProducer";

export interface CanonicalClickstreamEvent {
  event_id: string;
  simulation_run_id: string;
  event_type: string;
  event_version: number;
  event_time: string;
  ingestion_time: string;
  event_source: string;
  actor_type: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  session_id: string;
  customer_id: string | null;
  anonymous_id: string;
  user_type: 'guest' | 'registered' | 'admin';
  page: string | null;
  context: {
    country: string;
    state: string;
    city: string;
    device: string | null;
    browser: string | null;
    device_id: string;
    ip_address: string;
  };
  entity: {
    product_id: string | null;
    cart_id: string | null;
    order_id: string | null;
    order_item_id: string | null;
    payment_id: string | null;
    shipment_id: string | null;
    return_id: string | null;
    refund_id: string | null;
    review_id: string | null;
    admin_id: string | null;
  };
  metadata: Record<string, any>;
}

export type EntityMap = CanonicalClickstreamEvent['entity'];

const LOGS_BASE_DIR = path.resolve(__dirname, '../../event_logs');

// Event ID Uniqueness Registry
const generatedEventIds = new Set<string>();
const lastSessionEventTimeMap = new Map<string, number>();

// 10s Sliding Window Event Rate Tracking for DDoS / Scraper Fraud Detection
const eventTimestampHistory: Array<{ timestamp: number; key: string }> = [];

function trackBurstRate(key: string, nowMs: number): { count: number; isDdosSuspect: boolean } {
  const cutoff = nowMs - 10000;
  while (eventTimestampHistory.length > 0 && eventTimestampHistory[0].timestamp < cutoff) {
    eventTimestampHistory.shift();
  }
  eventTimestampHistory.push({ timestamp: nowMs, key });
  const burstCount = eventTimestampHistory.filter(e => e.key === key).length;
  return {
    count: burstCount,
    isDdosSuspect: burstCount > 30
  };
}

export class EventLogger {
  public static logRawCorruptedLine(rawLine: string) {
    try {
      const now = new Date();
      const year = now.getUTCFullYear().toString();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');

      const dirPath = path.join(LOGS_BASE_DIR, year, month, day);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const filePath = path.join(dirPath, 'events.jsonl');
      fs.appendFileSync(filePath, rawLine + '\n', 'utf-8');

      console.log(`[EventLogger] Corrupted Raw Line logged -> ${filePath}`);
    } catch (err: any) {
      console.error('[EventLogger Critical Error] Exception while logging corrupted raw line:', err);
    }
  }

  public static async logEvent(
    event: any,
    allowDuplicateEventId: boolean = false
  ): Promise<CanonicalClickstreamEvent> {
    const now = new Date();
    const year = now.getUTCFullYear().toString();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');

    // 1. EVENT ID UNIQUENESS & Pre-write Validation
    let eventId = event.event_id || `EVT-SIM-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const md = { ...(event.metadata || {}) };
    const isDirty = md.data_quality?.is_dirty === true || md.duplicate === true;

    // Reject duplicates only if clean and allowDuplicateEventId is false
    if (!allowDuplicateEventId && generatedEventIds.has(eventId) && !isDirty && md.data_quality?.issue_type !== 'DUPLICATE_EVENT') {
      eventId = `EVT-SIM-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    }
    generatedEventIds.add(eventId);

    const sessionKey = event.session_id || 'sess_default';
    const sessionHash = crypto.createHash('md5').update(sessionKey).digest('hex').substring(0, 8).toUpperCase();
    const anonymousId = event.anonymous_id || `ANON-SIM-${sessionHash}`;

    // ADMIN EVENTS
    const isAdminEvent = event.event_type.startsWith('admin_') || event.actor_type === 'ADMIN' || event.user_type === 'admin';
    const isSystem = !isAdminEvent && event.actor_type === 'SYSTEM';

    const actorType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' = isAdminEvent ? 'ADMIN' : (isSystem ? 'SYSTEM' : 'CUSTOMER');
    const userType: 'guest' | 'registered' | 'admin' = isAdminEvent ? 'admin' : (event.user_type === 'guest' ? 'guest' : 'registered');

    // ENTITY VS METADATA SEPARATION
    const passedEntity: any = event.entity || {};
    const entityObj: EntityMap = {
      product_id: passedEntity.product_id ?? md.selected_product_id ?? md.product_id ?? null,
      cart_id: passedEntity.cart_id ?? md.cart_id ?? null,
      order_id: passedEntity.order_id ?? md.order_id ?? null,
      order_item_id: passedEntity.order_item_id ?? md.order_item_id ?? null,
      payment_id: passedEntity.payment_id ?? md.payment_id ?? null,
      shipment_id: passedEntity.shipment_id ?? md.shipment_id ?? null,
      return_id: passedEntity.return_id ?? md.return_id ?? null,
      refund_id: passedEntity.refund_id ?? md.refund_id ?? null,
      review_id: passedEntity.review_id ?? md.review_id ?? null,
      admin_id: isAdminEvent ? (passedEntity.admin_id ?? md.admin_id ?? 'ADM001') : null
    };

    // Purge redundant ID fields from metadata
    delete md.admin_id;
    delete md.product_id;
    delete md.selected_product_id;
    delete md.cart_id;
    delete md.order_id;
    delete md.order_item_id;
    delete md.payment_id;
    delete md.shipment_id;
    delete md.return_id;
    delete md.refund_id;
    delete md.review_id;

    // STRICT PER-SESSION OUTPUT ORDERING
    let finalEventTimeIso = event.event_time || now.toISOString();
    const parsedTime = new Date(finalEventTimeIso).getTime();

    if (!isNaN(parsedTime) && !isDirty) {
      let eventTimeMs = parsedTime;
      const lastTime = lastSessionEventTimeMap.get(sessionKey);
      if (lastTime && eventTimeMs < lastTime) {
        eventTimeMs = lastTime + 100;
      }
      lastSessionEventTimeMap.set(sessionKey, eventTimeMs);
      finalEventTimeIso = new Date(eventTimeMs).toISOString();
    }

    const deviceId = event.context?.device_id || event.device_id || (event as any).deviceId || `DEV-FP-${crypto.createHash('md5').update(sessionKey).digest('hex').substring(0, 10)}`;
    const ipAddress = event.context?.ip_address || event.ip_address || (event as any).ipAddress || '127.0.0.1';

    // DDoS & Scraper Fraud Burst Rate Detection (> 30 events in 10s window)
    const ipBurst = trackBurstRate(`IP:${ipAddress}`, parsedTime || now.getTime());
    const devBurst = trackBurstRate(`DEV:${deviceId}`, parsedTime || now.getTime());

    if (ipBurst.isDdosSuspect || devBurst.isDdosSuspect || md.is_scraper === true) {
      md.fraud_analytics = {
        is_ddos_suspect: ipBurst.isDdosSuspect || devBurst.isDdosSuspect,
        ip_event_count_10s: ipBurst.count,
        device_event_count_10s: devBurst.count,
        threshold_10s: 30,
        pattern: md.is_scraper ? 'COOKIE_CLEARING_SCRAPER' : 'HIGH_FREQUENCY_BURST_DDOS'
      };
    }

    const formattedEvent: CanonicalClickstreamEvent = {
      event_id: eventId,
      simulation_run_id: (event as any).simulation_run_id || (event as any).simulation_id || 'SIM-MANUAL-0001',
      event_type: event.event_type,
      event_version: event.event_version || 1,
      event_time: finalEventTimeIso,
      ingestion_time: event.ingestion_time || now.toISOString(),
      event_source: event.event_source || (isAdminEvent ? 'admin_portal' : (isSystem ? 'backend_service' : 'website')),
      actor_type: actorType,
      session_id: sessionKey,
      customer_id: isAdminEvent ? null : (event.customer_id !== undefined ? event.customer_id : (userType === 'guest' ? null : null)),
      anonymous_id: anonymousId,
      user_type: userType,
      page: isSystem ? null : (event.page || (isAdminEvent ? 'admin_dashboard' : 'browsing')),
      context: {
        country: event.context?.country || 'India',
        state: event.context?.state || 'Tamil Nadu',
        city: event.context?.city || 'Chennai',
        device: isSystem ? null : (event.context?.device || event.device || (event as any).device || 'desktop'),
        browser: isSystem ? null : (event.context?.browser || event.browser || (event as any).browser || 'Chrome'),
        device_id: deviceId,
        ip_address: ipAddress
      },
      entity: entityObj,
      metadata: md
    };

    try {
      const dirPath = path.join(LOGS_BASE_DIR, year, month, day);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const filePath = path.join(dirPath, 'events.jsonl');
      const jsonLine = JSON.stringify(formattedEvent);
      fs.appendFileSync(filePath, jsonLine + '\n', 'utf-8');

      console.log(`[EventLogger] Event '${formattedEvent.event_type}' logged -> ${filePath}`);
    } catch (err: any) {
      console.error('[EventLogger Critical Error] Exception while logging canonical event:', err);
    }

    try {
      await publishEvent(formattedEvent);
    } catch (err) {
      console.error("[Kafka] Failed to publish event:", err);
    }

    return formattedEvent;
  }
}
