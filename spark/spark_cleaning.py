from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, TimestampType
from pyspark.sql.functions import col, from_json, when, lower, trim, regexp_replace, lit, regexp_extract, udf, coalesce, to_timestamp, to_date, date_format, concat, floor
import uuid
from datetime import datetime
import json

# Initialize Spark session
spark = SparkSession.builder \
    .appName("KafkaCassandraCarCleaning") \
    .config("spark.cassandra.connection.host", "localhost") \
    .config("spark.cassandra.connection.port", "9042") \
    .config("spark.streaming.kafka.maxRatePerPartition", "100") \
    .getOrCreate()

print("✅ Spark session created successfully")

# Define Kafka JSON schema for Moteur
moteur_schema = StructType([
    StructField("ID", StringType(), True),
    StructField("Titre", StringType(), True),
    StructField("Prix", StringType(), True),
    StructField("Date de publication", StringType(), True),
    StructField("Année", StringType(), True),
    StructField("Type de carburant", StringType(), True),
    StructField("Transmission", StringType(), True),
    StructField("Créateur", StringType(), True),
    StructField("Secteur", StringType(), True),
    StructField("Kilométrage", StringType(), True),
    StructField("Marque", StringType(), True),
    StructField("Modèle", StringType(), True),
    StructField("Nombre de portes", StringType(), True),
    StructField("Première main", StringType(), True),
    StructField("Puissance fiscale", StringType(), True),
    StructField("État", StringType(), True),
    StructField("Équipements", StringType(), True),
    StructField("Ville du vendeur", StringType(), True),
    StructField("Dossier d'images", StringType(), True),
    StructField("Dédouané", StringType(), True),
    StructField("Origine", StringType(), True)
])

# Define Kafka JSON schema for Avito
avito_schema = StructType([
    StructField("ID", StringType(), True),
    StructField("Titre", StringType(), True),
    StructField("Prix", StringType(), True),
    StructField("Date de publication", StringType(), True),
    StructField("Année", StringType(), True),
    StructField("Type de carburant", StringType(), True),
    StructField("Transmission", StringType(), True),
    StructField("Créateur", StringType(), True),
    StructField("Type de véhicule", StringType(), True),
    StructField("Secteur", StringType(), True),
    StructField("Kilométrage", StringType(), True),
    StructField("Marque", StringType(), True),
    StructField("Modèle", StringType(), True),
    StructField("Nombre de portes", StringType(), True),
    StructField("Origine", StringType(), True),
    StructField("Première main", StringType(), True),
    StructField("Puissance fiscale", StringType(), True),
    StructField("État", StringType(), True),
    StructField("Équipements", StringType(), True),
    StructField("Ville du vendeur", StringType(), True),
    StructField("Dossier d'images", StringType(), True),
    StructField("timestamp", StringType(), True)
])

# UDF for generating UUID
def generate_uuid():
    return str(uuid.uuid4())

uuid_udf = udf(generate_uuid, StringType())

# Reusable cleaning functions from the first script
def clean_year_column(df):
    return (df
        .withColumn("Année", regexp_replace(col("Année"), "[^\\d]", ""))
        .withColumn("Année",
            when(
                (col("Année").rlike("^\\d{4}$")) &
                (col("Année").cast("int").between(1900, 2025)),
                col("Année").cast("integer")
            ).otherwise(None)
        )
    )

def clean_puissance_fiscale(df, is_avito=True):
    col_name = "Puissance fiscale"
    if is_avito:
        df = df.withColumn(
            col_name,
            regexp_replace(col(col_name), r"(Plus de | CV|\s+)", "")
        ).withColumn(
            col_name,
            when(col(col_name).rlike("^\d+$"), col(col_name))
            .otherwise(None)
        )
    else:
        df = df.withColumn(
            col_name,
            when(col(col_name) == "N/A", None)
            .otherwise(col(col_name))
        )
    return df.withColumn(
        col_name,
        col(col_name).cast("integer")
    ).withColumn(
        col_name,
        when((col(col_name) >= 3) & (col(col_name) <= 50), col(col_name))
        .otherwise(None)
    )

def clean_doors_simple(df):
    return df.withColumn(
        "Nombre de portes",
        when(trim(col("Nombre de portes")).rlike("^\\d+$"),
             trim(col("Nombre de portes")).cast("int"))
        .otherwise(None)
    )

