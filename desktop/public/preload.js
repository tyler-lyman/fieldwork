const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder:        ()                              => ipcRenderer.invoke('select-folder'),
  createFolder:        ()                              => ipcRenderer.invoke('create-folder'),
  scanLibrary:         (libraryPath)                   => ipcRenderer.invoke('scan-library', libraryPath),
  createProjectFolder: (project, libraryPath)          => ipcRenderer.invoke('create-project-folder', project, libraryPath),
  saveContentType:     (ct, libraryPath, projectName)  => ipcRenderer.invoke('save-content-type', ct, libraryPath, projectName),
  deleteContentType:   (ct, libraryPath, projectName)  => ipcRenderer.invoke('delete-content-type', ct, libraryPath, projectName),
  deleteProjectFolder: (projectName, libraryPath)      => ipcRenderer.invoke('delete-project-folder', projectName, libraryPath),
});
