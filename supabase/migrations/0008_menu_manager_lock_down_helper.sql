-- menu_manager_require_passcode is an internal helper only meant to be
-- called from within the other SECURITY DEFINER functions in this file —
-- Postgres grants EXECUTE to PUBLIC by default on function creation, so it
-- was reachable directly via PostgREST even though nothing calls it that
-- way. Revoke that default grant; the functions that use it internally are
-- unaffected since they run as the function owner.
revoke execute on function menu_manager_require_passcode(text) from public;
