<?php
require_once __DIR__ . '/BaseDao.php';

class UserDao extends BaseDao
{
    /** Never SELECT the password hash unless we really need it (login). */
    private const PUBLIC_COLUMNS = "id, first_name, last_name, email, role, faculty, created_at";

    public function __construct()
    {
        parent::__construct('users', ['first_name', 'last_name', 'email', 'password', 'role', 'faculty']);
    }

    public function get_all()
    {
        return $this->query("SELECT " . self::PUBLIC_COLUMNS . " FROM users ORDER BY first_name, last_name");
    }

    public function get_by_id($id)
    {
        return $this->query_unique("SELECT " . self::PUBLIC_COLUMNS . " FROM users WHERE id = :id", ['id' => $id]);
    }

    /** Includes the password hash – used only by AuthService (login). */
    public function get_by_email($email)
    {
        return $this->query_unique("SELECT * FROM users WHERE email = :email", ['email' => $email]);
    }
}
