<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/exceptions.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

/**
 * AUTHENTICATION middleware – "who are you?"
 *
 * Registered on a route or a group:  ->addMiddleware(new AuthMiddleware())
 * FlightPHP calls before() BEFORE the route function runs.
 *
 *  - no token / invalid token / expired token -> 401 (UnauthorizedException)
 *  - valid token -> the user from the token is stored in Flight::get('user')
 */
class AuthMiddleware
{
    public function before($params)
    {
        $token = $this->read_token();
        if (!$token) {
            throw new UnauthorizedException('Missing authentication token.');
        }

        try {
            $decoded = JWT::decode($token, new Key(Config::JWT_SECRET(), 'HS256'));
        } catch (ExpiredException $e) {
            throw new UnauthorizedException('Your session has expired. Please log in again.');
        } catch (Exception $e) {
            throw new UnauthorizedException('Invalid authentication token.');
        }

        // Available in every route and service call: Flight::get('user')['id'], ['role']...
        Flight::set('user', (array) $decoded->user);
    }

    /** Header format:  Authorization: Bearer <token> */
    private function read_token()
    {
        $header = Flight::request()->getHeader('Authorization');
        if (!$header) {
            // Some Apache setups move the header to this variable (see .htaccess)
            $header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        }
        if (preg_match('/^Bearer\s+(\S+)$/i', $header, $matches)) {
            return $matches[1];
        }
        return null;
    }
}
