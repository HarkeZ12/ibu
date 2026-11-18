<?php
use OpenApi\Attributes as OA;

#[OA\Info(title: 'CampusEvents API', description: 'REST API of CampusEvents – IT 2001 Web Programming.', version: '1.0')]
#[OA\Server(url: API_BASE_URL, description: 'This server')]
// Authentication: log in with POST /auth/login, copy the "token" and click "Authorize".
// Every endpoint needs the token unless it says security: [].
#[OA\SecurityScheme(securityScheme: 'bearerAuth', type: 'http', scheme: 'bearer', bearerFormat: 'JWT')]
#[OA\OpenApi(security: [['bearerAuth' => []]])]
#[OA\Schema(
    schema: 'Error',
    properties: [new OA\Property(property: 'error', type: 'string', example: 'Missing authentication token.')]
)]
class OpenApiSpec {}
