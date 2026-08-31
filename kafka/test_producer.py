from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers="localhost:9092",
    value_serializer=lambda v: json.dumps(v).encode("utf-8")
)

event = {
    "event_type": "order_created",
    "order_id": "TEST-001",
    "user_id": "USER-001",
    "amount": 2499.00
}

producer.send("retail.order_events", value=event)
producer.flush()

print("Event sent successfully!")