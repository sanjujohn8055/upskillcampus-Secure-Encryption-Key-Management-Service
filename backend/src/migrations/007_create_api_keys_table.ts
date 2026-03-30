import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('api_keys', (table) => {
    table.uuid('api_key_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.string('key_hash', 512).notNullable();
    table.string('key_prefix', 20).notNullable();
    table.string('name', 255);
    table.jsonb('scopes').notNullable();
    table.enum('status', ['active', 'revoked']).notNullable().defaultTo('active');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_used');
    table.timestamp('expires_at');
    
    // Indexes
    table.index('user_id');
    table.index('key_prefix');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('api_keys');
}
