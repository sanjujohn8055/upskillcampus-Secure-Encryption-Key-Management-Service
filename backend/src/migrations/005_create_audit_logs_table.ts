import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('log_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    table.string('event_type', 100).notNullable();
    table.uuid('user_id').references('user_id').inTable('users').onDelete('SET NULL');
    table.specificType('ip_address', 'INET').notNullable();
    table.string('action', 255).notNullable();
    table.uuid('resource_id');
    table.enum('result', ['success', 'failure']).notNullable();
    table.jsonb('metadata');
    table.string('signature', 512).notNullable();
    
    // Indexes
    table.index('timestamp');
    table.index('event_type');
    table.index('user_id');
    table.index('result');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
}
