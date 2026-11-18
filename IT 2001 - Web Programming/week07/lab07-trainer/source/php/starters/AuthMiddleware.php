<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/exceptions.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

/**
 * AUTHENTICATION middleware – "who are you?"
 *  - no token / invalid token / expired token -> 401 (UnauthorizedException)
 *  - valid token -> the user from the token is stored in Flight::get('user')
 */
class AuthMiddleware
{
    public function before($params)
    {
        // TODO 1: read the token (read_token); no token -> UnauthorizedException('Missing authentication token.')
        // TODO 2: decode it with Config::JWT_SECRET() and HS256 (JWT::decode + new Key)
        // TODO 3: expired token (ExpiredException) -> 401 'Your session has expired. Please log in again.'
        //         any other problem (Exception) -> 401 'Invalid authentication token.'   (catch the expired one FIRST)
        // TODO 4: store the user from the token as an array: Flight::set('user', ...)
    }

    /** Header format:  Authorization: Bearer <token> */
    private function read_token()
    {
        // TODO 1: read the Authorization header from Flight::request()
        // TODO 2: if it is empty, try $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] (Apache moves it there)
        // TODO 3: return the part after "Bearer " (preg_match), otherwise null
    }
}
