import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('keys', (table) => {
    table.uuid('key_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.string('key_type', 50).notNullable(); // 'symmetric', 'asymmetric', 'derived'
    table.string('algorithm', 100).notNullable(); // 'AES-256-GCM', 'ChaCha20-Poly1305', 'RSA-2048', etc.
    table.enum('status', ['active', 'disabled', 'revoked', 'deprecated']).notNullable().defaultTo('active');
    table.binary('encrypted_key_material').notNullable();
    table.binary('public_key');
    table.binary('nonce').notNullable();
    table.binary('tag').notNullable();
    table.binary('derivation_salt');
    table.jsonb('derivation_params');
    table.jsonb('metadata');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_rotated');
    table.timestamp('disabled_at');
    table.timestamp('revoked_at');
    
    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('created_at');
    table.index('algorithm');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('keys');
}
