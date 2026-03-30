import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('key_rotation_history', (table) => {
    table.uuid('rotation_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('old_key_id').notNullable().references('key_id').inTable('keys').onDelete('CASCADE');
    table.uuid('new_key_id').notNullable().references('key_id').inTable('keys').onDelete('CASCADE');
    table.uuid('rotated_by').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.integer('reencrypted_count').notNullable();
    table.timestamp('rotated_at').notNullable().defaultTo(knex.fn.now());
    
    // Indexes
    table.index('old_key_id');
    table.index('new_key_id');
    table.index('rotated_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('key_rotation_history');
}
