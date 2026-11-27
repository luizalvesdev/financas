CREATE TABLE "recurring_investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"day_of_month" smallint NOT NULL,
	"member_id" uuid,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_investments_amount_positive" CHECK ("recurring_investments"."amount_cents" > 0),
	CONSTRAINT "recurring_investments_day_range" CHECK ("recurring_investments"."day_of_month" between 1 and 31)
);
--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "recurring_investment_id" uuid;--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "recurrence_month" date;--> statement-breakpoint
ALTER TABLE "recurring_investments" ADD CONSTRAINT "recurring_investments_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_investments" ADD CONSTRAINT "recurring_investments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_recurring_investment_id_recurring_investments_id_fk" FOREIGN KEY ("recurring_investment_id") REFERENCES "public"."recurring_investments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "investments_recurrence_month_unique" ON "investments" USING btree ("recurring_investment_id","recurrence_month");--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_recurrence_pair" CHECK (("investments"."recurring_investment_id" is null) = ("investments"."recurrence_month" is null));