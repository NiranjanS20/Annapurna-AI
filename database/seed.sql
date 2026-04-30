-- ============================================================
-- AI Food Waste Management — Database Seed Data
-- ============================================================

INSERT INTO users (firebase_uid, role) VALUES
('test_canteen_uid_123', 'canteen'),
('test_ngo_uid_456', 'ngo')
ON CONFLICT DO NOTHING;

INSERT INTO menu_items (item_name, category) VALUES
('Chicken Biryani', 'Main Course'),
('Paneer Tikka', 'Appetizer'),
('Dal Makhani', 'Main Course'),
('Gulab Jamun', 'Dessert')
ON CONFLICT DO NOTHING;

INSERT INTO food_data (date, day_of_week, item_name, meal_type, prepared_qty, sold_qty, waste_qty) VALUES
(CURRENT_DATE - INTERVAL '1 day', 'Wednesday', 'Chicken Biryani', 'Lunch', 100, 80, 20),
(CURRENT_DATE - INTERVAL '1 day', 'Wednesday', 'Dal Makhani', 'Dinner', 50, 45, 5)
ON CONFLICT DO NOTHING;

INSERT INTO predictions (date, item_name, predicted_demand, recommended_qty, confidence_score) VALUES
(CURRENT_DATE, 'Chicken Biryani', 85, 93.5, 92),
(CURRENT_DATE, 'Dal Makhani', 50, 55, 88)
ON CONFLICT DO NOTHING;

INSERT INTO alerts (date, item_name, alert_type, message, severity) VALUES
(CURRENT_DATE - INTERVAL '1 day', 'Chicken Biryani', 'Overproduction', 'Prepared 100 but sold only 80.', 'medium')
ON CONFLICT DO NOTHING;

INSERT INTO donations (item_name, quantity, status) VALUES
('Chicken Biryani', 20, 'available')
ON CONFLICT DO NOTHING;
