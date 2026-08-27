-- Preserve the standard ID so existing records/checklist references remain intact.
UPDATE certification_standards
SET code = 'VIETGAP-PLANTING-2026',
    name = 'VietGAP Trồng trọt (TCVN 11892-1:2026)',
    version = 'TCVN 11892-1:2026',
    description = 'Bộ checklist số hóa hỗ trợ chuẩn bị hồ sơ theo TCVN 11892-1:2026; phạm vi và tiêu chí áp dụng phải được đối chiếu với tổ chức chứng nhận được công nhận.',
    is_active = TRUE
WHERE code = 'VIETGAP-PLANTING-2024';
