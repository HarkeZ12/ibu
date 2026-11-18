<?php
require_once __DIR__ . '/../../config/config.php';

/**
 * BaseDao of the TRAINER: the same methods as in your project,
 * but the connection is SQLite (a file in the browser) instead of MySQL.
 */
class BaseDao
{
    const DB_FILE = '/app/data/campusevents.sqlite';
    private static $connection = null;

    protected $table_name;
    protected $columns;

    public function __construct($table_name, $columns = [])
    {
        $this->table_name = $table_name;
        $this->columns = $columns;
    }

    public static function connection()
    {
        if (self::$connection === null) {
            $new = !is_file(self::DB_FILE);
            if (!is_dir(dirname(self::DB_FILE))) {
                mkdir(dirname(self::DB_FILE), 0777, true);
            }
            self::$connection = new PDO('sqlite:' . self::DB_FILE, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            if ($new) {
                self::seed(self::$connection);
            }
        }
        return self::$connection;
    }

    private static function seed($db)
    {
        $db->exec("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
                   email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student', faculty TEXT NULL,
                   created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
        $db->exec("CREATE TABLE clubs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT NULL)");
        $db->exec("CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER NOT NULL, title TEXT NOT NULL,
                   location TEXT NOT NULL, starts_at TEXT NOT NULL)");
        $users = $db->prepare("INSERT INTO users (first_name, last_name, email, password, role, faculty) VALUES (?, ?, ?, ?, ?, ?)");
        $users->execute(['Admin', 'CampusEvents', 'admin@campusevents.ba', password_hash('Admin123!', PASSWORD_BCRYPT, ['cost' => 8]), 'admin', null]);
        $users->execute(['Ema', 'Kovač', 'ema@campusevents.ba', password_hash('Student123!', PASSWORD_BCRYPT, ['cost' => 8]), 'student', 'FENS']);
        // an OLD account whose password was stored as plain text (wrong!) – login must fail for it
        $users->execute(['Old', 'Account', 'plain@campusevents.ba', 'Plain123!', 'student', null]);
        $db->exec("INSERT INTO clubs (name, description) VALUES ('IT Club', 'Programming, hackathons'), ('Debate Club', 'Weekly debates'), ('Photo Club', 'Photo walks')");
        $db->exec("INSERT INTO events (club_id, title, location, starts_at) VALUES
                   (1, 'Intro to PHP', 'Lab A1', '2026-11-25 17:00:00'),
                   (1, 'Hackathon 2026', 'Main hall', '2026-12-05 09:00:00'),
                   (2, 'Debate night', 'Room B12', '2026-11-27 18:30:00')");
    }

    protected function query($query, $params = [])
    {
        $stmt = self::connection()->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    protected function query_unique($query, $params = [])
    {
        $results = $this->query($query, $params);
        return $results[0] ?? null;
    }

    protected function execute($query, $params = [])
    {
        $stmt = self::connection()->prepare($query);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public function get_all()
    {
        return $this->query("SELECT * FROM {$this->table_name} ORDER BY id");
    }

    public function get_by_id($id)
    {
        return $this->query_unique("SELECT * FROM {$this->table_name} WHERE id = :id", ['id' => $id]);
    }

    public function add($entity)
    {
        $entity = $this->only_columns($entity);
        $columns = array_keys($entity);
        $query = "INSERT INTO {$this->table_name} (" . implode(', ', $columns) . ") VALUES (:" . implode(', :', $columns) . ")";
        $this->execute($query, $entity);
        $entity['id'] = (int) self::connection()->lastInsertId();
        return $entity;
    }

    public function update($entity, $id)
    {
        $entity = $this->only_columns($entity);
        if (count($entity) === 0) {
            return 0;
        }
        $set = [];
        foreach (array_keys($entity) as $column) {
            $set[] = "$column = :$column";
        }
        $entity['id'] = $id;
        return $this->execute("UPDATE {$this->table_name} SET " . implode(', ', $set) . " WHERE id = :id", $entity);
    }

    public function delete($id)
    {
        return $this->execute("DELETE FROM {$this->table_name} WHERE id = :id", ['id' => $id]);
    }

    protected function only_columns($entity)
    {
        return array_intersect_key($entity, array_flip($this->columns));
    }
}
