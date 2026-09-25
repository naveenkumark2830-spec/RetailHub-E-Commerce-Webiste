import { Kafka, Consumer } from 'kafkajs';
import { insertFraudIncident, FraudIncidentRecord } from '../config/db';
import { processFraudSecurityWorkflow } from './fraudSecurityWorkflow';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const TOPIC = process.env.FRAUDGUARD_DECISION_TOPIC || 'retail_fraudguard_events';
const GROUP_ID = process.env.KAFKA_CONSUMER_GROUP || 'retailhub-website-fraudguard';

const kafka = new Kafka({
  clientId: 'retailhub-website-fraudguard-consumer',
  brokers: [KAFKA_BROKER],
});

let consumer: Consumer | null = null;

export async function startFraudGuardConsumer(): Promise<void> {
  try {
    console.log(`[FraudGuard Consumer] FraudGuard Kafka consumer started (Broker: ${KAFKA_BROKER}, Group: ${GROUP_ID}, Topic: ${TOPIC})`);
    
    consumer = kafka.consumer({ groupId: GROUP_ID });
    
    await consumer.connect();
    console.log(`[FraudGuard Consumer] Connected to Kafka`);

    await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;
        const rawValue = message.value.toString();
        let payload: any;

        try {
          payload = JSON.parse(rawValue);
        } catch (parseErr) {
          console.error(`[FraudGuard Consumer] Invalid FraudGuard message: JSON parse error`, rawValue);
          return;
        }

        // Validate required fields
        if (!payload || typeof payload !== 'object' || !payload.incident_id || !payload.customer_id) {
          console.warn(`[FraudGuard Consumer] Invalid FraudGuard message: missing incident_id or customer_id`, payload);
          return;
        }

        console.log(`[FraudGuard Consumer] [DIAGNOSTIC] Kafka Event Payload:`, JSON.stringify({
          incident_id: payload.incident_id,
          customer_id: payload.customer_id,
          fraud_type: payload.fraud_type,
          action: payload.action,
          severity: payload.severity,
          risk_score: payload.risk_score,
          restriction_minutes: payload.restriction_minutes
        }));

        try {
          const incident: FraudIncidentRecord = {
            incident_id: String(payload.incident_id),
            customer_id: String(payload.customer_id),
            fraud_type: String(payload.fraud_type || 'UNKNOWN'),
            severity: String(payload.severity || 'MEDIUM'),
            reason: String(payload.reason || ''),
            risk_score: typeof payload.risk_score === 'number' ? payload.risk_score : 0,
            risk_level: String(payload.risk_level || 'MEDIUM'),
            action: String(payload.action || 'FLAG'),
            requires_customer_action: Boolean(payload.requires_customer_action),
            requires_admin_review: Boolean(payload.requires_admin_review),
            restriction_minutes: typeof payload.restriction_minutes === 'number' ? payload.restriction_minutes : null,
            ai_attack_pattern: payload.ai_attack_pattern ? String(payload.ai_attack_pattern) : null,
            ai_finding: payload.ai_finding ? String(payload.ai_finding) : null,
            ai_confidence: typeof payload.ai_confidence === 'number' ? payload.ai_confidence : null,
            ai_recommendation: payload.ai_recommendation ? String(payload.ai_recommendation) : null,
            source_event_id: payload.source_event_id ? String(payload.source_event_id) : null,
            source_event_type: payload.source_event_type ? String(payload.source_event_type) : null,
            ip_address: payload.ip_address ? String(payload.ip_address) : null,
            device_id: payload.device_id ? String(payload.device_id) : null,
            session_id: payload.session_id ? String(payload.session_id) : null,
            timestamp: payload.timestamp ? String(payload.timestamp) : new Date().toISOString(),
          };

          const inserted = await insertFraudIncident(incident);
          if (inserted) {
            console.log(`[FraudGuard Consumer] [DIAGNOSTIC] Incident persisted to DB: ${payload.incident_id}`);
          } else {
            console.log(`[FraudGuard Consumer] [DIAGNOSTIC] Duplicate incident ignored in DB: ${payload.incident_id}`);
          }

          // Trigger automated security workflow based on FraudGuard decision
          try {
            await processFraudSecurityWorkflow(incident);
          } catch (wfErr: any) {
            console.error(`[FraudGuard Consumer] Security workflow processing error for ${payload.incident_id}:`, wfErr?.message || wfErr);
          }
        } catch (dbErr: any) {
          console.error(`[FraudGuard Consumer] Kafka consumer error: DB write error for ${payload.incident_id}`, dbErr);
        }
      },
    });

  } catch (err: any) {
    console.error(`[FraudGuard Consumer] Kafka consumer error:`, err?.message || err);
    // Non-blocking: failure here log error without stopping website server
  }
}
