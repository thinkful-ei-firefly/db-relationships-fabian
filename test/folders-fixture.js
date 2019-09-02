const foldersData = [{
  id: 1,
  name:'Folder 1'
},{
  id: 2,
  name:'Folder 1'
},{
  id: 3,
  name:'Folder 1'
}]

const maliciousFolder = {
  name: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
}
const expectedFolder = {
  ...maliciousFolder,
  name: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
}

module.exports = { foldersData, maliciousFolder, expectedFolder }
