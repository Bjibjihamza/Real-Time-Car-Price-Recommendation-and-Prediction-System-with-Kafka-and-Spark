# Car Recommendation Pipeline

## 1. Introduction

The **Car Recommendation Pipeline** is a full-stack, big data system designed to scrape, process, store, and recommend car listings with price predictions and personalized recommendations. It consists of a **frontend** (React application), a **backend** (Node.js/Express API), and a **big data pipeline** (using Apache Kafka, Spark, Cassandra, and Airflow). The system integrates web scraping, data streaming, processing, synthetic data generation, recommendation algorithms, and a neural network-based price prediction model to provide a seamless user experience.

**Key Features**:

- **Frontend**: User authentication, car search, price prediction, visualizations, car listing creation, and personalized recommendation display.
- **Backend**: RESTful API handling authentication, car data, searches, predictions, and recommendations, integrated with Apache Cassandra and a Flask-based ML service.
- **Big Data Pipeline**: Scrapes car listings from Avito and Moteur, streams data via Kafka, processes it with Spark, stores it in Cassandra, generates synthetic user data, provides recommendations and price predictions, and automates scraping with Airflow.
- **Integration**: Frontend communicates with the backend at `http://localhost:5000`; backend queries `cars_keyspace`, runs recommendation scripts, and calls the ML service at `http://localhost:5001/predict`.

This documentation covers setup, structure, API integration, data pipeline, execution, and troubleshooting.

## 2. Environment Setup

### 2.1 Prerequisites

- **Operating System**: Ubuntu
- **Node.js**: v18.x or later
- **Conda**: Environment `cenv` (Python 3.10) for most components; `venv` (Python 3.12) for Airflow
- **Apache Cassandra**: v4.1.3 in `~/cassandra` with `cars_keyspace`
- **Apache Kafka**: v3.9.0 in `~/kafka`
- **Apache Spark**: v3.5.0 in `/opt/spark-3.5.0`
- **Apache Airflow**: v2.9.3 in `~/airflow` (for automating scraping scripts)
- **ML Service**: Running at `http://localhost:5001/predict`
- **Big Data Pipeline**: Populated `cleaned_cars` and synthetic user data

### 2.2 Install Conda Environments

1. **Install Conda**:
    
    ```bash
    wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
    bash Miniconda3-latest-Linux-x86_64.sh
    conda --version
    ```
    
2. **Create `cenv` (Python 3.10)**:
    
    ```bash
    conda create -n cenv python=3.10
    conda activate cenv
    ```
    
3. **Install `cenv` Dependencies**:
    
    ```bash
    pip install selenium==4.25.0 webdriver-manager==4.0.2 requests==2.32.3 pandas==2.2.3 kafka-python==2.0.2 pyspark==3.5.0 cassandra-driver==3.29.2 findspark==2.0.1 faker==30.8.0 bcrypt==4.2.0 scikit-learn==1.5.2 scipy==1.14.1 tensorflow==2.17.0 flask==3.0.3
    ```
    
4. **Create `venv` (Python 3.12) for Airflow**:
    
    ```bash
    conda create -n venv python=3.12
    conda activate venv
    ```
    
5. **Verify**:
    
    ```bash
    conda activate cenv
    python --version
    pip list
    conda activate venv
    python --version
    ```
    

### 2.3 Install Node.js

