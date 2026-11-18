<?php
/**
 * Exceptions thrown by services when a rule is broken.
 * Each one carries the HTTP status code the API should answer with
 * (the routes/error handler turn them into JSON responses).
 */
class HttpException extends Exception
{
    protected $status = 500;

    public function get_status()
    {
        return $this->status;
    }
}

/** 400 – the request data is invalid (missing field, wrong format, broken business rule). */
class ValidationException extends HttpException { protected $status = 400; }

/** 401 – the user is not logged in (missing, invalid or expired token). */
class UnauthorizedException extends HttpException { protected $status = 401; }

/** 403 – the user is logged in, but is not allowed to do this. */
class ForbiddenException extends HttpException { protected $status = 403; }

/** 404 – the requested entity does not exist. */
class NotFoundException extends HttpException { protected $status = 404; }

/** 503 – an external service (third-party API) is not available. */
class ExternalServiceException extends HttpException { protected $status = 503; }
