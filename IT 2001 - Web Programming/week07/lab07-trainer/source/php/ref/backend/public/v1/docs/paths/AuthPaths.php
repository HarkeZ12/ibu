<?php
use OpenApi\Attributes as OA;

class AuthPaths
{
    #[OA\Post(
        path: '/auth/login',
        tags: ['auth'],
        summary: 'Log in with email and password',
        security: [],
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
            new OA\Response(response: 200, description: 'User and JWT'),
            new OA\Response(response: 401, description: 'Invalid email or password', content: new OA\JsonContent(ref: '#/components/schemas/Error'))
        ]
    )]
    public function postAuthLogin() {}

    #[OA\Get(
        path: '/auth/me',
        tags: ['auth'],
        summary: 'The logged-in user',
        responses: [
            new OA\Response(response: 200, description: 'The user from the token'),
            new OA\Response(response: 401, description: 'Missing, invalid or expired token', content: new OA\JsonContent(ref: '#/components/schemas/Error'))
        ]
    )]
    public function getAuthMe() {}
}