```bash
sudo apt-get update
sudo apt-get install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### 2.4 Apache Spark Setup

1. **Install Java**:
    
    ```bash
    sudo apt-get install -y openjdk-11-jdk
    echo 'export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64' >> ~/.bashrc
    source ~/.bashrc
    java -version
    ```
    
2. **Download Spark**:
    
    ```bash
    cd ~/Downloads
    wget https://archive.apache.org/dist/spark/spark-3.5.0/spark-3.5.0-bin-hadoop3.tgz
    tar -xzf spark-3.5.0-bin-hadoop3.tgz
    sudo mv spark-3.5.0-bin-hadoop3 /opt/spark-3.5.0
    ```
    
3. **Set Environment Variables**:
    
    ```bash
    echo 'export SPARK_HOME=/opt/spark-3.5.0' >> ~/.bashrc
    echo 'export PATH=$SPARK_HOME/bin:$PATH' >> ~/.bashrc
    echo 'export PYSPARK_PYTHON=python3' >> ~/.bashrc
    source ~/.bashrc
    ```
    
4. **Install Spark-Cassandra Connector**:
    
    ```bash
    wget https://repo1.maven.org/maven2/com/datastax/spark/spark-cassandra-connector_2.12/3.5.0/spark-cassandra-connector_2.12-3.5.0.jar -P /opt/spark-3.5.0/jars/
    ```
    
5. **Configure Spark**:
    
    ```bash
    echo 'spark.cassandra.connection.host=localhost' > /opt/spark-3.5.0/conf/spark-defaults.conf
    echo 'spark.cassandra.connection.port=9042' >> /opt/spark-3.5.0/conf/spark-defaults.conf
    echo 'spark.jars.packages=org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,com.datastax.spark:spark-cassandra-connector_2.12:3.5.0' >> /opt/spark-3.5.0/conf/spark-defaults.conf
    ```
    
6. **Verify**:
    
    ```bash
    /opt/spark-3.5.0/bin/spark-shell
    /opt/spark-3.5.0/bin/pyspark
    ```
    

### 2.5 Apache Cassandra Setup

1. **Uninstall Existing Cassandra (if needed)**:
    
    ```bash
    sudo systemctl stop cassandra
    sudo apt-get remove --purge cassandra cassandra-tools
    sudo rm -rf /var/lib/cassandra /var/log/cassandra /etc/cassandra
    ```
    
2. **Download and Extract**:
    
    ```bash
    cd ~
    wget https://archive.apache.org/dist/cassandra/4.1.3/apache-cassandra-4.1.3-bin.tar.gz
    tar -xzf apache-cassandra-4.1.3-bin.tar.gz
    mv apache-cassandra-4.1.3 cassandra
    ```
    
3. **Set Environment Variables**:
    
    ```bash
    echo 'export CASSANDRA_HOME=$HOME/cassandra' >> ~/.bashrc
    echo 'export PATH=$CASSANDRA_HOME/bin:$PATH' >> ~/.bashrc
    source ~/.bashrc
    ```
    
4. **Start Cassandra**:
    
    ```bash
    ~/cassandra/bin/cassandra -R
    ```
    
5. **Verify**:
    
    ```bash
    ~/cassandra/bin/cqlsh -e "SELECT release_version FROM system.local;"
    ```
    

### 2.6 Apache Kafka Setup

1. **Download and Extract**:
    
    ```bash
    cd ~
    wget https://downloads.apache.org/kafka/3.9.0/kafka_2.13-3.9.0.tgz
    rm -rf ~/kafka
    tar -xzf kafka_2.13-3.9.0.tgz
    mv kafka_2.13-3.9.0 ~/kafka
    ```
    
2. **Create Data Directories**:
    
    ```bash
    mkdir -p ~/kafka/data/kafka-logs ~/kafka/data/zookeeper
    chown -R $USER:$USER ~/kafka
    ```
    
3. **Configure ZooKeeper**:
    
    ```bash
    echo 'dataDir=/home/$USER/kafka/data/zookeeper' > ~/kafka/config/zookeeper.properties
    echo 'clientPort=2181' >> ~/kafka/config/zookeeper.properties
    echo 'maxClientCnxns=50' >> ~/kafka/config/zookeeper.properties
    echo 'admin.enableServer=false' >> ~/kafka/config/zookeeper.properties
    ```
    
4. **Configure Kafka**:
    
    ```bash
    echo 'broker.id=0' > ~/kafka/config/server.properties
    echo 'listeners=PLAINTEXT://0.0.0.0:9092' >> ~/kafka/config/server.properties
    echo 'advertised.listeners=PLAINTEXT://localhost:9092' >> ~/kafka/config/server.properties
    echo 'num.partitions=1' >> ~/kafka/config/server.properties
    echo 'default.replication.factor=1' >> ~/kafka/config/server.properties
    echo 'log.dirs=/home/$USER/kafka/data/kafka-logs' >> ~/kafka/config/server.properties
    echo 'zookeeper.connect=localhost:2181' >> ~/kafka/config/server.properties
    ```
    
5. **Start ZooKeeper and Kafka**:
    
    ```bash
    ~/kafka/bin/zookeeper-server-start.sh -daemon ~/kafka/config/zookeeper.properties
    ~/kafka/bin/kafka-server-start.sh -daemon ~/kafka/config/server.properties
    ```
    
6. **Create Topics**:
    
    ```bash
    ~/kafka/bin/kafka-topics.sh --create --topic avito_cars --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
    ~/kafka/bin/kafka-topics.sh --create --topic moteur_cars --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
    ```
    
7. **Verify**:
    
    ```bash
    ~/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092
    ```
    

### 2.7 Apache Airflow Setup

1. **Activate `venv` Environment**:
    
    ```bash
    conda activate venv
    ```
    
2. **Install Airflow**:
    
    ```bash
    pip install apache-airflow==2.9.3 --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-2.9.3/constraints-3.8.txt"
    ```
    
3. **Set Airflow Home Directory**:
    
    ```bash
    export AIRFLOW_HOME=~/airflow
    echo 'export AIRFLOW_HOME=~/airflow' >> ~/.bashrc
    source ~/.bashrc
    ```
    
4. **Initialize Airflow Database**:
    
    ```bash
    airflow db init
    ```
    
5. **Create Admin User**:
    
    ```bash
    airflow users create \
        --username admin \
        --firstname Admin \
        --lastname User \
        --role Admin \
        --email admin@example.com
    ```
    
    - Enter a password when prompted.
6. **Start Airflow Services**:
    - **Webserver** (in one terminal):
        
        ```bash
        conda activate venv
        airflow webserver --port 8080
        ```
        
    - **Scheduler** (in another terminal):
        
        ```bash
        conda activate venv
        airflow scheduler
        ```
        
7. **Verify**:
    - Access `http://localhost:8080` and log in with admin credentials.
    - Check database: `ls ~/airflow/airflow.db`
