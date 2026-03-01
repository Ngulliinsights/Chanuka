-- Migration: Seed mock community data for MVP demo
-- Date: 2026-03-01
-- Purpose: Provide realistic discussion data for demonstration

-- Note: This assumes bills and users tables exist
-- Adjust bill_id and user_id references as needed

-- Insert mock comments for the first 3 bills
DO $$
DECLARE
  bill1_id UUID;
  bill2_id UUID;
  bill3_id UUID;
  user1_id UUID;
  user2_id UUID;
  user3_id UUID;
  comment1_id UUID;
  comment2_id UUID;
  comment3_id UUID;
BEGIN
  -- Get existing bill and user IDs (adjust as needed)
  SELECT id INTO bill1_id FROM bills ORDER BY created_at DESC LIMIT 1 OFFSET 0;
  SELECT id INTO bill2_id FROM bills ORDER BY created_at DESC LIMIT 1 OFFSET 1;
  SELECT id INTO bill3_id FROM bills ORDER BY created_at DESC LIMIT 1 OFFSET 2;
  
  SELECT id INTO user1_id FROM users ORDER BY created_at DESC LIMIT 1 OFFSET 0;
  SELECT id INTO user2_id FROM users ORDER BY created_at DESC LIMIT 1 OFFSET 1;
  SELECT id INTO user3_id FROM users ORDER BY created_at DESC LIMIT 1 OFFSET 2;
  
  -- Skip if no bills or users exist
  IF bill1_id IS NULL OR user1_id IS NULL THEN
    RAISE NOTICE 'Skipping seed: No bills or users found';
    RETURN;
  END IF;
  
  -- Bill 1: High-quality evidence-based discussion
  INSERT INTO comments (id, bill_id, user_id, content, upvotes, downvotes, is_verified)
  VALUES (
    gen_random_uuid(),
    bill1_id,
    user1_id,
    'This bill will significantly impact small businesses. According to the Congressional Budget Office report from Q4 2025, approximately 15% of small businesses with fewer than 50 employees will face increased compliance costs averaging $12,000 annually. However, the bill also includes tax credits under Section 3(b) that could offset up to 80% of these costs for qualifying businesses.',
    45,
    3,
    TRUE
  ) RETURNING id INTO comment1_id;
  
  -- Analysis for comment 1 (high quality - has evidence)
  INSERT INTO argument_analysis (
    comment_id,
    quality_score,
    evidence_strength,
    logical_validity,
    clarity,
    relevance,
    detected_fallacies,
    claims,
    evidence,
    suggested_improvements,
    reasoning_type,
    coherence_score
  ) VALUES (
    comment1_id,
    8.5,
    0.9,
    0.85,
    0.8,
    0.9,
    '[]'::jsonb,
    '[{"text": "Bill will impact small businesses", "type": "factual", "confidence": 0.9}]'::jsonb,
    '[{"text": "CBO report Q4 2025", "source_type": "citation", "strength": 0.9}]'::jsonb,
    '[]'::jsonb,
    'deductive',
    0.85
  );
  
  -- Reply to comment 1 (counter-argument)
  INSERT INTO comments (id, bill_id, user_id, content, parent_id, upvotes, downvotes)
  VALUES (
    gen_random_uuid(),
    bill1_id,
    user2_id,
    'I respectfully disagree with the characterization of "increased costs." While compliance costs exist, the bill provides substantial tax credits that more than offset these expenses for most small businesses. Additionally, the streamlined reporting requirements in Section 5 actually reduce administrative burden compared to current regulations.',
    comment1_id,
    32,
    5
  ) RETURNING id INTO comment2_id;
  
  -- Analysis for comment 2 (good quality - counter-argument with reasoning)
  INSERT INTO argument_analysis (
    comment_id,
    quality_score,
    evidence_strength,
    logical_validity,
    clarity,
    relevance,
    detected_fallacies,
    claims,
    reasoning_type,
    coherence_score
  ) VALUES (
    comment2_id,
    7.8,
    0.7,
    0.8,
    0.75,
    0.85,
    '[]'::jsonb,
    '[{"text": "Tax credits offset costs", "type": "factual", "confidence": 0.8}]'::jsonb,
    'deductive',
    0.8
  );
  
  -- Bill 1: Lower quality comment (opinion without evidence)
  INSERT INTO comments (id, bill_id, user_id, content, upvotes, downvotes)
  VALUES (
    gen_random_uuid(),
    bill1_id,
    user3_id,
    'This bill is terrible and will destroy the economy. Everyone knows that more regulations always hurt businesses. We should never pass bills like this.',
    8,
    28
  ) RETURNING id INTO comment3_id;
  
  -- Analysis for comment 3 (low quality - fallacies, no evidence)
  INSERT INTO argument_analysis (
    comment_id,
    quality_score,
    evidence_strength,
    logical_validity,
    clarity,
    relevance,
    detected_fallacies,
    claims,
    suggested_improvements,
    reasoning_type,
    coherence_score
  ) VALUES (
    comment3_id,
    3.2,
    0.1,
    0.3,
    0.5,
    0.6,
    '[{"type": "hasty_generalization", "severity": "high"}, {"type": "appeal_to_emotion", "severity": "medium"}]'::jsonb,
    '[{"text": "Bill will destroy economy", "type": "value", "confidence": 0.3}]'::jsonb,
    '["Provide specific evidence for claims", "Avoid absolute statements like always/never", "Focus on specific provisions rather than generalizations"]'::jsonb,
    'unclear',
    0.4
  );
  
  -- Bill 2: Balanced discussion
  IF bill2_id IS NOT NULL THEN
    INSERT INTO comments (bill_id, user_id, content, upvotes, downvotes)
    VALUES (
      bill2_id,
      user1_id,
      'The environmental impact assessment in Appendix C shows a projected 12% reduction in carbon emissions over 5 years. This aligns with similar legislation in California (AB-123) which achieved a 14% reduction. The cost-benefit analysis suggests $2.3B in healthcare savings from improved air quality.',
      67,
      4
    );
    
    INSERT INTO comments (bill_id, user_id, content, upvotes, downvotes)
    VALUES (
      bill2_id,
      user2_id,
      'While I support the environmental goals, the implementation timeline seems unrealistic. Industry experts have noted that the 18-month compliance period is insufficient for retooling manufacturing processes. A phased approach over 36 months would be more practical.',
      54,
      6
    );
  END IF;
  
  -- Bill 3: Technical discussion
  IF bill3_id IS NOT NULL THEN
    INSERT INTO comments (bill_id, user_id, content, upvotes, downvotes)
    VALUES (
      bill3_id,
      user3_id,
      'Section 7(a)(2) creates a potential conflict with existing federal regulations under 42 USC § 1983. The bill should include a severability clause to address this issue. Legal precedent from Smith v. Department (2023) suggests courts would likely strike down this provision.',
      89,
      2
    );
  END IF;
  
  RAISE NOTICE 'Mock community data seeded successfully';
END $$;
