from pyspark.sql import SparkSession
from pyspark.ml import PipelineModel
from pyspark.ml.feature import VectorAssembler, StringIndexerModel
import json
import sys
import os

# Initialize Spark Session
spark = SparkSession.builder \
    .appName("Car Price Prediction") \
    .config("spark.driver.memory", "4g") \
    .config("spark.executor.memory", "4g") \
    .config("spark.jars.packages", "com.microsoft.azure:synapseml_2.12:0.11.2") \
    .config("spark.driver.port", "0") \
    .config("spark.driver.blockManager.port", "0") \
    .config("spark.local.ports", "12000-13000") \
    .getOrCreate()

print(f"Spark Version: {spark.version}")
spark.sparkContext.setLogLevel("INFO")

# Load saved model, indexers, and features
model_path = "../../prediction/models/lightgbm_model/bestModel"
try:
    model = PipelineModel.load(model_path)
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    spark.stop()
    sys.exit(1)

with open("../../prediction/models/selected_features.json", "r") as f:
    selected_features = json.load(f)

with open("../../prediction/models/indexers.json", "r") as f:
    indexers_info = json.load(f)

# Load indexers
indexers = {}
for col_name, output_col in indexers_info.items():
    indexer_path = f"../../prediction/models/indexer_{col_name}"
    try:
        indexers[col_name] = StringIndexerModel.load(indexer_path)
    except Exception as e:
        print(f"Error loading indexer for {col_name}: {e}")
        spark.stop()
        sys.exit(1)

# Create assembler
assembler = VectorAssembler(inputCols=selected_features, outputCol="features")

# Load preprocessing functions
try:
    from lightGBM_model import preprocess_single_input, predict_single_input
except ImportError as e:
    print(f"Error importing preprocessing functions: {e}")
    spark.stop()
    sys.exit(1)

def main():
    # Read input JSON from command line
    try:
        input_json = sys.argv[1]
    except IndexError:
        print(json.dumps({"error": "No input JSON provided"}))
        return

    # Make prediction
    try:
        predicted_price = predict_single_input(input_json, model, assembler, selected_features, indexers)
        print(json.dumps({"predicted_price": round(predicted_price, 2)}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
    spark.stop()