<?php
// Trainer autoloader (instead of Composer's): FlightPHP 3.19.5 + firebase/php-jwt 7.2.2
require_once __DIR__ . '/flightphp/flight/autoload.php';
require_once __DIR__ . '/flightphp/flight/Flight.php';
spl_autoload_register(function ($class) {
    if (strpos($class, 'Firebase\\JWT\\') === 0) {
        $file = __DIR__ . '/firebase/php-jwt/src/' . substr($class, 13) . '.php';
        if (is_file($file)) require_once $file;
    }
});