def standardize_date(date_col):
    trimmed_col = trim(date_col)
    return when(
        date_col.isNull(),
        lit(None)
    ).otherwise(
        when(
            to_timestamp(trimmed_col, "yyyy-MM-dd HH:mm:ss").isNotNull(),
            date_format(
                to_timestamp(trimmed_col, "yyyy-MM-dd HH:mm:ss"),
                "dd/MM/yyyy HH:mm"
            )
        ).when(
            to_date(trimmed_col, "yyyy-MM-dd").isNotNull(),
            concat(
                date_format(to_date(trimmed_col, "yyyy-MM-dd"), "dd/MM/yyyy"),
                lit(" 00:00")
            )
        ).otherwise(lit(None))
    )

# Process Moteur batch
def process_moteur_batch(batch_df, batch_id):
    from pyspark.sql.functions import col, when, lower, trim, regexp_replace, lit
    from pyspark.sql import functions as F

    if batch_df.isEmpty():
        print(f"Batch {batch_id} (Moteur): No data to process")
        return
    
    print(f"⚙️ Processing batch {batch_id} (Moteur) with {batch_df.count()} records")
    
    # Add source column
    moteur_df = batch_df.withColumn("source", lit("moteur"))
    
    # Drop columns
    drop_columns = ["ID", "Dédouané"]
    for col_name in drop_columns:
        if col_name in moteur_df.columns:
            moteur_df = moteur_df.drop(col_name)
    
    # Filter valid values for categorical fields
    valid_fuel_types = ["Diesel", "Essence", "Hybride", "N/A", None, "NULL"]
    valid_transmissions = ["Manuelle", "Automatique", "N/A", None, "NULL"]
    moteur_clean = moteur_df.filter(
        F.col("Type de carburant").isin(valid_fuel_types) & 
        F.col("Transmission").isin(valid_transmissions)
    )
    
    # Remove duplicates
    moteur_clean = moteur_clean.dropDuplicates()
    
    # Clean price column
    moteur_clean = moteur_clean.withColumn(
        "Prix",
        regexp_replace(col("Prix"), " ", "")
    ).withColumn(
        "Prix",
        regexp_replace(col("Prix"), "Dhs", "")
    ).withColumn(
        "Prix", 
        when(col("Prix").rlike("^\\d+$"), col("Prix")).otherwise(None)
    ).withColumn(
        "Prix", col("Prix").cast("integer")
    ).withColumn(
        "Prix",
        when((col("Prix") <= 10000000) & (col("Prix") >= 10000), col("Prix"))
        .otherwise(None)
    )
    
    # Clean year column
    moteur_clean = clean_year_column(moteur_clean)
    
    # Clean fuel type column
    valid_fuels = ["essence", "diesel", "hybride"]
    moteur_clean = moteur_clean.withColumn(
        "Type de carburant",
        when(lower(col("Type de carburant")).isin(valid_fuels), lower(col("Type de carburant")))
        .otherwise(None)
    )
    
    # Clean mileage column
    moteur_clean = moteur_clean.withColumn(
        "Kilométrage",
        regexp_replace(col("Kilométrage"), " ", "").cast("integer")
    ).withColumn(
        "Kilométrage",
        when(col("Kilométrage") == "N/A", None)
        .otherwise(col("Kilométrage"))
    )
    
    # Clean fiscal power column
    moteur_clean = clean_puissance_fiscale(moteur_clean, is_avito=False)
    
    # Clean number of doors column
    moteur_clean = moteur_clean.withColumn(
        "Nombre de portes",
        when(col("Nombre de portes").isNull() | col("Nombre de portes").isin(["N/A", "", "NULL"]), None)
        .otherwise(trim(col("Nombre de portes").cast("string")))
    ).withColumn(
        "Nombre de portes",
        when(col("Nombre de portes").isNotNull(),
            floor(col("Nombre de portes").cast("float")).cast("int")
        ).otherwise(None)
    ).withColumn(
        "Nombre de portes",
        when(col("Nombre de portes").isNotNull() & col("Nombre de portes").between(2, 5),
            col("Nombre de portes")
        ).otherwise(None)
    )

    # Debug raw, intermediate, and cleaned values
    print("Raw Nombre de portes values (Moteur):")
    moteur_df.select("Nombre de portes").show(5, truncate=False)
    print("Intermediate Nombre de portes values (after float conversion) (Moteur):")
    moteur_clean.select("Nombre de portes").show(5, truncate=False, vertical=True)
    print("Cleaned Nombre de portes values (Moteur):")
    moteur_clean.select("Nombre de portes").show(5, truncate=False)
    
    # Clean brand column
    moteur_clean = moteur_clean.withColumn("Marque", lower(trim(col("Marque"))))
    
    # Clean first owner column
    moteur_clean = moteur_clean.withColumn(
        "Première main",
        when(col("Première main") == "N/A", "Non").otherwise(col("Première main"))
    )
    
    # Clean sector column
    moteur_clean = moteur_clean.withColumn(
        "Secteur",
        when(
            (col("Secteur").isNull()) | (F.trim(col("Secteur")) == "") | (col("Secteur") == "N/A"),
            "Unknown"
        ).otherwise(F.trim(col("Secteur")))
    ).withColumn(
        "Secteur",
        F.when(col("Secteur").isin(["Fès", "Fes"]), "Fes")
        .when(col("Secteur").isin(["Kenitra", "Kénitra"]), "Kenitra")
        .when(col("Secteur").isin(["Meknes", "Meknès"]), "Meknes")
        .when(col("Secteur").isin(["Sale", "Salé"]), "Sale")
        .when(col("Secteur").isin(["Tétouan", "Tetouan"]), "Tetouan")
        .when(col("Secteur").isin(["El jadida", "El Jadida"]), "El Jadida")
        .when(col("Secteur").isin(["Beni mellal", "Béni Mellal"]), "Beni Mellal")
        .when(col("Secteur").isin(["Laayoune", "Laâyoune"]), "Laayoune")
        .when(col("Secteur").isin(["Al hoceima", "Al Hoceima"]), "Al Hoceima")
        .when(col("Secteur").isin(["Benguerir", "Ben Guerir"]), "Ben Guerir")
        .when(col("Secteur").isin(["Sidi slimane", "Sidi Slimane"]), "Sidi Slimane")
        .when(col("Secteur").isin(["Sidi kacem", "Sidi Kacem"]), "Sidi Kacem")
        .when(col("Secteur").isin(["Khenifra", "Khénifra"]), "Khenifra")
        .when(col("Secteur").isin(["Kelaa sraghna", "El Kelâa des Sraghna"]), "El Kelaa des Sraghna")
        .when(col("Secteur").isin(["Ben slimane", "Benslimane"]), "Benslimane")
        .when(col("Secteur").isin(["Tiflet", "Tifelt"]), "Tiflet")
        .when(col("Secteur").isin(["Fquih ben salah", "Fquih Ben Saleh"]), "Fquih Ben Saleh")
        .when(col("Secteur").isin(["Dar bouazza", "Dar Bouazza"]), "Dar Bouazza")
        .when(col("Secteur").isin(["Taroudant", "Taroudannt"]), "Taroudant")
        .when(col("Secteur").isin(["Had soualem", "Had Soualem"]), "Had Soualem")
        .when(col("Secteur").isin(["El hajeb", "El Hajeb"]), "El Hajeb")
        .when(col("Secteur").isin(["Autre"]), "Other")
        .otherwise(col("Secteur"))
    )
    
    # Clean publication date
    moteur_clean = moteur_clean.withColumn(
        "Date de publication",
        standardize_date(col("Date de publication")).cast(StringType())
    )
    
    # Replace N/A values with null for all columns
    all_columns = moteur_clean.columns
    for column in all_columns:
        moteur_clean = moteur_clean.withColumn(
            column,
            when(col(column) == "N/A", None)
            .otherwise(col(column))
        )
    
    # Create column name mapping (French to English)
    column_mapping = {
        "Puissance fiscale": "fiscal_power",
        "Kilométrage": "mileage",
        "Secteur": "sector",
        "Équipements": "equipment",
        "Ville du vendeur": "seller_city",
        "Prix": "price",
        "Marque": "brand",
        "Première main": "first_owner",
        "État": "condition",
        "Transmission": "transmission",
        "Origine": "origin",
        "Date de publication": "publication_date",
        "Année": "year",
        "Dossier d'images": "image_folder",
        "source": "source",
        "Titre": "title",
        "Type de carburant": "fuel_type",
        "Créateur": "creator",
        "Nombre de portes": "door_count",
        "Modèle": "model"
    }
    
    # Rename columns
    for french_name, english_name in column_mapping.items():
        if french_name in moteur_clean.columns:
            moteur_clean = moteur_clean.withColumnRenamed(french_name, english_name)
    
    # Add UUID for Cassandra primary key
    final_df = moteur_clean.withColumn("id", uuid_udf())
    
    # Write to Cassandra
    write_to_cassandra(final_df, batch_id, "Moteur")

