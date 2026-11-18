<?php
require_once __DIR__ . '/BaseService.php';
require_once __DIR__ . '/../dao/UserDao.php';
require_once __DIR__ . '/../../utils/Roles.php';

class UserService extends BaseService
{
    const FACULTIES = ['FENS', 'FASS', 'FBA', 'FEDU'];

    protected $entity_name = 'User';

    public function __construct($dao = null)
    {
        parent::__construct($dao ?? new UserDao());
    }

    public function get_by_email($email)
    {
        return $this->dao->get_by_email($email);
    }

    /** Lab 4: validates the data and HASHES the password. Returns the user WITHOUT the hash. */
    public function add($user)
    {
        $user['role'] = $user['role'] ?? Roles::STUDENT;
        $user = $this->empty_to_null($user, ['faculty']);
        $this->validate($user);
        Validator::required($user, ['password']);
        Validator::password($user['password']);

        // Rule: passwords are NEVER stored in plain text
        $user['password'] = password_hash($user['password'], PASSWORD_BCRYPT, ['cost' => 8]);
        $user['email'] = strtolower(trim($user['email']));

        $created = $this->dao->add($user);
        return $this->dao->get_by_id($created['id']);
    }

    public function update($user, $id)
    {
        $this->get_by_id($id);
        $user = $this->empty_to_null($user, ['faculty']);
        $this->validate($user, $id);
        $user['email'] = strtolower(trim($user['email']));
        if (empty($user['password'])) {
            unset($user['password']);
        } else {
            Validator::password($user['password']);
            $user['password'] = password_hash($user['password'], PASSWORD_BCRYPT, ['cost' => 8]);
        }
        $this->dao->update($user, $id);
        return $this->dao->get_by_id($id);
    }

    protected function validate($user, $id = null)
    {
        Validator::required($user, ['first_name', 'last_name', 'email', 'role']);
        Validator::length($user['first_name'], 'first_name', 2, 50);
        Validator::length($user['last_name'], 'last_name', 2, 50);
        Validator::email($user['email']);
        Validator::one_of($user['role'], 'role', Roles::all());
        if (isset($user['faculty'])) {
            Validator::one_of($user['faculty'], 'faculty', self::FACULTIES);
        }
        $existing = $this->dao->get_by_email(strtolower(trim($user['email'])));
        if ($existing && $existing['id'] != $id) {
            throw new ValidationException("An account with this email already exists.");
        }
    }
}
