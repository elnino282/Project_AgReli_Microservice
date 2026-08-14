import mysql.connector
from datetime import date
import logging
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DB_CONFIG = {
    'host': os.getenv('IMPORT_DB_HOST', 'localhost'),
    'port': int(os.getenv('IMPORT_DB_PORT', '3307')),
    'user': os.getenv('IMPORT_DB_USER', 'springuser'),
    'password': os.getenv('IMPORT_DB_PASSWORD', 'springpass')
}

def get_connection(db_name=None):
    config = DB_CONFIG.copy()
    if db_name:
        config['database'] = db_name
    return mysql.connector.connect(**config)

def reset_all_databases():
    logging.info('Bắt đầu Reset toàn bộ 10+ DBs...')
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SHOW DATABASES;')
    dbs = [row[0] for row in cursor.fetchall() if row[0].endswith('_db')]
    for db in dbs:
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

def import_admin_reporting_db():
    logging.info('Importing data for admin_reporting_db...')
    conn = get_connection('admin_reporting_db')
    cursor = conn.cursor()
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
    # Data for admin_alert_summary
    query_admin_alert_summary = "INSERT INTO `admin_alert_summary` (`alert_id`, `season_id`, `type`, `severity`, `status`) VALUES (%s, %s, %s, %s, %s)"
    data_admin_alert_summary = [
        (1, 1, 'DISEASE_WARNING', 'HIGH', 'ACTIVE'),
        (2, 1, 'WEATHER_EXTREME', 'CRITICAL', 'RESOLVED')
    ]
    cursor.executemany(query_admin_alert_summary, data_admin_alert_summary)
    
    # Data for admin_audit_log_entries - KHÔNG IMPORT (Audit Log)
    query_admin_audit_log_entries = "INSERT INTO `admin_audit_log_entries` (`entity_type`, `entity_id`, `operation`, `performed_by`, `performed_at`, `snapshot_data`, `reason`, `ip_address`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    data_admin_audit_log_entries = []
    cursor.executemany(query_admin_audit_log_entries, data_admin_audit_log_entries)
    
    # Data for admin_documents
    query_admin_documents = "INSERT INTO `admin_documents` (`title`, `url`, `description`, `crop`, `stage`, `topic`, `is_active`, `is_public`, `created_by`, `document_type`, `view_count`, `is_pinned`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_admin_documents = [
        ('Quy trình canh tác lúa Đài Thơm 8 chuẩn VietGAP', 'http://example.com/docs/vietgap-lua.pdf', 'Hướng dẫn chi tiết từ khâu làm đất đến thu hoạch', 'Lúa', 'Toàn bộ', 'Quy trình chuẩn', 1, 1, 1, 'GUIDELINE', 1540, 1, date(2026, 1, 15), date(2026, 1, 15)),
        ('Sổ tay nhận diện bệnh Đạo Ôn', 'http://example.com/docs/dao-on.pdf', 'Cách nhận biết và phòng trị bệnh đạo ôn trên lúa', 'Lúa', 'Đẻ nhánh - Trổ', 'Sâu bệnh', 1, 1, 1, 'HANDBOOK', 890, 0, date(2026, 2, 10), date(2026, 2, 10))
    ]
    cursor.executemany(query_admin_documents, data_admin_documents)
    
    # Data for admin_expense_summary
    query_admin_expense_summary = "INSERT INTO `admin_expense_summary` (`expense_id`, `season_id`, `total_cost`, `category`, `item_name`, `expense_date`) VALUES (%s, %s, %s, %s, %s, %s)"
    data_admin_expense_summary = [
        (1, 1, 4500000.00, 'FERTILIZER', 'Phân bón NPK 16-16-8', date(2026, 1, 20)),
        (2, 1, 1200000.00, 'LABOR', 'Nhân công phun thuốc', date(2026, 2, 5))
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
        (1, 1, 5500, 8500.00) # 5.5 tấn lúa tươi
    ]
    cursor.executemany(query_admin_harvest_summary, data_admin_harvest_summary)
    
    # Data for admin_incident_summary
    query_admin_incident_summary = "INSERT INTO `admin_incident_summary` (`incident_id`, `season_id`, `status`, `incident_type`, `severity`, `resolved_at`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_admin_incident_summary = [
        (1, 1, 'RESOLVED', 'PEST_OUTBREAK', 'HIGH', date(2026, 2, 28), date(2026, 2, 25))
    ]
    cursor.executemany(query_admin_incident_summary, data_admin_incident_summary)
    
    # Data for admin_inventory_lot_summary
    query_admin_inventory_lot_summary = "INSERT INTO `admin_inventory_lot_summary` (`lot_id`, `farm_id`, `farm_name`, `expiry_date`, `warehouse_id`, `warehouse_name`, `quantity_on_hand`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_admin_inventory_lot_summary = [
        (1, 1, 'HTX Nông Nghiệp Xanh Đồng Tháp', date(2027, 12, 31), 1, 'Kho Vật Tư Nông Nghiệp Số 1', 500)
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
        (1, 'ORD-2603-001', 1, 'Công ty Lương Thực Tín Nghĩa', 37000000.00, 'PAID', 'DELIVERED', date(2026, 3, 10), date(2026, 3, 9))
    ]
    cursor.executemany(query_admin_marketplace_order_summary, data_admin_marketplace_order_summary)
    
    # Data for admin_marketplace_product_summary
    query_admin_marketplace_product_summary = "INSERT INTO `admin_marketplace_product_summary` (`product_id`, `product_name`, `farm_id`, `farm_name`, `farmer_id`, `farmer_name`, `status`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    data_admin_marketplace_product_summary = [
        (1, 'Gạo Đài Thơm 8 - Chuẩn GlobalGAP', 1, 'HTX Nông Nghiệp Xanh Đồng Tháp', 1, 'Trần Văn Nông', 'PUBLISHED', date(2026, 3, 1))
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
        (1, 'Vụ Hè Thu 2026', 1, 1, 'Lúa Nước', 1, 'Đài Thơm 8', 'ACTIVE', date(2026, 6, 22), 35000, 0)
    ]
    cursor.executemany(query_admin_season_summary, data_admin_season_summary)
    
    # Data for admin_task_summary
    query_admin_task_summary = "INSERT INTO `admin_task_summary` (`task_id`, `season_id`, `status`) VALUES (%s, %s, %s)"
    data_admin_task_summary = [
        (1, 1, 'DONE'),
        (2, 1, 'IN_PROGRESS')
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
    query_crops = "INSERT INTO `crops` (`crop_name`, `description`, `category`, `post_harvest_delay_days`, `shelf_life_days`) VALUES (%s, %s, %s, %s, %s)"
    data_crops = [
        ('Lúa Nước', 'Cây lương thực chủ đạo, thích hợp vùng nhiệt đới.', 'GRAIN', 2, 180),
        ('Cà Phê', 'Cây công nghiệp dài ngày, mang lại giá trị kinh tế cao.', 'OTHER', 5, 365),
        ('Sầu Riêng', 'Cây ăn trái đặc sản, yêu cầu kỹ thuật chăm sóc cao.', 'FRUIT', 1, 14)
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
        (1, 'Lô A1 - Cánh Đồng Mẫu Lớn', 5.0, 'Đất phù sa', 'ACTIVE', '{"type":"Polygon","coordinates":[[[105.8,10.4],[105.9,10.4],[105.9,10.5],[105.8,10.5],[105.8,10.4]]]}', 1, date(2026, 1, 1), date(2026, 1, 1), None),
        (2, 'Lô B1 - Cà Phê Năm 4', 2.0, 'Đất đỏ bazan', 'ACTIVE', '{"type":"Polygon","coordinates":[[[108.0,12.6],[108.1,12.6],[108.1,12.7],[108.0,12.7],[108.0,12.6]]]}', 2, date(2026, 1, 1), date(2026, 1, 1), None)
    ]
    cursor.executemany(query_plots, data_plots)

    # Data for certification_standards
    query_certification_standards = "INSERT INTO `certification_standards` (`code`, `name`, `type`, `version`, `description`, `is_active`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_certification_standards = [
        ('VIETGAP-PLANTING-2024', 'VietGAP Trồng trọt 2024', 'VIETGAP_PLANTING', 'TCVN 11892-1:2017', 'Thực hành nông nghiệp tốt cho trồng trọt theo TCVN 11892-1:2017', 1, date(2026, 1, 1)),
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
    query_certification_records = "INSERT INTO `certification_records` (`farm_id`, `standard_id`, `compliance_score`, `status`, `applied_at`, `certified_at`, `expiry_date`, `auditor_notes`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_certification_records = [
        (1, 1, 100.0, 'CERTIFIED', date(2025, 12, 1), date(2026, 1, 10), date(2028, 1, 10), 'Nông trại duy trì tốt sổ nhật ký canh tác điện tử', date(2026, 1, 1), date(2026, 1, 10))
    ]
    cursor.executemany(query_certification_records, data_certification_records)

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

    # Data for farm_documents
    query_farm_documents = "INSERT INTO `farm_documents` (`farm_id`, `document_type`, `title`, `description`, `file_url`, `issued_date`, `expiry_date`, `verification_status`, `verified_by`, `verified_at`, `created_by`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_farm_documents = [
        (1, 'SOIL_TEST_REPORT', 'Báo cáo kiểm nghiệm đất Lô A1', 'Phân tích NPK và Kim loại nặng', 'http://example.com/docs/soil_a1.pdf', date(2025, 11, 20), date(2026, 11, 20), 'VERIFIED', 1, date(2025, 11, 25), 2, date(2025, 11, 21), date(2025, 11, 25))
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
        (1, 1, 1, 1, 1, 'FERTILIZER', 'Phân Ure Phú Mỹ', 650000.00, 10, 6500000.00, 6500000.00, 'PAID', 'Bón thúc đợt 1', date(2025, 12, 10), 'Vụ Đông Xuân 2025-2026', 'Lô A1 - Cánh Đồng Mẫu Lớn', 'Bón phân lần 1', 'Trần Văn Nông', date(2025, 12, 11)),
        (1, 1, 2, 1, 1, 'PESTICIDE', 'Thuốc trừ nấm Amistar Top', 280000.00, 5, 1400000.00, 1400000.00, 'PAID', 'Phòng trị đạo ôn', date(2026, 1, 15), 'Vụ Đông Xuân 2025-2026', 'Lô A1 - Cánh Đồng Mẫu Lớn', 'Phun thuốc phòng bệnh', 'Trần Văn Nông', date(2026, 1, 16)),
        (1, 1, 3, 1, 1, 'LABOR', 'Công phun thuốc bằng Drone', 200000.00, 5, 1000000.00, 1000000.00, 'UNPAID', 'Thuê dịch vụ ngoài', date(2026, 1, 15), 'Vụ Đông Xuân 2025-2026', 'Lô A1 - Cánh Đồng Mẫu Lớn', 'Phun thuốc phòng bệnh', 'Trần Văn Nông', date(2026, 1, 16))
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
        ('WEATHER', 'HIGH', 'SENT', 1, 1, 1, 1, 'Cảnh báo hạn mặn xâm nhập', 'Độ mặn tại trạm bơm Kênh Xáng đạt 4‰. Ngừng bơm nước tưới.', 'CHECK_IRRIGATION', 'http://agri-app/actions/irrigation', '1,3,5', date(2026, 2, 10), date(2026, 2, 10)),
        ('PEST', 'MEDIUM', 'SENT', 1, 1, 1, 1, 'Nguy cơ bùng phát rầy nâu', 'Thời tiết ẩm ướt phù hợp rầy nâu sinh sôi. Cần thăm đồng.', 'SCOUT_FIELD', 'http://agri-app/actions/scout', '1', date(2026, 1, 20), date(2026, 1, 20))
    ]
    cursor.executemany(query_alerts, data_alerts)
    
    # Data for incidents
    query_incidents = "INSERT INTO `incidents` (`season_id`, `farm_id`, `reported_by`, `incident_type`, `severity`, `status`, `description`, `deadline`, `resolved_at`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_incidents = [
        (1, 1, 1, 'DISEASE', 'MEDIUM', 'RESOLVED', 'Phát hiện vết bệnh đạo ôn sớm trên lá tại rìa bờ ruộng lô A1.', date(2026, 1, 18), date(2026, 1, 22), date(2026, 1, 15))
    ]
    cursor.executemany(query_incidents, data_incidents)
    
    # Data for notifications
    query_notifications = "INSERT INTO `notifications` (`user_id`, `title`, `message`, `link`, `alert_id`, `created_at`, `read_at`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    data_notifications = [
        (1, 'Hạn mặn khẩn cấp', 'Vui lòng kiểm tra trạm bơm ngay lập tức', '/alerts/1', 1, date(2026, 2, 10), date(2026, 2, 10))
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
        (1, 'Khu Thuốc BVTV', 'B', 'Tủ Kính', '1')
    ]
    cursor.executemany(query_stock_locations, data_stock_locations)
    
    # Data for inventory_balances
    query_inventory_balances = "INSERT INTO `inventory_balances` (`supply_lot_id`, `warehouse_id`, `location_id`, `quantity`) VALUES (%s, %s, %s, %s)"
    data_inventory_balances = [
        (1, 1, 1, 1000), # 1000 KG Ure
        (2, 1, 2, 50)    # 50 L Amistar Top
    ]
    cursor.executemany(query_inventory_balances, data_inventory_balances)

    # Data for product_warehouse_lots (Sản phẩm thu hoạch nhập kho)
    query_product_warehouse_lots = "INSERT INTO `product_warehouse_lots` (`lot_code`, `product_id`, `product_name`, `product_variant`, `season_id`, `farm_id`, `plot_id`, `harvest_id`, `warehouse_id`, `location_id`, `harvested_at`, `received_at`, `unit`, `initial_quantity`, `on_hand_quantity`, `grade`, `quality_status`, `traceability_data`, `note`, `status`, `created_by`, `created_at`, `updated_at`, `crop_category`, `expiry_date`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_product_warehouse_lots = [
        ('LOT-GAO-DT8-2026A', 1, 'Gạo Đài Thơm 8', 'Đóng bao 50kg', 1, 1, 1, 1, 2, 1, date(2026, 3, 5), date(2026, 3, 7), 'KG', 34500, 30000, 'Loại 1 (Gạo Xuất Khẩu)', 'PASSED', '{"qr":"https://trace.agri.vn/LOT-GAO-DT8-2026A"}', 'Lúa sấy khô đạt ẩm độ 14%', 'AVAILABLE', 1, date(2026, 3, 7), date(2026, 3, 7), 'LƯƠNG THỰC', date(2027, 3, 7))
    ]
    cursor.executemany(query_product_warehouse_lots, data_product_warehouse_lots)

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
    
    # KHÔNG IMPORT IDEMPOTENCY KEYS VÀ AUDIT LOGS
    query_idempotency_keys = "INSERT INTO `idempotency_keys` (`key_value`, `endpoint`, `response_body`, `response_status`, `created_at`, `expires_at`) VALUES (%s, %s, %s, %s, %s, %s)"
    cursor.executemany(query_idempotency_keys, [])
    
    query_marketplace_order_audit_logs = "INSERT INTO `marketplace_order_audit_logs` (`entity_type`, `entity_id`, `operation`, `performed_by`, `performed_at`, `snapshot_data_json`, `reason`, `ip_address`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    cursor.executemany(query_marketplace_order_audit_logs, [])

    # Data for marketplace_products
    query_marketplace_products = "INSERT INTO `marketplace_products` (`version`, `slug`, `name`, `category`, `short_description`, `description`, `price`, `unit`, `stock_quantity`, `image_url`, `image_urls_json`, `farmer_user_id`, `farmer_display_name`, `farm_id`, `farm_name`, `farm_region`, `season_id`, `season_name`, `lot_id`, `lot_code`, `lot_warehouse_name`, `lot_storage_location`, `lot_harvest_date`, `lot_received_at`, `lot_grade`, `lot_initial_quantity`, `plot_id`, `plot_name`, `plot_area`, `crop_name`, `catalog_snapshot`, `traceable`, `average_rating`, `rating_count`, `status`, `published_at`, `status_reason`, `status_changed_at`, `status_changed_by_user_id`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_marketplace_products = [
        (1, 'gao-dai-thom-8-chuan-globalgap', 'Gạo Đài Thơm 8 - Chuẩn GlobalGAP', 'GẠO & NGŨ CỐC', 'Gạo sạch nguyên cám, truy xuất nguồn gốc rõ ràng.', 'Trồng tại vùng lúa sinh thái Đồng Tháp, kiểm soát dư lượng BVTV nghiêm ngặt...', 18500.00, 'KG', 30000, 'http://example.com/gao-dt8.jpg', '["http://example.com/gao-dt8-1.jpg"]', 2, 'HTX Nông Nghiệp Xanh', 1, 'HTX Nông Nghiệp Xanh Đồng Tháp', 'Miền Tây Nam Bộ', 1, 'Vụ Đông Xuân 2025-2026', 1, 'LOT-GAO-DT8-2026A', 'Kho Gạo Thành Phẩm', 'Khu A', date(2026, 3, 5), date(2026, 3, 7), 'Loại 1', 34500, 1, 'Lô A1 - Cánh Đồng Mẫu Lớn', 5.0, 'Lúa Nước', '{"crop": "Lúa Nước", "variety": "Đài Thơm 8"}', 1, 5.0, 12, 'PUBLISHED', date(2026, 3, 8), 'Đạt chuẩn', date(2026, 3, 8), 1, date(2026, 3, 8), date(2026, 3, 8))
    ]
    cursor.executemany(query_marketplace_products, data_marketplace_products)

    # Data for marketplace_orders
    query_marketplace_orders = "INSERT INTO `marketplace_orders` (`order_group_id`, `order_code`, `buyer_user_id`, `farmer_user_id`, `status`, `payment_method`, `payment_verification_status`, `payment_proof_file_name`, `payment_proof_content_type`, `payment_proof_storage_path`, `payment_proof_uploaded_at`, `payment_verified_at`, `payment_verified_by_user_id`, `payment_verification_note`, `shipping_recipient_name`, `shipping_phone`, `shipping_address_line`, `note`, `subtotal`, `shipping_fee`, `total_amount`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_marketplace_orders = [
        (1, 'ORD-2603-001', 2, 1, 'COMPLETED', 'BANK_TRANSFER', 'VERIFIED', 'ck-luongthuc.png', 'image/png', '/proofs/2026/03/', date(2026, 3, 9), date(2026, 3, 9), 1, 'Đã nhận đủ tiền cọc 50%', 'Nguyễn Văn Thu Mua', '0988777666', 'KCN Sa Đéc, Đồng Tháp', 'Giao xe tải 10 tấn', 37000000.00, 500000.00, 37500000.00, date(2026, 3, 9), date(2026, 3, 15))
    ]
    cursor.executemany(query_marketplace_orders, data_marketplace_orders)

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
    query_pesticide_phi_reference = "INSERT INTO `pesticide_phi_reference` (`active_ingredient`, `pesticide_name`, `phi_days`, `crop_type`) VALUES (%s, %s, %s, %s)"
    data_pesticide_phi_reference = [
        ('Carbendazim', 'Carbenzim 50WP, Bavistin 50WP', 14, 'general'),
        ('Chlorpyrifos', 'Dursban 5G,Lorsban 150EC', 21, 'general'),
        ('Cypermethrin', 'Sherpa 25EC, Cypersect 25EC', 7, 'general'),
        ('Mancozeb', 'Manzate 80WP, Dithane M-45', 14, 'vegetable'),
        ('Metalaxyl', 'Ridomil Gold 68WG', 7, 'vegetable'),
        ('Imidacloprid', 'Confidor 100SL, Admire 50SC', 14, 'fruit'),
        ('Abamectin', 'Vertimec 1.8EC', 14, 'vegetable'),
        ('Bethecypermethrin', 'Bets 10EC', 7, 'general'),
        ('Fenobucarb', 'Bassa 50EC', 14, 'rice'),
        ('Cartap', 'Padan 95SP', 7, 'rice'),
        ('Carbofuran', 'Furadan 3G', 60, 'general'),
        ('Fenitrothion', 'Sumithion 50EC', 14, 'general'),
        ('Carbaryl', 'Sevin 85WP', 7, 'fruit'),
        ('Copper hydroxide', 'Kocide 77WP', 0, 'general'),
        ('Bacillus thuringiensis', 'Dipel 6.4DF', 0, 'vegetable'),
        ('Spinosad', 'Tracer 48SC', 1, 'vegetable'),
        ('Emamectin benzoate', 'Proclaim 5SG', 7, 'vegetable'),
        ('Hexaconazole', 'Anvil 5SC', 14, 'fruit'),
        ('Propiconazole', 'Tilt 250EC', 14, 'fruit'),
        ('Difenoconazole', 'Score 250EC, Score', 14, 'vegetable'),
        ('Azoxystrobin', 'Amistar Top 325SC, Amistar', 14, 'general')
    ]
    cursor.executemany(query_pesticide_phi_reference, data_pesticide_phi_reference)
    
    # Data for seasons
    query_seasons = "INSERT INTO `seasons` (`season_name`, `plot_id`, `crop_id`, `variety_id`, `start_date`, `planned_harvest_date`, `end_date`, `status`, `initial_plant_count`, `current_plant_count`, `expected_yield_kg`, `actual_yield_kg`, `budget_amount`, `notes`, `created_at`, `owner_user_id`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_seasons = [
        ('Vụ Hè Thu 2026 (Lúa Đài Thơm 8)', 1, 1, 1, date(2026, 6, 22), date(2026, 9, 22), date(2026, 9, 22), 'ACTIVE', 0, 0, 35000, 0, 50000000.00, 'Vụ chính trong năm, đang tiến hành', date(2026, 6, 20), 2)
    ]
    cursor.executemany(query_seasons, data_seasons)
    
    # Data for tasks
    query_tasks = "INSERT INTO `tasks` (`user_id`, `season_id`, `title`, `description`, `planned_date`, `due_date`, `status`, `actual_start_date`, `actual_end_date`, `notes`, `created_at`, `assignee_name`, `plot_name`, `estimated_days`, `plot_id`, `work_team_id`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_tasks = [
        (2, 1, 'Làm đất và Gieo sạ', 'Cày ải, bừa trục và gieo sạ bằng máy', date(2025, 11, 15), date(2025, 11, 17), 'DONE', date(2025, 11, 15), date(2025, 11, 16), 'Mật độ sạ 100kg/ha', date(2025, 11, 14), 'Đội máy cày', 'Lô A1', 2, 1, 1),
        (2, 1, 'Bón phân thúc đợt 1 (7-10 NSS)', 'Bón Ure và Lân', date(2025, 11, 24), date(2025, 11, 25), 'DONE', date(2025, 11, 24), date(2025, 11, 24), 'Điều kiện nước săm sắp', date(2025, 11, 14), 'Đội nông vụ', 'Lô A1', 1, 1, 1)
    ]
    cursor.executemany(query_tasks, data_tasks)

    # Data for disease_records
    query_disease_records = "INSERT INTO `disease_records` (`season_id`, `plot_id`, `crop_id`, `variety_id`, `reported_by_user_id`, `incident_id`, `disease_name`, `symptom_summary`, `severity`, `status`, `detected_at`, `affected_plant_count`, `affected_area_value`, `affected_area_unit`, `evidence_url`, `notes`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_disease_records = [
        (1, 1, 1, 1, 1, 1, 'Bệnh Đạo Ôn (Pyricularia oryzae)', 'Vết bệnh hình thoi hoặc mắt én, tâm xám trắng trên lá non', 'MEDIUM', 'TREATED', date(2026, 1, 15), 0, 500, 'M2', 'http://example.com/disease/dao-on.jpg', 'Phát hiện sớm vùng rìa ruộng, lây lan chậm', date(2026, 1, 15), date(2026, 1, 20))
    ]
    cursor.executemany(query_disease_records, data_disease_records)

    # Data for pesticide_records (Nhật ký phun thuốc)
    query_pesticide_records = "INSERT INTO `pesticide_records` (`season_id`, `plot_id`, `field_log_id`, `pesticide_name`, `active_ingredient`, `phi_days`, `application_date`, `application_method`, `dosage`, `target_pest`, `note`, `created_by`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_pesticide_records = [
        (1, 1, None, 'Amistar Top 325SC', 'Azoxystrobin + Difenoconazole', 14, date(2026, 1, 16), 'Phun bằng Drone bay nông nghiệp', '0.3 Lít/ha', 'Bệnh đạo ôn lá', 'Phun lúc trời mát, không mưa', 1, date(2026, 1, 16), date(2026, 1, 16))
    ]
    cursor.executemany(query_pesticide_records, data_pesticide_records)

    # Data for harvests
    query_harvests = "INSERT INTO `harvests` (`season_id`, `harvest_date`, `quantity`, `unit`, `grade`, `note`, `created_at`, `gross_wet_weight`, `net_dry_weight`, `warehouse_receipt_status`, `warehouse_received_date`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_harvests = [
        (1, date(2026, 3, 5), 34500, 1, 'Hạt mẩy, vàng sáng', 'Thu hoạch bằng máy gặt đập liên hợp', date(2026, 3, 5), 40000, 34500, 'RECEIVED', date(2026, 3, 7))
    ]
    cursor.executemany(query_harvests, data_harvests)

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
    query_soil_tests = "INSERT INTO `soil_tests` (`season_id`, `plot_id`, `sample_date`, `soil_organic_matter_pct`, `mineral_n_kg_per_ha`, `nitrate_mg_per_kg`, `ammonium_mg_per_kg`, `legacy_n_contribution_kg`, `legacy_event_id`, `legacy_derived`, `measured`, `source_type`, `source_document`, `lab_reference`, `note`, `created_by_user_id`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_soil_tests = [
        (1, 1, date(2025, 11, 1), 3.5, 45.0, 15.5, 20.2, 10.0, None, 0, 1, 'LAB_TEST', 'http://example.com/test/soil_a1.pdf', 'LAB-2511-001', 'Đất thịt nhẹ, pH 6.2 khá tốt', 1, date(2025, 11, 10))
    ]
    cursor.executemany(query_soil_tests, data_soil_tests)

    # Data for irrigation_water_analyses
    query_irrigation_water_analyses = "INSERT INTO `irrigation_water_analyses` (`season_id`, `plot_id`, `sample_date`, `nitrate_mg_per_l`, `ammonium_mg_per_l`, `total_n_mg_per_l`, `irrigation_volume_m3`, `legacy_n_contribution_kg`, `legacy_event_id`, `legacy_derived`, `measured`, `source_type`, `source_document`, `lab_reference`, `note`, `created_by_user_id`, `created_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    data_irrigation_water_analyses = [
        (1, 1, date(2025, 11, 5), 2.1, 0.5, 2.6, 5000, 13.0, None, 0, 1, 'LAB_TEST', 'http://example.com/test/water_a1.pdf', 'LAB-WATER-2511', 'Mẫu lấy từ kênh chính dẫn vào lô', 1, date(2025, 11, 12))
    ]
    cursor.executemany(query_irrigation_water_analyses, data_irrigation_water_analyses)

    # KHÔNG IMPORT PROCESSED EVENTS
    query_processed_events = "INSERT INTO `processed_events` (`event_id`, `processed_at`) VALUES (%s, %s)"
    cursor.executemany(query_processed_events, [])

    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
    conn.commit()
    cursor.close()
    conn.close()

def main():
    try:
        reset_all_databases()
        import_admin_reporting_db()
        import_crop_catalog_db()
        import_farm_db()
        import_finance_db()
        import_identity_db()
        import_incident_db()
        import_inventory_db()
        import_marketplace_db()
        import_season_db()
        import_sustainability_db()
        logging.info('✅ HOÀN TẤT: Đã import dữ liệu nghiệp vụ cho TẤT CẢ các service thành công!')
    except Exception as e:
        logging.error(f'❌ Lỗi trong quá trình import: {e}')
        raise

if __name__ == '__main__':
    main()
