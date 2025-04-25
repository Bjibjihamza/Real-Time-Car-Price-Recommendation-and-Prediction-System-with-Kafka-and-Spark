from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'avito_cars',
    bootstrap_servers='localhost:9092',
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for msg in consumer:
    print(f"📥 Message reçu : {msg.value}")
