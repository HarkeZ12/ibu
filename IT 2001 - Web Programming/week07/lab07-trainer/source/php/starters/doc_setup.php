<?php
use OpenApi\Attributes as OA;

#[OA\Info(title: 'CampusEvents API', description: 'REST API of CampusEvents – IT 2001 Web Programming.', version: '1.0')]
#[OA\Server(url: API_BASE_URL, description: 'This server')]
// TODO: the security scheme "bearerAuth" (http, bearer, JWT) -> the Authorize button
// TODO: every endpoint needs the token by default
#[OA\Schema(
    schema: 'Error',
    properties: [new OA\Property(property: 'error', type: 'string', example: 'Missing authentication token.')]
)]
class OpenApiSpec {}
