ALTER TABLE "expert_moderator_eligibility" DROP CONSTRAINT "expert_moderator_eligibility_expert_id_expert_credentials_user_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_moderator_eligibility" ADD CONSTRAINT "expert_moderator_eligibility_expert_id_users_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
