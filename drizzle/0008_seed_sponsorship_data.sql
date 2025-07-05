
-- Insert sample sponsors
INSERT INTO sponsors (id, name, role, party, constituency, email, conflict_level, financial_exposure, voting_alignment, transparency_score, bio, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Hon. James Mwangi', 'MP - Kiambu County', 'Jubilee Party', 'Kiambu County', 'j.mwangi@parliament.go.ke', 'high', 28700000, 73, 65, 'Experienced legislator with background in healthcare policy and business development.', true),
('550e8400-e29b-41d4-a716-446655440002', 'Hon. Sarah Odhiambo', 'MP - Kisumu East', 'ODM', 'Kisumu East', 's.odhiambo@parliament.go.ke', 'high', 2800000, 85, 72, 'Healthcare advocate and former medical practitioner.', true),
('550e8400-e29b-41d4-a716-446655440003', 'Hon. Michael Gitonga', 'MP - Mombasa Central', 'Jubilee', 'Mombasa Central', 'm.gitonga@parliament.go.ke', 'low', 0, 45, 88, 'Public health researcher and academic.', true),
('550e8400-e29b-41d4-a716-446655440004', 'Hon. Grace Wanjiku', 'MP - Nairobi West', 'UDA', 'Nairobi West', 'g.wanjiku@parliament.go.ke', 'medium', 1500000, 67, 75, 'Business leader with interests in healthcare innovation.', true);

-- Insert sponsor affiliations
INSERT INTO sponsor_affiliations (id, sponsor_id, organization, role, type, conflict_type, start_date, is_active) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'East African Pharmaceuticals', 'Major Shareholder', 'financial', 'direct', '2020-01-01', true),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'National Healthcare Alliance', 'Board Member', 'governance', 'indirect', '2021-06-01', true),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Medical Research Foundation', 'Senior Advisor', 'advisory', 'indirect', '2019-03-01', true),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'Healthcare Innovation Hub', 'Advisory Board', 'advisory', 'indirect', '2022-01-01', true);

-- Insert sponsor transparency records
INSERT INTO sponsor_transparency (id, sponsor_id, disclosure, last_updated, public_statements, verification_status) VALUES
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'partial', '2024-01-15', 3, 'verified'),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'complete', '2024-01-10', 5, 'verified'),
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'complete', '2024-01-08', 2, 'verified'),
('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'partial', '2024-01-12', 1, 'pending');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bill_sponsorships_bill_id ON bill_sponsorships(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_sponsorships_sponsor_id ON bill_sponsorships(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_affiliations_sponsor_id ON sponsor_affiliations(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_transparency_sponsor_id ON sponsor_transparency(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_bill_section_conflicts_bill_id ON bill_section_conflicts(bill_id);
