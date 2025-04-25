from pyspark.sql import SparkSession

# Create or get the current Spark session
spark = SparkSession.builder \
    .appName("CarDataCleaning") \
    .getOrCreate()

# Check if Spark is working by running a basic command
print(spark.version)

# Define file paths
avito_path = "C:/Users/yassir/Desktop/pyspark cleaning Data/avito.csv"
moteur_path = "C:/Users/yassir/Desktop/pyspark cleaning Data/moteurAZ.csv"

# Load the datasets into Spark DataFrames
avito_df = spark.read.option("header", "true").csv(avito_path)
moteur_df = spark.read.option("header", "true").csv(moteur_path)

# Print the schema of both datasets
avito_df.printSchema()
moteur_df.printSchema()

# Columns to drop from Avito
avito_drop_columns = [
    "ID",
    "Type de véhicule",

]

# Columns to drop from Moteur
moteur_drop_columns = [
    "ID",
    "Dédouané",
]

# Perform the drops
avito_clean = avito_df.drop(*avito_drop_columns)
moteur_clean = moteur_df.drop(*moteur_drop_columns)

from pyspark.sql.functions import col, when, lower, trim
from pyspark.sql import functions as F
# Define valid values for each column
valid_fuel_types = ["Diesel", "Essence", "Hybride", "N/A", None, "NULL"]
valid_transmissions = ["Manuelle", "Automatique", "N/A", None, "NULL"]

# Filter based on valid values only
moteur_clean = moteur_clean.filter(
    F.col("Type de carburant").isin(valid_fuel_types) & 
    F.col("Transmission").isin(valid_transmissions)
)

# Filter based on valid values only
avito_clean = avito_clean.filter(
    F.col("Type de carburant").isin(valid_fuel_types) & 
    F.col("Transmission").isin(valid_transmissions)
)

# Then standardize NULL and N/A values as before

# 1. Drop duplicates from both datasets
moteur_clean = moteur_clean.dropDuplicates()
avito_clean = avito_clean.dropDuplicates()
from pyspark.sql.functions import col, regexp_replace, when