8. **Optional: Disable Example DAGs**:
    
    ```bash
    sed -i 's/load_examples = True/load_examples = False/' ~/airflow/airflow.cfg
    ```
    

### 2.8 Frontend Setup

1. **Navigate to Directory**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/nextride
    ```
    
2. **Install Dependencies**:
    
    ```bash
    npm install
    ```
    
    - Installs: `react`, `react-dom`, `react-router-dom`, `axios`, `react-icons`, `@mui/material`, `bootstrap`, `@testing-library/react`
3. **Configure `.env`**:
    
    ```bash
    echo "REACT_APP_API_URL=http://localhost:5000" > .env
    ```
    
4. **Verify**:
    
    ```bash
    ls node_modules
    cat .env
    ```
    

### 2.9 Backend Setup

1. **Navigate to Directory**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/backend
    ```
    
2. **Install Dependencies**:
    
    ```bash
    npm install
    ```
    
    - Installs: `express`, `cassandra-driver`, `jsonwebtoken`, `multer`, `cors`, `axios`, `bcryptjs`, `dotenv`
3. **Configure `.env`**:
    
    ```bash
    nano .env
    ```
    
    Add:
    
    ```
    PORT=5000
    CASSANDRA_CONTACT_POINT=localhost
    CASSANDRA_LOCAL_DATACENTER=datacenter1
    CASSANDRA_KEYSPACE=cars_keyspace
    ML_SERVICE_URL=http://localhost:5001/predict
    JWT_SECRET=6fe82de7e68594254e7e01f1960668925cb54b4ea60ac612ea9f403615842986
    ```
    
4. **Verify**:
    
    ```bash
    ls node_modules
    cat .env
    ```
    

### 2.10 ML Service Setup

