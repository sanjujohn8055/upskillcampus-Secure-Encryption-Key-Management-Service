import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('failed_login_attempts', (table) => {
    table.uuid('attempt_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username', 255).notNullable();
    table.specificType('ip_address', 'INET').notNullable();
    table.timestamp('attempted_at').notNullable().defaultTo(knex.fn.now());
    
    // Indexes
    table.index('username');
    table.index('ip_address');
    table.index('attempted_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('failed_login_attempts');
}
