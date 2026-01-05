CREATE TYPE "public"."action_status" AS ENUM('active', 'paused', 'completed', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."action_type" AS ENUM('call_mp', 'submit_testimony', 'share_social', 'attend_hearing', 'organize_event', 'petition', 'email_campaign', 'community_meeting');--> statement-breakpoint
CREATE TYPE "public"."ambassador_status" AS ENUM('pending', 'active', 'inactive', 'suspended', 'certified');--> statement-breakpoint
CREATE TYPE "public"."bill_status" AS ENUM('drafted', 'introduced', 'first_reading', 'second_reading', 'committee_stage', 'report_stage', 'third_reading', 'presidential_assent', 'act_of_parliament', 'withdrawn', 'lapsed');--> statement-breakpoint
CREATE TYPE "public"."bill_vote_type" AS ENUM('for', 'against', 'abstain');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."chamber" AS ENUM('national_assembly', 'senate', 'county_assembly');--> statement-breakpoint
CREATE TYPE "public"."comment_vote_type" AS ENUM('upvote', 'downvote');--> statement-breakpoint
CREATE TYPE "public"."court_level" AS ENUM('supreme', 'appeal', 'high', 'magistrate', 'tribunal');--> statement-breakpoint
CREATE TYPE "public"."disinformation_tactic" AS ENUM('astroturfing', 'bot_networks', 'coordinated_harassment', 'false_narratives', 'deepfakes', 'manipulation');--> statement-breakpoint
CREATE TYPE "public"."electoral_cycle_type" AS ENUM('general', 'by_election', 'referendum', 'local');--> statement-breakpoint
CREATE TYPE "public"."engagement_type" AS ENUM('view', 'comment', 'vote', 'share', 'track', 'report');--> statement-breakpoint
CREATE TYPE "public"."influence_channel" AS ENUM('diplomatic', 'economic', 'cultural', 'military', 'informational', 'technological');--> statement-breakpoint
CREATE TYPE "public"."kenyan_county" AS ENUM('baringo', 'bomet', 'bungoma', 'busia', 'elgeyo_marakwet', 'embu', 'garissa', 'homa_bay', 'isiolo', 'kajiado', 'kakamega', 'kericho', 'kiambu', 'kilifi', 'kirinyaga', 'kisii', 'kisumu', 'kitui', 'kwale', 'laikipia', 'lamu', 'machakos', 'makueni', 'mandera', 'marsabit', 'meru', 'migori', 'mombasa', 'muranga', 'nairobi', 'nakuru', 'nandi', 'narok', 'nyamira', 'nyandarua', 'nyeri', 'samburu', 'siaya', 'taita_taveta', 'tana_river', 'tharaka_nithi', 'trans_nzoia', 'turkana', 'uasin_gishu', 'vihiga', 'wajir', 'west_pokot');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('newspaper', 'tv', 'radio', 'online', 'social_media', 'podcast');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'rejected', 'flagged', 'under_review');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('bill_update', 'comment_reply', 'milestone', 'campaign_update', 'moderation_action');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('ngo', 'cbo', 'faith_based', 'professional_association', 'union', 'think_tank');--> statement-breakpoint
CREATE TYPE "public"."participation_method" AS ENUM('sms', 'ussd', 'voice', 'mobile_app', 'web', 'offline', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."party" AS ENUM('jubilee', 'oda', 'wiper', 'kenya_kwanza', 'azimio', 'independent', 'other');--> statement-breakpoint
CREATE TYPE "public"."risk_category" AS ENUM('legislative', 'executive', 'judicial', 'social', 'economic', 'technological', 'international');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('bill_discussion', 'civic_education', 'registration_drive', 'community_forum', 'workshop', 'consultation', 'awareness_campaign');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('citizen', 'admin', 'moderator', 'expert', 'ambassador', 'organizer');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'disputed', 'false', 'outdated');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_number" varchar(50) NOT NULL,
	"title" varchar(500) NOT NULL,
	"summary" text,
	"full_text" text,
	"bill_type" varchar(50),
	"status" "bill_status" DEFAULT 'drafted' NOT NULL,
	"introduced_date" date,
	"last_action_date" date,
	"chamber" "chamber" NOT NULL,
	"parliament_session" varchar(50),
	"sponsor_id" uuid,
	"committee" varchar(255),
	"committee_report_url" varchar(500),
	"affected_counties" kenyan_county[],
	"impact_areas" varchar(100)[],
	"public_participation_date" date,
	"public_participation_venue" varchar(255),
	"public_participation_status" varchar(50),
	"view_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"vote_count_for" integer DEFAULT 0 NOT NULL,
	"vote_count_against" integer DEFAULT 0 NOT NULL,
	"engagement_score" numeric(10, 2) DEFAULT 0 NOT NULL,
	"category" varchar(100),
	"tags" varchar(100)[],
	"external_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"constitutional_analysis_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"argument_synthesis_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bills_bill_number_unique" UNIQUE("bill_number"),
	CONSTRAINT "bills_engagement_counts_check" CHECK ("bills"."view_count" >= 0 AND "bills"."comment_count" >= 0 AND
        "bills"."vote_count_for" >= 0 AND "bills"."vote_count_against" >= 0),
	CONSTRAINT "bills_date_logic_check" CHECK ("bills"."last_action_date" IS NULL OR "bills"."introduced_date" IS NULL OR
        "bills"."last_action_date" >= "bills"."introduced_date"),
	CONSTRAINT "bills_engagement_score_check" CHECK ("bills"."engagement_score" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "committee_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"committee_id" uuid NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"role" varchar(100) DEFAULT 'member' NOT NULL,
	"start_date" date DEFAULT CURRENT_DATE NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "committee_members_committee_sponsor_unique" UNIQUE("committee_id","sponsor_id"),
	CONSTRAINT "committee_members_date_range_check" CHECK ("committee_members"."end_date" IS NULL OR "committee_members"."end_date" >= "committee_members"."start_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "committees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"chamber" "chamber" NOT NULL,
	"description" text,
	"chair_id" uuid,
	"vice_chair_id" uuid,
	"members_count" smallint DEFAULT 0 NOT NULL,
	"mandate" text,
	"contact_email" varchar(320),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "committees_leadership_check" CHECK ("committees"."chair_id" IS NULL OR "committees"."vice_chair_id" IS NULL OR "committees"."chair_id" != "committees"."vice_chair_id"),
	CONSTRAINT "committees_members_count_check" CHECK ("committees"."members_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parliamentary_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_number" smallint NOT NULL,
	"parliament_number" smallint NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"chamber" "chamber" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parliamentary_sessions_unique" UNIQUE("parliament_number","session_number","chamber"),
	CONSTRAINT "parliamentary_sessions_date_range_check" CHECK ("parliamentary_sessions"."end_date" IS NULL OR "parliamentary_sessions"."end_date" >= "parliamentary_sessions"."start_date"),
	CONSTRAINT "parliamentary_sessions_session_number_check" CHECK ("parliamentary_sessions"."session_number" > 0 AND "parliamentary_sessions"."parliament_number" > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parliamentary_sittings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"sitting_date" date NOT NULL,
	"sitting_number" smallint,
	"agenda" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attendance_count" smallint DEFAULT 0 NOT NULL,
	"bills_discussed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"minutes_url" varchar(500),
	"hansard_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parliamentary_sittings_session_date_unique" UNIQUE("session_id","sitting_date"),
	CONSTRAINT "parliamentary_sittings_attendance_count_check" CHECK ("parliamentary_sittings"."attendance_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"party" "party",
	"county" "kenyan_county",
	"constituency" varchar(100),
	"ward" varchar(100),
	"chamber" "chamber" NOT NULL,
	"mp_number" varchar(50),
	"position" varchar(100),
	"role" varchar(100),
	"bio" text,
	"photo_url" varchar(500),
	"website" varchar(255),
	"email" varchar(320),
	"phone" varchar(20),
	"office_location" text,
	"social_media" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"financial_disclosures" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_disclosure_date" date,
	"voting_record" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attendance_rate" numeric(5, 2),
	"term_start" date,
	"term_end" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sponsors_mp_number_unique" UNIQUE NULLS NOT DISTINCT("mp_number"),
	CONSTRAINT "sponsors_attendance_rate_check" CHECK ("sponsors"."attendance_rate" IS NULL OR ("sponsors"."attendance_rate" >= 0 AND "sponsors"."attendance_rate" <= 100)),
	CONSTRAINT "sponsors_term_date_check" CHECK ("sponsors"."term_end" IS NULL OR "sponsors"."term_start" IS NULL OR "sponsors"."term_end" >= "sponsors"."term_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"display_name" varchar(150),
	"bio" text,
	"county" "kenyan_county",
	"constituency" varchar(100),
	"ward" varchar(100),
	"national_id_hash" varchar(64),
	"is_id_verified" boolean DEFAULT false NOT NULL,
	"phone_number" varchar(20),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"phone_verification_code" varchar(10),
	"phone_verification_expires_at" timestamp with time zone,
	"email_notifications_consent" boolean DEFAULT true NOT NULL,
	"sms_notifications_consent" boolean DEFAULT false NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"data_processing_consent" boolean DEFAULT true NOT NULL,
	"consent_date" timestamp with time zone DEFAULT now() NOT NULL,
	"preferred_language" varchar(10) DEFAULT 'en' NOT NULL,
	"timezone" varchar(50) DEFAULT 'Africa/Nairobi' NOT NULL,
	"accessibility_needs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"emergency_contact_name" varchar(200),
	"emergency_contact_phone" varchar(20),
	"emergency_contact_relationship" varchar(50),
	"avatar_url" varchar(500),
	"website" varchar(255),
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"privacy_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bill_alerts" boolean DEFAULT true NOT NULL,
	"comment_alerts" boolean DEFAULT true NOT NULL,
	"campaign_alerts" boolean DEFAULT true NOT NULL,
	"system_alerts" boolean DEFAULT true NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"sms_notifications" boolean DEFAULT false NOT NULL,
	"push_notifications" boolean DEFAULT true NOT NULL,
	"whatsapp_notifications" boolean DEFAULT false NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"digest_frequency" varchar(20) DEFAULT 'daily' NOT NULL,
	"quiet_hours" jsonb DEFAULT '{"start": "22:00", "end": "08:00"}'::jsonb NOT NULL,
	"county_alerts" kenyan_county[],
	"constituency_alerts" varchar(100)[],
	"notification_language" varchar(10) DEFAULT 'en' NOT NULL,
	"accessibility_format" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_preferences_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_engagement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"engagement_type" "engagement_type" NOT NULL,
	"engagement_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"user_county" "kenyan_county",
	"user_constituency" varchar(100),
	"session_duration_seconds" integer,
	"device_type" varchar(50),
	"view_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"engagement_score" numeric(10, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_engagement_bill_user_type_unique" UNIQUE("bill_id","user_id","engagement_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_tracking_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"notify_on_status_change" boolean DEFAULT true NOT NULL,
	"notify_on_new_comments" boolean DEFAULT false NOT NULL,
	"notify_on_hearing_scheduled" boolean DEFAULT true NOT NULL,
	"notify_on_committee_report" boolean DEFAULT true NOT NULL,
	"notification_frequency" varchar(20) DEFAULT 'immediate' NOT NULL,
	"tracking_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tracking_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_tracking_preferences_user_bill_unique" UNIQUE("user_id","bill_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"vote_type" "bill_vote_type" NOT NULL,
	"voting_reason" text,
	"public_vote" boolean DEFAULT true NOT NULL,
	"user_county" "kenyan_county",
	"user_constituency" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_votes_bill_user_unique" UNIQUE("bill_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comment_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"vote_type" "comment_vote_type" NOT NULL,
	"voting_reason" text,
	"vote_weight" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_votes_comment_user_unique" UNIQUE("comment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"comment_text" text NOT NULL,
	"comment_summary" varchar(500),
	"parent_comment_id" uuid,
	"thread_depth" integer DEFAULT 0 NOT NULL,
	"position" varchar(20),
	"sentiment_score" numeric(3, 2),
	"is_constructive" boolean DEFAULT true NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"moderation_notes" text,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"downvote_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"user_county" "kenyan_county",
	"user_constituency" varchar(100),
	"argument_extracted" boolean DEFAULT false NOT NULL,
	"included_in_brief" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"related_bill_id" uuid,
	"related_comment_id" uuid,
	"related_user_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"is_dismissed" boolean DEFAULT false NOT NULL,
	"delivery_method" varchar(50) DEFAULT 'in_app' NOT NULL,
	"delivery_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"action_taken" boolean DEFAULT false NOT NULL,
	"action_type" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_contact_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contact_type" varchar(20) NOT NULL,
	"contact_value" varchar(320) NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verification_code" varchar(10),
	"verification_expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"delivery_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_contact_methods_user_contact_unique" UNIQUE("user_id","contact_type","contact_value")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"amendment_number" varchar(50) NOT NULL,
	"amendment_title" varchar(500),
	"section_affected" varchar(100),
	"amendment_type" varchar(30) NOT NULL,
	"original_text" text,
	"proposed_text" text NOT NULL,
	"amendment_rationale" text,
	"proposed_by_id" uuid,
	"proposed_by_committee_id" uuid,
	"proposed_date" date DEFAULT CURRENT_DATE NOT NULL,
	"status" varchar(30) DEFAULT 'proposed' NOT NULL,
	"voting_date" date,
	"votes_for" integer DEFAULT 0 NOT NULL,
	"votes_against" integer DEFAULT 0 NOT NULL,
	"votes_abstain" integer DEFAULT 0 NOT NULL,
	"constitutional_implications" text,
	"financial_implications" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_amendments_bill_amendment_number_unique" UNIQUE("bill_id","amendment_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_committee_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"committee_id" uuid NOT NULL,
	"assignment_type" varchar(50) NOT NULL,
	"assigned_date" date DEFAULT CURRENT_DATE NOT NULL,
	"assignment_reason" text,
	"status" varchar(30) DEFAULT 'assigned' NOT NULL,
	"expected_report_date" date,
	"actual_report_date" date,
	"report_url" varchar(500),
	"report_summary" text,
	"committee_recommendation" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_cosponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"cosponsor_type" varchar(30) DEFAULT 'supporting' NOT NULL,
	"joined_date" date DEFAULT CURRENT_DATE NOT NULL,
	"contribution_description" text,
	"public_statement" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_cosponsors_bill_sponsor_unique" UNIQUE("bill_id","sponsor_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"session_id" uuid,
	"reading_number" smallint NOT NULL,
	"reading_date" date NOT NULL,
	"reading_stage" varchar(50),
	"outcome" varchar(30),
	"votes_for" integer,
	"votes_against" integer,
	"votes_abstain" integer,
	"debate_summary" text,
	"key_speakers" varchar(100)[],
	"hansard_reference" varchar(100),
	"next_reading_scheduled" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_readings_bill_reading_number_unique" UNIQUE("bill_id","reading_number"),
	CONSTRAINT "bill_readings_reading_number_check" CHECK ("bill_readings"."reading_number" >= 1 AND "bill_readings"."reading_number" <= 3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"version_number" varchar(20) NOT NULL,
	"version_name" varchar(100),
	"full_text" text NOT NULL,
	"summary_of_changes" text,
	"created_by_stage" varchar(50),
	"is_current_version" boolean DEFAULT false NOT NULL,
	"document_url" varchar(500),
	"document_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_versions_bill_version_number_unique" UNIQUE("bill_id","version_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parliamentary_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"vote_stage" varchar(50) NOT NULL,
	"vote_date" date NOT NULL,
	"amendment_id" uuid,
	"vote_choice" varchar(20) NOT NULL,
	"vote_explanation" text,
	"session_id" uuid,
	"hansard_reference" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parliamentary_votes_sponsor_bill_stage_unique" UNIQUE("sponsor_id","bill_id","vote_stage","amendment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_hearings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"event_id" uuid,
	"hearing_title" varchar(500) NOT NULL,
	"hearing_date" date NOT NULL,
	"start_time" varchar(10),
	"end_time" varchar(10),
	"venue" varchar(300),
	"presiding_committee_id" uuid,
	"chairperson_id" uuid,
	"invited_speakers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"public_speakers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hearing_status" varchar(30) DEFAULT 'scheduled' NOT NULL,
	"transcript_url" varchar(500),
	"video_url" varchar(500),
	"summary_report" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_participation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_title" varchar(500) NOT NULL,
	"event_description" text,
	"event_date" date NOT NULL,
	"event_time" varchar(20),
	"venue" varchar(300),
	"county" varchar(50),
	"expected_participants" integer,
	"actual_participants" integer,
	"registration_required" boolean DEFAULT false NOT NULL,
	"registration_deadline" date,
	"event_status" varchar(30) DEFAULT 'scheduled' NOT NULL,
	"summary_report_url" varchar(500),
	"key_outcomes" text,
	"organizing_committee_id" uuid,
	"contact_person" varchar(200),
	"contact_email" varchar(320),
	"contact_phone" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"event_id" uuid,
	"submitter_name" varchar(200),
	"submitter_organization" varchar(300),
	"submitter_type" varchar(50),
	"submitter_contact" jsonb DEFAULT '{}'::jsonb,
	"submission_title" varchar(500),
	"submission_text" text NOT NULL,
	"position" varchar(20),
	"submission_method" varchar(30) NOT NULL,
	"submission_date" date DEFAULT CURRENT_DATE NOT NULL,
	"review_status" varchar(30) DEFAULT 'received' NOT NULL,
	"committee_response" text,
	"supporting_documents" varchar(500)[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analysis_audit_trail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"actor_id" uuid,
	"actor_type" varchar(20) NOT NULL,
	"changes_made" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "constitutional_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"analysis_type" varchar(50) NOT NULL,
	"confidence_score" numeric(3, 2),
	"constitutional_provisions_cited" uuid[],
	"potential_violations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constitutional_alignment" varchar(20),
	"executive_summary" text NOT NULL,
	"detailed_analysis" text,
	"recommendations" text,
	"requires_expert_review" boolean DEFAULT false NOT NULL,
	"expert_reviewed" boolean DEFAULT false NOT NULL,
	"expert_reviewer_id" uuid,
	"expert_notes" text,
	"analysis_version" integer DEFAULT 1 NOT NULL,
	"superseded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "constitutional_provisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_number" smallint NOT NULL,
	"article_number" smallint,
	"section_number" smallint,
	"clause_number" smallint,
	"title" varchar(500) NOT NULL,
	"full_text" text NOT NULL,
	"summary" text,
	"is_fundamental_right" boolean DEFAULT false NOT NULL,
	"is_directive_principle" boolean DEFAULT false NOT NULL,
	"enforcement_mechanism" varchar(100),
	"related_provisions" uuid[],
	"keywords" varchar(100)[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "constitutional_provisions_ref_unique" UNIQUE("chapter_number","article_number","section_number","clause_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expert_review_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"priority_level" varchar(20) DEFAULT 'medium' NOT NULL,
	"review_reason" varchar(100) NOT NULL,
	"assigned_expert_id" uuid,
	"assigned_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "legal_precedents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_name" varchar(500) NOT NULL,
	"case_number" varchar(100),
	"court_level" varchar(50) NOT NULL,
	"judgment_date" date,
	"judges" varchar(100)[],
	"case_summary" text,
	"legal_principle" text,
	"constitutional_provisions_involved" uuid[],
	"precedent_strength" varchar(20),
	"judgment_url" varchar(500),
	"citation" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "arguments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"argument_text" text NOT NULL,
	"argument_summary" varchar(500),
	"position" varchar(20) NOT NULL,
	"argument_type" varchar(50),
	"strength_score" numeric(3, 2),
	"source_comments" uuid[],
	"extraction_method" varchar(20) NOT NULL,
	"confidence_score" numeric(3, 2),
	"support_count" integer DEFAULT 0 NOT NULL,
	"opposition_count" integer DEFAULT 0 NOT NULL,
	"citizen_endorsements" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by" uuid,
	"quality_score" numeric(3, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "argument_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_argument_id" uuid NOT NULL,
	"target_argument_id" uuid NOT NULL,
	"relationship_type" varchar(50) NOT NULL,
	"strength" numeric(3, 2),
	"explanation" text,
	"detected_by" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "argument_relationships_source_target_unique" UNIQUE("source_argument_id","target_argument_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_text" text NOT NULL,
	"claim_summary" varchar(300),
	"claim_type" varchar(50),
	"verification_status" varchar(20) DEFAULT 'unverified' NOT NULL,
	"fact_check_url" varchar(500),
	"supporting_arguments" uuid[],
	"contradicting_arguments" uuid[],
	"mention_count" integer DEFAULT 1 NOT NULL,
	"bills_referenced" uuid[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_type" varchar(50) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"source_url" varchar(500),
	"source_organization" varchar(200),
	"publication_date" date,
	"credibility_score" numeric(3, 2),
	"peer_reviewed" boolean DEFAULT false NOT NULL,
	"supports_claims" uuid[],
	"contradicts_claims" uuid[],
	"supports_arguments" uuid[],
	"citation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "legislative_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"brief_type" varchar(50) NOT NULL,
	"title" varchar(500) NOT NULL,
	"executive_summary" text NOT NULL,
	"key_arguments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stakeholder_positions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"public_sentiment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"constitutional_implications" text,
	"legal_precedents_cited" uuid[],
	"generated_by" varchar(20) NOT NULL,
	"data_cutoff_date" timestamp with time zone NOT NULL,
	"delivered_to_committee" boolean DEFAULT false NOT NULL,
	"committee_response" text,
	"public_release_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "synthesis_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" varchar(50) NOT NULL,
	"bill_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"progress_percentage" smallint DEFAULT 0 NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"results" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "action_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"completed_date" date DEFAULT CURRENT_DATE NOT NULL,
	"completion_method" varchar(50),
	"completion_notes" text,
	"evidence_url" varchar(500),
	"verification_status" varchar(30) DEFAULT 'self_reported' NOT NULL,
	"target_contacted" varchar(200),
	"response_received" boolean DEFAULT false NOT NULL,
	"response_content" text,
	"completion_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_completions_action_user_unique" UNIQUE("action_item_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "action_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"difficulty_level" varchar(20) NOT NULL,
	"estimated_time_minutes" smallint,
	"impact_score" smallint DEFAULT 1 NOT NULL,
	"action_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"completion_count" integer DEFAULT 0 NOT NULL,
	"target_completions" integer,
	"display_order" smallint DEFAULT 1 NOT NULL,
	"prerequisite_actions" uuid[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_impact_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"metric_date" date DEFAULT CURRENT_DATE NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"total_participants" integer DEFAULT 0 NOT NULL,
	"new_participants_today" integer DEFAULT 0 NOT NULL,
	"active_participants" integer DEFAULT 0 NOT NULL,
	"actions_completed_today" integer DEFAULT 0 NOT NULL,
	"total_actions_completed" integer DEFAULT 0 NOT NULL,
	"average_actions_per_participant" numeric(5, 2),
	"social_media_shares" integer DEFAULT 0 NOT NULL,
	"email_opens" integer DEFAULT 0 NOT NULL,
	"website_visits" integer DEFAULT 0 NOT NULL,
	"legislative_responses" integer DEFAULT 0 NOT NULL,
	"media_mentions" integer DEFAULT 0 NOT NULL,
	"policy_changes" integer DEFAULT 0 NOT NULL,
	"county_participation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"detailed_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_impact_metrics_campaign_date_type_unique" UNIQUE("campaign_id","metric_date","metric_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_date" date DEFAULT CURRENT_DATE NOT NULL,
	"participation_level" varchar(30) DEFAULT 'supporter' NOT NULL,
	"notification_preferences" jsonb DEFAULT '{"email_updates": true, "sms_updates": false, "action_reminders": true, "milestone_alerts": true}'::jsonb NOT NULL,
	"actions_completed" integer DEFAULT 0 NOT NULL,
	"last_action_date" date,
	"volunteer_skills" varchar(100)[],
	"availability" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"participant_county" "kenyan_county",
	"participant_constituency" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_participants_campaign_user_unique" UNIQUE("campaign_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"target_bills" uuid[],
	"primary_bill_id" uuid,
	"campaign_goal" text NOT NULL,
	"key_messages" varchar(300)[],
	"call_to_action" text NOT NULL,
	"created_by_id" uuid NOT NULL,
	"organization_name" varchar(300),
	"organization_type" varchar(50),
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"launch_date" date,
	"target_end_date" date,
	"actual_end_date" date,
	"geographic_scope" varchar(30) NOT NULL,
	"target_counties" kenyan_county[],
	"target_constituencies" varchar(100)[],
	"participant_count" integer DEFAULT 0 NOT NULL,
	"target_participant_count" integer,
	"actions_completed" integer DEFAULT 0 NOT NULL,
	"budget" numeric(12, 2),
	"funding_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"moderation_status" varchar(30) DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_slug_unique" UNIQUE("slug"),
	CONSTRAINT "campaigns_date_range_check" CHECK ("campaigns"."target_end_date" IS NULL OR "campaigns"."launch_date" IS NULL OR "campaigns"."target_end_date" >= "campaigns"."launch_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coalition_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"primary_campaign_id" uuid NOT NULL,
	"partner_campaign_id" uuid NOT NULL,
	"relationship_type" varchar(50) NOT NULL,
	"relationship_strength" varchar(20),
	"collaboration_areas" varchar(100)[],
	"shared_resources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"joint_actions" uuid[],
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"established_date" date DEFAULT CURRENT_DATE NOT NULL,
	"end_date" date,
	"collaboration_notes" text,
	"success_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coalition_relationships_primary_partner_unique" UNIQUE("primary_campaign_id","partner_campaign_id"),
	CONSTRAINT "coalition_relationships_self_relationship_check" CHECK ("coalition_relationships"."primary_campaign_id" != "coalition_relationships"."partner_campaign_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ambassadors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ambassador_code" varchar(20) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"contact_phone" varchar(50),
	"contact_email" varchar(255),
	"preferred_contact_method" varchar(50) NOT NULL,
	"primary_county" "kenyan_county" NOT NULL,
	"primary_constituency" varchar(100),
	"coverage_areas" varchar(100)[],
	"background" text,
	"languages_spoken" varchar(50)[],
	"specializations" varchar(100)[],
	"has_smartphone" boolean DEFAULT false NOT NULL,
	"has_laptop" boolean DEFAULT false NOT NULL,
	"connectivity_level" varchar(50),
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"verification_status" varchar(30) DEFAULT 'unverified' NOT NULL,
	"training_completed" boolean DEFAULT false NOT NULL,
	"training_completion_date" date,
	"certification_level" varchar(30),
	"sessions_conducted" integer DEFAULT 0 NOT NULL,
	"people_reached" integer DEFAULT 0 NOT NULL,
	"last_activity_date" date,
	"recruited_by_id" uuid,
	"onboarding_date" date DEFAULT CURRENT_DATE NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ambassadors_ambassador_code_unique" UNIQUE("ambassador_code"),
	CONSTRAINT "ambassadors_contact_method_check" CHECK ("ambassadors"."contact_phone" IS NOT NULL OR "ambassadors"."contact_email" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(300) NOT NULL,
	"community_type" varchar(50) NOT NULL,
	"county" "kenyan_county",
	"constituency" varchar(100),
	"ward" varchar(100),
	"sub_location" varchar(100),
	"estimated_population" integer,
	"primary_language" varchar(50),
	"secondary_languages" varchar(50)[],
	"internet_penetration" numeric(5, 2),
	"smartphone_penetration" numeric(5, 2),
	"literacy_rate" numeric(5, 2),
	"primary_concerns" varchar(100)[],
	"engagement_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"traditional_leaders" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"community_groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"primary_ambassador_id" uuid,
	"secondary_ambassadors" uuid[],
	"is_active" boolean DEFAULT true NOT NULL,
	"last_engagement_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "facilitation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_code" varchar(30) NOT NULL,
	"session_title" varchar(500),
	"ambassador_id" uuid NOT NULL,
	"community_id" uuid,
	"session_date" date NOT NULL,
	"start_time" varchar(10),
	"end_time" varchar(10),
	"venue" varchar(300),
	"venue_type" varchar(50),
	"bills_discussed" uuid[],
	"primary_bill_id" uuid,
	"session_agenda" text,
	"materials_used" varchar(100)[],
	"planned_participants" integer,
	"actual_participants" integer,
	"participant_demographics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"session_format" varchar(50),
	"participation_methods" varchar(50)[],
	"language_used" varchar(50),
	"session_status" varchar(30) DEFAULT 'planned' NOT NULL,
	"key_outcomes" text,
	"action_items_generated" text,
	"follow_up_needed" boolean DEFAULT false NOT NULL,
	"feedback_collected" integer DEFAULT 0 NOT NULL,
	"photos_taken" integer DEFAULT 0 NOT NULL,
	"audio_recorded" boolean DEFAULT false NOT NULL,
	"sync_status" varchar(20) DEFAULT 'synced' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facilitation_sessions_session_code_unique" UNIQUE("session_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "localized_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"source_id" uuid NOT NULL,
	"content_key" varchar(100) NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"country_code" varchar(5) DEFAULT 'KE' NOT NULL,
	"cultural_context" varchar(50),
	"original_text" text NOT NULL,
	"localized_text" text NOT NULL,
	"simplified_text" text,
	"audio_url" varchar(500),
	"translation_method" varchar(30) NOT NULL,
	"translator_id" uuid,
	"translation_quality" varchar(20),
	"reading_level" varchar(20),
	"cultural_adaptations" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"feedback_score" numeric(3, 2),
	"needs_update" boolean DEFAULT false NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"superseded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offline_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"bill_id" uuid NOT NULL,
	"collected_by_id" uuid NOT NULL,
	"participant_code" varchar(20),
	"participant_demographics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submission_text" text NOT NULL,
	"submission_language" varchar(50),
	"position" varchar(20),
	"collection_method" varchar(30) NOT NULL,
	"original_format" varchar(30),
	"transcription_quality" varchar(20),
	"verified_by_participant" boolean DEFAULT false NOT NULL,
	"processing_status" varchar(30) DEFAULT 'collected' NOT NULL,
	"needs_translation" boolean DEFAULT false NOT NULL,
	"translated_text" text,
	"audio_file_path" varchar(500),
	"photo_file_paths" varchar(500)[],
	"sync_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"integrated_with_online" boolean DEFAULT false NOT NULL,
	"online_comment_id" uuid,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ussd_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"user_id" uuid,
	"current_menu" varchar(100) DEFAULT 'main' NOT NULL,
	"menu_history" varchar(100)[],
	"session_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"session_active" boolean DEFAULT true NOT NULL,
	"session_start" timestamp with time zone DEFAULT now() NOT NULL,
	"session_end" timestamp with time zone,
	"last_interaction" timestamp with time zone DEFAULT now() NOT NULL,
	"menus_visited" integer DEFAULT 1 NOT NULL,
	"actions_performed" integer DEFAULT 0 NOT NULL,
	"bills_viewed" uuid[],
	"county" "kenyan_county",
	"telecom_provider" varchar(100),
	"session_outcome" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ussd_sessions_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "idx_ussd_sessions_session_id" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_financial_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"sponsor_id" uuid,
	"financial_interest_id" uuid,
	"entity_id" uuid,
	"conflict_type" varchar(50) NOT NULL,
	"conflict_severity" varchar(20) NOT NULL,
	"potential_financial_impact" numeric(15, 2),
	"impact_description" text NOT NULL,
	"affected_bill_sections" varchar(100)[],
	"detection_method" varchar(50) NOT NULL,
	"analysis_confidence" numeric(3, 2),
	"conflict_status" varchar(30) DEFAULT 'identified' NOT NULL,
	"resolution_notes" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"media_coverage" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(500) NOT NULL,
	"legal_name" varchar(500),
	"registration_number" varchar(100),
	"entity_type" varchar(50) NOT NULL,
	"industry_sector" varchar(100),
	"business_activities" varchar(100)[],
	"annual_revenue" numeric(15, 2),
	"employee_count" integer,
	"incorporation_date" date,
	"registration_country" varchar(5) DEFAULT 'KE' NOT NULL,
	"tax_id" varchar(50),
	"headquarters_address" text,
	"kenya_office_address" text,
	"official_address" text,
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"website_url" varchar(500),
	"parent_company_id" uuid,
	"ownership_structure" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"key_executives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_publicly_traded" boolean DEFAULT false NOT NULL,
	"stock_exchange" varchar(50),
	"stock_symbol" varchar(20),
	"regulatory_licenses" varchar(100)[],
	"compliance_status" varchar(30),
	"data_source" varchar(100),
	"verification_status" varchar(30) DEFAULT 'unverified' NOT NULL,
	"last_updated" date DEFAULT CURRENT_DATE NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cross_sector_ownership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_entity_id" uuid NOT NULL,
	"owned_entity_id" uuid NOT NULL,
	"ownership_type" varchar(50) NOT NULL,
	"ownership_percentage" numeric(5, 2),
	"control_level" varchar(30),
	"relationship_start" date,
	"relationship_end" date,
	"is_current" boolean DEFAULT true NOT NULL,
	"creates_cross_sector_influence" boolean DEFAULT false NOT NULL,
	"affected_sectors" varchar(100)[],
	"data_source" varchar(100),
	"verification_status" varchar(30) DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cross_sector_ownership_self_ownership_check" CHECK ("cross_sector_ownership"."owner_entity_id" != "cross_sector_ownership"."owned_entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financial_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holder_type" varchar(30) NOT NULL,
	"sponsor_id" uuid,
	"holder_name" varchar(200),
	"relationship_to_sponsor" varchar(100),
	"entity_id" uuid NOT NULL,
	"interest_type" varchar(50) NOT NULL,
	"position_title" varchar(200),
	"ownership_percentage" numeric(5, 2),
	"estimated_value" numeric(15, 2),
	"annual_income" numeric(12, 2),
	"start_date" date,
	"end_date" date,
	"is_current" boolean DEFAULT true NOT NULL,
	"disclosure_source" varchar(100),
	"disclosure_date" date,
	"is_publicly_disclosed" boolean DEFAULT false NOT NULL,
	"potential_conflict" boolean DEFAULT false NOT NULL,
	"conflict_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lobbying_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"lobbyist_entity_id" uuid,
	"lobbyist_name" varchar(200),
	"target_sponsor_id" uuid,
	"target_institution" varchar(200),
	"activity_date" date NOT NULL,
	"activity_description" text NOT NULL,
	"topics_discussed" varchar(100)[],
	"target_bills" uuid[],
	"policy_areas" varchar(100)[],
	"estimated_cost" numeric(12, 2),
	"gifts_or_benefits" text,
	"disclosure_required" boolean DEFAULT false NOT NULL,
	"is_disclosed" boolean DEFAULT false NOT NULL,
	"disclosure_reference" varchar(200),
	"information_source" varchar(100),
	"source_reliability" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regulatory_capture_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"sponsor_id" uuid,
	"regulatory_body" varchar(200),
	"indicator_description" text NOT NULL,
	"evidence_summary" text,
	"indicator_strength" varchar(20) NOT NULL,
	"confidence_level" numeric(3, 2),
	"pattern_start_date" date,
	"pattern_end_date" date,
	"is_ongoing" boolean DEFAULT true NOT NULL,
	"affected_policies" varchar(100)[],
	"estimated_public_cost" numeric(15, 2),
	"detection_method" varchar(50),
	"analysis_methodology" text,
	"investigation_status" varchar(30) DEFAULT 'identified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attribution_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_type" varchar(50) NOT NULL,
	"target_bill_id" uuid,
	"target_campaign_id" uuid,
	"assessment_start_date" date NOT NULL,
	"assessment_end_date" date NOT NULL,
	"assessment_methodology" varchar(100) NOT NULL,
	"control_group_description" text,
	"platform_contribution_percentage" numeric(5, 2),
	"confidence_level" numeric(3, 2),
	"quantitative_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"qualitative_evidence" text,
	"confounding_factors" text,
	"alternative_explanations" text,
	"assessor_id" uuid,
	"peer_reviewed" boolean DEFAULT false NOT NULL,
	"methodology_validated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_implementation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"expected_implementation_date" date,
	"actual_implementation_date" date,
	"implementation_delay_days" integer,
	"implementing_agencies" varchar(200)[],
	"budget_allocated" numeric(15, 2),
	"budget_utilized" numeric(15, 2),
	"implementation_percentage" numeric(5, 2),
	"key_milestones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"implementation_challenges" text,
	"legal_challenges" text,
	"citizen_reports_count" integer DEFAULT 0 NOT NULL,
	"media_coverage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "civic_engagement_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"measurement_date" date NOT NULL,
	"measurement_period" varchar(20) NOT NULL,
	"total_registered_users" integer DEFAULT 0 NOT NULL,
	"monthly_active_users" integer DEFAULT 0 NOT NULL,
	"daily_active_users" integer DEFAULT 0 NOT NULL,
	"new_user_registrations" integer DEFAULT 0 NOT NULL,
	"comments_posted" integer DEFAULT 0 NOT NULL,
	"bills_viewed" integer DEFAULT 0 NOT NULL,
	"votes_cast" integer DEFAULT 0 NOT NULL,
	"shares_made" integer DEFAULT 0 NOT NULL,
	"campaigns_created" integer DEFAULT 0 NOT NULL,
	"campaign_participants" integer DEFAULT 0 NOT NULL,
	"actions_completed" integer DEFAULT 0 NOT NULL,
	"average_comment_length" real,
	"constructive_comments_percentage" real,
	"repeat_engagement_rate" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "demographic_equity_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"age_range" varchar(30),
	"gender" varchar(20),
	"education_level" varchar(50),
	"income_bracket" varchar(50),
	"measurement_date" date NOT NULL,
	"measurement_period" varchar(20) NOT NULL,
	"estimated_population" integer,
	"registered_users" integer DEFAULT 0 NOT NULL,
	"active_users" integer DEFAULT 0 NOT NULL,
	"average_session_duration" real,
	"average_actions_per_session" real,
	"preferred_engagement_types" varchar(50)[],
	"reported_barriers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"support_needs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"participation_rate" real,
	"engagement_quality_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digital_inclusion_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"measurement_date" date NOT NULL,
	"geographic_scope" varchar(50),
	"county" "kenyan_county",
	"smartphone_users" integer DEFAULT 0 NOT NULL,
	"feature_phone_users" integer DEFAULT 0 NOT NULL,
	"computer_users" integer DEFAULT 0 NOT NULL,
	"shared_device_users" integer DEFAULT 0 NOT NULL,
	"high_speed_users" integer DEFAULT 0 NOT NULL,
	"mobile_data_users" integer DEFAULT 0 NOT NULL,
	"intermittent_connectivity_users" integer DEFAULT 0 NOT NULL,
	"offline_only_users" integer DEFAULT 0 NOT NULL,
	"web_platform_usage" integer DEFAULT 0 NOT NULL,
	"mobile_app_usage" integer DEFAULT 0 NOT NULL,
	"ussd_usage" integer DEFAULT 0 NOT NULL,
	"ambassador_facilitated_usage" integer DEFAULT 0 NOT NULL,
	"mobile_vs_desktop_access" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mobile_only_users_percentage" real,
	"smartphone_vs_feature_phone" jsonb DEFAULT '{}'::jsonb,
	"device_diversity_index" real,
	"platform_switching_rate" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financial_sustainability_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"measurement_date" date NOT NULL,
	"measurement_period" varchar(20) NOT NULL,
	"infrastructure_costs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"personnel_costs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"operational_costs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_costs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"grant_funding" numeric(12, 2) DEFAULT '0' NOT NULL,
	"subscription_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"service_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cost_per_active_user" numeric(8, 2),
	"cost_per_engagement" numeric(8, 4),
	"funding_runway_months" real,
	"revenue_growth_rate" real,
	"cost_efficiency_trend" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "geographic_equity_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"county" "kenyan_county" NOT NULL,
	"constituency" varchar(100),
	"measurement_date" date NOT NULL,
	"measurement_period" varchar(20) NOT NULL,
	"total_population" integer,
	"eligible_population" integer,
	"internet_penetration_rate" real,
	"registered_users" integer DEFAULT 0 NOT NULL,
	"active_users" integer DEFAULT 0 NOT NULL,
	"new_registrations" integer DEFAULT 0 NOT NULL,
	"comments_posted" integer DEFAULT 0 NOT NULL,
	"bills_viewed" integer DEFAULT 0 NOT NULL,
	"votes_cast" integer DEFAULT 0 NOT NULL,
	"campaigns_joined" integer DEFAULT 0 NOT NULL,
	"facilitation_sessions_held" integer DEFAULT 0 NOT NULL,
	"offline_participants" integer DEFAULT 0 NOT NULL,
	"participation_rate" real,
	"engagement_intensity" real,
	"digital_divide_index" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "legislative_impact_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"measurement_date" date NOT NULL,
	"measurement_period" varchar(20) NOT NULL,
	"bills_introduced" integer DEFAULT 0 NOT NULL,
	"bills_with_public_engagement" integer DEFAULT 0 NOT NULL,
	"bills_amended_after_engagement" integer DEFAULT 0 NOT NULL,
	"bills_passed" integer DEFAULT 0 NOT NULL,
	"bills_rejected" integer DEFAULT 0 NOT NULL,
	"average_comments_per_bill" real,
	"average_participants_per_bill" real,
	"public_participation_events_held" integer DEFAULT 0 NOT NULL,
	"amendments_from_public_input" integer DEFAULT 0 NOT NULL,
	"substantive_changes_percentage" real,
	"bills_implemented_on_time" integer DEFAULT 0 NOT NULL,
	"average_implementation_delay_days" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "legislative_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"final_status" varchar(50) NOT NULL,
	"outcome_date" date NOT NULL,
	"total_readings" smallint DEFAULT 0 NOT NULL,
	"committee_stages" smallint DEFAULT 0 NOT NULL,
	"amendment_count" integer DEFAULT 0 NOT NULL,
	"public_comments_received" integer DEFAULT 0 NOT NULL,
	"public_participation_events" integer DEFAULT 0 NOT NULL,
	"campaign_activities" integer DEFAULT 0 NOT NULL,
	"final_vote_for" integer,
	"final_vote_against" integer,
	"final_vote_abstain" integer,
	"vote_margin" integer,
	"amendments_from_public_input" integer DEFAULT 0 NOT NULL,
	"substantive_changes_made" boolean DEFAULT false NOT NULL,
	"changes_summary" text,
	"implementation_status" varchar(30),
	"implementation_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participation_cohorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_name" varchar(200) NOT NULL,
	"cohort_type" varchar(50) NOT NULL,
	"definition_criteria" jsonb NOT NULL,
	"county" "kenyan_county",
	"constituency" varchar(100),
	"urban_rural" varchar(20),
	"age_range" varchar(30),
	"gender" varchar(20),
	"education_level" varchar(50),
	"income_bracket" varchar(50),
	"device_type" varchar(30),
	"connectivity_level" varchar(30),
	"registration_period" varchar(50),
	"cohort_start_date" date,
	"cohort_end_date" date,
	"total_members" integer DEFAULT 0 NOT NULL,
	"active_members" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"analysis_frequency" varchar(20) DEFAULT 'monthly' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_performance_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_name" varchar(200) NOT NULL,
	"indicator_category" varchar(50) NOT NULL,
	"measurement_date" date NOT NULL,
	"measurement_period" varchar(20) NOT NULL,
	"current_value" numeric(15, 4) NOT NULL,
	"target_value" numeric(15, 4),
	"baseline_value" numeric(15, 4),
	"previous_period_value" numeric(15, 4),
	"change_percentage" real,
	"trend_direction" varchar(20),
	"calculation_method" text,
	"data_sources" varchar(100)[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "success_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"story_type" varchar(50) NOT NULL,
	"related_bill_id" uuid,
	"related_campaign_id" uuid,
	"geographic_scope" varchar(50),
	"story_summary" text NOT NULL,
	"detailed_narrative" text,
	"key_actors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quantified_impact" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"people_affected" integer,
	"evidence_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_status" varchar(30) DEFAULT 'unverified' NOT NULL,
	"story_date" date NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"documented_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reported_comment_id" uuid,
	"reported_user_id" uuid,
	"reporter_id" uuid NOT NULL,
	"reporter_anonymous" boolean DEFAULT false NOT NULL,
	"report_category" varchar(50) NOT NULL,
	"report_reason" text NOT NULL,
	"report_severity" "severity" DEFAULT 'medium' NOT NULL,
	"evidence_screenshots" varchar(500)[],
	"additional_context" text,
	"report_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"assigned_moderator_id" uuid,
	"resolution_action" varchar(100),
	"resolution_notes" text,
	"resolved_at" timestamp with time zone,
	"reporter_feedback" text,
	"reporter_satisfaction" smallint,
	"appeal_requested" boolean DEFAULT false NOT NULL,
	"appeal_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expert_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expertise_domains" varchar(100)[] NOT NULL,
	"specializations" varchar(100)[],
	"years_of_experience" smallint,
	"current_position" varchar(255),
	"organization" varchar(255),
	"professional_bio" text,
	"educational_background" jsonb DEFAULT '[]'::jsonb,
	"professional_certifications" varchar(255)[],
	"publications" jsonb DEFAULT '[]'::jsonb,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"verification_date" timestamp with time zone,
	"verified_by" uuid,
	"verification_expires_at" timestamp with time zone,
	"credential_documents" varchar(500)[],
	"reference_contacts" jsonb DEFAULT '[]'::jsonb,
	"review_capacity" varchar(50) DEFAULT 'occasional' NOT NULL,
	"review_expertise" jsonb DEFAULT '{}'::jsonb,
	"available_for_review" boolean DEFAULT true NOT NULL,
	"reviews_completed" integer DEFAULT 0 NOT NULL,
	"reviews_accepted" integer DEFAULT 0 NOT NULL,
	"review_quality_score" numeric(3, 2),
	"community_rating" numeric(3, 2),
	"average_review_time_hours" numeric(6, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"content_id" uuid NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"report_id" uuid,
	"priority_score" numeric(5, 2) DEFAULT '5.0' NOT NULL,
	"assigned_moderator_id" uuid,
	"assigned_at" timestamp with time zone,
	"queue_status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"review_started_at" timestamp with time zone,
	"review_completed_at" timestamp with time zone,
	"review_duration_seconds" integer,
	"moderation_action" varchar(100),
	"moderation_reason" text,
	"moderation_notes" text,
	"confidence_score" numeric(3, 2),
	"qa_review_required" boolean DEFAULT false NOT NULL,
	"qa_reviewed_by" uuid,
	"qa_review_notes" text,
	"qa_approved" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_subtype" varchar(100),
	"severity" "severity" NOT NULL,
	"detection_method" varchar(100) NOT NULL,
	"detection_rule" varchar(100),
	"detection_confidence" numeric(3, 2),
	"actor_user_id" uuid,
	"actor_ip_address" varchar(45),
	"actor_session_id" varchar(255),
	"actor_fingerprint" varchar(255),
	"event_description" text NOT NULL,
	"event_evidence" jsonb DEFAULT '{}'::jsonb,
	"attack_vector" varchar(100),
	"affected_systems" varchar(100)[],
	"affected_users" integer DEFAULT 0,
	"data_compromised" boolean DEFAULT false NOT NULL,
	"data_types_affected" varchar(100)[],
	"service_impact" varchar(100),
	"automated_response" jsonb DEFAULT '{}'::jsonb,
	"manual_response_required" boolean DEFAULT false NOT NULL,
	"response_initiated_by" uuid,
	"response_initiated_at" timestamp with time zone,
	"incident_id" varchar(100),
	"escalated" boolean DEFAULT false NOT NULL,
	"escalated_to" varchar(100),
	"resolution_status" varchar(50) DEFAULT 'open' NOT NULL,
	"resolution_notes" text,
	"lessons_learned" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_category" varchar(50) NOT NULL,
	"severity" "severity" DEFAULT 'low' NOT NULL,
	"actor_type" varchar(50) NOT NULL,
	"actor_id" uuid,
	"actor_role" varchar(50),
	"actor_identifier" varchar(255),
	"action" varchar(100) NOT NULL,
	"action_details" jsonb DEFAULT '{}'::jsonb,
	"target_type" varchar(50),
	"target_id" uuid,
	"target_description" text,
	"success" boolean NOT NULL,
	"status_code" integer,
	"error_message" text,
	"error_stack" text,
	"source_ip" varchar(45),
	"user_agent" text,
	"session_id" varchar(255),
	"request_id" varchar(255),
	"processing_time_ms" integer,
	"resource_usage" jsonb DEFAULT '{}'::jsonb,
	"retention_period_days" integer DEFAULT 2555,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"activity_type" varchar(100) NOT NULL,
	"activity_category" varchar(50) NOT NULL,
	"activity_description" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"session_id" varchar(255),
	"request_id" varchar(255),
	"target_type" varchar(50),
	"target_id" uuid,
	"location_data" jsonb DEFAULT '{}'::jsonb,
	"risk_score" numeric(3, 2),
	"anomaly_detected" boolean DEFAULT false NOT NULL,
	"anomaly_type" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"verification_type" varchar(100) NOT NULL,
	"verification_level" smallint DEFAULT 1 NOT NULL,
	"verification_documents" varchar(500)[],
	"verification_data" jsonb DEFAULT '{}'::jsonb,
	"verification_hash" varchar(255),
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"verifier_id" uuid,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"verification_notes" text,
	"rejection_reason" text,
	"expires_at" timestamp with time zone,
	"renewal_required" boolean DEFAULT false NOT NULL,
	"renewal_reminder_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" varchar(100) NOT NULL,
	"event_category" varchar(50) NOT NULL,
	"event_action" varchar(50),
	"user_id" uuid,
	"anonymous_id" varchar(255),
	"session_id" varchar(255),
	"page_url" varchar(1000),
	"page_title" varchar(255),
	"referrer_url" varchar(1000),
	"referrer_type" varchar(50),
	"bill_id" uuid,
	"comment_id" uuid,
	"user_target_id" uuid,
	"event_properties" jsonb DEFAULT '{}'::jsonb,
	"user_agent" text,
	"device_type" varchar(50),
	"device_vendor" varchar(50),
	"browser" varchar(50),
	"browser_version" varchar(50),
	"operating_system" varchar(50),
	"os_version" varchar(50),
	"screen_resolution" varchar(20),
	"ip_address" varchar(45),
	"country" varchar(2),
	"region" varchar(100),
	"city" varchar(100),
	"county" "kenyan_county",
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"page_load_time_ms" integer,
	"time_on_page_ms" integer,
	"dom_interactive_ms" integer,
	"first_paint_ms" integer,
	"experiment_id" varchar(100),
	"experiment_variant" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_impact_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"metric_type" varchar(100) NOT NULL,
	"metric_category" varchar(50) NOT NULL,
	"total_value" numeric(15, 2) NOT NULL,
	"unique_value" numeric(15, 2),
	"average_value" numeric(10, 2),
	"median_value" numeric(10, 2),
	"change_from_previous" numeric(10, 2),
	"change_percent" numeric(10, 2),
	"measurement_date" date NOT NULL,
	"time_period" varchar(20) NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"county_breakdown" jsonb DEFAULT '{}'::jsonb,
	"demographic_breakdown" jsonb DEFAULT '{}'::jsonb,
	"source_breakdown" jsonb DEFAULT '{}'::jsonb,
	"platform_breakdown" jsonb DEFAULT '{}'::jsonb,
	"data_quality_score" numeric(3, 2),
	"sample_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"content_id" uuid NOT NULL,
	"measurement_date" date NOT NULL,
	"time_period" varchar(20) DEFAULT 'daily' NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"unique_views" integer DEFAULT 0 NOT NULL,
	"reach_rate" numeric(5, 4),
	"engagements_total" integer DEFAULT 0 NOT NULL,
	"engagement_rate" numeric(5, 4),
	"average_time_spent_seconds" integer,
	"scroll_depth_average" numeric(5, 2),
	"clicks" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"reactions" integer DEFAULT 0,
	"bookmarks" integer DEFAULT 0,
	"click_through_rate" numeric(5, 4),
	"conversion_rate" numeric(5, 4),
	"audience_breakdown" jsonb DEFAULT '{}'::jsonb,
	"top_counties" jsonb DEFAULT '[]'::jsonb,
	"virality_score" numeric(10, 2),
	"quality_score" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "county_engagement_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"county" "kenyan_county" NOT NULL,
	"active_users" integer DEFAULT 0 NOT NULL,
	"new_users" integer DEFAULT 0 NOT NULL,
	"returning_users" integer DEFAULT 0 NOT NULL,
	"total_engagements" integer DEFAULT 0 NOT NULL,
	"bills_viewed" integer DEFAULT 0 NOT NULL,
	"bills_viewed_unique" integer DEFAULT 0 NOT NULL,
	"comments_posted" integer DEFAULT 0 NOT NULL,
	"votes_cast" integer DEFAULT 0 NOT NULL,
	"votes_support" integer DEFAULT 0 NOT NULL,
	"votes_oppose" integer DEFAULT 0 NOT NULL,
	"shares_count" integer DEFAULT 0 NOT NULL,
	"sessions_count" integer DEFAULT 0 NOT NULL,
	"average_session_duration" numeric(8, 2),
	"median_session_duration" numeric(8, 2),
	"total_time_spent" numeric(12, 2),
	"avg_engagements_per_user" numeric(8, 2),
	"avg_bills_per_user" numeric(8, 2),
	"comment_rate" numeric(5, 2),
	"user_demographics" jsonb DEFAULT '{}'::jsonb,
	"device_breakdown" jsonb DEFAULT '{}'::jsonb,
	"measurement_date" date NOT NULL,
	"time_period" varchar(20) DEFAULT 'monthly' NOT NULL,
	"growth_rate" numeric(8, 2),
	"engagement_trend" varchar(20),
	"rank_by_engagement" integer,
	"percentile" numeric(5, 2),
	"vs_national_average" numeric(8, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" varchar(255) NOT NULL,
	"source_type" varchar(100) NOT NULL,
	"source_url" varchar(1000),
	"auth_method" varchar(100),
	"auth_credentials" jsonb DEFAULT '{}'::jsonb,
	"reliability_score" numeric(3, 2),
	"last_successful_sync" timestamp,
	"sync_failure_count" integer DEFAULT 0 NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"sync_frequency" varchar(50) DEFAULT 'daily' NOT NULL,
	"sync_parameters" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_health_check" timestamp,
	"health_status" varchar(50) DEFAULT 'unknown',
	"health_details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "external_bill_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"external_source" varchar(100) NOT NULL,
	"external_url" varchar(1000),
	"reference_type" varchar(50) NOT NULL,
	"confidence_score" numeric(3, 2),
	"last_verified" timestamp,
	"last_checked" timestamp,
	"verification_status" varchar(50) DEFAULT 'active' NOT NULL,
	"external_metadata" jsonb DEFAULT '{}'::jsonb,
	"access_count" integer DEFAULT 0,
	"last_accessed" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_health_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"measurement_timestamp" timestamp NOT NULL,
	"measurement_period_minutes" integer DEFAULT 5 NOT NULL,
	"avg_response_time_ms" integer,
	"p95_response_time_ms" integer,
	"p99_response_time_ms" integer,
	"error_rate" numeric(5, 4),
	"requests_total" integer,
	"requests_per_second" numeric(10, 2),
	"unique_visitors" integer,
	"concurrent_users" integer,
	"db_connection_pool_size" integer,
	"db_active_connections" integer,
	"db_query_time_avg_ms" integer,
	"db_slow_queries_count" integer,
	"cache_hit_rate" numeric(5, 4),
	"cache_memory_usage_mb" integer,
	"api_calls_total" integer,
	"api_success_rate" numeric(5, 4),
	"api_rate_limit_hits" integer,
	"cpu_usage_percent" numeric(5, 2),
	"memory_usage_percent" numeric(5, 2),
	"disk_usage_percent" numeric(5, 2),
	"services_healthy" integer,
	"services_degraded" integer,
	"services_down" integer,
	"alerts_triggered" integer DEFAULT 0,
	"incidents_active" integer DEFAULT 0,
	"health_score" numeric(3, 2),
	"health_status" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_source_id" uuid NOT NULL,
	"job_name" varchar(255) NOT NULL,
	"job_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_seconds" integer,
	"timeout_seconds" integer DEFAULT 3600,
	"records_processed" integer DEFAULT 0,
	"records_created" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"records_deleted" integer DEFAULT 0,
	"records_skipped" integer DEFAULT 0,
	"error_count" integer DEFAULT 0 NOT NULL,
	"error_details" jsonb DEFAULT '[]'::jsonb,
	"last_error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3,
	"memory_usage_mb" integer,
	"memory_peak_mb" integer,
	"cpu_usage_percent" numeric(5, 2),
	"progress_percent" numeric(5, 2) DEFAULT 0,
	"progress_message" varchar(500),
	"triggered_by" varchar(50) DEFAULT 'scheduled',
	"parent_job_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trending_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_date" date NOT NULL,
	"time_window_hours" integer NOT NULL,
	"analysis_start" timestamp NOT NULL,
	"analysis_end" timestamp NOT NULL,
	"trending_bills" jsonb DEFAULT '[]'::jsonb,
	"trending_topics" jsonb DEFAULT '[]'::jsonb,
	"emerging_topics" jsonb DEFAULT '[]'::jsonb,
	"engagement_velocity" jsonb DEFAULT '{}'::jsonb,
	"social_media_mentions" jsonb DEFAULT '{}'::jsonb,
	"news_coverage" jsonb DEFAULT '{}'::jsonb,
	"search_trends" jsonb DEFAULT '{}'::jsonb,
	"county_trends" jsonb DEFAULT '{}'::jsonb,
	"regional_differences" jsonb DEFAULT '{}'::jsonb,
	"sentiment_trends" jsonb DEFAULT '{}'::jsonb,
	"analysis_method" varchar(100) NOT NULL,
	"algorithm_version" varchar(50),
	"confidence_score" numeric(3, 2),
	"sample_size" integer,
	"statistical_significance" numeric(5, 4),
	"computation_time_ms" integer,
	"data_freshness_minutes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_engagement_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"measurement_date" date NOT NULL,
	"time_period" varchar(20) DEFAULT 'monthly' NOT NULL,
	"sessions_count" integer DEFAULT 0 NOT NULL,
	"total_time_spent_seconds" integer DEFAULT 0 NOT NULL,
	"days_active" integer DEFAULT 0 NOT NULL,
	"bills_viewed" integer DEFAULT 0 NOT NULL,
	"bills_viewed_unique" integer DEFAULT 0 NOT NULL,
	"comments_posted" integer DEFAULT 0 NOT NULL,
	"votes_cast" integer DEFAULT 0 NOT NULL,
	"shares_made" integer DEFAULT 0 NOT NULL,
	"comments_received" integer DEFAULT 0 NOT NULL,
	"likes_received" integer DEFAULT 0 NOT NULL,
	"mentions_received" integer DEFAULT 0 NOT NULL,
	"followers_gained" integer DEFAULT 0 NOT NULL,
	"followers_lost" integer DEFAULT 0 NOT NULL,
	"engagement_score" numeric(10, 2),
	"influence_score" numeric(10, 2),
	"most_active_time" varchar(50),
	"most_active_day" varchar(20),
	"preferred_device" varchar(50),
	"topic_interests" jsonb DEFAULT '{}'::jsonb,
	"engagement_distribution" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE varchar(320);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE user_role;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_verified" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "county" "kenyan_county";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "constituency" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_token" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_token" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "committees" ADD CONSTRAINT "committees_chair_id_sponsors_id_fk" FOREIGN KEY ("chair_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "committees" ADD CONSTRAINT "committees_vice_chair_id_sponsors_id_fk" FOREIGN KEY ("vice_chair_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parliamentary_sittings" ADD CONSTRAINT "parliamentary_sittings_session_id_parliamentary_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."parliamentary_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alert_preferences" ADD CONSTRAINT "alert_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_engagement" ADD CONSTRAINT "bill_engagement_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_engagement" ADD CONSTRAINT "bill_engagement_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_tracking_preferences" ADD CONSTRAINT "bill_tracking_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_tracking_preferences" ADD CONSTRAINT "bill_tracking_preferences_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_votes" ADD CONSTRAINT "bill_votes_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_votes" ADD CONSTRAINT "bill_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_bill_id_bills_id_fk" FOREIGN KEY ("related_bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_comment_id_comments_id_fk" FOREIGN KEY ("related_comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_user_id_users_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_contact_methods" ADD CONSTRAINT "user_contact_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_amendments" ADD CONSTRAINT "bill_amendments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_amendments" ADD CONSTRAINT "bill_amendments_proposed_by_id_sponsors_id_fk" FOREIGN KEY ("proposed_by_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_amendments" ADD CONSTRAINT "bill_amendments_proposed_by_committee_id_committees_id_fk" FOREIGN KEY ("proposed_by_committee_id") REFERENCES "public"."committees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_committee_assignments" ADD CONSTRAINT "bill_committee_assignments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_committee_assignments" ADD CONSTRAINT "bill_committee_assignments_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_cosponsors" ADD CONSTRAINT "bill_cosponsors_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_cosponsors" ADD CONSTRAINT "bill_cosponsors_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_readings" ADD CONSTRAINT "bill_readings_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_readings" ADD CONSTRAINT "bill_readings_session_id_parliamentary_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."parliamentary_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_versions" ADD CONSTRAINT "bill_versions_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parliamentary_votes" ADD CONSTRAINT "parliamentary_votes_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parliamentary_votes" ADD CONSTRAINT "parliamentary_votes_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parliamentary_votes" ADD CONSTRAINT "parliamentary_votes_amendment_id_bill_amendments_id_fk" FOREIGN KEY ("amendment_id") REFERENCES "public"."bill_amendments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parliamentary_votes" ADD CONSTRAINT "parliamentary_votes_session_id_parliamentary_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."parliamentary_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_hearings" ADD CONSTRAINT "public_hearings_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_hearings" ADD CONSTRAINT "public_hearings_event_id_public_participation_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."public_participation_events"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_hearings" ADD CONSTRAINT "public_hearings_presiding_committee_id_committees_id_fk" FOREIGN KEY ("presiding_committee_id") REFERENCES "public"."committees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_hearings" ADD CONSTRAINT "public_hearings_chairperson_id_sponsors_id_fk" FOREIGN KEY ("chairperson_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_participation_events" ADD CONSTRAINT "public_participation_events_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_participation_events" ADD CONSTRAINT "public_participation_events_organizing_committee_id_committees_id_fk" FOREIGN KEY ("organizing_committee_id") REFERENCES "public"."committees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_submissions" ADD CONSTRAINT "public_submissions_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "public_submissions" ADD CONSTRAINT "public_submissions_event_id_public_participation_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."public_participation_events"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analysis_audit_trail" ADD CONSTRAINT "analysis_audit_trail_analysis_id_constitutional_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."constitutional_analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analysis_audit_trail" ADD CONSTRAINT "analysis_audit_trail_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "constitutional_analyses" ADD CONSTRAINT "constitutional_analyses_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "constitutional_analyses" ADD CONSTRAINT "constitutional_analyses_expert_reviewer_id_users_id_fk" FOREIGN KEY ("expert_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "constitutional_analyses" ADD CONSTRAINT "constitutional_analyses_superseded_by_constitutional_analyses_id_fk" FOREIGN KEY ("superseded_by") REFERENCES "public"."constitutional_analyses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_review_queue" ADD CONSTRAINT "expert_review_queue_analysis_id_constitutional_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."constitutional_analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_review_queue" ADD CONSTRAINT "expert_review_queue_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_review_queue" ADD CONSTRAINT "expert_review_queue_assigned_expert_id_users_id_fk" FOREIGN KEY ("assigned_expert_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arguments" ADD CONSTRAINT "arguments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arguments" ADD CONSTRAINT "arguments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "argument_relationships" ADD CONSTRAINT "argument_relationships_source_argument_id_arguments_id_fk" FOREIGN KEY ("source_argument_id") REFERENCES "public"."arguments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "argument_relationships" ADD CONSTRAINT "argument_relationships_target_argument_id_arguments_id_fk" FOREIGN KEY ("target_argument_id") REFERENCES "public"."arguments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "legislative_briefs" ADD CONSTRAINT "legislative_briefs_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "synthesis_jobs" ADD CONSTRAINT "synthesis_jobs_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "action_completions" ADD CONSTRAINT "action_completions_action_item_id_action_items_id_fk" FOREIGN KEY ("action_item_id") REFERENCES "public"."action_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "action_completions" ADD CONSTRAINT "action_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "action_completions" ADD CONSTRAINT "action_completions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "action_items" ADD CONSTRAINT "action_items_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_impact_metrics" ADD CONSTRAINT "campaign_impact_metrics_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_participants" ADD CONSTRAINT "campaign_participants_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_participants" ADD CONSTRAINT "campaign_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_primary_bill_id_bills_id_fk" FOREIGN KEY ("primary_bill_id") REFERENCES "public"."bills"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coalition_relationships" ADD CONSTRAINT "coalition_relationships_primary_campaign_id_campaigns_id_fk" FOREIGN KEY ("primary_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coalition_relationships" ADD CONSTRAINT "coalition_relationships_partner_campaign_id_campaigns_id_fk" FOREIGN KEY ("partner_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ambassadors" ADD CONSTRAINT "ambassadors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ambassadors" ADD CONSTRAINT "ambassadors_recruited_by_id_users_id_fk" FOREIGN KEY ("recruited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communities" ADD CONSTRAINT "communities_primary_ambassador_id_ambassadors_id_fk" FOREIGN KEY ("primary_ambassador_id") REFERENCES "public"."ambassadors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "facilitation_sessions" ADD CONSTRAINT "facilitation_sessions_ambassador_id_ambassadors_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "public"."ambassadors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "facilitation_sessions" ADD CONSTRAINT "facilitation_sessions_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "facilitation_sessions" ADD CONSTRAINT "facilitation_sessions_primary_bill_id_bills_id_fk" FOREIGN KEY ("primary_bill_id") REFERENCES "public"."bills"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "localized_content" ADD CONSTRAINT "localized_content_translator_id_users_id_fk" FOREIGN KEY ("translator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offline_submissions" ADD CONSTRAINT "offline_submissions_session_id_facilitation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."facilitation_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offline_submissions" ADD CONSTRAINT "offline_submissions_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offline_submissions" ADD CONSTRAINT "offline_submissions_collected_by_id_ambassadors_id_fk" FOREIGN KEY ("collected_by_id") REFERENCES "public"."ambassadors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ussd_sessions" ADD CONSTRAINT "ussd_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_financial_conflicts" ADD CONSTRAINT "bill_financial_conflicts_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_financial_conflicts" ADD CONSTRAINT "bill_financial_conflicts_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_financial_conflicts" ADD CONSTRAINT "bill_financial_conflicts_financial_interest_id_financial_interests_id_fk" FOREIGN KEY ("financial_interest_id") REFERENCES "public"."financial_interests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_financial_conflicts" ADD CONSTRAINT "bill_financial_conflicts_entity_id_corporate_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."corporate_entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_sector_ownership" ADD CONSTRAINT "cross_sector_ownership_owner_entity_id_corporate_entities_id_fk" FOREIGN KEY ("owner_entity_id") REFERENCES "public"."corporate_entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_sector_ownership" ADD CONSTRAINT "cross_sector_ownership_owned_entity_id_corporate_entities_id_fk" FOREIGN KEY ("owned_entity_id") REFERENCES "public"."corporate_entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_interests" ADD CONSTRAINT "financial_interests_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_interests" ADD CONSTRAINT "financial_interests_entity_id_corporate_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."corporate_entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lobbying_activities" ADD CONSTRAINT "lobbying_activities_lobbyist_entity_id_corporate_entities_id_fk" FOREIGN KEY ("lobbyist_entity_id") REFERENCES "public"."corporate_entities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lobbying_activities" ADD CONSTRAINT "lobbying_activities_target_sponsor_id_sponsors_id_fk" FOREIGN KEY ("target_sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regulatory_capture_indicators" ADD CONSTRAINT "regulatory_capture_indicators_entity_id_corporate_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."corporate_entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regulatory_capture_indicators" ADD CONSTRAINT "regulatory_capture_indicators_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attribution_assessments" ADD CONSTRAINT "attribution_assessments_target_bill_id_bills_id_fk" FOREIGN KEY ("target_bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attribution_assessments" ADD CONSTRAINT "attribution_assessments_target_campaign_id_campaigns_id_fk" FOREIGN KEY ("target_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attribution_assessments" ADD CONSTRAINT "attribution_assessments_assessor_id_users_id_fk" FOREIGN KEY ("assessor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_implementation" ADD CONSTRAINT "bill_implementation_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "legislative_outcomes" ADD CONSTRAINT "legislative_outcomes_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "success_stories" ADD CONSTRAINT "success_stories_related_bill_id_bills_id_fk" FOREIGN KEY ("related_bill_id") REFERENCES "public"."bills"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "success_stories" ADD CONSTRAINT "success_stories_related_campaign_id_campaigns_id_fk" FOREIGN KEY ("related_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "success_stories" ADD CONSTRAINT "success_stories_documented_by_id_users_id_fk" FOREIGN KEY ("documented_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_comment_id_comments_id_fk" FOREIGN KEY ("reported_comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_assigned_moderator_id_users_id_fk" FOREIGN KEY ("assigned_moderator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_profiles" ADD CONSTRAINT "expert_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_profiles" ADD CONSTRAINT "expert_profiles_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_queue" ADD CONSTRAINT "moderation_queue_report_id_content_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."content_reports"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_queue" ADD CONSTRAINT "moderation_queue_assigned_moderator_id_users_id_fk" FOREIGN KEY ("assigned_moderator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_queue" ADD CONSTRAINT "moderation_queue_qa_reviewed_by_users_id_fk" FOREIGN KEY ("qa_reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "security_events" ADD CONSTRAINT "security_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "security_events" ADD CONSTRAINT "security_events_response_initiated_by_users_id_fk" FOREIGN KEY ("response_initiated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_verification" ADD CONSTRAINT "user_verification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_verification" ADD CONSTRAINT "user_verification_verifier_id_users_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_impact_metrics" ADD CONSTRAINT "bill_impact_metrics_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "external_bill_references" ADD CONSTRAINT "external_bill_references_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_engagement_summary" ADD CONSTRAINT "user_engagement_summary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_status_chamber_engagement" ON "bills" USING btree ("status","chamber","engagement_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_affected_counties" ON "bills" USING gin ("affected_counties");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_tags" ON "bills" USING gin ("tags");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_impact_areas" ON "bills" USING gin ("impact_areas");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_sponsor" ON "bills" USING btree ("sponsor_id","status") WHERE "bills"."sponsor_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_introduced_date" ON "bills" USING btree ("introduced_date") WHERE "bills"."introduced_date" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_last_action_date" ON "bills" USING btree ("last_action_date") WHERE "bills"."last_action_date" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_title" ON "bills" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_metadata" ON "bills" USING gin ("metadata");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_committee_members_committee_active" ON "committee_members" USING btree ("committee_id","is_active") WHERE "committee_members"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_committee_members_sponsor_active" ON "committee_members" USING btree ("sponsor_id","is_active") WHERE "committee_members"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_committees_chamber_active" ON "committees" USING btree ("chamber","is_active") WHERE "committees"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_committees_name" ON "committees" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_committees_chair" ON "committees" USING btree ("chair_id") WHERE "committees"."chair_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_committees_vice_chair" ON "committees" USING btree ("vice_chair_id") WHERE "committees"."vice_chair_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parliamentary_sessions_chamber_active" ON "parliamentary_sessions" USING btree ("chamber","is_active") WHERE "parliamentary_sessions"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parliamentary_sessions_date_range" ON "parliamentary_sessions" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parliamentary_sittings_session_date" ON "parliamentary_sittings" USING btree ("session_id","sitting_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parliamentary_sittings_date" ON "parliamentary_sittings" USING btree ("sitting_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parliamentary_sittings_agenda" ON "parliamentary_sittings" USING gin ("agenda");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parliamentary_sittings_bills_discussed" ON "parliamentary_sittings" USING gin ("bills_discussed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sponsors_chamber_county_active" ON "sponsors" USING btree ("chamber","county","is_active") WHERE "sponsors"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sponsors_party_county" ON "sponsors" USING btree ("party","county") WHERE "sponsors"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sponsors_name" ON "sponsors" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_county_verified" ON "user_profiles" USING btree ("county","is_id_verified") WHERE "user_profiles"."is_id_verified" = true AND "user_profiles"."county" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_display_name" ON "user_profiles" USING btree ("display_name") WHERE "user_profiles"."display_name" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_phone_number" ON "user_profiles" USING btree ("phone_number") WHERE "user_profiles"."phone_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_phone_verified" ON "user_profiles" USING btree ("phone_verified","phone_number") WHERE "user_profiles"."phone_verified" = true AND "user_profiles"."phone_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_language" ON "user_profiles" USING btree ("preferred_language");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_timezone" ON "user_profiles" USING btree ("timezone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_preferences" ON "user_profiles" USING gin ("preferences");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_accessibility" ON "user_profiles" USING gin ("accessibility_needs");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alert_preferences_email_verified" ON "alert_preferences" USING btree ("email_verified","email_notifications") WHERE "alert_preferences"."email_verified" = true AND "alert_preferences"."email_notifications" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alert_preferences_phone_verified" ON "alert_preferences" USING btree ("phone_verified","sms_notifications") WHERE "alert_preferences"."phone_verified" = true AND "alert_preferences"."sms_notifications" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_engagement_bill_type_created" ON "bill_engagement" USING btree ("bill_id","engagement_type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_engagement_user_type_created" ON "bill_engagement" USING btree ("user_id","engagement_type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_engagement_created_at" ON "bill_engagement" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_tracking_user_frequency" ON "bill_tracking_preferences" USING btree ("user_id","notification_frequency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_tracking_bill_notify" ON "bill_tracking_preferences" USING btree ("bill_id","notify_on_status_change");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_votes_bill_type" ON "bill_votes" USING btree ("bill_id","vote_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_votes_county_bill" ON "bill_votes" USING btree ("user_county","bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_votes_user_created" ON "bill_votes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comment_votes_comment_type" ON "comment_votes" USING btree ("comment_id","vote_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comment_votes_user_created" ON "comment_votes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_bill_created" ON "comments" USING btree ("bill_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_user_created" ON "comments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_parent_depth" ON "comments" USING btree ("parent_comment_id","thread_depth");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_moderation_created" ON "comments" USING btree ("moderation_status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_county_bill" ON "comments" USING btree ("user_county","bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_argument_extracted" ON "comments" USING btree ("argument_extracted") WHERE "comments"."argument_extracted" = false;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user_read_created" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user_type_read" ON "notifications" USING btree ("user_id","notification_type","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_delivery_status" ON "notifications" USING btree ("delivery_status","created_at") WHERE "notifications"."delivery_status" = 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_bill_created" ON "notifications" USING btree ("related_bill_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_user_expires" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_contact_methods_user_type_primary" ON "user_contact_methods" USING btree ("user_id","contact_type") WHERE "user_contact_methods"."is_primary" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_contact_methods_contact_value" ON "user_contact_methods" USING btree ("contact_value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_contact_methods_user_verified" ON "user_contact_methods" USING btree ("user_id","is_verified","is_active") WHERE "user_contact_methods"."is_verified" = true AND "user_contact_methods"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_contact_methods_verification_code" ON "user_contact_methods" USING btree ("verification_code") WHERE "user_contact_methods"."verification_code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_amendments_bill_status" ON "bill_amendments" USING btree ("bill_id","status","proposed_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_amendments_proposed_by" ON "bill_amendments" USING btree ("proposed_by_id","status") WHERE "bill_amendments"."proposed_by_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_committee_assignments_bill_assignment" ON "bill_committee_assignments" USING btree ("bill_id","assignment_type","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_committee_assignments_committee_status" ON "bill_committee_assignments" USING btree ("committee_id","status","assigned_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_cosponsors_bill_cosponsor" ON "bill_cosponsors" USING btree ("bill_id","cosponsor_type","joined_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_cosponsors_sponsor_activity" ON "bill_cosponsors" USING btree ("sponsor_id","joined_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_readings_bill_reading_date" ON "bill_readings" USING btree ("bill_id","reading_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_readings_session_reading" ON "bill_readings" USING btree ("session_id","reading_date") WHERE "bill_readings"."session_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_versions_bill_current_version" ON "bill_versions" USING btree ("bill_id","is_current_version") WHERE "bill_versions"."is_current_version" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_versions_bill_version" ON "bill_versions" USING btree ("bill_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parliamentary_votes_bill_stage_vote" ON "parliamentary_votes" USING btree ("bill_id","vote_stage","vote_choice");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parliamentary_votes_sponsor_vote" ON "parliamentary_votes" USING btree ("sponsor_id","vote_date","vote_choice");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_hearings_hearing_date_status" ON "public_hearings" USING btree ("hearing_date","hearing_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_hearings_bill_hearing" ON "public_hearings" USING btree ("bill_id","hearing_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_hearings_committee_hearing" ON "public_hearings" USING btree ("presiding_committee_id","hearing_date") WHERE "public_hearings"."presiding_committee_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_participation_events_event_date_status" ON "public_participation_events" USING btree ("event_date","event_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_participation_events_bill_event" ON "public_participation_events" USING btree ("bill_id","event_date","event_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_participation_events_county_event" ON "public_participation_events" USING btree ("county","event_date") WHERE "public_participation_events"."county" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_submissions_bill_submission" ON "public_submissions" USING btree ("bill_id","submission_date","review_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_submissions_event_submission" ON "public_submissions" USING btree ("event_id","submission_date") WHERE "public_submissions"."event_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_submissions_review_status" ON "public_submissions" USING btree ("review_status","submission_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analysis_audit_trail_analysis_action" ON "analysis_audit_trail" USING btree ("analysis_id","action_type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analysis_audit_trail_actor_type" ON "analysis_audit_trail" USING btree ("actor_type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_constitutional_analyses_bill_current" ON "constitutional_analyses" USING btree ("bill_id","superseded_by") WHERE "constitutional_analyses"."superseded_by" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_constitutional_analyses_expert_review" ON "constitutional_analyses" USING btree ("requires_expert_review","expert_reviewed","created_at") WHERE "constitutional_analyses"."requires_expert_review" = true AND "constitutional_analyses"."expert_reviewed" = false;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_constitutional_analyses_alignment" ON "constitutional_analyses" USING btree ("constitutional_alignment","confidence_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_constitutional_provisions_chapter_article" ON "constitutional_provisions" USING btree ("chapter_number","article_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_constitutional_provisions_fundamental_rights" ON "constitutional_provisions" USING btree ("is_fundamental_right") WHERE "constitutional_provisions"."is_fundamental_right" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_constitutional_provisions_keywords" ON "constitutional_provisions" USING gin ("keywords");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_review_queue_status_priority" ON "expert_review_queue" USING btree ("status","priority_level","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_review_queue_assigned_expert" ON "expert_review_queue" USING btree ("assigned_expert_id","status") WHERE "expert_review_queue"."assigned_expert_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_review_queue_bill_status" ON "expert_review_queue" USING btree ("bill_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legal_precedents_case_name" ON "legal_precedents" USING btree ("case_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legal_precedents_court_level_date" ON "legal_precedents" USING btree ("court_level","judgment_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legal_precedents_constitutional_provisions" ON "legal_precedents" USING gin ("constitutional_provisions_involved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_arguments_bill_position" ON "arguments" USING btree ("bill_id","position","strength_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_arguments_verified_quality" ON "arguments" USING btree ("is_verified","quality_score") WHERE "arguments"."is_verified" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_arguments_source_comments" ON "arguments" USING gin ("source_comments");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_argument_relationships_source_type" ON "argument_relationships" USING btree ("source_argument_id","relationship_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_argument_relationships_target_type" ON "argument_relationships" USING btree ("target_argument_id","relationship_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_claims_verification_status" ON "claims" USING btree ("verification_status","mention_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_claims_bills_referenced" ON "claims" USING gin ("bills_referenced");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_claims_claim_text" ON "claims" USING btree ("claim_text");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_evidence_type_credibility" ON "evidence" USING btree ("evidence_type","credibility_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_evidence_peer_reviewed" ON "evidence" USING btree ("peer_reviewed","credibility_score") WHERE "evidence"."peer_reviewed" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_evidence_supports_claims" ON "evidence" USING gin ("supports_claims");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_evidence_supports_arguments" ON "evidence" USING gin ("supports_arguments");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legislative_briefs_bill_type" ON "legislative_briefs" USING btree ("bill_id","brief_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legislative_briefs_committee_delivery" ON "legislative_briefs" USING btree ("delivered_to_committee","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legislative_briefs_public_release" ON "legislative_briefs" USING btree ("public_release_date") WHERE "legislative_briefs"."public_release_date" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_synthesis_jobs_status_type" ON "synthesis_jobs" USING btree ("status","job_type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_synthesis_jobs_bill_status" ON "synthesis_jobs" USING btree ("bill_id","status") WHERE "synthesis_jobs"."bill_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_action_completions_campaign_completion" ON "action_completions" USING btree ("campaign_id","completed_date","verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_action_completions_user_action_history" ON "action_completions" USING btree ("user_id","completed_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_action_completions_response_received" ON "action_completions" USING btree ("response_received","completed_date") WHERE "action_completions"."response_received" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_action_items_campaign_active_order" ON "action_items" USING btree ("campaign_id","is_active","display_order") WHERE "action_items"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_action_items_type_active" ON "action_items" USING btree ("action_type","is_active","completion_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_action_items_difficulty_impact" ON "action_items" USING btree ("difficulty_level","impact_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_impact_metrics_campaign_metric_time" ON "campaign_impact_metrics" USING btree ("campaign_id","metric_type","metric_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_impact_metrics_type_metric" ON "campaign_impact_metrics" USING btree ("metric_type","metric_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_participants_campaign_level" ON "campaign_participants" USING btree ("campaign_id","participation_level","joined_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_participants_user_activity" ON "campaign_participants" USING btree ("user_id","last_action_date","actions_completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_participants_county_participation" ON "campaign_participants" USING btree ("participant_county","campaign_id") WHERE "campaign_participants"."participant_county" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaigns_status_public" ON "campaigns" USING btree ("status","is_public","launch_date") WHERE "campaigns"."is_public" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaigns_primary_bill" ON "campaigns" USING btree ("primary_bill_id","status") WHERE "campaigns"."primary_bill_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaigns_target_counties" ON "campaigns" USING gin ("target_counties");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaigns_organization" ON "campaigns" USING btree ("organization_name","status") WHERE "campaigns"."organization_name" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_coalition_relationships_primary_type" ON "coalition_relationships" USING btree ("primary_campaign_id","relationship_type","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_coalition_relationships_partner_type" ON "coalition_relationships" USING btree ("partner_campaign_id","relationship_type","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ambassadors_status_county" ON "ambassadors" USING btree ("status","primary_county") WHERE "ambassadors"."status" = 'active';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ambassadors_coverage_areas" ON "ambassadors" USING gin ("coverage_areas");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ambassadors_activity_performance" ON "ambassadors" USING btree ("last_activity_date","sessions_conducted","people_reached");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ambassadors_training_status" ON "ambassadors" USING btree ("training_completed","certification_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_communities_county_constituency" ON "communities" USING btree ("county","constituency","is_active") WHERE "communities"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_communities_primary_ambassador" ON "communities" USING btree ("primary_ambassador_id","is_active") WHERE "communities"."primary_ambassador_id" IS NOT NULL AND "communities"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_communities_access_characteristics" ON "communities" USING btree ("internet_penetration","smartphone_penetration");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_communities_last_engagement" ON "communities" USING btree ("last_engagement_date","is_active") WHERE "communities"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_facilitation_sessions_ambassador_date" ON "facilitation_sessions" USING btree ("ambassador_id","session_date","session_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_facilitation_sessions_community_date" ON "facilitation_sessions" USING btree ("community_id","session_date") WHERE "facilitation_sessions"."community_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_facilitation_sessions_bill_discussion" ON "facilitation_sessions" USING gin ("bills_discussed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_facilitation_sessions_sync_status" ON "facilitation_sessions" USING btree ("sync_status","last_synced_at") WHERE "facilitation_sessions"."sync_status" != 'synced';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_localized_content_content_language" ON "localized_content" USING btree ("content_type","source_id","language_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_localized_content_translation_quality" ON "localized_content" USING btree ("translation_method","translation_quality","needs_update");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_localized_content_cultural_context" ON "localized_content" USING btree ("cultural_context","reading_level","language_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_localized_content_usage_count" ON "localized_content" USING btree ("usage_count","feedback_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_submissions_session_collected" ON "offline_submissions" USING btree ("session_id","collected_at") WHERE "offline_submissions"."session_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_submissions_bill_position" ON "offline_submissions" USING btree ("bill_id","position","collected_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_submissions_processing_status" ON "offline_submissions" USING btree ("processing_status","needs_translation","collected_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_submissions_sync_status" ON "offline_submissions" USING btree ("sync_status","collected_at") WHERE "offline_submissions"."sync_status" != 'synced';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_submissions_collected_by" ON "offline_submissions" USING btree ("collected_by_id","collected_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ussd_sessions_phone_number" ON "ussd_sessions" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ussd_sessions_phone_active" ON "ussd_sessions" USING btree ("phone_number","session_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ussd_sessions_user_session" ON "ussd_sessions" USING btree ("user_id","session_start") WHERE "ussd_sessions"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ussd_sessions_bills_viewed" ON "ussd_sessions" USING gin ("bills_viewed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ussd_sessions_outcome_provider" ON "ussd_sessions" USING btree ("session_outcome","telecom_provider","session_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_financial_conflicts_bill_conflict" ON "bill_financial_conflicts" USING btree ("bill_id","conflict_severity","conflict_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_financial_conflicts_sponsor_conflict" ON "bill_financial_conflicts" USING btree ("sponsor_id","conflict_severity") WHERE "bill_financial_conflicts"."sponsor_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_financial_conflicts_entity_impact" ON "bill_financial_conflicts" USING btree ("entity_id","potential_financial_impact") WHERE "bill_financial_conflicts"."entity_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_financial_conflicts_public_disclosure" ON "bill_financial_conflicts" USING btree ("is_public","conflict_severity","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_corporate_entities_name" ON "corporate_entities" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_corporate_entities_registration_number" ON "corporate_entities" USING btree ("registration_number") WHERE "corporate_entities"."registration_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_corporate_entities_industry_sector" ON "corporate_entities" USING btree ("industry_sector","annual_revenue");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_corporate_entities_parent_company" ON "corporate_entities" USING btree ("parent_company_id") WHERE "corporate_entities"."parent_company_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_corporate_entities_publicly_traded" ON "corporate_entities" USING btree ("is_publicly_traded","stock_exchange") WHERE "corporate_entities"."is_publicly_traded" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_corporate_entities_verification_status" ON "corporate_entities" USING btree ("verification_status","last_updated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cross_sector_ownership_owner_owned" ON "cross_sector_ownership" USING btree ("owner_entity_id","owned_entity_id","is_current");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cross_sector_ownership_cross_sector_influence" ON "cross_sector_ownership" USING btree ("creates_cross_sector_influence","is_current") WHERE "cross_sector_ownership"."creates_cross_sector_influence" = true AND "cross_sector_ownership"."is_current" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cross_sector_ownership_affected_sectors" ON "cross_sector_ownership" USING gin ("affected_sectors");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_interests_sponsor_entity" ON "financial_interests" USING btree ("sponsor_id","entity_id","is_current") WHERE "financial_interests"."sponsor_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_interests_entity_interest" ON "financial_interests" USING btree ("entity_id","interest_type","is_current");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_interests_potential_conflict" ON "financial_interests" USING btree ("potential_conflict","is_current") WHERE "financial_interests"."potential_conflict" = true AND "financial_interests"."is_current" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_interests_disclosure_status" ON "financial_interests" USING btree ("is_publicly_disclosed","disclosure_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lobbying_activities_lobbyist_date" ON "lobbying_activities" USING btree ("lobbyist_entity_id","activity_date") WHERE "lobbying_activities"."lobbyist_entity_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lobbying_activities_target_sponsor" ON "lobbying_activities" USING btree ("target_sponsor_id","activity_date") WHERE "lobbying_activities"."target_sponsor_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lobbying_activities_target_bills" ON "lobbying_activities" USING gin ("target_bills");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lobbying_activities_disclosure_compliance" ON "lobbying_activities" USING btree ("disclosure_required","is_disclosed","activity_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_regulatory_capture_indicators_type_strength" ON "regulatory_capture_indicators" USING btree ("indicator_type","indicator_strength","is_ongoing");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_regulatory_capture_indicators_entity_capture" ON "regulatory_capture_indicators" USING btree ("entity_id","indicator_strength") WHERE "regulatory_capture_indicators"."entity_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_regulatory_capture_indicators_sponsor_influence" ON "regulatory_capture_indicators" USING btree ("sponsor_id","indicator_strength") WHERE "regulatory_capture_indicators"."sponsor_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_regulatory_capture_indicators_investigation_status" ON "regulatory_capture_indicators" USING btree ("investigation_status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attribution_assessments_type_confidence" ON "attribution_assessments" USING btree ("assessment_type","confidence_level","platform_contribution_percentage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attribution_assessments_bill_attribution" ON "attribution_assessments" USING btree ("target_bill_id","platform_contribution_percentage") WHERE "attribution_assessments"."target_bill_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attribution_assessments_quality_assurance" ON "attribution_assessments" USING btree ("peer_reviewed","methodology_validated","confidence_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_implementation_implementation_timeline" ON "bill_implementation" USING btree ("expected_implementation_date","actual_implementation_date","implementation_delay_days");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_implementation_budget_utilization" ON "bill_implementation" USING btree ("budget_allocated","budget_utilized","implementation_percentage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_implementation_public_monitoring" ON "bill_implementation" USING btree ("citizen_reports_count","media_coverage_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_civic_engagement_indicators_measurement_date" ON "civic_engagement_indicators" USING btree ("measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_civic_engagement_indicators_user_activity" ON "civic_engagement_indicators" USING btree ("monthly_active_users","daily_active_users","repeat_engagement_rate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_demographic_equity_metrics_age_gender_date" ON "demographic_equity_metrics" USING btree ("age_range","gender","measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_demographic_equity_metrics_participation_equity" ON "demographic_equity_metrics" USING btree ("participation_rate","engagement_quality_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_demographic_equity_metrics_education_income" ON "demographic_equity_metrics" USING btree ("education_level","income_bracket","participation_rate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digital_inclusion_metrics_county_digital_divide" ON "digital_inclusion_metrics" USING btree ("county","measurement_date") WHERE "digital_inclusion_metrics"."county" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digital_inclusion_metrics_device_access" ON "digital_inclusion_metrics" USING btree ("smartphone_users","feature_phone_users","offline_only_users");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digital_inclusion_metrics_platform_usage" ON "digital_inclusion_metrics" USING btree ("web_platform_usage","ussd_usage","ambassador_facilitated_usage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_sustainability_indicators_measurement_date" ON "financial_sustainability_indicators" USING btree ("measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_sustainability_indicators_sustainability" ON "financial_sustainability_indicators" USING btree ("funding_runway_months","revenue_growth_rate","cost_efficiency_trend");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_geographic_equity_metrics_county_date" ON "geographic_equity_metrics" USING btree ("county","measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_geographic_equity_metrics_participation_rate" ON "geographic_equity_metrics" USING btree ("participation_rate","digital_divide_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_geographic_equity_metrics_constituency_participation" ON "geographic_equity_metrics" USING btree ("constituency","participation_rate") WHERE "geographic_equity_metrics"."constituency" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legislative_impact_indicators_measurement_date" ON "legislative_impact_indicators" USING btree ("measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legislative_impact_indicators_engagement_impact" ON "legislative_impact_indicators" USING btree ("bills_with_public_engagement","bills_amended_after_engagement");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legislative_outcomes_final_status" ON "legislative_outcomes" USING btree ("final_status","outcome_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legislative_outcomes_public_engagement" ON "legislative_outcomes" USING btree ("public_comments_received","amendments_from_public_input","substantive_changes_made");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legislative_outcomes_implementation_status" ON "legislative_outcomes" USING btree ("implementation_status","implementation_date") WHERE "legislative_outcomes"."implementation_status" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_participation_cohorts_type_active" ON "participation_cohorts" USING btree ("cohort_type","is_active") WHERE "participation_cohorts"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_participation_cohorts_county_urban_rural" ON "participation_cohorts" USING btree ("county","urban_rural") WHERE "participation_cohorts"."county" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_participation_cohorts_age_gender" ON "participation_cohorts" USING btree ("age_range","gender") WHERE "participation_cohorts"."age_range" IS NOT NULL AND "participation_cohorts"."gender" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_participation_cohorts_device_connectivity" ON "participation_cohorts" USING btree ("device_type","connectivity_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_platform_performance_indicators_indicator_date" ON "platform_performance_indicators" USING btree ("indicator_name","measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_platform_performance_indicators_category_trend" ON "platform_performance_indicators" USING btree ("indicator_category","trend_direction","measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_success_stories_type_public" ON "success_stories" USING btree ("story_type","is_public","story_date") WHERE "success_stories"."is_public" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_success_stories_featured" ON "success_stories" USING btree ("is_featured","story_date") WHERE "success_stories"."is_featured" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_success_stories_geographic_scope" ON "success_stories" USING btree ("geographic_scope","people_affected");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_reports_reporter_status" ON "content_reports" USING btree ("reporter_id","report_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_reports_comment" ON "content_reports" USING btree ("reported_comment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_reports_user" ON "content_reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_reports_moderator_status" ON "content_reports" USING btree ("assigned_moderator_id","report_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_reports_severity_status" ON "content_reports" USING btree ("report_severity","report_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_reports_unresolved" ON "content_reports" USING btree ("created_at") WHERE report_status IN ('pending', 'under_review');--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_expert_profiles_user" ON "expert_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_profiles_status" ON "expert_profiles" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_profiles_expertise" ON "expert_profiles" USING gin ("expertise_domains");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_profiles_available_status" ON "expert_profiles" USING btree ("available_for_review","verification_status") WHERE available_for_review = true AND verification_status = 'verified';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_profiles_verified_by" ON "expert_profiles" USING btree ("verified_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_moderation_queue_content_type_id" ON "moderation_queue" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_moderation_queue_status_priority" ON "moderation_queue" USING btree ("queue_status","priority_score") WHERE queue_status = 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_moderation_queue_moderator_status" ON "moderation_queue" USING btree ("assigned_moderator_id","queue_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_moderation_queue_report" ON "moderation_queue" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_moderation_queue_qa_required" ON "moderation_queue" USING btree ("qa_review_required") WHERE qa_review_required = true AND qa_reviewed_by IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_security_events_severity_status" ON "security_events" USING btree ("severity","resolution_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_security_events_user_created" ON "security_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_security_events_ip_type" ON "security_events" USING btree ("actor_ip_address","event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_security_events_type" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_security_events_critical_open" ON "security_events" USING btree ("created_at") WHERE severity IN ('high', 'critical') AND resolution_status IN ('open', 'investigating');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_security_events_data_breach" ON "security_events" USING btree ("created_at") WHERE data_compromised = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_system_audit_log_category_created" ON "system_audit_log" USING btree ("event_category","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_system_audit_log_actor_created" ON "system_audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_system_audit_log_event_type" ON "system_audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_system_audit_log_target_type_id" ON "system_audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_system_audit_log_failure" ON "system_audit_log" USING btree ("created_at","event_category") WHERE success = false;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_system_audit_log_severity" ON "system_audit_log" USING btree ("severity","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_activity_log_user_created" ON "user_activity_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_activity_log_type" ON "user_activity_log" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_activity_log_category" ON "user_activity_log" USING btree ("activity_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_activity_log_ip" ON "user_activity_log" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_activity_log_session" ON "user_activity_log" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_activity_log_anomaly" ON "user_activity_log" USING btree ("user_id","created_at") WHERE anomaly_detected = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_activity_log_created_at" ON "user_activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_verification_user_type" ON "user_verification" USING btree ("user_id","verification_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_verification_user_status" ON "user_verification" USING btree ("user_id","verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_verification_status" ON "user_verification" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_verification_verifier" ON "user_verification" USING btree ("verifier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_verification_pending" ON "user_verification" USING btree ("submitted_at") WHERE verification_status = 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_verification_expiry" ON "user_verification" USING btree ("expires_at") WHERE expires_at IS NOT NULL AND verification_status = 'verified';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_user" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_event" ON "analytics_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_category" ON "analytics_events" USING btree ("event_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_bill" ON "analytics_events" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_session" ON "analytics_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_created_at" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_anonymous" ON "analytics_events" USING btree ("anonymous_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_county" ON "analytics_events" USING btree ("county");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_experiment" ON "analytics_events" USING btree ("experiment_id","experiment_variant");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_user_time" ON "analytics_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_category_action" ON "analytics_events" USING btree ("event_category","event_action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bill_impact_metrics_bill_metric_period_unique" ON "bill_impact_metrics" USING btree ("bill_id","metric_type","measurement_date","time_period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_impact_metrics_bill" ON "bill_impact_metrics" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_impact_metrics_type" ON "bill_impact_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_impact_metrics_date" ON "bill_impact_metrics" USING btree ("measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_impact_metrics_category" ON "bill_impact_metrics" USING btree ("metric_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_impact_metrics_bill_date" ON "bill_impact_metrics" USING btree ("bill_id","measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_impact_metrics_type_period" ON "bill_impact_metrics" USING btree ("metric_type","time_period","measurement_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "content_performance_content_date_unique" ON "content_performance" USING btree ("content_type","content_id","measurement_date","time_period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_performance_content" ON "content_performance" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_performance_date" ON "content_performance" USING btree ("measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_performance_engagement" ON "content_performance" USING btree ("engagement_rate","measurement_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "county_engagement_stats_county_date_unique" ON "county_engagement_stats" USING btree ("county","measurement_date","time_period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_county_engagement_stats_county" ON "county_engagement_stats" USING btree ("county");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_county_engagement_stats_date" ON "county_engagement_stats" USING btree ("measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_county_engagement_stats_engagement" ON "county_engagement_stats" USING btree ("total_engagements","measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_county_engagement_stats_users" ON "county_engagement_stats" USING btree ("active_users","new_users");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_county_engagement_stats_county_date_time" ON "county_engagement_stats" USING btree ("county","time_period","measurement_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_data_sources_name" ON "data_sources" USING btree ("source_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_data_sources_type" ON "data_sources" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_data_sources_active" ON "data_sources" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_data_sources_health" ON "data_sources" USING btree ("health_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_data_sources_active_type" ON "data_sources" USING btree ("is_active","source_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "external_bill_references_bill_external_unique" ON "external_bill_references" USING btree ("bill_id","external_source","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_external_bill_references_bill" ON "external_bill_references" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_external_bill_references_source" ON "external_bill_references" USING btree ("external_source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_external_bill_references_verification" ON "external_bill_references" USING btree ("verification_status","last_verified");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_external_bill_references_external_id" ON "external_bill_references" USING btree ("external_source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_health_metrics_timestamp_unique" ON "platform_health_metrics" USING btree ("measurement_timestamp","measurement_period_minutes");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_platform_health_metrics_timestamp" ON "platform_health_metrics" USING btree ("measurement_timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_platform_health_metrics_status" ON "platform_health_metrics" USING btree ("health_status","measurement_timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_jobs_data_source" ON "sync_jobs" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_jobs_status" ON "sync_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_jobs_started_at" ON "sync_jobs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_jobs_completed_at" ON "sync_jobs" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_jobs_status_priority" ON "sync_jobs" USING btree ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_jobs_parent" ON "sync_jobs" USING btree ("parent_job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_jobs_source_status" ON "sync_jobs" USING btree ("data_source_id","status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trending_analysis_date_window_unique" ON "trending_analysis" USING btree ("analysis_date","time_window_hours");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trending_analysis_date" ON "trending_analysis" USING btree ("analysis_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trending_analysis_method" ON "trending_analysis" USING btree ("analysis_method");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trending_analysis_confidence" ON "trending_analysis" USING btree ("confidence_score","analysis_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trending_analysis_date_confidence" ON "trending_analysis" USING btree ("analysis_date","confidence_score");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_engagement_summary_user_date_unique" ON "user_engagement_summary" USING btree ("user_id","measurement_date","time_period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_engagement_summary_user" ON "user_engagement_summary" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_engagement_summary_date" ON "user_engagement_summary" USING btree ("measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_engagement_summary_score" ON "user_engagement_summary" USING btree ("engagement_score","measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_role_active" ON "users" USING btree ("role","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_county_active" ON "users" USING btree ("county","is_active") WHERE "users"."county" IS NOT NULL AND "users"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_verification_token" ON "users" USING btree ("verification_token") WHERE "users"."verification_token" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_password_reset_token" ON "users" USING btree ("password_reset_token") WHERE "users"."password_reset_token" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_last_login" ON "users" USING btree ("last_login_at") WHERE "users"."is_active" = true;