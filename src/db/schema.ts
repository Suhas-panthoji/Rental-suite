import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// ---------- helpers ----------
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

// ---------- auth ----------
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

// ---------- settings (singleton row, id = 1) ----------
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  ownerName: text("owner_name").notNull().default(""),
  ownerPhone: text("owner_phone").notNull().default(""),
  ownerEmail: text("owner_email").notNull().default(""),
  ownerAddress: text("owner_address").notNull().default(""),
  ownerPan: text("owner_pan").notNull().default(""),
  defaultDueDay: integer("default_due_day").notNull().default(5),
  receiptPrefix: text("receipt_prefix").notNull().default("RCP"),
  // electricity defaults (paise)
  elecRatePaise: integer("elec_rate_paise").notNull().default(800), // ₹8.00 / unit
  elecFixedChargePaise: integer("elec_fixed_charge_paise").notNull().default(9000), // ₹90
  // water defaults
  waterMode: text("water_mode", { enum: ["metered", "flat"] }).notNull().default("flat"),
  waterFlatRatePaise: integer("water_flat_rate_paise").notNull().default(20000), // ₹200/mo
  updatedAt: updatedAt(),
});

// ---------- properties & units ----------
export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["house", "shop", "building", "other"] })
    .notNull()
    .default("house"),
  address: text("address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
});

/** status: occupied is DERIVED from active agreements; only vacant/maintenance stored */
export const units = sqliteTable(
  "units",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    propertyId: integer("property_id")
      .notNull()
      .references(() => properties.id),
    label: text("label").notNull(),
    type: text("type", { enum: ["house", "shop", "room", "other"] })
      .notNull()
      .default("room"),
    areaSqft: integer("area_sqft"),
    expectedRentPaise: integer("expected_rent_paise").notNull().default(0),
    status: text("status", { enum: ["vacant", "maintenance"] }).notNull().default("vacant"),
    elecMeterNo: text("elec_meter_no").notNull().default(""),
    waterMeterNo: text("water_meter_no").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("units_property_idx").on(t.propertyId)]
);

// ---------- tenants ----------
export const tenants = sqliteTable(
  "tenants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    altPhone: text("alt_phone").notNull().default(""),
    email: text("email").notNull().default(""),
    address: text("address").notNull().default(""),
    idType: text("id_type").notNull().default("aadhaar"),
    idNumber: text("id_number").notNull().default(""),
    occupation: text("occupation").notNull().default(""),
    emergencyContact: text("emergency_contact").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("tenants_name_idx").on(t.name), index("tenants_phone_idx").on(t.phone)]
);

// ---------- agreements ----------
export const agreements = sqliteTable(
  "agreements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: text("number").notNull().unique(),
    type: text("type", { enum: ["rent", "lease"] }).notNull().default("rent"),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id),
    // ISO day strings, e.g. "2026-11-01"
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    rentPaise: integer("rent_paise").notNull(),
    dueDay: integer("due_day").notNull().default(5),
    noticeDays: integer("notice_days").notNull().default(30),
    escalationPct: integer("escalation_pct").notNull().default(0),
    status: text("status", { enum: ["upcoming", "active", "expired", "terminated"] })
      .notNull()
      .default("active"),
    terminatedOn: text("terminated_on"),
    terminatedReason: text("terminated_reason").notNull().default(""),
    terms: text("terms").notNull().default(""),
    supersededById: integer("superseded_by_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("agreements_unit_idx").on(t.unitId),
    index("agreements_status_idx").on(t.status),
  ]
);

export const agreementTenants = sqliteTable(
  "agreement_tenants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    agreementId: integer("agreement_id")
      .notNull()
      .references(() => agreements.id),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [uniqueIndex("agreement_tenant_uq").on(t.agreementId, t.tenantId)]
);

// ---------- advance / deposit ledger ----------
export const depositTxns = sqliteTable(
  "deposit_txns",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    agreementId: integer("agreement_id")
      .notNull()
      .references(() => agreements.id),
    type: text("type", { enum: ["received", "topup", "deduction", "refund"] }).notNull(),
    amountPaise: integer("amount_paise").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    mode: text("mode").notNull().default("cash"),
    reference: text("reference").notNull().default(""),
    reason: text("reason").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("deposit_agreement_idx").on(t.agreementId)]
);