1. **Navigate to Directory**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/prediction
    ```
    
2. **Ensure Artifacts**:
    
    ```bash
    ls improved_final_model.h5 feature_scaler.pkl target_scaler.pkl categorical_mappings.pkl
    ```
    
3. **Run ML Service**:
    
    ```bash
    conda activate cenv
    python ml_service.py
    ```
    
4. **Verify**:
    
    ```bash
    curl http://localhost:5001/predict
    ```
    

## 3. Airflow Installation and Configuration

### 3.1 Overview

Apache Airflow (v2.9.3) is used to automate the execution of scraping scripts (`moteur_scraper.py`, `avito_scraper.py`) in `~/projects/cars_recommandation_pipeline/scraping`. Airflow is installed in a separate Conda environment (`venv`, Python 3.12) to avoid dependency conflicts with the main pipeline (`cenv`, Python 3.10).

### 3.2 Prerequisites

- **Conda Environment**: `venv` (Python 3.12)
- **Scripts**: `moteur_scraper.py`, `avito_scraper.py` in `~/projects/cars_recommandation_pipeline/scraping`
- **Airflow Home**: `~/airflow`

### 3.3 Installation Steps

1. **Activate `venv`**:
    
    ```bash
    conda activate venv
    ```
    
2. **Install Airflow**:
    
    ```bash
    pip install apache-airflow==2.9.3 --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-2.9.3/constraints-3.8.txt"
    ```
    
    - Uses Python 3.8 constraints as a fallback for compatibility with Python 3.12.
3. **Set Airflow Home**:
    
    ```bash
    export AIRFLOW_HOME=~/airflow
    echo 'export AIRFLOW_HOME=~/airflow' >> ~/.bashrc
    source ~/.bashrc
    ```
    
4. **Initialize Database**:
    
    ```bash
    airflow db init
    ```
    
    - Creates SQLite database at `~/airflow/airflow.db`.
    - Note: SQLite is used for testing; use PostgreSQL/MySQL for production.
5. **Create Admin User**:
    
    ```bash
    airflow users create \
        --username admin \
        --firstname Admin \
        --lastname User \
        --role Admin \
        --email admin@example.com
    ```
    
    - Enter a password when prompted.
6. **Start Airflow Services**:
    - **Webserver**:
        
        ```bash
        conda activate venv
        airflow webserver --port 8080
        ```
        
    - **Scheduler**:
        
        ```bash
        conda activate venv
        airflow scheduler
        ```
        
7. **Verify**:
    - Access web UI at `http://localhost:8080`.
    - Log in with admin credentials.
    - Check database: `ls ~/airflow/airflow.db`.

### 3.4 Notes

- **Warnings**:
    - `db init` is deprecated; future versions should use `airflow db migrate` and `airflow connections create-default-connections`.
    - Example DAG warnings (`virtualenv`, `kubernetes`) can be ignored or suppressed by setting `load_examples = False` in `~/airflow/airflow.cfg`.
    - SQLite warning: Not suitable for production; consider PostgreSQL/MySQL.
    - Cryptography warning: Set a Fernet key in `airflow.cfg` for encryption in production.
- **Dependencies**: Compatible with `yarl==1.9.4`, `zipp==3.19.2`.
- **DAG Creation**: Place a custom DAG in `~/airflow/dags` to automate `moteur_scraper.py` and `avito_scraper.py`.

## 4. Database Configuration

### 4.1 Cassandra Keyspace

```sql
CREATE KEYSPACE IF NOT EXISTS cars_keyspace
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'} AND durable_writes = true;
```

### 4.2 Cassandra Tables

#### `cleaned_cars`

Stores processed car listings.

```sql
CREATE TABLE cars_keyspace.cleaned_cars (
    id uuid PRIMARY KEY,
    brand text,
    condition text,
    creator text,
    door_count int,
    equipment text,
    first_owner text,
    fiscal_power int,
    fuel_type text,
    image_folder text,
    mileage int,
    model text,
    origin text,
    price int,
    publication_date text,
    sector text,
    seller_city text,
    source text,
    title text,
    transmission text,
    year int
) WITH additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';

CREATE INDEX cleaned_cars_brand_idx ON cars_keyspace.cleaned_cars (brand);
CREATE INDEX cleaned_cars_door_count_idx ON cars_keyspace.cleaned_cars (door_count);
CREATE INDEX cleaned_cars_fuel_type_idx ON cars_keyspace.cleaned_cars (fuel_type);
CREATE INDEX cleaned_cars_mileage_idx ON cars_keyspace.cleaned_cars (mileage);
CREATE INDEX cleaned_cars_price_idx ON cars_keyspace.cleaned_cars (price);
CREATE INDEX cleaned_cars_publication_date ON cars_keyspace.cleaned_cars (publication_date);
CREATE INDEX cleaned_cars_transmission_idx ON cars_keyspace.cleaned_cars (transmission);
CREATE INDEX cleaned_cars_year_idx ON cars_keyspace.cleaned_cars (year);
```

#### `users`

Stores user profiles.

```sql
CREATE TABLE cars_keyspace.users (
    user_id uuid PRIMARY KEY,
    age int,
    created_at timestamp,
    email text,
    location text,
    password text,
    username text
) WITH additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

#### `user_preferences`

Stores user car preferences.

```sql
CREATE TABLE cars_keyspace.user_preferences (
    user_id uuid PRIMARY KEY,
    budget_max int,
    budget_min int,
    last_updated timestamp,
    mileage_max int,
    mileage_min int,
    preferred_brands set<text>,
    preferred_door_count set<int>,
    preferred_fuel_types set<text>,
    preferred_transmissions set<text>,
    preferred_years set<int>
) WITH additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

