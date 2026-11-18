<?php
/*
 * Configuration of YOUR backend. config.php is in .gitignore – never commit it.
 */
class Config
{
    /* ---------- Database ---------- */
    public static function DB_HOST()     { return self::get_env('DB_HOST', '127.0.0.1'); }
    public static function DB_PORT()     { return self::get_env('DB_PORT', 3306); }
    public static function DB_NAME()     { return self::get_env('DB_NAME', 'campusevents'); }
    public static function DB_USER()     { return self::get_env('DB_USER', 'root'); }
    public static function DB_PASSWORD() { return self::get_env('DB_PASSWORD', ''); }

    /* ---------- Authentication (JWT) ---------- */
    // TODO: JWT_SECRET()     – your own random string, at least 32 characters
    // TODO: JWT_EXPIRATION() – 24 hours, in seconds


    public static function get_env($name, $default)
    {
        $value = getenv($name);
        return ($value !== false && trim($value) !== '') ? $value : $default;
    }
}
