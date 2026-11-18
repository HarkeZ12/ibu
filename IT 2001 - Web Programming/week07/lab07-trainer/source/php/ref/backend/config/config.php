<?php
/*
 * Configuration of YOUR backend. config.php is in .gitignore – never commit it.
 */
class Config
{
    /* ---------- Database (the trainer uses SQLite, your project uses MySQL) ---------- */
    public static function DB_HOST()     { return self::get_env('DB_HOST', '127.0.0.1'); }
    public static function DB_PORT()     { return self::get_env('DB_PORT', 3306); }
    public static function DB_NAME()     { return self::get_env('DB_NAME', 'campusevents'); }
    public static function DB_USER()     { return self::get_env('DB_USER', 'root'); }
    public static function DB_PASSWORD() { return self::get_env('DB_PASSWORD', ''); }

    /* ---------- Authentication (JWT) ---------- */
    public static function JWT_SECRET()     { return self::get_env('JWT_SECRET', '9f2c4e7a1b8d3f6a0c5e9b2d7f4a1c8e3b6d0f9a2c7e4b1d8f5a3c6e0b9d2f7a'); }
    public static function JWT_EXPIRATION() { return self::get_env('JWT_EXPIRATION', 60 * 60 * 24); }   // 24 hours

    public static function get_env($name, $default)
    {
        $value = getenv($name);
        return ($value !== false && trim($value) !== '') ? $value : $default;
    }
}