#### `car_views_by_user`

Tracks user car view interactions.

```sql
CREATE TABLE cars_keyspace.car_views_by_user (
    user_id uuid,
    view_date date,
    view_timestamp timestamp,
    car_id uuid,
    view_duration_seconds int,
    view_source text,
    PRIMARY KEY ((user_id, view_date), view_timestamp)
) WITH CLUSTERING ORDER BY (view_timestamp DESC)
    AND additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';

CREATE INDEX car_views_by_user_user_id_idx ON cars_keyspace.car_views_by_user (user_id);
CREATE INDEX car_views_by_user_view_timestamp_idx ON cars_keyspace.car_views_by_user (view_timestamp);
```

#### `favorite_cars_by_user`

Stores user favorite cars.

```sql
CREATE TABLE cars_keyspace.favorite_cars_by_user (
    user_id uuid,
    added_date date,
    added_timestamp timestamp,
    car_id uuid,
    PRIMARY KEY ((user_id, added_date), added_timestamp)
) WITH CLUSTERING ORDER BY (added_timestamp DESC)
    AND additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';

CREATE INDEX favorite_cars_by_user_added_timestamp_idx ON cars_keyspace.favorite_cars_by_user (added_timestamp);
CREATE INDEX favorite_cars_by_user_car_id_idx ON cars_keyspace.favorite_cars_by_user (car_id);
CREATE INDEX favorite_cars_by_user_user_id_idx ON cars_keyspace.favorite_cars_by_user (user_id);
```

#### `user_searches`

Stores user search queries and filters.

```sql
CREATE TABLE cars_keyspace.user_searches (
    user_id uuid,
    search_date date,
    search_timestamp timestamp,
    result_count int,
    search_query text,
    filters map<text, text>,
    PRIMARY KEY ((user_id, search_date), search_timestamp)
) WITH CLUSTERING ORDER BY (search_timestamp DESC)
    AND additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';

CREATE INDEX user_searches_user_id_idx ON cars_keyspace.user_searches (user_id);
```

#### `user_recommendations`

Stores precomputed car recommendations.

```sql
CREATE TABLE cars_keyspace.user_recommendations (
    user_id uuid,
    car_id uuid,
    created_at timestamp,
    method text,
    rank int,
    recommendation_reason text,
    similarity_score float,
    PRIMARY KEY (user_id, car_id)
) WITH CLUSTERING ORDER BY (car_id ASC)
    AND additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

#### `car_predictions`

Stores price predictions.

```sql
CREATE TABLE cars_keyspace.car_predictions (
    prediction_id uuid,
    user_id text,
    prediction_timestamp timestamp,
    car_features text,
    predicted_price float,
    PRIMARY KEY (prediction_id, user_id, prediction_timestamp)
) WITH CLUSTERING ORDER BY (user_id ASC, prediction_timestamp DESC)
    AND additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

### 4.3 Schema Explanation

- **`cleaned_cars`**: Stores car listings with attributes like `brand`, `price`, `source`. Indexed for efficient queries.
- **`users`**: Stores user data (e.g., `username`, hashed `password`).
- **`user_preferences`**: Stores preferences (e.g., `preferred_brands`, `budget_min/max`) using `set` for multi-valued fields.
- **`car_views_by_user`**: Tracks views, partitioned by `user_id` and `view_date`.
- **`favorite_cars_by_user`**: Stores favorites, partitioned by `user_id` and `added_date`.
- **`user_searches`**: Stores searches, partitioned by `user_id` and `search_date`.
- **`user_recommendations`**: Stores recommendations with `similarity_score`, `recommendation_reason`, `method`, and `rank`.
- **`car_predictions`**: Stores price predictions with `car_features` as text (JSON string) and `predicted_price`.

### 4.4 Create and Verify Schema

1. **Create Schema**:
    
    ```bash
    nano ~/projects/cars_recommandation_pipeline/recreate_cars_keyspace.cql
    ```
    
    Paste the CQL commands above, then run:
    
    ```bash
    ~/cassandra/bin/cqlsh -f ~/projects/cars_recommandation_pipeline/recreate_cars_keyspace.cql
    ```
    
2. **Verify**:
    
    ```bash
    ~/cassandra/bin/cqlsh -e "DESCRIBE KEYSPACE cars_keyspace;"
    ```
    

