const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

const isDev = process.env.NODE_ENV === 'development'
  || process.defaultApp
  || /[\\/]electron-prebuilt[\\/]/.test(process.execPath)
  || /[\\/]electron[\\/]/.test(process.execPath);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    backgroundColor: '#0f172a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: path.join(__dirname, 'icon.png'),
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── File system helpers ────────────────────────────────────────────────────

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ── Scan library ──────────────────────────────────────────────────────────────
// Library structure on disk:
//
//   fieldwork-library/
//     settings/
//       _project.json          → project metadata
//       inline-validation-error.json
//       field-label.json
//     permissions/
//       _project.json
//       permission-prompt.json

async function scanLibrary(libraryPath) {
  const projects = [];
  const contentTypes = [];

  let items;
  try {
    items = await fs.readdir(libraryPath, { withFileTypes: true });
  } catch {
    return { projects, contentTypes };
  }

  for (const item of items) {
    if (!item.isDirectory() || item.name.startsWith('.')) continue;

    const projectPath = path.join(libraryPath, item.name);
    const metaPath = path.join(projectPath, '_project.json');
    const meta = await readJsonFile(metaPath);

    const project = {
      id: meta?.id || item.name,
      name: meta?.name || item.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      color: meta?.color || 'blue',
      lastUpdated: meta?.lastUpdated || new Date().toISOString(),
    };

    projects.push(project);

    // Read content type files
    let ctFiles;
    try {
      ctFiles = await fs.readdir(projectPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const ctFile of ctFiles) {
      if (!ctFile.isFile()) continue;
      if (!ctFile.name.endsWith('.json')) continue;
      if (ctFile.name === '_project.json') continue;

      const ctPath = path.join(projectPath, ctFile.name);
      const ctData = await readJsonFile(ctPath);
      if (ctData && ctData.id) {
        contentTypes.push({ ...ctData, projectId: project.id });
      }
    }
  }

  return { projects, contentTypes };
}

// ── IPC handlers ───────────────────────────────────────────────────────────────

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select your Fieldwork library folder',
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('create-folder', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Create new Fieldwork library',
    buttonLabel: 'Create',
    properties: ['createDirectory'],
  });
  if (!result.canceled && result.filePath) {
    await ensureDir(result.filePath);
    const readmePath = path.join(result.filePath, 'README.md');
    await fs.writeFile(readmePath,
      `# Fieldwork Library\n\nYour content architecture workbench.\n\nEach subfolder is a project. Each .json file inside is a content type.\n`,
      'utf8'
    );
    return result.filePath;
  }
  return null;
});

ipcMain.handle('scan-library', async (event, libraryPath) => {
  return scanLibrary(libraryPath);
});

ipcMain.handle('create-project-folder', async (event, project, libraryPath) => {
  try {
    const folderName = project.name.replace(/\s+/g, '-').toLowerCase();
    const projectPath = path.join(libraryPath, folderName);
    await ensureDir(projectPath);

    const meta = {
      id: project.id,
      name: project.name,
      color: project.color,
      lastUpdated: project.lastUpdated,
    };
    await writeJsonFile(path.join(projectPath, '_project.json'), meta);

    return { success: true, projectPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-content-type', async (event, contentType, libraryPath, projectName) => {
  try {
    const folderName = (projectName || contentType.projectId).replace(/\s+/g, '-').toLowerCase();
    const projectPath = path.join(libraryPath, folderName);
    await ensureDir(projectPath);

    const fileName = contentType.name.replace(/\s+/g, '-').toLowerCase() + '.json';
    const filePath = path.join(projectPath, fileName);
    await writeJsonFile(filePath, contentType);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-content-type', async (event, contentType, libraryPath, projectName) => {
  try {
    const folderName = (projectName || contentType.projectId).replace(/\s+/g, '-').toLowerCase();
    const fileName = contentType.name.replace(/\s+/g, '-').toLowerCase() + '.json';
    const filePath = path.join(libraryPath, folderName, fileName);
    await fs.unlink(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-project-folder', async (event, projectName, libraryPath) => {
  try {
    const folderName = projectName.replace(/\s+/g, '-').toLowerCase();
    const projectPath = path.join(libraryPath, folderName);
    await fs.rm(projectPath, { recursive: true, force: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
