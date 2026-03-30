import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('encrypted_data', (table) => {
    table.uuid('data_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.uuid('key_id').notNullable().references('key_id').inTable('keys');
    table.binary('ciphertext').notNullable();
    table.binary('nonce').notNullable();
    table.binary('tag').notNullable();
    table.binary('associated_data');
    table.string('algorithm', 100).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    // Indexes
    table.index('user_id');
    table.index('key_id');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('encrypted_data');
}