# Price cleaning for avito_clean
avito_clean = avito_clean.withColumn(
    "Prix", 
    regexp_replace(col("Prix"), "[\u0020\u202F]", "")  # Remove both regular and non-breaking spaces
).withColumn(
    "Prix",
    regexp_replace(col("Prix"), "DH", "")  # Remove "DH"
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

# Price cleaning for moteur_clean
moteur_clean = moteur_clean.withColumn(
    "Prix",
    regexp_replace(col("Prix"), " ", "")  # Remove spaces
).withColumn(
    "Prix",
    regexp_replace(col("Prix"), "Dhs", "")  # Remove "Dhs"
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

from pyspark.sql.functions import col, when, regexp_replace

def clean_year_column(df):
    return (df
        # Step 1: Remove any whitespace and non-numeric characters
        .withColumn("Année", regexp_replace(col("Année"), "[^\\d]", ""))
        
        # Step 2: Validate as 4-digit numbers between 1900-2025
        .withColumn("Année",
            when(
                (col("Année").rlike("^\\d{4}$")) &
                (col("Année").cast("int").between(1900, 2025)),
                col("Année").cast("integer")
            ).otherwise(None)
        )
    )

# Apply cleaning to both DataFrames
avito_clean = clean_year_column(avito_clean)
moteur_clean = clean_year_column(moteur_clean)

# Verify results
print("Avito Year Distribution:")
avito_clean.groupBy("Année").count().orderBy("count", ascending=False).show(15, truncate=False)

print("\nMoteur Year Distribution:")
moteur_clean.groupBy("Année").count().orderBy("count", ascending=False).show(15, truncate=False)

print("\nNull Counts:")
print(f"Avito null years: {avito_clean.filter(col('Année').isNull()).count()}")
print(f"Moteur null years: {moteur_clean.filter(col('Année').isNull()).count()}")

from pyspark.sql.functions import col, when, lower

# 1) Normalize fuel types: only "Essence", "Diesel", "Hybride" remain, everything else becomes null
valid_fuels = ["essence", "diesel", "hybride"]

# Clean the fuel type in Avito
avito_clean = avito_clean.withColumn(
    "Type de carburant",
    when(lower(col("Type de carburant")).isin(*valid_fuels), lower(col("Type de carburant")))
    .otherwise(None)  # Anything else will be treated as null
)

# Clean the fuel type in Moteur
moteur_clean = moteur_clean.withColumn(
    "Type de carburant",
    when(lower(col("Type de carburant")).isin(*valid_fuels), lower(col("Type de carburant")))
    .otherwise(None)  # Anything else will be treated as null
)


# 3) Show the result
avito_clean.select("Type de carburant").show(10, truncate=False)
moteur_clean.select("Type de carburant").show(10, truncate=False)


from pyspark.sql.functions import col, regexp_replace

# Clean Moteur
moteur_clean = moteur_clean.withColumn(
    "Kilométrage",
    regexp_replace(col("Kilométrage"), " ", "").cast("integer")
).withColumn(
    "Kilométrage",
    when(col("Kilométrage") == "N/A", None)
     .otherwise(col("Kilométrage"))
)



from pyspark.sql.functions import col, regexp_replace, regexp_extract, coalesce, when

# First clean all space characters from Kilométrage
avito_clean = avito_clean.withColumn(
    "Kilométrage_clean",
    regexp_replace(col("Kilométrage"), " ", "")
)

# Process range values (format: "XXXXXX-XXXXXX")
avito_clean = avito_clean.withColumn(
    "mileage_start", 
    regexp_extract(col("Kilométrage_clean"), r"^(\d+)-(\d+)$", 1).cast("int")
).withColumn(
    "mileage_end", 
    regexp_extract(col("Kilométrage_clean"), r"^(\d+)-(\d+)$", 2).cast("int")
).withColumn(
    "range_avg",
    ((col("mileage_start") + col("mileage_end")) / 2).cast("int")
)

# Process single numeric values
avito_clean = avito_clean.withColumn(
    "simple_mileage",
    when(col("Kilométrage_clean").rlike("^\\d+$"),
         col("Kilométrage_clean").cast("int"))
)

# Combine results and clean up
avito_clean = avito_clean.withColumn(
    "Kilométrage",
    coalesce(col("range_avg"), col("simple_mileage"))
).drop("mileage_start", "mileage_end", "range_avg", "simple_mileage", "Kilométrage_clean")

# Add sanity checks
avito_clean = avito_clean.withColumn(
    "Kilométrage",
    when(col("Kilométrage").between(-1, 100000000), col("Kilométrage"))
    .otherwise(None)
)


from pyspark.sql.functions import col, regexp_replace, when

def clean_puissance_fiscale(df, is_avito=True):
    col_name = "Puissance fiscale"
    
    if is_avito:
        # Clean Avito-specific format
        df = df.withColumn(
            col_name,
            regexp_replace(col(col_name), r"(Plus de | CV|\s+)", "")  # Remove text and spaces
        ).withColumn(
            col_name,
            when(col(col_name).rlike("^\d+$"), col(col_name))
            .otherwise(None)
        )
    else:
        # Clean Moteur data
        df = df.withColumn(
            col_name,
            when(col(col_name) == "N/A", None)
            .otherwise(col(col_name))
        )
    
    # Common cleaning for both datasets
    return df.withColumn(
        col_name,
        col(col_name).cast("integer")
    ).withColumn(
        col_name,
        when((col(col_name) >= 3) & (col(col_name) <= 50), col(col_name))  # Validate reasonable range
        .otherwise(None)
    )

# Apply to datasets
avito_clean = clean_puissance_fiscale(avito_clean, is_avito=True)
moteur_clean = clean_puissance_fiscale(moteur_clean, is_avito=False)

# Verify results
print("Avito - Cleaned Puissance fiscale:")
avito_clean.groupBy("Puissance fiscale").count().orderBy("count", ascending=False).show(10)

print("\nMoteur - Cleaned Puissance fiscale:")
moteur_clean.groupBy("Puissance fiscale").count().orderBy("count", ascending=False).show(10)

from pyspark.sql.functions import col, trim, when

def clean_doors_simple(df):
    return df.withColumn(
        "Nombre de portes",
        when(trim(col("Nombre de portes")).rlike("^\\d+$"),  # Check if value is only digits
             trim(col("Nombre de portes")).cast("int"))       # Convert to integer
        .otherwise(None)                                      # Set everything else to null
    )

# Apply to both datasets
avito_clean = clean_doors_simple(avito_clean)
moteur_clean = clean_doors_simple(moteur_clean)

# Validate results
print("Avito Cleaned:")
avito_clean.groupBy("Nombre de portes").count().orderBy("count", ascending=False).show()

print("\nMoteur Cleaned:")
moteur_clean.groupBy("Nombre de portes").count().orderBy("count", ascending=False).show()


'''
from pyspark.sql.functions import col, when

# Apply range constraint (2-5 doors) PROPERLY
avito_clean = avito_clean.withColumn(
    "Nombre de portes",
    when(col("Nombre de portes").between(2, 5), col("Nombre de portes"))
    .otherwise(None)
)

moteur_clean = moteur_clean.withColumn(
    "Nombre de portes",
    when(col("Nombre de portes").between(2, 5), col("Nombre de portes"))
    .otherwise(None)
)

# Validate again
print("Final Avito Distribution:")
avito_clean.groupBy("Nombre de portes").count().orderBy("count", ascending=False).show()

print("\nFinal Moteur Distribution:")
moteur_clean.groupBy("Nombre de portes").count().orderBy("count", ascending=False).show()
'''


from pyspark.sql.functions import col, regexp_extract, trim

# Transform Secteur in place
avito_clean = avito_clean.withColumn(
    "Secteur",
    trim(regexp_extract(col("Secteur"), r",\s*([A-Za-zÀ-ÿ\s]+)$", 1))  # Updated regex
)

# Count occurrences
avito_city_counts = avito_df.groupBy("Secteur").count().orderBy("count", ascending=False)

# Filter out invalid values
avito_city_counts_filtered = avito_city_counts.filter(
    (col("Secteur") != "") & 
    (col("Secteur").isNotNull()) &
    (~col("Secteur").rlike("(?i)N/A|undefined|unknown"))
)


from pyspark.sql.functions import lower, trim, col

# Clean Marque in both datasets
avito_clean = avito_clean.withColumn("Marque", lower(trim(col("Marque"))))
moteur_clean = moteur_clean.withColumn("Marque", lower(trim(col("Marque"))))

# Verify results
print("Avito Marque Distribution:")
avito_clean.groupBy("Marque").count().orderBy("count", ascending=False).show(10, truncate=False)

print("\nMoteur Marque Distribution:")
moteur_clean.groupBy("Marque").count().orderBy("count", ascending=False).show(10, truncate=False)


# Verify results
print("Avito Marque Distribution:")
avito_clean.groupBy("Première main").count().orderBy("count", ascending=False).show(10, truncate=False)

print("\nMoteur Marque Distribution:")
moteur_clean.groupBy("Première main").count().orderBy("count", ascending=False).show(10, truncate=False)

# for moteur

moteur_clean = moteur_clean.withColumn(
        "Première main",
        F.when(F.col("Première main") == "N/A", "Non").otherwise(F.col("Première main"))
    )

# For Avito

avito_clean = avito_clean.withColumn(
        "Première main",
        F.when(
            (F.col("Première main") == "N/A") | (F.col("Première main") == "NULL"), 
            None
        ).otherwise(F.col("Première main"))
    )


# Verify results
print("Avito Marque Distribution:")
avito_clean.groupBy("Première main").count().orderBy("count", ascending=False).show(10, truncate=False)

print("\nMoteur Marque Distribution:")
moteur_clean.groupBy("Première main").count().orderBy("count", ascending=False).show(10, truncate=False)

from pyspark.sql.functions import lit, col

# 1. Add source identifier column
avito_final = avito_clean.withColumn("source", lit("avito"))
moteur_final = moteur_clean.withColumn("source", lit("moteur"))

# 2. Get all columns from both datasets (fixed parentheses)
all_columns = list(set(avito_final.columns).union(set(moteur_final.columns)))

# 3. Align columns with proper syntax (added * and fixed list comprehensions)
avito_aligned = avito_final.select(
    *[col(c) if c in avito_final.columns else lit(None).alias(c)  # Added *
    for c in all_columns]
)

moteur_aligned = moteur_final.select(
    *[col(c) if c in moteur_final.columns else lit(None).alias(c)  # Added *
    for c in all_columns]
)

# 4. Merge datasets
combined_df = avito_aligned.unionByName(moteur_aligned)

from pyspark.sql import functions as F

# Handle empty values first
combined_df = combined_df.withColumn(
    "Secteur", 
    F.when(
        (F.col("Secteur").isNull()) | (F.trim(F.col("Secteur")) == "") | (F.col("Secteur") == "N/A"), 
        "Unknown"
    ).otherwise(F.trim(F.col("Secteur")))
)

# Now standardize the values directly in the Secteur column
combined_df = combined_df.withColumn(
    "Secteur",
    F.when(F.col("Secteur").isin(["Fès", "Fes"]), "Fes")
    .when(F.col("Secteur").isin(["Kenitra", "Kénitra"]), "Kenitra")
    .when(F.col("Secteur").isin(["Meknes", "Meknès"]), "Meknes")
    .when(F.col("Secteur").isin(["Sale", "Salé"]), "Sale")
    .when(F.col("Secteur").isin(["Tétouan", "Tetouan"]), "Tetouan")
    .when(F.col("Secteur").isin(["El jadida", "El Jadida"]), "El Jadida")
    .when(F.col("Secteur").isin(["Beni mellal", "Béni Mellal"]), "Beni Mellal")
    .when(F.col("Secteur").isin(["Laayoune", "Laâyoune"]), "Laayoune")
    .when(F.col("Secteur").isin(["Al hoceima", "Al Hoceima"]), "Al Hoceima")
    .when(F.col("Secteur").isin(["Benguerir", "Ben Guerir"]), "Ben Guerir")
    .when(F.col("Secteur").isin(["Sidi slimane", "Sidi Slimane"]), "Sidi Slimane")
    .when(F.col("Secteur").isin(["Sidi kacem", "Sidi Kacem"]), "Sidi Kacem")
    .when(F.col("Secteur").isin(["Khenifra", "Khénifra"]), "Khenifra")
    .when(F.col("Secteur").isin(["Kelaa sraghna", "El Kelâa des Sraghna"]), "El Kelaa des Sraghna")
    .when(F.col("Secteur").isin(["Ben slimane", "Benslimane"]), "Benslimane")
    .when(F.col("Secteur").isin(["Tiflet", "Tifelt"]), "Tiflet")
    .when(F.col("Secteur").isin(["Fquih ben salah", "Fquih Ben Saleh"]), "Fquih Ben Saleh")
    .when(F.col("Secteur").isin(["Dar bouazza", "Dar Bouazza"]), "Dar Bouazza")
    .when(F.col("Secteur").isin(["Taroudant", "Taroudannt"]), "Taroudant")
    .when(F.col("Secteur").isin(["Had soualem", "Had Soualem"]), "Had Soualem")
    .when(F.col("Secteur").isin(["El hajeb", "El Hajeb"]), "El Hajeb")
    .when(F.col("Secteur").isin(["Autre"]), "Other")
    .otherwise(F.col("Secteur"))
)


from pyspark.sql import functions as F
from pyspark.sql.types import StringType

def standardize_date(date_col):
    trimmed_col = F.trim(date_col)
    
    return F.when(
        date_col.isNull(),  # Preserve original nulls
        F.lit(None)
    ).otherwise(
        F.when(
            F.to_timestamp(trimmed_col, "yyyy-MM-dd HH:mm:ss").isNotNull(),
            F.date_format(
                F.to_timestamp(trimmed_col, "yyyy-MM-dd HH:mm:ss"), 
                "dd/MM/yyyy HH:mm"
            )
        ).when(
            F.to_date(trimmed_col, "yyyy-MM-dd").isNotNull(),
            F.concat(
                F.date_format(F.to_date(trimmed_col, "yyyy-MM-dd"), "dd/MM/yyyy"),
                F.lit(" 00:00")
            )
        ).otherwise(F.lit(None))
    )

# Apply the transformation
combined_df = combined_df.withColumn(
    "Date de publication", 
    standardize_date(F.col("Date de publication")).cast(StringType())
)

# Verify results
print("Final Date Distribution:")
combined_df.select("Date de publication").show(20, truncate=False)

# 5. Verify results
print(f"Combined DataFrame count: {combined_df.count()}")
print("Schema after merging:")
combined_df.printSchema()



# 2. Create column name mapping (French to English)
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

# 3. Rename columns in the combined DataFrame
for french_name, english_name in column_mapping.items():
    combined_df = combined_df.withColumnRenamed(french_name, english_name)


print("Schema after merging:")
combined_df.printSchema()


# Get list of all columns in the DataFrame
all_columns = combined_df.columns

# Clean all columns in the DataFrame
for column in all_columns:
    combined_df = combined_df.withColumn(
        column,
        when(col(column) == "N/A", None)
        .otherwise(col(column))
)

from pyspark.sql.functions import col

# List of columns you want to process for the combined dataset
columns_to_check_combined = [
    "publication_date", "image_folder", "first_owner", "brand", 
    "condition", "year", "model",  
    "creator", "mileage", "price", "fuel_type", 
    "transmission", "sector", "door_count", "equipment", 
    "origin", "source", "fiscal_power"
]

# Loop through each column, group by and count occurrences for the combined DataFrame
for column in columns_to_check_combined:
    print(f"Counting occurrences for column: {column} in combined_df")
    df_column_counts = combined_df.groupBy(column).count().orderBy("count", ascending=False)
    df_column_counts.show(10)  # Show the top 10 most frequent occurrences for each column


# Define the desired column order
ordered_columns = [
    "title",
    "price",
    "publication_date",
    "year",
    "fuel_type",
    "transmission",
    "creator",
    "sector",
    "mileage",
    "brand",
    "model",
    "door_count",
    "origin",
    "first_owner",
    "fiscal_power",
    "condition",
    "equipment",
    "seller_city",
    "image_folder",
    "source"
]

# Reorder the DataFrame
combined_df = combined_df.select(*ordered_columns)

# Show new schema
combined_df.printSchema()