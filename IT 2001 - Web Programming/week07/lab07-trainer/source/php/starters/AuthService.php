<?php
require_once __DIR__ . '/UserService.php';
require_once __DIR__ . '/../dao/UserDao.php';
require_once __DIR__ . '/../../utils/Logger.php';
require_once __DIR__ . '/../../utils/Roles.php';
require_once __DIR__ . '/../../config/config.php';

use Firebase\JWT\JWT;

class AuthService
{
    private $user_service;
    private $user_dao;

    public function __construct($user_service = null, $user_dao = null)
    {
        $this->user_service = $user_service ?? new UserService();
        $this->user_dao = $user_dao ?? new UserDao();
    }

    /** Create a student account and log the user in immediately. */
    public function register($data)
    {
        // TODO 1: first_name, last_name, email and password are required (Validator::required)
        // TODO 2: if password_confirm is sent and differs from password -> ValidationException('Passwords do not match.')
        // TODO 3: never trust a role from the client – everybody who registers is a Roles::STUDENT
        // TODO 4: create the user with the UserService (it validates and hashes the password)
        // TODO 5: return ['user' => ..., 'token' => ...] – the same shape as login()
    }

    public function login($data)
    {
        // TODO 1: email and password are required (Validator::required)
        // TODO 2: find the user by the email – trimmed and lower-case (user_dao->get_by_email)
        // TODO 3: unknown email OR wrong password (password_verify) -> Logger::error("LOGIN FAILED email=...")
        //         and UnauthorizedException('Invalid email or password.') – the SAME message for both
        // TODO 4: remove the password hash from the user
        // TODO 5: Logger::info("LOGIN user=<id> role=<role>")
        // TODO 6: return ['user' => $user, 'token' => $this->create_token($user)]
    }

    /** The logged-in user's own account. */
    public function get_profile($user_id)
    {
        return $this->user_service->get_by_id($user_id);
    }

    /** Users may change their name and password – NOT their email or role. */
    public function update_profile($user_id, $data)
    {
        $current = $this->user_service->get_by_id($user_id);
        if (!empty($data['password']) && ($data['password_confirm'] ?? null) !== $data['password']) {
            throw new ValidationException('Passwords do not match.');
        }
        $changes = array_merge($current, [
            'first_name' => $data['first_name'] ?? $current['first_name'],
            'last_name' => $data['last_name'] ?? $current['last_name'],
            'password' => $data['password'] ?? null
        ]);
        return $this->user_service->update($changes, $user_id);
    }

    private function create_token($user)
    {
        // TODO 1: $payload with 'user' (id, email, role), 'iat' (now) and 'exp' (now + Config::JWT_EXPIRATION())
        // TODO 2: sign it with Config::JWT_SECRET() and HS256 (JWT::encode) and return the token
    }
}