## 5. System Architecture

### 5.1 Frontend Structure

- **Directory**: `~/projects/cars_recommandation_pipeline/nextride`
    - `build/`: Production build output
    - `public/`: Static assets (`index.html`, favicon)
    - `src/`:
        - `components/`: `Navbar.js`, `Hero.js`, `VehicleSection.js`, `BrandDistribution.js`, `CarBubbleChart.js`
        - `pages/`: `AddCarPage.js`, `CarDetailsPage.js`, `PredictionPage.js`, `SearchPage.js`, `VisualizationPage.js`, `auth/LoginPage.js`, `UserProfilePage.js`
        - `context/`: `AuthContext.js`
        - `assets/images/`: `bg.jpg`, `bg2.png`, `icon-1.png`
        - `App.js`, `App.css`, `index.js`
- **Dependencies**:
    - `react`, `react-dom`: Core libraries
    - `react-router-dom`: Routing
    - `axios`: API requests
    - `react-icons`, `@mui/material`, `bootstrap`: UI components
- **Key Files**:
    - `App.js`: Defines routes (`/`, `/search`, `/profile`, `/predict`)
    - `AuthContext.js`: Manages JWT tokens
    - `PredictionPage.js`: Collects car features, sends to `/api/prediction`
    - `UserProfilePage.js`, `VehicleSection.js`: Display recommendations

### 5.2 Backend Structure

- **Directory**: `~/projects/cars_recommandation_pipeline/backend`
    - `config/`: `db.js` (Cassandra client)
    - `controllers/`: `authController.js`, `carController.js`, `predictionController.js`, `searchController.js`, `userController.js`
    - `images/`: Car image storage
    - `middleware/`: `authMiddleware.js` (JWT verification)
    - `models/`: `Car.js`, `User.js`, `UserPreference.js`
    - `routes/`: `authRoutes.js`, `carRoutes.js`
    - `scripts/`: `combined_recommendations.py`
    - `prediction/`: `ml_service.py`, model artifacts
    - `server.js`, `.env`, `package.json`
- **Dependencies**:
    - `express`: Web framework
    - `cassandra-driver`: Cassandra client
    - `jsonwebtoken`, `bcryptjs`: Authentication
    - `multer`: File uploads
    - `cors`, `axios`, `dotenv`: Utilities
- **Key Files**:
    - `server.js`: Configures Express
    - `db.js`: Cassandra connection
    - `predictionController.js`: Calls ML service
    - `combined_recommendations.py`: Generates recommendations

### 5.3 Big Data Pipeline

- **Scraping**: `avito_scraper.py`, `moteur_scraper.py` (in `scraping/`)
- **Kafka**: Streams data to `avito_cars`, `moteur_cars`
- **Spark**: `spark_cleaning.py` processes data, stores in `cleaned_cars`
- **Airflow**: Automates execution of `avito_scraper.py`, `moteur_scraper.py`
- **Synthetic Data**: `users.py`, `user_preferences.py`, `car_views_by_user.py`, `favorite_cars.py`, `user_searches.py` (in `data_generator/`)
- **Recommendation**: `combined_recommendations.py` (user-based, item-based, content-based, hybrid filtering)
- **Price Prediction**: `model.py` (training), `ml_service.py` (Flask API), artifacts (`improved_final_model.h5`, `feature_scaler.pkl`, `target_scaler.pkl`, `categorical_mappings.pkl`)

## 6. API Integration

The frontend communicates with the backend API at `http://localhost:5000` using `axios`. The backend queries `cars_keyspace`, runs `combined_recommendations.py`, and calls the ML service.

### 6.1 API Endpoints

|Endpoint|Method|Frontend Page|Purpose|
|---|---|---|---|
|`/api/auth/login`|POST|`LoginPage`|Authenticate user|
|`/api/auth/register`|POST|`SignupPage`|Register user|
|`/api/users`|GET/PUT|`UserProfilePage`|Get/update profile|
|`/api/users/preferences`|GET/PUT|`UserProfilePage`|Get/update preferences|
|`/api/users/favorites`|GET/POST/DELETE|`UserProfilePage`, `CarDetailsPage`|Manage favorites|
|`/api/users/recommendations`|GET|`UserProfilePage`, `VehicleSection`|Get recommendations|
|`/api/search`|POST|`SearchPage`|Search cars|
|`/api/cars/recently-viewed`|GET|`SearchPage`|Recently viewed cars|
|`/api/cars/:id`|GET|`CarDetailsPage`|Get car details|
|`/api/cars/view`|POST|`CarDetailsPage`|Log car view|
|`/api/cars`|POST|`AddCarPage`|Create car listing|
|`/api/prediction`|POST|`PredictionPage`|Predict price (calls ML service)|
|`/api/prediction/history`|GET|`PredictionPage`|Prediction history|
|`/api/cars/brands`|GET|`VisualizationPage`|Brand distribution|
|`/api/cars/bubbles`|GET|`VisualizationPage`|Bubble chart data|
|`/api/cars`, `/api/cars/latest`|GET|`VehicleSection`|Featured cars|

