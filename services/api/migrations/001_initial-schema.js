/* eslint-disable @typescript-eslint/naming-convention */
exports.shorthands = undefined;

/**
 * Initial Bharosa schema — FHIR-shaped relational tables
 * Promise + detail tables, patient, household, encounter, audit, outbox, config
 */
exports.up = (pgm) => {
  // ─── Enums ──────────────────────────────────────────────────
  pgm.createType('promise_type', [
    'referral', 'vaccine_supply', 'consult', 'followup',
  ]);
  pgm.createType('promise_status', [
    'open', 'kept', 'lapsed', 'escalated', 'reconciled', 'closed_na',
  ]);
  pgm.createType('independence_flag', [
    'direct', 'plan_seeded', 'degraded',
  ]);
  pgm.createType('referral_priority', [
    'red_flag', 'urgent', 'routine',
  ]);
  pgm.createType('consult_urgency', [
    'urgent', 'routine',
  ]);
  pgm.createType('followup_cohort', [
    'anc_week', 'imnci_band', 'ncd_stage', 'child_absent',
  ]);
  pgm.createType('outbox_status', [
    'pending', 'sent', 'failed',
  ]);
  pgm.createType('stock_event_type', [
    'dispatch', 'receipt', 'usage', 'wastage',
  ]);

  // ─── Household ──────────────────────────────────────────────
  pgm.createTable('household', {
    household_id:         { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    catchment_assignment: { type: 'text', notNull: true },
    landmark_descriptor:  { type: 'text' },
    members:              { type: 'jsonb', notNull: true, default: '[]' },
    transfer_log:         { type: 'jsonb', notNull: true, default: '[]' },
    created_at:           { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at:           { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // ─── Patient ────────────────────────────────────────────────
  pgm.createTable('patient', {
    local_id:      { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    abha_ref:      { type: 'text' },
    name:          { type: 'text', notNull: true },
    fuzzy_dob:     { type: 'text' },
    village:       { type: 'text', notNull: true },
    gender:        { type: 'text' },
    household_id:  { type: 'uuid', notNull: true, references: 'household(household_id)' },
    created_at:    { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('patient', 'household_id');
  pgm.createIndex('patient', 'village');

  // ─── Promise ────────────────────────────────────────────────
  pgm.createTable('promise', {
    id:            { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    type:          { type: 'promise_type', notNull: true },
    committed_by:  { type: 'jsonb', notNull: true },
    committed_to:  { type: 'jsonb', notNull: true },
    description:   { type: 'jsonb', notNull: true, default: '{}' },
    created_at:    { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    sla_start:     { type: 'timestamptz' },
    deadline:      { type: 'timestamptz' },
    evidence:      { type: 'jsonb' },
    independence:  { type: 'independence_flag' },
    status:        { type: 'promise_status', notNull: true, default: "'open'" },
    ladder:        { type: 'jsonb', notNull: true, default: "'[]'::jsonb" },
    version:       { type: 'integer', notNull: true, default: 1 },
  });
  pgm.createIndex('promise', 'type');
  pgm.createIndex('promise', 'status');
  pgm.createIndex('promise', ['status', 'sla_start']);
  pgm.createIndex('promise', 'created_at');

  // ─── Referral Detail ────────────────────────────────────────
  pgm.createTable('referral_detail', {
    promise_id:             { type: 'uuid', primaryKey: true, references: 'promise(id)', onDelete: 'CASCADE' },
    patient_id:             { type: 'uuid', notNull: true, references: 'patient(local_id)' },
    priority:               { type: 'referral_priority', notNull: true },
    destination_facility_id:{ type: 'text', notNull: true },
    human_code:             { type: 'text' },
    qr_code:                { type: 'text' },
    referral_reason:        { type: 'text', notNull: true },
    triage_route:           { type: 'text' },
  });

  // ─── Session Detail ─────────────────────────────────────────
  pgm.createTable('session_detail', {
    promise_id:    { type: 'uuid', primaryKey: true, references: 'promise(id)', onDelete: 'CASCADE' },
    session_date:  { type: 'date', notNull: true },
    session_type:  { type: 'text', notNull: true },
    vaccines:      { type: 'jsonb', notNull: true, default: '[]' },
    village_name:  { type: 'text', notNull: true },
    facility_id:   { type: 'text', notNull: true },
  });

  // ─── Consult Detail ─────────────────────────────────────────
  pgm.createTable('consult_detail', {
    promise_id:    { type: 'uuid', primaryKey: true, references: 'promise(id)', onDelete: 'CASCADE' },
    patient_id:    { type: 'uuid', notNull: true, references: 'patient(local_id)' },
    urgency:       { type: 'consult_urgency', notNull: true },
    photos:        { type: 'jsonb', default: '[]' },
    vitals:        { type: 'jsonb' },
    summary:       { type: 'text', notNull: true },
    triage_route:  { type: 'text', notNull: true },
    response:      { type: 'jsonb' },
  });

  // ─── Followup Detail ────────────────────────────────────────
  pgm.createTable('followup_detail', {
    promise_id:     { type: 'uuid', primaryKey: true, references: 'promise(id)', onDelete: 'CASCADE' },
    patient_id:     { type: 'uuid', notNull: true, references: 'patient(local_id)' },
    cohort:         { type: 'followup_cohort', notNull: true },
    round_date:     { type: 'date', notNull: true },
    generated_from: { type: 'text' },
    outcome:        { type: 'jsonb' },
  });

  // ─── Encounter (append-only) ────────────────────────────────
  pgm.createTable('encounter', {
    id:          { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    patient_id:  { type: 'uuid', notNull: true, references: 'patient(local_id)' },
    type:        { type: 'text', notNull: true },
    facility_id: { type: 'text' },
    worker_id:   { type: 'text', notNull: true },
    ts:          { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    data:        { type: 'jsonb', notNull: true, default: '{}' },
  });
  pgm.createIndex('encounter', 'patient_id');

  // ─── Promise Event (audit log, append-only) ─────────────────
  pgm.createTable('promise_event', {
    id:          { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    promise_id:  { type: 'uuid', notNull: true, references: 'promise(id)' },
    event_name:  { type: 'text', notNull: true },
    from_status: { type: 'promise_status', notNull: true },
    to_status:   { type: 'promise_status', notNull: true },
    actor:       { type: 'jsonb', notNull: true },
    ts:          { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    payload:     { type: 'jsonb' },
  });
  pgm.createIndex('promise_event', 'promise_id');
  pgm.createIndex('promise_event', 'event_name');

  // ─── Outbox (notification queue) ────────────────────────────
  pgm.createTable('outbox', {
    id:             { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    recipient_role: { type: 'text', notNull: true },
    recipient_id:   { type: 'text', notNull: true },
    channel:        { type: 'text', notNull: true, default: "'sms'" },
    subject:        { type: 'text', notNull: true },
    body:           { type: 'text', notNull: true },
    hmac_token:     { type: 'text' },
    status:         { type: 'outbox_status', notNull: true, default: "'pending'" },
    created_at:     { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    sent_at:        { type: 'timestamptz' },
  });
  pgm.createIndex('outbox', ['status', 'created_at']);

  // ─── Stock Event ────────────────────────────────────────────
  pgm.createTable('stock_event', {
    id:             { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    facility_id:    { type: 'text', notNull: true },
    item_name:      { type: 'text', notNull: true },
    quantity_delta: { type: 'integer', notNull: true },
    event_type:     { type: 'stock_event_type', notNull: true },
    ts:             { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    reported_by:    { type: 'text', notNull: true },
  });

  // ─── Device Registry (auth) ─────────────────────────────────
  pgm.createTable('device', {
    device_id:      { type: 'text', primaryKey: true },
    pin_hash:       { type: 'text', notNull: true },
    role:           { type: 'text', notNull: true },
    worker_id:      { type: 'text', notNull: true },
    facility_id:    { type: 'text' },
    token_version:  { type: 'integer', notNull: true, default: 0 },
    locked:         { type: 'boolean', notNull: true, default: false },
    created_at:     { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // ─── Sync Sequence Tracking ─────────────────────────────────
  pgm.createTable('sync_cursor', {
    device_id:    { type: 'text', primaryKey: true, references: 'device(device_id)' },
    last_seq:     { type: 'bigint', notNull: true, default: 0 },
    last_sync_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // ─── Global Sequence for Sync Deltas ────────────────────────
  pgm.createSequence('global_sync_seq');

  // ─── Sync Journal (server-side log of changes) ──────────────
  pgm.createTable('sync_journal', {
    seq:        { type: 'bigint', primaryKey: true, default: pgm.func("nextval('global_sync_seq')") },
    table_name: { type: 'text', notNull: true },
    op:         { type: 'text', notNull: true },
    row_id:     { type: 'uuid', notNull: true },
    data:       { type: 'jsonb', notNull: true },
    device_id:  { type: 'text' },
    priority:   { type: 'text', notNull: true, default: "'analytics'" },
    ts:         { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('sync_journal', ['priority', 'seq']);

  // ─── Config: Evidence Timeout (V7) ──────────────────────────
  pgm.createTable('evidence_timeout', {
    id:          { type: 'serial', primaryKey: true },
    type:        { type: 'promise_type', notNull: true },
    subtype:     { type: 'text', notNull: true },
    timeout_ms:  { type: 'bigint', notNull: true },
    district_id: { type: 'text' },  // null = global default
  });
  pgm.createIndex('evidence_timeout', ['type', 'subtype']);

  // ─── Config: Incentive Rate (V11) ───────────────────────────
  pgm.createTable('incentive_rate', {
    id:        { type: 'serial', primaryKey: true },
    task_type: { type: 'text', notNull: true },
    rate_inr:  { type: 'numeric(10,2)', notNull: true },
    effective_from: { type: 'date', notNull: true },
  });

  // ─── Config: RI Schedule ────────────────────────────────────
  pgm.createTable('ri_schedule', {
    id:          { type: 'serial', primaryKey: true },
    facility_id: { type: 'text', notNull: true },
    month:       { type: 'integer', notNull: true },
    year:        { type: 'integer', notNull: true },
    schedule:    { type: 'jsonb', notNull: true },
  });

  // ─── Config: Rule Bundle (IMNCI-lite, versioned) ────────────
  pgm.createTable('rule_bundle', {
    id:        { type: 'serial', primaryKey: true },
    name:      { type: 'text', notNull: true },
    version:   { type: 'integer', notNull: true },
    rules:     { type: 'jsonb', notNull: true },
    created_at:{ type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('rule_bundle', 'rule_bundle_name_version_unique', {
    unique: ['name', 'version'],
  });

  // ─── Seed default evidence timeouts ─────────────────────────
  pgm.sql(`
    INSERT INTO evidence_timeout (type, subtype, timeout_ms) VALUES
      ('referral', 'red_flag',  86400000),
      ('referral', 'urgent',   172800000),
      ('referral', 'routine', 604800000),
      ('vaccine_supply', 'default', 86400000),
      ('consult', 'urgent',   14400000),
      ('consult', 'routine',  86400000),
      ('followup', 'default',       0);
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('rule_bundle', { cascade: true });
  pgm.dropTable('ri_schedule', { cascade: true });
  pgm.dropTable('incentive_rate', { cascade: true });
  pgm.dropTable('evidence_timeout', { cascade: true });
  pgm.dropTable('sync_journal', { cascade: true });
  pgm.dropSequence('global_sync_seq');
  pgm.dropTable('sync_cursor', { cascade: true });
  pgm.dropTable('device', { cascade: true });
  pgm.dropTable('stock_event', { cascade: true });
  pgm.dropTable('outbox', { cascade: true });
  pgm.dropTable('promise_event', { cascade: true });
  pgm.dropTable('encounter', { cascade: true });
  pgm.dropTable('followup_detail', { cascade: true });
  pgm.dropTable('consult_detail', { cascade: true });
  pgm.dropTable('session_detail', { cascade: true });
  pgm.dropTable('referral_detail', { cascade: true });
  pgm.dropTable('promise', { cascade: true });
  pgm.dropTable('patient', { cascade: true });
  pgm.dropTable('household', { cascade: true });
  pgm.dropType('stock_event_type');
  pgm.dropType('outbox_status');
  pgm.dropType('followup_cohort');
  pgm.dropType('consult_urgency');
  pgm.dropType('referral_priority');
  pgm.dropType('independence_flag');
  pgm.dropType('promise_status');
  pgm.dropType('promise_type');
};
