begin;

select plan(1);

select has_column(
  'auth',
  'users',
  'id',
  'auth.users.id should exist'
);

select * from finish();

rollback;