// ---------- dues (rent / utility / misc charges) ----------
export const dues = sqliteTable(
  "dues",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    agreementId: integer("agreement_id")
      .notNull()
      .references(() => agreements.id),
    type: text("type", { enum: ["rent", "electricity", "water", "late_fee", "misc", "damage"] })
      .notNull(),
    period: text("period").notNull(), // "YYYY-MM" for recurring; "" for one-off
    amountPaise: integer("amount_paise").notNull(),
    dueDate: text("due_date").notNull(),
    status: text("status", { enum: ["pending", "partial", "paid", "overdue", "waived"] })
      .notNull()
      .default("pending"),
    balancePaise: integer("balance_paise").notNull(),
    notes: text("notes").notNull().default(""),
    sourceRef: text("source_ref").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("dues_agreement_idx").on(t.agreementId), index("dues_status_idx").on(t.status)]
);

// ---------- payments ----------
export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    agreementId: integer("agreement_id")
      .notNull()
      .references(() => agreements.id),
    date: text("date").notNull(), // YYYY-MM-DD
    amountPaise: integer("amount_paise").notNull(),
    mode: text("mode", { enum: ["cash", "upi", "bank", "cheque", "other"] })
      .notNull()
      .default("cash"),
    reference: text("reference").notNull().default(""),
    receiptNo: text("receipt_no").notNull().unique(),
    remarks: text("remarks").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("payments_agreement_idx").on(t.agreementId)]
);

export const paymentAllocations = sqliteTable(
  "payment_allocations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    paymentId: integer("payment_id")
      .notNull()
      .references(() => payments.id),
    dueId: integer("due_id")
      .notNull()
      .references(() => dues.id),
    amountPaise: integer("amount_paise").notNull(),
  },
  (t) => [index("alloc_payment_idx").on(t.paymentId), index("alloc_due_idx").on(t.dueId)]
);

// ---------- meter readings (M2) ----------
export const meterReadings = sqliteTable(
  "meter_readings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id),
    service: text("service", { enum: ["electricity", "water"] }).notNull(),
    readingDate: text("reading_date").notNull(),
    prevReading: integer("prev_reading").notNull().default(0),
    currReading: integer("curr_reading").notNull(),
    unitsConsumed: integer("units_consumed").notNull(),
    ratePaise: integer("rate_paise").notNull().default(0),
    fixedChargePaise: integer("fixed_charge_paise").notNull().default(0),
    billAmountPaise: integer("bill_amount_paise").notNull().default(0),
    billedTo: text("billed_to", { enum: ["tenant", "owner"] }).notNull().default("tenant"),
    agreementId: integer("agreement_id"),
    dueId: integer("due_id"),
    createdAt: createdAt(),
  },
  (t) => [index("readings_unit_idx").on(t.unitId)]
);

// ---------- expenses (M2) ----------
export const expenses = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    category: text("category").notNull().default("other"),
    propertyId: integer("property_id"),
    unitId: integer("unit_id"),
    amountPaise: integer("amount_paise").notNull(),
    mode: text("mode").notNull().default("cash"),
    notes: text("notes").notNull().default(""),
    recoverable: integer("recoverable", { mode: "boolean" }).notNull().default(false),
    agreementId: integer("agreement_id"),
    dueId: integer("due_id"),
    createdAt: createdAt(),
  },
  (t) => [index("expenses_date_idx").on(t.date)]
);

// ---------- settlements (M3) ----------
export const settlements = sqliteTable("settlements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agreementId: integer("agreement_id")
    .notNull()
    .references(() => agreements.id),
  exitDate: text("exit_date").notNull(),
  totalAdvancePaise: integer("total_advance_paise").notNull().default(0),
  outstandingPaise: integer("outstanding_paise").notNull().default(0),
  deductionsPaise: integer("deductions_paise").notNull().default(0),
  refundablePaise: integer("refundable_paise").notNull().default(0),
  refundDate: text("refund_date"),
  refundMode: text("refund_mode").notNull().default(""),
  refundReference: text("refund_reference").notNull().default(""),
  acknowledgment: text("acknowledgment").notNull().default(""),
  createdAt: createdAt(),
});

// ---------- documents (M4, generic attach) ----------
export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerEntity: text("owner_entity").notNull(), // e.g. "tenant" | "agreement" | "payment"
  entityId: integer("entity_id").notNull(),
  label: text("label").notNull(),
  path: text("path").notNull(),
  mime: text("mime").notNull().default(""),
  createdAt: createdAt(),
});

// ---------- audit trail ----------
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entity: text("entity").notNull(),
    entityId: integer("entity_id").notNull(),
    action: text("action", { enum: ["create", "update", "delete"] }).notNull(),
    beforeJson: text("before_json").notNull().default(""),
    afterJson: text("after_json").notNull().default(""),
    userId: integer("user_id"),
    at: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId)]
);
