-- Restore the minimum VietGAP training policy catalog for environments where
-- legacy/demo data was created before mandatory programs were reliably seeded.
INSERT INTO training_programs (title, category, description, is_mandatory)
SELECT 'An toàn sử dụng thuốc BVTV', 'SAFETY',
       'Huấn luyện sử dụng thuốc bảo vệ thực vật an toàn theo chuẩn VietGAP', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM training_programs
    WHERE category = 'SAFETY' AND is_mandatory = TRUE
);

INSERT INTO training_programs (title, category, description, is_mandatory)
SELECT 'Quy trình phân loại và thu hoạch', 'OPERATIONS',
       'Đào tạo kỹ năng thu hoạch nông sản đảm bảo chất lượng', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM training_programs
    WHERE category = 'OPERATIONS' AND is_mandatory = TRUE
);