# Process Avito batch
def process_avito_batch(batch_df, batch_id):
    from pyspark.sql.functions import col, when, lower, trim, regexp_replace, lit, regexp_extract, coalesce
    from pyspark.sql import functions as F

    if batch_df.isEmpty():
        print(f"Batch {batch_id} (Avito): No data to process")
        return
    
    print(f"⚙️ Processing batch {batch_id} (Avito) with {batch_df.count()} records")
    
    # Add source column
    avito_df = batch_df.withColumn("source", lit("avito"))
    
    # Drop columns
    drop_columns = ["ID", "Type de véhicule", "timestamp"]
    for col_name in drop_columns:
        if col_name in avito_df.columns:
            avito_df = avito_df.drop(col_name)
    
    # Filter valid values for categorical fields
    valid_fuel_types = ["Diesel", "Essence", "Hybride", "N/A", None, "NULL"]
    valid_transmissions = ["Manuelle", "Automatique", "N/A", None, "NULL"]
    avito_clean = avito_df.filter(
        F.col("Type de carburant").isin(valid_fuel_types) & 
        F.col("Transmission").isin(valid_transmissions)
    )
    
    # Remove duplicates
    avito_clean = avito_clean.dropDuplicates()
    
    # Clean price column
    avito_clean = avito_clean.withColumn(
        "Prix", 
        regexp_replace(col("Prix"), "[\u0020\u202F]", "")
    ).withColumn(
        "Prix",
        regexp_replace(col("Prix"), "DH", "")
    ).withColumn(
        "Prix", 
        when(col("Prix").rlike("^\\d+$"), col("Prix")).otherwise(None)
    ).withColumn(
        "Prix", col("Prix").cast("integer")
    ).withColumn(
        "Prix",
        when((col("Prix") <= 10000000) & (col("Prix") >= 10000), col("Prix"))
        .otherwise(None)
    )
    
    # Clean year column
    avito_clean = clean_year_column(avito_clean)
    
    # Clean fuel type column
    valid_fuels = ["essence", "diesel", "hybride"]
    avito_clean = avito_clean.withColumn(
        "Type de carburant",
        when(lower(col("Type de carburant")).isin(valid_fuels), lower(col("Type de carburant")))
        .otherwise(None)
    )
    
    # Clean mileage column
    avito_clean = avito_clean.withColumn(
        "Kilométrage_clean",
        regexp_replace(col("Kilométrage"), " ", "")
    ).withColumn(
        "mileage_start", 
        regexp_extract(col("Kilométrage_clean"), r"^(\d+)-(\d+)$", 1).cast("int")
    ).withColumn(
        "mileage_end", 
        regexp_extract(col("Kilométrage_clean"), r"^(\d+)-(\d+)$", 2).cast("int")
    ).withColumn(
        "range_avg",
        ((col("mileage_start") + col("mileage_end")) / 2).cast("int")
    ).withColumn(
        "simple_mileage",
        when(col("Kilométrage_clean").rlike("^\\d+$"),
             col("Kilométrage_clean").cast("int"))
    ).withColumn(
        "Kilométrage",
        coalesce(col("range_avg"), col("simple_mileage"))
    ).drop("mileage_start", "mileage_end", "range_avg", "simple_mileage", "Kilométrage_clean")
    
    # Add sanity checks
    avito_clean = avito_clean.withColumn(
        "Kilométrage",
        when(col("Kilométrage").between(-1, 100000000), col("Kilométrage"))
        .otherwise(None)
    )
    
    # Clean fiscal power column
    avito_clean = clean_puissance_fiscale(avito_clean, is_avito=True)
    
    # Clean number of doors column
    avito_clean = avito_clean.withColumn(
        "Nombre de portes",
        when(col("Nombre de portes").isNull() | col("Nombre de portes").isin(["N/A", "", "NULL"]), None)
        .otherwise(trim(col("Nombre de portes").cast("string")))
    ).withColumn(
        "Nombre de portes",
        when(col("Nombre de portes").isNotNull(),
            floor(col("Nombre de portes").cast("float")).cast("int")
        ).otherwise(None)
    ).withColumn(
        "Nombre de portes",
        when(col("Nombre de portes").isNotNull() & col("Nombre de portes").between(2, 5),
            col("Nombre de portes")
        ).otherwise(None)
    )

    # Debug raw, intermediate, and cleaned values
    print("Raw Nombre de portes values (Avito):")
    avito_df.select("Nombre de portes").show(5, truncate=False)
    print("Intermediate Nombre de portes values (after float conversion) (Avito):")
    avito_clean.select("Nombre de portes").show(5, truncate=False, vertical=True)
    print("Cleaned Nombre de portes values (Avito):")
    avito_clean.select("Nombre de portes").show(5, truncate=False)
    
    # Clean sector column
    avito_clean = avito_clean.withColumn(
        "Secteur",
        trim(regexp_extract(col("Secteur"), r",\s*([A-Za-zÀ-ÿ\s]+)$", 1))
    ).withColumn(
        "Secteur",
        when(
            (col("Secteur").isNull()) | (F.trim(col("Secteur")) == "") | (col("Secteur") == "N/A"),
            "Unknown"
        ).otherwise(F.trim(col("Secteur")))
    ).withColumn(
        "Secteur",
        F.when(col("Secteur").isin(["Fès", "Fes"]), "Fes")
        .when(col("Secteur").isin(["Kenitra", "Kénitra"]), "Kenitra")
        .when(col("Secteur").isin(["Meknes", "Meknès"]), "Meknes")
        .when(col("Secteur").isin(["Sale", "Salé"]), "Sale")
        .when(col("Secteur").isin(["Tétouan", "Tetouan"]), "Tétouan")
        .when(col("Secteur").isin(["El jadida", "El Jadida"]), "El Jadida")
        .when(col("Secteur").isin(["Beni mellal", "Béni Mellal"]), "Beni Mellal")
        .when(col("Secteur").isin(["Laayoune", "Laâyoune"]), "Laayoune")
        .when(col("Secteur").isin(["Al hoceima", "Al Hoceima"]), "Al Hoceima")
        .when(col("Secteur").isin(["Benguerir", "Ben Guerir"]), "Ben Guerir")
        .when(col("Secteur").isin(["Sidi slimane", "Sidi Slimane"]), "Sidi Slimane")
        .when(col("Secteur").isin(["Sidi kacem", "Sidi Kacem"]), "Sidi Kacem")
        .when(col("Secteur").isin(["Khenifra", "Khénifra"]), "Khenifra")
        .when(col("Secteur").isin(["Kelaa sraghna", "El Kelâa des Sraghna"]), "El Kelaa des Sraghna")
        .when(col("Secteur").isin(["Ben slimane", "Benslimane"]), "Benslimane")
        .when(col("Secteur").isin(["Tiflet", "Tifelt"]), "Tiflet")
        .when(col("Secteur").isin(["Fquih ben salah", "Fquih Ben Saleh"]), "Fquih Ben Saleh")
        .when(col("Secteur").isin(["Dar bouazza", "Dar Bouazza"]), "Dar Bouazza")
        .when(col("Secteur").isin(["Taroudant", "Taroudannt"]), "Taroudant")
        .when(col("Secteur").isin(["Had soualem", "Had Soualem"]), "Had Soualem")
        .when(col("Secteur").isin(["El hajeb", "El Hajeb"]), "El Hajeb")
        .when(col("Secteur").isin(["Autre"]), "Other")
        .otherwise(col("Secteur"))
    )
    
    # Clean brand column
    avito_clean = avito_clean.withColumn("Marque", lower(trim(col("Marque"))))
    
    # Clean first owner column
    avito_clean = avito_clean.withColumn(
        "Première main",
        when(
            (col("Première main") == "N/A") | (col("Première main") == "NULL"), 
            None
        ).otherwise(col("Première main"))
    )
    
    # Clean publication date
    avito_clean = avito_clean.withColumn(
        "Date de publication",
        standardize_date(col("Date de publication")).cast(StringType())
    )
    
    # Replace N/A values with null for all columns
    all_columns = avito_clean.columns
    for column in all_columns:
        avito_clean = avito_clean.withColumn(
            column,
            when(col(column) == "N/A", None)
            .otherwise(col(column))
        )
    
    # Create column name mapping (French to English)
    column_mapping = {
        "Puissance fiscale": "fiscal_power",
        "Kilométrage": "mileage",
        "Secteur": "sector",
        "Équipements": "equipment",
        "Ville du vendeur": "seller_city",
        "Prix": "price",
        "Marque": "brand",
        "Première main": "first_owner",
        "État": "condition",
        "Transmission": "transmission",
        "Origine": "origin",
        "Date de publication": "publication_date",
        "Année": "year",
        "Dossier d'images": "image_folder",
        "source": "source",
        "Titre": "title",
        "Type de carburant": "fuel_type",
        "Créateur": "creator",
        "Nombre de portes": "door_count",
        "Modèle": "model"
    }
    
    # Rename columns
    for french_name, english_name in column_mapping.items():
        if french_name in avito_clean.columns:
            avito_clean = avito_clean.withColumnRenamed(french_name, english_name)
    
    # Add UUID for Cassandra primary key
    final_df = avito_clean.withColumn("id", uuid_udf())
    
    # Write to Cassandra
    write_to_cassandra(final_df, batch_id, "Avito")

