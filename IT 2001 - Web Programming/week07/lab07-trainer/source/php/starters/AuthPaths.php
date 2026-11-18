<?php
use OpenApi\Attributes as OA;

class AuthPaths
{
    // TODO: login is public – it must not need the token. Document 401 as well.
    #[OA\Post(
        path: '/auth/login',
        tags: ['auth'],
        summary: 'Log in with email and password',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', example: 'ema@campusevents.ba'),
                    new OA\Property(property: 'password', type: 'string', example: 'Student123!')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'User and JWT')
        ]
    )]
    public function postAuthLogin() {}

    // TODO: GET /auth/me is protected – document 401 (missing, invalid or expired token)
    #[OA\Get(
        path: '/auth/me',
        tags: ['auth'],
        summary: 'The logged-in user',
        responses: [
            new OA\Response(response: 200, description: 'The user from the token')
        ]
    )]
    public function getAuthMe() {}
}
