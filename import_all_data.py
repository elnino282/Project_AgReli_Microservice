import argparse
import ast
import mysql.connector
from datetime import date, datetime
import logging
import os
from pathlib import Path
import re

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DB_CONFIG = {
    'host': os.getenv('IMPORT_DB_HOST', 'localhost'),
    'port': int(os.getenv('IMPORT_DB_PORT', '3307')),
    'user': os.getenv('IMPORT_DB_USER', 'springuser'),
    'password': os.getenv('IMPORT_DB_PASSWORD', 'springpass')
}

# Các bảng kỹ thuật phải để trống sau reset. Seed các bảng này có thể làm publisher
# phát lại event, consumer bỏ qua event thật hoặc tạo token/idempotency giả.
TECHNICAL_EMPTY_TABLES = {
    ('admin_reporting_db', 'processed_events'),
    ('crop_catalog_db', 'outbox_events'),
    ('delivery_db', 'processed_events'),
    ('farm_db', 'outbox_events'),
    ('finance_db', 'outbox_events'),
    ('identity_db', 'invalidated_token'),
    ('identity_db', 'outbox_events'),
    ('identity_db', 'password_reset_tokens'),
    ('incident_db', 'outbox_events'),
    ('incident_db', 'processed_events'),
    ('inventory_db', 'outbox_events'),
    ('inventory_db', 'processed_events'),
    ('marketplace_db', 'idempotency_keys'),
    ('marketplace_db', 'outbox_events'),
    ('season_db', 'outbox_events'),
    ('sustainability_db', 'processed_events'),
}

# Identity bootstrap là nguồn sự thật cho account/role demo. reset_all_databases()
# chủ động không truncate các bảng này để không làm mất password hash/credential.
PRESERVED_TABLES = {
    ('identity_db', 'roles'),
    ('identity_db', 'user_preferences'),
    ('identity_db', 'user_roles'),
    ('identity_db', 'users'),
}

RESET_CONFIRMATION = 'RESET_ALL_SERVICE_DATA'
TEMPORARY_VALIDATION_MODE = False
EXPECTED_DATABASES = (
    'admin_reporting_db',
    'crop_catalog_db',
    'delivery_db',
    'farm_db',
    'finance_db',
    'identity_db',
    'incident_db',
    'inventory_db',
    'marketplace_db',
    'season_db',
    'sustainability_db',
)

# Các service nghiệp vụ chỉ lưu user_id, vì vậy bộ seed liên-service cần đúng
# identity bootstrap contract này. Nếu ID lệch, audit phải dừng trước khi reset.
REQUIRED_IDENTITY_USERS = {
    1: ('admin@acm.local', 'ADMIN'),
    2: ('farmer@acm.local', 'FARMER'),
    3: ('employee@acm.local', 'EMPLOYEE'),
    4: ('buyer@acm.local', 'BUYER'),
}

# VARCHAR columns này được JPA materialize thành enum. MySQL chấp nhận mọi chuỗi
# nếu không kiểm tra trước, nhưng Hibernate sẽ ném exception và làm FDN trả 500.
SEED_ENUM_DOMAINS = {
    ('sustainability_db', 'nutrient_input_events', 'input_source'): {
        'MINERAL_FERTILIZER',
        'ORGANIC_FERTILIZER',
        'BIOLOGICAL_FIXATION',
        'IRRIGATION_WATER',
        'ATMOSPHERIC_DEPOSITION',
        'SEED_IMPORT',
        'SOIL_LEGACY',
        'CONTROL_SUPPLY',
    },
    ('sustainability_db', 'nutrient_input_events', 'source_type'): {
        'USER_ENTERED',
        'LAB_MEASURED',
        'SYSTEM_ESTIMATED',
        'EXTERNAL_REFERENCE',
        'DEFAULT_REFERENCE',
    },
    ('sustainability_db', 'soil_tests', 'source_type'): {
        'USER_ENTERED',
        'LAB_MEASURED',
        'SYSTEM_ESTIMATED',
        'EXTERNAL_REFERENCE',
        'DEFAULT_REFERENCE',
    },
    ('sustainability_db', 'irrigation_water_analyses', 'source_type'): {
        'USER_ENTERED',
        'LAB_MEASURED',
        'SYSTEM_ESTIMATED',
        'EXTERNAL_REFERENCE',
        'DEFAULT_REFERENCE',
    },
    ('season_db', 'harvests', 'grade'): {
        'Premium',
        'A',
        'B',
        'C',
    },
    ('season_db', 'harvests', 'quality_grade'): {
        'PASSED',
        'SUBSTANDARD',
        'REJECTED',
    },
    ('season_db', 'harvests', 'sub_standard_disposition'): {
        'SELL_LIVESTOCK_FEED',
        'COMPOSTING',
        'PROCESSING',
        'DISCARDED',
        'SELL_DISCOUNT',
    },
    ('season_db', 'harvests', 'packaging_type'): {
        'NONE',
        'BULK_BAG',
        'CRATE',
        'CARTON_BOX',
        'VACUUM_SEALED',
        'NET_BAG',
    },
    ('season_db', 'harvests', 'processing_type'): {
        'NONE',
        'WASHED',
        'TRIMMED',
        'GRADED_AND_SORTED',
        'DRIED',
        'COOLED',
    },
    ('season_db', 'harvests', 'warehouse_receipt_status'): {
        'PENDING_RECEIPT',
        'RECEIVED',
    },
    ('season_db', 'disease_treatments', 'effectiveness'): {
        'UNKNOWN',
        'POOR',
        'FAIR',
        'GOOD',
        'EXCELLENT',
    },
}

# Kịch bản demo hiện hành (ngày báo cáo 2026-08-25): mùa vụ đã thu hoạch đủ
# kế hoạch nhưng vẫn ACTIVE. end_date chỉ được ghi khi Farmer xác nhận Complete.
SEED_SEASON_NAME = 'Vụ Hè Thu 2026 (Lúa Đài Thơm 8)'
SEED_SEASON_SHORT_NAME = 'Vụ Hè Thu 2026'
SEED_SEASON_CREATED_AT = datetime(2026, 4, 10, 8, 0)
SEED_SEASON_START_DATE = date(2026, 4, 20)
SEED_PLANNED_HARVEST_DATE = date(2026, 8, 20)
SEED_SEASON_END_DATE = None
SEED_SEASON_STATUS = 'ACTIVE'
SEED_HARVEST_DATE = date(2026, 8, 20)
SEED_HARVESTED_AT = datetime(2026, 8, 20, 17, 0)
SEED_WAREHOUSE_RECEIVED_AT = datetime(2026, 8, 21, 9, 0)
SEED_EXPECTED_YIELD_KG = 34500
SEED_ACTUAL_YIELD_KG = 34500

