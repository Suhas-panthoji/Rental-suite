-- Rental Suite demo seed (local dev only)
-- Idempotent-ish: each insert is guarded with NOT EXISTS.

-- Properties
INSERT INTO properties (name, type, address, notes, created_at)
SELECT 'Green Villa', 'house', 'MG Road, Bengaluru 560001', 'Two floors + rooms', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM properties WHERE name='Green Villa');

INSERT INTO properties (name, type, address, notes, created_at)
SELECT 'Market Complex', 'shop', 'Bus Stand Road, Bengaluru 560002', '', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM properties WHERE name='Market Complex');

-- Units: Green Villa
INSERT INTO units (property_id, label, type, area_sqft, expected_rent_paise, status, elec_meter_no, water_meter_no, notes, created_at)
SELECT (SELECT id FROM properties WHERE name='Green Villa'), 'House A', 'house', 900, 1200000, 'vacant', 'ELE-101', 'WTR-101', '', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM units WHERE label='House A' AND property_id=(SELECT id FROM properties WHERE name='Green Villa'));

INSERT INTO units (property_id, label, type, area_sqft, expected_rent_paise, status, elec_meter_no, water_meter_no, notes, created_at)
SELECT (SELECT id FROM properties WHERE name='Green Villa'), 'House B', 'house', 850, 1100000, 'vacant', 'ELE-102', 'WTR-102', '', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM units WHERE label='House B' AND property_id=(SELECT id FROM properties WHERE name='Green Villa'));

INSERT INTO units (property_id, label, type, area_sqft, expected_rent_paise, status, elec_meter_no, water_meter_no, notes, created_at)
SELECT (SELECT id FROM properties WHERE name='Green Villa'), 'Room 1', 'room', 150, 600000, 'vacant', 'ELE-103', 'WTR-103', '', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM units WHERE label='Room 1' AND property_id=(SELECT id FROM properties WHERE name='Green Villa'));

INSERT INTO units (property_id, label, type, area_sqft, expected_rent_paise, status, elec_meter_no, water_meter_no, notes, created_at)
SELECT (SELECT id FROM properties WHERE name='Green Villa'), 'Room 2', 'room', 150, 600000, 'vacant', 'ELE-104', 'WTR-104', '', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM units WHERE label='Room 2' AND property_id=(SELECT id FROM properties WHERE name='Green Villa'));

-- Units: Market Complex
INSERT INTO units (property_id, label, type, area_sqft, expected_rent_paise, status, elec_meter_no, water_meter_no, notes, created_at)
SELECT (SELECT id FROM properties WHERE name='Market Complex'), 'Shop A', 'shop', 200, 800000, 'vacant', 'ELE-201', 'WTR-201', '', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM units WHERE label='Shop A' AND property_id=(SELECT id FROM properties WHERE name='Market Complex'));

INSERT INTO units (property_id, label, type, area_sqft, expected_rent_paise, status, elec_meter_no, water_meter_no, notes, created_at)
SELECT (SELECT id FROM properties WHERE name='Market Complex'), 'Shop B', 'shop', 180, 750000, 'vacant', 'ELE-202', 'WTR-202', '', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM units WHERE label='Shop B' AND property_id=(SELECT id FROM properties WHERE name='Market Complex'));

-- Tenants
INSERT INTO tenants (name, phone, alt_phone, email, address, id_type, id_number, occupation, emergency_contact, notes, created_at)
SELECT 'Ravi Kumar', '9876543210', '', 'ravi@example.com', 'Chennai', 'aadhaar', '1234 5678 9012', 'Software engineer', 'Sunita · 9876500000', 'Demo tenant', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE phone='9876543210');

INSERT INTO tenants (name, phone, alt_phone, email, address, id_type, id_number, occupation, emergency_contact, notes, created_at)
SELECT 'Meena Traders', '9123456780', '', 'meena@example.com', 'Mysuru', 'pan', 'ABCDE1234F', 'Retail business', 'Rajesh · 9123400000', 'Demo tenant (shop)', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE phone='9123456780');

-- Agreement 1: House A + Ravi Kumar, started 2 months ago
INSERT INTO agreements (number, type, unit_id, start_date, end_date, rent_paise, due_day, notice_days, escalation_pct, status, terminated_on, terminated_reason, terms, superseded_by_id, created_at)
SELECT 'AGR-2026-001', 'rent',
       (SELECT id FROM units WHERE label='House A' AND property_id=(SELECT id FROM properties WHERE name='Green Villa')),
       strftime('%Y-%m-%d','now','-2 months'), strftime('%Y-%m-%d','now','+10 months'),
       1200000, 5, 30, 0, 'active', NULL, '', '', NULL, CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM agreements WHERE number='AGR-2026-001');

INSERT INTO agreement_tenants (agreement_id, tenant_id, is_primary)
SELECT (SELECT id FROM agreements WHERE number='AGR-2026-001'), (SELECT id FROM tenants WHERE phone='9876543210'), 1
WHERE NOT EXISTS (SELECT 1 FROM agreement_tenants WHERE agreement_id=(SELECT id FROM agreements WHERE number='AGR-2026-001'));

