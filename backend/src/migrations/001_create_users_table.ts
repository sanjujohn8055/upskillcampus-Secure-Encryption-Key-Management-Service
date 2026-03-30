import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('user_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username', 255).unique().notNullable();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.enum('role', ['user', 'admin']).notNullable().defaultTo('user');
    table.boolean('mfa_enabled').notNullable().defaultTo(false);
    table.binary('mfa_secret_encrypted');
    table.binary('backup_codes_encrypted');
    table.boolean('account_locked').notNullable().defaultTo(false);
    table.timestamp('locked_until');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_login');
    
    // Indexes
    table.index('username');
    table.index('email');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