# Write to Cassandra function (unchanged)
def write_to_cassandra(df, batch_id, source_name):
    try:
        df.cache()
        print(f"Sample of cleaned {source_name} data:")
        df.show(3, truncate=False)
        print(f"DataFrame schema for {source_name}:")
        df.printSchema()
        print(f"door_count values before writing to Cassandra ({source_name}):")
        df.select("door_count").show(5, truncate=False)
        df.write \
            .format("org.apache.spark.sql.cassandra") \
            .mode("append") \
            .option("keyspace", "cars_keyspace") \
            .option("table", "cleaned_cars") \
            .option("spark.cassandra.output.consistency.level", "ONE") \
            .option("spark.cassandra.output.batch.size.rows", "100") \
            .save()
        record_count = df.count()
        print(f"✅ Successfully wrote {record_count} records from {source_name} to Cassandra (batch {batch_id})")
        verification_df = spark.read \
            .format("org.apache.spark.sql.cassandra") \
            .option("keyspace", "cars_keyspace") \
            .option("table", "cleaned_cars") \
            .load() \
            .filter(col("source") == source_name) \
            .select("id", "door_count", "brand", "model")
        print(f"Sample of data in Cassandra for {source_name} (batch {batch_id}):")
        verification_df.show(5, truncate=False)
        df.unpersist()
    except Exception as e:
        print(f"❌ Error writing {source_name} data to Cassandra (batch {batch_id}): {str(e)}")
        import traceback
        traceback.print_exc()