INSERT INTO deposit_txns (agreement_id, type, amount_paise, date, mode, reference, reason, created_at)
SELECT (SELECT id FROM agreements WHERE number='AGR-2026-001'), 'received', 5000000,
       strftime('%Y-%m-%d','now','-2 months'), 'bank', 'NEFT-DEMO-50K', 'Advance received at agreement start', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM deposit_txns WHERE agreement_id=(SELECT id FROM agreements WHERE number='AGR-2026-001') AND reference='NEFT-DEMO-50K');

-- Agreement 2: Shop A + Meena Traders, started 1 month ago
INSERT INTO agreements (number, type, unit_id, start_date, end_date, rent_paise, due_day, notice_days, escalation_pct, status, terminated_on, terminated_reason, terms, superseded_by_id, created_at)
SELECT 'AGR-2026-002', 'rent',
       (SELECT id FROM units WHERE label='Shop A' AND property_id=(SELECT id FROM properties WHERE name='Market Complex')),
       strftime('%Y-%m-%d','now','-1 months'), strftime('%Y-%m-%d','now','+11 months'),
       800000, 10, 30, 0, 'active', NULL, '', '', NULL, CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM agreements WHERE number='AGR-2026-002');

INSERT INTO agreement_tenants (agreement_id, tenant_id, is_primary)
SELECT (SELECT id FROM agreements WHERE number='AGR-2026-002'), (SELECT id FROM tenants WHERE phone='9123456780'), 1
WHERE NOT EXISTS (SELECT 1 FROM agreement_tenants WHERE agreement_id=(SELECT id FROM agreements WHERE number='AGR-2026-002'));

INSERT INTO deposit_txns (agreement_id, type, amount_paise, date, mode, reference, reason, created_at)
SELECT (SELECT id FROM agreements WHERE number='AGR-2026-002'), 'received', 3000000,
       strftime('%Y-%m-%d','now','-1 months'), 'upi', 'UPI-DEMO-30K', 'Advance received at agreement start', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM deposit_txns WHERE agreement_id=(SELECT id FROM agreements WHERE number='AGR-2026-002') AND reference='UPI-DEMO-30K');

-- Dues: House A — two months of rent, both unpaid (overdue) to demo arrears
INSERT INTO dues (agreement_id, type, period, amount_paise, due_date, status, balance_paise, notes, source_ref, created_at)
SELECT (SELECT id FROM agreements WHERE number='AGR-2026-001'), 'rent', strftime('%Y-%m','now','-2 months'),
       1200000, strftime('%Y-%m-05','now','-2 months'), 'overdue', 1200000, '', '', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM dues WHERE agreement_id=(SELECT id FROM agreements WHERE number='AGR-2026-001') AND type='rent' AND period=strftime('%Y-%m','now','-2 months'));

INSERT INTO dues (agreement_id, type, period, amount_paise, due_date, status, balance_paise, notes, source_ref, created_at)
SELECT (SELECT id FROM agreements WHERE number='AGR-2026-001'), 'rent', strftime('%Y-%m','now','-1 months'),
       1200000, strftime('%Y-%m-05','now','-1 months'), 'overdue', 1200000, '', '', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM dues WHERE agreement_id=(SELECT id FROM agreements WHERE number='AGR-2026-001') AND type='rent' AND period=strftime('%Y-%m','now','-1 months'));

INSERT INTO dues (agreement_id, type, period, amount_paise, due_date, status, balance_paise, notes, source_ref, created_at)
SELECT (SELECT id FROM agreements WHERE number='AGR-2026-001'), 'rent', strftime('%Y-%m','now'),
       1200000, strftime('%Y-%m-05','now'), 'overdue', 1200000, '', '', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM dues WHERE agreement_id=(SELECT id FROM agreements WHERE number='AGR-2026-001') AND type='rent' AND period=strftime('%Y-%m','now'));

-- Dues: Shop A — last month's rent PAID (demo of a clean cycle)
INSERT INTO dues (agreement_id, type, period, amount_paise, due_date, status, balance_paise, notes, source_ref, created_at)
SELECT (SELECT id FROM agreements WHERE number='AGR-2026-002'), 'rent', strftime('%Y-%m','now','-1 months'),
       800000, strftime('%Y-%m-10','now','-1 months'), 'paid', 0, '', '', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM dues WHERE agreement_id=(SELECT id FROM agreements WHERE number='AGR-2026-002') AND type='rent' AND period=strftime('%Y-%m','now','-1 months'));

-- Payment for the paid Shop A due (UPI, receipt RCP-0001)
INSERT INTO payments (agreement_id, date, amount_paise, mode, reference, receipt_no, remarks, created_at)
SELECT (SELECT id FROM agreements WHERE number='AGR-2026-002'), strftime('%Y-%m-12','now','-1 months'),
       800000, 'upi', 'UPI-DEMO-001', 'RCP-0001', 'Rent for last month', CAST(strftime('%s','now') AS INTEGER)*1000
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE receipt_no='RCP-0001');

INSERT INTO payment_allocations (payment_id, due_id, amount_paise)
SELECT (SELECT id FROM payments WHERE receipt_no='RCP-0001'),
       (SELECT id FROM dues WHERE agreement_id=(SELECT id FROM agreements WHERE number='AGR-2026-002') AND type='rent' AND period=strftime('%Y-%m','now','-1 months')),
       800000
WHERE NOT EXISTS (SELECT 1 FROM payment_allocations WHERE payment_id=(SELECT id FROM payments WHERE receipt_no='RCP-0001'));
