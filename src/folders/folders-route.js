const express = require('express');
const foldersRoute = express.Router();
const bodyParser = express.json();
const folderService = require('./folders-service');
const xss = require('xss');
const jsonParser = express.json();

const serializeFolder = folder => ({
  id: folder.id,
  name: xss(folder.name)
})

foldersRoute.route('/')
  .get((req, res) => {
    folderService.getAllFolders(req.app.get('db'))
      .then(folders => {
        res.json(folders.map(serializeFolder));
      })
  })
  .post(jsonParser, (req, res, next) => {
    const { name} = req.body;
    if (!name || name.length<3){
      return res.status(400).json({error:'name incorrect format'})
    }
    const newFolder = { name };
    folderService.insertFolder(req.app.get('db'), newFolder)
      .then(folder => res.status(201)
        .location(`/api/folders/${folder.id}`)
        .json(serializeFolder(folder)))
      .catch(next);
  });

foldersRoute.route('/:folder_id')
  .all((req, res, next) => {
    const { folder_id } = req.params;
    folderService.getById(req.app.get('db'), folder_id)
      .then(folder => {
        if (!folder) {
          //logger.error(`folder with id ${folder_id} not found.`)
          return res.status(404).json({
            error: { message: `folder Not Found` }
          })
        }
        res.folder = folder
        next()
      })
      .catch(next)

  })
  .get((req, res) => {
    res.json(serializeFolder(res.folder))
  })
  .delete((req, res, next) => {
    const { folder_id } = req.params
    folderService.deleteFolder(
      req.app.get('db'),
      folder_id
    )
      .then(numRowsAffected => {
        //logger.info(`folder with id ${folder_id} deleted.`)
        res.status(204).send('DELETED');
      })
      .catch(next)
  })
  .patch(bodyParser, (req, res, next) => {
    const { name } = req.body
    const folderToUpdate = { name };

    if (!name || name.length<3){
      return res.status(400).json({error:'name incorrect format'})
    }

    folderService.updateFolder(
      req.app.get('db'),
      req.params.folder_id,
      folderToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = foldersRoute;
