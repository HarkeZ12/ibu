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
        Validator::required($data, ['first_name', 'last_name', 'email', 'password']);
        if (isset($data['password_confirm']) && $data['password_confirm'] !== $data['password']) {
            throw new ValidationException('Passwords do not match.');
        }

        // Rule: everybody who registers is a STUDENT – never trust a "role" sent by the client
        $data['role'] = Roles::STUDENT;
        $user = $this->user_service->add($data);     // validates + hashes the password

        Logger::info("REGISTER user={$user['id']} email={$user['email']}");
        return ['user' => $user, 'token' => $this->create_token($user)];
    }

    public function login($data)
    {
        Validator::required($data, ['email', 'password']);
        $user = $this->user_dao->get_by_email(strtolower(trim($data['email'])));

        // Same message for "unknown email" and "wrong password" – do not tell attackers which emails exist
        if (!$user || !password_verify($data['password'], $user['password'])) {
            Logger::error("LOGIN FAILED email={$data['email']}");
            throw new UnauthorizedException('Invalid email or password.');
        }

        unset($user['password']);                     // never send the hash to the client
        Logger::info("LOGIN user={$user['id']} role={$user['role']}");
        return ['user' => $user, 'token' => $this->create_token($user)];
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

    /**
     * header.payload.signature – the payload is only Base64 encoded (anybody can READ it),
     * the signature (made with JWT_SECRET) proves that WE created it and nobody changed it.
     */
    private function create_token($user)
    {
        $payload = [
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'role' => $user['role']
            ],
            'iat' => time(),                                   // issued at
            'exp' => time() + (int) Config::JWT_EXPIRATION()   // expires
        ];
        return JWT::encode($payload, Config::JWT_SECRET(), 'HS256');
    }
}