### 6.2 Authentication

- **Frontend**: `AuthContext.js` stores JWT token, adds `Authorization: Bearer <token>` header.
- **Backend**: `authController.js` handles login/register; `authMiddleware.js` verifies tokens.

### 6.3 Recommendation Integration

- **Backend**: `/api/users/recommendations` triggers `combined_recommendations.py`, retrieves results from `user_recommendations`.
- **Frontend**: `UserProfilePage.js`, `VehicleSection.js` display `car_id`, `similarity_score`, `recommendation_reason`.

### 6.4 Prediction Integration

- **Backend**: `/api/prediction` sends features to `http://localhost:5001/predict`, stores results in `car_predictions`.
- **Frontend**: `PredictionPage.js` collects features (e.g., `door_count`, `mileage`), displays `predicted_price`.
- **ML Service**: `ml_service.py` processes input, returns predicted price.

## 7. Data Ingestion and Processing

### 7.1 Overview

- **Scraping**: Collects listings from Avito (`avito_scraper.py`) and Moteur (`moteur_scraper.py`), automated via Airflow.
- **Kafka**: Streams data to `avito_cars`, `moteur_cars`.
- **Spark**: `spark_cleaning.py` cleans data, stores in `cleaned_cars`.

### 7.2 Execution

1. **Start Kafka, Cassandra, and Airflow**:
    
    ```bash
    ~/kafka/bin/zookeeper-server-start.sh -daemon ~/kafka/config/zookeeper.properties
    ~/kafka/bin/kafka-server-start.sh -daemon ~/kafka/config/server.properties
    ~/cassandra/bin/cassandra -R
    conda activate venv
    airflow scheduler
    airflow webserver --port 8080
    ```
    
2. **Run Scraping Scripts (Manual or via Airflow)**:
    - **Manual**:
        
        ```bash
        cd ~/projects/cars_recommandation_pipeline/scraping
        conda activate cenv
        python avito_scraper.py
        python moteur_scraper.py
        ```
        
    - **Airflow**: Create a DAG in `~/airflow/dags` to schedule `avito_scraper.py` and `moteur_scraper.py`.
3. **Run Spark Processing**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline
    /opt/spark-3.5.0/bin/spark-submit --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,com.datastax.spark:spark-cassandra-connector_2.12:3.5.0 spark_cleaning.py
    ```
    
4. **Verify**:
    
    ```bash
    ~/cassandra/bin/cqlsh -e "SELECT COUNT(*) FROM cars_keyspace.cleaned_cars;"
    ```
    

## 8. Synthetic Data Generation

### 8.1 Overview

Scripts in `~/projects/cars_recommandation_pipeline/data_generator` generate:

- `users.py`: User profiles
- `user_preferences.py`: Preferences
- `car_views_by_user.py`: View interactions
- `favorite_cars.py`: Favorite cars
- `user_searches.py`: Search queries

### 8.2 Execution

1. **Navigate to Directory**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/data_generator
    conda activate cenv
    ```
    
2. **Run Scripts**:
    
    ```bash
    python users.py
    python user_preferences.py
    python car_views_by_user.py
    python favorite_cars.py
    python user_searches.py
    ```
    
3. **Verify**:
    
    ```bash
    ~/cassandra/bin/cqlsh -e "SELECT COUNT(*) FROM cars_keyspace.users;"
    ```
    

## 9. Recommendation System

### 9.1 Overview

`combined_recommendations.py` generates recommendations using:

- User-based collaborative filtering
- Item-based collaborative filtering
- Content-based filtering
- Hybrid filtering (SVD, cosine similarity)  
    Results are stored in `user_recommendations`.

### 9.2 Execution