# Read from Kafka - Moteur Source
moteur_stream = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "moteur_cars") \
    .option("startingOffsets", "latest") \
    .option("failOnDataLoss", "false") \
    .load() \
    .selectExpr("CAST(value AS STRING) as json_value") \
    .select(from_json(col("json_value"), moteur_schema).alias("data")) \
    .select("data.*")

# Read from Kafka - Avito Source
avito_stream = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "avito_cars") \
    .option("startingOffsets", "latest") \
    .option("failOnDataLoss", "false") \
    .load() \
    .selectExpr("CAST(value AS STRING) as json_value") \
    .select(from_json(col("json_value"), avito_schema).alias("data")) \
    .select("data.*")

# Start the Moteur stream processing
moteur_query = moteur_stream \
    .writeStream \
    .foreachBatch(process_moteur_batch) \
    .outputMode("update") \
    .trigger(processingTime="5 seconds") \
    .option("checkpointLocation", "/tmp/checkpoint_spark/moteur_cars_processing") \
    .start()

# Start the Avito stream processing
avito_query = avito_stream \
    .writeStream \
    .foreachBatch(process_avito_batch) \
    .outputMode("update") \
    .trigger(processingTime="5 seconds") \
    .option("checkpointLocation", "/tmp/checkpoint_spark/avito_cars_processing") \
    .start()

print("✅ Stream processing started for both Moteur and Avito sources. Waiting for data from Kafka...")

# Wait for termination of both streams
spark.streams.awaitAnyTermination()