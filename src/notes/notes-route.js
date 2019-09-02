const express = require('express');
const notesRoute = express.Router();
const bodyParser = express.json();
const noteService = require('./notes-service');
const xss = require('xss');
const jsonParser = express.json();

const serializeNote = note => ({
  id: note.id,
  name: xss(note.name),
  modified: note.modified,
  content: xss(note.content),
  folder_id: note.folder_id
})

notesRoute.route('/')
  .get((req, res) => {
    noteService.getAllNotes(req.app.get('db'))
      .then(notes => {
        res.json(notes.map(serializeNote));
      })
  })
  .post(jsonParser, (req, res, next) => {
    for (const field of ['name', 'folder_id', 'content']) {
      if (!req.body[field]) {
        //logger.error(`${field} is required`)
        return res.status(400).send({
          error: { message: `${field}' is required` }
        })
      }
    }

    const { name, folder_id, content } = req.body;
    if (!name || name.length<3){
      return res.status(400).json({error:'name incorrect format'})
    }
    const newNote = { name, folder_id, content };
    noteService.insertNote(req.app.get('db'), newNote)
      .then(note => res.status(201)
        .location(`/api/notes/${note.id}`)
        .json(serializeNote(note)))
      .catch(next);
  });

notesRoute.route('/:note_id')
  .all((req, res, next) => {
    const { note_id } = req.params;
    noteService.getById(req.app.get('db'), note_id)
      .then(note => {
        if (!note) {
          //logger.error(`note with id ${note_id} not found.`)
          return res.status(404).json({
            error: { message: `note Not Found` }
          })
        }
        res.note = note
        next()
      })
      .catch(next)

  })
  .get((req, res) => {
    res.json(serializeNote(res.note))
  })
  .delete((req, res, next) => {
    const { note_id } = req.params
    noteService.deleteNote(
      req.app.get('db'),
      note_id
    )
      .then(numRowsAffected => {
        //logger.info(`note with id ${note_id} deleted.`)
        res.status(204).send('DELETED');
      })
      .catch(next)
  })
  .patch(bodyParser, (req, res, next) => {
    const { name, content, folder_id, modified } = req.body
    const noteToUpdate = { name, content, folder_id };

    const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
    if (numberOfValues === 0)
      return res.status(400).json({
        error: {
          message: `Request body must content either 'name', 'content' or 'folder_id'`
        }
      })

    if (!name || name.length<3){
      return res.status(400).json({error:'name incorrect format'})
    }
    noteToUpdate.modified = new Date();

    noteService.updateNote(
      req.app.get('db'),
      req.params.note_id,
      noteToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = notesRoute;