def get_connection(db_name=None):
    config = DB_CONFIG.copy()
    if db_name:
        config['database'] = db_name
    conn = mysql.connector.connect(**config)
    if db_name and TEMPORARY_VALIDATION_MODE:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = %s
              AND TABLE_TYPE = 'BASE TABLE'
              AND TABLE_NAME <> 'flyway_schema_history'
            ORDER BY TABLE_NAME
            """,
            (db_name,),
        )
        table_names = [row[0] for row in cursor.fetchall()]
        for table_name in table_names:
            temporary_name = f'__seed_validation_{table_name}'
            cursor.execute(
                f'CREATE TEMPORARY TABLE `{temporary_name}` LIKE `{db_name}`.`{table_name}`'
            )
            cursor.execute(f'ALTER TABLE `{temporary_name}` RENAME TO `{table_name}`')
        cursor.close()
    return conn


def _discover_seed_manifest():
    """Đọc chính file này để đối chiếu INSERT seed với schema Flyway đang chạy."""
    source = Path(__file__).read_text(encoding='utf-8')
    tree = ast.parse(source)
    manifest = {}

    for function in tree.body:
        if not isinstance(function, ast.FunctionDef):
            continue
        if not function.name.startswith('import_') or not function.name.endswith('_db'):
            continue

        db_name = function.name[len('import_'):]
        queries = {}
        datasets = {}
        for node in ast.walk(function):
            if not isinstance(node, ast.Assign):
                continue
            for target in node.targets:
                if not isinstance(target, ast.Name):
                    continue
                if target.id.startswith('query_') and isinstance(node.value, ast.Constant):
                    if isinstance(node.value.value, str):
                        queries[target.id] = node.value.value
                if target.id.startswith('data_') and isinstance(node.value, (ast.List, ast.Tuple)):
                    datasets[target.id] = node.value.elts

        for query_name, query in queries.items():
            match = re.search(
                r'INSERT\s+INTO\s+`([^`]+)`\s*\((.*?)\)\s*VALUES',
                query,
                re.IGNORECASE | re.DOTALL,
            )
            if not match:
                continue
            table_name = match.group(1)
            columns = re.findall(r'`([^`]+)`', match.group(2))
            data_name = f'data_{query_name[len("query_"):]}'
            rows = datasets.get(data_name, [])
            row_sizes = [len(row.elts) for row in rows if isinstance(row, (ast.Tuple, ast.List))]
            literal_values = {column: set() for column in columns}
            for row in rows:
                if not isinstance(row, (ast.Tuple, ast.List)):
                    continue
                for index, element in enumerate(row.elts[:len(columns)]):
                    if isinstance(element, ast.Constant) and isinstance(element.value, str):
                        literal_values[columns[index]].add(element.value)
            manifest[(db_name, table_name)] = {
                'columns': columns,
                'row_count': len(rows),
                'row_sizes': row_sizes,
                'placeholder_count': query.count('%s'),
                'literal_values': literal_values,
            }
    return manifest


def audit_seed_coverage():
    """Audit read-only: không truncate, không insert và không thay đổi dữ liệu."""
    manifest = _discover_seed_manifest()
    conn = get_connection()
    cursor = conn.cursor()
    database_placeholders = ', '.join(['%s'] * len(EXPECTED_DATABASES))
    cursor.execute(
        f"""
        SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, EXTRA
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA IN ({database_placeholders})
        ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
        """,
        EXPECTED_DATABASES,
    )
    schemas = {}
    for db_name, table_name, column_name, extra in cursor.fetchall():
        schemas.setdefault((db_name, table_name), []).append((column_name, extra or ''))

    failures = []
    discovered_databases = {db_name for db_name, _ in schemas}
    missing_databases = sorted(set(EXPECTED_DATABASES) - discovered_databases)
    if missing_databases:
        failures.append(f'missing required databases: {missing_databases}')

    checked_business_tables = 0
    checked_technical_tables = 0
    for (db_name, table_name), column_metadata in sorted(schemas.items()):
        if table_name == 'flyway_schema_history':
            continue
        key = (db_name, table_name)
        if key in TECHNICAL_EMPTY_TABLES:
            checked_technical_tables += 1
            logging.info('AUDIT SKIP technical-empty: %s.%s', db_name, table_name)
            continue
        if key in PRESERVED_TABLES:
            cursor.execute(f'SELECT COUNT(*) FROM `{db_name}`.`{table_name}`')
            row_count = cursor.fetchone()[0]
            if row_count == 0:
                failures.append(f'{db_name}.{table_name}: preserved table is empty')
            else:
                logging.info('AUDIT OK preserved: %s.%s rows=%s', db_name, table_name, row_count)
            continue

        checked_business_tables += 1
        seed = manifest.get(key)
        if seed is None or seed['row_count'] == 0:
            failures.append(f'{db_name}.{table_name}: no business seed rows')
            continue

        schema_columns = {column for column, _ in column_metadata}
        insertable_columns = {
            column for column, extra in column_metadata
            if 'auto_increment' not in extra.lower() and 'generated' not in extra.lower()
        }
        missing_columns = sorted(insertable_columns - set(seed['columns']))
        unknown_columns = sorted(set(seed['columns']) - schema_columns)
        bad_row_sizes = sorted({size for size in seed['row_sizes'] if size != seed['placeholder_count']})
        if missing_columns:
            failures.append(f'{db_name}.{table_name}: missing columns {missing_columns}')
        if unknown_columns:
            failures.append(f'{db_name}.{table_name}: unknown columns {unknown_columns}')
        if bad_row_sizes:
            failures.append(
                f'{db_name}.{table_name}: tuple sizes {bad_row_sizes} != '
                f'{seed["placeholder_count"]} placeholders'
            )
        if not missing_columns and not unknown_columns and not bad_row_sizes:
            logging.info(
                'AUDIT OK business: %s.%s rows=%s columns=%s',
                db_name,
                table_name,
                seed['row_count'],
                len(seed['columns']),
            )

    for (db_name, table_name, column_name), allowed_values in SEED_ENUM_DOMAINS.items():
        seed = manifest.get((db_name, table_name))
        if seed is None:
            continue
        actual_values = seed['literal_values'].get(column_name, set())
        invalid_values = sorted(actual_values - allowed_values)
        if invalid_values:
            failures.append(
                f'{db_name}.{table_name}.{column_name}: invalid enum seed values '
                f'{invalid_values}; allowed={sorted(allowed_values)}'
            )
        else:
            logging.info(
                'AUDIT OK enum domain: %s.%s.%s values=%s',
                db_name,
                table_name,
                column_name,
                sorted(actual_values),
            )

    cursor.execute(
        """
        SELECT u.user_id, u.email, r.role_code
        FROM identity_db.users u
        JOIN identity_db.user_roles ur ON ur.user_id = u.user_id
        JOIN identity_db.roles r ON r.role_id = ur.role_id
        WHERE u.user_id IN (1, 2, 3, 4)
        """
    )
    identity_assignments = {
        (user_id, email.lower(), role_code)
        for user_id, email, role_code in cursor.fetchall()
    }
    for user_id, (email, role_code) in REQUIRED_IDENTITY_USERS.items():
        expected_assignment = (user_id, email, role_code)
        if expected_assignment not in identity_assignments:
            failures.append(
                'identity bootstrap mismatch: expected '
                f'user_id={user_id}, email={email}, role={role_code}'
            )
    if not any(failure.startswith('identity bootstrap mismatch:') for failure in failures):
        logging.info('AUDIT OK identity bootstrap contract: users 1..4 and roles match seed references')

    cursor.close()
    conn.close()
    if failures:
        logging.error('Seed coverage audit FAILED (%s findings):', len(failures))
        for failure in failures:
            logging.error('  - %s', failure)
        return False
    logging.info(
        'Seed coverage audit PASSED: %s business tables covered; '
        '%s technical tables intentionally empty.',
        checked_business_tables,
        checked_technical_tables,
    )
    return True

def reset_all_databases():
    logging.warning('Bắt đầu reset đúng %s schema ứng dụng đã khai báo...', len(EXPECTED_DATABASES))
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SHOW DATABASES;')
    existing_databases = {row[0] for row in cursor.fetchall()}
    missing_databases = sorted(set(EXPECTED_DATABASES) - existing_databases)
    if missing_databases:
        cursor.close()
        conn.close()
        raise RuntimeError(f'Thiếu schema bắt buộc, hủy reset: {missing_databases}')

    for db in EXPECTED_DATABASES:
        logging.info(f'Resetting DB: {db}')
        cursor.execute(f'USE {db};')
        cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
        cursor.execute('SHOW TABLES;')
        tables = [row[0] for row in cursor.fetchall() if row[0].lower() != 'flyway_schema_history']
        if db == 'identity_db':
            tables = [t for t in tables if t not in ('users', 'roles', 'user_roles', 'user_preferences')]
        for table in tables:
            cursor.execute(f'TRUNCATE TABLE `{table}`;')
        cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()
    logging.info('Reset hoàn tất!')


def verify_imported_row_counts():
    """Kiểm tra sau import: business/preserved có row, technical table vẫn trống."""
    conn = get_connection()
    cursor = conn.cursor()
    failures = []
    database_placeholders = ', '.join(['%s'] * len(EXPECTED_DATABASES))
    cursor.execute(
        f"""
        SELECT TABLE_SCHEMA, TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA IN ({database_placeholders})
          AND TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME <> 'flyway_schema_history'
        ORDER BY TABLE_SCHEMA, TABLE_NAME
        """,
        EXPECTED_DATABASES,
    )
    for db_name, table_name in cursor.fetchall():
        key = (db_name, table_name)
        cursor.execute(f'SELECT COUNT(*) FROM `{db_name}`.`{table_name}`')
        row_count = cursor.fetchone()[0]
        if key in TECHNICAL_EMPTY_TABLES:
            if row_count != 0:
                failures.append(f'{db_name}.{table_name}: expected empty, found {row_count}')
        elif row_count == 0:
            failures.append(f'{db_name}.{table_name}: expected seed rows, found 0')
    cursor.close()
    conn.close()

    if failures:
        for failure in failures:
            logging.error('POST-IMPORT FAILED: %s', failure)
        return False
    logging.info('Post-import row-count verification PASSED.')
    return True


def verify_current_season_ready_to_complete(cursor):
    """Bảo vệ kịch bản demo: thu hoạch 100%, không blocker, chưa complete sẵn."""
    cursor.execute(
        """
        SELECT status, start_date, planned_harvest_date, end_date,
               expected_yield_kg, actual_yield_kg
        FROM seasons
        WHERE season_id = 1
        """
    )
    season = cursor.fetchone()
    if season is None:
        raise RuntimeError('Thiếu season seed id=1.')

    status, start_date, planned_harvest_date, end_date, expected_yield, actual_yield = season
    cursor.execute('SELECT COALESCE(SUM(quantity), 0) FROM harvests WHERE season_id = 1')
    harvested_yield = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM tasks WHERE season_id = 1 AND status <> 'DONE'")
    unfinished_tasks = cursor.fetchone()[0]

    failures = []
    if status != SEED_SEASON_STATUS:
        failures.append(f'status={status}, expected {SEED_SEASON_STATUS}')
    if start_date != SEED_SEASON_START_DATE:
        failures.append(f'start_date={start_date}, expected {SEED_SEASON_START_DATE}')
    if planned_harvest_date != SEED_PLANNED_HARVEST_DATE:
        failures.append(
            f'planned_harvest_date={planned_harvest_date}, expected {SEED_PLANNED_HARVEST_DATE}'
        )
    if end_date is not SEED_SEASON_END_DATE:
        failures.append(f'end_date={end_date}, expected NULL until Farmer completes')
    if expected_yield != actual_yield or actual_yield != harvested_yield:
        failures.append(
            'yield mismatch: '
            f'expected={expected_yield}, actual={actual_yield}, harvested={harvested_yield}'
        )
    if unfinished_tasks != 0:
        failures.append(f'{unfinished_tasks} task(s) are not DONE')

    if failures:
        raise RuntimeError('Season seed chưa sẵn sàng để Farmer kết thúc: ' + '; '.join(failures))
    logging.info(
        'Season workflow OK: ACTIVE, harvest 100%, all tasks DONE, end_date NULL.'
    )

def import_admin_reporting_db():
    logging.info('Importing data for admin_reporting_db...')
    conn = get_connection('admin_reporting_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
    # Data for admin_alert_summary
    query_admin_alert_summary = "INSERT INTO `admin_alert_summary` (`alert_id`, `season_id`, `type`, `severity`, `status`) VALUES (%s, %s, %s, %s, %s)"
    data_admin_alert_summary = [
        (1, 1, 'DISEASE_WARNING', 'HIGH', 'RESOLVED'),
        (2, 1, 'WEATHER_EXTREME', 'CRITICAL', 'RESOLVED')
    ]
    cursor.executemany(query_admin_alert_summary, data_admin_alert_summary)
    
    # Audit log mẫu phản ánh thay đổi trạng thái của hồ sơ chứng nhận seed.
    query_admin_audit_log_entries = "INSERT INTO `admin_audit_log_entries` (`entity_type`, `entity_id`, `operation`, `performed_by`, `performed_at`, `snapshot_data`, `reason`, `ip_address`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    data_admin_audit_log_entries = [
        ('CERTIFICATION_RECORD', 1, 'PUBLISH', 'admin@acm.local', datetime(2026, 3, 1, 9, 0), '{"status":"PUBLISHED","certificateNumber":"VGP-DT-2026-001"}', 'Hồ sơ và tài liệu chứng nhận đã được xác minh', '127.0.0.1')
    ]
    cursor.executemany(query_admin_audit_log_entries, data_admin_audit_log_entries)
    
    # Data for admin_documents
    query_admin_documents = "INSERT INTO `admin_documents` (`title`, `url`, `description`, `crop`, `stage`, `topic`, `is_active`, `is_public`, `created_by`, `document_type`, `view_count`, `is_pinned`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_admin_documents = [
        ('Quy trình canh tác lúa Đài Thơm 8 chuẩn VietGAP', 'http://example.com/docs/vietgap-lua.pdf', 'Hướng dẫn chi tiết từ khâu làm đất đến thu hoạch', 'Lúa', 'Toàn bộ', 'Quy trình chuẩn', 1, 1, 1, 'GUIDELINE', 1540, 1, date(2026, 1, 15), date(2026, 1, 15)),
        ('Sổ tay nhận diện bệnh Đạo Ôn', 'http://example.com/docs/dao-on.pdf', 'Cách nhận biết và phòng trị bệnh đạo ôn trên lúa', 'Lúa', 'Đẻ nhánh - Trổ', 'Sâu bệnh', 1, 1, 1, 'HANDBOOK', 890, 0, date(2026, 2, 10), date(2026, 2, 10))
    ]
    cursor.executemany(query_admin_documents, data_admin_documents)

    # Per-user document library state for the Farmer demo account.
    # Document 1 is a favorite; both documents have real recent-open timestamps.
    query_document_user_interactions = "INSERT INTO `document_user_interactions` (`user_id`, `document_id`, `is_favorite`, `favorited_at`, `last_opened_at`, `open_count`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    data_document_user_interactions = [
        (2, 1, 1, datetime(2026, 8, 24, 8, 30), datetime(2026, 8, 26, 8, 15), 4, datetime(2026, 8, 24, 8, 30), datetime(2026, 8, 26, 8, 15)),
        (2, 2, 0, None, datetime(2026, 8, 25, 16, 45), 2, datetime(2026, 8, 25, 16, 45), datetime(2026, 8, 25, 16, 45))
    ]
    cursor.executemany(query_document_user_interactions, data_document_user_interactions)

    # Data for admin_expense_summary
    query_admin_expense_summary = "INSERT INTO `admin_expense_summary` (`expense_id`, `season_id`, `total_cost`, `category`, `item_name`, `expense_date`) VALUES (%s, %s, %s, %s, %s, %s)"
    data_admin_expense_summary = [
        (1, 1, 6500000.00, 'FERTILIZER', 'Phân Ure Phú Mỹ', date(2026, 4, 29)),
        (2, 1, 1400000.00, 'PESTICIDE', 'Thuốc trừ nấm Amistar Top', date(2026, 7, 1))
    ]
    cursor.executemany(query_admin_expense_summary, data_admin_expense_summary)
    
    # Data for admin_farm_summary
    query_admin_farm_summary = "INSERT INTO `admin_farm_summary` (`farm_id`, `farm_name`, `active`) VALUES (%s, %s, %s)"
    data_admin_farm_summary = [
        (1, 'HTX Nông Nghiệp Xanh Đồng Tháp', 1),
        (2, 'Nông Trại Cà Phê Chư Sê', 1)
    ]
    cursor.executemany(query_admin_farm_summary, data_admin_farm_summary)
    
    # Data for admin_harvest_summary
    query_admin_harvest_summary = "INSERT INTO `admin_harvest_summary` (`harvest_id`, `season_id`, `quantity`, `unit_price`) VALUES (%s, %s, %s, %s)"
    data_admin_harvest_summary = [
        (1, 1, 34500, 18500.00)
    ]
    cursor.executemany(query_admin_harvest_summary, data_admin_harvest_summary)
    
    # Data for admin_incident_summary
    query_admin_incident_summary = "INSERT INTO `admin_incident_summary` (`incident_id`, `season_id`, `status`, `incident_type`, `severity`, `resolved_at`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_admin_incident_summary = [
        (1, 1, 'RESOLVED', 'PEST_OUTBREAK', 'HIGH', date(2026, 7, 5), date(2026, 6, 30))
    ]
    cursor.executemany(query_admin_incident_summary, data_admin_incident_summary)
    
    # Data for admin_inventory_lot_summary
    query_admin_inventory_lot_summary = "INSERT INTO `admin_inventory_lot_summary` (`lot_id`, `farm_id`, `farm_name`, `expiry_date`, `warehouse_id`, `warehouse_name`, `quantity_on_hand`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_admin_inventory_lot_summary = [
        (1, 1, 'HTX Nông Nghiệp Xanh Đồng Tháp', date(2027, 8, 21), 2, 'Kho Gạo Thành Phẩm', 32500)
    ]
    cursor.executemany(query_admin_inventory_lot_summary, data_admin_inventory_lot_summary)
    
    # Data for admin_marketplace_order_item_summary
    query_admin_marketplace_order_item_summary = "INSERT INTO `admin_marketplace_order_item_summary` (`item_id`, `order_id`, `season_id`, `quantity`, `unit_price`, `line_total`) VALUES (%s, %s, %s, %s, %s, %s)"
    data_admin_marketplace_order_item_summary = [
        (1, 1, 1, 2000, 18500.00, 37000000.00)
    ]
    cursor.executemany(query_admin_marketplace_order_item_summary, data_admin_marketplace_order_item_summary)
    
    # Data for admin_marketplace_order_summary
    query_admin_marketplace_order_summary = "INSERT INTO `admin_marketplace_order_summary` (`order_id`, `order_code`, `buyer_id`, `buyer_name`, `total_amount`, `payment_status`, `status`, `payment_proof_uploaded_at`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_admin_marketplace_order_summary = [
        (1, 'ORD-2608-001', 4, 'Tran Thi Buyer', 37500000.00, 'VERIFIED', 'COMPLETED', datetime(2026, 8, 22, 9, 15), datetime(2026, 8, 22, 9, 0))
    ]
    cursor.executemany(query_admin_marketplace_order_summary, data_admin_marketplace_order_summary)
    
    # Data for admin_marketplace_product_summary
    query_admin_marketplace_product_summary = "INSERT INTO `admin_marketplace_product_summary` (`product_id`, `product_name`, `farm_id`, `farm_name`, `farmer_id`, `farmer_name`, `status`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    data_admin_marketplace_product_summary = [
        (1, 'Gạo Đài Thơm 8 - VietGAP', 1, 'HTX Nông Nghiệp Xanh Đồng Tháp', 2, 'Nguyen Van Farmer', 'PUBLISHED', datetime(2026, 8, 21, 12, 0))
    ]
    cursor.executemany(query_admin_marketplace_product_summary, data_admin_marketplace_product_summary)
    
    # Data for admin_plot_summary
    query_admin_plot_summary = "INSERT INTO `admin_plot_summary` (`plot_id`, `plot_name`, `farm_id`, `area`) VALUES (%s, %s, %s, %s)"
    data_admin_plot_summary = [
        (1, 'Lô A1 - Cánh Đồng Mẫu Lớn', 1, 50000), # 5 hecta
        (2, 'Lô B - Đất Cà Phê Giai Đoạn Kinh Doanh', 2, 20000)
    ]
    cursor.executemany(query_admin_plot_summary, data_admin_plot_summary)
    
    # Data for admin_season_summary
    query_admin_season_summary = "INSERT INTO `admin_season_summary` (`season_id`, `season_name`, `plot_id`, `crop_id`, `crop_name`, `variety_id`, `variety_name`, `status`, `start_date`, `expected_yield_kg`, `actual_yield_kg`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_admin_season_summary = [
        (1, SEED_SEASON_NAME, 1, 1, 'Lúa Nước', 1, 'Đài Thơm 8', SEED_SEASON_STATUS, SEED_SEASON_START_DATE, SEED_EXPECTED_YIELD_KG, SEED_ACTUAL_YIELD_KG)
    ]
    cursor.executemany(query_admin_season_summary, data_admin_season_summary)
    
    # Data for admin_task_summary
    query_admin_task_summary = "INSERT INTO `admin_task_summary` (`task_id`, `season_id`, `status`) VALUES (%s, %s, %s)"
    data_admin_task_summary = [
        (1, 1, 'DONE'),
        (2, 1, 'DONE')
    ]
    cursor.executemany(query_admin_task_summary, data_admin_task_summary)
    
    # Data for admin_user_summary
    query_admin_user_summary = "INSERT INTO `admin_user_summary` (`user_id`, `username`, `full_name`, `email`, `status`, `role_code`) VALUES (%s, %s, %s, %s, %s, %s)"
    data_admin_user_summary = [
        (1, 'admin', 'Administrator', 'admin@acm.local', 'ACTIVE', 'ADMIN'),
        (2, 'farmer', 'Nguyen Van Farmer', 'farmer@acm.local', 'ACTIVE', 'FARMER'),
        (3, 'employee', 'Nguyen Van Employee', 'employee@acm.local', 'ACTIVE', 'EMPLOYEE'),
        (4, 'buyer', 'Tran Thi Buyer', 'buyer@acm.local', 'ACTIVE', 'BUYER')
    ]
    cursor.executemany(query_admin_user_summary, data_admin_user_summary)
    
    # Data for processed_events - KHÔNG IMPORT (Idempotency Key / Events)
    query_processed_events = "INSERT INTO `processed_events` (`event_id`, `processed_at`) VALUES (%s, %s)"
    data_processed_events = []
    cursor.executemany(query_processed_events, data_processed_events)
    
    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()

def import_crop_catalog_db():
    logging.info('Importing data for crop_catalog_db...')
    conn = get_connection('crop_catalog_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
    
    # Data for crops
    query_crops = "INSERT INTO `crops` (`crop_name`, `description`, `category`, `post_harvest_delay_days`, `shelf_life_days`, `default_storage_category`, `requires_cold_chain`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_crops = [
        ('Lúa Nước', 'Cây lương thực chủ đạo, thích hợp vùng nhiệt đới.', 'GRAIN', 2, 180, 'DRY', 0),
        ('Cà Phê', 'Cây công nghiệp dài ngày, mang lại giá trị kinh tế cao.', 'OTHER', 5, 365, 'DRY', 0),
        ('Sầu Riêng', 'Cây ăn trái đặc sản, yêu cầu kỹ thuật chăm sóc cao.', 'FRUIT', 1, 14, 'COLD', 1)
    ]
    cursor.executemany(query_crops, data_crops)
    
    # Data for varieties
    query_varieties = "INSERT INTO `varieties` (`crop_id`, `name`, `description`) VALUES (%s, %s, %s)"
    data_varieties = [
        (1, 'Đài Thơm 8', 'Giống lúa hạt dài, gạo trong, cơm dẻo, kháng đạo ôn khá.'),
        (1, 'ST25', 'Gạo ngon nhất thế giới, chống chịu phèn mặn tốt.'),
        (2, 'Robusta', 'Năng suất cao, lượng caffeine lớn, phù hợp Tây Nguyên.'),
        (3, 'Ri6', 'Cơm vàng hạt lép, thơm ngon, thích hợp miền Tây Nam Bộ.')
    ]
    cursor.executemany(query_varieties, data_varieties)

    # Data for crop_nitrogen_references
    query_crop_nitrogen_references = "INSERT INTO `crop_nitrogen_references` (`crop_id`, `n_content_kg_per_kg_yield`, `source_reference`, `active`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s)"
    data_crop_nitrogen_references = [
        (1, 0.015, 'Tiêu chuẩn quốc gia TCVN - Viện Lúa ĐBSCL', 1, date(2026, 1, 1), date(2026, 1, 1)),
        (2, 0.035, 'Viện Khoa học Kỹ thuật Nông Lâm nghiệp Tây Nguyên (WASI)', 1, date(2026, 1, 1), date(2026, 1, 1))
    ]
    cursor.executemany(query_crop_nitrogen_references, data_crop_nitrogen_references)
    
    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()

def import_farm_db():
    logging.info('Importing data for farm_db...')
    conn = get_connection('farm_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
    
    # Data for provinces & wards (Dữ liệu Hành chính cơ bản)
    query_provinces = "INSERT INTO `provinces` (`id`, `name`, `slug`, `type`, `name_with_type`) VALUES (%s, %s, %s, %s, %s)"
    data_provinces = [
        (87, 'Đồng Tháp', 'dong-thap', 'Tỉnh', 'Tỉnh Đồng Tháp'),
        (66, 'Đắk Lắk', 'dak-lak', 'Tỉnh', 'Tỉnh Đắk Lắk')
    ]
    cursor.executemany(query_provinces, data_provinces)
    
    query_wards = "INSERT INTO `wards` (`id`, `name`, `slug`, `type`, `name_with_type`, `province_id`) VALUES (%s, %s, %s, %s, %s, %s)"
    data_wards = [
        (871, 'Tháp Mười', 'thap-muoi', 'Huyện', 'Huyện Tháp Mười', 87),
        (661, 'Cư M\'gar', 'cu-mgar', 'Huyện', 'Huyện Cư M\'gar', 66)
    ]
    cursor.executemany(query_wards, data_wards)

    # Data for farms
    query_farms = "INSERT INTO `farms` (`user_id`, `farm_name`, `province_id`, `ward_id`, `area`, `active`, `latitude`, `longitude`, `average_rating`, `rating_count`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_farms = [
        (2, 'HTX Nông Nghiệp Xanh Đồng Tháp', 87, 871, 50.5, 1, 10.456, 105.812, 4.8, 150),
        (2, 'Nông Trại Cà Phê Chư Sê', 66, 661, 20.0, 1, 12.666, 108.033, 4.5, 80)
    ]
    cursor.executemany(query_farms, data_farms)
    
    # Data for plots
    query_plots = "INSERT INTO `plots` (`farm_id`, `plot_name`, `area`, `soil_type`, `status`, `boundary_geojson`, `created_by`, `created_at`, `updated_at`, `parent_plot_id`, `polygon`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, ST_GeomFromText('POINT(10.762622 106.660172)'))"
    data_plots = [
        (1, 'Lô A1 - Cánh Đồng Mẫu Lớn', 5.0, 'Đất phù sa', 'ACTIVE', '{"type":"Polygon","coordinates":[[[105.8,10.4],[105.9,10.4],[105.9,10.5],[105.8,10.5],[105.8,10.4]]]}', 2, date(2026, 1, 1), date(2026, 1, 1), None),
        (2, 'Lô B1 - Cà Phê Năm 4', 2.0, 'Đất đỏ bazan', 'ACTIVE', '{"type":"Polygon","coordinates":[[[108.0,12.6],[108.1,12.6],[108.1,12.7],[108.0,12.7],[108.0,12.6]]]}', 2, date(2026, 1, 1), date(2026, 1, 1), None)
    ]
    cursor.executemany(query_plots, data_plots)

    # Data for certification_standards
    query_certification_standards = "INSERT INTO `certification_standards` (`code`, `name`, `type`, `version`, `description`, `is_active`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_certification_standards = [
        ('VIETGAP-PLANTING-2026', 'VietGAP Trồng trọt (TCVN 11892-1:2026)', 'VIETGAP_PLANTING', 'TCVN 11892-1:2026', 'Bộ checklist số hóa hỗ trợ chuẩn bị hồ sơ theo TCVN 11892-1:2026; phạm vi áp dụng cần được tổ chức chứng nhận xác nhận.', 1, date(2026, 1, 1)),
        ('GLOBALGAP', 'Tiêu chuẩn GlobalGAP IFA', 'GLOBALGAP', 'V6.0', 'Thực hành nông nghiệp tốt toàn cầu', 1, date(2026, 1, 1))
    ]
    cursor.executemany(query_certification_standards, data_certification_standards)

    # Data for certification_checklist_items
    query_certification_checklist_items = "INSERT INTO `certification_checklist_items` (`standard_id`, `item_code`, `category`, `description`, `is_mandatory`, `weight_pct`, `data_source_type`, `data_source_query`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_certification_checklist_items = [
        (1, 'PA-001', 'PRODUCTION_AREA', 'Đất sản xuất không bị ô nhiễm, có kết quả phân tích đất trong vòng 12 tháng', 1, 5.00, 'SOIL_TEST', '{"seasonId": null, "freshnessDays": 365}', date(2026, 1, 1)),
        (1, 'PA-002', 'PRODUCTION_AREA', 'Nguồn nước tưới đạt QCVN 08-MT:2015/BTNMT', 1, 5.00, 'WATER_TEST', '{"seasonId": null, "freshnessDays": 365}', date(2026, 1, 1)),
        (1, 'PA-003', 'PRODUCTION_AREA', 'Vùng sản xuất có sơ đồ mặt bằng rõ ràng', 1, 3.00, 'MANUAL', None, date(2026, 1, 1)),
        (1, 'SE-001', 'SEED', 'Sử dụng giống có nguồn gốc rõ ràng, có giấy chứng nhận nguồn giống', 1, 4.00, 'FIELD_LOG', '{"logType": "SEEDING"}', date(2026, 1, 1)),
        (1, 'SE-002', 'SEED', 'Ghi chép ngày gieo trồng và nguồn giống', 1, 2.00, 'FIELD_LOG', '{"logType": "SEEDING"}', date(2026, 1, 1)),
        (1, 'CU-001', 'CULTIVATION', 'Ghi chép đầy đủ phân bón đã sử dụng (loại, lượng, ngày)', 1, 5.00, 'FIELD_LOG', '{"logType": "FERTILIZER_APPLICATION"}', date(2026, 1, 1)),
        (1, 'CU-002', 'CULTIVATION', 'Ghi chép đầy đủ thuốc BVTV đã sử dụng (tên, ngày phun, PHI)', 1, 5.00, 'FIELD_LOG', '{"logType": "PESTICIDE_APPLICATION"}', date(2026, 1, 1)),
        (1, 'CU-003', 'CULTIVATION', 'Tuân thủ thời gian cách ly (PHI) trước thu hoạch', 1, 5.00, 'PHI_CHECK', None, date(2026, 1, 1)),
        (1, 'HV-001', 'HARVEST', 'Thu hoạch đúng thời điểm, có nhật ký thu hoạch', 1, 3.00, 'FIELD_LOG', '{"logType": "HARVEST"}', date(2026, 1, 1)),
        (1, 'HV-002', 'HARVEST', 'Sản phẩm sau thu hoạch được bảo quản đúng cách, có hồ sơ kho', 1, 2.00, 'MANUAL', None, date(2026, 1, 1))
    ]
    cursor.executemany(query_certification_checklist_items, data_certification_checklist_items)
    
    # Data for certification_records
    query_certification_records = "INSERT INTO `certification_records` (`farm_id`, `standard_id`, `compliance_score`, `status`, `applied_at`, `certified_at`, `expiry_date`, `auditor_notes`, `certificate_number`, `certificate_document_id`, `next_periodic_review_date`, `published_at`, `published_by_user_id`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_certification_records = [
        (1, 1, 100.0, 'PUBLISHED', datetime(2025, 12, 1, 8, 0), datetime(2026, 1, 10, 14, 0), date(2028, 1, 10), 'Nông trại duy trì tốt sổ nhật ký canh tác điện tử', 'VGP-DT-2026-001', 2, date(2027, 1, 10), datetime(2026, 3, 1, 9, 0), 1, datetime(2026, 1, 1, 8, 0), datetime(2026, 3, 1, 9, 0))
    ]
    cursor.executemany(query_certification_records, data_certification_records)

    # VietGAP scope is product/season/plot specific. farm_id only identifies the dossier owner.
    query_certification_scopes = "INSERT INTO `certification_scopes` (`record_id`, `season_id`, `plot_id`, `plot_name`, `crop_id`, `crop_name`, `variety_id`, `variety_name`, `registered_area_ha`, `expected_yield_kg`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_certification_scopes = [
        (1, 1, 1, 'Lô A1 - Cánh Đồng Mẫu Lớn', 1, 'Lúa Nước', 1, 'Đài Thơm 8', 5.0000, 34500.000, datetime(2025, 12, 1, 8, 0), datetime(2026, 3, 1, 9, 0))
    ]
    cursor.executemany(query_certification_scopes, data_certification_scopes)

    # Data for certification_item_statuses
    query_certification_item_statuses = "INSERT INTO `certification_item_statuses` (`record_id`, `checklist_item_id`, `status`, `evidence_url`, `notes`, `checked_at`, `checked_by`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_certification_item_statuses = [
        (1, 1, 'PASS', 'http://example.com/evidence/soil_test.pdf', 'Kết quả đất đạt chuẩn', date(2026, 1, 5), 1, date(2026, 1, 5), date(2026, 1, 5)),
        (1, 2, 'PASS', 'http://example.com/evidence/water_test.pdf', 'Kết quả nước đạt chuẩn QCVN 08-MT:2015/BTNMT', date(2026, 1, 5), 1, date(2026, 1, 5), date(2026, 1, 5)),
        (1, 3, 'PASS', None, 'Có sơ đồ mặt bằng', date(2026, 1, 5), 1, date(2026, 1, 5), date(2026, 1, 5)),
        (1, 4, 'PASS', None, 'Sử dụng giống ST25 có chứng nhận', date(2026, 1, 5), 1, date(2026, 1, 5), date(2026, 1, 5)),
        (1, 5, 'PASS', None, 'Ghi chép đầy đủ', date(2026, 1, 5), 1, date(2026, 1, 5), date(2026, 1, 5)),
        (1, 6, 'PASS', None, 'Ghi chép phân bón đầy đủ', date(2026, 1, 5), 1, date(2026, 1, 5), date(2026, 1, 5)),
        (1, 7, 'PASS', None, 'Ghi chép thuốc BVTV đầy đủ', date(2026, 1, 5), 1, date(2026, 1, 5), date(2026, 1, 5)),
        (1, 8, 'PASS', None, 'Tuân thủ thời gian cách ly', date(2026, 1, 5), 1, date(2026, 1, 5), date(2026, 1, 5)),
        (1, 9, 'PASS', None, 'Có nhật ký thu hoạch', date(2026, 1, 5), 1, date(2026, 1, 5), date(2026, 1, 5)),
        (1, 10, 'PASS', None, 'Bảo quản đúng quy trình', date(2026, 1, 5), 1, date(2026, 1, 5), date(2026, 1, 5))
    ]
    cursor.executemany(query_certification_item_statuses, data_certification_item_statuses)

    # Lifecycle audit → nonconformity → corrective action có đủ provenance.
    query_certification_audits = "INSERT INTO `certification_audits` (`record_id`, `audit_type`, `scheduled_date`, `auditor_user_id`, `auditor_org_name`, `status`, `interview_notes`, `sample_collection_notes`, `conducted_at`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_certification_audits = [
        (1, 'INITIAL', date(2026, 1, 5), 1, 'Tổ đánh giá VietGAP Đồng Tháp', 'PASSED', 'Đã phỏng vấn chủ hộ và nhân sự hiện trường', 'Mẫu đất và nước có biên bản bàn giao LAB-2026-001', datetime(2026, 1, 5, 15, 30), datetime(2025, 12, 20, 9, 0), datetime(2026, 1, 5, 15, 30))
    ]
    cursor.executemany(query_certification_audits, data_certification_audits)

    query_certification_nonconformities = "INSERT INTO `certification_nonconformities` (`audit_id`, `checklist_item_id`, `severity`, `description`, `status`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_certification_nonconformities = [
        (1, 7, 'MINOR', 'Thiếu ảnh nhãn thuốc tại lần ghi nhận đầu tiên', 'RESOLVED', datetime(2026, 1, 5, 10, 0), datetime(2026, 1, 8, 16, 0))
    ]
    cursor.executemany(query_certification_nonconformities, data_certification_nonconformities)

    query_certification_corrective_actions = "INSERT INTO `certification_corrective_actions` (`nonconformity_id`, `plan_description`, `evidence_urls`, `applies_from_season_id`, `submitted_by_user_id`, `submitted_at`, `reviewed_by_user_id`, `review_result`, `review_note`, `reviewed_at`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_certification_corrective_actions = [
        (1, 'Bổ sung ảnh nhãn thuốc và bắt buộc ảnh evidence cho mọi lần phun', '["http://example.com/evidence/pesticide-label.jpg"]', 1, 2, datetime(2026, 1, 7, 9, 0), 1, 'APPROVED', 'Evidence đầy đủ và hành động phòng ngừa phù hợp', datetime(2026, 1, 8, 16, 0), datetime(2026, 1, 7, 9, 0), datetime(2026, 1, 8, 16, 0))
    ]
    cursor.executemany(query_certification_corrective_actions, data_certification_corrective_actions)

    # Data for farm_documents
    query_farm_documents = "INSERT INTO `farm_documents` (`farm_id`, `document_type`, `title`, `description`, `file_url`, `issued_date`, `expiry_date`, `verification_status`, `verified_by`, `verified_at`, `created_by`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_farm_documents = [
        (1, 'SOIL_TEST_REPORT', 'Báo cáo kiểm nghiệm đất Lô A1', 'Phân tích NPK và Kim loại nặng', 'http://example.com/docs/soil_a1.pdf', date(2025, 11, 20), date(2026, 11, 20), 'VERIFIED', 1, datetime(2025, 11, 25, 9, 0), 2, datetime(2025, 11, 21, 9, 0), datetime(2025, 11, 25, 9, 0)),
        (1, 'CERTIFICATE', 'Giấy chứng nhận VietGAP VGP-DT-2026-001', 'Chứng nhận VietGAP trồng trọt đã được công bố', 'http://example.com/docs/VGP-DT-2026-001.pdf', date(2026, 1, 10), date(2028, 1, 10), 'VERIFIED', 1, datetime(2026, 3, 1, 9, 0), 1, datetime(2026, 1, 10, 14, 0), datetime(2026, 3, 1, 9, 0)),
        (1, 'WATER_TEST_REPORT', 'Kết quả xét nghiệm nước tưới 2026', 'Mẫu nước tưới tại Lô A1, biên bản LAB-WATER-2026-001', 'http://example.com/docs/water_a1_2026.pdf', date(2025, 11, 22), date(2026, 11, 22), 'VERIFIED', 1, datetime(2025, 11, 26, 10, 0), 2, datetime(2025, 11, 22, 15, 0), datetime(2025, 11, 26, 10, 0)),
        (1, 'LAND_CERTIFICATE', 'Hồ sơ quyền sử dụng vùng sản xuất', 'Hồ sơ đất và sơ đồ ranh giới vùng sản xuất Lô A1', 'http://example.com/docs/land_a1.pdf', date(2024, 5, 10), None, 'VERIFIED', 1, datetime(2025, 11, 25, 10, 0), 2, datetime(2025, 11, 20, 10, 0), datetime(2025, 11, 25, 10, 0)),
        (1, 'INTERNAL_AUDIT', 'Biên bản đánh giá nội bộ trước đăng ký VietGAP', 'Đánh giá checklist, kế hoạch sửa lỗi và xác nhận sẵn sàng nộp hồ sơ', 'http://example.com/docs/internal_audit_2025.pdf', date(2025, 11, 28), None, 'VERIFIED', 1, datetime(2025, 11, 30, 16, 0), 2, datetime(2025, 11, 28, 16, 0), datetime(2025, 11, 30, 16, 0)),
        (1, 'PERIODIC_INSPECTION', 'Biên bản giám sát định kỳ VietGAP 2026', 'Kiểm tra duy trì điều kiện, nhật ký canh tác và hồ sơ truy xuất', 'http://example.com/docs/periodic_inspection_2026.pdf', date(2026, 7, 10), date(2027, 1, 10), 'VERIFIED', 1, datetime(2026, 7, 12, 14, 0), 2, datetime(2026, 7, 10, 14, 0), datetime(2026, 7, 12, 14, 0))
    ]
    cursor.executemany(query_farm_documents, data_farm_documents)

    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()

def import_finance_db():
    logging.info('Importing data for finance_db...')
    conn = get_connection('finance_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
    # Data for expenses
    query_expenses = "INSERT INTO `expenses` (`user_id`, `season_id`, `task_id`, `plot_id`, `farm_id`, `category`, `item_name`, `unit_price`, `quantity`, `total_cost`, `amount`, `payment_status`, `note`, `expense_date`, `season_name`, `plot_name`, `task_title`, `user_name`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_expenses = [
        (2, 1, 1, 1, 1, 'FERTILIZER', 'Phân Ure Phú Mỹ', 650000.00, 10, 6500000.00, 6500000.00, 'PAID', 'Bón thúc đợt 1', date(2026, 4, 29), SEED_SEASON_SHORT_NAME, 'Lô A1 - Cánh Đồng Mẫu Lớn', 'Làm đất và gieo sạ', 'Nguyen Van Farmer', datetime(2026, 4, 30, 8, 0)),
        (2, 1, 2, 1, 1, 'PESTICIDE', 'Thuốc trừ nấm Amistar Top', 280000.00, 5, 1400000.00, 1400000.00, 'PAID', 'Phòng trị đạo ôn', date(2026, 7, 1), SEED_SEASON_SHORT_NAME, 'Lô A1 - Cánh Đồng Mẫu Lớn', 'Bón phân thúc đợt 1', 'Nguyen Van Farmer', datetime(2026, 7, 2, 8, 0)),
        (2, 1, 2, 1, 1, 'LABOR', 'Công phun thuốc bằng Drone', 200000.00, 5, 1000000.00, 1000000.00, 'PAID', 'Dịch vụ đã nghiệm thu và thanh toán', date(2026, 7, 1), SEED_SEASON_SHORT_NAME, 'Lô A1 - Cánh Đồng Mẫu Lớn', 'Bón phân thúc đợt 1', 'Nguyen Van Farmer', datetime(2026, 7, 2, 8, 5))
    ]
    cursor.executemany(query_expenses, data_expenses)
    
    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()

def import_identity_db():
    logging.info('Importing data for identity_db...')
    conn = get_connection('identity_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
    
    # KHÔNG IMPORT DỮ LIỆU CỨNG CHO CÁC BẢNG SECURITY DƯỚI ĐÂY
    query_invalidated_token = "INSERT INTO `invalidated_token` (`id`, `expiry_time`) VALUES (%s, %s)"
    data_invalidated_token = []
    cursor.executemany(query_invalidated_token, data_invalidated_token)
    
    query_password_reset_tokens = "INSERT INTO `password_reset_tokens` (`user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`, `request_ip`, `user_agent`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_password_reset_tokens = []
    cursor.executemany(query_password_reset_tokens, data_password_reset_tokens)
    
    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()

def import_incident_db():
    logging.info('Importing data for incident_db...')
    conn = get_connection('incident_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
    # Data for alerts
    query_alerts = "INSERT INTO `alerts` (`type`, `severity`, `status`, `farm_id`, `season_id`, `plot_id`, `crop_id`, `title`, `message`, `suggested_action_type`, `suggested_action_url`, `recipient_farmer_ids`, `created_at`, `sent_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_alerts = [
        ('WEATHER', 'HIGH', 'SENT', 1, 1, 1, 1, 'Cảnh báo hạn mặn xâm nhập', 'Độ mặn tại trạm bơm Kênh Xáng đạt 4‰. Ngừng bơm nước tưới.', 'CHECK_IRRIGATION', 'http://agri-app/actions/irrigation', '2', datetime(2026, 7, 10, 7, 0), datetime(2026, 7, 10, 7, 1)),
        ('PEST', 'MEDIUM', 'SENT', 1, 1, 1, 1, 'Nguy cơ bùng phát rầy nâu', 'Thời tiết ẩm ướt phù hợp rầy nâu sinh sôi. Cần thăm đồng.', 'SCOUT_FIELD', 'http://agri-app/actions/scout', '2', datetime(2026, 6, 30, 7, 0), datetime(2026, 6, 30, 7, 1))
    ]
    cursor.executemany(query_alerts, data_alerts)
    
    # Data for incidents
    query_incidents = "INSERT INTO `incidents` (`season_id`, `farm_id`, `reported_by`, `incident_type`, `severity`, `status`, `description`, `deadline`, `resolved_at`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_incidents = [
        (1, 1, 3, 'DISEASE', 'MEDIUM', 'RESOLVED', 'Phát hiện vết bệnh đạo ôn sớm trên lá tại rìa bờ ruộng lô A1.', date(2026, 7, 3), datetime(2026, 7, 5, 16, 0), datetime(2026, 6, 30, 8, 0))
    ]
    cursor.executemany(query_incidents, data_incidents)
    
    # Data for notifications
    query_notifications = "INSERT INTO `notifications` (`user_id`, `title`, `message`, `link`, `alert_id`, `created_at`, `read_at`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_notifications = [
        (2, 'Hạn mặn khẩn cấp', 'Vui lòng kiểm tra trạm bơm ngay lập tức', '/alerts/1', 1, datetime(2026, 7, 10, 7, 1), datetime(2026, 7, 10, 7, 30))
    ]
    cursor.executemany(query_notifications, data_notifications)
    
    # KHÔNG IMPORT PROCESSED EVENTS
    query_processed_events = "INSERT INTO `processed_events` (`event_id`, `processed_at`) VALUES (%s, %s)"
    data_processed_events = []
    cursor.executemany(query_processed_events, data_processed_events)
    
    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()

def import_inventory_db():
    logging.info('Importing data for inventory_db...')
    conn = get_connection('inventory_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
    
    # Data for warehouses
    query_warehouses = "INSERT INTO `warehouses` (`farm_id`, `name`, `type`, `province_id`, `ward_id`, `storage_category`, `temperature_min`, `temperature_max`, `humidity_min`, `humidity_max`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_warehouses = [
        (1, 'Kho Vật Tư Nông Nghiệp HTX', 'INPUT', 87, 871, 'DRY', 20.0, 30.0, 40.0, 70.0),
        (1, 'Kho Gạo Thành Phẩm', 'OUTPUT', 87, 871, 'COLD', 18.0, 25.0, 50.0, 60.0)
    ]
    cursor.executemany(query_warehouses, data_warehouses)
    
    # Data for suppliers
    query_suppliers = "INSERT INTO `suppliers` (`name`, `license_no`, `contact_email`, `contact_phone`) VALUES (%s, %s, %s, %s)"
    data_suppliers = [
        ('Đại lý Vật tư Nông nghiệp Hai Lúa', 'GP-KD-87001', 'hailua@vtnn.vn', '0909123456'),
        ('Công ty TNHH Phân Bón Dầu Khí', 'GP-KD-PB-99', 'contact@daukhi.vn', '19008888')
    ]
    cursor.executemany(query_suppliers, data_suppliers)
    
    # Data for supply_items
    query_supply_items = "INSERT INTO `supply_items` (`name`, `active_ingredient`, `unit`, `restricted_flag`) VALUES (%s, %s, %s, %s)"
    data_supply_items = [
        ('Phân Ure Phú Mỹ', 'Nitrogen 46%', 'KG', 0),
        ('Thuốc trừ nấm Amistar Top', 'Azoxystrobin 200g/L + Difenoconazole 125g/L', 'L', 1)
    ]
    cursor.executemany(query_supply_items, data_supply_items)
    
    # Data for supply_lots
    query_supply_lots = "INSERT INTO `supply_lots` (`supply_item_id`, `supplier_id`, `batch_code`, `expiry_date`, `status`) VALUES (%s, %s, %s, %s, %s)"
    data_supply_lots = [
        (1, 2, 'BATCH-URE-202511', date(2027, 11, 1), 'ACTIVE'),
        (2, 1, 'BATCH-AMI-202601', date(2028, 1, 1), 'ACTIVE')
    ]
    cursor.executemany(query_supply_lots, data_supply_lots)

    # Data for stock_locations
    query_stock_locations = "INSERT INTO `stock_locations` (`warehouse_id`, `zone`, `aisle`, `shelf`, `bin`) VALUES (%s, %s, %s, %s, %s)"
    data_stock_locations = [
        (1, 'Khu Phân Bón', 'A', '1', '1'),
        (1, 'Khu Thuốc BVTV', 'B', 'Tủ Kính', '1'),
        (2, 'Khu Thành Phẩm', 'A', 'Kệ Gạo', '01')
    ]
    cursor.executemany(query_stock_locations, data_stock_locations)
    
    # Data for inventory_balances
    query_inventory_balances = "INSERT INTO `inventory_balances` (`supply_lot_id`, `warehouse_id`, `location_id`, `quantity`) VALUES (%s, %s, %s, %s)"
    data_inventory_balances = [
        (1, 1, 1, 1000), # 1000 KG Ure
        (2, 1, 2, 50)    # 50 L Amistar Top
    ]
    cursor.executemany(query_inventory_balances, data_inventory_balances)

    query_stock_movements = "INSERT INTO `stock_movements` (`supply_lot_id`, `warehouse_id`, `location_id`, `movement_type`, `quantity`, `movement_date`, `season_id`, `task_id`, `note`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_stock_movements = [
        (1, 1, 1, 'IN', 1000, datetime(2025, 11, 10, 8, 0), 1, 1, 'Nhập kho phân Ure phục vụ mùa vụ'),
        (2, 1, 2, 'IN', 50, datetime(2026, 1, 10, 8, 0), 1, 2, 'Nhập kho thuốc BVTV có kiểm tra hạn dùng')
    ]
    cursor.executemany(query_stock_movements, data_stock_movements)

    # Data for product_warehouse_lots (Sản phẩm thu hoạch nhập kho)
    query_product_warehouse_lots = "INSERT INTO `product_warehouse_lots` (`lot_code`, `product_id`, `product_name`, `product_variant`, `season_id`, `farm_id`, `plot_id`, `harvest_id`, `warehouse_id`, `location_id`, `harvested_at`, `received_at`, `unit`, `initial_quantity`, `on_hand_quantity`, `grade`, `quality_status`, `traceability_data`, `note`, `status`, `created_by`, `created_at`, `updated_at`, `crop_category`, `expiry_date`, `packaging_type`, `packaging_count`, `processing_type`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_product_warehouse_lots = [
        ('LOT-GAO-DT8-2026A', 1, 'Gạo Đài Thơm 8', 'Đài Thơm 8', 1, 1, 1, 1, 2, 3, SEED_HARVEST_DATE, SEED_WAREHOUSE_RECEIVED_AT, 'KG', SEED_ACTUAL_YIELD_KG, 32500, 'GRADE_A', 'PASSED', '{"source":"HARVEST","qr":"https://trace.agri.vn/LOT-GAO-DT8-2026A","moisturePct":14.0,"seasonId":1,"seasonName":"Vụ Hè Thu 2026 (Lúa Đài Thơm 8)","farmId":1,"farmName":"HTX Nông Nghiệp Xanh Đồng Tháp","plotId":1,"plotName":"Lô A1 - Cánh Đồng Mẫu Lớn","harvestId":1}', 'Lúa sấy khô đạt ẩm độ 14%', 'IN_STOCK', 2, SEED_WAREHOUSE_RECEIVED_AT, datetime(2026, 8, 22, 10, 0), 'GRAIN', date(2027, 8, 21), 'BAG', 690, 'DRIED')
    ]
    cursor.executemany(query_product_warehouse_lots, data_product_warehouse_lots)

    query_product_warehouse_transactions = "INSERT INTO `product_warehouse_transactions` (`lot_id`, `transaction_type`, `quantity`, `unit`, `resulting_on_hand`, `reference_type`, `reference_id`, `note`, `created_by`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_product_warehouse_transactions = [
        (1, 'RECEIPT_FROM_HARVEST', SEED_ACTUAL_YIELD_KG, 'KG', SEED_ACTUAL_YIELD_KG, 'HARVEST', '1', 'Nhập kho từ phiếu thu hoạch số 1', 2, SEED_WAREHOUSE_RECEIVED_AT),
        (1, 'MARKETPLACE_ORDER_RESERVED', 2000, 'KG', 32500, 'ORDER', '1', 'Xác nhận xuất kho cho đơn ORD-2608-001', 2, datetime(2026, 8, 22, 10, 0))
    ]
    cursor.executemany(query_product_warehouse_transactions, data_product_warehouse_transactions)

    query_inventory_reservations = "INSERT INTO `inventory_reservations` (`idempotency_key`, `order_id`, `order_item_id`, `lot_id`, `lot_code`, `quantity`, `unit`, `status`, `expires_at`, `confirmed_at`, `released_at`, `reason`, `created_by`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_inventory_reservations = [
        ('seed-order-1-item-1', 1, 1, 1, 'LOT-GAO-DT8-2026A', 2000, 'KG', 'CONFIRMED', datetime(2026, 8, 22, 10, 30), datetime(2026, 8, 22, 10, 0), None, 'Đã xác nhận cùng đơn hàng mẫu', 2, datetime(2026, 8, 22, 9, 30), datetime(2026, 8, 22, 10, 0))
    ]
    cursor.executemany(query_inventory_reservations, data_inventory_reservations)

    # KHÔNG IMPORT PROCESSED EVENTS
    query_processed_events = "INSERT INTO `processed_events` (`event_id`, `processed_at`) VALUES (%s, %s)"
    data_processed_events = []
    cursor.executemany(query_processed_events, data_processed_events)
    
    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()

def import_marketplace_db():
    logging.info('Importing data for marketplace_db...')
    conn = get_connection('marketplace_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
    
    # Idempotency key là dữ liệu kỹ thuật và phải để trống.
    query_idempotency_keys = "INSERT INTO `idempotency_keys` (`key_value`, `endpoint`, `response_body`, `response_status`, `created_at`, `expires_at`) VALUES (%s, %s, %s, %s, %s, %s)"
    cursor.executemany(query_idempotency_keys, [])

    # Audit row này phản ánh đúng order seed phía dưới, không dùng làm idempotency key.
    query_marketplace_order_audit_logs = "INSERT INTO `marketplace_order_audit_logs` (`entity_type`, `entity_id`, `operation`, `performed_by`, `performed_at`, `snapshot_data_json`, `reason`, `ip_address`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    data_marketplace_order_audit_logs = [
        ('ORDER', 1, 'PAYMENT_VERIFIED', 1, datetime(2026, 8, 22, 10, 0), '{"orderCode":"ORD-2608-001","status":"COMPLETED","paymentStatus":"VERIFIED"}', 'Đối soát chứng từ chuyển khoản thành công', '127.0.0.1')
    ]
    cursor.executemany(query_marketplace_order_audit_logs, data_marketplace_order_audit_logs)

    # Data for marketplace_products
    query_marketplace_products = "INSERT INTO `marketplace_products` (`version`, `slug`, `name`, `category`, `short_description`, `description`, `price`, `unit`, `stock_quantity`, `shipping_weight_kg_per_unit`, `is_perishable`, `requires_cold_chain`, `image_url`, `image_urls_json`, `farmer_user_id`, `farmer_display_name`, `farm_id`, `farm_name`, `farm_region`, `season_id`, `season_name`, `lot_id`, `lot_code`, `lot_warehouse_name`, `lot_storage_location`, `lot_harvest_date`, `lot_received_at`, `lot_grade`, `lot_initial_quantity`, `plot_id`, `plot_name`, `plot_area`, `crop_name`, `catalog_snapshot`, `traceable`, `average_rating`, `rating_count`, `status`, `published_at`, `status_reason`, `status_changed_at`, `status_changed_by_user_id`, `created_at`, `updated_at`, `compliance_claim`, `certification_snapshot_json`, `harvest_safety_snapshot_json`, `compliance_checked_at`, `allows_pre_order`, `earliest_fulfillment_date`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_marketplace_products = [
        (1, 'gao-dai-thom-8-vietgap', 'Gạo Đài Thơm 8 - VietGAP', 'GẠO & NGŨ CỐC', 'Gạo sạch nguyên cám, truy xuất nguồn gốc rõ ràng.', 'Trồng tại vùng lúa sinh thái Đồng Tháp, kiểm soát dư lượng BVTV nghiêm ngặt.', 18500.00, 'KG', 32500, 1.0, 0, 0, 'http://example.com/gao-dt8.jpg', '["http://example.com/gao-dt8-1.jpg","http://example.com/gao-dt8-2.jpg"]', 2, 'Nguyen Van Farmer', 1, 'HTX Nông Nghiệp Xanh Đồng Tháp', 'Đồng Tháp', 1, SEED_SEASON_NAME, 1, 'LOT-GAO-DT8-2026A', 'Kho Gạo Thành Phẩm', 'Khu Thành Phẩm / A / Kệ Gạo / 01', SEED_HARVESTED_AT, SEED_WAREHOUSE_RECEIVED_AT, 'GRADE_A', SEED_ACTUAL_YIELD_KG, 1, 'Lô A1 - Cánh Đồng Mẫu Lớn', 5.0, 'Lúa Nước', '{"cropId":1,"crop":"Lúa Nước","varietyId":1,"variety":"Đài Thơm 8"}', 1, 4.8, 12, 'PUBLISHED', datetime(2026, 8, 21, 12, 0), 'Đạt VietGAP và PHI tại thời điểm công bố', datetime(2026, 8, 21, 12, 0), 2, datetime(2026, 8, 21, 11, 30), datetime(2026, 8, 22, 10, 0), 'VIETGAP', '{"standardCode":"VIETGAP-PLANTING-2026","status":"PUBLISHED","certificateNumber":"VGP-DT-2026-001","expiryDate":"2028-01-10"}', '{"safe":true,"totalRecords":1,"verifiedRecords":1,"violations":0,"usage":[{"pesticideName":"Amistar Top 325SC","applicationDate":"2026-07-01","harvestAllowedDate":"2026-07-15","status":"SAFE"}]}', datetime(2026, 8, 21, 12, 0), 0, SEED_HARVEST_DATE)
    ]
    cursor.executemany(query_marketplace_products, data_marketplace_products)

    query_marketplace_product_images = "INSERT INTO `marketplace_product_images` (`product_id`, `image_url`, `display_order`, `created_at`) VALUES (%s, %s, %s, %s)"
    data_marketplace_product_images = [
        (1, 'http://example.com/gao-dt8-1.jpg', 1, datetime(2026, 8, 21, 11, 30)),
        (1, 'http://example.com/gao-dt8-2.jpg', 2, datetime(2026, 8, 21, 11, 31))
    ]
    cursor.executemany(query_marketplace_product_images, data_marketplace_product_images)

    query_marketplace_addresses = "INSERT INTO `marketplace_addresses` (`user_id`, `full_name`, `phone`, `province`, `district`, `ward`, `street`, `detail`, `label`, `is_default`, `created_at`, `updated_at`, `deleted_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_marketplace_addresses = [
        (4, 'Tran Thi Buyer', '0988777666', 'Hồ Chí Minh', 'Quận 7', 'Tân Phú', 'Đường Nguyễn Lương Bằng', 'Kho nhận hàng số 12, Khu chế xuất Tân Thuận', 'work', 1, datetime(2026, 8, 21, 10, 0), datetime(2026, 8, 21, 10, 0), None)
    ]
    cursor.executemany(query_marketplace_addresses, data_marketplace_addresses)

    query_marketplace_carts = "INSERT INTO `marketplace_carts` (`user_id`, `created_at`, `updated_at`) VALUES (%s, %s, %s)"
    data_marketplace_carts = [
        (4, datetime(2026, 8, 21, 11, 0), datetime(2026, 8, 21, 11, 30))
    ]
    cursor.executemany(query_marketplace_carts, data_marketplace_carts)

    query_marketplace_cart_items = "INSERT INTO `marketplace_cart_items` (`cart_id`, `product_id`, `farmer_user_id`, `lot_id`, `lot_code`, `product_name_snapshot`, `product_slug_snapshot`, `image_url_snapshot`, `quantity`, `unit_price_snapshot`, `unit_snapshot`, `traceable_snapshot`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_marketplace_cart_items = [
        (1, 1, 2, 1, 'LOT-GAO-DT8-2026A', 'Gạo Đài Thơm 8 - VietGAP', 'gao-dai-thom-8-vietgap', 'http://example.com/gao-dt8.jpg', 5, 18500.00, 'KG', 1, datetime(2026, 8, 21, 11, 5), datetime(2026, 8, 21, 11, 30))
    ]
    cursor.executemany(query_marketplace_cart_items, data_marketplace_cart_items)

    query_marketplace_order_groups = "INSERT INTO `marketplace_order_groups` (`group_code`, `buyer_user_id`, `idempotency_key`, `total_amount`, `status`, `request_fingerprint`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_marketplace_order_groups = [
        ('GRP-2608-001', 4, 'seed-checkout-20260822-001', 37500000.00, 'COMPLETED', 'seed-fingerprint-order-group-001', datetime(2026, 8, 22, 9, 0))
    ]
    cursor.executemany(query_marketplace_order_groups, data_marketplace_order_groups)

    # Data for marketplace_orders
    query_marketplace_orders = "INSERT INTO `marketplace_orders` (`order_group_id`, `order_code`, `buyer_user_id`, `farmer_user_id`, `farm_id`, `status`, `payment_method`, `payment_verification_status`, `payment_proof_file_name`, `payment_proof_content_type`, `payment_proof_storage_path`, `payment_proof_uploaded_at`, `payment_verified_at`, `payment_verified_by_user_id`, `payment_verification_note`, `shipping_recipient_name`, `shipping_phone`, `shipping_address_line`, `note`, `subtotal`, `shipping_fee`, `shipping_quote_id`, `shipping_weight_kg`, `shipping_provider_id`, `shipping_origin_province`, `shipping_destination_province`, `total_amount`, `created_at`, `updated_at`, `is_pre_order`, `requested_delivery_date`, `harvest_ready_date`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_marketplace_orders = [
        (1, 'ORD-2608-001', 4, 2, 1, 'COMPLETED', 'BANK_TRANSFER', 'VERIFIED', 'ck-luongthuc.png', 'image/png', '/proofs/2026/08/ck-luongthuc.png', datetime(2026, 8, 22, 9, 15), datetime(2026, 8, 22, 10, 0), 1, 'Đã nhận đủ tiền đơn hàng', 'Tran Thi Buyer', '0988777666', 'Kho số 12, Quận 7, Hồ Chí Minh', 'Giao xe tải và đối chiếu mã lô', 37000000.00, 500000.00, '11111111-1111-4111-8111-111111111111', 2000.0, 1, 'Đồng Tháp', 'Hồ Chí Minh', 37500000.00, datetime(2026, 8, 22, 9, 0), datetime(2026, 8, 24, 16, 0), 0, date(2026, 8, 24), date(2026, 8, 21))
    ]
    cursor.executemany(query_marketplace_orders, data_marketplace_orders)

    query_marketplace_order_items = "INSERT INTO `marketplace_order_items` (`order_id`, `product_id`, `farmer_user_id`, `product_name_snapshot`, `product_slug_snapshot`, `image_url_snapshot`, `unit_price_snapshot`, `unit_snapshot`, `quantity`, `line_total`, `traceable_snapshot`, `farm_id`, `season_id`, `lot_id`, `farm_name`, `season_name`, `lot_code`, `lot_warehouse_name`, `lot_storage_location`, `lot_harvest_date`, `lot_received_at`, `lot_grade`, `lot_initial_quantity`, `plot_id`, `plot_name`, `plot_area`, `crop_name`, `published_at_snapshot`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_marketplace_order_items = [
        (1, 1, 2, 'Gạo Đài Thơm 8 - VietGAP', 'gao-dai-thom-8-vietgap', 'http://example.com/gao-dt8.jpg', 18500.00, 'KG', 2000, 37000000.00, 1, 1, 1, 1, 'HTX Nông Nghiệp Xanh Đồng Tháp', SEED_SEASON_NAME, 'LOT-GAO-DT8-2026A', 'Kho Gạo Thành Phẩm', 'Khu Thành Phẩm / A / Kệ Gạo / 01', SEED_HARVESTED_AT, SEED_WAREHOUSE_RECEIVED_AT, 'GRADE_A', SEED_ACTUAL_YIELD_KG, 1, 'Lô A1 - Cánh Đồng Mẫu Lớn', 5.0, 'Lúa Nước', datetime(2026, 8, 21, 12, 0), datetime(2026, 8, 22, 9, 0))
    ]
    cursor.executemany(query_marketplace_order_items, data_marketplace_order_items)

    query_marketplace_product_reviews = "INSERT INTO `marketplace_product_reviews` (`product_id`, `order_id`, `order_item_id`, `buyer_user_id`, `buyer_display_name`, `rating`, `comment`, `hidden`, `hidden_reason`, `hidden_at`, `hidden_by_user_id`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_marketplace_product_reviews = [
        (1, 1, 1, 4, 'Tran Thi Buyer', 5, 'Lô hàng đúng truy xuất, chất lượng đồng đều và giao đủ số lượng.', 0, None, None, None, datetime(2026, 8, 24, 17, 0), datetime(2026, 8, 24, 17, 0))
    ]
    cursor.executemany(query_marketplace_product_reviews, data_marketplace_product_reviews)

    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()


def import_delivery_db():
    logging.info('Importing data for delivery_db...')
    conn = get_connection('delivery_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')

    query_delivery_providers = "INSERT INTO `delivery_providers` (`code`, `name`, `supports_cold_chain`, `supports_same_day`, `is_active`, `api_endpoint`, `api_key`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    data_delivery_providers = [
        ('AGRELI_DEMO', 'Đội giao vận AgReli Demo', 1, 0, 1, 'https://sandbox.delivery.agreli.local/api', 'DEMO-NOT-A-REAL-KEY', datetime(2026, 1, 1, 8, 0)),
        ('GHTK_DEMO', 'Giao hàng tiết kiệm Demo', 0, 1, 1, 'https://sandbox.ghtk.local/api', 'DEMO-NOT-A-REAL-KEY', datetime(2026, 1, 1, 8, 0))
    ]
    cursor.executemany(query_delivery_providers, data_delivery_providers)

    query_delivery_rates = "INSERT INTO `delivery_rates` (`provider_id`, `zone_from`, `zone_to`, `weight_min_kg`, `weight_max_kg`, `base_rate_vnd`, `per_kg_vnd`, `estimated_hours`, `is_cold_chain`, `cold_chain_fee_vnd`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_delivery_rates = [
        (1, 'Đồng Tháp', 'Hồ Chí Minh', 0, 5000, 500000.00, 0.00, 48, 0, 0.00),
        (1, 'Đồng Tháp', 'Hồ Chí Minh', 0, 5000, 750000.00, 0.00, 36, 1, 250000.00),
        (2, 'Đồng Tháp', 'Đồng Tháp', 0, 100, 30000.00, 5000.00, 24, 0, 0.00)
    ]
    cursor.executemany(query_delivery_rates, data_delivery_rates)

    query_shipping_quotes = "INSERT INTO `shipping_quotes` (`quote_id`, `buyer_user_id`, `seller_user_id`, `farm_id`, `provider_id`, `service_type`, `sender_province`, `recipient_province`, `weight_kg`, `is_perishable`, `requires_cold_chain`, `shipping_fee_vnd`, `estimated_hours`, `expires_at`, `consumed_at`, `marketplace_order_id`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_shipping_quotes = [
        ('11111111-1111-4111-8111-111111111111', 4, 2, 1, 1, 'STANDARD', 'Đồng Tháp', 'Hồ Chí Minh', 2000.0, 0, 0, 500000.00, 48, datetime(2026, 8, 22, 10, 0), datetime(2026, 8, 22, 9, 0), 1, datetime(2026, 8, 22, 8, 45))
    ]
    cursor.executemany(query_shipping_quotes, data_shipping_quotes)

    query_delivery_orders = "INSERT INTO `delivery_orders` (`marketplace_order_id`, `shipping_quote_id`, `buyer_user_id`, `provider_id`, `tracking_number`, `status`, `shipping_fee_vnd`, `estimated_delivery`, `actual_delivery`, `is_perishable`, `requires_cold_chain`, `recipient_name`, `recipient_phone`, `recipient_address`, `recipient_province`, `weight_kg`, `created_at`, `updated_at`, `requested_delivery_date`, `delivery_zone_to`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_delivery_orders = [
        (1, '11111111-1111-4111-8111-111111111111', 4, 1, 'AGR-DEL-2608-001', 'DELIVERED', 500000.00, datetime(2026, 8, 24, 17, 0), datetime(2026, 8, 24, 15, 30), 0, 0, 'Tran Thi Buyer', '0988777666', 'Kho số 12, Quận 7, Hồ Chí Minh', 'Hồ Chí Minh', 2000.0, datetime(2026, 8, 22, 9, 5), datetime(2026, 8, 24, 15, 30), date(2026, 8, 24), 'HCM_NOI_DO')
    ]
    cursor.executemany(query_delivery_orders, data_delivery_orders)

    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()


def import_season_db():
    logging.info('Importing data for season_db...')
    conn = get_connection('season_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')

    # Data for pesticide_phi_reference
    query_pesticide_phi_reference = "INSERT INTO `pesticide_phi_reference` (`active_ingredient`, `pesticide_name`, `phi_days`, `mrl_mg_per_kg`, `crop_type`, `source`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_pesticide_phi_reference = [
        ('Azoxystrobin', 'Amistar Top 325SC, Amistar', 14, 0.0100, 'rice', 'CODEX CXL', datetime(2026, 1, 1, 8, 0)),
        ('Difenoconazole', 'Score 250EC, Amistar Top 325SC', 14, 0.1000, 'rice', 'CODEX CXL', datetime(2026, 1, 1, 8, 0)),
        ('Fenobucarb', 'Bassa 50EC', 14, 0.5000, 'rice', 'EPA/CODEX', datetime(2026, 1, 1, 8, 0)),
        ('Cartap', 'Padan 95SP', 7, 0.1000, 'rice', 'EPA/CODEX', datetime(2026, 1, 1, 8, 0)),
        ('Abamectin', 'Vertimec 1.8EC', 14, 0.0200, 'vegetable', 'CODEX CXL', datetime(2026, 1, 1, 8, 0)),
        ('Copper hydroxide', 'Kocide 77WP', 0, 5.0000, 'general', 'EPA/CODEX', datetime(2026, 1, 1, 8, 0))
    ]
    cursor.executemany(query_pesticide_phi_reference, data_pesticide_phi_reference)
    
    # Data for seasons
    query_seasons = "INSERT INTO `seasons` (`season_name`, `plot_id`, `crop_id`, `variety_id`, `start_date`, `planned_harvest_date`, `end_date`, `status`, `initial_plant_count`, `current_plant_count`, `expected_yield_kg`, `actual_yield_kg`, `budget_amount`, `notes`, `created_at`, `owner_user_id`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_seasons = [
        (SEED_SEASON_NAME, 1, 1, 1, SEED_SEASON_START_DATE, SEED_PLANNED_HARVEST_DATE, SEED_SEASON_END_DATE, SEED_SEASON_STATUS, 500000, 485000, SEED_EXPECTED_YIELD_KG, SEED_ACTUAL_YIELD_KG, 50000000.00, 'Đã thu hoạch đủ 100%; mọi công việc đã nghiệm thu; chờ Farmer xác nhận kết thúc mùa vụ.', SEED_SEASON_CREATED_AT, 2)
    ]
    cursor.executemany(query_seasons, data_seasons)

    query_season_employees = "INSERT INTO `season_employees` (`season_id`, `employee_user_id`, `active`, `created_at`, `wage_per_task`, `added_by_user_id`, `employee_username`, `employee_full_name`, `employee_email`, `is_trained`, `trained_at`, `training_notes`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_season_employees = [
        (1, 3, 1, datetime(2026, 4, 10, 9, 0), 150000.00, 2, 'employee', 'Nguyen Van Employee', 'employee@acm.local', 1, datetime(2026, 4, 16, 16, 0), 'Đã hoàn tất hai chương trình bắt buộc; cờ này chỉ là projection.')
    ]
    cursor.executemany(query_season_employees, data_season_employees)

    query_work_teams = "INSERT INTO `work_teams` (`season_id`, `team_name`, `team_leader_user_id`, `created_at`) VALUES (%s, %s, %s, %s)"
    data_work_teams = [
        (1, 'Đội nông vụ Lô A1', 3, datetime(2026, 4, 10, 9, 30))
    ]
    cursor.executemany(query_work_teams, data_work_teams)

    query_work_team_members = "INSERT INTO `work_team_members` (`work_team_id`, `employee_user_id`, `role`) VALUES (%s, %s, %s)"
    data_work_team_members = [
        (1, 3, 'LEADER')
    ]
    cursor.executemany(query_work_team_members, data_work_team_members)

    query_training_programs = "INSERT INTO `training_programs` (`title`, `category`, `description`, `is_mandatory`, `created_at`) VALUES (%s, %s, %s, %s, %s)"
    data_training_programs = [
        ('An toàn sử dụng thuốc BVTV', 'SAFETY', 'Sử dụng, bảo quản và xử lý bao bì thuốc BVTV theo VietGAP', 1, datetime(2026, 4, 1, 8, 0)),
        ('Quy trình phân loại và thu hoạch', 'OPERATIONS', 'Thu hoạch, phân loại, đóng gói và bàn giao kho có truy xuất', 1, datetime(2026, 4, 1, 8, 5))
    ]
    cursor.executemany(query_training_programs, data_training_programs)

    query_employee_training_records = "INSERT INTO `employee_training_records` (`user_id`, `work_team_id`, `training_program_id`, `trained_at`, `trainer_name`, `evidence_urls`, `certified_until`, `status`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_employee_training_records = [
        (3, 1, 1, date(2026, 4, 15), 'Trung tâm Khuyến nông Đồng Tháp', '["http://example.com/evidence/training/user-3-safety.pdf"]', date(2028, 4, 15), 'COMPLETED', datetime(2026, 4, 15, 16, 0), datetime(2026, 4, 15, 16, 0)),
        (3, 1, 2, date(2026, 4, 16), 'HTX Nông Nghiệp Xanh', '["http://example.com/evidence/training/user-3-operations.pdf"]', date(2028, 4, 16), 'COMPLETED', datetime(2026, 4, 16, 16, 0), datetime(2026, 4, 16, 16, 0))
    ]
    cursor.executemany(query_employee_training_records, data_employee_training_records)
    
    # Data for tasks
    query_tasks = "INSERT INTO `tasks` (`user_id`, `season_id`, `title`, `description`, `planned_date`, `due_date`, `status`, `actual_start_date`, `actual_end_date`, `notes`, `created_at`, `assignee_name`, `plot_name`, `work_team_id`, `estimated_days`, `plot_id`, `plot_area`, `base_wage`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_tasks = [
        (3, 1, 'Làm đất và gieo sạ', 'Cày ải, bừa trục và gieo sạ bằng máy', date(2026, 4, 20), date(2026, 4, 22), 'DONE', date(2026, 4, 20), date(2026, 4, 21), 'Mật độ sạ 100 kg/ha; đã được Farmer nghiệm thu', datetime(2026, 4, 19, 8, 0), 'Nguyen Van Employee', 'Lô A1 - Cánh Đồng Mẫu Lớn', 1, 2, 1, 5.0, 150000.00),
        (3, 1, 'Bón phân thúc đợt 1', 'Bón Ure theo khuyến nghị dinh dưỡng', date(2026, 4, 29), date(2026, 4, 30), 'DONE', date(2026, 4, 29), date(2026, 4, 29), 'Đã hoàn thành và được Farmer nghiệm thu', datetime(2026, 4, 19, 8, 5), 'Nguyen Van Employee', 'Lô A1 - Cánh Đồng Mẫu Lớn', 1, 1, 1, 5.0, 150000.00)
    ]
    cursor.executemany(query_tasks, data_tasks)

    query_task_progress_logs = "INSERT INTO `task_progress_logs` (`task_id`, `employee_user_id`, `logged_at`, `progress_percent`, `note`, `evidence_url`) VALUES (%s, %s, %s, %s, %s, %s)"
    data_task_progress_logs = [
        (1, 3, datetime(2026, 4, 21, 17, 0), 100, 'Hoàn thành làm đất và gieo sạ đúng mật độ', 'http://example.com/evidence/tasks/task-1-completed.jpg'),
        (2, 3, datetime(2026, 4, 29, 17, 0), 100, 'Đã bón đủ lượng Ure theo kế hoạch và được nghiệm thu', 'http://example.com/evidence/tasks/task-2-completed.jpg')
    ]
    cursor.executemany(query_task_progress_logs, data_task_progress_logs)

    query_payroll_records = "INSERT INTO `payroll_records` (`employee_user_id`, `season_id`, `period_start`, `period_end`, `total_amount`, `generated_at`, `total_assigned_tasks`, `total_completed_tasks`, `wage_per_task`, `note`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_payroll_records = [
        (3, 1, date(2026, 4, 1), date(2026, 4, 30), 300000.00, datetime(2026, 4, 30, 17, 5), 2, 2, 150000.00, 'Cả hai task đã DONE, được Farmer nghiệm thu và tính lương đầy đủ.')
    ]
    cursor.executemany(query_payroll_records, data_payroll_records)

    query_field_logs = "INSERT INTO `field_logs` (`season_id`, `log_date`, `log_type`, `created_at`, `notes`, `created_by_user_id`) VALUES (%s, %s, %s, %s, %s, %s)"
    data_field_logs = [
        (1, date(2026, 4, 21), 'SEEDING', datetime(2026, 4, 21, 17, 0), 'Gieo giống Đài Thơm 8, seed lot DT8-2026-04, mật độ 100 kg/ha', 3),
        (1, date(2026, 4, 29), 'FERTILIZER_APPLICATION', datetime(2026, 4, 29, 17, 0), 'Bón 100 kg Ure cho toàn bộ Lô A1; supply lot BATCH-URE-202604', 3),
        (1, date(2026, 5, 18), 'PESTICIDE_APPLICATION', datetime(2026, 5, 18, 17, 0), 'Phun Padan 95SP (Cartap) 0,6 kg/ha phòng sâu cuốn lá; PHI 7 ngày.', 3),
        (1, date(2026, 6, 10), 'PESTICIDE_APPLICATION', datetime(2026, 6, 10, 17, 0), 'Phun Bassa 50EC (Fenobucarb) 1,0 L/ha kiểm soát rầy nâu; PHI 14 ngày.', 3),
        (1, date(2026, 7, 1), 'PESTICIDE_APPLICATION', datetime(2026, 7, 1, 17, 0), 'Phun Amistar Top 325SC; PHI 14 ngày; supply lot BATCH-AMI-202607', 3),
        (1, SEED_HARVEST_DATE, 'HARVEST', SEED_HARVESTED_AT, 'Thu hoạch đủ 34.500 kg, đạt 100% kế hoạch; đã phân loại và bàn giao kho.', 3)
    ]
    cursor.executemany(query_field_logs, data_field_logs)

    # Data for disease_records
    query_disease_records = "INSERT INTO `disease_records` (`season_id`, `plot_id`, `crop_id`, `variety_id`, `reported_by_user_id`, `incident_id`, `disease_name`, `symptom_summary`, `severity`, `status`, `detected_at`, `affected_plant_count`, `affected_area_value`, `affected_area_unit`, `evidence_url`, `notes`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_disease_records = [
        (1, 1, 1, 1, 3, 1, 'Bệnh Đạo Ôn (Pyricularia oryzae)', 'Vết bệnh hình thoi hoặc mắt én, tâm xám trắng trên lá non', 'MEDIUM', 'TREATED', datetime(2026, 6, 30, 7, 30), 120, 500, 'M2', 'http://example.com/disease/dao-on.jpg', 'Phát hiện sớm vùng rìa ruộng, lây lan chậm', datetime(2026, 6, 30, 8, 0), datetime(2026, 7, 5, 16, 0))
    ]
    cursor.executemany(query_disease_records, data_disease_records)

    query_disease_treatments = "INSERT INTO `disease_treatments` (`disease_record_id`, `treated_at`, `method`, `supply_item_id`, `supply_lot_id`, `material_name`, `quantity_used`, `unit`, `cost_amount`, `expense_id`, `effectiveness`, `result_summary`, `next_review_at`, `notes`, `created_by_user_id`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_disease_treatments = [
        (1, datetime(2026, 7, 1, 6, 30), 'Phun bằng drone theo vùng ảnh hưởng', 2, 2, 'Amistar Top 325SC', 1.5, 'L', 1400000.00, 2, 'GOOD', 'Vết bệnh ngừng lan sau 4 ngày, không phát hiện ổ mới', date(2026, 7, 6), 'Tuân thủ liều lượng và PHI 14 ngày', 3, datetime(2026, 7, 1, 17, 0), datetime(2026, 7, 5, 16, 0))
    ]
    cursor.executemany(query_disease_treatments, data_disease_treatments)

    # Data for pesticide_records (Nhật ký phun thuốc)
    query_pesticide_records = "INSERT INTO `pesticide_records` (`season_id`, `plot_id`, `field_log_id`, `pesticide_name`, `active_ingredient`, `phi_days`, `application_date`, `application_method`, `dosage`, `target_pest`, `note`, `created_by`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_pesticide_records = [
        (1, 1, 3, 'Padan 95SP', 'Cartap', 7, date(2026, 5, 18), 'Phun bằng bình động cơ', '0.6 kg/ha', 'Sâu cuốn lá nhỏ', 'Phun theo ngưỡng gây hại; ngày được phép thu hoạch 2026-05-25', 3, datetime(2026, 5, 18, 17, 0), datetime(2026, 5, 18, 17, 0)),
        (1, 1, 4, 'Bassa 50EC', 'Fenobucarb', 14, date(2026, 6, 10), 'Phun áp lực thấp', '1.0 L/ha', 'Rầy nâu', 'Phun tập trung phần gốc lúa; ngày được phép thu hoạch 2026-06-24', 3, datetime(2026, 6, 10, 17, 0), datetime(2026, 6, 10, 17, 0)),
        (1, 1, 5, 'Amistar Top 325SC', 'Azoxystrobin + Difenoconazole', 14, date(2026, 7, 1), 'Phun bằng drone nông nghiệp', '0.3 L/ha', 'Bệnh đạo ôn lá', 'Phun lúc trời mát, không mưa; ngày được phép thu hoạch 2026-07-15', 3, datetime(2026, 7, 1, 17, 0), datetime(2026, 7, 1, 17, 0))
    ]
    cursor.executemany(query_pesticide_records, data_pesticide_records)

    # Data for harvests
    query_harvests = "INSERT INTO `harvests` (`season_id`, `harvest_date`, `quantity`, `unit`, `grade`, `note`, `created_at`, `warehouse_received_date`, `warehouse_receipt_status`, `gross_wet_weight`, `net_dry_weight`, `quality_grade`, `quality_notes`, `sub_standard_quantity`, `sub_standard_disposition`, `packaging_type`, `packaging_count`, `processing_type`, `crop_category`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_harvests = [
        (1, SEED_HARVEST_DATE, SEED_ACTUAL_YIELD_KG, 1, 'A', 'Thu hoạch bằng máy gặt đập liên hợp; hoàn thành 100% kế hoạch.\n\n[harvest-metadata]\nharvestPlotId=1\nmoisturePercent=14.0\npurityPercent=98.5\nforeignMatterPercent=0.8\nbrokenGrainsPercent=2.0\nharvestLossPercent=1.25\ncropResidueHandling=USED_AS_FEED_OR_COMPOST', SEED_HARVESTED_AT, SEED_WAREHOUSE_RECEIVED_AT.date(), 'RECEIVED', 40000, SEED_ACTUAL_YIELD_KG, 'PASSED', 'Hạt mẩy, vàng sáng; độ ẩm sau sấy 14%; độ tinh khiết 98,5%; tạp chất 0,8%.', 500, 'COMPOSTING', 'BULK_BAG', 690, 'DRIED', 'GRAIN')
    ]
    cursor.executemany(query_harvests, data_harvests)
    verify_current_season_ready_to_complete(cursor)

    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()

def import_sustainability_db():
    logging.info('Importing data for sustainability_db...')
    conn = get_connection('sustainability_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
    
    # Data for soil_tests
    query_soil_tests = "INSERT INTO `soil_tests` (`season_id`, `plot_id`, `sample_date`, `soil_ph`, `electrical_conductivity_ds_m`, `soil_organic_matter_pct`, `mineral_n_kg_per_ha`, `nitrate_mg_per_kg`, `ammonium_mg_per_kg`, `legacy_n_contribution_kg`, `legacy_event_id`, `legacy_derived`, `measured`, `source_type`, `source_document`, `lab_reference`, `note`, `created_by_user_id`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_soil_tests = [
        (1, 1, date(2026, 4, 5), 6.2, 0.42, 3.5, 45.0, 15.5, 20.2, 10.0, None, 0, 1, 'LAB_MEASURED', None, 'LAB-2604-001', 'Đất thịt nhẹ, pH 6.2 khá tốt', 2, datetime(2026, 4, 10, 9, 0))
    ]
    cursor.executemany(query_soil_tests, data_soil_tests)

    # Data for irrigation_water_analyses
    query_irrigation_water_analyses = "INSERT INTO `irrigation_water_analyses` (`season_id`, `plot_id`, `sample_date`, `nitrate_mg_per_l`, `ammonium_mg_per_l`, `total_n_mg_per_l`, `irrigation_volume_m3`, `legacy_n_contribution_kg`, `legacy_event_id`, `legacy_derived`, `measured`, `source_type`, `source_document`, `lab_reference`, `note`, `created_by_user_id`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_irrigation_water_analyses = [
        (1, 1, date(2026, 4, 7), 2.1, 0.5, 2.6, 5000, 13.0, None, 0, 1, 'LAB_MEASURED', 'http://example.com/test/water_a1.pdf', 'LAB-WATER-2604', 'Mẫu lấy từ kênh chính dẫn vào lô', 2, datetime(2026, 4, 12, 9, 0))
    ]
    cursor.executemany(query_irrigation_water_analyses, data_irrigation_water_analyses)

    query_nutrient_input_events = "INSERT INTO `nutrient_input_events` (`season_id`, `plot_id`, `input_source`, `n_kg`, `applied_date`, `measured`, `data_source`, `source_type`, `source_document`, `note`, `created_by_user_id`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_nutrient_input_events = [
        (1, 1, 'MINERAL_FERTILIZER', 46.0, date(2026, 4, 29), 1, 'FIELD_LOG:2', 'USER_ENTERED', 'http://example.com/evidence/fertilizer/batch-ure-202604.pdf', '100 kg Ure 46% N cho Lô A1', 3, datetime(2026, 4, 29, 17, 5))
    ]
    cursor.executemany(query_nutrient_input_events, data_nutrient_input_events)

    query_crop_snapshots = "INSERT INTO `crop_snapshots` (`crop_id`, `crop_name`, `description`, `n_content_kg_per_kg_yield`, `snapshot_at`) VALUES (%s, %s, %s, %s, %s)"
    data_crop_snapshots = [
        (1, 'Lúa Nước', 'Cây lương thực chủ đạo, lưu snapshot để báo cáo không phụ thuộc catalog hiện tại', 0.01500000, SEED_SEASON_CREATED_AT)
    ]
    cursor.executemany(query_crop_snapshots, data_crop_snapshots)

    query_farm_snapshots = "INSERT INTO `farm_snapshots` (`farm_id`, `user_id`, `farm_name`, `province_id`, `province_name`, `ward_id`, `ward_name`, `area`, `latitude`, `longitude`, `snapshot_at`, `active`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_farm_snapshots = [
        (1, 2, 'HTX Nông Nghiệp Xanh Đồng Tháp', 87, 'Đồng Tháp', 871, 'Tháp Mười', 50.5, 10.456000, 105.812000, SEED_SEASON_CREATED_AT, 1),
        (2, 2, 'Nông Trại Cà Phê Chư Sê', 66, 'Đắk Lắk', 661, 'Cư M\'gar', 20.0, 12.666000, 108.033000, SEED_SEASON_CREATED_AT, 1)
    ]
    cursor.executemany(query_farm_snapshots, data_farm_snapshots)

    query_plot_snapshots = "INSERT INTO `plot_snapshots` (`plot_id`, `farm_id`, `plot_name`, `area`, `soil_type`, `boundary_geojson`, `status`, `snapshot_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    data_plot_snapshots = [
        (1, 1, 'Lô A1 - Cánh Đồng Mẫu Lớn', 5.0, 'Đất phù sa', '{"type":"Polygon","coordinates":[[[105.8,10.4],[105.9,10.4],[105.9,10.5],[105.8,10.5],[105.8,10.4]]]}', 'ACTIVE', SEED_SEASON_CREATED_AT),
        (2, 2, 'Lô B1 - Cà Phê Năm 4', 2.0, 'Đất đỏ bazan', '{"type":"Polygon","coordinates":[[[108.0,12.6],[108.1,12.6],[108.1,12.7],[108.0,12.7],[108.0,12.6]]]}', 'ACTIVE', SEED_SEASON_CREATED_AT)
    ]
    cursor.executemany(query_plot_snapshots, data_plot_snapshots)

    query_season_snapshots = "INSERT INTO `season_snapshots` (`season_id`, `season_name`, `plot_id`, `farm_id`, `crop_id`, `variety_id`, `start_date`, `planned_harvest_date`, `end_date`, `status`, `initial_plant_count`, `current_plant_count`, `expected_yield_kg`, `actual_yield_kg`, `budget_amount`, `notes`, `snapshot_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_season_snapshots = [
        (1, SEED_SEASON_NAME, 1, 1, 1, 1, SEED_SEASON_START_DATE, SEED_PLANNED_HARVEST_DATE, SEED_SEASON_END_DATE, SEED_SEASON_STATUS, 500000, 485000, SEED_EXPECTED_YIELD_KG, SEED_ACTUAL_YIELD_KG, 50000000.00, 'Đã thu hoạch 100%; chờ Farmer kết thúc mùa vụ.', datetime(2026, 8, 21, 10, 0))
    ]
    cursor.executemany(query_season_snapshots, data_season_snapshots)

    query_expense_snapshots = "INSERT INTO `expense_snapshots` (`expense_id`, `user_id`, `season_id`, `task_id`, `plot_id`, `farm_id`, `category`, `item_name`, `unit_price`, `quantity`, `total_cost`, `amount`, `payment_status`, `note`, `expense_date`, `season_name`, `plot_name`, `task_title`, `user_name`, `snapshot_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_expense_snapshots = [
        (1, 2, 1, 1, 1, 1, 'FERTILIZER', 'Phân Ure Phú Mỹ', 650000.00, 10, 6500000.00, 6500000.00, 'PAID', 'Bón thúc đợt 1', date(2026, 4, 29), SEED_SEASON_SHORT_NAME, 'Lô A1 - Cánh Đồng Mẫu Lớn', 'Làm đất và gieo sạ', 'Nguyen Van Farmer', datetime(2026, 4, 30, 8, 0))
    ]
    cursor.executemany(query_expense_snapshots, data_expense_snapshots)

    query_harvest_snapshots = "INSERT INTO `harvest_snapshots` (`harvest_id`, `season_id`, `farm_id`, `harvest_date`, `quantity`, `unit`, `grade`, `note`, `snapshot_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_harvest_snapshots = [
        (1, 1, 1, SEED_HARVEST_DATE, SEED_ACTUAL_YIELD_KG, 'KG', 'GRADE_A', 'Thu hoạch đạt 100% kế hoạch và đã nhập kho', datetime(2026, 8, 21, 10, 0))
    ]
    cursor.executemany(query_harvest_snapshots, data_harvest_snapshots)

    query_incident_snapshots = "INSERT INTO `incident_snapshots` (`incident_id`, `season_id`, `farm_id`, `reported_by_id`, `incident_type`, `severity`, `description`, `status`, `deadline`, `resolved_at`, `snapshot_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_incident_snapshots = [
        (1, 1, 1, 3, 'DISEASE', 'MEDIUM', 'Phát hiện đạo ôn và xử lý theo đúng quy trình', 'RESOLVED', date(2026, 7, 3), datetime(2026, 7, 5, 16, 0), datetime(2026, 7, 5, 16, 5))
    ]
    cursor.executemany(query_incident_snapshots, data_incident_snapshots)

    query_marketplace_order_summary = "INSERT INTO `marketplace_order_summary` (`season_id`, `order_id`, `farmer_user_id`, `revenue`, `completed_at`, `processed_at`) VALUES (%s, %s, %s, %s, %s, %s)"
    data_marketplace_order_summary = [
        (1, 1, 2, 37000000.00, datetime(2026, 8, 24, 16, 0), datetime(2026, 8, 24, 16, 1))
    ]
    cursor.executemany(query_marketplace_order_summary, data_marketplace_order_summary)

    # KHÔNG IMPORT PROCESSED EVENTS
    query_processed_events = "INSERT INTO `processed_events` (`event_id`, `processed_at`) VALUES (%s, %s)"
    cursor.executemany(query_processed_events, [])

    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()

def run_reset_and_import():
    if not audit_seed_coverage():
        raise RuntimeError('Seed coverage không hợp lệ; hủy reset trước khi dữ liệu bị xóa.')

    reset_all_databases()
    import_admin_reporting_db()
    import_crop_catalog_db()
    import_farm_db()
    import_finance_db()
    import_identity_db()
    import_incident_db()
    import_inventory_db()
    import_marketplace_db()
    import_delivery_db()
    import_season_db()
    import_sustainability_db()
    if not verify_imported_row_counts():
        raise RuntimeError('Import hoàn tất nhưng post-import verification thất bại.')
    logging.info('✅ HOÀN TẤT: Dữ liệu nghiệp vụ đã được import và xác minh cho 11 service database.')


def validate_seed_inserts():
    """Chạy toàn bộ INSERT trên temporary tables; base tables không bị thay đổi."""
    global TEMPORARY_VALIDATION_MODE
    if not audit_seed_coverage():
        return False
    TEMPORARY_VALIDATION_MODE = True
    try:
        import_admin_reporting_db()
        import_crop_catalog_db()
        import_farm_db()
        import_finance_db()
        import_identity_db()
        import_incident_db()
        import_inventory_db()
        import_marketplace_db()
        import_delivery_db()
        import_season_db()
        import_sustainability_db()
    finally:
        TEMPORARY_VALIDATION_MODE = False
    logging.info('Temporary-table insert validation PASSED; base data không thay đổi.')
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Audit hoặc reset/import bộ dữ liệu demo AgReli theo schema Flyway hiện hành.'
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        '--audit-only',
        action='store_true',
        help='Chỉ đối chiếu seed với schema; đây là chế độ mặc định và không thay đổi dữ liệu.',
    )
    mode.add_argument(
        '--reset-and-import',
        action='store_true',
        help='TRUNCATE dữ liệu nghiệp vụ rồi import lại toàn bộ seed.',
    )
    mode.add_argument(
        '--validate-inserts',
        action='store_true',
        help='Chạy INSERT trên temporary tables để kiểm tra kiểu dữ liệu mà không đổi base data.',
    )
    parser.add_argument(
        '--confirm-reset',
        help=f'Bắt buộc truyền chính xác {RESET_CONFIRMATION} khi dùng --reset-and-import.',
    )
    args = parser.parse_args()

    try:
        if args.reset_and_import:
            if args.confirm_reset != RESET_CONFIRMATION:
                parser.error(
                    f'--reset-and-import yêu cầu --confirm-reset {RESET_CONFIRMATION}'
                )
            run_reset_and_import()
        elif args.validate_inserts:
            if not validate_seed_inserts():
                raise SystemExit(1)
        else:
            if not audit_seed_coverage():
                raise SystemExit(1)
    except Exception as e:
        logging.error(f'❌ Seed command thất bại: {e}')
        raise

if __name__ == '__main__':
    main()
