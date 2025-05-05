# Quick Setup Guide for `cars_keyspace` Database

This guide explains how to set up the `cars_keyspace` database in Cassandra using the files in `~/projects/cars_recommandation_pipeline/documentaions/database`.

## Files

- `create_cars_keyspace.cql`: Creates the database structure.
- `import_data.py`: Imports data from CSV files.
- CSV files:
    - `car_views_by_user.csv`
    - `cleaned_cars.csv`
    - `favorite_cars_by_user.csv`
    - `user_preferences.csv`
    - `user_searches.csv`
    - `user_similarities.csv`
    - `users.csv`

## Steps

1. **Create Database Structure**
    
    - Run:
        
        ```bash
        cqlsh -f create_cars_keyspace.cql
        ```
        
    - This creates the `cars_keyspace` keyspace and 8 tables (`car_views_by_user`, `cleaned_cars`, etc.).
    - Verify in `cqlsh`:
        
        ```sql
        DESCRIBE KEYSPACE cars_keyspace;
        ```
        
        Should list 8 tables.
2. **Check `import_data.py`**
    
    - Open: `nano import_data.py`
    - Ensure:
        
        ```python
        CSV_DIR = '/home/hamzabji/projects/cars_recommandation_pipeline/documentaions/database/'
        CASSANDRA_HOST = ['127.0.0.1']
        ```
        
    - Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).
    - Verify CSV files:
        
        ```bash
        ls *.csv
        ```
        
        Should see: `car_views_by_user.csv`, `cleaned_cars.csv`, `favorite_cars_by_user.csv`, `user_preferences.csv`, `user_searches.csv`, `user_similarities.csv`, `users.csv`.
3. **Import Data**
    
    - Run:
        
        ```bash
        python import_data.py
        ```
        
    - Expected output:
        
        ```
        Imported 47 rows into car_views_by_user.
        Imported 35 rows into cleaned_cars.
        Imported 35 rows into favorite_cars_by_user.
        Imported 8 rows into user_preferences.
        Imported 8 rows into user_searches.
        Imported 14 rows into user_similarities.
        Imported 8 rows into users.
        ```
        
        Note: `user_recommendations` is skipped (no CSV).
4. **Verify Data**
    
    - In `cqlsh`:
        
        ```sql
        SELECT COUNT(*) FROM cars_keyspace.car_views_by_user;  -- 47
        SELECT COUNT(*) FROM cars_keyspace.cleaned_cars;      -- 35
        SELECT COUNT(*) FROM cars_keyspace.favorite_cars_by_user; -- 35
        SELECT COUNT(*) FROM cars_keyspace.user_preferences;  -- 8
        SELECT COUNT(*) FROM cars_keyspace.user_recommendations; -- 0
        SELECT COUNT(*) FROM cars_keyspace.user_searches;     -- 8
        SELECT COUNT(*) FROM cars_keyspace.user_similarities; -- 14
        SELECT COUNT(*) FROM cars_keyspace.users;             -- 8
        ```
        
    - Spot-check:
        
        ```sql
        SELECT * FROM cars_keyspace.cleaned_cars LIMIT 5;
        ```
        

## Troubleshooting

- **CQL Script Fails**:
    - Ensure Cassandra is running: `nodetool status`.
    - Try: `cqlsh localhost 9042 -f create_cars_keyspace.cql`.
- **Python Script Errors**:
    - **File not found**: Check `CSV_DIR` and CSV files (`ls *.csv`).
    - **Connection error**: Verify `CASSANDRA_HOST` and Cassandra status.
    - **Type error**: Check CSV data (e.g., `head cleaned_cars.csv` for valid UUIDs).
- **No Rows Imported**:
    - Check CSV sizes: `wc -l *.csv`.
    - Ensure CSV headers match `import_data.py` columns.
- **Errors**: Share error message or CSV snippet for help.

## Notes

- `user_recommendations.csv` is missing (empty table, OK to skip).
- Ensure `cassandra-driver` and `pandas` are installed:
    
    ```bash
    pip install cassandra-driver pandas
    ```
    
- Refer to this file for guidance during setup.







# Apache Cassandra Setup Commands

A step-by-step guide to install and configure Apache Cassandra 4.1.3 on Ubuntu.

## 1. Java Installation

```bash
sudo apt update
sudo apt install -y openjdk-8-jdk
````

## 2. Cassandra Setup

```bash
wget https://archive.apache.org/dist/cassandra/4.1.3/apache-cassandra-4.1.3-bin.tar.gz

tar -xvzf apache-cassandra-4.1.3-bin.tar.gz
```

## 3. Environment Configuration

1. Locate the installation directory (update path if needed):

   ```bash
   find ~/ -name "apache-cassandra*" -type d
   ```

2. Configure environment variables (replace `/path/to/` with the actual path):

   ```bash
   export CASSANDRA_HOME=/path/to/apache-cassandra-4.1.3
   export PATH="$PATH:$CASSANDRA_HOME/bin"
   ```

## 4. Service Initialization

```bash
$CASSANDRA_HOME/bin/cassandra -R
```

> Use the `-R` flag to run Cassandra with elevated privileges.

## 5. Verification

```bash
nodetool status
```

> Verify the node status with `nodetool status`.

## 6. cqlsh Configuration

### 6.1 Python Environment Setup

```bash
sudo apt install -y python3-venv python3-full
python3 -m venv ~/cassandra-venv
source ~/cassandra-venv/bin/activate
```

### 6.2 Dependency Installation

```bash
pip install six cassandra-driver

```

### 6.3 Driver Management

Disable the internal-only driver to avoid conflicts:

```bash
mv $CASSANDRA_HOME/lib/cassandra-driver-internal-only-3.25.0.zip \
   $CASSANDRA_HOME/lib/cassandra-driver-internal-only-3.25.0.zip.disabled
```

### 6.4 Launch cqlsh

```bash
$CASSANDRA_HOME/bin/cqlsh
```

---

**Key Notes:**

* Use `-R` flag when starting Cassandra to run under the Cassandra user with appropriate permissions.
* Backslashes (`\`) indicate line continuation in bash commands.
* Ensure you replace `/path/to/` with your actual Cassandra installation directory.
* The Python virtual environment helps avoid dependency conflicts when using `cqlsh` and the Cassandra Python driver.

```
```