1. **Run Script**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/backend/scripts
    conda activate cenv
    python combined_recommendations.py <user_id>
    ```
    
2. **Verify**:
    
    ```bash
    ~/cassandra/bin/cqlsh -e "SELECT * FROM cars_keyspace.user_recommendations WHERE user_id = <user_id>;"
    ```
    

## 10. Price Prediction System

### 10.1 Overview

- **Training**: `model.py` trains a neural network on `preprocessed_data.csv`.
- **Serving**: `ml_service.py` provides a Flask API at `http://localhost:5001/predict`.
- **Artifacts**: `improved_final_model.h5`, `feature_scaler.pkl`, `target_scaler.pkl`, `categorical_mappings.pkl`.

### 10.2 Execution

1. **Train Model (Optional)**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/prediction
    conda activate cenv
    python model.py
    ```
    
2. **Run ML Service**:
    
    ```bash
    python ml_service.py
    ```
    
3. **Test Prediction**:
    
    ```bash
    curl -X POST http://localhost:5001/predict -H "Content-Type: application/json" -d '{"door_count": 4, "fiscal_power": 6, "mileage": 100000, "year": 2015, "publication_date": "11/05/2025 00:00", "equipment": "jantes aluminium, airbags, climatisation", "first_owner": "non", "brand": "toyota", "condition": "bon", "fuel_type": "diesel", "model": "corolla", "origin": "ww au maroc", "sector": "casablanca", "seller_city": "casablanca", "transmission": "manuelle"}'
    ```
    

## 11. Running the Application

1. **Start Services**:
    
    ```bash
    ~/cassandra/bin/cassandra -R
    ~/kafka/bin/zookeeper-server-start.sh -daemon ~/kafka/config/zookeeper.properties
    ~/kafka/bin/kafka-server-start.sh -daemon ~/kafka/config/server.properties
    conda activate venv
    airflow scheduler
    airflow webserver --port 8080
    cd ~/projects/cars_recommandation_pipeline/prediction
    conda activate cenv
    python ml_service.py
    ```
    
2. **Start Backend**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/backend
    npm install
    node server.js
    ```
    
3. **Start Frontend**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/nextride
    npm install
    npm start
    ```
    
    - Opens `http://localhost:3000`
4. **Build Frontend for Production**:
    
    ```bash
    npm run build
    npx serve -s build
    ```
    

## 12. Troubleshooting

- **Cassandra Errors**:
    - Verify: `netstat -tuln | grep 9042`
    - Fix `cqlsh`: `pip install cassandra-driver==3.29.2`
- **Kafka Errors**:
    - Check logs: `tail -f ~/kafka/logs/zookeeper.out`
    - Restart: `~/kafka/bin/kafka-server-stop.sh; ~/kafka/bin/zookeeper-server-stop.sh`
- **Spark Errors**:
    - Verify connector: `ls /opt/spark-3.5.0/jars/spark-cassandra-connector_2.12-3.5.0.jar`
    - Check logs: `tail -f /opt/spark-3.5.0/logs/*`
- **Airflow Errors**:
    - Verify services: `netstat -tuln | grep 8080`
    - Check logs: `tail -f ~/airflow/logs/*`
    - Fix warnings: Set `load_examples = False` in `~/airflow/airflow.cfg`
    - SQLite warning: Use PostgreSQL/MySQL for production
- **Frontend CORS Errors**:
    - Check `server.js` for CORS
    - Verify `REACT_APP_API_URL`
- **Recommendation Errors**:
    - Verify data: `cqlsh -e "SELECT COUNT(*) FROM cars_keyspace.car_views_by_user;"`
    - Check logs: `tail -f combined_recommendations.log`
    - Ensure dependencies: `pip install scikit-learn==1.5.2 scipy==1.14.1`
- **Prediction Errors**:
    - Verify ML service: `curl http://localhost:5001/predict`
    - Check logs: `tail -f ml_service.log`
    - Ensure dependencies: `pip install tensorflow==2.17.0 flask==3.0.3`

## 13. Next Steps

- **Airflow DAG**: Create a DAG in `~/airflow/dags` to schedule `avito_scraper.py` and `moteur_scraper.py`.
- **Testing**: Add Jest/Mocha tests for frontend and backend.
- **Deployment**: Use Docker or Vercel for production.
- **Enhancements**: Improve `PredictionPage.js` UI for feature input.
- **Monitoring**: Add logging for ML service and Airflow performance.