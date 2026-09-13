import { Kafka, Producer } from "kafkajs";
import { getKafkaTopic } from "./kafkaTopicMapper";

const kafka = new Kafka({
  clientId: "retailhub-backend",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

let producer: Producer | null = null;

export async function connectKafka() {
  if (producer) return;

  producer = kafka.producer();

  await producer.connect();

  console.log("[Kafka] Producer connected");
}

export async function publishEvent(
  topicOrEvent: string | Record<string, any>,
  eventObj?: Record<string, any>
) {
  let topic: string;
  let event: Record<string, any>;

  if (typeof topicOrEvent === "string") {
    topic = topicOrEvent;
    event = eventObj || {};
  } else {
    event = topicOrEvent;
    topic = getKafkaTopic(event.event_type || "");
  }

  if (!producer) {
    await connectKafka();
  }

  // Capture send time immediately before calling producer.send
  // Enforce invariant: event_time <= sendTimeMs <= kafka_timestamp
  const sendTimeMs = Date.now();
  if (event.event_time) {
    const evTimeMs = new Date(event.event_time).getTime();
    if (!isNaN(evTimeMs) && evTimeMs > sendTimeMs) {
      event.event_time = new Date(sendTimeMs).toISOString();
    }
  }

  if (!event.ingestion_time) {
    event.ingestion_time = new Date(sendTimeMs).toISOString();
  }

  await producer!.send({
    topic,
    messages: [
      {
        key: String(event.event_id ?? event.event_type ?? ""),
        value: JSON.stringify(event),
      },
    ],
  });
}