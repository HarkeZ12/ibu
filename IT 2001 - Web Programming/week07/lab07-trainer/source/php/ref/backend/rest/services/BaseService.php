<?php
require_once __DIR__ . '/../../utils/exceptions.php';
require_once __DIR__ . '/../../utils/Validator.php';

/**
 * VERSION 3 (FINAL) – BaseService: common business logic for every entity.
 *
 * Problems are signalled with EXCEPTIONS (utils/exceptions.php) that carry an HTTP status code.
 *
 * Child services override validate() with their own rules and can override
 * any CRUD method when an entity needs special behaviour.
 * Services are the ONLY layer that calls the DAOs.
 */
class BaseService
{
    protected $dao;
    /** Used in error messages, e.g. "Event not found." */
    protected $entity_name = 'Entity';

    public function __construct($dao)
    {
        $this->dao = $dao;
    }

    public function get_all()
    {
        return $this->dao->get_all();
    }

    public function get_by_id($id)
    {
        $entity = $this->dao->get_by_id($id);
        if (!$entity) {
            throw new NotFoundException("{$this->entity_name} not found.");
        }
        return $entity;
    }

    public function add($entity)
    {
        $this->validate($entity);
        $created = $this->dao->add($entity);
        return $this->dao->get_by_id($created['id']);
    }

    public function update($entity, $id)
    {
        $this->get_by_id($id);              // 404 if it does not exist
        $this->validate($entity, $id);
        $this->dao->update($entity, $id);
        return $this->dao->get_by_id($id);
    }

    public function delete($id)
    {
        $this->get_by_id($id);
        $this->dao->delete($id);
    }

    /**
     * Throw a ValidationException when $entity breaks a rule.
     * $id is null when creating and the entity id when updating.
     */
    protected function validate($entity, $id = null)
    {
    }

    /** Turn empty strings into NULL for optional columns ("" is not a valid year or date). */
    protected function empty_to_null($entity, $fields)
    {
        foreach ($fields as $field) {
            if (array_key_exists($field, $entity) && trim((string) $entity[$field]) === '') {
                $entity[$field] = null;
            }
        }
        return $entity;
    }
}
