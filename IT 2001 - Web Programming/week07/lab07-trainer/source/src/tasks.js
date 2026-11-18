// Lab 07 tasks: each one is one file of the backend. The check() runs the student's file inside
// the reference CampusEvents backend (FlightPHP 3.19 + firebase/php-jwt 7, SQLite instead of MySQL).
const R = String.raw;

const EMA = { email: 'ema@campusevents.ba', password: 'Student123!' };

export const TASKS = [
  /* ------------------------------------------------------------------ 1 */
  {
    id: 'config',
    step: 'Step 1',
    name: 'JWT settings',
    file: 'backend/config/config.php',
    starter: 'config.php',
    title: 'Add JWT_SECRET() and JWT_EXPIRATION() to config.php',
    steps: [
      'Add two <code>public static</code> methods to the <code>Config</code> class, like the database settings above them.',
      '<code>JWT_SECRET()</code> returns <code>self::get_env(\'JWT_SECRET\', \'…\')</code> with <b>your own</b> random string of at least 32 characters (e.g. the output of <code>php -r "echo bin2hex(random_bytes(32));"</code>).',
      '<code>JWT_EXPIRATION()</code> returns <code>self::get_env(\'JWT_EXPIRATION\', 60 * 60 * 24)</code> – 24 hours in seconds.',
    ],
    spec: [
      '<code>Config::JWT_SECRET()</code>: own secret, ≥ 32 characters, read through <code>get_env()</code>',
      '<code>Config::JWT_EXPIRATION()</code>: 24 hours in seconds, read through <code>get_env()</code>',
    ],
    why: 'JWT_SECRET signs every token: anybody who knows it can create a valid token for any user. That is why config.php stays in .gitignore and only config.example.php (with the example value) is committed. Without an expiry a stolen token works forever.',
    async check(c) {
      await c.php(R`<?php
        require_once '/app/backend/config/config.php';
        t('Config::JWT_SECRET() exists', fn() => method_exists('Config', 'JWT_SECRET') ?: 'Add: public static function JWT_SECRET() { ... }');
        t('Config::JWT_EXPIRATION() exists', fn() => method_exists('Config', 'JWT_EXPIRATION') ?: 'Add: public static function JWT_EXPIRATION() { ... }');
        t('Both are public static, like the DB settings', function () {
            foreach (['JWT_SECRET', 'JWT_EXPIRATION'] as $m) {
                if (!method_exists('Config', $m)) return "$m() is missing";
                $r = new ReflectionMethod('Config', $m);
                if (!$r->isStatic() || !$r->isPublic()) return "$m() must be public static";
            }
            return true;
        });
        t('JWT_SECRET() has at least 32 characters', function () {
            $s = (string) Config::JWT_SECRET();
            return strlen($s) >= 32 ?: 'It has only ' . strlen($s) . ' characters.';
        });
        t('JWT_SECRET() is your own secret, not the example value', fn() =>
            Config::JWT_SECRET() !== 'change-me-to-a-long-random-string-of-at-least-32-characters' ?: 'This is the example value from config.example.php – put your own random string into config.php.');
        t('JWT_EXPIRATION() is 24 hours (86400 seconds)', fn() => (int) Config::JWT_EXPIRATION() === 86400 ?: 'It is ' . var_export(Config::JWT_EXPIRATION(), true) . ' – use 60 * 60 * 24.');
        t('Environment variables win: both use self::get_env()', function () {
            putenv('JWT_SECRET=from-the-server-environment-0123456789abcdef');
            putenv('JWT_EXPIRATION=600');
            $s = Config::JWT_SECRET(); $e = Config::JWT_EXPIRATION();
            putenv('JWT_SECRET'); putenv('JWT_EXPIRATION');
            if ($s !== 'from-the-server-environment-0123456789abcdef') return 'JWT_SECRET() ignores the environment variable – return self::get_env(\'JWT_SECRET\', \'...\')';
            if ((int) $e !== 600) return 'JWT_EXPIRATION() ignores the environment variable – return self::get_env(\'JWT_EXPIRATION\', 60 * 60 * 24)';
            return true;
        });
      `);
      const r = await c.req('POST', '/auth/login', { body: EMA });
      c.expect('Login works with your settings (POST /auth/login → 200 + token)', r, 200, { test: (j) => typeof j.token === 'string' || 'No token in the answer' });
      if (r.json?.token) {
        c.expect('The token opens a protected route (GET /events → 200)', await c.req('GET', '/events', { token: r.json.token }), 200);
      }
    },
  },

  /* ------------------------------------------------------------------ 2 */
  {
    id: 'logger',
    step: 'Step 2',
    name: 'Logger',
    file: 'backend/utils/Logger.php',
    starter: 'Logger.php',
    title: 'Logger::info() and Logger::error()',
    steps: [
      '<code>info($message)</code> calls <code>self::write(self::INFO_FILE, \'INFO\', $message)</code>, <code>error()</code> the same with <code>ERROR_FILE</code> and <code>\'ERROR\'</code>.',
      '<code>write()</code> builds one line: <code>sprintf("[%s] %s %s%s", date(\'Y-m-d H:i:s\'), $level, $message, PHP_EOL)</code>',
      'and appends it: <code>@file_put_contents($file, $line, FILE_APPEND | LOCK_EX);</code> (the <code>@</code>: a full disk must never crash the request).',
      'Optional: create the folder when it is missing – <code>if (!is_dir(dirname($file))) @mkdir(dirname($file), 0775, true);</code>',
    ],
    spec: [
      '<code>Logger::info($m)</code> → <code>logs/info.log</code>, <code>Logger::error($m)</code> → <code>logs/error.log</code>',
      'one line per call: <code>[YYYY-MM-DD HH:MM:SS] LEVEL message</code>, appended (never overwrite)',
    ],
    why: 'A log line says WHO did WHAT – user id, URL, status – and nothing more. Never log a password or a token. FILE_APPEND keeps the old lines, LOCK_EX stops two requests from mixing their lines.',
    async check(c) {
      await c.php(R`<?php
        require_once '/app/backend/utils/Logger.php';
        clear_logs();
        t('Logger::info() writes to logs/info.log', function () {
            Logger::info('first trainer line');
            return str_contains(log_text('info.log'), 'first trainer line') ?: 'logs/info.log does not contain the message.';
        });
        t('The line looks like "[2026-11-12 10:15:03] INFO message"', function () {
            $lines = file('/app/backend/logs/info.log', FILE_IGNORE_NEW_LINES);
            $last = end($lines);
            return preg_match('/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] INFO first trainer line$/', $last) ?: 'The line is: ' . $last;
        });
        t('The date and time are now (date(\'Y-m-d H:i:s\'))', function () {
            preg_match('/^\[([^\]]+)\]/', log_text('info.log'), $m);
            $t = isset($m[1]) ? strtotime($m[1]) : false;
            return ($t && abs($t - time()) < 120) ?: 'The time in the line is not the current time: ' . ($m[1] ?? 'missing');
        });
        t('Every call adds a new line (FILE_APPEND), ending with a newline', function () {
            Logger::info('second trainer line');
            $text = log_text('info.log');
            if (substr_count($text, "\n") !== 2) return 'Expected 2 lines, the file is: ' . json_encode($text);
            return str_contains($text, 'first trainer line') ?: 'The first line was overwritten – use FILE_APPEND.';
        });
        t('Logger::error() writes "ERROR" lines to logs/error.log', function () {
            Logger::error('LOGIN FAILED email=x@y.ba');
            $e = log_text('error.log');
            if (!preg_match('/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] ERROR LOGIN FAILED email=x@y\.ba\R$/', $e)) return 'logs/error.log is: ' . json_encode($e);
            return !str_contains(log_text('info.log'), 'LOGIN FAILED') ?: 'The error line also landed in info.log.';
        });
      `);
      c.clearLogs();
      const tok = await c.login();
      await c.req('GET', '/events', { token: tok });
      await c.req('POST', '/auth/login', { body: { email: EMA.email, password: 'wrong-password1' } });
      const info = c.log('info.log'), err = c.log('error.log');
      c.add('In the real API: a login is logged in info.log', /INFO LOGIN user=2 role=student/.test(info), 'info.log: ' + info.slice(0, 300));
      c.add('In the real API: every request is logged (GET /events 200)', /INFO GET \/events 200 user=2 role=student \d+ms/.test(info), 'info.log: ' + info.slice(0, 300));
      c.add('In the real API: a failed login is logged in error.log', /ERROR LOGIN FAILED email=ema@campusevents\.ba/.test(err), 'error.log: ' + err.slice(0, 300));
    },
  },

  /* ------------------------------------------------------------------ 3 */
  {
    id: 'auth-service',
    step: 'Step 3',
    name: 'AuthService',
    file: 'backend/rest/services/AuthService.php',
    starter: 'AuthService.php',
    title: 'register(), login() and create_token()',
    steps: [
      '<b>login($data)</b>: <code>Validator::required($data, [\'email\', \'password\']);</code> then <code>$user = $this-&gt;user_dao-&gt;get_by_email(strtolower(trim($data[\'email\'])));</code>',
      'If <code>!$user || !password_verify($data[\'password\'], $user[\'password\'])</code>: <code>Logger::error("LOGIN FAILED email={$data[\'email\']}")</code> and <code>throw new UnauthorizedException(\'Invalid email or password.\');</code> – the same message for both cases.',
      'Otherwise <code>unset($user[\'password\'])</code>, <code>Logger::info("LOGIN user={$user[\'id\']} role={$user[\'role\']}")</code> and <code>return [\'user\' =&gt; $user, \'token\' =&gt; $this-&gt;create_token($user)];</code>',
      '<b>register($data)</b>: <code>Validator::required</code> for first_name, last_name, email, password; if <code>password_confirm</code> is sent and differs → <code>ValidationException(\'Passwords do not match.\')</code>.',
      'Then <code>$data[\'role\'] = Roles::STUDENT;</code> (never trust a role from the client), <code>$user = $this-&gt;user_service-&gt;add($data);</code> (validates + hashes) and return the same shape as login.',
      '<b>create_token($user)</b>: <code>$payload = [\'user\' =&gt; [\'id\' =&gt; $user[\'id\'], \'email\' =&gt; $user[\'email\'], \'role\' =&gt; $user[\'role\']], \'iat\' =&gt; time(), \'exp\' =&gt; time() + (int) Config::JWT_EXPIRATION()];</code> and <code>return JWT::encode($payload, Config::JWT_SECRET(), \'HS256\');</code> (the lecture project also puts first_name and last_name into user – both versions pass)',
    ],
    spec: [
      '<code>login($data)</code>: 400 when email/password missing; 401 <code>Invalid email or password.</code> for an unknown email AND a wrong password; returns <code>{user, token}</code> without the hash; logs <code>LOGIN user=… role=…</code> / <code>LOGIN FAILED email=…</code>',
      '<code>register($data)</code>: role is always <code>student</code>; <code>password_confirm</code> must match; uses <code>UserService::add()</code>; returns <code>{user, token}</code>',
      '<code>create_token($user)</code>: HS256 with <code>JWT_SECRET</code>; payload <code>user</code> (id, email, role), <code>iat</code>, <code>exp</code>',
    ],
    why: 'password_verify() compares the password with the bcrypt hash that password_hash() stored – we never store or compare plain passwords. The same message for "unknown email" and "wrong password" does not tell an attacker which emails exist. The payload is only encoded (anybody can read it on jwt.io), so never put the hash in it.',
    async check(c) {
      c.clearLogs();
      await c.php(R`<?php
        require_once '/app/backend/rest/services/AuthService.php';
        use Firebase\JWT\JWT; use Firebase\JWT\Key;
        $s = new AuthService();
        $res = null;
        t('login() with the correct password returns ["user" => ..., "token" => ...]', function () use ($s, &$res) {
            $res = $s->login(['email' => 'ema@campusevents.ba', 'password' => 'Student123!']);
            if (!is_array($res)) return 'login() returned ' . var_export($res, true);
            return (isset($res['user'], $res['token']) && ($res['user']['id'] ?? null) == 2) ?: 'Expected the keys user (Ema, id 2) and token, got: ' . json_encode($res);
        });
        t('The answer never contains the password hash', fn() => (is_array($res) && !array_key_exists('password', $res['user'] ?? [])) ?: 'unset($user[\'password\']) before you return the user.');
        $payload = null;
        t('The token is a JWT signed with Config::JWT_SECRET() (HS256)', function () use (&$res, &$payload) {
            if (!is_string($res['token'] ?? null)) return 'There is no token.';
            $payload = JWT::decode($res['token'], new Key(Config::JWT_SECRET(), 'HS256'));
            return true;
        });
        t('Payload: user with id, email and role', function () use (&$payload) {
            if (!$payload) return 'No valid token.';
            $u = (array) ($payload->user ?? []);
            foreach (['id', 'email', 'role'] as $k) if (!array_key_exists($k, $u)) return "payload user has no '$k': " . json_encode($payload);
            return ($u['id'] == 2 && $u['role'] === 'student') ?: 'Wrong user in the token: ' . json_encode($u);
        });
        t('Payload: iat = time() and exp = time() + JWT_EXPIRATION()', function () use (&$payload) {
            if (!$payload) return 'No valid token.';
            if (!isset($payload->iat, $payload->exp)) return 'iat or exp is missing: ' . json_encode($payload);
            if (abs($payload->iat - time()) > 5) return 'iat is not the current time.';
            return abs(($payload->exp - $payload->iat) - (int) Config::JWT_EXPIRATION()) <= 2 ?: 'exp - iat should be ' . Config::JWT_EXPIRATION() . ' seconds, it is ' . ($payload->exp - $payload->iat);
        });
        t('No password or hash inside the token', fn() => ($payload && !preg_match('/password|\$2y\$|Student123/i', json_encode($payload))) ?: 'The payload contains a secret: ' . json_encode($payload));
        t('Wrong password → UnauthorizedException "Invalid email or password."', fn() => expect_throw(fn() => $s->login(['email' => 'ema@campusevents.ba', 'password' => 'Wrong12345']), 'UnauthorizedException', 'Invalid email or password.'));
        t('Unknown email → the SAME exception and message', fn() => expect_throw(fn() => $s->login(['email' => 'nobody@campusevents.ba', 'password' => 'Student123!']), 'UnauthorizedException', 'Invalid email or password.'));
        t('Missing password → ValidationException (400)', fn() => expect_throw(fn() => $s->login(['email' => 'ema@campusevents.ba']), 'ValidationException'));
        t('The email is trimmed and lower-cased ("  EMA@CampusEvents.ba ")', function () use ($s) {
            $r = $s->login(['email' => '  EMA@CampusEvents.ba ', 'password' => 'Student123!']);
            return (($r['user']['id'] ?? null) == 2) ?: 'Login failed.';
        });
        t('An account with a plain-text password cannot log in (password_verify)', fn() => expect_throw(fn() => $s->login(['email' => 'plain@campusevents.ba', 'password' => 'Plain123!']), 'UnauthorizedException'));
        t('info.log: "LOGIN user=2 role=student"', fn() => str_contains(log_text('info.log'), 'LOGIN user=2 role=student') ?: 'info.log: ' . log_text('info.log'));
        t('error.log: "LOGIN FAILED email=ema@campusevents.ba"', fn() => str_contains(log_text('error.log'), 'LOGIN FAILED email=ema@campusevents.ba') ?: 'error.log: ' . log_text('error.log'));
        t('No password and no token in the logs', function () {
            $all = log_text('info.log') . log_text('error.log');
            return !preg_match('/Student123|Wrong12345|eyJ/', $all) ?: 'A password or a token was written to a log.';
        });

        $reg = null;
        t('register() creates the user and returns ["user", "token"]', function () use ($s, &$reg) {
            $reg = $s->register(['first_name' => 'Amar', 'last_name' => 'Hodžić', 'email' => 'Amar@CampusEvents.ba', 'password' => 'Secret123', 'role' => 'admin']);
            return (isset($reg['user']['id'], $reg['token'])) ?: 'Got: ' . json_encode($reg);
        });
        t('register() ignores "role": "admin" – the role is always student', function () use (&$reg) {
            $row = db()->query("SELECT role FROM users WHERE email = 'amar@campusevents.ba'")->fetch();
            if (!$row) return 'The user is not in the database.';
            if ($row['role'] !== 'student') return 'The client registered as ' . $row['role'] . '! Set $data[\'role\'] = Roles::STUDENT before add().';
            $p = JWT::decode($reg['token'], new Key(Config::JWT_SECRET(), 'HS256'));
            return $p->user->role === 'student' ?: 'The token says role ' . $p->user->role;
        });
        t('register() stores a hash, never the password (UserService::add)', function () {
            $row = db()->query("SELECT password FROM users WHERE email = 'amar@campusevents.ba'")->fetch();
            return ($row && str_starts_with($row['password'], '$2y$') && password_verify('Secret123', $row['password'])) ?: 'The stored password is not a bcrypt hash – call $this->user_service->add($data).';
        });
        t('The new user can log in right away', function () use ($s) {
            $r = $s->login(['email' => 'amar@campusevents.ba', 'password' => 'Secret123']);
            return isset($r['token']) ?: 'Login after register failed.';
        });
        t('password_confirm that does not match → ValidationException', fn() => expect_throw(fn() => $s->register(['first_name' => 'Lejla', 'last_name' => 'Begić', 'email' => 'lejla@campusevents.ba', 'password' => 'Secret123', 'password_confirm' => 'Secret124']), 'ValidationException'));
        t('Missing first_name → ValidationException', fn() => expect_throw(fn() => $s->register(['last_name' => 'Begić', 'email' => 'lejla2@campusevents.ba', 'password' => 'Secret123']), 'ValidationException'));
        t('An email that already exists → ValidationException', fn() => expect_throw(fn() => $s->register(['first_name' => 'Ema', 'last_name' => 'Kovač', 'email' => 'ema@campusevents.ba', 'password' => 'Secret123']), 'ValidationException'));
      `);
      const r = await c.req('POST', '/auth/register', { body: { first_name: 'Dino', last_name: 'Mehić', email: 'dino@campusevents.ba', password: 'Secret123', password_confirm: 'Secret123' } });
      c.expect('Through the API: POST /auth/register → 201', r, 201, { test: (j) => (!!j.user && !!j.token) || 'Expected user and token' });
      const l = await c.req('POST', '/auth/login', { body: { email: 'nobody@x.ba', password: 'Secret123' } });
      c.expect('Through the API: a wrong login → 401', l, 401, { error: 'Invalid email or password.' });
    },
  },

  /* ------------------------------------------------------------------ 7 */
  {
    id: 'auth-routes',
    step: 'Step 3',
    name: 'AuthRoutes',
    file: 'backend/rest/routes/AuthRoutes.php',
    starter: 'AuthRoutes.php',
    title: 'POST /auth/register, POST /auth/login, GET/PUT /auth/me',
    steps: [
      '<code>POST /auth/register</code>: <code>$data = Flight::request()-&gt;data-&gt;getData();</code> and <code>Flight::json(Flight::auth_service()-&gt;register($data), 201);</code>',
      '<code>POST /auth/login</code>: the same with <code>login($data)</code> (status 200).',
      '<code>GET /auth/me</code>: <code>Flight::json(Flight::auth_service()-&gt;get_profile(Flight::get(\'user\')[\'id\']));</code> and after the route: <code>-&gt;addMiddleware(new AuthMiddleware());</code>',
      '<code>PUT /auth/me</code>: <code>update_profile(Flight::get(\'user\')[\'id\'], $data)</code>, also with <code>-&gt;addMiddleware(new AuthMiddleware())</code>.',
    ],
    spec: [
      '<code>POST /auth/register</code> → 201, <code>POST /auth/login</code> → 200 – both public',
      '<code>GET /auth/me</code> and <code>PUT /auth/me</code> → the user from the token; each route has its own AuthMiddleware',
    ],
    why: 'AuthRoutes.php is required OUTSIDE the protected group (a user who is not logged in has no token yet). So /auth/me must get the middleware itself with ->addMiddleware(). The id always comes from the token, never from the URL or the body.',
    async check(c) {
      let r = await c.req('POST', '/auth/register', { body: { first_name: 'Amar', last_name: 'Hodžić', email: 'amar@campusevents.ba', password: 'Secret123', role: 'admin' } });
      c.expect('POST /auth/register → 201 {user, token}', r, 201, { test: (j) => (!!j.user && !!j.token) || 'Expected user and token' });
      c.add('register: the role is student even when "admin" is sent', r.json?.user?.role === 'student', 'role: ' + r.json?.user?.role);
      r = await c.req('POST', '/auth/login', { body: EMA });
      c.expect('POST /auth/login → 200 {user, token} (without a token)', r, 200, { test: (j) => (!!j.user && !!j.token) || 'Expected user and token' });
      const tok = r.json?.token;
      r = await c.req('POST', '/auth/login', { body: { email: EMA.email, password: 'Wrong12345' } });
      c.expect('POST /auth/login with a wrong password → 401', r, 401, { error: 'Invalid email or password.' });
      r = await c.req('GET', '/auth/me');
      c.expect('GET /auth/me without a token → 401 (->addMiddleware(new AuthMiddleware()))', r, 401, { error: 'Missing authentication token.' });
      r = await c.req('GET', '/auth/me', { token: tok });
      c.expect('GET /auth/me with Ema\'s token → 200, id 2, no password', r, 200, { test: (j) => (j.id == 2 && !('password' in j)) || 'Expected Ema (id 2) without the hash' });
      const admin = await c.mint({ id: 1, email: 'admin@campusevents.ba', role: 'admin', first_name: 'Admin', last_name: 'CampusEvents' });
      r = await c.req('GET', '/auth/me', { token: admin });
      c.expect('GET /auth/me with the admin\'s token → id 1 (Flight::get(\'user\')[\'id\'])', r, 200, { test: (j) => j.id == 1 || 'The id must come from the token' });
      r = await c.req('PUT', '/auth/me', { body: { first_name: 'Emina' } });
      c.expect('PUT /auth/me without a token → 401', r, 401);
      r = await c.req('PUT', '/auth/me', { token: tok, body: { first_name: 'Emina' } });
      c.expect('PUT /auth/me with a token → 200 and the name is changed', r, 200, { test: (j) => j.first_name === 'Emina' || 'first_name is not Emina' });
      r = await c.req('PUT', '/auth/me', { token: tok, body: { password: 'NewPass123', password_confirm: 'Other123' } });
      c.expect('PUT /auth/me with passwords that do not match → 400', r, 400);
    },
  },

  /* ------------------------------------------------------------------ 4 */
  {
    id: 'auth-middleware',
    step: 'Step 4',
    name: 'AuthMiddleware',
    file: 'backend/middleware/AuthMiddleware.php',
    starter: 'AuthMiddleware.php',
    title: 'before($params) and read_token()',
    steps: [
      '<b>read_token()</b>: <code>$header = Flight::request()-&gt;getHeader(\'Authorization\');</code> If it is empty, try <code>$_SERVER[\'REDIRECT_HTTP_AUTHORIZATION\'] ?? \'\'</code> (Apache moves it there).',
      'Return the part after <code>Bearer</code>: <code>if (preg_match(\'/^Bearer\\s+(\\S+)$/i\', $header, $matches)) return $matches[1];</code> otherwise <code>return null;</code>',
      '<b>before($params)</b>: <code>$token = $this-&gt;read_token();</code> No token → <code>throw new UnauthorizedException(\'Missing authentication token.\');</code>',
      '<code>try { $decoded = JWT::decode($token, new Key(Config::JWT_SECRET(), \'HS256\')); }</code>',
      '<code>catch (ExpiredException $e)</code> → 401 <code>Your session has expired. Please log in again.</code>; <code>catch (Exception $e)</code> → 401 <code>Invalid authentication token.</code> (ExpiredException first – it is also an Exception).',
      'Finally <code>Flight::set(\'user\', (array) $decoded-&gt;user);</code> – every route can now use <code>Flight::get(\'user\')[\'id\']</code>.',
    ],
    spec: [
      'token from <code>Authorization: Bearer &lt;token&gt;</code>, fallback <code>$_SERVER[\'REDIRECT_HTTP_AUTHORIZATION\']</code>',
      'no token → 401 <code>Missing authentication token.</code>; expired → 401 <code>Your session has expired. Please log in again.</code>; changed / other secret → 401 <code>Invalid authentication token.</code>',
      'valid → <code>Flight::set(\'user\', (array) $decoded-&gt;user)</code>',
    ],
    why: 'Version 1 (AuthDemoRoutesv1.php) checked the token inside a route – 15 lines copied into every route, and one forgotten copy leaves an endpoint open. Version 2 is this middleware: written once and registered once for the whole group. The user comes from the VERIFIED token, so routes can trust Flight::get(\'user\')[\'id\'].',
    async check(c) {
      const ema = await c.mint();
      let r = await c.req('GET', '/events');
      c.expect('No Authorization header → 401 "Missing authentication token."', r, 401, { error: 'Missing authentication token.' });
      r = await c.req('GET', '/events', { headers: { Authorization: 'Token ' + ema } });
      c.expect('Header without "Bearer " → 401 "Missing authentication token."', r, 401, { error: 'Missing authentication token.' });
      r = await c.req('GET', '/events', { headers: { Authorization: 'Bearer' } });
      c.expect('"Bearer" with no token → 401 "Missing authentication token."', r, 401, { error: 'Missing authentication token.' });
      r = await c.req('GET', '/events', { token: ema });
      c.expect('A valid token → the route runs (GET /events → 200)', r, 200, { test: (j) => Array.isArray(j) || 'Expected the list of events' });
      r = await c.req('GET', '/auth/me', { token: ema });
      c.expect('Flight::get(\'user\') is the user from the token (GET /auth/me → Ema, id 2)', r, 200, { test: (j) => j.id == 2 || 'Expected id 2' });
      const admin = await c.mint({ id: 1, email: 'admin@campusevents.ba', role: 'admin', first_name: 'Admin', last_name: 'CampusEvents' });
      r = await c.req('GET', '/auth/me', { token: admin });
      c.expect('Another token → another user (admin, id 1)', r, 200, { test: (j) => j.id == 1 || 'Expected id 1 – take the user from the token' });
      const [h, p, s] = ema.split('.');
      const bytes = Uint8Array.from(atob(p.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes));
      payload.user.role = 'admin';
      const enc = String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload)));
      const forged = h + '.' + btoa(enc).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_') + '.' + s;
      r = await c.req('GET', '/events', { token: forged });
      c.expect('Changed payload (role → admin) → 401 "Invalid authentication token."', r, 401, { error: 'Invalid authentication token.' });
      r = await c.req('GET', '/events', { token: await c.mint({ secret: 'some-other-secret-that-is-at-least-32-chars-long' }) });
      c.expect('Token signed with another secret → 401 "Invalid authentication token."', r, 401, { error: 'Invalid authentication token.' });
      r = await c.req('GET', '/events', { token: 'abc.def.ghi' });
      c.expect('Garbage "abc.def.ghi" → 401 "Invalid authentication token."', r, 401, { error: 'Invalid authentication token.' });
      r = await c.req('GET', '/events', { token: await c.mint({ exp: -60 }) });
      c.expect('Expired token → 401 "Your session has expired. Please log in again."', r, 401, { error: 'Your session has expired. Please log in again.' });
      r = await c.req('GET', '/events', { server: { REDIRECT_HTTP_AUTHORIZATION: 'Bearer ' + ema } });
      c.expect('Apache: token in $_SERVER[\'REDIRECT_HTTP_AUTHORIZATION\'] → 200', r, 200);
      r = await c.req('DELETE', '/clubs/1');
      const after = await c.req('GET', '/clubs/1', { token: ema });
      c.add('Without a token the route never runs (DELETE /clubs/1 → 401, the club still exists)', r.status === 401 && after.status === 200, `DELETE → ${r.status}, then GET /clubs/1 → ${after.status}`);
    },
  },

  /* ------------------------------------------------------------------ 5 */
  {
    id: 'error-middleware',
    step: 'Step 5',
    name: 'ErrorMiddleware',
    file: 'backend/middleware/ErrorMiddleware.php',
    starter: 'ErrorMiddleware.php',
    title: 'Every exception → JSON (+ error.log)',
    steps: [
      '<b>handle(Throwable $e)</b>: if <code>$e instanceof HttpException</code> → <code>$status = $e-&gt;get_status(); $message = $e-&gt;getMessage();</code> and for 401/403 call <code>$this-&gt;log($status, $message)</code>.',
      'Otherwise (PDOException, a bug…) → <code>$status = 500;</code> a <b>general</b> message such as <code>Something went wrong on the server. Please try again later.</code> and log the details: <code>sprintf(\'%s: %s (%s:%d)\', get_class($e), $e-&gt;getMessage(), basename($e-&gt;getFile()), $e-&gt;getLine())</code>',
      'End with <code>$this-&gt;send_json($status, [\'error\' =&gt; $message]);</code>',
      '<b>not_found()</b>: <code>$this-&gt;send_json(404, [\'error\' =&gt; \'Endpoint not found.\']);</code>',
      '<b>log($status, $message)</b>: <code>$request = Flight::request(); $user = Flight::has(\'user\') ? Flight::get(\'user\') : null;</code> and <code>Logger::error(sprintf(\'%s %s %d user=%s role=%s %s\', $request-&gt;method, parse_url($request-&gt;url, PHP_URL_PATH), $status, $user[\'id\'] ?? \'-\', $user[\'role\'] ?? \'-\', $message));</code>',
    ],
    spec: [
      '<code>HttpException</code> → its status + <code>{"error": message}</code>; anything else → 500 + a general message (no SQL, no paths)',
      '401, 403 and 500 → <code>logs/error.log</code> as <code>METHOD /path STATUS user=… role=… message</code>; a 500 with class, file and line',
      '<code>not_found()</code> → 404 <code>{"error": "Endpoint not found."}</code>',
    ],
    why: 'The client never sees a stack trace, SQL or a file path – that would help an attacker. WE still need the details, so they go into error.log. In Lab 5 this was a function in index.php; now it is a class, registered once with Flight::map(\'error\', ...).',
    async check(c) {
      c.writeFile('__errors.php', R`<?php
require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/middleware/ErrorMiddleware.php';
$handler = new ErrorMiddleware();
Flight::map('error', [$handler, 'handle']);
Flight::map('notFound', [$handler, 'not_found']);
Flight::route('GET /e400', function () { throw new ValidationException("Field 'title' is required."); });
Flight::route('GET /e401', function () { throw new UnauthorizedException('Missing authentication token.'); });
Flight::route('GET /e403', function () { Flight::set('user', ['id' => 2, 'role' => 'student']); throw new ForbiddenException('Only admins can do this.'); });
Flight::route('GET /e404', function () { throw new NotFoundException('Event not found.'); });
Flight::route('GET /e500', function () { Flight::set('user', ['id' => 2, 'role' => 'student']);
    throw new PDOException('SQLSTATE[42S02]: Base table not found: secret_table'); });
Flight::route('GET /bug', function () { $x = null; return $x->title(); });
Flight::start();
`);
      c.clearLogs();
      const q = (u) => c.req('GET', u, { script: '__errors.php' });
      let r = await q('/e400');
      c.expect('ValidationException → 400 {"error": "Field \'title\' is required."}', r, 400, { error: "Field 'title' is required." });
      r = await q('/e401');
      c.expect('UnauthorizedException → 401 with its message', r, 401, { error: 'Missing authentication token.' });
      r = await q('/e403');
      c.expect('ForbiddenException → 403 with its message', r, 403, { error: 'Only admins can do this.' });
      r = await q('/e404');
      c.expect('NotFoundException → 404 with its message', r, 404, { error: 'Event not found.' });
      c.add('The answer is JSON (Content-Type: application/json)', String(r.headers?.['content-type'] || '').includes('application/json'), 'Content-Type: ' + JSON.stringify(r.headers?.['content-type']));
      r = await q('/e500');
      c.expect('PDOException → 500 with a general message (no SQL!)', r, 500, { test: (j) => (typeof j.error === 'string' && !/SQLSTATE|secret_table|\.php/.test(j.error)) || 'The client must not see SQL, table names or files' });
      r = await q('/bug');
      c.expect('A PHP Error (bug) → 500 too (handle(Throwable $e))', r, 500, { test: (j) => (typeof j.error === 'string' && !/null|title\(\)/.test(j.error)) || 'Use a general message' });
      r = await q('/does-not-exist');
      c.expect('not_found() → 404 {"error": "Endpoint not found."}', r, 404, { error: 'Endpoint not found.' });
      const log = c.log('error.log');
      const lines = log.split('\n').filter(Boolean);
      c.add('401 → error.log "GET /e401 401 user=- role=- Missing authentication token."', /ERROR GET \/e401 401 user=- role=- Missing authentication token\./.test(log), 'error.log:\n' + log);
      c.add('403 → error.log with the user from Flight::get(\'user\') (user=2 role=student)', /ERROR GET \/e403 403 user=2 role=student Only admins can do this\./.test(log), 'error.log:\n' + log);
      c.add('500 → error.log with the class, the message, the file and the line', lines.some((l) => /GET \/e500 500/.test(l) && /PDOException/.test(l) && /secret_table/.test(l) && /__errors\.php\D{0,3}\d+/.test(l)), 'Expected e.g. "PDOException: SQLSTATE... (__errors.php:11)" – error.log:\n' + log);
      c.add('400 and 404 are NOT written to error.log (only 401, 403, 500)', !/\/e400|\/e404/.test(log), 'error.log:\n' + log);
    },
  },

  /* ------------------------------------------------------------------ 6 */
  {
    id: 'request-log',
    step: 'Step 5',
    name: 'RequestLogMiddleware',
    file: 'backend/middleware/RequestLogMiddleware.php',
    starter: 'RequestLogMiddleware.php',
    title: 'One line per request in info.log',
    steps: [
      'Remember the start time: <code>$start = microtime(true);</code>',
      'The status is known only at the very end, so: <code>register_shutdown_function(function () use ($start) { ... });</code>',
      'Inside: <code>$request = Flight::request(); $user = Flight::has(\'user\') ? Flight::get(\'user\') : null;</code>',
      '<code>Logger::info(sprintf(\'%s %s %d user=%s role=%s %dms\', $request-&gt;method, parse_url($request-&gt;url, PHP_URL_PATH), http_response_code(), $user[\'id\'] ?? \'-\', $user[\'role\'] ?? \'-\', round((microtime(true) - $start) * 1000)));</code>',
    ],
    spec: [
      'every request → one line in <code>logs/info.log</code>: <code>GET /events 200 user=2 role=student 14ms</code>',
      'the path without the query string; the REAL final status; <code>-</code> when nobody is logged in',
    ],
    why: 'index.php calls before() from Flight::before(\'start\', …) – before any route. At that moment the status and the user are not known yet; PHP runs shutdown functions at the very end of every request, even after exit.',
    async check(c) {
      c.clearLogs();
      const ema = await c.mint();
      await c.req('GET', '/events');
      await c.req('GET', '/events', { token: ema });
      await c.req('GET', '/events?limit=5', { token: ema });
      await c.req('POST', '/auth/login', { body: EMA });
      await c.req('GET', '/nope');
      const log = c.log('info.log');
      const reqLines = log.split('\n').filter((l) => / (GET|POST|PUT|DELETE) \//.test(l));
      c.add('A request without a token: "GET /events 401 user=- role=- …ms"', /INFO GET \/events 401 user=- role=- \d+ms/.test(log), 'info.log:\n' + log);
      c.add('With a token: "GET /events 200 user=2 role=student …ms"', /INFO GET \/events 200 user=2 role=student \d+ms/.test(log), 'info.log:\n' + log);
      c.add('The URL is logged without the query string (?limit=5)', !/\?limit/.test(log) && (log.match(/GET \/events 200/g) || []).length === 2, 'Use parse_url($request->url, PHP_URL_PATH) – info.log:\n' + log);
      c.add('POST /auth/login 200 is logged', /INFO POST \/auth\/login 200 user=- role=- \d+ms/.test(log), 'info.log:\n' + log);
      c.add('A 404 is logged with its real status', /INFO GET \/nope 404/.test(log), 'info.log:\n' + log);
      c.add('Exactly one line per request (5 requests → 5 lines)', reqLines.length === 5, `${reqLines.length} request lines in info.log:\n` + log);
    },
  },

  /* ------------------------------------------------------------------ 8 */
  {
    id: 'index',
    step: 'Step 6',
    name: 'index.php',
    file: 'backend/index.php',
    starter: 'index.php',
    title: 'Register the middleware: public routes + one protected group',
    steps: [
      '<code>require_once</code> the three classes from <code>__DIR__ . \'/middleware/…\'</code> and <code>Flight::register(\'auth_service\', \'AuthService\');</code>',
      'Request log for EVERY request: <code>$request_logger = new RequestLogMiddleware(); Flight::before(\'start\', function () use ($request_logger) { $request_logger-&gt;before(); });</code>',
      'Errors: <code>$error_handler = new ErrorMiddleware(); Flight::map(\'error\', [$error_handler, \'handle\']); Flight::map(\'notFound\', [$error_handler, \'not_found\']);</code>',
      'Public: <code>require_once __DIR__ . \'/rest/routes/AuthRoutes.php\';</code> – OUTSIDE the group.',
      'Protected: <code>Flight::group(\'\', function () { require_once …ClubRoutes.php; require_once …EventRoutes.php; }, [new AuthMiddleware()]);</code>',
      'Remove the old <code>Flight::map(\'error\', …)</code> function from Lab 5 – only one error handler.',
    ],
    spec: [
      '<code>RequestLogMiddleware</code> via <code>Flight::before(\'start\', …)</code>; <code>ErrorMiddleware</code> for <code>error</code> and <code>notFound</code>',
      '<code>AuthRoutes.php</code> public; <code>ClubRoutes.php</code> + <code>EventRoutes.php</code> inside <code>Flight::group(\'\', …, [new AuthMiddleware()])</code>',
    ],
    why: 'A route that you add to the group later is protected automatically – nobody can forget the check. Login and register stay outside: a user who is not logged in has no token yet.',
    async check(c) {
      c.clearLogs();
      let r = await c.req('GET', '/');
      c.expect('GET / is public → 200', r, 200);
      r = await c.req('POST', '/auth/login', { body: EMA });
      c.expect('POST /auth/login works WITHOUT a token (AuthRoutes outside the group)', r, 200, { test: (j) => !!j.token || 'No token' });
      const tok = r.json?.token;
      r = await c.req('POST', '/auth/register', { body: { first_name: 'Amar', last_name: 'Hodžić', email: 'amar@campusevents.ba', password: 'Secret123' } });
      c.expect('POST /auth/register works WITHOUT a token → 201 (auth_service registered)', r, 201);
      r = await c.req('GET', '/events');
      c.expect('GET /events without a token → 401 (inside the group)', r, 401, { error: 'Missing authentication token.' });
      r = await c.req('GET', '/clubs');
      c.expect('GET /clubs without a token → 401', r, 401, { error: 'Missing authentication token.' });
      r = await c.req('DELETE', '/clubs/1');
      c.expect('DELETE /clubs/1 without a token → 401', r, 401);
      r = await c.req('GET', '/clubs/1', { token: tok });
      c.expect('With a token: GET /clubs/1 → 200 (the club was NOT deleted)', r, 200);
      r = await c.req('GET', '/events', { token: tok });
      c.expect('With a token: GET /events → 200', r, 200);
      r = await c.req('GET', '/auth/me', { token: tok });
      c.expect('With a token: GET /auth/me → 200', r, 200);
      r = await c.req('POST', '/clubs', { token: tok, body: {} });
      c.expect('Errors are JSON from ErrorMiddleware: POST /clubs {} → 400', r, 400, { error: "Field 'name' is required." });
      r = await c.req('GET', '/does-not-exist');
      c.expect('notFound is mapped: GET /does-not-exist → 404 {"error": "Endpoint not found."}', r, 404, { error: 'Endpoint not found.' });
      const info = c.log('info.log'), err = c.log('error.log');
      c.add('RequestLogMiddleware runs for every request (info.log)', /GET \/ 200/.test(info) && /GET \/events 401/.test(info) && /GET \/does-not-exist 404/.test(info), 'info.log:\n' + info);
      c.add('ErrorMiddleware writes the 401s to error.log', /GET \/events 401/.test(err), 'error.log:\n' + err);
    },
  },

  /* ------------------------------------------------------------------ 9 */
  {
    id: 'htaccess',
    step: 'Step 7',
    name: '.htaccess',
    file: 'backend/.htaccess',
    starter: '.htaccess',
    lang: 'text',
    title: 'Apache: pass the Authorization header',
    steps: [
      'Add two lines ABOVE the FlightPHP rules:',
      '<code>RewriteCond %{HTTP:Authorization} .</code>',
      '<code>RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]</code>',
      'PHP\'s built-in server (<code>php -S localhost:8000 server.php</code>) passes the header without this rule – XAMPP/MAMP need it.',
    ],
    spec: [
      'the <code>RewriteCond</code> + <code>RewriteRule</code> pair that copies the Authorization header into <code>HTTP_AUTHORIZATION</code>, above the FlightPHP rules',
    ],
    why: 'Without these lines Apache may drop the header, and every request answers 401 even with a correct token. "-" means "do not rewrite the URL", E=… only sets the environment variable.',
    async check(c) {
      const lines = c.src.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.replace(/\s+/g, ' '));
      const iEngine = lines.findIndex((l) => /^RewriteEngine on$/i.test(l));
      const iCond = lines.findIndex((l) => /^RewriteCond %\{HTTP:Authorization\} (\.|\.\+|\^\(\.\*\)\$?|\^\(\.\+\)\$?)$/i.test(l));
      const iRule = lines.findIndex((l) => /^RewriteRule (\.\*|\^\(\.\*\)\$?|\^) - \[E=HTTP_AUTHORIZATION:%\{HTTP:Authorization\}(,[A-Z]+)*\]$/i.test(l));
      const iFlight = lines.findIndex((l) => /^RewriteCond %\{REQUEST_FILENAME\} !-f$/i.test(l));
      c.add('RewriteEngine On is still the first rule', iEngine === 0, 'The file must start with RewriteEngine On');
      c.add('RewriteCond %{HTTP:Authorization} .', iCond >= 0, 'Write it exactly like this: RewriteCond %{HTTP:Authorization} .');
      c.add('RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]', iRule >= 0, 'Write it exactly like this: RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]');
      c.add('The RewriteCond is directly above its RewriteRule', iCond >= 0 && iRule === iCond + 1, 'A RewriteCond belongs to the RewriteRule right below it.');
      c.add('Both are ABOVE the FlightPHP rules', iFlight >= 0 && iRule >= 0 && iRule < iFlight, 'Put them right after RewriteEngine On.');
      c.add('The FlightPHP rules are still there (!-f, !-d, index.php [QSA,L])', iFlight >= 0 && lines.some((l) => /^RewriteCond %\{REQUEST_FILENAME\} !-d$/i.test(l)) && lines.some((l) => /^RewriteRule \^\(\.\*\)\$ index\.php \[QSA,L\]$/i.test(l)), 'Do not delete the FlightPHP rules.');
    },
  },

  /* ------------------------------------------------------------------ 10 */
  {
    id: 'doc-setup',
    step: 'Step 8',
    name: 'doc_setup.php',
    file: 'backend/public/v1/docs/doc_setup.php',
    starter: 'doc_setup.php',
    title: 'Swagger UI: the Authorize button',
    steps: [
      'Below <code>#[OA\\Server(…)]</code> add the security scheme:',
      '<code>#[OA\\SecurityScheme(securityScheme: \'bearerAuth\', type: \'http\', scheme: \'bearer\', bearerFormat: \'JWT\')]</code>',
      'and make it the default for every endpoint: <code>#[OA\\OpenApi(security: [[\'bearerAuth\' =&gt; []]])]</code>',
    ],
    spec: [
      '<code>#[OA\\SecurityScheme]</code> named <code>bearerAuth</code>: http, bearer, JWT',
      '<code>#[OA\\OpenApi(security: …)]</code>: every endpoint needs bearerAuth by default',
    ],
    why: 'The scheme shows the Authorize button. In Swagger UI you paste ONLY the token (without the word Bearer) – Swagger adds "Bearer " itself. The protected endpoints then show a lock.',
    async check(c) {
      await c.php(R`<?php
        define('API_BASE_URL', 'http://localhost/backend');
        spl_autoload_register(function ($class) {
            if (str_starts_with($class, 'OpenApi\\Attributes\\')) {
                $short = substr($class, 19);
                eval("namespace OpenApi\\Attributes; class $short { public \$args; public function __construct(...\$args) { \$this->args = \$args; } }");
            }
        });
        require '/app/backend/public/v1/docs/doc_setup.php';
        $attrs = [];
        foreach ((new ReflectionClass('OpenApiSpec'))->getAttributes() as $a) $attrs[substr($a->getName(), 19)][] = $a->getArguments();
        t('#[OA\Info] and #[OA\Server] are still there', fn() => (isset($attrs['Info'], $attrs['Server'])) ?: 'Do not delete Info and Server.');
        $sch = $attrs['SecurityScheme'][0] ?? null;
        t('#[OA\SecurityScheme(...)] exists', fn() => $sch !== null ?: 'Add #[OA\SecurityScheme(...)] above class OpenApiSpec {}');
        t("securityScheme: 'bearerAuth'", fn() => ($sch['securityScheme'] ?? null) === 'bearerAuth' ?: 'securityScheme is ' . var_export($sch['securityScheme'] ?? null, true));
        t("type: 'http', scheme: 'bearer'", fn() => (($sch['type'] ?? null) === 'http' && ($sch['scheme'] ?? null) === 'bearer') ?: 'type/scheme: ' . json_encode([$sch['type'] ?? null, $sch['scheme'] ?? null]));
        t("bearerFormat: 'JWT'", fn() => ($sch['bearerFormat'] ?? null) === 'JWT' ?: 'bearerFormat is ' . var_export($sch['bearerFormat'] ?? null, true));
        t("#[OA\OpenApi(security: [['bearerAuth' => []]])] – the token is the default", function () use ($attrs) {
            $o = $attrs['OpenApi'][0] ?? null;
            if ($o === null) return 'Add #[OA\OpenApi(security: [[\'bearerAuth\' => []]])]';
            return ($o['security'] ?? null) === [['bearerAuth' => []]] ?: 'security is ' . json_encode($o['security'] ?? null);
        });
      `);
    },
  },

  /* ------------------------------------------------------------------ 11 */
  {
    id: 'auth-paths',
    step: 'Step 8',
    name: 'AuthPaths.php',
    file: 'backend/public/v1/docs/paths/AuthPaths.php',
    starter: 'AuthPaths.php',
    title: 'Public login (security: []) and the 401 answers',
    steps: [
      'The default is now "token needed". Login is public, so add <code>security: []</code> to its <code>#[OA\\Post(…)]</code>.',
      'Document the 401 of login: <code>new OA\\Response(response: 401, description: \'Invalid email or password\', content: new OA\\JsonContent(ref: \'#/components/schemas/Error\'))</code>',
      '<code>GET /auth/me</code> is protected – it keeps the default (NO <code>security: []</code>) and documents 401 for a missing, invalid or expired token.',
    ],
    spec: [
      '<code>POST /auth/login</code>: <code>security: []</code> + responses 200 and 401',
      '<code>GET /auth/me</code>: protected (default security) + responses 200 and 401',
    ],
    why: 'Document 401 for every endpoint that you protect, just like 400 and 404 in Lab 6. An endpoint with security: [] shows no lock in Swagger UI.',
    async check(c) {
      await c.php(R`<?php
        spl_autoload_register(function ($class) {
            if (str_starts_with($class, 'OpenApi\\Attributes\\')) {
                $short = substr($class, 19);
                eval("namespace OpenApi\\Attributes; class $short { public \$args; public function __construct(...\$args) { \$this->args = \$args; } }");
            }
        });
        require '/app/backend/public/v1/docs/paths/AuthPaths.php';
        $ops = [];
        foreach ((new ReflectionClass('AuthPaths'))->getMethods() as $m) {
            foreach ($m->getAttributes() as $a) {
                $args = $a->getArguments();
                $ops[strtoupper(substr($a->getName(), 19)) . ' ' . ($args['path'] ?? '?')] = $args;
            }
        }
        $codes = function ($op) { $c = []; foreach ($op['responses'] ?? [] as $r) $c[] = (int) ($r->args['response'] ?? 0); return $c; };
        $login = $ops['POST /auth/login'] ?? null; $me = $ops['GET /auth/me'] ?? null;
        t('POST /auth/login is documented', fn() => $login !== null ?: 'Found: ' . implode(', ', array_keys($ops)));
        t('POST /auth/login has security: [] (public)', fn() => ($login && array_key_exists('security', $login) && $login['security'] === []) ?: 'Add security: [] to #[OA\Post(path: \'/auth/login\', ...)]');
        t('POST /auth/login documents 200 and 401', fn() => ($login && !array_diff([200, 401], $codes($login))) ?: 'Responses: ' . json_encode($login ? $codes($login) : []));
        t('GET /auth/me is documented', fn() => $me !== null ?: 'Do not delete GET /auth/me.');
        t('GET /auth/me keeps the default security (it needs the token)', fn() => ($me && !array_key_exists('security', $me)) ?: 'GET /auth/me is protected – remove security from it.');
        t('GET /auth/me documents 200 and 401', fn() => ($me && !array_diff([200, 401], $codes($me))) ?: 'Responses: ' . json_encode($me ? $codes($me) : []));
      `);
    },
  },

  /* ------------------------------------------------------------------ 12 */
  {
    id: 'gitignore',
    step: 'Step 1 + 2',
    name: '.gitignore',
    file: '.gitignore',
    starter: 'gitignore',
    lang: 'text',
    title: 'Never commit config.php and the logs',
    steps: [
      '<code>backend/config/config.php</code> – it holds JWT_SECRET and the DB password (config.example.php IS committed).',
      '<code>backend/logs/*</code> – log files are never committed …',
      '<code>!backend/logs/.gitkeep</code> – … but the empty folder is (the <code>!</code> line comes AFTER <code>logs/*</code>).',
    ],
    spec: ['ignore <code>backend/config/config.php</code> and <code>backend/logs/*</code>, keep <code>backend/logs/.gitkeep</code>'],
    why: 'Anybody who sees JWT_SECRET in your public repository can create a valid token for any user, also an admin.',
    async check(c) {
      const lines = c.src.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      const iCfg = lines.findIndex((l) => /^\/?(backend\/)?config\/config\.php$/.test(l));
      const iLogs = lines.findIndex((l) => /^\/?(backend\/)?logs\/\*$/.test(l));
      const iKeep = lines.findIndex((l) => /^!\/?(backend\/)?logs\/\.gitkeep$/.test(l));
      c.add('backend/config/config.php is ignored', iCfg >= 0, 'Add the line: backend/config/config.php');
      c.add('config.example.php is NOT ignored', !lines.some((l) => /config\.example\.php|config\/\*$|config\/$/.test(l) && !l.startsWith('!')), 'config.example.php must be committed – ignore only config.php.');
      c.add('backend/logs/* is ignored', iLogs >= 0, 'Add the line: backend/logs/*  (with /* so that .gitkeep can be kept)');
      c.add('!backend/logs/.gitkeep comes after logs/*', iKeep >= 0 && iKeep > iLogs, 'Add !backend/logs/.gitkeep BELOW backend/logs/*');
      c.add('backend/vendor/ is still ignored', lines.some((l) => /^\/?(backend\/)?vendor\/?$/.test(l)), 'Keep backend/vendor/');
    },
  },
];
